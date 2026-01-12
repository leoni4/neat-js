import { describe, it, expect, beforeEach } from 'vitest';
import { Connection } from '../../src/calculations/Connection.js';
import { Node } from '../../src/calculations/Node.js';
import { NodeGene } from '../../src/genome/nodeGene.js';

describe('Connection', () => {
    let fromNode: Node;
    let toNode: Node;
    let connection: Connection;

    beforeEach(() => {
        fromNode = new Node(0.1, new NodeGene(1));
        toNode = new Node(0.9, new NodeGene(2));
        connection = new Connection(fromNode, toNode);
    });

    describe('constructor', () => {
        it('should create a connection between two nodes', () => {
            expect(connection.from).toBe(fromNode);
            expect(connection.to).toBe(toNode);
        });

        it('should initialize with default values', () => {
            expect(connection.weight).toBe(0);
            expect(connection.enabled).toBe(true);
        });
    });

    describe('from property', () => {
        it('should get and set from node', () => {
            const newFromNode = new Node(0.2, new NodeGene(3));
            connection.from = newFromNode;
            expect(connection.from).toBe(newFromNode);
        });
    });

    describe('to property', () => {
        it('should get and set to node', () => {
            const newToNode = new Node(0.8, new NodeGene(4));
            connection.to = newToNode;
            expect(connection.to).toBe(newToNode);
        });
    });

    describe('weight property', () => {
        it('should get and set weight', () => {
            connection.weight = 2.5;
            expect(connection.weight).toBe(2.5);
        });

        it('should handle negative weights', () => {
            connection.weight = -1.5;
            expect(connection.weight).toBe(-1.5);
        });

        it('should handle zero weight', () => {
            connection.weight = 0;
            expect(connection.weight).toBe(0);
        });

        it('should handle large weights', () => {
            connection.weight = 1000.123;
            expect(connection.weight).toBe(1000.123);
        });
    });

    describe('enabled property', () => {
        it('should get and set enabled state', () => {
            expect(connection.enabled).toBe(true);
            connection.enabled = false;
            expect(connection.enabled).toBe(false);
        });

        it('should toggle enabled state', () => {
            connection.enabled = false;
            expect(connection.enabled).toBe(false);
            connection.enabled = true;
            expect(connection.enabled).toBe(true);
        });
    });
});
