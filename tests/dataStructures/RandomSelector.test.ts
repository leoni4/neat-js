import { RandomSelector } from '../../src/dataStructures';
import { Neat, Species, Client } from '../../src/neat';
import { Genome } from '../../src/genome';

describe('dataStructures/RandomSelector test', () => {
    const testNeat = new Neat(2, 1, 1);
    const testGenome = new Genome(testNeat);
    const testClient = new Client(testGenome);
    testClient.score = 100;
    const testSpecies = new Species(testClient);
    testSpecies.evaluateScore(false);
    let mySelector: RandomSelector;
    beforeEach(() => {
        mySelector = new RandomSelector(0.8);
    });

    it('add score item', () => {
        mySelector.add(testSpecies);
        expect(mySelector.objects.length).toBe(1);
        expect(mySelector.objects.length).toBe(1);
        expect(mySelector.totalScore).toBe(testClient.score);
        mySelector.add(testSpecies);
        expect(mySelector.objects.length).toBe(2);
        expect(mySelector.objects.length).toBe(2);
        expect(mySelector.totalScore).toBe(testClient.score * 2);
    });

    it('returns random score item', () => {
        const errorTest = () => {
            mySelector.random();
        };
        expect(errorTest).toThrow('random Species not found');
        mySelector.add(testSpecies);
        expect(mySelector.random()).toBe(testSpecies);
    });

    it('resets all set', () => {
        mySelector.add(testSpecies);
        mySelector.reset();
        expect(mySelector.totalScore).toBe(0);
    });
});
