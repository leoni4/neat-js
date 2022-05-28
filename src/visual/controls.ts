import { Genome } from '../genome';

export class Controls {
    #genome: Genome;
    constructor(genome: Genome) {
        this.#genome = genome;

        this.#initControls();
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
            //  alert(JSON.stringify(this.#genome.calculate([1, 1])));
        });
    }
}
