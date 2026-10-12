import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Neat, EActivation, type INeatParams, type LoadData } from '../../src/neat/index.js';
import type { GenomeSaveData } from '../../src/genome/index.js';
import { createRng } from '../../src/neat/random.js';
import { mulberry32, withSeededRandom } from '../helpers/seededRandom.js';

const LOAD_FIXTURE = fileURLToPath(new URL('../golden/fixtures/load-genome.json', import.meta.url));

const originalRandom = Math.random;

afterEach(() => {
    expect(Math.random).toBe(originalRandom);
});

// Training data comes from mulberry32, not Math.random, so that the fitness makes no Math.random calls.
const DATA = mulberry32(2101);
const INPUTS = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => DATA() * 2 - 1));
const TARGETS = INPUTS.map(x => 1 / (1 + Math.exp(-(0.8 * x[0] - 0.5 * x[1] + 0.3 * x[2] - 0.2 * x[3]))));

const XOR_X = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
];
const XOR_Y = [[0], [1], [1], [0]];

interface Snapshot {
    population: string;
    model: string;
    cp: number;
    pressure: string;
    species: number;
}

function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function populationJson(neat: Neat): string {
    return JSON.stringify(neat.clients.map(client => client.genome.save()));
}

function createNeat(params?: INeatParams, loadData?: LoadData): Neat {
    return new Neat(4, 1, 30, EActivation.sigmoid, EActivation.tanh, params, loadData);
}

function step(neat: Neat): Snapshot {
    for (const client of neat.clients) {
        let error = 0;
        for (let i = 0; i < INPUTS.length; i++) {
            error += Math.abs(client.calculate(INPUTS[i])[0] - TARGETS[i]);
        }
        client.error = error / INPUTS.length;
        client.score = 1 - client.error;
    }
    neat.evolve();

    return {
        population: sha256(populationJson(neat)),
        model: JSON.stringify(neat.model()),
        cp: neat.CP,
        pressure: neat.PRESSURE,
        species: neat['_species'].length,
    };
}

function evolveHistory(neat: Neat, generations = 30): Snapshot[] {
    return Array.from({ length: generations }, () => step(neat));
}

function seededHistory(seed: number, generations = 30): Snapshot[] {
    return evolveHistory(createNeat({ seed }), generations);
}

function fitRun(seed: number) {
    const neat = new Neat(2, 1, 50, EActivation.sigmoid, EActivation.tanh, { seed });
    const history = neat.fit(XOR_X, XOR_Y, { epochs: 30, errorThreshold: 0, verbose: 0 });

    return { error: history.error, champion: JSON.stringify(history.champion?.model()) };
}

function countMathRandomCalls(fn: () => void): number {
    const spy = vi.spyOn(Math, 'random');
    try {
        fn();

        return spy.mock.calls.length;
    } finally {
        spy.mockRestore();
    }
}

describe('Neat seed option', () => {
    it('T1: the same seed gives identical evolve() histories', () => {
        const first = seededHistory(12345);
        const second = seededHistory(12345);

        expect(second).toEqual(first);
    });

    it('T1: the same seed gives identical fit() histories', () => {
        const first = fitRun(12345);
        const second = fitRun(12345);

        expect(first.error.length).toBeGreaterThan(0);
        expect(second).toEqual(first);
    });

    it('T2: different seeds give different histories after the first evolve()', () => {
        const one = seededHistory(1, 1);

        expect(seededHistory(2, 1)[0].population).not.toBe(one[0].population);
        expect(seededHistory(0, 1)[0].population).not.toBe(one[0].population);
    });

    it('T3: instances with the same seed are independent when their operations are interleaved', () => {
        const a = createNeat({ seed: 77 });
        const b = createNeat({ seed: 77 });
        const unseeded = createNeat();
        const historyA: Snapshot[] = [];
        const historyB: Snapshot[] = [];
        for (let g = 0; g < 30; g++) {
            historyA.push(step(a));
            step(unseeded);
            historyB.push(step(b));
        }
        const historyC = seededHistory(77);

        expect(historyA).toEqual(historyC);
        expect(historyB).toEqual(historyC);
    });

    it('T4: seed 0 is a valid seed', () => {
        let first: Snapshot[] = [];
        const calls = countMathRandomCalls(() => {
            first = seededHistory(0);
        });

        expect(calls).toBe(0);
        expect(seededHistory(0)).toEqual(first);
        expect(seededHistory(1)[0].population).not.toBe(first[0].population);
    });

    it('T5: structural mutations give the same innovation IDs', () => {
        const params: INeatParams = { seed: 99, PROBABILITY_MUTATE_LINK: 2, PROBABILITY_MUTATE_NODES: 1 };
        const run = () => {
            const neat = createNeat(params);
            evolveHistory(neat, 20);

            return {
                connections: [...neat.allConnections.values()].map(c => [
                    c.innovationNumber,
                    c.from.innovationNumber,
                    c.to.innovationNumber,
                    c.replaceIndex,
                ]),
                nodes: neat.allNodes.size(),
            };
        };
        const first = run();
        const second = run();

        expect(first.nodes).toBeGreaterThan(4 + 1);
        expect(second).toEqual(first);
    });

    it('T6: without a seed, the draws still come from Math.random', () => {
        const variants: Array<INeatParams | undefined> = [
            undefined,
            {},
            { seed: undefined },
            { seed: null as unknown as number },
        ];
        const runs = variants.map(params =>
            withSeededRandom(4242, () => {
                const neat = createNeat(params);
                evolveHistory(neat, 10);

                return populationJson(neat);
            }),
        );

        expect(runs[0].calls).toBeGreaterThan(0);
        for (const run of runs.slice(1)) {
            expect(run).toEqual(runs[0]);
        }
    });

    it('T7: a seeded run makes no Math.random calls and does not replace Math.random', () => {
        const calls = countMathRandomCalls(() => {
            seededHistory(31);
            fitRun(31);
        });

        expect(calls).toBe(0);
        expect(Math.random).toBe(originalRandom);
    });

    it('a seeded run equals an unseeded run with Math.random replaced by the same generator', () => {
        const seeded = evolveHistory(createNeat({ seed: 555 }));
        Math.random = createRng(555);
        let unseeded: Snapshot[];
        try {
            unseeded = evolveHistory(createNeat());
        } finally {
            Math.random = originalRandom;
        }

        expect(unseeded).toEqual(seeded);
    });

    it('the same seed and the same loaded population give identical histories', () => {
        const run = () => {
            const genome = JSON.parse(readFileSync(LOAD_FIXTURE, 'utf8')) as GenomeSaveData;
            const neat = new Neat(
                4,
                1,
                20,
                EActivation.sigmoid,
                EActivation.tanh,
                { LOAD_PERCENT: 0.5, seed: 2024 },
                { genome, evolveCounts: 7 },
            );

            return evolveHistory(neat, 20);
        };

        expect(run()).toEqual(run());
    });

    it('accepts the README example', () => {
        expect(() => new Neat(12, 2, 100, EActivation.sigmoid, EActivation.tanh, { seed: 12345 })).not.toThrow();
    });

    it.each([1.5, NaN, Infinity, -Infinity, 2 ** 53, -(2 ** 53), '1' as unknown as number])('rejects seed %s', seed => {
        expect(() => createNeat({ seed })).toThrow('seed must be a safe integer');
    });

    it.each([-(2 ** 53 - 1), -1, -0, 0, 2 ** 32, 2 ** 53 - 1])('accepts seed %s', seed => {
        expect(() => createNeat({ seed })).not.toThrow();
    });
});
