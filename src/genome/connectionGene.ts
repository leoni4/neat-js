import { Gene } from './gene';
import { NodeGene } from './nodeGene';
import { Neat } from '../neat';

export class ConnectionGene extends Gene {
    #from: NodeGene;
    #to: NodeGene;
    #weight = 0;
    #enabled = true;

    constructor(innovationNumber: number, from: NodeGene, to: NodeGene) {
        super(innovationNumber);
        this.#from = from;
        this.#to = to;
    }

    get from(): NodeGene {
        return this.#from;
    }

    set from(value: NodeGene) {
        this.#from = value;
    }

    get to(): NodeGene {
        return this.#to;
    }

    set to(value: NodeGene) {
        this.#to = value;
    }

    get weight(): number {
        return this.#weight;
    }

    set weight(value: number) {
        this.#weight = value;
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    set enabled(value: boolean) {
        this.#enabled = value;
    }

    equals(obj: unknown): boolean {
        if (!(obj instanceof ConnectionGene)) return false;

        return this.from.equals(obj.from) && this.to.equals(obj.to);
    }

    hashCode(): number {
        return this.from.innovationNumber * Neat.MAX_NODES + this.to.innovationNumber;
    }
}
