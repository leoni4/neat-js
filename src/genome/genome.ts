import { RandomHashSet } from '../dataStructures';
import { Neat } from '../neat';

export class Genome {
    #connections: RandomHashSet = new RandomHashSet();
    #nodes: RandomHashSet = new RandomHashSet();
    #neat: Neat;

    constructor(neat: Neat) {
        this.#neat = neat;
    }

    get connections(): RandomHashSet {
        return this.#connections;
    }

    get nodes(): RandomHashSet {
        return this.#nodes;
    }

    get neat(): Neat {
        return this.#neat;
    }

    static crossOver(g1: Genome, g2: Genome) {
        return null;
    }

    distance(g2: Genome): number {
        return 0;
    }

    mutate() {
        return null;
    }
}
