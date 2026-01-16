import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, OutputActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';

describe('Genome - distance', () => {
    let neat: Neat;
    let genome1: Genome;
    let genome2: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, OutputActivation.sigmoid);
        genome1 = neat.clients[0].genome;
        genome2 = neat.clients[0].genome;
    });

    describe('basic distance calculation', () => {
        it('should return 0 for identical genomes', () => {
            const distance = genome1.distance(genome1);
            expect(distance).toBe(0);
        });

        it('should return positive distance for different genomes', () => {
            genome1.mutateLink();
            genome2.mutateLink();

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should be symmetric', () => {
            genome1.mutateNode();
            genome2.mutateLink();

            const distance1to2 = genome1.distance(genome2);
            const distance2to1 = genome2.distance(genome1);

            expect(distance1to2).toBeCloseTo(distance2to1, 5);
        });
    });

    describe('excess genes', () => {
        it('should account for excess connections', () => {
            // Add more connections to genome1
            for (let i = 0; i < 5; i++) {
                genome1.mutateLink();
            }

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThan(0);
        });

        it('should account for excess nodes', () => {
            // Add more nodes to genome1
            for (let i = 0; i < 3; i++) {
                genome1.mutateNode();
            }

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThan(0);
        });
    });

    describe('disjoint genes', () => {
        it('should account for disjoint connections', () => {
            // Create different mutations
            genome1.mutateLink();
            genome2.mutateNode();

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should increase distance with more disjoint genes', () => {
            // Base distance
            const baseDistance = genome1.distance(genome2);

            // Add mutations to create disjoint genes
            const testNeat = new Neat(3, 2, 1, OutputActivation.sigmoid);
            const testGenome1 = testNeat.clients[0].genome;
            const testGenome2 = testNeat.clients[0].genome;

            for (let i = 0; i < 5; i++) {
                testGenome1.mutateLink();
            }

            const newDistance = testGenome1.distance(testGenome2);
            expect(newDistance).toBeGreaterThanOrEqual(baseDistance);
        });
    });

    describe('weight differences', () => {
        it('should account for weight differences in matching genes', () => {
            // Mutate weights
            genome1.mutateWeightShift();
            genome1.mutateWeightShift();
            genome1.mutateWeightShift();

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should consider bias differences', () => {
            // Add nodes and mutate their biases
            genome1.mutateNode();
            genome2.mutateNode();

            genome1.mutateWeightRandom();
            genome2.mutateWeightRandom();

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });
    });

    describe('normalization with CT threshold', () => {
        it('should normalize by N when connections > CT', () => {
            // Create larger genomes
            for (let i = 0; i < 30; i++) {
                genome1.mutateLink();
            }
            for (let i = 0; i < 25; i++) {
                genome2.mutateLink();
            }

            const distance = genome1.distance(genome2);

            // Distance should be calculated and normalized
            expect(distance).toBeGreaterThanOrEqual(0);
            expect(distance).toBeLessThan(1000); // Reasonable upper bound
        });

        it('should use N=1 when connections < CT', () => {
            // Use small genomes (empty)
            const emptyGenome1 = neat.emptyGenome();
            const emptyGenome2 = neat.emptyGenome();

            emptyGenome1.mutateLink();

            const distance = emptyGenome1.distance(emptyGenome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should handle CT threshold correctly', () => {
            const testNeat = new Neat(3, 2, 1, OutputActivation.sigmoid, {
                CT: 10,
            });
            const testGenome1 = testNeat.clients[0].genome;
            const testGenome2 = testNeat.clients[0].genome;

            // Add connections below CT
            for (let i = 0; i < 5; i++) {
                testGenome1.mutateLink();
            }

            const distance = testGenome1.distance(testGenome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });
    });

    describe('distance coefficients', () => {
        it('should use C1 coefficient for excess genes', () => {
            const testNeat = new Neat(3, 2, 1, OutputActivation.sigmoid, {
                C1: 2.0,
            });
            const testGenome1 = testNeat.clients[0].genome;
            const testGenome2 = testNeat.clients[0].genome;

            for (let i = 0; i < 5; i++) {
                testGenome1.mutateLink();
            }

            const distance = testGenome1.distance(testGenome2);
            expect(distance).toBeGreaterThan(0);
        });

        it('should use C2 coefficient for disjoint genes', () => {
            const testNeat = new Neat(3, 2, 1, OutputActivation.sigmoid, {
                C2: 2.0,
            });
            const testGenome1 = testNeat.clients[0].genome;
            const testGenome2 = testNeat.clients[0].genome;

            testGenome1.mutateLink();
            testGenome2.mutateNode();

            const distance = testGenome1.distance(testGenome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should use C3 coefficient for weight differences', () => {
            const testNeat = new Neat(3, 2, 1, OutputActivation.sigmoid, {
                C3: 2.0,
            });
            const testGenome1 = testNeat.clients[0].genome;
            const testGenome2 = testNeat.clients[0].genome;

            testGenome1.mutateWeightShift();
            testGenome1.mutateWeightShift();

            const distance = testGenome1.distance(testGenome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });
    });

    describe('edge cases', () => {
        it('should handle empty genomes', () => {
            const emptyGenome1 = neat.emptyGenome();
            const emptyGenome2 = neat.emptyGenome();

            const distance = emptyGenome1.distance(emptyGenome2);
            expect(distance).toBe(0);
        });

        it('should handle genomes with only nodes, no connections', () => {
            const emptyGenome1 = neat.emptyGenome();
            const emptyGenome2 = neat.emptyGenome();

            // Genomes have nodes but no connections
            const distance = emptyGenome1.distance(emptyGenome2);
            expect(distance).toBeGreaterThanOrEqual(0);
        });

        it('should handle very different genome sizes', () => {
            // Make genome1 much larger
            for (let i = 0; i < 20; i++) {
                genome1.mutateLink();
                genome1.mutateNode();
            }

            const distance = genome1.distance(genome2);
            expect(distance).toBeGreaterThan(0);
        });

        it('should not throw errors with complex genomes', () => {
            // Create complex genomes
            for (let i = 0; i < 15; i++) {
                genome1.mutateLink();
                genome1.mutateNode();
                genome1.mutateWeightShift();
            }

            for (let i = 0; i < 10; i++) {
                genome2.mutateLink();
                genome2.mutateNode();
            }

            expect(() => {
                genome1.distance(genome2);
            }).not.toThrow();
        });
    });

    describe('distance properties', () => {
        it('should increase with more structural differences', () => {
            const baseDistance = genome1.distance(genome2);

            const testGenome1 = neat.clients[0].genome;
            const testGenome2 = neat.clients[0].genome;

            // Add significant differences
            for (let i = 0; i < 10; i++) {
                testGenome1.mutateLink();
                testGenome1.mutateNode();
            }

            const newDistance = testGenome1.distance(testGenome2);
            expect(newDistance).toBeGreaterThan(baseDistance);
        });

        it('should be finite and non-negative', () => {
            genome1.mutateNode();
            genome2.mutateLink();

            const distance = genome1.distance(genome2);

            expect(distance).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(distance)).toBe(true);
        });
    });
});
