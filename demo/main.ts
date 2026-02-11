import { Neat, EActivation, type INeatParams } from '../src/neat/index.js';
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

const doneTimers: number[] = [];
let finished = 0;
let globalFrame: Frame | null = null;
let isTraining = false;

function updateStatus(text: string) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = text;
    }
}

/**
 * Training function using the new .fit() method with visualization support
 */
async function trainWithVisualization(
    neat: Neat,
    xTrain: number[][],
    yTrain: number[][],
    maxEpochs: number,
    frame: Frame | null,
    problemName: string,
): Promise<void> {
    return new Promise(resolve => {
        let epoch = 0;
        const errorThreshold = neat.OPT_ERR_THRESHOLD;

        function runEpoch() {
            // Check if we should restart
            if (shouldRestart || !isTraining) {
                isTraining = false;
                resolve();

                return;
            }

            // Wait for controls to allow proceeding
            if (frame && !frame.controls.proceed) {
                setTimeout(runEpoch, 1);

                return;
            }

            // Evaluate all clients on training data
            let topScore = 0;
            let topClient = neat.clients[0];
            let totalComplexity = 0;

            for (const client of neat.clients) {
                let totalError = 0;
                totalComplexity += client.genome.connections.size() + client.genome.nodes.size();

                // Calculate error for each training sample
                for (let i = 0; i < xTrain.length; i++) {
                    const output = client.calculate(xTrain[i]);
                    const sampleError = output.reduce((sum, val, k) => {
                        return sum + Math.abs(val - yTrain[i][k]);
                    }, 0);
                    totalError += sampleError;
                }

                // Normalize error
                client.error = totalError / (xTrain.length * neat.outputNodes);
                client.score = 1 - client.error;

                if (client.score > topScore) {
                    topScore = client.score;
                    topClient = client;
                }
            }

            const trainError = 1 - topScore;

            // Logging
            if (epoch % 100 === 0 || epoch === 0) {
                console.log('###################');
                neat.printSpecies();
                console.log('--------');
                console.log(
                    'EPOCH:',
                    epoch,
                    '| compAll:',
                    totalComplexity,
                    '| comp:',
                    topClient.genome.connections.size() + topClient.genome.nodes.size(),
                    '| err:',
                    trainError.toFixed(6),
                );
            }

            // Update visualization
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
                text += 'EPOCH: ' + epoch + ' | error: ' + trainError.toFixed(6);
                frame.text = text;
                frame.client = frameClient;
                frame.genome = frameClient.genome;
                updateStatus(`${problemName} - ${text}`);
            }

            // Check stopping conditions
            if (epoch >= maxEpochs || trainError <= errorThreshold) {
                finished += 1;
                console.log('###################');
                console.log('Finished');
                doneTimers.push(epoch);
                if (doneTimers.length > 200) doneTimers.shift();

                if (frame) {
                    const finalText = DA + 'EPOCH: ' + epoch + ' | error: ' + trainError.toFixed(6) + ' ✓ SOLVED';
                    frame.text = finalText;
                    updateStatus(`${problemName} - ${finalText}`);
                    frameClient.genome.optimization();
                    frame.client = frameClient;
                    frame.genome = frameClient.genome;
                }

                // Wait a bit then restart
                setTimeout(() => {
                    if (frame && !frame.controls.proceed) {
                        setTimeout(() => {
                            isTraining = false;
                            resolve();
                            setTimeout(() => main(), 100);
                        }, 1000);
                    } else {
                        isTraining = false;
                        resolve();
                        setTimeout(() => main(), 1000);
                    }
                }, 1000);

                return;
            }

            // Evolve to next generation
            const shouldOptimize = trainError <= neat.OPT_ERR_THRESHOLD;
            neat.evolve(shouldOptimize);
            epoch++;

            // Continue with next epoch
            setTimeout(runEpoch, 1);
        }

        // Start training
        runEpoch();
    });
}

export async function main() {
    // Prevent multiple instances
    if (isTraining) {
        return;
    }

    isTraining = true;
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

    // Initialize frame for visualization
    if (!globalFrame && typeof document !== 'undefined') {
        globalFrame = new Frame(neat.clients[0], 'container');
    }
    const frame = globalFrame;
    if (frame) {
        frame.client = neat.clients[0];
        frame.genome = neat.clients[0].genome;
    }

    // Train with visualization
    await trainWithVisualization(neat, test.input, test.output, Infinity, frame, problemConfig.name);

    if (test.save && neat.champion) {
        localStorage.setItem('network', JSON.stringify(neat.save()));
    }

    isTraining = false;
}

// Initialize problem selector
function initProblemSelector() {
    const selector = document.getElementById('problem-select') as HTMLSelectElement;
    if (selector) {
        selector.addEventListener('change', e => {
            const target = e.target as HTMLSelectElement;
            currentProblem = target.value as keyof typeof PROBLEMS;
            shouldRestart = true;
            isTraining = false;
            updateStatus(`Switching to ${PROBLEMS[currentProblem].name}...`);
        });
    }
}

// Run the demo
if (typeof document !== 'undefined') {
    initProblemSelector();
}
main();
