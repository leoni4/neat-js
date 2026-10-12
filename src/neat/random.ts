// Central random source of a Neat instance.
//
// Without a seed: Math.random, read at each call.
//
// With a seed: sfc32 ("Small Fast Counting" RNG v4, Chris Doty-Humphrey, PractRand).
// - State: three 32-bit words (a, b, c) and a 32-bit counter (128 bits).
// - Period: at least 2^32 for every seed (the counter), about 2^127 on average.
// - Seeding: PractRand sfc32::seed(Uint64): a = 0, b = low 32 bits, c = high 32 bits, counter = 1,
//   then 12 discarded rounds. A negative seed uses its two's-complement 64-bit value, so each safe
//   integer gives a different start state. Seed 0 is valid.
// - Output: one 32-bit word divided by 2^32, so values are in [0, 1) with 2^-32 resolution and never 1.
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

export function createRng(seed?: number): () => number {
    if (seed === undefined) {
        return mathRandom;
    }

    const hi = Math.floor(seed / TWO_POW_32);
    const lo = seed - hi * TWO_POW_32;
    let a = 0;
    let b = lo | 0;
    let c = hi | 0;
    let counter = 1;

    const next32 = (): number => {
        const t = (((a + b) | 0) + counter) | 0;
        counter = (counter + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (((c << 21) | (c >>> 11)) + t) | 0;

        return t >>> 0;
    };

    for (let i = 0; i < 12; i++) {
        next32();
    }

    return () => next32() / TWO_POW_32;
}
