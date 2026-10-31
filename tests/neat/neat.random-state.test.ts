import { describe, expect, it } from 'vitest';
import { Neat, EActivation, Client } from '../../src/neat/index.js';
import type { NeatRandomState } from '../../src/index.js';
import { float64Hex, mulberry32, withRandomValues } from '../helpers/seededRandom.js';

const SEEDS = [0, 1, 42, -1, Number.MAX_SAFE_INTEGER];
const OTHER_SEED = 987654321;

const DATA = mulberry32(3301);
const PROBES = Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => DATA() * 2 - 1));

function createNeat(seed?: number): Neat {
    return new Neat(4, 2, 10, EActivation.sigmoid, EActivation.tanh, seed === undefined ? undefined : { seed });
}

function take(rng: () => number, count: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
        values.push(rng());
    }

    return values;
}

function viaJson(state: NeatRandomState): NeatRandomState {
    return JSON.parse(JSON.stringify(state));
}

// The offspring workflow of a caller that never calls evolve(): a lineage in which each child copies the
// genome of the previous one and mutates it.
function breed(neat: Neat, parent: Client, count: number): Client[] {
    const offspring: Client[] = [];
    for (let i = 0; i < count; i++) {
        const child = new Client(neat.loadGenome(parent.genome.save()), EActivation.sigmoid, EActivation.tanh);
        child.mutate(true);
        offspring.push(child);
        parent = child;
    }

    return offspring;
}

function fingerprint(offspring: Client[]) {
    return {
        genomes: offspring.map(child => child.genome.save()),
        outputs: offspring.map(child => float64Hex(PROBES.flatMap(input => child.calculate(input)))),
    };
}

describe('Neat random state', () => {
    describe('round trip of the stream', () => {
        it.each(SEEDS.flatMap(seed => [0, 1, 1000, 100000].map(draws => [seed, draws])))(
            'seed %s after %s draws: a restored instance gives the same next 10000 draws',
            (seed, draws) => {
                const source = createNeat(seed);
                take(source.rng, draws);
                const target = createNeat(OTHER_SEED);
                take(target.rng, 123);

                target.restoreRandomState(viaJson(source.randomState()));

                expect(take(target.rng, 10000)).toEqual(take(source.rng, 10000));
            },
        );

        it('randomState() gives the four words as unsigned 32-bit integers', () => {
            const words: number[] = [];
            for (const seed of SEEDS) {
                const neat = createNeat(seed);
                take(neat.rng, 1000);
                const state = neat.randomState();

                expect(Object.keys(state).sort()).toEqual(['a', 'algorithm', 'b', 'c', 'counter']);
                expect(state.algorithm).toBe('sfc32');
                // The counter starts at 1 and counts the 12 discarded seeding rounds and each draw.
                expect(state.counter).toBe(1 + 12 + 1000);
                expect(viaJson(state)).toEqual(state);
                words.push(state.a, state.b, state.c, state.counter);
            }

            expect(words.every(word => Number.isInteger(word) && word >= 0 && word <= 2 ** 32 - 1)).toBe(true);
            expect(words.some(word => word > 2 ** 31 - 1)).toBe(true);
        });
    });

    it('a restored mutation workflow gives the same offspring as the run without a save', () => {
        const start = () => {
            const neat = createNeat(42);

            return { neat, first: breed(neat, neat.clients[0], 300) };
        };
        const continueRun = (run: ReturnType<typeof start>) => breed(run.neat, run.first[run.first.length - 1], 300);
        const reference = start();
        const a = start();
        const b = start();
        const control = start();
        take(b.neat.rng, 1000);
        take(control.neat.rng, 1000);
        expect(fingerprint(b.first)).toEqual(fingerprint(a.first));
        expect(b.neat.randomState()).not.toEqual(a.neat.randomState());

        b.neat.restoreRandomState(viaJson(a.neat.randomState()));

        const second = continueRun(a);
        expect(fingerprint(second)).toEqual(fingerprint(continueRun(reference)));
        expect(fingerprint(continueRun(b))).toEqual(fingerprint(second));
        expect([...b.neat.allConnections.keys()]).toEqual([...a.neat.allConnections.keys()]);
        expect(fingerprint(continueRun(control))).not.toEqual(fingerprint(second));
        expect(second[second.length - 1].genome.connections.size()).toBeGreaterThan(1);
    });

    it('a reference to neat.rng taken before restoreRandomState() follows the restored state', () => {
        const source = createNeat(1);
        take(source.rng, 50);
        const state = source.randomState();
        const expected = take(source.rng, 100);
        const target = createNeat(2);
        const rng = target.rng;
        take(rng, 30);

        target.restoreRandomState(state);

        expect(target.rng).toBe(rng);
        expect(take(rng, 100)).toEqual(expected);
    });

    it('randomState() takes no draw and returns a new object at each call', () => {
        const first = createNeat(42);
        const second = createNeat(42);
        take(first.rng, 5);
        take(second.rng, 5);

        const { result: states } = withRandomValues([], () => Array.from({ length: 10 }, () => first.randomState()));

        expect(take(first.rng, 1000)).toEqual(take(second.rng, 1000));
        expect(new Set(states).size).toBe(10);
        for (const state of states) {
            expect(state).toEqual(states[0]);
        }
    });

    describe('restoreRandomState() with invalid input', () => {
        // Valid values from another instance: a partial write of them would change the state.
        const valid = createNeat(7).randomState();
        const withField = (field: string, value: unknown) => ({ ...valid, [field]: value });
        const withoutField = (field: string) =>
            Object.fromEntries(Object.entries(valid).filter(([key]) => key !== field));
        const badWords: Array<[string, unknown]> = [
            ['-1', -1],
            ['2 ** 32', 2 ** 32],
            ['1.5', 1.5],
            ['NaN', NaN],
            ['Infinity', Infinity],
            ['a string', '5'],
            ['null', null],
        ];
        const cases: Array<[string, unknown, RegExp]> = [
            ['null', null, /plain object/],
            ['a JSON string', JSON.stringify(valid), /plain object/],
            ['an array', [], /plain object/],
            ['no "algorithm"', withoutField('algorithm'), /"algorithm"/],
            ['another "algorithm"', withField('algorithm', 'xorshift128'), /"algorithm"/],
        ];
        for (const field of ['a', 'b', 'c', 'counter']) {
            const message = new RegExp(`"${field}"`);
            cases.push([`no "${field}"`, withoutField(field), message]);
            for (const [name, value] of badWords) {
                cases.push([`"${field}" = ${name}`, withField(field, value), message]);
            }
        }

        it.each(cases)('throws for %s and keeps the current state', (_name, input, message) => {
            const neat = createNeat(42);
            const twin = createNeat(42);
            take(neat.rng, 10);
            take(twin.rng, 10);
            const before = neat.randomState();

            expect(() => neat.restoreRandomState(input as NeatRandomState)).toThrow(message);

            expect(neat.randomState()).toEqual(before);
            expect(take(neat.rng, 100)).toEqual(take(twin.rng, 100));
        });
    });

    describe('without a seed', () => {
        it('both methods throw, and rng still reads Math.random at each call', () => {
            const neat = createNeat();
            const state = createNeat(42).randomState();

            expect(() => neat.randomState()).toThrow('randomState() needs a Neat instance with a seed');
            expect(() => neat.restoreRandomState(state)).toThrow(
                'restoreRandomState() needs a Neat instance with a seed',
            );

            const { result, calls } = withRandomValues([0.25, 0.75], () => [neat.rng(), neat.rng()]);
            expect(result).toEqual([0.25, 0.75]);
            expect(calls).toBe(2);
        });
    });
});
