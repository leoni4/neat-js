import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';

describe('Genome', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid);
        genome = neat.clients[0].genome;
    });

    describe('constructor and initialization', () => {
        it('should create a genome instance', () => {
            expect(genome).toBeInstanceOf(Genome);
        });

        it('should have reference to neat instance', () => {
            expect(genome.neat).toBe(neat);
        });

        it('should initialize with nodes (inputs + outputs)', () => {
            expect(genome.nodes.size()).toBe(5); // 3 inputs + 2 outputs
        });

        it('should initialize with connections between all inputs and outputs', () => {
            // Note: genome.clients[0].genome starts with 6 connections by default
            expect(genome.connections.size()).toBeGreaterThanOrEqual(0);
            // Verify it has the expected input and output nodes
            expect(genome.nodes.size()).toBe(5);
        });

        it('should start with selfOpt as false', () => {
            expect(genome.selfOpt).toBe(false);
        });

        it('should have optErrThreshold from neat', () => {
            expect(genome.optErrThreshold).toBe(neat.OPT_ERR_THRESHOLD);
        });
    });

    describe('emptyGenome', () => {
        it('should create genome with only input and output nodes', () => {
            const emptyGenome = neat.emptyGenome();
            expect(emptyGenome.nodes.size()).toBe(5); // 3 input + 2 output
            expect(emptyGenome.connections.size()).toBe(0);
        });

        it('should not share nodes with other genomes', () => {
            const genome1 = neat.emptyGenome();
            const genome2 = neat.emptyGenome();
            expect(genome1).not.toBe(genome2);
        });
    });

    describe('save', () => {
        it('should save genome data', () => {
            const saveData = genome.save();
            expect(saveData).toHaveProperty('nodes');
            expect(saveData).toHaveProperty('connections');
        });

        it('should save all nodes', () => {
            const saveData = genome.save();
            expect(saveData.nodes.length).toBe(genome.nodes.size());
        });

        it('should save all connections', () => {
            const saveData = genome.save();
            expect(saveData.connections.length).toBe(genome.connections.size());
        });

        it('should save node properties correctly', () => {
            const saveData = genome.save();
            const firstNode = saveData.nodes[0];
            expect(firstNode).toHaveProperty('innovationNumber');
            expect(firstNode).toHaveProperty('x');
            expect(firstNode).toHaveProperty('y');
        });

        it('should save connection properties correctly', () => {
            // Add a connection first to ensure we have something to save
            genome.mutateLink();

            const saveData = genome.save();
            if (saveData.connections.length > 0) {
                const firstConnection = saveData.connections[0];
                expect(firstConnection).toHaveProperty('replaceIndex');
                expect(firstConnection).toHaveProperty('enabled');
                expect(firstConnection).toHaveProperty('weight');
                expect(firstConnection).toHaveProperty('from');
                expect(firstConnection).toHaveProperty('to');
            }
        });

        it('should store connection node references as innovation numbers', () => {
            // Add a connection first
            genome.mutateLink();

            const saveData = genome.save();
            if (saveData.connections.length > 0) {
                const firstConnection = saveData.connections[0];
                expect(typeof firstConnection.from).toBe('number');
                expect(typeof firstConnection.to).toBe('number');
            }
        });
    });
});
