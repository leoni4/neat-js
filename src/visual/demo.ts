import { Client, Neat, OutputActivation } from '../neat';
import { Frame } from './frame';

/*
        this.#MUTATION_RATE = params?.MUTATION_RATE || 1;

        this.#SURVIVORS = params?.SURVIVORS || 0.8;
        this.#WEIGHT_SHIFT_STRENGTH = params?.WEIGHT_SHIFT_STRENGTH || 0.5;
        this.#WEIGHT_RANDOM_STRENGTH = params?.WEIGHT_RANDOM_STRENGTH || 2;
        this.#PROBABILITY_MUTATE_WEIGHT_SHIFT = params?.PROBABILITY_MUTATE_WEIGHT_SHIFT || 4;
        this.#PROBABILITY_MUTATE_TOGGLE_LINK = params?.PROBABILITY_MUTATE_TOGGLE_LINK || 0.5;
        this.#PROBABILITY_MUTATE_WEIGHT_RANDOM = params?.PROBABILITY_MUTATE_WEIGHT_RANDOM || 0.2;
        this.#PROBABILITY_MUTATE_LINK = params?.PROBABILITY_MUTATE_LINK || 0.05;
        this.#PROBABILITY_MUTATE_NODES = params?.PROBABILITY_MUTATE_NODES || 0.05;
        this.#OPT_ERR_TRASHHOLD = params?.OPT_ERR_TRASHHOLD || 0.005;
*/
const testXOR = {
    input: [
        [0, 0],
        [1, 1],
        [1, 0],
        [0, 1],
    ],
    save: false,
    load: false,
    clients: 100,
    output: [[0], [0], [1], [1]],
    params: {},
};

const test20 = {
    input: [] as number[][],
    output: [] as number[][],
    save: false,
    load: false,
    clients: 100,
    params: {
        // PERMANENT_MAIN_CONNECTIONS: true,
    },
};
for (let i = 0; i < 100; i += 1) {
    const arr = [];
    for (let k = 0; k < 20; k += 1) {
        arr.push(Math.random());
    }
    test20.input.push(arr);
    test20.output.push([Math.random()]);
}

const test = testXOR;

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
        OutputActivation.sigmoid,
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
                const out = c.calculate(inp)[0];
                localError += Math.abs(out - test.output[i][0]);
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
        if (frame) {
            frame.text = 'EPOCH: ' + k + ' | error: ' + error;
            frame.client = topClient;
            frame.genome = topClient.genome;
        }
        // if (k > epochs || error === 0) {
        //     console.log('###################');
        //     console.log('Finished');
        //     if (frame) frame.text = 'EPOCH: ' + k + ' | error: ' + error + ' (Finished)';

        //     if (test.save) {
        //         localStorage.setItem('network', JSON.stringify(neat.save()));
        //     }
        //     return;
        // }
        k++;
        neat.evolve(error === 0, error);
        // console.timeEnd('run()');
        setTimeout(run, 1);
    }, 1);
}
