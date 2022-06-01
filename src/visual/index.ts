import { Client, Neat } from '../neat';
import { Frame } from './frame';

export * from './frame';
export * from './controls';

export function main() {
    const neat: Neat = new Neat(2, 1, 100);

    const test = {
        input: [
            [0, 0],
            [1, 1],
            [1, 0],
            [0, 1],
        ],
        output: [0, 0, 1, 1],
    };

    neat.evolve();
    let frame: Frame | null = null;
    if (typeof document !== 'undefined') {
        console.log('Create frame');
        frame = new Frame(neat.clients[0]);
    }
    let k = 0;
    let error = 1;
    const epochs = 1000;
    setTimeout(function run() {
        //  console.time('run()');
        let topScore = 0;
        let topClient: Client = neat.clients[0];
        let localError = 0;
        for (let i = 0; i < neat.clients.length; i += 1) {
            const c = neat.clients[i];
            localError = 0;
            test.input.forEach((inp, i) => {
                const out = c.calculate(inp)[0];
                localError += Math.abs(out - test.output[i]);
            });
            c.score = 1 - localError / 4;
            if (c.score > topScore) {
                topScore = c.score;
                topClient = c;
            }
        }
        error = 1 - topScore;
        // console.log('###################');
        // neat.printSpecies();
        // console.log('-------');
        // console.log('EPOCH:', k, '| error:', error);
        if (frame) {
            frame.text = 'EPOCH: ' + k + ' | error: ' + error;
            frame.client = topClient;
            frame.genome = topClient.genome;
        }
        if (k > epochs || error < 0) {
            //   console.timeEnd('run()');
            console.log('Finished');
            if (frame) frame.text = 'EPOCH: ' + k + ' | error: ' + error + ' (Finished)';
            return;
        }
        k++;
        neat.evolve();
        // console.timeEnd('run()');
        setTimeout(run, 100);
    }, 1);
}
