import { describe, it, expect } from 'vitest';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { Calculator } from '../../src/calculations/Calculator.js';

const snapshot = (genome: Genome): string => JSON.stringify(genome.save());

const INPUTS = [
    [0, 0, 0],
    [1, 0, 1],
    [0.5, -1, 0.25],
    [-0.75, 0.3, 1],
];

const outputs = (genome: Genome): number[][] => {
    const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.tanh);

    return INPUTS.map(input => calculator.calculate(input));
};

const connectionGenes = (genome: Genome): ConnectionGene[] =>
    genome.connections.data.filter((c): c is ConnectionGene => c instanceof ConnectionGene);

// The source makes the links and the first splits, so at the baseline it holds the registry records.
const sourceGenome = (seed: number): Genome => {
    const neat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.tanh, {
        seed,
        PROBABILITY_MUTATE_NODES: 0.3,
        PROBABILITY_MUTATE_LINK: 0.5,
    });
    const genome = neat.clients[0].genome;
    for (let i = 0; i < 6; i++) genome.mutateLink();
    for (let i = 0; i < 2; i++) genome.mutateNode();

    return genome;
};

const OPERATORS: Array<[string, (genome: Genome) => void]> = [
    ['mutateLink', genome => genome.mutateLink()],
    ['mutateNode', genome => genome.mutateNode()],
    ['mutateWeightShift', genome => genome.mutateWeightShift()],
    ['mutateWeightRandom', genome => genome.mutateWeightRandom()],
    ['mutateLinkToggle', genome => genome.mutateLinkToggle()],
    ['mutate()', genome => genome.mutate()],
    ['mutate(true)', genome => genome.mutate(true)],
];

const CLONES: Array<[string, (genome: Genome) => Genome]> = [
    ['Genome.crossOver(a, a)', genome => Genome.crossOver(genome, genome)],
    ['neat.loadGenome(a.save())', genome => genome.neat.loadGenome(genome.save())],
];

const DATA = [
    { input: [0, 0, 0, 1], target: [0, 1] },
    { input: [0, 1, 1, 0], target: [1, 0] },
    { input: [1, 0, 1, 1], target: [1, 1] },
    { input: [1, 1, 0, 0], target: [0, 0] },
];

const evolveWithStructure = (seed: number, generations: number): Neat => {
    const neat = new Neat(4, 2, 50, EActivation.sigmoid, EActivation.tanh, {
        seed,
        PROBABILITY_MUTATE_NODES: 0.3,
        PROBABILITY_MUTATE_LINK: 0.5,
    });
    for (let g = 0; g < generations; g++) {
        neat.clients.forEach(client => {
            let error = 0;
            DATA.forEach(({ input, target }) => {
                const output = client.calculate(input);
                target.forEach((t, k) => (error += Math.abs(t - output[k])));
            });
            // error must be set: with error 0, ERROR_DRIVES_OPTIMIZATION stops structural mutations
            client.error = error / (DATA.length * 2);
            client.score = 1 - client.error;
        });
        neat.evolve();
    }

    return neat;
};

describe('Genome - isolation', () => {
    it('should not change genome A when genome B splits a link that A created', () => {
        const neat = new Neat(2, 1, 1, EActivation.sigmoid, EActivation.tanh, { seed: 1 });
        const a = neat.clients[0].genome;
        while (a.connections.size() < 2) a.mutateLink();
        const b = Genome.crossOver(a, a);
        const before = JSON.stringify(a.save());

        let mid = null;
        for (let i = 0; i < 20 && !mid; i++) mid = b.mutateNode();

        expect(mid).not.toBeNull();
        expect(JSON.stringify(a.save())).toBe(before);
    });

    it('should not put registry connections or registry nodes into client genomes', () => {
        const neat = evolveWithStructure(6, 15);

        const registryObjects = new Set<object>([...neat.allConnections.values(), ...neat.allNodes.data]);
        const shared = neat.clients.flatMap(client =>
            [...client.genome.connections.data, ...client.genome.nodes.data].filter(gene => registryObjects.has(gene)),
        );

        expect(neat.allConnections.size).toBeGreaterThan(50);
        expect(shared).toHaveLength(0);
    });

    describe.each(CLONES)('category 1: cloned genomes, clone made with %s', (_, makeClone) => {
        it.each(OPERATORS)('%s on the clone does not change the source', (_, operator) => {
            const source = sourceGenome(21);
            const clone = makeClone(source);
            const before = snapshot(source);
            const outputsBefore = outputs(source);

            for (let i = 0; i < 20; i++) operator(clone);

            expect(snapshot(clone)).not.toBe(before);
            expect(snapshot(source)).toBe(before);
            expect(outputs(source)).toEqual(outputsBefore);
        });

        it.each(OPERATORS)('%s on the source does not change the clone', (_, operator) => {
            const source = sourceGenome(21);
            const clone = makeClone(source);
            const before = snapshot(clone);
            const outputsBefore = outputs(clone);

            for (let i = 0; i < 20; i++) operator(source);

            expect(snapshot(source)).not.toBe(before);
            expect(snapshot(clone)).toBe(before);
            expect(outputs(clone)).toEqual(outputsBefore);
        });
    });

    describe('category 2: independently created genomes', () => {
        it('a new genome with many structural mutations does not change the client genomes', () => {
            const neat = new Neat(20, 2, 50, EActivation.sigmoid, EActivation.tanh, { seed: 9 });
            neat.clients.forEach((client, i) => {
                client.error = 0.5;
                client.score = (i * 7919) % 50;
            });
            neat.evolve();
            const before = neat.clients.map(client => snapshot(client.genome));

            const genome = neat.emptyGenome();
            for (let i = 0; i < 300; i++) genome.mutateLink();
            for (let i = 0; i < 300; i++) genome.mutateNode();

            expect(genome.nodes.size()).toBeGreaterThan(22);
            expect(neat.clients.map(client => snapshot(client.genome))).toEqual(before);
        });

        it('two genomes from emptyGenome() do not change each other', () => {
            const neat = new Neat(3, 1, 1, EActivation.sigmoid, EActivation.tanh, { seed: 4 });
            const a = neat.emptyGenome();
            for (let i = 0; i < 6; i++) a.mutateLink();
            const b = neat.emptyGenome();
            const beforeA = snapshot(a);
            const outputsA = outputs(a);

            for (let i = 0; i < 20; i++) {
                b.mutateLink();
                b.mutateNode();
            }
            const beforeB = snapshot(b);

            expect(snapshot(a)).toBe(beforeA);
            expect(outputs(a)).toEqual(outputsA);

            for (let i = 0; i < 20; i++) {
                a.mutateLink();
                a.mutateNode();
                a.mutateWeightShift();
            }

            expect(snapshot(b)).toBe(beforeB);
        });
    });

    describe('category 3: structural mutations and innovation registry integrity', () => {
        it('no gene object is in two client genomes', () => {
            const neat = evolveWithStructure(6, 15);
            const owners = new Map<object, number>();
            neat.clients.forEach(client =>
                [...client.genome.connections.data, ...client.genome.nodes.data].forEach(gene =>
                    owners.set(gene, (owners.get(gene) ?? 0) + 1),
                ),
            );

            expect([...owners.values()].filter(count => count > 1)).toHaveLength(0);
        });

        it('each connection gene has the innovation number of its registry record', () => {
            const neat = evolveWithStructure(6, 15);
            const genes = neat.clients.flatMap(client => connectionGenes(client.genome));
            const mismatches = genes.filter(
                gene => neat.allConnections.get(gene.getHashKey())?.innovationNumber !== gene.innovationNumber,
            );

            expect(genes.length).toBeGreaterThan(100);
            expect(mismatches).toHaveLength(0);
        });

        it('two genomes that split the same link get the same middle node id and innovation numbers', () => {
            const neat = new Neat(1, 1, 2, EActivation.sigmoid, EActivation.tanh, { seed: 5 });
            const [a, b] = neat.clients.map(client => client.genome);
            while (a.connections.size() < 1) a.mutateLink();
            while (b.connections.size() < 1) b.mutateLink();

            const middleA = a.mutateNode();
            const middleB = b.mutateNode();
            const structure = (genome: Genome) =>
                connectionGenes(genome).map(c => [c.innovationNumber, c.from.innovationNumber, c.to.innovationNumber]);

            expect(middleA).toBeInstanceOf(NodeGene);
            expect(middleB?.innovationNumber).toBe(middleA?.innovationNumber);
            expect(middleB).not.toBe(middleA);
            const middleId = middleA?.innovationNumber;
            expect(structure(a).map(([, from, to]) => [from, to])).toEqual([
                [1, middleId],
                [middleId, 2],
            ]);
            expect(structure(b)).toEqual(structure(a));
        });

        it('the registry replaceIndex of a split link does not change when the creator mutates later', () => {
            const neat = new Neat(2, 1, 1, EActivation.sigmoid, EActivation.tanh, { seed: 8 });
            const creator = neat.clients[0].genome;
            while (creator.connections.size() < 2) creator.mutateLink();

            let middle: NodeGene | null = null;
            for (let i = 0; i < 20 && !middle; i++) middle = creator.mutateNode();
            const split = [...neat.allConnections.entries()].filter(([, record]) => record.replaceIndex !== 0);

            expect(middle).toBeInstanceOf(NodeGene);
            expect(split).toHaveLength(1);
            const [key, record] = split[0];
            expect(record.replaceIndex).toBe(middle?.innovationNumber);

            for (let i = 0; i < 30; i++) {
                creator.mutateWeightShift();
                creator.mutateWeightRandom();
                creator.mutateLinkToggle();
                creator.mutateLink();
                creator.mutateNode();
            }

            expect(neat.allConnections.size).toBeGreaterThan(3);
            expect(neat.allConnections.get(key)?.replaceIndex).toBe(middle?.innovationNumber);
        });
    });
});
