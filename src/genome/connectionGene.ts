import { Gene } from './gene.js';
import { NodeGene } from './nodeGene.js';
import { Neat } from '../neat/index.js';

export class ConnectionGene extends Gene {
    from: NodeGene;
    to: NodeGene;
    weight = 0;
    enabled = true;

    replaceIndex = 0;

    constructor(innovationNumber: number, from: NodeGene, to: NodeGene) {
        super(innovationNumber);
        this.from = from;
        this.to = to;
    }

    getHashKey(): string {
        return `${this.from.innovationNumber}-${this.from.x}-${this.to.innovationNumber}-${this.to.x}`;
    }

    equals(obj: unknown): boolean {
        if (!(obj instanceof ConnectionGene)) return false;

        return this.from.equals(obj.from) && this.to.equals(obj.to);
    }

    hashCode(): number {
        return this.from.innovationNumber * Neat.MAX_NODES + this.to.innovationNumber;
    }
}
