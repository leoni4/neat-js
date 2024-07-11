import { Genome } from '../genome';
import { Client } from '../neat';
import { Frame } from './frame';

export class Controls {
    #genome: Genome;
    #client: Client;
    #frame: Frame;
    #proceed: boolean = false;
    constructor(genome: Genome, frame: Frame) {
        this.#frame = frame;
        this.#genome = genome;
        this.#client = new Client(genome, 'none');

        this.#initControls();
    }

    get proceed(): boolean {
        return this.#proceed;
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
        document.getElementById('START')?.addEventListener('click', () => {
            this.#proceed = !this.proceed;
        });
        document.getElementById('r-w')?.addEventListener('click', () => {
            this.#genome.mutateWeightRandom();
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('w-s')?.addEventListener('click', () => {
            this.#genome.mutateWeightShift();
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('l-m')?.addEventListener('click', () => {
            this.#genome.mutateLink();
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('n-m')?.addEventListener('click', () => {
            this.#genome.mutateNode();
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('l-t')?.addEventListener('click', () => {
            this.#genome.mutateLinkToggle();
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('m')?.addEventListener('click', () => {
            this.#genome.mutate(true);
            console.log(this.#genome);
            this.#frame.genome = this.#genome;
        });
        document.getElementById('toggle')?.addEventListener('click', () => {
            this.#frame.toggle = !this.#frame.toggle;
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
