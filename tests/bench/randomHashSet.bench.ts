import { describe, expect, it } from 'vitest';
import { RandomHashSet } from '../../src/dataStructures/randomHashSet.js';
import { NodeGene } from '../../src/genome/nodeGene.js';
import { LegacyRandomHashSet } from '../helpers/legacyRandomHashSet.js';

// Run with `npm run bench`. It is not part of `npm test`, because the 1.3.0 reference needs several seconds per run.
// It builds a set of GENES genes with ascending innovation numbers, as Neat.loadGenome() and the node registry do.
const GENES = 50_000;
const MIN_SPEEDUP = 50;
const LEGACY_RUNS = 3;
const CURRENT_RUNS = 7;

type BuildMethod = 'add' | 'addSorted';
type GeneSet = RandomHashSet | LegacyRandomHashSet;

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);

    return sorted[Math.floor(sorted.length / 2)];
}

function measure(create: () => GeneSet, method: BuildMethod, genes: NodeGene[], runs: number) {
    const times: number[] = [];
    let set = create();
    for (let run = 0; run < runs; run++) {
        set = create();
        const start = performance.now();
        for (const gene of genes) set[method](gene);
        times.push(performance.now() - start);
    }

    return { ms: median(times), set };
}

describe('RandomHashSet benchmark', () => {
    const genes = Array.from({ length: GENES }, (_, i) => new NodeGene(i + 1));

    it.each<BuildMethod>(['add', 'addSorted'])(
        `%s(): building a set of ${GENES} genes is at least ${MIN_SPEEDUP}x faster than 1.3.0`,
        method => {
            measure(() => new RandomHashSet(), method, genes.slice(0, 1000), 3);
            const current = measure(() => new RandomHashSet(), method, genes, CURRENT_RUNS);
            const legacy = measure(() => new LegacyRandomHashSet(), method, genes, LEGACY_RUNS);
            const speedup = legacy.ms / current.ms;

            console.log(
                `${method}(): ${GENES} genes, 1.3.0 ${legacy.ms.toFixed(1)} ms, current ${current.ms.toFixed(2)} ms, ` +
                    `${speedup.toFixed(0)}x (median of ${LEGACY_RUNS} and ${CURRENT_RUNS} runs)`,
            );
            expect(current.set.data.every((gene, i) => gene === legacy.set.data[i])).toBe(true);
            expect(speedup).toBeGreaterThanOrEqual(MIN_SPEEDUP);
        },
        120_000,
    );
});
