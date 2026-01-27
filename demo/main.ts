import { Client, Neat, EActivation, type INeatParams } from '../src/neat/index.js';
import { Frame } from '../src/visual/frame.js';
import { testXOR, testXNOR, testAND_OR, testParity3, testCircle, testTwoMoons, testSin01 } from './problems.js';

(function () {
    console.log(
        'All tested',
        !!(testXOR || testXNOR || testAND_OR || testParity3 || testCircle || testTwoMoons || testSin01),
    );
})();

const params = {
    // CP: 0.5,
    // MUTATION_RATE: 2,
    // PROBABILITY_MUTATE_WEIGHT_SHIFT: 6 * 2,
    // WEIGHT_SHIFT_STRENGTH: 5,
    // BIAS_SHIFT_STRENGTH: 1,
    // etc
} as INeatParams;

const test = {
    ...testXOR,
    save: false,
    load: false,
    clients: 1000,
    params,
};

export function main() {
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

    // neat.evolve();
    let frame: Frame | null = null;
    if (typeof document !== 'undefined') {
        console.log('Create frame');
        frame = new Frame(neat.clients[0], 'container');
        frame.client = neat.clients[0];
        frame.genome = neat.clients[0].genome;
    }
    let k = 0;
    let error = 1;
    const epochs = 1 / 0;

    setTimeout(function run() {
        if (!frame?.controls.proceed) {
            setTimeout(run, 1);
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
        if (frame) {
            frame.text = 'EPOCH: ' + k + ' | error: ' + error;
            frame.client = frameClient;
            frame.genome = frameClient.genome;
        }
        if (k > epochs || error <= neat.OPT_ERR_THRESHOLD) {
            console.log('###################');
            console.log('Finished');
            if (frame) frame.text = 'EPOCH: ' + k + ' | error: ' + error + ' (Finished)';
            frameClient.genome.optimization();
            frame.client = frameClient;
            frame.genome = frameClient.genome;
            if (test.save) {
                localStorage.setItem('network', JSON.stringify(neat.save()));
            }
            return;
        }
        k++;
        neat.evolve(error <= neat.OPT_ERR_THRESHOLD);
        // console.timeEnd('run()');
        setTimeout(run, 1);
    }, 1);
}

// Run the demo
main();
