import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, OutputActivation } from '../../src/neat/neat.js';

describe('Neat', () => {
    let neat: Neat;

    beforeEach(() => {
        neat = new Neat(3, 2, 10, OutputActivation.sigmoid);
    });

    describe('constructor', () => {
        it('should create NEAT instance with specified parameters', () => {
            expect(neat.inputNodes).toBe(3);
            expect(neat.outputNodes).toBe(2);
            expect(neat.clients).toHaveLength(10);
        });

        it('should initialize clients', () => {
            expect(neat.clients.every(c => c.genome !== undefined)).toBe(true);
        });

        it('should create input and output nodes', () => {
            const firstClient = neat.clients[0];
            expect(firstClient.genome.nodes.size()).toBeGreaterThanOrEqual(5); // 3 input + 2 output
        });
    });

    describe('getNode', () => {
        it('should get existing node by id', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(1);
            expect(node1).toBe(node2);
        });

        it('should create new node if id exceeds size', () => {
            const sizeBefore = neat.allNodes.size();
            neat.getNode();
            expect(neat.allNodes.size()).toBe(sizeBefore + 1);
        });
    });

    describe('getConnection', () => {
        it('should create connection between nodes', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(2);
            const conn = neat.getConnection(node1, node2);

            expect(conn.from).toBe(node1);
            expect(conn.to).toBe(node2);
        });

        it('should return same connection for same nodes', () => {
            const node1 = neat.getNode(1);
            const node2 = neat.getNode(2);
            const conn1 = neat.getConnection(node1, node2);
            const conn2 = neat.getConnection(node1, node2);

            expect(conn1.innovationNumber).toBe(conn2.innovationNumber);
        });
    });

    describe('emptyGenome', () => {
        it('should create genome with only input and output nodes', () => {
            const genome = neat.emptyGenome();
            expect(genome.nodes.size()).toBe(5); // 3 input + 2 output
            expect(genome.connections.size()).toBe(0);
        });
    });

    describe('evolve', () => {
        it('should evolve population', () => {
            neat.clients.forEach((c, i) => {
                c.score = i;
            });

            neat.evolve();

            expect(neat.clients).toHaveLength(10);
        });

        it('should identify best client', () => {
            neat.clients[0].score = 100;
            neat.clients[1].score = 50;
            neat.clients[2].score = 25;

            neat.evolve();

            const bestClients = neat.clients.filter(c => c.bestScore);
            expect(bestClients.length).toBeGreaterThan(0);
        });
    });

    describe('save and load', () => {
        it('should save genome data', () => {
            const saveData = neat.save();
            expect(saveData.genome).toBeDefined();
            expect(saveData.genome.nodes).toBeDefined();
            expect(saveData.genome.connections).toBeDefined();
            expect(saveData.evolveCounts).toBeDefined();
        });

        it('should load genome data', () => {
            const saveData = neat.save();
            const neat2 = new Neat(3, 2, 10, OutputActivation.sigmoid, undefined, saveData);

            expect(neat2.clients).toHaveLength(10);
        });
    });

    describe('MAX_NODES', () => {
        it('should be a large constant', () => {
            expect(Neat.MAX_NODES).toBe(Math.pow(2, 20));
        });
    });

    describe('parameters', () => {
        it('should accept custom parameters', () => {
            const customNeat = new Neat(2, 1, 5, OutputActivation.sigmoid, {
                C1: 2,
                C2: 2,
                C3: 0.5,
            });

            expect(customNeat.C1).toBe(2);
            expect(customNeat.C2).toBe(2);
            expect(customNeat.C3).toBe(0.5);
        });

        it('should use default parameters when not specified', () => {
            expect(neat.C1).toBe(1);
            expect(neat.C2).toBe(1);
            expect(neat.C3).toBe(0.1);
        });
    });

    describe('OutputActivation enum', () => {
        it('should have all activation types', () => {
            expect(OutputActivation.none).toBe('none');
            expect(OutputActivation.sigmoid).toBe('sigmoid');
            expect(OutputActivation.tanh).toBe('tanh');
            expect(OutputActivation.relu).toBe('relu');
            expect(OutputActivation.leakyRelu).toBe('leakyRelu');
            expect(OutputActivation.linear).toBe('linear');
            expect(OutputActivation.softmax).toBe('softmax');
        });
    });
});
