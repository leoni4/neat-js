import { describe, it, expect } from 'vitest';
import { createRng, mathRandom } from '../../src/neat/random.js';
import { withRandomValues } from '../helpers/seededRandom.js';

function take(rng: () => number, count: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
        values.push(rng());
    }

    return values;
}

describe('createRng', () => {
    describe('without a seed', () => {
        it('returns mathRandom', () => {
            expect(createRng()).toBe(mathRandom);
            expect(createRng(undefined)).toBe(mathRandom);
        });

        it('reads Math.random at call time', () => {
            const rng = createRng();
            const { result, calls } = withRandomValues([0.25, 0.75], () => [rng(), rng()]);

            expect(result).toEqual([0.25, 0.75]);
            expect(calls).toBe(2);
        });
    });

    describe('with a seed (sfc32)', () => {
        it('gives the same first 1000 values for the same seed', () => {
            expect(take(createRng(42), 1000)).toEqual(take(createRng(42), 1000));
        });

        // Regression vectors: a change here changes every seeded result.
        it('gives the pinned first values for seed 0', () => {
            expect(take(createRng(0), 5)).toEqual([
                0.317481443984434, 0.03381406492553651, 0.1883028249721974, 0.9817317202687263, 0.22070574038662016,
            ]);
        });

        it('gives the pinned first values for seed 12345', () => {
            expect(take(createRng(12345), 5)).toEqual([
                0.05475259153172374, 0.6908693264704198, 0.0270482765045017, 0.6710935623850673, 0.08442549058236182,
            ]);
        });

        it.each([
            [0, 1],
            [1, 2],
            [-1, 4294967295],
            [4294967296, 0],
            [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER],
        ])('gives different first values for seeds %d and %d', (seedA, seedB) => {
            expect(createRng(seedA)()).not.toBe(createRng(seedB)());
        });

        it('gives values in [0, 1) that are not constant for seed 0', () => {
            const values = take(createRng(0), 100000);
            const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

            expect(values.every(v => v >= 0 && v < 1)).toBe(true);
            expect(new Set(values).size).toBeGreaterThan(1);
            expect(mean).toBeGreaterThan(0.49);
            expect(mean).toBeLessThan(0.51);
        });

        it('never gives 1 or a negative value in 1e6 draws', () => {
            const rng = createRng(7);
            let min = 1;
            let max = 0;
            for (let i = 0; i < 1000000; i++) {
                const v = rng();
                if (v < min) min = v;
                if (v > max) max = v;
            }

            expect(min).toBeGreaterThanOrEqual(0);
            expect(max).toBeLessThan(1);
        });

        it('keeps independent state for generators with the same seed', () => {
            const expected = take(createRng(99), 200);
            const first = createRng(99);
            const second = createRng(99);
            const fromFirst: number[] = [];
            const fromSecond: number[] = [];
            for (let i = 0; i < 200; i++) {
                fromFirst.push(first());
                if (i % 3 === 0) {
                    fromSecond.push(second(), second());
                }
            }
            fromSecond.push(...take(second, 200 - fromSecond.length));

            expect(fromFirst).toEqual(expected);
            expect(fromSecond).toEqual(expected);
        });

        it('does not read Math.random', () => {
            const rng = createRng(0);
            const { calls } = withRandomValues([], () => take(rng, 10));

            expect(calls).toBe(0);
        });
    });
});
