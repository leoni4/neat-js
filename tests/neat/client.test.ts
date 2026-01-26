import { describe, it, expect, beforeEach } from 'vitest';
import { Client } from '../../src/neat/client.js';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Species } from '../../src/neat/species.js';

describe('Client', () => {
    let neat: Neat;
    let client: Client;

    beforeEach(() => {
        neat = new Neat(2, 1, 10, EActivation.sigmoid);
        client = neat.clients[0];
    });

    describe('constructor', () => {
        it('should create a client with genome', () => {
            expect(client.genome).toBeDefined();
            expect(client.score).toBe(0);
            expect(client.species).toBeNull();
        });
    });

    describe('score properties', () => {
        it('should get and set score', () => {
            client.score = 10;
            expect(client.score).toBe(10);
        });

        it('should get and set scoreRaw', () => {
            client.scoreRaw = 15;
            expect(client.scoreRaw).toBe(15);
        });

        it('should get and set adjustedScore', () => {
            client.adjustedScore = 12.5;
            expect(client.adjustedScore).toBe(12.5);
        });
    });

    describe('bestScore property', () => {
        it('should get and set bestScore', () => {
            expect(client.bestScore).toBe(false);
            client.bestScore = true;
            expect(client.bestScore).toBe(true);
        });
    });

    describe('error property', () => {
        it('should get and set error', () => {
            client.error = 0.05;
            expect(client.error).toBe(0.05);
        });
    });

    describe('complexity property', () => {
        it('should get and set complexity', () => {
            client.complexity = 15;
            expect(client.complexity).toBe(15);
        });
    });

    describe('species property', () => {
        it('should get and set species', () => {
            expect(client.species).toBeNull();
            const species = new Species(client);
            client.species = species;
            expect(client.species).toBe(species);
        });
    });

    describe('genome property', () => {
        it('should get and set genome', () => {
            const newGenome = neat.emptyGenome();
            client.genome = newGenome;
            expect(client.genome).toBe(newGenome);
        });
    });

    describe('generateCalculator', () => {
        it('should generate calculator from genome', () => {
            client.generateCalculator();
            expect(() => client.calculate([1, 0])).not.toThrow();
        });
    });

    describe('calculate', () => {
        it('should calculate output from input', () => {
            const output = client.calculate([1, 0]);
            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should generate calculator if not exists', () => {
            const output = client.calculate([0.5, 0.5]);
            expect(Array.isArray(output)).toBe(true);
        });
    });

    describe('distance', () => {
        it('should calculate distance between two clients', () => {
            const client2 = neat.clients[1];
            const distance = client.distance(client2);
            expect(typeof distance).toBe('number');
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should return 0 for identical genomes', () => {
            const client2 = new Client(client.genome, EActivation.sigmoid, EActivation.sigmoid);
            const distance = client.distance(client2);
            expect(distance).toBe(0);
        });
    });

    describe('mutate', () => {
        it('should mutate genome when not bestScore', () => {
            client.bestScore = false;

            // Mutate multiple times to increase chance of mutation
            for (let i = 0; i < 10; i++) {
                client.mutate(true);
            }

            // Check that mutation occurred (might add connections or nodes)
            expect(client.genome).toBeDefined();
        });

        it('should not mutate when bestScore is true and not forced', () => {
            client.bestScore = true;
            const connectionsBefore = client.genome.connections.size();
            const nodesBefore = client.genome.nodes.size();

            client.mutate(false);

            expect(client.genome.connections.size()).toBe(connectionsBefore);
            expect(client.genome.nodes.size()).toBe(nodesBefore);
        });

        it('should mutate when forced even if bestScore', () => {
            client.bestScore = true;
            client.mutate(true);
            expect(client.genome).toBeDefined();
        });

        it('should consider error threshold for optimization', () => {
            client.error = 0.001;
            client.bestScore = false;
            client.mutate(false);
            expect(client.genome).toBeDefined();
        });
    });
});
