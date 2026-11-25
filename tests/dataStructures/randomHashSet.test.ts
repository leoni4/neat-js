import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RandomHashSet } from '../../src/dataStructures/randomHashSet.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { LegacyRandomHashSet } from '../helpers/legacyRandomHashSet.js';
import { mulberry32 } from '../helpers/seededRandom.js';

const innovations = (set: RandomHashSet): number[] => set.data.map(gene => gene.innovationNumber);

describe('RandomHashSet', () => {
    let randomHashSet: RandomHashSet;
    let node1: NodeGene;
    let node2: NodeGene;
    let node3: NodeGene;

    beforeEach(() => {
        randomHashSet = new RandomHashSet();
        node1 = new NodeGene(1);
        node2 = new NodeGene(2);
        node3 = new NodeGene(3);
    });

    describe('constructor', () => {
        it('should initialize with empty set and data', () => {
            expect(randomHashSet.size()).toBe(0);
            expect(randomHashSet.data).toEqual([]);
        });
    });

    describe('add', () => {
        it('should add a new gene', () => {
            randomHashSet.add(node1);
            expect(randomHashSet.size()).toBe(1);
            expect(randomHashSet.contains(node1)).toBe(true);
        });

        it('should not add duplicate genes', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node1);
            expect(randomHashSet.size()).toBe(1);
        });

        it('should add multiple different genes', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.add(node3);
            expect(randomHashSet.size()).toBe(3);
        });
    });

    describe('addSorted', () => {
        it('should add genes in sorted order by innovation number', () => {
            randomHashSet.addSorted(node3);
            randomHashSet.addSorted(node1);
            randomHashSet.addSorted(node2);

            expect(randomHashSet.get(0).innovationNumber).toBe(1);
            expect(randomHashSet.get(1).innovationNumber).toBe(2);
            expect(randomHashSet.get(2).innovationNumber).toBe(3);
        });

        it('should not add duplicate genes when using addSorted', () => {
            randomHashSet.addSorted(node1);
            randomHashSet.addSorted(node1);
            expect(randomHashSet.size()).toBe(1);
        });

        it('should handle empty set', () => {
            randomHashSet.addSorted(node2);
            expect(randomHashSet.size()).toBe(1);
            expect(randomHashSet.get(0).innovationNumber).toBe(2);
        });
    });

    describe('contains', () => {
        it('should return true for existing gene', () => {
            randomHashSet.add(node1);
            expect(randomHashSet.contains(node1)).toBe(true);
        });

        it('should return false for non-existing gene', () => {
            randomHashSet.add(node1);
            expect(randomHashSet.contains(node2)).toBe(false);
        });

        it('should return false for empty set', () => {
            expect(randomHashSet.contains(node1)).toBe(false);
        });

        it('should match by innovation number', () => {
            const node1Copy = new NodeGene(1);
            randomHashSet.add(node1);
            expect(randomHashSet.contains(node1Copy)).toBe(true);
        });
    });

    describe('randomElement', () => {
        it('should return null for empty set', () => {
            expect(randomHashSet.randomElement()).toBeNull();
        });

        it('should return the only element for single element set', () => {
            randomHashSet.add(node1);
            expect(randomHashSet.randomElement()).toBe(node1);
        });

        it('should return an element from the set', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.add(node3);

            const element = randomHashSet.randomElement();
            expect([node1, node2, node3]).toContain(element);
        });

        it('should draw from the given rng instead of Math.random', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.add(node3);
            const spy = vi.spyOn(Math, 'random');
            try {
                expect(randomHashSet.randomElement(() => 0.99)).toBe(node3);
                expect(randomHashSet.randomElement(() => 0)).toBe(node1);
                expect(spy).not.toHaveBeenCalled();
            } finally {
                spy.mockRestore();
            }
        });

        it('should not call rng for an empty set', () => {
            const rng = vi.fn(() => 0.5);
            expect(randomHashSet.randomElement(rng)).toBeNull();
            expect(rng).not.toHaveBeenCalled();
        });
    });

    describe('get', () => {
        it('should return element at specified index', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            expect(randomHashSet.get(0)).toBe(node1);
            expect(randomHashSet.get(1)).toBe(node2);
        });
    });

    describe('remove', () => {
        it('should remove gene by reference', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.remove(node1);

            expect(randomHashSet.size()).toBe(1);
            expect(randomHashSet.contains(node1)).toBe(false);
            expect(randomHashSet.contains(node2)).toBe(true);
        });

        it('should remove gene by index', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.remove(0);

            expect(randomHashSet.size()).toBe(1);
            expect(randomHashSet.contains(node1)).toBe(false);
            expect(randomHashSet.contains(node2)).toBe(true);
        });

        it('should handle invalid index', () => {
            randomHashSet.add(node1);
            randomHashSet.remove(-1);
            expect(randomHashSet.size()).toBe(1);

            randomHashSet.remove(10);
            expect(randomHashSet.size()).toBe(1);
        });

        it('should work with ConnectionGene', () => {
            const from = new NodeGene(1);
            const to = new NodeGene(2);
            const conn = new ConnectionGene(1, from, to);

            randomHashSet.add(conn);
            expect(randomHashSet.size()).toBe(1);

            randomHashSet.remove(conn);
            expect(randomHashSet.size()).toBe(0);
        });
    });

    describe('clear', () => {
        it('should clear all elements', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.add(node3);

            randomHashSet.clear();
            expect(randomHashSet.size()).toBe(0);
            expect(randomHashSet.data).toEqual([]);
        });

        it('should handle clearing empty set', () => {
            randomHashSet.clear();
            expect(randomHashSet.size()).toBe(0);
        });
    });

    describe('size', () => {
        it('should return 0 for empty set', () => {
            expect(randomHashSet.size()).toBe(0);
        });

        it('should return correct size after additions', () => {
            randomHashSet.add(node1);
            expect(randomHashSet.size()).toBe(1);

            randomHashSet.add(node2);
            expect(randomHashSet.size()).toBe(2);
        });

        it('should return correct size after removal', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);
            randomHashSet.remove(node1);
            expect(randomHashSet.size()).toBe(1);
        });
    });

    describe('data getter', () => {
        it('should return array of genes', () => {
            randomHashSet.add(node1);
            randomHashSet.add(node2);

            const data = randomHashSet.data;
            expect(Array.isArray(data)).toBe(true);
            expect(data).toHaveLength(2);
            expect(data).toContain(node1);
            expect(data).toContain(node2);
        });
    });

    describe('innovation index (same results as 1.3.0)', () => {
        it('should not contain a gene after each kind of removal, and add() should put it back', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            [node1, node2, node3].forEach(gene => randomHashSet.add(gene));

            randomHashSet.remove(node1);
            randomHashSet.remove(0);
            randomHashSet.removeByInnovation(3);
            expect([node1, node2, node3].map(gene => randomHashSet.contains(gene))).toEqual([false, false, false]);

            randomHashSet.add(node2);
            randomHashSet.add(new NodeGene(2));
            expect(randomHashSet.data).toEqual([node2]);

            randomHashSet.clear();
            expect(randomHashSet.contains(node2)).toBe(false);
            randomHashSet.addSorted(node2);
            expect(randomHashSet.data).toEqual([node2]);
            expect(warn).not.toHaveBeenCalled();
            warn.mockRestore();
        });

        it('should remove by a non-integer index like 1.3.0 (splice rounds it down)', () => {
            [node1, node2, node3].forEach(gene => randomHashSet.add(gene));

            randomHashSet.remove(1.5);

            expect(randomHashSet.data).toEqual([node1, node3]);
            expect(randomHashSet.contains(node2)).toBe(false);
        });

        it('should scan again in addSorted() after the largest gene is removed', () => {
            [1, 5, 9].forEach(id => randomHashSet.addSorted(new NodeGene(id)));
            randomHashSet.removeByInnovation(9);

            [7, 8, 6].forEach(id => randomHashSet.addSorted(new NodeGene(id)));

            expect(innovations(randomHashSet)).toEqual([1, 5, 6, 7, 8]);
        });

        it('should insert before the first larger gene in a set built with add()', () => {
            [5, 2, 8].forEach(id => randomHashSet.add(new NodeGene(id)));

            [3, 9, 1].forEach(id => randomHashSet.addSorted(new NodeGene(id)));

            expect(innovations(randomHashSet)).toEqual([1, 3, 5, 2, 8, 9]);
        });

        it('should never match NaN, like the === scan of 1.3.0', () => {
            const a = new NodeGene(NaN);
            const b = new NodeGene(NaN);

            randomHashSet.add(a);
            randomHashSet.addSorted(b);

            expect(randomHashSet.data).toEqual([a, b]);
            expect(randomHashSet.contains(a)).toBe(false);
        });

        it('should give the same data order, contains() results, and warnings as 1.3.0 for random operations', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const next = mulberry32(131);
            const pick = (count: number) => Math.floor(next() * count);
            const nodes = Array.from({ length: 40 }, (_, i) => new NodeGene((i % 30) + 1));
            const pool: Array<NodeGene | ConnectionGene> = [
                ...nodes,
                ...Array.from({ length: 10 }, (_, i) => new ConnectionGene(i * 3 + 1, nodes[i], nodes[i + 1])),
                new NodeGene(NaN),
            ];
            const current = new RandomHashSet();
            const legacy = new LegacyRandomHashSet();
            const warnings = (run: () => void): number => {
                const before = warn.mock.calls.length;
                run();

                return warn.mock.calls.length - before;
            };
            const counts = { add: 0, addSorted: 0, removeGene: 0, removeIndex: 0, removeByInnovation: 0, clear: 0 };

            for (let step = 0; step < 20_000; step++) {
                const op = pick(100);
                const gene = pool[pick(pool.length)];
                let warned: [number, number];
                if (op < 30) {
                    counts.add++;
                    warned = [warnings(() => current.add(gene)), warnings(() => legacy.add(gene))];
                } else if (op < 60) {
                    counts.addSorted++;
                    warned = [warnings(() => current.addSorted(gene)), warnings(() => legacy.addSorted(gene))];
                } else if (op < 72) {
                    counts.removeGene++;
                    warned = [warnings(() => current.remove(gene)), warnings(() => legacy.remove(gene))];
                } else if (op < 84) {
                    counts.removeIndex++;
                    const index = pick(legacy.size() + 2) - 1;
                    warned = [warnings(() => current.remove(index)), warnings(() => legacy.remove(index))];
                } else if (op < 98) {
                    counts.removeByInnovation++;
                    const id = pick(32);
                    warned = [
                        warnings(() => current.removeByInnovation(id)),
                        warnings(() => legacy.removeByInnovation(id)),
                    ];
                } else {
                    counts.clear++;
                    current.clear();
                    legacy.clear();
                    warned = [0, 0];
                }

                expect(warned[0], `step ${step}: warnings`).toBe(warned[1]);
                expect(current.size(), `step ${step}: size`).toBe(legacy.size());
                expect(
                    current.data.every((g, i) => g === legacy.data[i]),
                    `step ${step}: data order`,
                ).toBe(true);
                const probe = pool[pick(pool.length)];
                expect(current.contains(probe), `step ${step}: contains`).toBe(legacy.contains(probe));
            }

            expect(Math.min(...Object.values(counts))).toBeGreaterThan(100);
            warn.mockRestore();
        });
    });
});
