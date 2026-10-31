// Central random source of a Neat instance.
//
// Without a seed: Math.random, read at each call.
//
// With a seed: sfc32 ("Small Fast Counting" RNG v4, Chris Doty-Humphrey, PractRand).
// - State: three 32-bit words (a, b, c) and a 32-bit counter (128 bits). Each 128-bit value is a valid state.
// - Period: at least 2^32 for every seed (the counter), about 2^127 on average.
// - Seeding: PractRand sfc32::seed(Uint64): a = 0, b = low 32 bits, c = high 32 bits, counter = 1,
//   then 12 discarded rounds. A negative seed uses its two's-complement 64-bit value, so each safe
//   integer gives a different start state. Seed 0 is valid.
// - Output: one 32-bit word divided by 2^32, so values are in [0, 1) with 2^-32 resolution and never 1.
// - Save and restore: SeededRandom.state() and restore() read and set the four words without a draw
//   (Neat.randomState() and Neat.restoreRandomState()).
//
// Precondition: `seed` is undefined or a safe integer. Neat.validateConfiguration() checks user input.
//
// The seeded sequences are a compatibility surface: a change of the algorithm, the seeding, or the
// output conversion changes all seeded results. The same seed gives the same results only with the
// same configuration, the same library version, and the same sequence of operations.

// Reads Math.random at each call; do not replace with a captured `Math.random` reference.
// Tests and callers replace Math.random after construction and expect it to control the draws.
export const mathRandom = (): number => Math.random();

const TWO_POW_32 = 4294967296;
const MAX_UINT32 = 4294967295;

export interface NeatRandomState {
    readonly algorithm: 'sfc32';
    readonly a: number;
    readonly b: number;
    readonly c: number;
    readonly counter: number;
}

// The words are fields of this object, not closure variables, so restore() changes the next draws of the
// existing `rng` function object. The fields keep int32 values, as the draw stores them.
export class SeededRandom {
    readonly rng: () => number;

    private _a: number;
    private _b: number;
    private _c: number;
    private _counter: number;

    constructor(seed: number) {
        const hi = Math.floor(seed / TWO_POW_32);
        const lo = seed - hi * TWO_POW_32;
        this._a = 0;
        this._b = lo | 0;
        this._c = hi | 0;
        this._counter = 1;

        for (let i = 0; i < 12; i++) {
            this.next32();
        }

        this.rng = () => this.next32() / TWO_POW_32;
    }

    state(): NeatRandomState {
        return {
            algorithm: 'sfc32',
            a: this._a >>> 0,
            b: this._b >>> 0,
            c: this._c >>> 0,
            counter: this._counter >>> 0,
        };
    }

    // The state usually comes from JSON.parse(), so its static type is not a guarantee.
    // All fields are checked before the first write: invalid input keeps the current state.
    restore(state: unknown): void {
        if (typeof state !== 'object' || state === null || Array.isArray(state)) {
            throw new Error(`Invalid random state: expected a plain object (got ${describeValue(state)})`);
        }

        const { algorithm, a, b, c, counter } = state as Partial<Record<keyof NeatRandomState, unknown>>;
        if (algorithm !== 'sfc32') {
            throw new Error(`Invalid random state: "algorithm" must be 'sfc32' (got ${describeValue(algorithm)})`);
        }
        checkWord('a', a);
        checkWord('b', b);
        checkWord('c', c);
        checkWord('counter', counter);

        this._a = a | 0;
        this._b = b | 0;
        this._c = c | 0;
        this._counter = counter | 0;
    }

    private next32(): number {
        const t = (((this._a + this._b) | 0) + this._counter) | 0;
        this._counter = (this._counter + 1) | 0;
        this._a = this._b ^ (this._b >>> 9);
        this._b = (this._c + (this._c << 3)) | 0;
        this._c = (((this._c << 21) | (this._c >>> 11)) + t) | 0;

        return t >>> 0;
    }
}

function checkWord(name: string, value: unknown): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_UINT32) {
        throw new Error(
            `Invalid random state: "${name}" must be an integer in [0, ${MAX_UINT32}] (got ${describeValue(value)})`,
        );
    }
}

// Does not call toString() of the value: an object without a prototype has none.
function describeValue(value: unknown): string {
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    return value === null ? 'null' : typeof value;
}

export function createRng(seed?: number): () => number {
    if (seed === undefined) {
        return mathRandom;
    }

    return new SeededRandom(seed).rng;
}
