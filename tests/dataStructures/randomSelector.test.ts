import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RandomSelector } from '../../src/dataStructures/randomSelector.js';
import { Species } from '../../src/neat/species.js';
import { Client } from '../../src/neat/client.js';
import { Neat, EActivation } from '../../src/neat/neat.js';

describe('RandomSelector', () => {
    let randomSelector: RandomSelector;
    let neat: Neat;
    let client1: Client;
    let client2: Client;
    let client3: Client;
    let species1: Species;
    let species2: Species;
    let species3: Species;

    beforeEach(() => {
        randomSelector = new RandomSelector(0.8);
        neat = new Neat(3, 2, 10, EActivation.sigmoid, EActivation.sigmoid);

        client1 = neat.clients[0];
        client2 = neat.clients[1];
        client3 = neat.clients[2];

        client1.score = 10;
        client2.score = 20;
        client3.score = 30;

        species1 = new Species(client1);
        species2 = new Species(client2);
        species3 = new Species(client3);
    });

    describe('constructor', () => {
        it('should initialize with empty objects and zero total score', () => {
            expect(randomSelector.objects).toEqual([]);
            expect(randomSelector.totalScore).toBe(0);
        });
    });

    describe('add', () => {
        it('should add a species and update total score', () => {
            randomSelector.add(species1);
            expect(randomSelector.objects).toHaveLength(1);
            expect(randomSelector.totalScore).toBe(species1.score);
        });

        it('should add multiple species and accumulate scores', () => {
            randomSelector.add(species1);
            randomSelector.add(species2);
            randomSelector.add(species3);

            expect(randomSelector.objects).toHaveLength(3);
            expect(randomSelector.totalScore).toBe(species1.score + species2.score + species3.score);
        });

        it('should sort species by score in descending order', () => {
            species1.evaluateScore();
            species2.evaluateScore();
            species3.evaluateScore();

            randomSelector.add(species1); // score 10
            randomSelector.add(species3); // score 30
            randomSelector.add(species2); // score 20

            expect(randomSelector.objects[0].score).toBe(30);
            expect(randomSelector.objects[1].score).toBe(20);
            expect(randomSelector.objects[2].score).toBe(10);
        });
    });

    describe('random', () => {
        beforeEach(() => {
            randomSelector.add(species1);
            randomSelector.add(species2);
            randomSelector.add(species3);
        });

        it('should return a species from the list', () => {
            const result = randomSelector.random();
            expect([species1, species2, species3]).toContain(result);
        });

        it('should return first species when random is 0', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const result = randomSelector.random();
            expect(randomSelector.objects).toContain(result);
        });

        it('should always return a valid species', () => {
            for (let i = 0; i < 10; i++) {
                const result = randomSelector.random();
                expect(randomSelector.objects).toContain(result);
            }
        });

        it('should return the first species when index exceeds total', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.99);
            const result = randomSelector.random();
            expect(randomSelector.objects).toContain(result);
        });
    });

    describe('reset', () => {
        it('should clear objects and reset total score', () => {
            randomSelector.add(species1);
            randomSelector.add(species2);
            randomSelector.add(species3);

            randomSelector.reset();

            expect(randomSelector.objects).toEqual([]);
            expect(randomSelector.totalScore).toBe(0);
        });

        it('should allow adding after reset', () => {
            randomSelector.add(species1);
            randomSelector.reset();
            randomSelector.add(species2);

            expect(randomSelector.objects).toHaveLength(1);
            expect(randomSelector.totalScore).toBe(species2.score);
        });
    });

    describe('totalScore getter', () => {
        it('should return correct total score', () => {
            randomSelector.add(species1);
            randomSelector.add(species2);

            expect(randomSelector.totalScore).toBe(species1.score + species2.score);
        });
    });

    describe('objects getter', () => {
        it('should return the species array', () => {
            randomSelector.add(species1);
            randomSelector.add(species2);

            const objects = randomSelector.objects;
            expect(Array.isArray(objects)).toBe(true);
            expect(objects).toHaveLength(2);
        });
    });
});
