import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Neat, EActivation } from '../../src/neat/index.js';
import type { GenomeSaveData } from '../../src/genome/index.js';
import { float64Hex, mulberry32, withSeededRandom } from '../helpers/seededRandom.js';

const UPDATE = process.env.UPDATE_GOLDEN === '1';
const GOLDEN_DIR = fileURLToPath(new URL('./', import.meta.url));
const LOAD_FIXTURE = `${GOLDEN_DIR}fixtures/load-genome.json`;

const originalRandom = Math.random;

afterEach(() => {
    expect(Math.random).toBe(originalRandom);
});

interface Fingerprint {
    [field: string]: unknown;
}

function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

function randomVectors(size: number, count: number, seed: number): number[][] {
    const next = mulberry32(seed);

    return Array.from({ length: count }, () => Array.from({ length: size }, () => next() * 2 - 1));
}

function outputBits(calculate: (input: number[]) => number[], inputs: number[][]): string {
    return float64Hex(inputs.flatMap(input => calculate(input)));
}

function fingerprint(neat: Neat, inputSize: number, calls: number, checksum: number): Fingerprint {
    const probes = randomVectors(inputSize, 16, 9001);
    const champion = neat.champion?.client;

    return {
        rngCalls: calls,
        rngChecksum: checksum,
        evolveCounts: neat.evolveCounts,
        pressure: neat.PRESSURE,
        speciesCount: neat['_species'].length,
        cpBits: float64Hex([neat.CP]),
        championOutputs: champion ? outputBits(input => champion.calculate(input), probes) : null,
        clientOutputs: neat.clients.slice(0, 5).map(client => outputBits(input => client.calculate(input), probes)),
        populationSha256: sha256(JSON.stringify(neat.clients.map(client => client.genome.save()))),
        model: neat.model(),
    };
}

function checkGolden(id: string, actual: Fingerprint) {
    const file = `${GOLDEN_DIR}${id}.json`;
    if (UPDATE) {
        writeFileSync(file, `${JSON.stringify(actual, null, 4)}\n`);

        return;
    }
    if (!existsSync(file)) {
        throw new Error(`Golden file ${id}.json is missing. Record it with UPDATE_GOLDEN=1.`);
    }
    const golden = JSON.parse(readFileSync(file, 'utf8')) as Fingerprint;
    expect(Object.keys(actual).sort(), `${id}: fingerprint fields`).toEqual(Object.keys(golden).sort());
    for (const field of Object.keys(golden)) {
        expect(JSON.stringify(actual[field]), `${id}: field "${field}" differs`).toBe(JSON.stringify(golden[field]));
    }
}

function scoreByTarget(neat: Neat, inputs: number[][], targets: number[]) {
    for (const client of neat.clients) {
        let error = 0;
        for (let i = 0; i < inputs.length; i++) {
            error += Math.abs(client.calculate(inputs[i])[0] - targets[i]);
        }
        client.error = error / inputs.length;
        client.score = 1 - client.error;
    }
}

const SMALL_INPUTS = randomVectors(4, 8, 1101);
const SMALL_TARGETS = SMALL_INPUTS.map(x => 1 / (1 + Math.exp(-(0.8 * x[0] - 0.5 * x[1] + 0.3 * x[2] - 0.2 * x[3]))));

function runSmall(neat: Neat, generations: number) {
    for (let g = 0; g < generations; g++) {
        scoreByTarget(neat, SMALL_INPUTS, SMALL_TARGETS);
        neat.evolve();
    }
}

const TYPICAL_PARAMS = { PERMANENT_MAIN_CONNECTIONS: false };

function runTypical(seed: number) {
    const data = mulberry32(1102);
    const relevant = Array.from({ length: 12 }, (_, i) => (i * 7) % 85);
    const weights = relevant.map(() => (data() * 2 - 1) * 0.6);
    const target = (x: number[]) => Math.tanh(relevant.reduce((sum, k, j) => sum + weights[j] * x[k], 0));

    return withSeededRandom(seed, () => {
        const neat = new Neat(85, 1, 100, EActivation.tanh, EActivation.tanh, TYPICAL_PARAMS);
        for (let g = 0; g < 30; g++) {
            const inputs = Array.from({ length: 6 }, () => Array.from({ length: 85 }, () => data() * 2 - 1));
            scoreByTarget(neat, inputs, inputs.map(target));
            neat.evolve();
        }

        return neat;
    });
}

let typicalRun: ReturnType<typeof runTypical> | null = null;
function getTypicalRun() {
    typicalRun ??= runTypical(102);

    return typicalRun;
}

describe('golden determinism fingerprints', () => {
    it('G1-fresh-small', () => {
        const run = withSeededRandom(101, () => {
            const neat = new Neat(4, 1, 30, EActivation.sigmoid, EActivation.tanh);
            runSmall(neat, 60);

            return neat;
        });
        if (UPDATE && !existsSync(LOAD_FIXTURE)) {
            mkdirSync(`${GOLDEN_DIR}fixtures`, { recursive: true });
            writeFileSync(LOAD_FIXTURE, `${JSON.stringify(run.result.model(), null, 4)}\n`);
        }
        checkGolden('G1-fresh-small', fingerprint(run.result, 4, run.calls, run.checksum));
    });

    it('G2-fresh-typical', () => {
        const run = getTypicalRun();
        checkGolden('G2-fresh-typical', fingerprint(run.result, 85, run.calls, run.checksum));
    });

    it('G3-load', () => {
        if (!existsSync(LOAD_FIXTURE)) {
            throw new Error('Load fixture is missing. Record it with UPDATE_GOLDEN=1 (from G1).');
        }
        const genome = JSON.parse(readFileSync(LOAD_FIXTURE, 'utf8')) as GenomeSaveData;
        const run = withSeededRandom(103, () => {
            const neat = new Neat(
                4,
                1,
                20,
                EActivation.sigmoid,
                EActivation.tanh,
                { LOAD_PERCENT: 0.5 },
                { genome, evolveCounts: 7 },
            );
            runSmall(neat, 20);

            return neat;
        });
        checkGolden('G3-load', fingerprint(run.result, 4, run.calls, run.checksum));
    });

    it('G4-stagnation', () => {
        const pressuresSeen: string[] = [];
        let eliteReinsertions = 0;
        let previousChampion: Neat['champion'] = null;
        let previousEpoch = 0;
        const run = withSeededRandom(104, () => {
            const neat = new Neat(4, 1, 8, EActivation.sigmoid, EActivation.tanh);
            for (let g = 0; g < 430; g++) {
                neat.clients.forEach((client, i) => {
                    client.score = g === 0 && i === 0 ? 1 : 0.5;
                    client.error = 0.5;
                });
                neat.evolve();
                if (!pressuresSeen.includes(neat.PRESSURE)) pressuresSeen.push(neat.PRESSURE);
                const champion = neat.champion;
                if (champion && champion === previousChampion && champion.epoch < previousEpoch) eliteReinsertions++;
                previousChampion = champion;
                previousEpoch = champion?.epoch ?? 0;
            }

            return neat;
        });
        expect(pressuresSeen).toEqual(expect.arrayContaining(['BOOST', 'ESCAPE', 'PANIC']));
        expect(eliteReinsertions).toBeGreaterThan(0);
        checkGolden('G4-stagnation', {
            ...fingerprint(run.result, 4, run.calls, run.checksum),
            pressuresSeen,
            eliteReinsertions,
        });
    });

    it('G5-round-trip', () => {
        const source = getTypicalRun().result;
        expect(source.champion).not.toBeNull();
        const probes = randomVectors(85, 64, 9005);
        const run = withSeededRandom(105, () => {
            const saved = source.model();
            const loaded = new Neat(85, 1, 1, EActivation.tanh, EActivation.tanh, TYPICAL_PARAMS, {
                genome: saved,
                evolveCounts: source.evolveCounts,
            });
            const expected = probes.map(input => source.calculate(input));
            const actual = probes.map(input => loaded.clients[0].calculate(input));

            return { saved, loaded, expected, actual };
        });
        const { saved, loaded, expected, actual } = run.result;

        expect(actual.length).toBe(expected.length);
        actual.forEach((output, i) => {
            expect(output.length).toBe(expected[i].length);
            output.forEach((value, j) => {
                expect(Object.is(value, expected[i][j]), `output ${i}/${j}: ${value} vs ${expected[i][j]}`).toBe(true);
            });
        });
        expect(loaded.model()).toEqual(saved);
        checkGolden('G5-round-trip', {
            rngCalls: run.calls,
            outputs: float64Hex(actual.flat()),
            modelSha256: sha256(JSON.stringify(saved)),
        });
    });
});
