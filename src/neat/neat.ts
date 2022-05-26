import { ConnectionGene } from '../genome';
import { RandomHashSet } from '../dataStructures/randomHashSet';

export class Neat {
    static get MAX_NODES(): number {
        return Math.pow(2, 20);
    }

    #inputNodes: number;
    #outputNodes: number;
    #clients: number;

    #allConnections: Map<ConnectionGene, ConnectionGene> = new Map<ConnectionGene, ConnectionGene>();
    #allNodes: RandomHashSet = new RandomHashSet();

    constructor(inputNodes: number, outputNodes: number, clients: number) {
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#clients = clients;
    }

    reset(inputNodes: number, outputNodes: number, clients: number) {
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#clients = clients;

        this.#allConnections.clear();
        this.#allNodes.clear();
    }
}
