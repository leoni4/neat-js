import { RandomSelector } from '../../src/dataStructures/RandomSelector';

describe('dataStructures/RandomSelector test', () => {
    const testObj = { test: 1 },
        testScore = 100;
    let mySelector: RandomSelector;
    beforeEach(() => {
        mySelector = new RandomSelector();
    });

    it('creates empty selector', () => {
        expect(mySelector.getScores().length).toBe(0);
        expect(mySelector.getObjects().length).toBe(0);
        expect(mySelector.getTotalScore()).toBe(0);
    });

    it('add score item', () => {
        mySelector.add(testObj, testScore);
        expect(mySelector.getScores().length).toBe(1);
        expect(mySelector.getObjects().length).toBe(1);
        expect(mySelector.getTotalScore()).toBe(testScore);
        mySelector.add(testObj, testScore);
        expect(mySelector.getScores().length).toBe(2);
        expect(mySelector.getObjects().length).toBe(2);
        expect(mySelector.getTotalScore()).toBe(testScore * 2);
    });

    it('returns random score item', () => {
        expect(mySelector.random()).toBe(null);
        mySelector.add(testObj, testScore);
        expect(mySelector.random()).toBe(testObj);
    });

    it('resets all set', () => {
        mySelector.add(testObj, testScore);
        mySelector.reset();
        expect(mySelector.getTotalScore()).toBe(0);
    });
});
