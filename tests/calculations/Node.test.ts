import { describe, it, expect, beforeEach } from 'vitest';
import { Node } from '../../src/calculations/Node.js';
import { Connection } from '../../src/calculations/Connection.js';
import { NodeGene } from '../../src/genome/nodeGene.js';

describe('Node', () => {
    let nodeGene: NodeGene;
    let node: Node;

    beforeEach(() => {
        nodeGene = new NodeGene(1);
        nodeGene.bias = 0.5;
        node = new Node(0.5, nodeGene);
    });

    describe('constructor', () => {
        it('should create a node with x position and gene', () => {
            expect(node.x).toBe(0.5);
            expect(node.output).toBe(0);
            expect(node.hidden).toBe(false);
            expect(node.connections).toEqual([]);
        });
    });

    describe('x property', () => {
        it('should get and set x position', () => {
            node.x = 0.75;
            expect(node.x).toBe(0.75);
        });
    });

    describe('output property', () => {
        it('should get and set output value', () => {
            node.output = 0.8;
            expect(node.output).toBe(0.8);
        });

        it('should handle negative output', () => {
            node.output = -0.5;
            expect(node.output).toBe(-0.5);
        });
    });

    describe('hidden property', () => {
        it('should get and set hidden state', () => {
            expect(node.hidden).toBe(false);
            node.hidden = true;
            expect(node.hidden).toBe(true);
        });
    });

    describe('connections property', () => {
        it('should get and set connections array', () => {
            const fromNode = new Node(0.1, new NodeGene(2));
            const connection = new Connection(fromNode, node);
            node.connections = [connection];
            expect(node.connections).toHaveLength(1);
            expect(node.connections[0]).toBe(connection);
        });
    });

    describe('calculate', () => {
        it('should calculate output with sigmoid activation', () => {
            const fromNode = new Node(0.1, new NodeGene(2));
            fromNode.output = 1.0;

            const connection = new Connection(fromNode, node);
            connection.weight = 2.0;
            connection.enabled = true;

            node.connections = [connection];
            node.hidden = true;
            node.calculate('sigmoid');

            // sigmoid(2.0 * 1.0 + 0.5) = sigmoid(2.5) = 1 / (1 + e^(-2.5))
            const expectedOutput = 1 / (1 + Math.exp(-2.5));
            expect(node.output).toBeCloseTo(expectedOutput, 5);
        });

        it('should calculate output with none activation', () => {
            const fromNode = new Node(0.1, new NodeGene(2));
            fromNode.output = 1.0;

            const connection = new Connection(fromNode, node);
            connection.weight = 2.0;
            connection.enabled = true;

            node.connections = [connection];
            node.hidden = true;
            node.calculate('none');

            // With 'none' activation, output = sum = 2.0 * 1.0 + 0.5 = 2.5
            expect(node.output).toBe(2.5);
        });

        it('should skip disabled connections', () => {
            const fromNode1 = new Node(0.1, new NodeGene(2));
            fromNode1.output = 1.0;

            const fromNode2 = new Node(0.2, new NodeGene(3));
            fromNode2.output = 1.0;

            const connection1 = new Connection(fromNode1, node);
            connection1.weight = 2.0;
            connection1.enabled = true;

            const connection2 = new Connection(fromNode2, node);
            connection2.weight = 3.0;
            connection2.enabled = false;

            node.connections = [connection1, connection2];
            node.hidden = false;
            node.calculate('none');

            // Only connection1 should be counted: 2.0 * 1.0 = 2.0
            expect(node.output).toBe(2.0);
        });

        it('should include bias for hidden nodes', () => {
            node.hidden = true;
            node.connections = [];
            node.calculate('none');

            // For hidden node with no connections, output = bias = 0.5
            expect(node.output).toBe(0.5);
        });

        it('should not include bias for non-hidden nodes', () => {
            node.hidden = false;
            node.connections = [];
            node.calculate('none');

            // For non-hidden node, bias is not added
            expect(node.output).toBe(0);
        });

        it('should handle multiple connections', () => {
            const fromNode1 = new Node(0.1, new NodeGene(2));
            fromNode1.output = 1.0;

            const fromNode2 = new Node(0.2, new NodeGene(3));
            fromNode2.output = 2.0;

            const connection1 = new Connection(fromNode1, node);
            connection1.weight = 1.5;
            connection1.enabled = true;

            const connection2 = new Connection(fromNode2, node);
            connection2.weight = 0.5;
            connection2.enabled = true;

            node.connections = [connection1, connection2];
            node.hidden = false;
            node.calculate('none');

            // 1.5 * 1.0 + 0.5 * 2.0 = 2.5
            expect(node.output).toBe(2.5);
        });
    });

    describe('compareTo', () => {
        it('should return 1 when this.x > node.x', () => {
            const otherNode = new Node(0.3, new NodeGene(2));
            node.x = 0.5;
            expect(node.compareTo(otherNode)).toBe(1);
        });

        it('should return -1 when this.x < node.x', () => {
            const otherNode = new Node(0.7, new NodeGene(2));
            node.x = 0.5;
            expect(node.compareTo(otherNode)).toBe(-1);
        });

        it('should return 0 when this.x === node.x', () => {
            const otherNode = new Node(0.5, new NodeGene(2));
            node.x = 0.5;
            expect(node.compareTo(otherNode)).toBe(0);
        });
    });
});
