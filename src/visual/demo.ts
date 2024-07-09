import { Client, Neat } from '../neat';
import { Frame } from './frame';

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
    params: {
        //  PERMANENT_MAIN_CONNECTIONS: true,
        PROBABILITY_MUTATE_WEIGHT_SHIFT: 6,
        PROBABILITY_MUTATE_LINK: 6,
    },
};

const test20 = {
    input: [] as any,
    output: [] as any,
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

const test = test20;

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
        // @ts-ignore-next-line
        'sigmoid',
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
        if (k > epochs || error === 0) {
            console.log('###################');
            console.log('Finished');
            if (frame) frame.text = 'EPOCH: ' + k + ' | error: ' + error + ' (Finished)';

            if (test.save) {
                localStorage.setItem('network', JSON.stringify(neat.save()));
            }
            return;
        }
        k++;
        neat.evolve();
        // console.timeEnd('run()');
        setTimeout(run, 1);
    }, 1);
}
