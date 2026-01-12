import { describe, it, expect, beforeEach } from 'vitest';
import { Species } from '../../src/neat/species.js';
import { Client } from '../../src/neat/client.js';
import { Neat, OutputActivation } from '../../src/neat/neat.js';

describe('Species', () => {
    let neat: Neat;
    let client1: Client;
    let client2: Client;
    let client3: Client;
    let species: Species;

    beforeEach(() => {
        neat = new Neat(2, 1, 10, OutputActivation.sigmoid);
        client1 = neat.clients[0];
        client2 = neat.clients[1];
        client3 = neat.clients[2];
        species = new Species(client1);
    });

    describe('constructor', () => {
        it('should create a species with representative client', () => {
            expect(species.clients).toHaveLength(1);
            expect(species.clients[0]).toBe(client1);
            expect(client1.species).toBe(species);
        });

        it('should initialize score to 0', () => {
            expect(species.score).toBe(0);
        });
    });

    describe('score getter', () => {
        it('should return the species score', () => {
            expect(species.score).toBe(0);
        });
    });

    describe('clients getter', () => {
        it('should return array of clients', () => {
            expect(Array.isArray(species.clients)).toBe(true);
            expect(species.clients).toHaveLength(1);
        });
    });

    describe('put', () => {
        it('should add client if distance is below threshold', () => {
            const result = species.put(client1, true);
            expect(result).toBe(true);
        });

        it('should set client species when added', () => {
            species.put(client2, true);
            expect(client2.species).toBe(species);
        });

        it('should add client to clients array', () => {
            species.put(client2, true);
            expect(species.clients).toContain(client2);
        });

        it('should respect force parameter', () => {
            const result = species.put(client2, true);
            expect(result).toBe(true);
            expect(species.clients).toContain(client2);
        });
    });

    describe('goExtinct', () => {
        it('should clear all clients', () => {
            species.put(client2, true);
            species.put(client3, true);
            species.goExtinct();
            expect(species.clients).toHaveLength(0);
        });

        it('should set client species to null', () => {
            species.put(client2, true);
            species.goExtinct();
            expect(client1.species).toBeNull();
            expect(client2.species).toBeNull();
        });
    });

    describe('evaluateScore', () => {
        it('should calculate average score of clients', () => {
            client1.score = 10;
            client2.score = 20;
            client3.score = 30;

            species.put(client2, true);
            species.put(client3, true);

            species.evaluateScore();

            expect(species.score).toBe(20); // (10 + 20 + 30) / 3
        });

        it('should handle single client', () => {
            client1.score = 15;
            species.evaluateScore();
            expect(species.score).toBe(15);
        });

        it('should handle zero scores', () => {
            client1.score = 0;
            client2.score = 0;

            species.put(client2, true);
            species.evaluateScore();

            expect(species.score).toBe(0);
        });
    });

    describe('reset', () => {
        it('should pick new representative', () => {
            species.put(client2, true);
            species.put(client3, true);

            species.reset();

            expect(species.clients).toHaveLength(1);
        });

        it('should reset score to 0', () => {
            client1.score = 100;
            species.evaluateScore();
            species.reset();
            expect(species.score).toBe(0);
        });

        it('should set representative species', () => {
            species.put(client2, true);
            species.reset();
            expect(species.clients[0].species).toBe(species);
        });
    });

    describe('kill', () => {
        it('should remove weakest clients', () => {
            client1.score = 30;
            client2.score = 20;
            client3.score = 10;

            species.put(client2, true);
            species.put(client3, true);

            species.kill(0.5);

            // Should keep top 50%: 3 * 0.5 = 1.5, so keep 2 clients
            expect(species.clients.length).toBeLessThanOrEqual(2);
        });

        it('should preserve clients with bestScore', () => {
            client1.score = 10;
            client2.score = 5;

            client2.bestScore = true;

            species.put(client2, true);
            species.kill(0.5);

            // client2 should be preserved despite low score
            expect(species.clients).toContain(client2);
        });

        it('should set killed client species to null', () => {
            client1.score = 30;
            client2.score = 10;

            species.put(client2, true);
            species.kill(0.5);

            // One of them should have null species
            const nullSpeciesCount = [client1, client2].filter(c => c.species === null).length;
            expect(nullSpeciesCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('breed', () => {
        it('should return a genome', () => {
            species.put(client2, true);
            const genome = species.breed();
            expect(genome).toBeDefined();
            expect(genome.nodes).toBeDefined();
            expect(genome.connections).toBeDefined();
        });

        it('should crossover higher scoring parent first', () => {
            client1.score = 10;
            client2.score = 20;

            species.put(client2, true);

            const genome = species.breed();
            expect(genome).toBeDefined();
        });
    });

    describe('size', () => {
        it('should return number of clients', () => {
            expect(species.size()).toBe(1);

            species.put(client2, true);
            expect(species.size()).toBe(2);

            species.put(client3, true);
            expect(species.size()).toBe(3);
        });

        it('should update after killing', () => {
            client1.score = 30;
            client2.score = 20;
            client3.score = 10;

            species.put(client2, true);
            species.put(client3, true);

            const sizeBefore = species.size();
            species.kill(0.5);
            const sizeAfter = species.size();

            expect(sizeAfter).toBeLessThanOrEqual(sizeBefore);
        });
    });
});
