import { describe, it, expect } from 'vitest';
import { NodeGene } from '../../src/genome/nodeGene.js';

describe('NodeGene', () => {
    describe('constructor', () => {
        it('should create a node gene with innovation number', () => {
            const node = new NodeGene(5);
            expect(node.innovationNumber).toBe(5);
        });

        it('should initialize with default values', () => {
            const node = new NodeGene(1);
            expect(node.x).toBe(0);
            expect(node.y).toBe(0);
            expect(node.bias).toBe(0);
        });
    });

    describe('x property', () => {
        it('should get and set x coordinate', () => {
            const node = new NodeGene(1);
            node.x = 0.5;
            expect(node.x).toBe(0.5);
        });

        it('should handle boundary values', () => {
            const node = new NodeGene(1);
            node.x = 0.01;
            expect(node.x).toBe(0.01);
            node.x = 0.99;
            expect(node.x).toBe(0.99);
        });
    });

    describe('y property', () => {
        it('should get and set y coordinate', () => {
            const node = new NodeGene(1);
            node.y = 0.75;
            expect(node.y).toBe(0.75);
        });

        it('should handle multiple updates', () => {
            const node = new NodeGene(1);
            node.y = 0.1;
            expect(node.y).toBe(0.1);
            node.y = 0.9;
            expect(node.y).toBe(0.9);
        });
    });

    describe('bias property', () => {
        it('should get and set bias value', () => {
            const node = new NodeGene(1);
            node.bias = 2.5;
            expect(node.bias).toBe(2.5);
        });

        it('should handle negative bias', () => {
            const node = new NodeGene(1);
            node.bias = -1.5;
            expect(node.bias).toBe(-1.5);
        });

        it('should handle zero bias', () => {
            const node = new NodeGene(1);
            node.bias = 0;
            expect(node.bias).toBe(0);
        });
    });

    describe('equals', () => {
        it('should return true for nodes with same innovation number', () => {
            const node1 = new NodeGene(5);
            const node2 = new NodeGene(5);
            expect(node1.equals(node2)).toBe(true);
        });

        it('should return false for nodes with different innovation numbers', () => {
            const node1 = new NodeGene(5);
            const node2 = new NodeGene(10);
            expect(node1.equals(node2)).toBe(false);
        });

        it('should return false for non-NodeGene objects', () => {
            const node = new NodeGene(5);
            expect(node.equals({})).toBe(false);
            expect(node.equals(null)).toBe(false);
            expect(node.equals(undefined)).toBe(false);
            expect(node.equals(5)).toBe(false);
        });

        it('should ignore x, y, and bias in equality check', () => {
            const node1 = new NodeGene(5);
            const node2 = new NodeGene(5);
            node1.x = 0.1;
            node1.y = 0.2;
            node1.bias = 1.5;
            node2.x = 0.9;
            node2.y = 0.8;
            node2.bias = -2.0;
            expect(node1.equals(node2)).toBe(true);
        });
    });

    describe('hashCode', () => {
        it('should return innovation number as hash code', () => {
            const node = new NodeGene(42);
            expect(node.hashCode()).toBe(42);
        });

        it('should return same hash code for nodes with same innovation number', () => {
            const node1 = new NodeGene(10);
            const node2 = new NodeGene(10);
            expect(node1.hashCode()).toBe(node2.hashCode());
        });

        it('should return different hash code for nodes with different innovation numbers', () => {
            const node1 = new NodeGene(5);
            const node2 = new NodeGene(10);
            expect(node1.hashCode()).not.toBe(node2.hashCode());
        });

        it('should ignore properties other than innovation number', () => {
            const node1 = new NodeGene(5);
            const node2 = new NodeGene(5);
            node1.x = 0.5;
            node1.y = 0.5;
            node1.bias = 2.0;
            expect(node1.hashCode()).toBe(node2.hashCode());
        });
    });
});
