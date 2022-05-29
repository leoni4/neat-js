import { Client, Neat } from './neat';
import { Frame } from './visual';

(function main() {
    const neat: Neat = new Neat(2, 1, 1000);

    const test = {
        input: [
            [0, 0],
            [1, 1],
            [1, 0],
            [0, 1],
        ],
        output: [0, 0, 1, 1],
    };

    let frame: Frame | null = null;
    if (typeof document !== 'undefined') {
        console.log('Create frame');
        frame = new Frame(neat.clients[0].genome);
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
        console.log('###################');
        neat.printSpecies();
        console.log('-------');
        console.log('EPOCH:', k, '| error:', error);
        if (frame) {
            frame.client = topClient;
            frame.genome = topClient.genome;
        }
        if (k > epochs || error < 0.0000001) {
            //   console.timeEnd('run()');
            console.log('Finished');
            return;
        }
        k++;
        neat.evolve();
        // console.timeEnd('run()');
        setTimeout(run, 1);
    }, 1);
})();
