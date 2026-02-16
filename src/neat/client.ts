import { Genome } from '../genome/index.js';
import { Species } from './species.js';
import { Calculator } from '../calculations/index.js';
import { EActivation } from '../neat/index.js';

export class Client {
    genome: Genome;
    score = 0;
    scoreRaw = 0;
    error = 0;
    bestScore = false;
    species: Species | null;
    private _calculator: Calculator | null;
    private _outputActivation: EActivation;
    private _hiddenActivation: EActivation;
    complexity = 0;
    adjustedScore = 0;

    constructor(genome: Genome, outputActivation: EActivation, hiddenActivation: EActivation) {
        this._outputActivation = outputActivation;
        this._hiddenActivation = hiddenActivation;
        this.genome = genome;
        this._calculator = null;
        this.species = null;
    }

    generateCalculator() {
        this._calculator = new Calculator(this.genome, this._outputActivation, this._hiddenActivation);
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
        if (!this._calculator) {
            this.generateCalculator();
        }

        return this._calculator?.calculate(input) || [];
    }
}
