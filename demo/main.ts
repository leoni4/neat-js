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
    XOR: {
        name: 'XOR Gate',
        test: testXOR,
        description:
            'The XOR (exclusive OR) problem is a classic non-linearly separable binary classification task. The network must output 1 when inputs differ (0,1 or 1,0) and 0 when inputs are the same (0,0 or 1,1). This problem cannot be solved by a single-layer perceptron and requires hidden neurons, making it a fundamental benchmark for neural network evolution.',
    },
    XNOR: {
        name: 'XNOR Gate',
        test: testXNOR,
        description:
            'The XNOR (exclusive NOR) problem is the inverse of XOR. The network must output 1 when both inputs are the same (0,0 or 1,1) and 0 when they differ (0,1 or 1,0). Like XOR, this is a non-linearly separable problem that tests the ability of NEAT to evolve networks with hidden layers and complex decision boundaries.',
    },
    AND_OR: {
        name: 'AND & OR Gates',
        test: testAND_OR,
        description:
            'This multi-output problem requires the network to simultaneously compute both AND and OR logic gates. The first output should be the AND operation (1 only when both inputs are 1), while the second output should be the OR operation (1 when at least one input is 1). This tests the ability to learn multiple related functions with shared inputs.',
    },
    Parity3: {
        name: 'Parity-3',
        test: testParity3,
        description:
            "The 3-bit parity problem requires the network to output 1 if an odd number of input bits are 1, and 0 otherwise. With 3 inputs and 8 possible combinations, this problem tests the network's ability to detect patterns across multiple inputs. Parity problems are notoriously difficult because they require fully connected networks with no shortcuts.",
    },
    Parity5: {
        name: 'Parity-5',
        test: testParity5,
        description:
            'The 5-bit parity problem is a significantly harder version requiring the network to count odd vs even number of 1s across 5 inputs (32 possible combinations). This is one of the most challenging benchmark problems for neural evolution, as it requires complex hidden representations and cannot be solved with simple pattern matching.',
    },
    Majority7: {
        name: 'Majority-7',
        test: testMajority7,
        description:
            "The 7-bit majority function requires the network to output 1 when at least 4 out of 7 inputs are 1, and 0 otherwise. With 128 possible input combinations, this tests the network's ability to perform counting or aggregation operations. It's easier than parity but still requires non-trivial hidden representations.",
    },
    Circle: {
        name: 'Circle Classification',
        test: testCircle,
        description:
            "A 2D geometric classification problem where the network must classify points as inside or outside a circle centered at the origin. Points within radius ~0.5 are labeled as class 1, while points farther away are class 0. This tests the network's ability to learn radial decision boundaries in continuous input space.",
    },
    TwoMoons: {
        name: 'Two Moons',
        test: testTwoMoons,
        description:
            'A classic non-linear classification problem with two crescent-shaped (moon-shaped) classes in 2D space. The upper crescent belongs to one class, while the lower crescent belongs to another. This challenging problem requires the network to learn complex curved decision boundaries that cannot be represented by simple linear separation.',
    },
    Rings: {
        name: 'Rings Classification',
        test: testRings,
        description:
            'A concentric rings classification problem where points are labeled based on their distance from the origin. Points in the inner ring (near origin) and outer ring (far from origin) belong to class 1, while points in the middle ring belong to class 0. This tests the ability to learn multiple radial decision boundaries.',
    },
    Sin01: {
        name: 'Sine Wave [0,1]',
        test: testSin01,
        description:
            'A function approximation problem where the network must learn to approximate the sine function over the range [-π, +π], with outputs normalized to [0, 1]. The network receives an angle as input and must output the corresponding sine value. This tests the ability to approximate smooth continuous functions.',
    },
    WaveMix01: {
        name: 'Wave Mix [0,1]',
        test: testWaveMix01,
        description:
            "A complex function approximation problem combining multiple sine waves: f(x) = sin(3x) + 0.3·sin(9x), normalized to [0, 1]. This creates a more intricate pattern with multiple frequencies, testing the network's ability to approximate non-trivial continuous functions with higher-frequency components.",
    },
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

function updateProblemDescription(problemKey: keyof typeof PROBLEMS) {
    const descriptionEl = document.getElementById('problem-description-text');
    if (descriptionEl) {
        descriptionEl.textContent = PROBLEMS[problemKey].description;
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
                setTimeout(() => main(), 1);

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
                frame.client = topClient;
                frame.genome = topClient.genome;
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
                    topClient.genome.optimization();
                    frame.client = topClient;
                    frame.genome = topClient.genome;
                }

                function restart() {
                    if (!frame?.controls.proceed) {
                        setTimeout(restart, 1);

                        return;
                    }
                    isTraining = false;
                    shouldRestart = true;
                    runEpoch();
                }

                // Wait a bit then restart
                setTimeout(() => {
                    restart();
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
            finished = 0;
            doneTimers.length = 0;
            shouldRestart = true;
            isTraining = false;
            updateStatus(`Switching to ${PROBLEMS[currentProblem].name}...`);
            updateProblemDescription(currentProblem);
        });
    }
}

// Run the demo
if (typeof document !== 'undefined') {
    initProblemSelector();
    updateProblemDescription(currentProblem);
}
main();
