import { describe, it, expect, beforeEach } from 'vitest';
import { Calculator } from '../../src/calculations/Calculator.js';
import { Neat, OutputActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';

describe('Calculator', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(2, 1, 10, OutputActivation.sigmoid);
        genome = neat.clients[0].genome;
    });

    describe('constructor', () => {
        it('should create a calculator from a genome', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            expect(calculator).toBeDefined();
        });

        it('should handle different output activations', () => {
            const calculatorSigmoid = new Calculator(genome, 'sigmoid');
            const calculatorNone = new Calculator(genome, 'none');

            expect(calculatorSigmoid).toBeDefined();
            expect(calculatorNone).toBeDefined();
        });
    });

    describe('calculate', () => {
        it('should throw error if input length does not match', () => {
            const calculator = new Calculator(genome, 'sigmoid');

            expect(() => calculator.calculate([1])).toThrow();
            expect(() => calculator.calculate([1, 2, 3])).toThrow();
        });

        it('should calculate output for valid input', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
            expect(typeof output[0]).toBe('number');
        });

        it('should return outputs in range [0, 1] for sigmoid', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            const output = calculator.calculate([1, 1]);

            expect(output[0]).toBeGreaterThanOrEqual(0);
            expect(output[0]).toBeLessThanOrEqual(1);
        });

        it('should handle multiple outputs', () => {
            const neatMulti = new Neat(3, 2, 10, OutputActivation.sigmoid);
            const genomeMulti = neatMulti.clients[0].genome;
            const calculator = new Calculator(genomeMulti, 'sigmoid');

            const output = calculator.calculate([1, 0, 1]);
            expect(output).toHaveLength(2);
        });

        it('should calculate with none activation', () => {
            const calculator = new Calculator(genome, 'none');
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should handle zero inputs', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            const output = calculator.calculate([0, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should handle negative inputs', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            const output = calculator.calculate([-1, -0.5]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should produce consistent results for same input', () => {
            const calculator = new Calculator(genome, 'sigmoid');
            const output1 = calculator.calculate([1, 0]);
            const output2 = calculator.calculate([1, 0]);

            expect(output1).toEqual(output2);
        });

        it('should work with genome that has mutations', () => {
            genome.mutate(true);
            const calculator = new Calculator(genome, 'sigmoid');
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });
    });
});
