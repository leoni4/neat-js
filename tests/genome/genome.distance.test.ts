import { describe, it, expect, beforeEach } from 'vitest';
import { Neat, EActivation, INeatParams } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { NETWORK_CONSTANTS } from '../../src/neat/constants.js';
import { buildGenome, GenomeSpec, NodeLayout, registerLinks } from '../helpers/genomeBuilder.js';

const LAYOUT: NodeLayout = {
    1: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 1 / 3 },
    2: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 2 / 3 },
    3: { x: NETWORK_CONSTANTS.OUTPUT_NODE_X, y: 0.5 },
    4: { x: 0.5, y: 0.25 },
    5: { x: 0.5, y: 0.75 },
};

const LINK_ORDER: Array<[number, number]> = [
    [1, 3],
    [2, 3],
    [1, 4],
    [4, 3],
    [1, 5],
    [5, 3],
];

const IO_NODES = { 1: 0, 2: 0, 3: 0 };

function pair(params: INeatParams, specA: GenomeSpec, specB: GenomeSpec, linkOrder = LINK_ORDER): [Genome, Genome] {
    const neat = new Neat(2, 1, 1, EActivation.sigmoid, EActivation.sigmoid, params);
    registerLinks(neat, LAYOUT, linkOrder);

    return [buildGenome(neat, LAYOUT, specA), buildGenome(neat, LAYOUT, specB)];
}

function excessConnectionPair(params: INeatParams): [Genome, Genome] {
    return pair(
        params,
        {
            nodes: IO_NODES,
            links: [
                { from: 1, to: 3, weight: 1 },
                { from: 2, to: 3, weight: 1 },
            ],
        },
        { nodes: IO_NODES, links: [{ from: 1, to: 3, weight: 1 }] },
    );
}

function disjointConnectionPair(params: INeatParams): [Genome, Genome] {
    const nodes = { ...IO_NODES, 4: 0 };

    return pair(
        params,
        {
            nodes,
            links: [
                { from: 1, to: 3, weight: 1 },
                { from: 1, to: 4, weight: 1 },
                { from: 4, to: 3, weight: 1 },
            ],
        },
        {
            nodes,
            links: [
                { from: 2, to: 3, weight: 1 },
                { from: 1, to: 4, weight: 1 },
                { from: 4, to: 3, weight: 1 },
            ],
        },
    );
}

function weightDiffPair(params: INeatParams): [Genome, Genome] {
    return pair(
        params,
        {
            nodes: IO_NODES,
            links: [
                { from: 1, to: 3, weight: 0.5 },
                { from: 2, to: 3, weight: -1 },
            ],
        },
        {
            nodes: IO_NODES,
            links: [
                { from: 1, to: 3, weight: 0.25 },
                { from: 2, to: 3, weight: 0 },
            ],
        },
    );
}

describe('Genome - distance', () => {
    let neat: Neat;
    let genome1: Genome;
    let genome2: Genome;

    beforeEach(() => {
        neat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid);
        genome1 = neat.clients[0].genome;
        genome2 = neat.clients[0].genome;
    });

    describe('basic distance calculation', () => {
        it('should return 0 for identical genomes', () => {
            const distance = genome1.distance(genome1);
            expect(distance).toBe(0);
        });

        it('should return positive distance for different genomes', () => {
            const [a, b] = excessConnectionPair({ C1: 3, C2: 7 });

            expect(a.distance(b)).toBe(1.5);
        });

        it('should be symmetric', () => {
            const [a, b] = excessConnectionPair({ C1: 3, C2: 7 });

            expect(b.distance(a)).toBe(1.5);
            expect(a.distance(b)).toBe(b.distance(a));
        });
    });

    describe('excess genes', () => {
        it('should account for excess connections', () => {
            const [a, b] = excessConnectionPair({ C1: 3, C2: 7 });

            // C1 * 1 / 2
            expect(a.distance(b)).toBe(1.5);
        });

        it('should account for excess nodes', () => {
            const [a, b] = pair(
                { C1: 3, C2: 7 },
                {
                    nodes: { ...IO_NODES, 4: 0 },
                    links: [
                        { from: 1, to: 3, weight: 1 },
                        { from: 1, to: 4, weight: 1 },
                        { from: 4, to: 3, weight: 1 },
                    ],
                },
                { nodes: IO_NODES, links: [{ from: 1, to: 3, weight: 1 }] },
            );

            expect(a.distance(b)).toBe(3);
        });
    });

    describe('disjoint genes', () => {
        it('should account for disjoint connections', () => {
            const [a, b] = disjointConnectionPair({ C1: 7, C2: 1.5 });

            expect(a.distance(b)).toBe(1);
        });

        it('should count a g2 node that g1 does not have as disjoint', () => {
            const [a, b] = pair(
                { C1: 1.5, C2: 0.75 },
                {
                    nodes: { ...IO_NODES, 5: 0 },
                    links: [
                        { from: 1, to: 3, weight: 1 },
                        { from: 1, to: 5, weight: 1 },
                        { from: 5, to: 3, weight: 1 },
                    ],
                },
                {
                    nodes: { ...IO_NODES, 4: 0 },
                    links: [
                        { from: 1, to: 3, weight: 1 },
                        { from: 1, to: 4, weight: 1 },
                        { from: 4, to: 3, weight: 1 },
                    ],
                },
            );

            expect(a.distance(b)).toBe(2.25);
        });

        it('should count nodes in the range and the nodes of g2 after the last g1 node as disjoint', () => {
            const [a, b] = pair(
                { C1: 1.5, C2: 0.75 },
                {
                    nodes: { ...IO_NODES, 4: 0 },
                    links: [
                        { from: 1, to: 3, weight: 1 },
                        { from: 1, to: 4, weight: 1 },
                        { from: 4, to: 3, weight: 1 },
                    ],
                },
                {
                    nodes: { ...IO_NODES, 5: 0 },
                    links: [
                        { from: 1, to: 3, weight: 1 },
                        { from: 1, to: 5, weight: 1 },
                        { from: 5, to: 3, weight: 1 },
                    ],
                },
                [
                    [1, 3],
                    [1, 5],
                    [5, 3],
                    [1, 4],
                    [4, 3],
                ],
            );

            expect(a.distance(b)).toBe(2);
            expect(b.distance(a)).toBe(2);
        });
    });

    describe('weight differences', () => {
        it('should account for weight differences in matching genes', () => {
            const [a, b] = weightDiffPair({ C1: 7, C2: 7, C3: 2 });

            expect(a.distance(b)).toBe(0.5);
        });

        it('should consider bias differences', () => {
            const links = [
                { from: 1, to: 3, weight: 1 },
                { from: 2, to: 3, weight: 1 },
            ];
            const [a, b] = pair(
                { C1: 7, C2: 7, C3: 2 },
                { nodes: { ...IO_NODES, 3: 1 }, links },
                { nodes: { ...IO_NODES, 3: -0.25 }, links },
            );

            expect(a.distance(b)).toBe(0.5);
        });
    });

    describe('normalization with CT threshold', () => {
        it('should normalize by the larger connection count when it is >= CT', () => {
            const [a, b] = excessConnectionPair({ C1: 2, C2: 7, CT: 1 });

            expect(a.distance(b)).toBe(1);
        });

        it('should normalize by CT when CT > the connection counts', () => {
            const [a, b] = excessConnectionPair({ C1: 2, C2: 7, CT: 4 });

            expect(a.distance(b)).toBe(0.5);
        });
    });

    describe('distance coefficients', () => {
        it('should use C1 coefficient for excess genes', () => {
            const [a1, b1] = excessConnectionPair({ C1: 3, C2: 7 });
            const [a2, b2] = excessConnectionPair({ C1: 6, C2: 7 });

            expect(a1.distance(b1)).toBe(1.5);
            expect(a2.distance(b2)).toBe(3);
        });

        it('should use C2 coefficient for disjoint genes', () => {
            const [a1, b1] = disjointConnectionPair({ C1: 7, C2: 1.5 });
            const [a2, b2] = disjointConnectionPair({ C1: 7, C2: 3 });

            expect(a1.distance(b1)).toBe(1);
            expect(a2.distance(b2)).toBe(2);
        });

        it('should use C3 coefficient for weight differences', () => {
            const [a1, b1] = weightDiffPair({ C1: 7, C2: 7, C3: 2 });
            const [a2, b2] = weightDiffPair({ C1: 7, C2: 7, C3: 4 });

            expect(a1.distance(b1)).toBe(0.5);
            expect(a2.distance(b2)).toBe(1);
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
            const output = emptyGenome1.nodes.get(3);
            if (!(output instanceof NodeGene)) throw new Error('node 4 is not a NodeGene');
            output.bias = 2.5;

            expect(emptyGenome1.distance(emptyGenome2)).toBe(0.1);
        });

        it('should not throw errors with complex genomes', () => {
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
});
