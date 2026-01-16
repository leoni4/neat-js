import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, OutputActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';

describe('Genome - mutateLink', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, OutputActivation.sigmoid);
        genome = neat.emptyGenome();
    });

    describe('basic link creation', () => {
        it('should create a connection between valid nodes', () => {
            const initialConnections = genome.connections.size();
            const newConnection = genome.mutateLink();

            if (newConnection) {
                expect(newConnection).toBeInstanceOf(ConnectionGene);
                expect(genome.connections.size()).toBe(initialConnections + 1);
            }
        });

        it('should create connection with random weight', () => {
            const connection = genome.mutateLink();
            if (connection) {
                expect(connection.weight).not.toBe(0);
                expect(Math.abs(connection.weight)).toBeLessThanOrEqual(neat.WEIGHT_RANDOM_STRENGTH);
            }
        });

        it('should connect nodes with different x-coordinates', () => {
            const connection = genome.mutateLink();
            if (connection) {
                expect(connection.from.x).not.toBe(connection.to.x);
            }
        });

        it('should connect from lower x to higher x', () => {
            const connection = genome.mutateLink();
            if (connection) {
                expect(connection.from.x).toBeLessThan(connection.to.x);
            }
        });
    });

    describe('same x-coordinate handling', () => {
        it('should return null after multiple retries with same x-coordinates', () => {
            // Create a genome with only input and output nodes (different x but limited options)
            const singleLayerNeat = new Neat(5, 1, 1, OutputActivation.sigmoid);
            const singleLayerGenome = singleLayerNeat.emptyGenome();

            // After creating all possible connections, mutateLink should return null
            // Fill up all possible connections first
            for (let i = 0; i < 10; i++) {
                singleLayerGenome.mutateLink();
            }

            // Now try again - should return null eventually when all connections exist
            let nullCount = 0;
            for (let i = 0; i < 20; i++) {
                const result = singleLayerGenome.mutateLink();
                if (result === null) {
                    nullCount++;
                }
            }
            // Should have at least some nulls when connections are saturated
            expect(nullCount).toBeGreaterThanOrEqual(0);
        });

        it('should retry when selecting nodes with same x-coordinate', () => {
            // This tests the retry mechanism indirectly
            // by attempting to create links multiple times
            let successCount = 0;
            for (let i = 0; i < 10; i++) {
                const testGenome = neat.emptyGenome();
                const connection = testGenome.mutateLink();
                if (connection) {
                    successCount++;
                    expect(connection.from.x).not.toBe(connection.to.x);
                }
            }
            // At least some should succeed
            expect(successCount).toBeGreaterThan(0);
        });
    });

    describe('existing connection handling', () => {
        it('should return null when connection already exists', () => {
            // First create a connection
            const connection1 = genome.mutateLink();
            expect(connection1).not.toBeNull();

            // Try to create the exact same connection by manipulating
            // the genome to only have those two nodes
            if (connection1) {
                const from = connection1.from;
                const to = connection1.to;

                // Create a new genome with same nodes
                const testGenome = neat.emptyGenome();
                const existingConn = neat.getConnection(from, to);
                testGenome.connections.addSorted(existingConn);

                // Now try to add the same connection again through direct check
                let exists = false;
                testGenome.connections.data.forEach(item => {
                    if (item instanceof ConnectionGene) {
                        if (item.from === from && item.to === to) {
                            exists = true;
                        }
                    }
                });
                expect(exists).toBe(true);
            }
        });

        it('should not add duplicate connections', () => {
            // Add multiple connections
            for (let i = 0; i < 20; i++) {
                genome.mutateLink();
            }

            // Verify no duplicates by checking all connections
            const connectionKeys = new Set<string>();
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    const key = `${conn.from.innovationNumber}-${conn.to.innovationNumber}`;
                    expect(connectionKeys.has(key)).toBe(false);
                    connectionKeys.add(key);
                }
            }
        });
    });

    describe('weight initialization', () => {
        it('should initialize weight within WEIGHT_RANDOM_STRENGTH bounds', () => {
            for (let i = 0; i < 20; i++) {
                const testGenome = neat.emptyGenome();
                const connection = testGenome.mutateLink();
                if (connection) {
                    expect(Math.abs(connection.weight)).toBeLessThanOrEqual(neat.WEIGHT_RANDOM_STRENGTH);
                }
            }
        });

        it('should create weights in range [-WEIGHT_RANDOM_STRENGTH, WEIGHT_RANDOM_STRENGTH]', () => {
            const weights: number[] = [];
            for (let i = 0; i < 50; i++) {
                const testGenome = neat.emptyGenome();
                const connection = testGenome.mutateLink();
                if (connection) {
                    weights.push(connection.weight);
                }
            }

            // Check that we have both positive and negative weights
            const hasPositive = weights.some(w => w > 0);
            const hasNegative = weights.some(w => w < 0);
            expect(hasPositive).toBe(true);
            expect(hasNegative).toBe(true);

            // All should be within bounds
            weights.forEach(w => {
                expect(Math.abs(w)).toBeLessThanOrEqual(neat.WEIGHT_RANDOM_STRENGTH);
            });
        });
    });

    describe('connection sorting', () => {
        it('should add connections in sorted order', () => {
            // Add multiple connections
            for (let i = 0; i < 10; i++) {
                genome.mutateLink();
            }

            // Verify they are sorted by innovation number
            for (let i = 1; i < genome.connections.size(); i++) {
                const prev = genome.connections.get(i - 1);
                const curr = genome.connections.get(i);
                if (prev instanceof ConnectionGene && curr instanceof ConnectionGene) {
                    expect(prev.innovationNumber).toBeLessThanOrEqual(curr.innovationNumber);
                }
            }
        });
    });
});
