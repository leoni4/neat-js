import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { Neat, EActivation, Client } from '../../src/neat/index.js';
import type { GenomeSaveData } from '../../src/genome/index.js';
import { float64Hex, mulberry32, withRandomValues, withSeededRandom } from '../helpers/seededRandom.js';

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

const SEEDS = [0, 1, 42, -1, Number.MAX_SAFE_INTEGER];

const LONG_INPUTS = 6;
const LONG_OUTPUTS = 2;
const LONG_CLIENTS = 30;
const LONG_PARAMS = { PROBABILITY_MUTATE_NODES: 0.3, PROBABILITY_MUTATE_LINK: 0.5 };

// G8 was recorded with the 1.3.0 source (tag v1.3.0) as the reference for 1.3.x performance work. It runs 300
// seeded generations with a model() save and load between them. Each trail entry hashes the exact JSON bytes of
// all genome.save() data and the float64 bits of all outputs of one generation (the full final population is
// about 280 KB, so the file keeps the full JSON only for the two models). Do not re-record it for a
// performance-only change.
function runLongEvolution() {
    const data = mulberry32(1311);
    const samples = Array.from({ length: 12 }, () => Array.from({ length: LONG_INPUTS }, () => data() * 2 - 1));
    const targets = samples.map(x => [Math.tanh(x[0] - 0.5 * x[1] + x[2] * x[3]), Math.tanh(x[4] * x[5] - 0.3 * x[0])]);
    const probes = randomVectors(LONG_INPUTS, 8, 9008);
    const clientOutputs = (neat: Neat) =>
        neat.clients.map(client => outputBits(input => client.calculate(input), probes));
    const populationJson = (neat: Neat) => JSON.stringify(neat.clients.map(client => client.genome.save()));
    const trail: string[] = [];

    const generation = (neat: Neat, g: number) => {
        neat.clients.forEach((client, i) => {
            let error = 0;
            samples.forEach((x, k) => {
                const output = client.calculate(x);
                error += Math.abs(output[0] - targets[k][0]) + Math.abs(output[1] - targets[k][1]);
            });
            error /= samples.length * LONG_OUTPUTS;
            // An error below OPT_ERR_THRESHOLD starts self-optimization, so that genes are also removed.
            client.error = (i + g) % 7 === 0 ? 0.001 : error;
            client.score = 1 - error;
        });
        neat.evolve();
        trail.push(
            `${sha256(populationJson(neat)).slice(0, 16)} ${sha256(clientOutputs(neat).join('|')).slice(0, 16)}`,
        );
    };

    const first = new Neat(LONG_INPUTS, LONG_OUTPUTS, LONG_CLIENTS, EActivation.tanh, EActivation.tanh, {
        ...LONG_PARAMS,
        seed: 1301,
    });
    for (let g = 0; g < 200; g++) generation(first, g);
    const firstModel = first.model();

    const second = new Neat(
        LONG_INPUTS,
        LONG_OUTPUTS,
        LONG_CLIENTS,
        EActivation.tanh,
        EActivation.tanh,
        { ...LONG_PARAMS, seed: 1302, LOAD_PERCENT: 0.5 },
        { genome: firstModel, evolveCounts: first.evolveCounts },
    );
    for (let g = 0; g < 100; g++) generation(second, g);
    const champion = second.champion?.client;

    return {
        trail,
        firstModel,
        firstRandomState: first.randomState(),
        evolveCounts: second.evolveCounts,
        registry: { nodes: second.allNodes.size(), connections: second.allConnections.size },
        championOutputs: champion ? outputBits(input => champion.calculate(input), probes) : null,
        clientOutputs: clientOutputs(second),
        model: second.model(),
        populationSha256: sha256(populationJson(second)),
        randomState: second.randomState(),
    };
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

    // G6 and G7 pin the seeded (sfc32) path. withRandomValues([]) throws on any Math.random call.
    it('G6-seeded-draws', () => {
        const { result } = withRandomValues([], () =>
            SEEDS.map(seed => {
                const neat = new Neat(4, 1, 30, EActivation.sigmoid, EActivation.tanh, { seed });

                return Array.from({ length: 64 }, () => neat.rng());
            }),
        );
        checkGolden('G6-seeded-draws', Object.fromEntries(SEEDS.map((seed, i) => [`seed ${seed}`, result[i]])));
    });

    it('G7-seeded-offspring', () => {
        const probes = randomVectors(4, 16, 9007);
        const { result } = withRandomValues([], () => {
            const neat = new Neat(4, 2, 10, EActivation.sigmoid, EActivation.tanh, { seed: 42 });
            const offspring: Client[] = [];
            let parent = neat.clients[0];
            for (let i = 0; i < 200; i++) {
                const child = new Client(neat.loadGenome(parent.genome.save()), EActivation.sigmoid, EActivation.tanh);
                child.mutate(true);
                offspring.push(child);
                parent = child;
            }
            const last = offspring.slice(-3);

            return {
                offspringSha256: sha256(JSON.stringify(offspring.map(child => child.genome.save()))),
                lastGenomes: last.map(child => child.genome.save()),
                lastOutputs: last.map(child => outputBits(input => child.calculate(input), probes)),
                connections: neat.allConnections.size,
                nodes: neat.allNodes.size(),
                nextDraws: Array.from({ length: 4 }, () => neat.rng()),
            };
        });

        expect(result.nodes).toBeGreaterThan(4 + 2);
        checkGolden('G7-seeded-offspring', result);
    });

    it('G8-long-evolution', () => {
        const { result } = withRandomValues([], runLongEvolution);

        expect(result.trail).toHaveLength(300);
        checkGolden('G8-long-evolution', result);
    });
});
