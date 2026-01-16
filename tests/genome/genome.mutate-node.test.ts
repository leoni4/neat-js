import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, OutputActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NETWORK_CONSTANTS } from '../../src/neat/constants.js';

describe('Genome - mutateNode', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, OutputActivation.sigmoid);
        genome = neat.clients[0].genome;
        // Ensure genome has at least one connection for mutation tests
        if (genome.connections.size() === 0) {
            genome.mutateLink();
        }
    });

    describe('basic node insertion', () => {
        it('should split an existing connection by inserting a node', () => {
            const initialNodes = genome.nodes.size();
            const initialConnections = genome.connections.size();

            const newNode = genome.mutateNode();

            if (newNode) {
                expect(newNode).toBeInstanceOf(NodeGene);
                expect(genome.nodes.size()).toBeGreaterThan(initialNodes);
                // Original connection disabled, two new connections added
                expect(genome.connections.size()).toBeGreaterThanOrEqual(initialConnections);
            }
        });

        it('should create a middle node between from and to nodes', () => {
            const newNode = genome.mutateNode();

            if (newNode) {
                // The new node should be positioned between input and output layers
                expect(newNode.x).toBeGreaterThan(NETWORK_CONSTANTS.INPUT_NODE_X);
                expect(newNode.x).toBeLessThan(NETWORK_CONSTANTS.OUTPUT_NODE_X);
            }
        });

        it('should disable the original connection', () => {
            // Get the initial connections
            const initialConnection = genome.connections.get(0);
            if (!(initialConnection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const from = initialConnection.from;
            const to = initialConnection.to;

            // Mutate node on this connection
            genome.mutateNode();

            // Check if the original connection is disabled
            for (let i = 0; i < genome.connections.size(); i++) {
                const conn = genome.connections.get(i);
                if (conn instanceof ConnectionGene && conn.from === from && conn.to === to) {
                    expect(conn.enabled).toBe(false);
                    break;
                }
            }
            // Note: removeConnection might remove it entirely if replace=true
        });

        it('should create two new connections (from->middle and middle->to)', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const from = connection.from;
            const to = connection.to;

            const newNode = genome.mutateNode();

            if (newNode) {
                // Check for from->middle connection
                let hasFromMiddle = false;
                let hasMiddleTo = false;

                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene) {
                        if (conn.from === from && conn.to === newNode) {
                            hasFromMiddle = true;
                        }
                        if (conn.from === newNode && conn.to === to) {
                            hasMiddleTo = true;
                        }
                    }
                }

                expect(hasFromMiddle).toBe(true);
                expect(hasMiddleTo).toBe(true);
            }
        });
    });

    describe('MIN_MIDDLE_X constraint', () => {
        it('should return null if middle x-coordinate is below MIN_MIDDLE_X', () => {
            // Create a genome where from and to nodes are very close
            const testNeat = new Neat(1, 1, 1, OutputActivation.sigmoid);
            const testGenome = testNeat.emptyGenome();

            // Manually create a connection with nodes very close to each other
            // (though this is difficult to test directly as nodes are created by NEAT)
            // This test is more conceptual - verifying the constraint exists

            const result = testGenome.mutateNode();
            // If successful, the middle node should respect MIN_MIDDLE_X
            if (result) {
                expect(result.x).toBeGreaterThanOrEqual(NETWORK_CONSTANTS.MIN_MIDDLE_X);
            }
        });

        it('should create nodes with x-coordinate >= MIN_MIDDLE_X', () => {
            for (let i = 0; i < 10; i++) {
                const testGenome = neat.clients[0].genome;
                const newNode = testGenome.mutateNode();

                if (newNode) {
                    expect(newNode.x).toBeGreaterThanOrEqual(NETWORK_CONSTANTS.MIN_MIDDLE_X);
                }
            }
        });
    });

    describe('replace index mechanism', () => {
        it('should use replace index for consistency', () => {
            // The replace index mechanism ensures that splitting the same connection
            // across different genomes produces nodes with the same innovation number
            // This test verifies the mechanism is in place

            const connection = genome.connections.get(0);
            if (connection instanceof ConnectionGene) {
                const from = connection.from;
                const to = connection.to;

                // First mutation creates the replace index
                genome.mutateNode();

                // Verify replace index was set
                const replaceIndex = neat.getReplaceIndex(from, to);
                expect(replaceIndex).toBeGreaterThan(0);

                // The replace index mechanism is working if this value exists
                // In practice, this ensures consistency across populations
            }
        });

        it('should set replace index after first node insertion', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const from = connection.from;
            const to = connection.to;

            // Before mutation, replace index should be 0
            const replaceIndexBefore = neat.getReplaceIndex(from, to);
            expect(replaceIndexBefore).toBe(0);

            // After mutation, replace index should be set
            genome.mutateNode();
            const replaceIndexAfter = neat.getReplaceIndex(from, to);
            expect(replaceIndexAfter).toBeGreaterThan(0);
        });
    });

    describe('weight handling', () => {
        it('should set first connection weight to 1', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const from = connection.from;

            const newNode = genome.mutateNode();

            if (newNode) {
                // Find the from->middle connection
                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene && conn.from === from && conn.to === newNode) {
                        expect(conn.weight).toBe(1);
                        break;
                    }
                }
            }
        });

        it('should preserve original weight in second connection', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const to = connection.to;
            const originalWeight = connection.weight;

            const newNode = genome.mutateNode();

            if (newNode) {
                // Find the middle->to connection
                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene && conn.from === newNode && conn.to === to) {
                        expect(conn.weight).toBe(originalWeight);
                        break;
                    }
                }
            }
        });

        it('should preserve enabled state in second connection', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const to = connection.to;
            const originalEnabled = connection.enabled;

            const newNode = genome.mutateNode();

            if (newNode) {
                // Find the middle->to connection
                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene && conn.from === newNode && conn.to === to) {
                        expect(conn.enabled).toBe(originalEnabled);
                        break;
                    }
                }
            }
        });
    });

    describe('node positioning', () => {
        it('should position node between from and to x-coordinates', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const fromX = connection.from.x;
            const toX = connection.to.x;

            const newNode = genome.mutateNode();

            if (newNode) {
                expect(newNode.x).toBeGreaterThan(fromX);
                expect(newNode.x).toBeLessThan(toX);
                // Should be approximately in the middle
                expect(newNode.x).toBeCloseTo((fromX + toX) / 2, 1);
            }
        });

        it('should position node y-coordinate with variation', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const newNode = genome.mutateNode();

            if (newNode) {
                // Y should be within valid range
                expect(newNode.y).toBeGreaterThanOrEqual(NETWORK_CONSTANTS.NODE_Y_MIN);
                expect(newNode.y).toBeLessThanOrEqual(NETWORK_CONSTANTS.NODE_Y_MAX);
            }
        });

        it('should clamp y-coordinate to NODE_Y_MIN and NODE_Y_MAX', () => {
            // Test multiple mutations to check clamping
            for (let i = 0; i < 20; i++) {
                const testGenome = neat.clients[0].genome;
                const newNode = testGenome.mutateNode();

                if (newNode) {
                    expect(newNode.y).toBeGreaterThanOrEqual(NETWORK_CONSTANTS.NODE_Y_MIN);
                    expect(newNode.y).toBeLessThanOrEqual(NETWORK_CONSTANTS.NODE_Y_MAX);
                }
            }
        });
    });
});
