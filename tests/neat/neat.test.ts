import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { Genome } from '../../src/genome/genome.js';
import { Species } from '../../src/neat/species.js';
import type { GenomeSaveData } from '../../src/genome/index.js';
import { withSeededRandom } from '../helpers/seededRandom.js';

describe('Neat', () => {
    let neat: Neat;

    beforeEach(() => {
        neat = new Neat(3, 2, 10, EActivation.sigmoid);
    });

    describe('constructor', () => {
        it('should create NEAT instance with specified parameters', () => {
            expect(neat.inputNodes).toBe(3);
            expect(neat.outputNodes).toBe(2);
            expect(neat.clients).toHaveLength(10);
        });

        it('should initialize clients', () => {
            expect(neat.clients.every(c => c.genome !== undefined)).toBe(true);
        });

        it('should create input and output nodes', () => {
            const firstClient = neat.clients[0];
            expect(firstClient.genome.nodes.size()).toBeGreaterThanOrEqual(5); // 3 input + 2 output
        });
    });

    describe('getNode', () => {
        it('should get existing node by id', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(1);
            expect(node1).toBe(node2);
        });

        it('should create new node if id exceeds size', () => {
            const sizeBefore = neat.allNodes.size();
            neat.getNode();
            expect(neat.allNodes.size()).toBe(sizeBefore + 1);
        });
    });

    describe('getConnection', () => {
        it('should create connection between nodes', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(2);
            const conn = neat.getConnection(node1, node2);

            expect(conn.from).toBe(node1);
            expect(conn.to).toBe(node2);
        });

        it('should return same connection for same nodes', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(2);
            const conn1 = neat.getConnection(node1, node2);
            const conn2 = neat.getConnection(node1, node2);

            expect(conn1.innovationNumber).toBe(conn2.innovationNumber);
        });
    });

    describe('emptyGenome', () => {
        it('should create genome with only input and output nodes', () => {
            const genome = neat.emptyGenome();
            expect(genome.nodes.size()).toBe(5); // 3 input + 2 output
            expect(genome.connections.size()).toBe(0);
        });
    });

    describe('evolve', () => {
        it('should evolve population', () => {
            neat.clients.forEach((c, i) => {
                c.score = i;
            });

            neat.evolve();

            expect(neat.clients).toHaveLength(10);
        });

        it('should identify best client', () => {
            neat.clients[0].score = 100;
            neat.clients[1].score = 50;
            neat.clients[2].score = 25;

            neat.evolve();

            const bestClients = neat.clients.filter(c => c.bestScore);
            expect(bestClients.length).toBeGreaterThan(0);
        });

        it('should keep only population clients in species after elite reinsertion', () => {
            withSeededRandom(21, () => {
                const ghostNeat = new Neat(4, 1, 8, EActivation.tanh, EActivation.tanh, { OPTIMIZATION_PERIOD: 5 });
                let reinsertions = 0;
                const ghostGenerations: number[] = [];

                for (let g = 0; g < 200; g++) {
                    ghostNeat.clients.forEach((c, i) => {
                        c.score = g === 0 && i === 0 ? 1 : 0.5;
                        c.error = 0.5;
                    });
                    const epochBefore = ghostNeat.champion?.epoch ?? 0;
                    ghostNeat.evolve();
                    if (epochBefore >= 4 && ghostNeat.champion?.epoch === 0) reinsertions++;

                    const population = new Set(ghostNeat.clients);
                    const species = (ghostNeat as unknown as { _species: Species[] })._species;
                    if (species.some(s => s.clients.some(c => !population.has(c)))) {
                        ghostGenerations.push(g);
                    }
                }

                expect(reinsertions).toBeGreaterThan(0);
                expect(ghostGenerations).toEqual([]);
            });
        });

        it('should remove a species that loses all members on elite reinsertion', () => {
            withSeededRandom(7, () => {
                const elitesNeat = new Neat(2, 1, 8, EActivation.tanh, EActivation.tanh, { OPTIMIZATION_PERIOD: 1 });
                elitesNeat.clients.forEach((c, i) => {
                    c.score = i === 0 ? 1 : 0.5;
                });
                elitesNeat.evolve();

                const [x, y, ...others] = elitesNeat.clients;
                const main = new Species(others[0]);
                others.slice(1).forEach(c => main.put(c, true));
                const doomed = new Species(x);
                doomed.put(y, true);
                const internal = elitesNeat as unknown as { _species: Species[] };
                internal._species = [main, doomed];

                elitesNeat.clients.forEach(c => {
                    c.score = c === x || c === y ? 0 : 0.5;
                });
                expect(() => elitesNeat.evolve()).not.toThrow();

                expect(elitesNeat.champion?.epoch).toBe(0);
                expect(elitesNeat.clients).not.toContain(x);
                expect(elitesNeat.clients).not.toContain(y);
                expect(internal._species).not.toContain(doomed);
                expect(doomed.size()).toBe(0);
                const population = new Set(elitesNeat.clients);
                internal._species.forEach(s => s.clients.forEach(c => expect(population.has(c)).toBe(true)));
            });
        });
    });

    describe('save and load', () => {
        it('should save genome data', () => {
            const genome = neat.model();
            expect(genome).toBeDefined();
            expect(genome.nodes).toBeDefined();
            expect(genome.connections).toBeDefined();
        });

        it('should load genome data', () => {
            const genome = neat.model();
            const evolveCounts = neat.evolveCounts;
            const neat2 = new Neat(3, 2, 10, EActivation.sigmoid, EActivation.sigmoid, undefined, {
                genome,
                evolveCounts,
            });

            expect(neat2.clients).toHaveLength(10);
        });

        describe('evolveCounts warning', () => {
            const loadWithWarnSpy = (evolveCounts: number | undefined) => {
                const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
                try {
                    const loaded = new Neat(3, 2, 10, EActivation.sigmoid, EActivation.sigmoid, undefined, {
                        genome: neat.model(),
                        evolveCounts,
                    });
                    const evolveCountsWarnings = warn.mock.calls.filter(args =>
                        String(args[0]).includes('evolveCounts'),
                    );

                    return { loaded, evolveCountsWarnings };
                } finally {
                    warn.mockRestore();
                }
            };

            it('should load evolveCounts 0 without a warning', () => {
                const { loaded, evolveCountsWarnings } = loadWithWarnSpy(0);

                expect(evolveCountsWarnings).toHaveLength(0);
                expect(loaded.evolveCounts).toBe(0);
            });

            it('should warn and default to 0 when evolveCounts is missing', () => {
                const { loaded, evolveCountsWarnings } = loadWithWarnSpy(undefined);

                expect(evolveCountsWarnings).toHaveLength(1);
                expect(loaded.evolveCounts).toBe(0);
            });

            it('should warn and default to 0 when evolveCounts is NaN', () => {
                const { loaded, evolveCountsWarnings } = loadWithWarnSpy(NaN);

                expect(evolveCountsWarnings).toHaveLength(1);
                expect(loaded.evolveCounts).toBe(0);
            });

            it('should load a non-zero evolveCounts without a warning', () => {
                const { loaded, evolveCountsWarnings } = loadWithWarnSpy(3);

                expect(evolveCountsWarnings).toHaveLength(0);
                expect(loaded.evolveCounts).toBe(3);
            });
        });

        it('should give each loaded client its own genome copy', () => {
            const genome = JSON.parse(
                readFileSync(new URL('../golden/fixtures/load-genome.json', import.meta.url), 'utf8'),
            ) as GenomeSaveData;
            expect(genome.connections.length).toBeGreaterThan(0);

            const run = withSeededRandom(1, () => {
                return new Neat(4, 1, 10, EActivation.sigmoid, EActivation.tanh, {}, { genome, evolveCounts: 5 });
            });
            expect(run.calls).toBe(0);

            const neat2 = run.result;
            const loaded = neat2.clients.slice(0, 5);
            expect(new Set(loaded.map(client => client.genome)).size).toBe(5);
            const saved = loaded[0].genome.save();
            loaded.forEach(client => expect(client.genome.save()).toEqual(saved));

            const best = neat2.clients[0];
            neat2.clients.forEach(client => {
                client.score = client === best ? 1 : 0.5;
                client.error = 0.1;
            });
            neat2.evolve();

            expect(best.bestScore).toBe(true);
            expect(best.genome.save()).toEqual(saved);
        });

        it('should load no client when LOAD_PERCENT is 0', () => {
            const genome = JSON.parse(
                readFileSync(new URL('../golden/fixtures/load-genome.json', import.meta.url), 'utf8'),
            ) as GenomeSaveData;
            expect(genome.connections.length).toBeGreaterThan(0);

            const neat2 = new Neat(
                4,
                1,
                8,
                EActivation.sigmoid,
                EActivation.tanh,
                { LOAD_PERCENT: 0 },
                { genome, evolveCounts: 5 },
            );

            expect(neat2.clients).toHaveLength(8);
            neat2.clients.forEach(client => expect(client.genome.connections.size()).toBe(0));
        });

        describe('foreign replaceIndex', () => {
            it('should save replaceIndex 0 when the replace node is not in the genome', () => {
                const T = EActivation.tanh;
                const run = withSeededRandom(7, () => {
                    const neat2 = new Neat(3, 1, 1, T, T);
                    const C = neat2.clients[0].genome;
                    while (C.connections.size() < 3) C.mutateLink();
                    const R = C.connections.get(0) as ConnectionGene;
                    const D = Genome.crossOver(C, C);
                    D.connections.data.forEach(c => {
                        (c as ConnectionGene).enabled = (c as ConnectionGene).innovationNumber === R.innovationNumber;
                    });
                    let mid = null;
                    while (!mid) mid = D.mutateNode();
                    R.enabled = false;
                    for (let i = 0; i < 30 && C.nodes.size() < 7; i++) C.mutateNode();
                    R.enabled = true;
                    neat2.clients[0].genome = C;

                    return { neat2, C, R };
                });
                const { neat2, C, R } = run.result;
                const localIds = C.nodes.data.map(n => (n as NodeGene).innovationNumber).sort((a, b) => a - b);
                expect(R.replaceIndex).not.toBe(0);
                expect(localIds).not.toContain(R.replaceIndex);
                expect(localIds[localIds.length - 1]).toBeGreaterThan(R.replaceIndex);

                const m = neat2.clients[0].model();
                const savedR = m.connections.find(
                    c =>
                        c.from === localIds.indexOf(R.from.innovationNumber) + 1 &&
                        c.to === localIds.indexOf(R.to.innovationNumber) + 1,
                );
                expect(savedR?.replaceIndex).toBe(0);
                m.connections.forEach(c => {
                    if (c.replaceIndex !== 0) {
                        expect(m.nodes.map(n => n.innovationNumber)).toContain(c.replaceIndex);
                    }
                });

                const split = withSeededRandom(8, () => {
                    const loaded = new Neat(3, 1, 1, T, T, {}, { genome: m, evolveCounts: 1 });
                    const LG = loaded.clients[0].genome;
                    LG.connections.data.forEach(c => {
                        const con = c as ConnectionGene;
                        con.enabled =
                            con.from.innovationNumber === savedR?.from && con.to.innovationNumber === savedR?.to;
                    });

                    return LG.mutateNode();
                });
                expect(split.result).not.toBeNull();
                expect(split.result?.innovationNumber).toBeGreaterThan(m.nodes.length);
            });

            it('should keep only replaceIndex values that match a split of the link at load', () => {
                const genome: GenomeSaveData = {
                    nodes: [
                        { innovationNumber: 1, bias: 0, x: 0.01, y: 0.25 },
                        { innovationNumber: 2, bias: 0, x: 0.01, y: 0.5 },
                        { innovationNumber: 3, bias: 0, x: 0.01, y: 0.75 },
                        { innovationNumber: 4, bias: 0, x: 0.99, y: 0.5 },
                        { innovationNumber: 5, bias: 0, x: 0.5, y: 0.3 },
                        { innovationNumber: 6, bias: 0, x: 0.7, y: 0.4 },
                    ],
                    connections: [
                        { from: 1, to: 5, replaceIndex: 0, enabled: true, weight: 0.1 },
                        { from: 5, to: 4, replaceIndex: 0, enabled: true, weight: 0.2 },
                        { from: 3, to: 6, replaceIndex: 0, enabled: true, weight: 0.3 },
                        { from: 6, to: 4, replaceIndex: 0, enabled: true, weight: 0.4 },
                        // valid: node 5 is at the midpoint and the links 1→5 and 5→4 exist
                        { from: 1, to: 4, replaceIndex: 5, enabled: true, weight: 0.5 },
                        // alias: x matches the midpoint, but there is no link 2→5
                        { from: 2, to: 4, replaceIndex: 5, enabled: true, weight: 0.6 },
                        // links exist, but node 6 is not at the midpoint of 3→4
                        { from: 3, to: 4, replaceIndex: 6, enabled: false, weight: 0.7 },
                        // unknown node id
                        { from: 2, to: 6, replaceIndex: 9, enabled: true, weight: 0.8 },
                    ],
                };
                const snapshot = structuredClone(genome);

                const loaded = new Neat(3, 1, 2, EActivation.tanh, EActivation.tanh, {}, { genome, evolveCounts: 1 });

                expect(genome).toEqual(snapshot);
                const nodeById = (id: number) =>
                    loaded.clients[0].genome.nodes.data.find(n => (n as NodeGene).innovationNumber === id) as NodeGene;
                expect(loaded.getReplaceIndex(nodeById(1), nodeById(4))).toBe(5);
                expect(loaded.getReplaceIndex(nodeById(2), nodeById(4))).toBe(0);
                expect(loaded.getReplaceIndex(nodeById(3), nodeById(4))).toBe(0);
                expect(loaded.getReplaceIndex(nodeById(2), nodeById(6))).toBe(0);
            });
        });
    });

    describe('MAX_NODES', () => {
        it('should be a large constant', () => {
            expect(Neat.MAX_NODES).toBe(Math.pow(2, 20));
        });
    });

    describe('parameters', () => {
        it('should accept custom parameters', () => {
            const customNeat = new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, {
                C1: 2,
                C2: 2,
                C3: 0.5,
            });

            expect(customNeat.C1).toBe(2);
            expect(customNeat.C2).toBe(2);
            expect(customNeat.C3).toBe(0.5);
        });

        it('should use default parameters when not specified', () => {
            expect(neat.C1).toBe(1);
            expect(neat.C2).toBe(1);
            expect(neat.C3).toBe(0.2);
        });

        it.each([
            [true, true],
            [false, false],
            [undefined, false],
        ])('should set PERMANENT_MAIN_CONNECTIONS %s to %s', (value, expected) => {
            const customNeat = new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, {
                PERMANENT_MAIN_CONNECTIONS: value,
            });

            expect(customNeat.PERMANENT_MAIN_CONNECTIONS).toBe(expected);
        });

        describe('zero mutation strengths', () => {
            it.each(['WEIGHT_RANDOM_STRENGTH', 'BIAS_RANDOM_STRENGTH'] as const)(
                'should throw when %s is 0 and random weight mutation can run',
                key => {
                    expect(() => new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, { [key]: 0 })).toThrow(
                        /PROBABILITY_MUTATE_WEIGHT_RANDOM: 0/,
                    );
                },
            );

            it.each([{ PROBABILITY_MUTATE_WEIGHT_RANDOM: 0 }, { MUTATION_RATE: 0 }])(
                'should construct and evolve with zero random strengths when random weight mutation cannot run (%o)',
                params => {
                    const run = withSeededRandom(606, () => {
                        const zeroNeat = new Neat(3, 1, 10, EActivation.tanh, EActivation.tanh, {
                            WEIGHT_RANDOM_STRENGTH: 0,
                            BIAS_RANDOM_STRENGTH: 0,
                            ...params,
                        });
                        for (let gen = 0; gen < 20; gen++) {
                            zeroNeat.clients.forEach((c, i) => {
                                c.score = i;
                            });
                            zeroNeat.evolve();
                        }

                        return zeroNeat;
                    });

                    expect(run.result.evolveCounts).toBe(20);
                    expect(run.result.clients).toHaveLength(10);
                },
            );

            it.each(['WEIGHT_SHIFT_STRENGTH', 'BIAS_SHIFT_STRENGTH'] as const)(
                'should warn when %s is 0 and weight shift mutation can run',
                key => {
                    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
                    try {
                        new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, { [key]: 0 });
                        expect(warn).toHaveBeenCalledWith(expect.stringContaining(`${key} is 0`));
                    } finally {
                        warn.mockRestore();
                    }
                },
            );

            it('should not warn about a zero shift strength when weight shift mutation cannot run', () => {
                const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
                try {
                    new Neat(2, 1, 5, EActivation.sigmoid, EActivation.sigmoid, {
                        WEIGHT_SHIFT_STRENGTH: 0,
                        BIAS_SHIFT_STRENGTH: 0,
                        PROBABILITY_MUTATE_WEIGHT_SHIFT: 0,
                    });
                    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('SHIFT_STRENGTH is 0'));
                } finally {
                    warn.mockRestore();
                }
            });

            it('should still set the mutated weight to 0 when WEIGHT_SHIFT_STRENGTH is 0', () => {
                const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
                try {
                    const shiftNeat = new Neat(1, 1, 1, EActivation.sigmoid, EActivation.sigmoid, {
                        WEIGHT_SHIFT_STRENGTH: 0,
                    });
                    const genome = shiftNeat.clients[0].genome;
                    while (genome.connections.size() === 0) {
                        genome.mutateLink();
                    }
                    const con = genome.connections.get(0);
                    if (!(con instanceof ConnectionGene)) {
                        throw new Error('expected one connection');
                    }
                    con.weight = 0.8;

                    genome.mutateWeightShift();

                    expect(con.weight).toBe(0);
                } finally {
                    warn.mockRestore();
                }
            });
        });
    });

    describe('EActivation enum', () => {
        it('should have all activation types', () => {
            expect(EActivation.none).toBe('none');
            expect(EActivation.sigmoid).toBe('sigmoid');
            expect(EActivation.tanh).toBe('tanh');
            expect(EActivation.relu).toBe('relu');
            expect(EActivation.leakyRelu).toBe('leakyRelu');
            expect(EActivation.linear).toBe('linear');
            expect(EActivation.softmax).toBe('softmax');
        });
    });
});
