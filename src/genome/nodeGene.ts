import { Gene } from './gene.js';

export class NodeGene extends Gene {
    #x = 0;
    #y = 0;
    #bias = 0;

    constructor(innovationNumber: number) {
        super(innovationNumber);
    }

    get bias(): number {
        return this.#bias;
    }

    set bias(value: number) {
        this.#bias = value;
    }

    get x(): number {
        return this.#x;
    }

    set x(value: number) {
        this.#x = value;
    }

    get y(): number {
        return this.#y;
    }

    set y(value: number) {
        this.#y = value;
    }

    equals(obj: unknown): boolean {
        if (!(obj instanceof NodeGene)) return false;

        return this.innovationNumber === obj.innovationNumber;
    }

    hashCode(): number {
        return this.innovationNumber;
    }
}
