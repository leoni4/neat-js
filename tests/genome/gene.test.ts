import { describe, it, expect } from 'vitest';
import { Gene } from '../../src/genome/gene.js';

describe('Gene', () => {
    describe('constructor', () => {
        it('should create a gene with innovation number', () => {
            const gene = new Gene(5);
            expect(gene.innovationNumber).toBe(5);
        });

        it('should handle zero innovation number', () => {
            const gene = new Gene(0);
            expect(gene.innovationNumber).toBe(0);
        });
    });

    describe('innovationNumber getter', () => {
        it('should return the correct innovation number', () => {
            const gene = new Gene(42);
            expect(gene.innovationNumber).toBe(42);
        });
    });

    describe('innovationNumber setter', () => {
        it('should update the innovation number', () => {
            const gene = new Gene(1);
            gene.innovationNumber = 10;
            expect(gene.innovationNumber).toBe(10);
        });

        it('should allow setting to different values', () => {
            const gene = new Gene(1);
            gene.innovationNumber = 100;
            expect(gene.innovationNumber).toBe(100);
            gene.innovationNumber = 200;
            expect(gene.innovationNumber).toBe(200);
        });
    });
});
