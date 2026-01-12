import { describe, it, expect, beforeEach } from 'vitest';
import { RandomHashSet } from '../../src/dataStructures/randomHashSet.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';

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
});
