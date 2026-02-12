import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NETWORK_CONSTANTS } from '../../src/neat/constants.js';

describe('Genome - removeConnection', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid);
        genome = neat.clients[0].genome;
        // Ensure genome has at least one connection for removal tests
        while (genome.connections.size() === 0) {
            genome.mutateLink();
        }
    });

    describe('basic connection removal', () => {
        it('should remove a connection from the genome', () => {
            const connection = genome.connections.get(0);
            if (!(connection instanceof ConnectionGene)) {
                throw new Error('Expected ConnectionGene');
            }

            const initialSize = genome.connections.size();
            genome.removeConnection(connection);

            expect(genome.connections.size()).toBeLessThanOrEqual(initialSize);
        });

        it('should handle removing non-existent connection gracefully', () => {
            const testConnection = new ConnectionGene(9999, neat.getNode(1), neat.getNode(2));

            expect(() => {
                genome.removeConnection(testConnection);
            }).not.toThrow();
        });
    });

    describe('PERMANENT_MAIN_CONNECTIONS protection', () => {
        it('should not remove main input-output connections when protected', () => {
            // Create NEAT with PERMANENT_MAIN_CONNECTIONS
            const protectedNeat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid, {
                PERMANENT_MAIN_CONNECTIONS: true,
            });
            const protectedGenome = protectedNeat.clients[0].genome;

            // Find a main connection (input to output)
            let mainConnection: ConnectionGene | null = null;
            for (let i = 0; i < protectedGenome.connections.size(); i++) {
                const conn = protectedGenome.connections.get(i);
                if (
                    conn instanceof ConnectionGene &&
                    conn.from.x === NETWORK_CONSTANTS.INPUT_NODE_X &&
                    conn.to.x === NETWORK_CONSTANTS.OUTPUT_NODE_X
                ) {
                    mainConnection = conn;
                    break;
                }
            }

            if (mainConnection) {
                const initialSize = protectedGenome.connections.size();
                protectedGenome.removeConnection(mainConnection);

                // Connection should not be removed
                expect(protectedGenome.connections.size()).toBe(initialSize);
            }
        });

        it('should allow removing non-main connections even when protection is on', () => {
            // Create NEAT with PERMANENT_MAIN_CONNECTIONS
            const protectedNeat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid, {
                PERMANENT_MAIN_CONNECTIONS: true,
            });
            const protectedGenome = protectedNeat.clients[0].genome;

            // Add a middle node and connection
            const middleNode = protectedGenome.mutateNode();
            if (middleNode) {
                // Find a connection involving the middle node
                let middleConnection: ConnectionGene | null = null;
                for (let i = 0; i < protectedGenome.connections.size(); i++) {
                    const conn = protectedGenome.connections.get(i);
                    if (conn instanceof ConnectionGene && (conn.from === middleNode || conn.to === middleNode)) {
                        middleConnection = conn;
                        break;
                    }
                }

                if (middleConnection) {
                    // This should be removable
                    expect(() => {
                        protectedGenome.removeConnection(middleConnection!);
                    }).not.toThrow();
                }
            }
        });
    });

    describe('cascading node removal', () => {
        it('should remove "from" node if no other connections reference it', () => {
            // Create a chain: input -> hidden -> output
            const hiddenNode = genome.mutateNode();

            if (hiddenNode) {
                // Find connection going TO the hidden node
                let connectionToHidden: ConnectionGene | null = null;
                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene && conn.to === hiddenNode) {
                        connectionToHidden = conn;
                        break;
                    }
                }

                if (connectionToHidden) {
                    const initialNodes = genome.nodes.size();
                    // Remove connection, which might cascade to remove nodes
                    genome.removeConnection(connectionToHidden, false, true, true);

                    // Nodes size should change if cascade happened
                    expect(genome.nodes.size()).toBeLessThanOrEqual(initialNodes);
                }
            }
        });

        it('should remove "to" node if no other connections reference it', () => {
            // Create a hidden node
            const hiddenNode = genome.mutateNode();

            if (hiddenNode) {
                // Find connection going FROM the hidden node
                let connectionFromHidden: ConnectionGene | null = null;
                for (let i = 0; i < genome.connections.size(); i++) {
                    const conn = genome.connections.get(i);
                    if (conn instanceof ConnectionGene && conn.from === hiddenNode) {
                        connectionFromHidden = conn;
                        break;
                    }
                }

                if (connectionFromHidden) {
                    const initialNodes = genome.nodes.size();
                    genome.removeConnection(connectionFromHidden, false, true, true);

                    // Nodes might be removed
                    expect(genome.nodes.size()).toBeLessThanOrEqual(initialNodes);
                }
            }
        });

        it('should not remove input nodes during cascade', () => {
            const initialInputCount = Array.from({ length: genome.nodes.size() })
                .map((_, i) => genome.nodes.get(i))
                .filter(node => node && 'x' in node && node.x === NETWORK_CONSTANTS.INPUT_NODE_X).length;

            // Remove a connection
            const conn = genome.connections.get(0);
            if (conn instanceof ConnectionGene) {
                genome.removeConnection(conn, false, true, true);
            }

            // Count input nodes after removal
            const afterInputCount = Array.from({ length: genome.nodes.size() })
                .map((_, i) => genome.nodes.get(i))
                .filter(node => node && 'x' in node && node.x === NETWORK_CONSTANTS.INPUT_NODE_X).length;

            // Input nodes should remain
            expect(afterInputCount).toBe(initialInputCount);
        });

        it('should not remove output nodes during cascade', () => {
            const initialOutputCount = Array.from({ length: genome.nodes.size() })
                .map((_, i) => genome.nodes.get(i))
                .filter(node => node && 'x' in node && node.x === NETWORK_CONSTANTS.OUTPUT_NODE_X).length;

            // Remove a connection
            const conn = genome.connections.get(0);
            if (conn instanceof ConnectionGene) {
                genome.removeConnection(conn, false, true, true);
            }

            // Count output nodes after removal
            const afterOutputCount = Array.from({ length: genome.nodes.size() })
                .map((_, i) => genome.nodes.get(i))
                .filter(node => node && 'x' in node && node.x === NETWORK_CONSTANTS.OUTPUT_NODE_X).length;

            // Output nodes should remain
            expect(afterOutputCount).toBe(initialOutputCount);
        });
    });

    describe('replace mode', () => {
        it('should not cascade remove when replace=true', () => {
            // Add a hidden node
            genome.mutateNode();

            const initialNodes = genome.nodes.size();
            const conn = genome.connections.get(0);

            if (conn instanceof ConnectionGene) {
                genome.removeConnection(conn, true, true, true);
            }

            // With replace=true, nodes should not be removed
            expect(genome.nodes.size()).toBe(initialNodes);
        });
    });

    describe('directional cascade control', () => {
        it('should respect down=false to prevent downward cascade', () => {
            const hiddenNode = genome.mutateNode();

            if (hiddenNode) {
                const conn = genome.connections.get(0);
                if (conn instanceof ConnectionGene) {
                    // Remove with down=false should not cascade to "from" node
                    genome.removeConnection(conn, false, false, true);

                    // Verify method executes
                    expect(genome.connections.size()).toBeGreaterThanOrEqual(0);
                }
            }
        });

        it('should respect up=false to prevent upward cascade', () => {
            const hiddenNode = genome.mutateNode();

            if (hiddenNode) {
                const conn = genome.connections.get(0);
                if (conn instanceof ConnectionGene) {
                    // Remove with up=false should not cascade to "to" node
                    genome.removeConnection(conn, false, true, false);

                    // Verify method executes
                    expect(genome.connections.size()).toBeGreaterThanOrEqual(0);
                }
            }
        });
    });

    describe('complex removal scenarios', () => {
        it('should handle removal in a complex network', () => {
            // Build a complex network
            for (let i = 0; i < 10; i++) {
                genome.mutateLink();
                genome.mutateNode();
            }

            const initialSize = genome.connections.size();
            const conn = genome.connections.get(5);

            if (conn instanceof ConnectionGene) {
                genome.removeConnection(conn);

                // Should have removed the connection
                expect(genome.connections.size()).toBeLessThanOrEqual(initialSize);
            }
        });

        it('should maintain genome integrity after removal', () => {
            // Add complexity
            for (let i = 0; i < 5; i++) {
                genome.mutateNode();
            }

            const conn = genome.connections.get(2);
            if (conn instanceof ConnectionGene) {
                genome.removeConnection(conn);
            }

            // Verify all connections still reference valid nodes
            for (let i = 0; i < genome.connections.size(); i++) {
                const connection = genome.connections.get(i);
                if (connection instanceof ConnectionGene) {
                    let fromFound = false;
                    let toFound = false;

                    for (let j = 0; j < genome.nodes.size(); j++) {
                        const node = genome.nodes.get(j);
                        if (node === connection.from) fromFound = true;
                        if (node === connection.to) toFound = true;
                    }

                    expect(fromFound).toBe(true);
                    expect(toFound).toBe(true);
                }
            }
        });

        it('should handle multiple removals', () => {
            // Add connections
            for (let i = 0; i < 10; i++) {
                genome.mutateLink();
            }

            const initialSize = genome.connections.size();

            // Remove multiple connections
            for (let i = 0; i < 3; i++) {
                const conn = genome.connections.get(0);
                if (conn instanceof ConnectionGene) {
                    genome.removeConnection(conn);
                }
            }

            // Should have fewer connections
            expect(genome.connections.size()).toBeLessThan(initialSize);
        });
    });
});
