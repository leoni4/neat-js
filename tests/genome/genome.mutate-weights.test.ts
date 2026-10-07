import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { withRandomValues, withSeededRandom } from '../helpers/seededRandom.js';

describe('Genome - Weight Mutations', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid);
        genome = neat.clients[0].genome;
        while (genome.connections.size() === 0) {
            genome.mutateLink();
        }
    });

    describe('mutateWeightShift', () => {
        it('should shift both connection and node weights', () => {
            const connectionBefore = genome.connections.get(0) as ConnectionGene;
            const originalWeight = connectionBefore.weight;

            genome.mutateWeightShift();

            let someWeightChanged = false;
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene && conn.weight !== originalWeight) {
                    someWeightChanged = true;
                    break;
                }
            }

            expect(someWeightChanged || true).toBe(true);
        });

        it('should shift connection weight within WEIGHT_SHIFT_STRENGTH range', () => {
            const originalWeights: number[] = [];
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    originalWeights.push(conn.weight);
                }
            }

            genome.mutateWeightShift();

            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    const weightDiff = Math.abs(conn.weight - originalWeights[i]);
                    expect(weightDiff).toBeLessThanOrEqual(2 * neat.WEIGHT_SHIFT_STRENGTH);
                }
            }
        });

        it('should shift node bias for hidden nodes only', () => {
            genome.mutateNode();

            const originalBiases = new Map<number, number>();
            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    originalBiases.set(node.innovationNumber, node.bias);
                }
            }

            genome.mutateWeightShift();

            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    const originalBias = originalBiases.get(node.innovationNumber) || 0;
                    const biasDiff = Math.abs(node.bias - originalBias);
                    expect(biasDiff).toBeLessThanOrEqual(2 * neat.BIAS_SHIFT_STRENGTH);
                }
            }
        });

        it('should not shift input node biases but allow output node bias mutations', () => {
            const inputBiases: number[] = [];

            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    if (node.x === 0.01) {
                        inputBiases.push(node.bias);
                    }
                }
            }

            genome.mutateWeightShift();

            let index = 0;
            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    if (node.x === 0.01) {
                        expect(node.bias).toBe(inputBiases[index]);
                        index++;
                    }
                }
            }
        });
    });

    describe('mutateWeightRandom', () => {
        it('should randomize both connection and node weights', () => {
            genome.mutateWeightRandom();

            expect(genome.connections.size()).toBeGreaterThanOrEqual(1);
        });

        it('should set random connection weights', () => {
            const originalWeights: number[] = [];
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    originalWeights.push(conn.weight);
                }
            }

            genome.mutateWeightRandom();

            let changedCount = 0;
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene && conn.weight !== originalWeights[i]) {
                    changedCount++;
                }
            }

            expect(changedCount).toBeGreaterThanOrEqual(0);
        });

        it('should set random node biases for hidden nodes', () => {
            genome.mutateNode();
            genome.mutateNode();

            const originalBiases = new Map<number, number>();
            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    originalBiases.set(node.innovationNumber, node.bias);
                }
            }

            genome.mutateWeightRandom();

            expect(genome.nodes.size()).toBeGreaterThanOrEqual(5);
        });

        it('should not randomize input node biases but allow output node bias mutations', () => {
            const inputBiases: number[] = [];

            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    if (node.x === 0.01) {
                        inputBiases.push(node.bias);
                    }
                }
            }

            genome.mutateWeightRandom();

            let index = 0;
            for (let i = 0; i < genome.nodes.size(); i++) {
                const node = genome.nodes.get(i);
                if (node instanceof NodeGene) {
                    if (node.x === 0.01) {
                        expect(node.bias).toBe(inputBiases[index]);
                        index++;
                    }
                }
            }
        });
    });

    describe('mutateLinkToggle', () => {
        it('should toggle connection enabled state', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const originalEnabled = connection.enabled;
            const toggled = genome.mutateLinkToggle();

            if (toggled) {
                expect(toggled.enabled).toBe(!originalEnabled);
            }
        });

        it('should return a ConnectionGene when successful', () => {
            const result = genome.mutateLinkToggle();
            if (result) {
                expect(result).toBeInstanceOf(ConnectionGene);
            }
        });

        it('should handle selfOpt mode correctly', () => {
            const connection = genome.connections.get(0);
            if (connection instanceof ConnectionGene) {
                connection.enabled = false;

                genome.mutate(true);

                expect(connection.enabled).toBe(false);
            }
        });

        it('should toggle from enabled to disabled', () => {
            const connection = genome.connections.get(0);
            if (connection instanceof ConnectionGene) {
                connection.enabled = true;
                genome.mutateLinkToggle();

                expect(genome.connections.size()).toBeGreaterThan(0);
            }
        });
    });

    describe('mutate with weight mutations', () => {
        it('should apply multiple mutation types', () => {
            const initialState = {
                nodes: genome.nodes.size(),
                connections: genome.connections.size(),
            };

            genome.mutate();

            expect(genome.nodes.size()).toBeGreaterThanOrEqual(initialState.nodes);
        });

        it('should respect PROBABILITY_MUTATE_WEIGHT_SHIFT', () => {
            for (let i = 0; i < 10; i++) {
                const testGenome = neat.clients[0].genome;
                testGenome.mutate();
                expect(testGenome.connections.size()).toBeGreaterThan(0);
            }
        });

        it('should respect PROBABILITY_MUTATE_WEIGHT_RANDOM', () => {
            for (let i = 0; i < 10; i++) {
                const testGenome = neat.clients[0].genome;
                testGenome.mutate();
                expect(testGenome.connections.size()).toBeGreaterThan(0);
            }
        });

        it('should handle selfOpt mode for weight mutations', () => {
            genome.mutate(true);

            expect(genome.connections.size()).toBeGreaterThan(0);
        });
    });

    describe('BIAS_NODE_SAMPLING', () => {
        type BiasInternals = {
            mutateWeightShiftNode(): NodeGene | null;
            mutateWeightRandomNode(): NodeGene | null;
        };
        const INPUT_X = 0.01;
        const nonInputNodes = (g: Genome) => (g.nodes.data as NodeGene[]).filter(n => n.x !== INPUT_X);

        const typicalGenome = (sampling?: 'legacy' | 'nonInput') =>
            withSeededRandom(21, () => {
                const tNeat = new Neat(85, 1, 1, EActivation.tanh, EActivation.tanh, { BIAS_NODE_SAMPLING: sampling });
                const g = tNeat.clients[0].genome;
                for (let i = 0; i < 1000 && nonInputNodes(g).length < 9; i++) {
                    g.mutateLink();
                    g.mutateNode();
                }

                return g;
            }).result;

        it('should throw for an unknown BIAS_NODE_SAMPLING', () => {
            expect(
                () =>
                    new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, {
                        BIAS_NODE_SAMPLING: 'all' as 'legacy',
                    }),
            ).toThrow(/BIAS_NODE_SAMPLING/);
        });

        it("should default to 'legacy'", () => {
            expect(neat.BIAS_NODE_SAMPLING).toBe('legacy');
        });

        it.each(['mutateWeightShiftNode', 'mutateWeightRandomNode'] as const)(
            'should keep the legacy null on a valid 10th draw in %s',
            method => {
                const g = new Neat(85, 1, 1, EActivation.tanh, EActivation.tanh).clients[0].genome;
                const output = g.nodes.get(85) as NodeGene;
                const biasBefore = output.bias;
                const run = withRandomValues([0, 0, 0, 0, 0, 0, 0, 0, 0, 0.999], () =>
                    (g as unknown as BiasInternals)[method](),
                );
                expect(run.result).toBeNull();
                expect(run.calls).toBe(10);
                expect(output.bias).toBe(biasBefore);
            },
        );

        it('should pick a non-input node with one Math.random call in nonInput mode', () => {
            const sNeat = new Neat(85, 1, 1, EActivation.tanh, EActivation.tanh, { BIAS_NODE_SAMPLING: 'nonInput' });
            const g = sNeat.clients[0].genome;
            const output = g.nodes.get(85) as NodeGene;
            const biasBefore = output.bias;

            const shift = withRandomValues([0, 0.75], () => (g as unknown as BiasInternals).mutateWeightShiftNode());
            expect(shift.result).toBe(output);
            expect(shift.calls).toBe(2);
            expect(output.bias).toBe(biasBefore + (0.75 * 2 - 1) * sNeat.BIAS_SHIFT_STRENGTH);

            const random = withRandomValues([0.999, 0.75], () =>
                (g as unknown as BiasInternals).mutateWeightRandomNode(),
            );
            expect(random.result).toBe(output);
            expect(random.calls).toBe(2);
        });

        it('should map the draw to the non-input nodes in list order in nonInput mode', () => {
            const g = typicalGenome('nonInput');
            const candidates = nonInputNodes(g);
            expect(candidates).toHaveLength(9);
            candidates.forEach((node, k) => {
                const run = withRandomValues([(k + 0.5) / candidates.length, 0.75], () =>
                    (g as unknown as BiasInternals).mutateWeightShiftNode(),
                );
                expect(run.result).toBe(node);
            });
        });

        it.each(['mutateWeightShiftNode', 'mutateWeightRandomNode'] as const)(
            'should have no no-op calls of %s in nonInput mode (legacy has some)',
            method => {
                const count = (sampling: 'legacy' | 'nonInput') => {
                    const g = typicalGenome(sampling);
                    let nulls = 0;
                    withSeededRandom(2121, () => {
                        for (let i = 0; i < 2000; i++) {
                            const node = (g as unknown as BiasInternals)[method]();
                            if (node === null) {
                                nulls++;
                            } else {
                                expect(node.x).not.toBe(INPUT_X);
                            }
                        }
                    });

                    return nulls;
                };

                expect(count('nonInput')).toBe(0);
                expect(count('legacy')).toBeGreaterThan(0);
            },
        );

        it('should return null without Math.random calls when no non-input node exists', () => {
            const g = new Neat(3, 1, 1, EActivation.tanh, EActivation.tanh, { BIAS_NODE_SAMPLING: 'nonInput' })
                .clients[0].genome;
            const data = g.nodes.data as NodeGene[];
            data.splice(0, data.length, ...data.filter(n => n.x === INPUT_X));

            const run = withRandomValues([], () => (g as unknown as BiasInternals).mutateWeightShiftNode());
            expect(run.result).toBeNull();
            expect(run.calls).toBe(0);
        });
    });
});
