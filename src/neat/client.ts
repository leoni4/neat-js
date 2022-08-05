import { Genome } from '../genome';
import { Species } from './species';
import { Calculator } from '../calculations';

export class Client {
    #genome: Genome;
    #score = 0;
    #error = 0;
    #bestScore = false;
    #species: Species | null;
    #calculator: Calculator | null;

    constructor(genome: Genome) {
        this.#genome = genome;
        this.#calculator = null;
        this.#species = null;
    }

    get bestScore(): boolean {
        return this.#bestScore;
    }

    set bestScore(value: boolean) {
        this.#bestScore = value;
    }

    get genome(): Genome {
        return this.#genome;
    }

    set genome(value: Genome) {
        this.#genome = value;
    }

    get error(): number {
        return this.#error;
    }

    set error(value: number) {
        this.#error = value;
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

    generateCalculator() {
        this.#calculator = new Calculator(this.#genome);
    }

    distance(client: Client): number {
        return this.genome.distance(client.genome);
    }

    mutate() {
        if (this.bestScore) {
            return;
        }
        this.genome.mutate(this.error < this.genome.optErrTrashhold);
    }

    calculate(input: Array<number>): Array<number> {
        if (!this.#calculator) {
            this.generateCalculator();
        }
        return this.#calculator?.calculate(input) || [];
    }
}
