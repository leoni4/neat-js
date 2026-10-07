import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { NETWORK_CONSTANTS } from '../../src/neat/constants.js';
import { buildGenome, NodeLayout, registerLinks } from '../helpers/genomeBuilder.js';
import { withRandomValues } from '../helpers/seededRandom.js';

const innovations = (genome: Genome): number[] => genome.connections.data.map(c => c.innovationNumber);

const connectionGenes = (genome: Genome): ConnectionGene[] =>
    genome.connections.data.filter((c): c is ConnectionGene => c instanceof ConnectionGene);

const nodeGene = (genome: Genome, id: number): NodeGene => {
    const node = genome.nodes.data.find(n => n.innovationNumber === id);
    if (!(node instanceof NodeGene)) throw new Error(`node ${id} is not in the genome`);

    return node;
};

describe('Genome - crossOver', () => {
    let neat: Neat;
    let genome1: Genome;
    let genome2: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid);
        genome1 = neat.clients[0].genome;
        genome2 = neat.clients[0].genome;
    });

    describe('basic crossover', () => {
        it('should create offspring genome from two parents', () => {
            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring).toBeInstanceOf(Genome);
            expect(offspring.neat).toBe(genome1.neat);
        });

        it('should inherit nodes from parent genomes', () => {
            genome1.mutateNode();
            genome2.mutateNode();

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring.nodes.size()).toBeGreaterThan(0);
        });

        it('should inherit connections from fitter parent', () => {
            genome1.mutateLink();
            genome2.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            expect(innovations(offspring)).toEqual(innovations(genome1));
        });
    });

    describe('gene inheritance', () => {
        it('should inherit matching genes from both parents randomly', () => {
            genome1.mutateLink();
            genome1.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            expect(innovations(offspring)).toEqual(innovations(genome1));
            expect(offspring.nodes.size()).toBe(5);
        });

        it('should inherit disjoint genes from fitter parent', () => {
            for (let i = 0; i < 3; i++) {
                genome1.mutateLink();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring.connections.size()).toBeGreaterThan(0);
        });

        it('should inherit excess genes from fitter parent', () => {
            genome1.mutateLink();
            genome2.mutateLink();

            for (let i = 0; i < 5; i++) {
                genome1.mutateNode();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring.nodes.size()).toBeGreaterThanOrEqual(genome2.nodes.size());
        });
    });

    describe('gene alignment rules (hand-built parents)', () => {
        const LAYOUT: NodeLayout = {
            1: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 1 / 3 },
            2: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 2 / 3 },
            3: { x: NETWORK_CONSTANTS.OUTPUT_NODE_X, y: 0.5 },
            4: { x: 0.5, y: 0.25 },
            5: { x: 0.5, y: 0.75 },
        };

        let xNeat: Neat;
        let L: number[];
        let parentA: Genome;
        let parentB: Genome;

        beforeEach(() => {
            xNeat = new Neat(2, 1, 1, EActivation.sigmoid, EActivation.sigmoid);
            L = registerLinks(xNeat, LAYOUT, [
                [1, 3],
                [2, 3],
                [1, 4],
                [4, 3],
                [2, 5],
                [5, 3],
                [1, 5],
            ]);
            parentA = buildGenome(xNeat, LAYOUT, {
                nodes: { 1: 0, 2: 0, 3: 0.375, 4: 0.25, 5: 0.5 },
                links: [
                    { from: 1, to: 3, weight: 0.1, replaceIndex: 4 },
                    { from: 2, to: 3, weight: 0.2 },
                    { from: 1, to: 4, weight: 0.3, enabled: false },
                    { from: 2, to: 5, weight: 0.5, enabled: false },
                    { from: 5, to: 3, weight: 0.6 },
                    { from: 1, to: 5, weight: 0.7, enabled: false },
                ],
            });
            parentB = buildGenome(xNeat, LAYOUT, {
                nodes: { 1: 0, 2: 0, 3: -0.375, 4: -0.25, 5: -0.5 },
                links: [
                    { from: 1, to: 3, weight: -0.1 },
                    { from: 2, to: 3, weight: -0.2, enabled: false },
                    { from: 4, to: 3, weight: -0.4 },
                    { from: 2, to: 5, weight: -0.5, enabled: false },
                ],
            });
        });

        const summary = (genome: Genome) =>
            connectionGenes(genome).map(c => [c.innovationNumber, c.weight, c.enabled, c.replaceIndex]);

        it('should take a matching gene from g1 when Math.random() > 0.4', () => {
            const { result: child, calls } = withRandomValues([0.41, 0.41, 0.75, 0.41], () =>
                Genome.crossOver(parentA, parentB),
            );

            expect(calls).toBe(4);
            expect(summary(child)).toEqual([
                [L[0], 0.1, true, 4],
                [L[1], 0.2, true, 0],
                [L[2], 0.3, false, 0],
                [L[4], 0.5, false, 0],
                [L[5], 0.6, true, 0],
                [L[6], 0.7, false, 0],
            ]);
        });

        it('should take a matching gene from g2 when Math.random() <= 0.4', () => {
            const { result: child, calls } = withRandomValues([0.4, 0.4, 0.7499, 0.4], () =>
                Genome.crossOver(parentA, parentB),
            );

            expect(calls).toBe(4);
            expect(summary(child)).toEqual([
                [L[0], -0.1, true, 0],
                [L[1], -0.2, false, 0],
                [L[2], 0.3, false, 0],
                [L[4], -0.5, false, 0],
                [L[5], 0.6, true, 0],
                [L[6], 0.7, false, 0],
            ]);
        });

        it('should disable a matching gene when Math.random() < 0.75 and the parents differ', () => {
            const enabled2to3 = (draw: number): boolean | undefined => {
                const { result: child } = withRandomValues([0.9, 0.9, draw, 0.9], () =>
                    Genome.crossOver(parentA, parentB),
                );

                return connectionGenes(child).find(c => c.innovationNumber === L[1])?.enabled;
            };

            expect(enabled2to3(0)).toBe(false);
            expect(enabled2to3(0.7499)).toBe(false);
            expect(enabled2to3(0.75)).toBe(true);
            expect(enabled2to3(0.99)).toBe(true);
        });

        it('should keep the common enabled value of a matching gene without a random draw', () => {
            const { result: child, calls } = withRandomValues([0.9, 0.9, 0.9, 0.9], () =>
                Genome.crossOver(parentA, parentB),
            );

            expect(calls).toBe(4);
            const enabled = new Map(connectionGenes(child).map(c => [c.innovationNumber, c.enabled]));
            expect(enabled.get(L[0])).toBe(true);
            expect(enabled.get(L[4])).toBe(false);
        });

        it('should drop the disjoint and excess genes of g2', () => {
            const { result: child, calls } = withRandomValues([0.9, 0.9, 0.9, 0.9], () =>
                Genome.crossOver(parentB, parentA),
            );

            expect(calls).toBe(4);
            expect(summary(child)).toEqual([
                [L[0], -0.1, true, 0],
                [L[1], -0.2, true, 0],
                [L[3], -0.4, true, 0],
                [L[4], -0.5, false, 0],
            ]);
            expect(nodeGene(child, 4)).toMatchObject({ x: 0.5, y: 0.25, bias: -0.25 });
        });

        it.each([
            { optimization: false, selfOpt: false, kept: [0, 1, 2, 4, 5, 6] },
            { optimization: false, selfOpt: true, kept: [0, 1, 2, 4, 5, 6] },
            { optimization: true, selfOpt: false, kept: [0, 1, 2, 4, 5] },
            { optimization: true, selfOpt: true, kept: [0, 1, 4, 5] },
        ])(
            'should filter disabled g1 genes with optimization $optimization and selfOpt $selfOpt',
            ({ optimization, selfOpt, kept }) => {
                xNeat['_optimization'] = optimization;
                parentA['_selfOpt'] = selfOpt;

                const { result: child } = withRandomValues([0.9, 0.9, 0.9, 0.9], () =>
                    Genome.crossOver(parentA, parentB),
                );

                expect(innovations(child)).toEqual(kept.map(i => L[i]));
            },
        );

        it('should create own hidden nodes with x, y, and bias of the first cloned gene', () => {
            const childOf = (pick: number): Genome =>
                withRandomValues([pick, pick, 0.9, pick], () => Genome.crossOver(parentA, parentB)).result;

            const fromA = childOf(0.9);
            const fromB = childOf(0.1);

            for (const child of [fromA, fromB]) {
                expect(child.nodes.data.map(n => n.innovationNumber)).toEqual([1, 2, 3, 4, 5]);
                expect(nodeGene(child, 4)).toMatchObject({ x: 0.5, y: 0.25, bias: 0.25 });
                expect(nodeGene(child, 3).bias).toBe(0.375);
            }
            expect(nodeGene(fromA, 5)).toMatchObject({ x: 0.5, y: 0.75, bias: 0.5 });
            expect(nodeGene(fromB, 5)).toMatchObject({ x: 0.5, y: 0.75, bias: -0.5 });
        });

        it('should link child connections to child nodes, not to parent genes', () => {
            const { result: child } = withRandomValues([0.9, 0.9, 0.9, 0.9], () => Genome.crossOver(parentA, parentB));
            const parentGenes = [...connectionGenes(parentA), ...connectionGenes(parentB)];
            const parentNodes = [...parentA.nodes.data, ...parentB.nodes.data];

            for (const con of connectionGenes(child)) {
                expect(parentGenes).not.toContain(con);
                expect(con.from).toBe(nodeGene(child, con.from.innovationNumber));
                expect(con.to).toBe(nodeGene(child, con.to.innovationNumber));
                expect(parentNodes).not.toContain(con.from);
                expect(parentNodes).not.toContain(con.to);
            }
            const ids = child.nodes.data.map(n => n.innovationNumber);
            expect(new Set(ids).size).toBe(ids.length);
        });
    });

    describe('connection and node consistency', () => {
        it('should only include nodes referenced by connections', () => {
            genome1.mutateNode();
            genome2.mutateNode();

            const offspring = Genome.crossOver(genome1, genome2);

            for (let i = 0; i < offspring.connections.size(); i++) {
                const conn = offspring.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    let fromFound = false;
                    let toFound = false;

                    for (let j = 0; j < offspring.nodes.size(); j++) {
                        const node = offspring.nodes.get(j);
                        if (node === conn.from) fromFound = true;
                        if (node === conn.to) toFound = true;
                    }

                    expect(fromFound).toBe(true);
                    expect(toFound).toBe(true);
                }
            }
        });

        it('should maintain node uniqueness', () => {
            const offspring = Genome.crossOver(genome1, genome2);

            const nodeIds = new Set<number>();
            for (let i = 0; i < offspring.nodes.size(); i++) {
                const node = offspring.nodes.get(i);
                if (node && 'innovationNumber' in node) {
                    expect(nodeIds.has(node.innovationNumber)).toBe(false);
                    nodeIds.add(node.innovationNumber);
                }
            }
        });
    });

    describe('edge cases', () => {
        it('should handle genomes with different sizes', () => {
            for (let i = 0; i < 10; i++) {
                genome1.mutateLink();
                genome1.mutateNode();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring).toBeInstanceOf(Genome);
            expect(offspring.nodes.size()).toBeGreaterThan(0);
        });

        it('should handle empty connections', () => {
            const emptyGenome1 = neat.emptyGenome();
            const emptyGenome2 = neat.emptyGenome();

            const offspring = Genome.crossOver(emptyGenome1, emptyGenome2);

            expect(offspring.nodes.size()).toBe(5);
            expect(offspring.connections.size()).toBe(0);
        });

        it('should work when one parent has no middle nodes', () => {
            const emptyGenome = neat.emptyGenome();
            genome1.mutateNode();
            genome1.mutateNode();

            const offspring = Genome.crossOver(genome1, emptyGenome);

            expect(offspring).toBeInstanceOf(Genome);
        });
    });

    describe('output node biases', () => {
        const outputNodes = (genome: Genome): NodeGene[] =>
            genome.nodes.data.filter(
                (n): n is NodeGene => n instanceof NodeGene && n.x === NETWORK_CONSTANTS.OUTPUT_NODE_X,
            );

        it('should keep the output biases of the parent', () => {
            outputNodes(genome1).forEach((n, i) => (n.bias = 0.7 + i * 0.1));

            const offspring = Genome.crossOver(genome1, genome1);

            expect(outputNodes(offspring).map(n => [n.innovationNumber, n.bias])).toEqual(
                outputNodes(genome1).map(n => [n.innovationNumber, n.bias]),
            );
        });

        it('should keep the output biases of the fitter parent g1', () => {
            const parent2 = neat.emptyGenome();
            outputNodes(genome1).forEach(n => (n.bias = 0.7));
            outputNodes(parent2).forEach(n => (n.bias = -0.3));

            const offspring = Genome.crossOver(genome1, parent2);

            expect(outputNodes(offspring).map(n => n.bias)).toEqual([0.7, 0.7]);
        });

        it('should keep the output biases when the parents have no connections', () => {
            const parent = neat.emptyGenome();
            outputNodes(parent).forEach(n => (n.bias = 0.7));

            const offspring = Genome.crossOver(parent, neat.emptyGenome());

            expect(outputNodes(offspring).map(n => n.bias)).toEqual([0.7, 0.7]);
        });

        it('should not share output nodes with the parent', () => {
            outputNodes(genome1).forEach(n => (n.bias = 0.7));

            const offspring = Genome.crossOver(genome1, genome1);
            outputNodes(genome1).forEach(n => (n.bias = 0.1));

            expect(outputNodes(offspring).map(n => n.bias)).toEqual([0.7, 0.7]);
        });

        it('should not copy input biases', () => {
            genome1.nodes.data.forEach(n => {
                if (n instanceof NodeGene && n.x === NETWORK_CONSTANTS.INPUT_NODE_X) n.bias = 0.5;
            });

            const offspring = Genome.crossOver(genome1, genome1);

            const inputBiases = offspring.nodes.data
                .filter((n): n is NodeGene => n instanceof NodeGene && n.x === NETWORK_CONSTANTS.INPUT_NODE_X)
                .map(n => n.bias);
            expect(inputBiases).toEqual([0, 0, 0]);
        });
    });

    describe('innovation number ordering', () => {
        it('should maintain sorted order of connections', () => {
            genome1.mutateLink();
            genome1.mutateLink();
            genome2.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            for (let i = 1; i < offspring.connections.size(); i++) {
                const prev = offspring.connections.get(i - 1);
                const curr = offspring.connections.get(i);
                if (prev instanceof ConnectionGene && curr instanceof ConnectionGene) {
                    expect(prev.innovationNumber).toBeLessThanOrEqual(curr.innovationNumber);
                }
            }
        });
    });
});
