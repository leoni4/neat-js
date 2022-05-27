import { RandomHashSet } from '../../src/dataStructures';
import { NodeGene } from '../../src/genome';

describe('dataStructures/RandomHashSet test', () => {
    const mockObj1 = new NodeGene(1);
    const mockObj2 = new NodeGene(2);
    let mySet: RandomHashSet;

    beforeEach(() => {
        mySet = new RandomHashSet();
    });

    it('creates empty data', () => {
        expect(mySet).toBeTruthy();
        expect(mySet.data).toStrictEqual([]);
    });

    it('pushes/removed to the set', () => {
        expect(mySet.data.length).toBe(0);
        mySet.add(mockObj1);
        expect(mySet.data.length).toBe(1);
        mySet.remove(10);
        expect(mySet.data.length).toBe(1);
        mySet.remove(0);
        expect(mySet.data.length).toBe(0);
    });

    it('returned random element from set', () => {
        expect(mySet.randomElement()).toBe(null);
        mySet.add(mockObj1);
        expect(mySet.randomElement()).toBe(mockObj1);
        mySet.add(mockObj2);
        mySet.remove(0);
        expect(mySet.randomElement()).toBe(mockObj2);
    });

    it('clears all data', () => {
        mySet.add(mockObj1);
        mySet.add(mockObj2);
        expect(mySet.data.length).toBe(2);
        mySet.clear();
        expect(mySet.data.length).toBe(0);
    });

    it('gets an object by index', () => {
        mySet.add(mockObj1);
        mySet.add(mockObj2);
        expect(mySet.get(3)).toBe(undefined);
        expect(mySet.get(1)).toBe(mockObj2);
        expect(mySet.get(0)).toBe(mockObj1);
    });

    it('addSorted right', () => {
        mySet.addSorted(mockObj2);
        expect(mySet.get(0).innovationNumber).toBe(2);
        mySet.addSorted(mockObj1);
        expect(mySet.get(0).innovationNumber).toBe(1);
    });
});
