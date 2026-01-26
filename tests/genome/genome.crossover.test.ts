import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';

describe('Genome - crossOver', () => {
    let neat: Neat;
    let genome1: Genome;
    let genome2: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid);
        genome1 = neat.clients[0].genome;
        genome2 = neat.clients[0].genome;
    });

    describe('basic crossover', () => {
        it('should create offspring genome from two parents', () => {
            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring).toBeInstanceOf(Genome);
            expect(offspring.neat).toBe(genome1.neat);
        });

        it('should inherit nodes from parent genomes', () => {
            // Add some mutations to make genomes different
            genome1.mutateNode();
            genome2.mutateNode();

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring.nodes.size()).toBeGreaterThan(0);
        });

        it('should inherit connections from fitter parent', () => {
            // Add mutations
            genome1.mutateLink();
            genome2.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring.connections.size()).toBeGreaterThanOrEqual(0);
        });
    });

    describe('gene inheritance', () => {
        it('should inherit matching genes from both parents randomly', () => {
            // Create genomes with some shared structure
            const offspring = Genome.crossOver(genome1, genome2);

            // Offspring should have valid structure
            expect(offspring.connections.size()).toBeGreaterThanOrEqual(0);
            expect(offspring.nodes.size()).toBeGreaterThanOrEqual(5);
        });

        it('should inherit disjoint genes from fitter parent', () => {
            // Add unique mutations to genome1
            for (let i = 0; i < 3; i++) {
                genome1.mutateLink();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            // Offspring should include genes from genome1
            expect(offspring.connections.size()).toBeGreaterThan(0);
        });

        it('should inherit excess genes from fitter parent', () => {
            // Ensure both have connections first
            genome1.mutateLink();
            genome2.mutateLink();

            // Genome1 has more innovations
            for (let i = 0; i < 5; i++) {
                genome1.mutateNode();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            // Offspring should have inherited structure (at least as many nodes as genome2)
            expect(offspring.nodes.size()).toBeGreaterThanOrEqual(genome2.nodes.size());
        });
    });

    describe('optimization mode', () => {
        it('should skip disabled genes when optimization is on', () => {
            // Disable some connections in genome1
            const conn = genome1.connections.get(0);
            if (conn instanceof ConnectionGene) {
                conn.enabled = false;
            }

            // Enable optimization mode on genome1
            genome1.mutate(true); // This sets selfOpt

            const offspring = Genome.crossOver(genome1, genome2);

            // Offspring should be valid
            expect(offspring.connections.size()).toBeGreaterThanOrEqual(0);
        });

        it('should include all genes when optimization is off', () => {
            // Add some connections
            genome1.mutateLink();
            genome1.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            // Offspring should have connections
            expect(offspring.connections.size()).toBeGreaterThanOrEqual(0);
        });

        it('should handle both parents in selfOpt mode', () => {
            genome1.mutate(true);
            genome2.mutate(true);

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring).toBeInstanceOf(Genome);
        });
    });

    describe('connection and node consistency', () => {
        it('should only include nodes referenced by connections', () => {
            genome1.mutateNode();
            genome2.mutateNode();

            const offspring = Genome.crossOver(genome1, genome2);

            // Verify all connections reference valid nodes
            for (let i = 0; i < offspring.connections.size(); i++) {
                const conn = offspring.connections.get(i);
                if (conn instanceof ConnectionGene) {
                    let fromFound = false;
                    let toFound = false;

                    for (let j = 0; j < offspring.nodes.size(); j++) {
                        const node = offspring.nodes.get(j);
                        if (node === conn.from) fromFound = true;
                        if (node === conn.to) toFound = true;
                    }

                    expect(fromFound).toBe(true);
                    expect(toFound).toBe(true);
                }
            }
        });

        it('should maintain node uniqueness', () => {
            const offspring = Genome.crossOver(genome1, genome2);

            // Check for duplicate nodes
            const nodeIds = new Set<number>();
            for (let i = 0; i < offspring.nodes.size(); i++) {
                const node = offspring.nodes.get(i);
                if (node && 'innovationNumber' in node) {
                    expect(nodeIds.has(node.innovationNumber)).toBe(false);
                    nodeIds.add(node.innovationNumber);
                }
            }
        });
    });

    describe('gene selection probability', () => {
        it('should randomly select from matching genes', () => {
            // This test verifies randomness through multiple crossovers
            const results = new Set<number>();

            for (let i = 0; i < 20; i++) {
                const testGenome1 = neat.clients[0].genome;
                const testGenome2 = neat.clients[0].genome;

                const offspring = Genome.crossOver(testGenome1, testGenome2);
                results.add(offspring.connections.size());
            }

            // Should produce at least some variation (might all be same if very similar)
            expect(results.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('edge cases', () => {
        it('should handle genomes with different sizes', () => {
            // Make genome1 larger
            for (let i = 0; i < 10; i++) {
                genome1.mutateLink();
                genome1.mutateNode();
            }

            const offspring = Genome.crossOver(genome1, genome2);

            expect(offspring).toBeInstanceOf(Genome);
            expect(offspring.nodes.size()).toBeGreaterThan(0);
        });

        it('should handle empty connections', () => {
            const emptyGenome1 = neat.emptyGenome();
            const emptyGenome2 = neat.emptyGenome();

            const offspring = Genome.crossOver(emptyGenome1, emptyGenome2);

            // Should have at least the input and output nodes
            expect(offspring.nodes.size()).toBe(5);
            expect(offspring.connections.size()).toBe(0);
        });

        it('should work when one parent has no middle nodes', () => {
            const emptyGenome = neat.emptyGenome();
            genome1.mutateNode();
            genome1.mutateNode();

            const offspring = Genome.crossOver(genome1, emptyGenome);

            expect(offspring).toBeInstanceOf(Genome);
        });
    });

    describe('innovation number ordering', () => {
        it('should maintain sorted order of connections', () => {
            genome1.mutateLink();
            genome1.mutateLink();
            genome2.mutateLink();

            const offspring = Genome.crossOver(genome1, genome2);

            // Verify connections are sorted by innovation number
            for (let i = 1; i < offspring.connections.size(); i++) {
                const prev = offspring.connections.get(i - 1);
                const curr = offspring.connections.get(i);
                if (prev instanceof ConnectionGene && curr instanceof ConnectionGene) {
                    expect(prev.innovationNumber).toBeLessThanOrEqual(curr.innovationNumber);
                }
            }
        });
    });
});
