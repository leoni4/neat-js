import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { Neat, EActivation, type INeatParams } from '../../src/neat/index.js';
import { Genome, type GenomeSaveData } from '../../src/genome/index.js';
import { mulberry32 } from '../helpers/seededRandom.js';

const STRUCTURAL: INeatParams = { PROBABILITY_MUTATE_NODES: 0.3, PROBABILITY_MUTATE_LINK: 0.5 };

const snapshot = (genome: Genome): string => JSON.stringify(genome.save());

const DATA = mulberry32(7);
const INPUTS = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => DATA() * 2 - 1));
const TARGETS = INPUTS.map(x => [1 / (1 + Math.exp(-(0.8 * x[0] - 0.5 * x[1]))), Math.tanh(x[2] * x[3]) * 0.5 + 0.5]);

const scoreAll = (neat: Neat): void => {
    for (const client of neat.clients) {
        let error = 0;
        INPUTS.forEach((input, i) => {
            client.calculate(input).forEach((value, k) => (error += Math.abs(value - TARGETS[i][k])));
        });
        client.error = error / (INPUTS.length * 2);
        client.score = 1 - client.error;
    }
};

const createNeat = (clients: number, params: INeatParams): Neat =>
    new Neat(4, 2, clients, EActivation.sigmoid, EActivation.tanh, { ...STRUCTURAL, ...params });

describe('Neat - isolation', () => {
    describe('category 4: repeated mutations across large populations', () => {
        it('mutations of random genomes in a population of 100 do not change the other genomes', () => {
            const neat = createNeat(100, { seed: 13 });
            for (let g = 0; g < 10; g++) {
                scoreAll(neat);
                neat.evolve();
            }
            const genomes = neat.clients.map(client => client.genome);
            const snapshots = genomes.map(snapshot);
            const pick = mulberry32(404);
            const changed = new Set<number>();

            for (let round = 0; round < 100; round++) {
                const index = Math.floor(pick() * genomes.length);
                genomes[index].mutate();
                genomes[index].mutateNode();
                genomes.forEach((genome, i) => {
                    if (i !== index && snapshot(genome) !== snapshots[i]) changed.add(i);
                });
                snapshots[index] = snapshot(genomes[index]);
            }

            expect(neat.allConnections.size).toBeGreaterThan(50);
            expect([...changed]).toEqual([]);
        });
    });

    describe('category 5: crossover and evolution compatibility', () => {
        it('a crossover child and its parents do not change each other', () => {
            const neat = new Neat(3, 2, 2, EActivation.sigmoid, EActivation.tanh, { seed: 17 });
            const [parent1, parent2] = neat.clients.map(client => client.genome);
            for (const parent of [parent1, parent2]) {
                for (let i = 0; i < 6; i++) parent.mutateLink();
                for (let i = 0; i < 2; i++) parent.mutateNode();
            }
            const child = Genome.crossOver(parent1, parent2);
            const parentsBefore = [parent1, parent2].map(snapshot);

            for (let i = 0; i < 20; i++) {
                child.mutate();
                child.mutateNode();
            }
            const childBefore = snapshot(child);

            expect([parent1, parent2].map(snapshot)).toEqual(parentsBefore);

            for (let i = 0; i < 20; i++) {
                for (const parent of [parent1, parent2]) {
                    parent.mutate();
                    parent.mutateNode();
                }
            }

            expect(snapshot(child)).toBe(childBefore);
        });

        it('evolve() does not change the genome of the client with bestScore', () => {
            const neat = createNeat(50, { seed: 5 });
            let checked = 0;
            const changed: number[] = [];

            for (let g = 0; g < 40; g++) {
                scoreAll(neat);
                const before = new Map(neat.clients.map(client => [client.genome, snapshot(client.genome)]));
                neat.evolve();
                // the first evolve() mutates all clients, also the best one
                if (g === 0) continue;
                // use bestScore after evolve(): evolve() adds rng() * 1e-9 to each score, so the largest score
                // before evolve() can be another client
                const best = neat.clients.find(client => client.bestScore);
                const bestBefore = best && before.get(best.genome);
                if (!best || bestBefore === undefined) continue;
                checked++;
                if (snapshot(best.genome) !== bestBefore) changed.push(g);
            }

            expect(checked).toBeGreaterThan(20);
            expect(changed).toEqual([]);
        });

        it('splits in one loaded client do not change the other clients or the loaded registry values', () => {
            const genome = JSON.parse(
                readFileSync(new URL('../golden/fixtures/load-genome.json', import.meta.url), 'utf8'),
            ) as GenomeSaveData;
            const neat = new Neat(
                4,
                1,
                10,
                EActivation.sigmoid,
                EActivation.tanh,
                { LOAD_PERCENT: 0.5, seed: 3 },
                { genome, evolveCounts: 7 },
            );
            const loadedReplaceIndexes = new Map(
                [...neat.allConnections.entries()].map(([key, record]) => [key, record.replaceIndex]),
            );
            const splitter = neat.clients[1].genome;
            const others = neat.clients.filter(client => client.genome !== splitter).map(client => client.genome);
            const before = others.map(snapshot);

            let splits = 0;
            for (let i = 0; i < 50; i++) if (splitter.mutateNode()) splits++;

            expect(splits).toBeGreaterThan(0);
            expect(others.map(snapshot)).toEqual(before);

            // a registry value can change only from 0 to the middle node of a split in the splitter
            const splitterNodes = new Set(splitter.nodes.data.map(node => node.innovationNumber));
            const changedRecords = [...loadedReplaceIndexes].filter(
                ([key, replaceIndex]) => neat.allConnections.get(key)?.replaceIndex !== replaceIndex,
            );
            const invalid = changedRecords.filter(
                ([key, replaceIndex]) =>
                    replaceIndex !== 0 || !splitterNodes.has(neat.allConnections.get(key)?.replaceIndex ?? 0),
            );

            expect(changedRecords.length).toBeGreaterThan(0);
            expect(invalid).toEqual([]);
        });
    });

    describe('category 6: reproducibility with identical seeds', () => {
        it('the same seed gives the same population, registry, and model in each generation with structural mutations', () => {
            const history = (seed: number) => {
                const neat = createNeat(30, { seed });

                return Array.from({ length: 15 }, () => {
                    scoreAll(neat);
                    neat.evolve();

                    return {
                        population: JSON.stringify(neat.clients.map(client => client.genome.save())),
                        registry: [...neat.allConnections.values()].map(record => [
                            record.innovationNumber,
                            record.from.innovationNumber,
                            record.to.innovationNumber,
                            record.replaceIndex,
                        ]),
                        nodes: neat.allNodes.size(),
                        model: JSON.stringify(neat.model()),
                    };
                });
            };
            const first = history(31);
            const second = history(31);

            expect(first[first.length - 1].registry.length).toBeGreaterThan(first[0].registry.length);
            expect(second).toEqual(first);
        });
    });
});
