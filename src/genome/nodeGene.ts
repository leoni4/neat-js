import { Gene } from './gene.js';

export class NodeGene extends Gene {
    x = 0;
    y = 0;
    bias = 0;

    constructor(innovationNumber: number) {
        super(innovationNumber);
    }

    equals(obj: unknown): boolean {
        if (!(obj instanceof NodeGene)) return false;

        return this.innovationNumber === obj.innovationNumber;
    }

    hashCode(): number {
        return this.innovationNumber;
    }
}
