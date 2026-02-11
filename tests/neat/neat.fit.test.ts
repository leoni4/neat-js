import { describe, it, expect } from 'vitest';
import { Neat, EActivation } from '../../src/neat/index.js';

describe('Neat - fit method', () => {
    it('should train on XOR problem and return history', () => {
        const neat = new Neat(2, 1, 50, EActivation.sigmoid, EActivation.tanh);

        const xTrain = [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
        ];
        const yTrain = [[0], [1], [1], [0]];

        const history = neat.fit(xTrain, yTrain, {
            epochs: 500,
            errorThreshold: 0.1,
            verbose: 0,
        });

        expect(history).toBeDefined();
        expect(history.error).toBeDefined();
        expect(history.error.length).toBeGreaterThan(0);
        expect(history.epochs).toBeGreaterThan(0);
        expect(history.champion).not.toBeNull();
        expect(typeof history.stoppedEarly).toBe('boolean');

        // Final error should be reasonable
        const finalError = history.error[history.error.length - 1];
        expect(finalError).toBeLessThan(0.5);
    });

    it('should throw error for mismatched input/output lengths', () => {
        const neat = new Neat(2, 1, 50);

        const xTrain = [
            [0, 0],
            [0, 1],
        ];
        const yTrain = [[0]]; // Wrong length

        expect(() => {
            neat.fit(xTrain, yTrain, { verbose: 0 });
        }).toThrow('Input and output data must have the same length');
    });

    it('should throw error for wrong input dimensions', () => {
        const neat = new Neat(2, 1, 50);

        const xTrain = [
            [0, 0, 0], // Should be 2 inputs, not 3
            [0, 1, 1],
        ];
        const yTrain = [[0], [1]];

        expect(() => {
            neat.fit(xTrain, yTrain, { verbose: 0 });
        }).toThrow('Input dimension mismatch');
    });

    it('should throw error for wrong output dimensions', () => {
        const neat = new Neat(2, 1, 50);

        const xTrain = [
            [0, 0],
            [0, 1],
        ];
        const yTrain = [
            [0, 1], // Should be 1 output, not 2
            [1, 0],
        ];

        expect(() => {
            neat.fit(xTrain, yTrain, { verbose: 0 });
        }).toThrow('Output dimension mismatch');
    });

    it('should support validation split', () => {
        const neat = new Neat(2, 1, 50, EActivation.sigmoid, EActivation.tanh);

        const xTrain = [
            [0, 0],
            [0, 1],
            [1, 0],
            [1, 1],
        ];
        const yTrain = [[0], [1], [1], [0]];

        const history = neat.fit(xTrain, yTrain, {
            epochs: 300,
            validationSplit: 0.25,
            verbose: 0,
        });

        expect(history.validationError).toBeDefined();
        expect(history.validationError!.length).toBeGreaterThan(0);
        expect(history.validationError!.length).toBe(history.error.length);
    });

    it('should stop early when error threshold is reached', () => {
        const neat = new Neat(2, 1, 100, EActivation.sigmoid, EActivation.tanh);

        const xTrain = [
            [0, 0],
            [1, 1],
        ];
        const yTrain = [[0], [0]];

        const history = neat.fit(xTrain, yTrain, {
            epochs: 1000,
            errorThreshold: 0.01,
            verbose: 0,
        });

        // Should stop before max epochs for this simple problem
        expect(history.epochs).toBeLessThan(1000);
        expect(history.stoppedEarly).toBe(true);
        expect(history.error[history.error.length - 1]).toBeLessThanOrEqual(0.01);
    });

    it('should respect verbose level 0 (silent)', () => {
        const neat = new Neat(2, 1, 20);

        const xTrain = [
            [0, 0],
            [1, 1],
        ];
        const yTrain = [[0], [0]];

        // Should not throw and should complete silently
        expect(() => {
            neat.fit(xTrain, yTrain, {
                epochs: 50,
                verbose: 0,
            });
        }).not.toThrow();
    });

    it('should throw error for invalid validation split', () => {
        const neat = new Neat(2, 1, 50);

        const xTrain = [
            [0, 0],
            [0, 1],
        ];
        const yTrain = [[0], [1]];

        expect(() => {
            neat.fit(xTrain, yTrain, {
                validationSplit: 1.5,
                verbose: 0,
            });
        }).toThrow('validationSplit must be between 0 and 1');

        expect(() => {
            neat.fit(xTrain, yTrain, {
                validationSplit: -0.1,
                verbose: 0,
            });
        }).toThrow('validationSplit must be between 0 and 1');
    });

    it('should throw error for empty training data', () => {
        const neat = new Neat(2, 1, 50);

        expect(() => {
            neat.fit([], [], { verbose: 0 });
        }).toThrow('Training data cannot be empty');
    });
});
