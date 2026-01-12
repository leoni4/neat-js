import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { Neat } from '../../src/neat/neat.js';

describe('ConnectionGene', () => {
    let fromNode: NodeGene;
    let toNode: NodeGene;
    let connection: ConnectionGene;

    beforeEach(() => {
        fromNode = new NodeGene(1);
        fromNode.x = 0.01;
        toNode = new NodeGene(2);
        toNode.x = 0.99;
        connection = new ConnectionGene(1, fromNode, toNode);
    });

    describe('constructor', () => {
        it('should create a connection gene with innovation number and nodes', () => {
            expect(connection.innovationNumber).toBe(1);
            expect(connection.from).toBe(fromNode);
            expect(connection.to).toBe(toNode);
        });

        it('should initialize with default values', () => {
            expect(connection.weight).toBe(0);
            expect(connection.enabled).toBe(true);
            expect(connection.replaceIndex).toBe(0);
        });
    });

    describe('from and to properties', () => {
        it('should get and set from node', () => {
            const newFrom = new NodeGene(10);
            connection.from = newFrom;
            expect(connection.from).toBe(newFrom);
        });

        it('should get and set to node', () => {
            const newTo = new NodeGene(20);
            connection.to = newTo;
            expect(connection.to).toBe(newTo);
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

    describe('replaceIndex property', () => {
        it('should get and set replace index', () => {
            connection.replaceIndex = 5;
            expect(connection.replaceIndex).toBe(5);
        });

        it('should handle zero replace index', () => {
            expect(connection.replaceIndex).toBe(0);
        });
    });

    describe('getHashKey', () => {
        it('should generate hash key from nodes', () => {
            fromNode.x = 0.1;
            toNode.x = 0.9;
            const hashKey = connection.getHashKey();
            expect(hashKey).toBe('1-0.1-2-0.9');
        });

        it('should generate unique keys for different connections', () => {
            const node3 = new NodeGene(3);
            node3.x = 0.5;
            const connection2 = new ConnectionGene(2, fromNode, node3);

            expect(connection.getHashKey()).not.toBe(connection2.getHashKey());
        });

        it('should include node positions in hash key', () => {
            fromNode.x = 0.01;
            toNode.x = 0.99;
            const key1 = connection.getHashKey();

            fromNode.x = 0.5;
            const key2 = connection.getHashKey();

            expect(key1).not.toBe(key2);
        });
    });

    describe('equals', () => {
        it('should return true for connections with same from and to nodes', () => {
            const connection2 = new ConnectionGene(2, fromNode, toNode);
            expect(connection.equals(connection2)).toBe(true);
        });

        it('should return false for connections with different nodes', () => {
            const node3 = new NodeGene(3);
            const connection2 = new ConnectionGene(2, fromNode, node3);
            expect(connection.equals(connection2)).toBe(false);
        });

        it('should return false for non-ConnectionGene objects', () => {
            expect(connection.equals({})).toBe(false);
            expect(connection.equals(null)).toBe(false);
            expect(connection.equals(undefined)).toBe(false);
        });

        it('should ignore weight and enabled in equality check', () => {
            const connection2 = new ConnectionGene(2, fromNode, toNode);
            connection.weight = 5.0;
            connection.enabled = false;
            connection2.weight = -3.0;
            connection2.enabled = true;
            expect(connection.equals(connection2)).toBe(true);
        });
    });

    describe('hashCode', () => {
        it('should generate hash code based on from and to nodes', () => {
            const hashCode = connection.hashCode();
            expect(typeof hashCode).toBe('number');
            expect(hashCode).toBe(fromNode.innovationNumber * Neat.MAX_NODES + toNode.innovationNumber);
        });

        it('should return same hash code for connections with same nodes', () => {
            const connection2 = new ConnectionGene(2, fromNode, toNode);
            expect(connection.hashCode()).toBe(connection2.hashCode());
        });

        it('should return different hash codes for different connections', () => {
            const node3 = new NodeGene(3);
            const connection2 = new ConnectionGene(2, fromNode, node3);
            expect(connection.hashCode()).not.toBe(connection2.hashCode());
        });

        it('should use MAX_NODES constant in calculation', () => {
            const expectedHash = fromNode.innovationNumber * Neat.MAX_NODES + toNode.innovationNumber;
            expect(connection.hashCode()).toBe(expectedHash);
        });
    });
});
