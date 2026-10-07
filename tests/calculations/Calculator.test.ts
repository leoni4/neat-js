import { describe, it, expect, beforeEach } from 'vitest';
import { Calculator } from '../../src/calculations/Calculator.js';
import { Node } from '../../src/calculations/Node.js';
import { Connection } from '../../src/calculations/Connection.js';
import { Neat, EActivation } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { ConnectionGene } from '../../src/genome/connectionGene.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { NETWORK_CONSTANTS } from '../../src/neat/constants.js';
import { buildGenome, NodeLayout } from '../helpers/genomeBuilder.js';
import { mulberry32, withSeededRandom } from '../helpers/seededRandom.js';

function referenceCalculator(genome: Genome, outputActivation: EActivation, hiddenActivation: EActivation) {
    const inputs: Node[] = [];
    const hidden: Node[] = [];
    const outputs: Node[] = [];
    const byId = new Map<number, Node>();
    for (const n of genome.nodes.data) {
        if (n instanceof ConnectionGene) continue;
        const node = new Node(n.x, n);
        byId.set(n.innovationNumber, node);
        if (n.x === NETWORK_CONSTANTS.INPUT_NODE_X) inputs.push(node);
        else if (n.x === NETWORK_CONSTANTS.OUTPUT_NODE_X) outputs.push(node);
        else hidden.push(node);
    }
    hidden.sort((a, b) => a.compareTo(b));
    for (const c of genome.connections.data) {
        if (c instanceof NodeGene) continue;
        const from = byId.get(c.from.innovationNumber);
        const to = byId.get(c.to.innovationNumber);
        if (!from || !to) continue;
        const con = new Connection(from, to);
        con.weight = c.weight;
        con.enabled = c.enabled;
        to.connections.push(con);
    }

    return (input: number[]): number[] => {
        inputs.forEach((node, i) => (node.output = input[i]));
        hidden.forEach(node => node.calculate(hiddenActivation));
        const output = outputs.map(node => {
            node.calculate(outputActivation);

            return node.output;
        });
        if (outputActivation === EActivation.softmax) {
            const max = Math.max(...output);
            const exps = output.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);

            return exps.map(e => e / sum);
        }

        return output;
    };
}

const ACTIVATION_PAIRS: Array<[EActivation, EActivation]> = [
    [EActivation.tanh, EActivation.tanh],
    [EActivation.sigmoid, EActivation.relu],
    [EActivation.none, EActivation.leakyRelu],
    [EActivation.softmax, EActivation.linear],
];

function countBitEqual(genome: Genome, inputs: number[][]): { equal: number; total: number } {
    let equal = 0;
    let total = 0;
    for (const [outputActivation, hiddenActivation] of ACTIVATION_PAIRS) {
        const flat = new Calculator(genome, outputActivation, hiddenActivation);
        const reference = referenceCalculator(genome, outputActivation, hiddenActivation);
        for (const input of inputs) {
            const a = flat.calculate(input);
            const b = reference(input);
            for (let i = 0; i < b.length; i++) {
                total++;
                if (Object.is(a[i], b[i])) equal++;
            }
        }
    }

    return { equal, total };
}

function randomInputs(count: number, size: number, seed: number): number[][] {
    const next = mulberry32(seed);

    return Array.from({ length: count }, () => Array.from({ length: size }, () => next() * 4 - 2));
}

describe('Calculator', () => {
    let neat: Neat;
    let genome: Genome;

    beforeEach(() => {
        neat = new Neat(2, 1, 10, EActivation.sigmoid);
        genome = neat.clients[0].genome;
    });

    describe('constructor', () => {
        it('should create a calculator from a genome', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            expect(calculator).toBeDefined();
        });

        it('should handle different output activations', () => {
            const calculatorSigmoid = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const calculatorNone = new Calculator(genome, EActivation.none, EActivation.none);

            expect(calculatorSigmoid).toBeDefined();
            expect(calculatorNone).toBeDefined();
        });
    });

    describe('calculate', () => {
        it('should throw error if input length does not match', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);

            expect(() => calculator.calculate([1])).toThrow();
            expect(() => calculator.calculate([1, 2, 3])).toThrow();
        });

        it('should calculate output for valid input', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
            expect(typeof output[0]).toBe('number');
        });

        it('should return outputs in range [0, 1] for sigmoid', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output = calculator.calculate([1, 1]);

            expect(output[0]).toBeGreaterThanOrEqual(0);
            expect(output[0]).toBeLessThanOrEqual(1);
        });

        it('should handle multiple outputs', () => {
            const neatMulti = new Neat(3, 2, 10, EActivation.sigmoid);
            const genomeMulti = neatMulti.clients[0].genome;
            const calculator = new Calculator(genomeMulti, EActivation.sigmoid, EActivation.sigmoid);

            const output = calculator.calculate([1, 0, 1]);
            expect(output).toHaveLength(2);
        });

        it('should calculate with none activation', () => {
            const calculator = new Calculator(genome, EActivation.none, EActivation.none);
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should handle zero inputs', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output = calculator.calculate([0, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should handle negative inputs', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output = calculator.calculate([-1, -0.5]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });

        it('should produce consistent results for same input', () => {
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output1 = calculator.calculate([1, 0]);
            const output2 = calculator.calculate([1, 0]);

            expect(output1).toEqual(output2);
        });

        it('should work with genome that has mutations', () => {
            genome.mutate(true);
            const calculator = new Calculator(genome, EActivation.sigmoid, EActivation.sigmoid);
            const output = calculator.calculate([1, 0]);

            expect(Array.isArray(output)).toBe(true);
            expect(output).toHaveLength(1);
        });
    });

    describe('bit-identical to the Node/Connection evaluation', () => {
        const LAYOUT: NodeLayout = {
            1: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 0.25 },
            2: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 0.5 },
            3: { x: NETWORK_CONSTANTS.INPUT_NODE_X, y: 0.75 },
            4: { x: NETWORK_CONSTANTS.OUTPUT_NODE_X, y: 0.3 },
            12: { x: NETWORK_CONSTANTS.OUTPUT_NODE_X, y: 0.7 },
            5: { x: 0.3, y: 0.5 },
            6: { x: 0.5, y: 0.3 },
            7: { x: 0.5, y: 0.7 },
            8: { x: 0.7, y: 0.5 },
            9: { x: 0.4, y: 0.9 },
            10: { x: 0.6, y: 0.9 },
            11: { x: 0.8, y: 0.1 },
            13: { x: 0.25, y: 0.1 },
        };
        let edgeGenome: Genome;

        beforeEach(() => {
            const edgeNeat = new Neat(3, 2, 1, EActivation.sigmoid, EActivation.sigmoid);
            edgeGenome = buildGenome(edgeNeat, LAYOUT, {
                nodes: {
                    1: 0,
                    2: 0,
                    3: 0,
                    4: 0.1,
                    12: -0.2,
                    5: 0.3,
                    6: -0.4,
                    7: 0.5,
                    8: -0.6,
                    9: 0.7,
                    10: -0.8,
                    11: 0.9,
                    13: 0.15,
                },
                links: [
                    { from: 1, to: 5, weight: 0.8 },
                    { from: 2, to: 5, weight: -1.1 },
                    { from: 5, to: 6, weight: 1.3 },
                    { from: 3, to: 7, weight: -0.7 },
                    { from: 6, to: 8, weight: 0.9 },
                    { from: 7, to: 8, weight: 1.7 },
                    { from: 8, to: 4, weight: -1.2 },
                    { from: 7, to: 12, weight: 0.6 },
                    { from: 8, to: 6, weight: 0.4 },
                    { from: 4, to: 5, weight: -0.5 },
                    { from: 7, to: 7, weight: 0.3 },
                    { from: 3, to: 11, weight: 1.1 },
                    { from: 11, to: 5, weight: -0.9 },
                    { from: 2, to: 13, weight: 1.4 },
                    { from: 13, to: 6, weight: -0.8 },
                    { from: 2, to: 8, weight: 2.5, enabled: false },
                    { from: 6, to: 1, weight: 3 },
                    { from: 1, to: 9, weight: 0.2 },
                    { from: 9, to: 10, weight: -0.3 },
                    { from: 12, to: 9, weight: 0.5 },
                ],
            });
        });

        it('gives the same float64 outputs on a genome with dead nodes, stale reads, and disabled links', () => {
            const { equal, total } = countBitEqual(edgeGenome, randomInputs(32, 3, 1601));

            expect(total).toBe(ACTIVATION_PAIRS.length * 32 * 2);
            expect(equal).toBe(total);
        });

        it('keeps node values between calls like the old evaluation', () => {
            const calculator = new Calculator(edgeGenome, EActivation.none, EActivation.tanh);
            const first = calculator.calculate([0.5, -0.5, 1]);
            const second = calculator.calculate([0.5, -0.5, 1]);

            expect(first[0]).not.toBe(second[0]);
        });

        it('reads the node bias at call time', () => {
            const flat = new Calculator(edgeGenome, EActivation.tanh, EActivation.tanh);
            const reference = referenceCalculator(edgeGenome, EActivation.tanh, EActivation.tanh);
            const input = [0.2, 0.4, -0.6];
            const before = flat.calculate(input);
            reference(input);
            for (const n of edgeGenome.nodes.data) {
                if (n instanceof NodeGene && (n.innovationNumber === 4 || n.innovationNumber === 8)) n.bias += 0.25;
            }
            const after = flat.calculate(input);
            const expected = reference(input);

            expect(after[0]).not.toBe(before[0]);
            expect(Object.is(after[0], expected[0])).toBe(true);
            expect(Object.is(after[1], expected[1])).toBe(true);
        });

        it('gives the same float64 outputs on an evolved population', () => {
            const { result: genomes } = withSeededRandom(1602, () => {
                const evolved = new Neat(12, 2, 40, EActivation.tanh, EActivation.tanh, {
                    PERMANENT_MAIN_CONNECTIONS: false,
                });
                const data = randomInputs(8, 12, 1603);
                for (let gen = 0; gen < 60; gen++) {
                    for (const client of evolved.clients) {
                        let error = 0;
                        for (const x of data) error += Math.abs(client.calculate(x)[0] - Math.tanh(x[0] - x[3]));
                        client.error = error / data.length;
                        client.score = 1 - client.error;
                    }
                    evolved.evolve();
                }

                return evolved.clients.map(client => client.genome);
            });
            const hiddenCount = genomes.reduce((count, g) => count + g.nodes.size() - 14, 0);
            const inputs = randomInputs(16, 12, 1604);
            let equal = 0;
            let total = 0;
            for (const g of genomes) {
                const r = countBitEqual(g, inputs);
                equal += r.equal;
                total += r.total;
            }

            expect(hiddenCount).toBeGreaterThan(0);
            expect(total).toBe(genomes.length * ACTIVATION_PAIRS.length * 16 * 2);
            expect(equal).toBe(total);
        });
    });
});
