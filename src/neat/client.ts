import { Genome } from '../genome';
import { Species } from './species';
import { Calculator } from '../calculations';

export class Client {
    #genome: Genome;
    #score = 0;
    #species: Species | null;
    #calculator: Calculator | null;

    constructor(genome: Genome) {
        this.#genome = genome;
        this.#calculator = null;
        this.#species = null;
    }

    get genome(): Genome {
        return this.#genome;
    }

    set genome(value: Genome) {
        this.#genome = value;
    }

    get score(): number {
        return this.#score;
    }

    set score(value: number) {
        this.#score = value;
    }

    get species(): Species | null {
        return this.#species;
    }

    set species(value: Species | null) {
        this.#species = value;
    }

    #generateCalculator() {
        this.#calculator = new Calculator(this.#genome);
    }

    distance(client: Client): number {
        return this.genome.distance(client.genome);
    }

    mutate() {
        this.genome.mutate();
    }

    calculate(input: Array<number>): Array<number> {
        if (!this.#calculator) {
            this.#generateCalculator();
        }
        return this.#calculator?.calculate(input) || [];
    }
}
