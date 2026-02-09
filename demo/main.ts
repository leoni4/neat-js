import { Client, Neat, EActivation, type INeatParams } from '../src/neat/index.js';
import { Frame } from './visual/frame.js';
import {
    testXOR,
    testXNOR,
    testAND_OR,
    testParity3,
    testCircle,
    testTwoMoons,
    testSin01,
    testParity5,
    testMajority7,
    testRings,
    testWaveMix01,
} from './problems.js';

// Problem catalog
const PROBLEMS = {
    XOR: { name: 'XOR Gate', test: testXOR },
    XNOR: { name: 'XNOR Gate', test: testXNOR },
    AND_OR: { name: 'AND & OR Gates', test: testAND_OR },
    Parity3: { name: 'Parity-3', test: testParity3 },
    Parity5: { name: 'Parity-5', test: testParity5 },
    Majority7: { name: 'Majority-7', test: testMajority7 },
    Circle: { name: 'Circle Classification', test: testCircle },
    TwoMoons: { name: 'Two Moons', test: testTwoMoons },
    Rings: { name: 'Rings Classification', test: testRings },
    Sin01: { name: 'Sine Wave [0,1]', test: testSin01 },
    WaveMix01: { name: 'Wave Mix [0,1]', test: testWaveMix01 },
};

const params = {
    // CP: 0.5,
    // MUTATION_RATE: 2,
    // PROBABILITY_MUTATE_WEIGHT_SHIFT: 6 * 2,
    // WEIGHT_SHIFT_STRENGTH: 5,
    // BIAS_SHIFT_STRENGTH: 1,
    // etc
} as INeatParams;

let currentProblem: keyof typeof PROBLEMS = 'XOR';
let shouldRestart = false;
let currentTimeout: number | null = null;

const doneTimers: number[] = [];
let finished = 0;
let globalFrame: Frame | null = null;

function updateStatus(text: string) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = text;
    }
}

export function main() {
    // Stop any running evolution
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }

    shouldRestart = false;

    const problemConfig = PROBLEMS[currentProblem];
    const test = {
        ...problemConfig.test,
        save: false,
        load: false,
        clients: 1000,
        params,
    };

    updateStatus(`Starting evolution for ${problemConfig.name}...`);

    let network;
    if (test.load) {
        const net = localStorage.getItem('network');
        if (net) {
            console.log('loading network');
            network = JSON.parse(net);
        }
    }
    const neat: Neat = new Neat(
        test.input[0].length,
        test.output[0].length,
        test.clients || 100,
        EActivation.sigmoid,
        EActivation.tanh,
        test.params,
        network,
    );

    if (!globalFrame && typeof document !== 'undefined') {
        globalFrame = new Frame(neat.clients[0], 'container');
    }
    const frame = globalFrame;
    if (frame) {
        frame.client = neat.clients[0];
        frame.genome = neat.clients[0].genome;
    }
    let k = 0;
    let error = 1;
    const epochs = 1 / 0;

    currentTimeout = setTimeout(function run() {
        // Check if we should restart with a new problem
        if (shouldRestart) {
            updateStatus('Restarting with new problem...');
            main();

            return;
        }

        if (!frame?.controls.proceed) {
            currentTimeout = setTimeout(run, 1);

            return;
        }
        //  console.time('run()');
        let topScore = 0;
        let topClient: Client = neat.clients[0];
        let localError = 0;
        let complexity = 0;
        for (let i = 0; i < neat.clients.length; i += 1) {
            const c = neat.clients[i];
            complexity += c.genome.connections.size() + c.genome.nodes.size();
            localError = 0;
            test.input.forEach((inp: Array<number>, i: number) => {
                const out = c.calculate(inp);
                const outError = out.reduce((comp, val, k) => {
                    return comp + Math.abs(val - test.output[i][k]);
                }, 0);
                localError += outError;
            });
            c.error = localError / 4;
            c.score = 1 - c.error;
            if (c.score > topScore) {
                topScore = c.score;
                topClient = c;
            }
        }
        error = 1 - topScore;
        if (k % 100 === 0 || k > epochs || error === 0) {
            console.log('###################');
            neat.printSpecies();
            console.log('--------');
            console.log(
                'EPOCH:',
                k,
                '| compAll:',
                complexity,
                '| comp:',
                topClient.genome.connections.size() + topClient.genome.nodes.size(),
                '| err:',
                error,
            );
        }
        const champion = neat.champion?.client;
        const frameClient = champion || topClient;
        let DA = '';
        if (doneTimers.length) {
            DA =
                '(D:' +
                finished +
                ' AvgE: ' +
                Math.floor(doneTimers.reduce((a, b) => a + b, 0) / doneTimers.length) +
                ' ) ';
        }
        if (frame) {
            let text = '';
            if (doneTimers.length) {
                text += DA;
            }
            text += 'EPOCH: ' + k + ' | error: ' + error.toFixed(6);
            frame.text = text;
            frame.client = frameClient;
            frame.genome = frameClient.genome;
            updateStatus(`${problemConfig.name} - ${text}`);
        }
        if (k > epochs || error <= neat.OPT_ERR_THRESHOLD) {
            finished += 1;
            console.log('###################');
            console.log('Finished');
            doneTimers.push(k);
            if (doneTimers.length > 200) doneTimers.shift();
            if (frame) {
                const finalText = DA + 'EPOCH: ' + k + ' | error: ' + error.toFixed(6) + ' ✓ SOLVED';
                frame.text = finalText;
                updateStatus(`${problemConfig.name} - ${finalText}`);
                frameClient.genome.optimization();
                frame.client = frameClient;
                frame.genome = frameClient.genome;
            }
            if (test.save) {
                localStorage.setItem('network', JSON.stringify(neat.save()));
            }
            currentTimeout = setTimeout(() => {
                error = 1;
                main();
            }, 1000);

            return;
        }
        k++;
        neat.evolve(error <= neat.OPT_ERR_THRESHOLD);
        // console.timeEnd('run()');
        currentTimeout = setTimeout(run, 1);
    }, 1);
}

// Initialize problem selector
function initProblemSelector() {
    const selector = document.getElementById('problem-select') as HTMLSelectElement;
    if (selector) {
        selector.addEventListener('change', e => {
            const target = e.target as HTMLSelectElement;
            currentProblem = target.value as keyof typeof PROBLEMS;
            shouldRestart = true;
            updateStatus(`Switching to ${PROBLEMS[currentProblem].name}...`);
        });
    }
}

// Run the demo
if (typeof document !== 'undefined') {
    initProblemSelector();
}
main();
