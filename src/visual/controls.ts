import { Genome } from '../genome';
import { Client } from '../neat';

export class Controls {
    #genome: Genome;
    #client: Client;
    constructor(genome: Genome) {
        this.#genome = genome;
        this.#client = new Client(genome);

        this.#initControls();
    }

    get client(): Client {
        return this.#client;
    }

    set client(value: Client) {
        this.#client = value;
    }

    get genome(): Genome {
        return this.#genome;
    }

    set genome(value: Genome) {
        this.#genome = value;
    }

    #initControls() {
        document.getElementById('r-w')?.addEventListener('click', () => {
            this.#genome.mutateWeightRandom();
        });
        document.getElementById('w-s')?.addEventListener('click', () => {
            this.#genome.mutateWeightShift();
        });
        document.getElementById('l-m')?.addEventListener('click', () => {
            this.#genome.mutateLink();
        });
        document.getElementById('n-m')?.addEventListener('click', () => {
            this.#genome.mutateNode();
        });
        document.getElementById('l-t')?.addEventListener('click', () => {
            this.#genome.mutateLinkToggle();
        });
        document.getElementById('m')?.addEventListener('click', () => {
            this.#genome.mutate();
        });
        document.getElementById('c')?.addEventListener('click', () => {
            const rawInput = (<HTMLInputElement>document.getElementById('inp')).value.split(',');
            console.log('- predicting -');
            const input = rawInput.map(a => {
                return parseInt(a);
            });
            console.log('input:', input);
            const output = this.#client.calculate(input)[0];
            console.log('output:', Math.round(output));
            console.log('outputRaw:', output);
        });
    }
}
