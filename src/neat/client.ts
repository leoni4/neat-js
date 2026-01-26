import { Genome } from '../genome/index.js';
import { Species } from './species.js';
import { Calculator } from '../calculations/index.js';

export class Client {
    #genome: Genome;
    #score = 0;
    #scoreRaw = 0;
    #error = 0;
    #bestScore = false;
    #species: Species | null;
    #calculator: Calculator | null;
    #EActivation: string;
    #hiddenActivation: string;
    #complexity = 0;
    #adjustedScore = 0;

    constructor(genome: Genome, EActivation: string, hiddenActivation: string) {
        this.#EActivation = EActivation;
        this.#hiddenActivation = hiddenActivation;
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

    get scoreRaw(): number {
        return this.#scoreRaw;
    }

    set scoreRaw(value: number) {
        this.#scoreRaw = value;
    }

    get species(): Species | null {
        return this.#species;
    }

    set species(value: Species | null) {
        this.#species = value;
    }

    get complexity(): number {
        return this.#complexity;
    }

    set complexity(value: number) {
        this.#complexity = value;
    }

    get adjustedScore(): number {
        return this.#adjustedScore;
    }

    set adjustedScore(value: number) {
        this.#adjustedScore = value;
    }

    generateCalculator() {
        this.#calculator = new Calculator(this.#genome, this.#EActivation, this.#hiddenActivation);
    }

    distance(client: Client): number {
        return this.genome.distance(client.genome);
    }

    mutate(force = false) {
        if (this.bestScore && !force) {
            return;
        }
        this.genome.mutate(this.error < this.genome.optErrThreshold && !force);
    }

    calculate(input: Array<number>): Array<number> {
        if (!this.#calculator) {
            this.generateCalculator();
        }
        return this.#calculator?.calculate(input) || [];
    }
}
