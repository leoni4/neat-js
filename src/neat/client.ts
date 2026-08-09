import { Genome, NodeGene, type GenomeSaveData } from '../genome/index.js';
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

    model(): GenomeSaveData {
        const genome = this.genome.save();
        const allNodes = this.genome.neat.allNodes;
        genome.nodes.sort((a, b) => {
            return a.innovationNumber > b.innovationNumber ? 1 : -1;
        });
        genome.connections.forEach(con => {
            if (!con || con.replaceIndex === 0) {
                return;
            }
            const localReplaceNode = genome.nodes.find(node => node.innovationNumber === con.replaceIndex);
            if (!localReplaceNode) {
                const globalReplaceNode = allNodes.data.find(node => node.innovationNumber === con.replaceIndex);
                if (!globalReplaceNode || !(globalReplaceNode instanceof NodeGene)) {
                    throw new Error('Not found node with replaceIndex, while saving');
                }
                con.replaceIndex = globalReplaceNode.innovationNumber;
            }
        });
        genome.nodes.forEach((node, index) => {
            const id = node.innovationNumber;
            const trueIndex = index + 1;
            if (id !== trueIndex) {
                genome.connections.forEach(con => {
                    if (con.from === id) {
                        con.from = trueIndex;
                    } else if (con.to === id) {
                        con.to = trueIndex;
                    } else if (con.replaceIndex === id) {
                        con.replaceIndex = trueIndex;
                    }
                });
            }
            genome.nodes[index].innovationNumber = trueIndex;
        });

        return genome;
    }
}
