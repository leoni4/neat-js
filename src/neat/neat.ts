import { ConnectionGene, Genome, NodeGene } from '../genome';
import { RandomHashSet } from '../dataStructures';
import { Frame } from '../visual';

export class Neat {
    static get MAX_NODES(): number {
        return Math.pow(2, 20);
    }

    #C1 = 1;
    #C2 = 1;
    #C3 = 1;

    #CP = 4;

    #WEIGHT_SHIFT_STRENGTH = 0.3;
    #WEIGHT_RANDOM_STRENGTH = 1;

    #PROBABILITY_MUTATE_LINK = 0.5;
    #PROBABILITY_MUTATE_NODES = 0.5;
    #PROBABILITY_MUTATE_WEIGHT_SHIFT = 0.5;
    #PROBABILITY_MUTATE_WEIGHT_RANDOM = 0.5;
    #PROBABILITY_MUTATE_TOGGLE_LINK = 0.5;

    #inputNodes = 0;
    #outputNodes = 0;
    #clients = 0;

    #allConnections: Map<string, ConnectionGene> = new Map<string, ConnectionGene>();
    #allNodes: RandomHashSet = new RandomHashSet();

    constructor(inputNodes: number, outputNodes: number, clients: number) {
        this.reset(inputNodes, outputNodes, clients);
    }

    get allConnections(): Map<string, ConnectionGene> {
        return this.#allConnections;
    }
    get allNodes(): RandomHashSet {
        return this.#allNodes;
    }

    get WEIGHT_SHIFT_STRENGTH(): number {
        return this.#WEIGHT_SHIFT_STRENGTH;
    }

    get WEIGHT_RANDOM_STRENGTH(): number {
        return this.#WEIGHT_RANDOM_STRENGTH;
    }

    get PROBABILITY_MUTATE_LINK(): number {
        return this.#PROBABILITY_MUTATE_LINK;
    }

    get PROBABILITY_MUTATE_NODES(): number {
        return this.#PROBABILITY_MUTATE_NODES;
    }

    get PROBABILITY_MUTATE_WEIGHT_SHIFT(): number {
        return this.#PROBABILITY_MUTATE_WEIGHT_SHIFT;
    }

    get PROBABILITY_MUTATE_WEIGHT_RANDOM(): number {
        return this.#PROBABILITY_MUTATE_WEIGHT_RANDOM;
    }

    get PROBABILITY_MUTATE_TOGGLE_LINK(): number {
        return this.#PROBABILITY_MUTATE_TOGGLE_LINK;
    }

    get CP(): number {
        return this.#CP;
    }

    get C1(): number {
        return this.#C1;
    }
    get C2(): number {
        return this.#C2;
    }
    get C3(): number {
        return this.#C3;
    }

    reset(inputNodes: number, outputNodes: number, clients: number) {
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#clients = clients;

        this.#allConnections.clear();
        this.#allNodes.clear();

        for (let i = 0; i < this.#inputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = 0.1;
            nodeGene.y = (i + 1) / (this.#inputNodes + 1);
        }

        for (let i = 0; i < this.#outputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = 0.9;
            nodeGene.y = (i + 1) / (this.#outputNodes + 1);
        }
    }

    emptyGenome(): Genome {
        const genome: Genome = new Genome(this);
        for (let i = 0; i < this.#inputNodes + this.#outputNodes; i += 1) {
            genome.nodes.add(this.getNode(i + 1));
        }
        return genome;
    }

    static getConnection(con: ConnectionGene): ConnectionGene {
        const connectionGene = new ConnectionGene(con.innovationNumber, con.from, con.to);
        connectionGene.weight = con.weight;
        connectionGene.enabled = con.enabled;
        return connectionGene;
    }

    getConnection(node1: NodeGene, node2: NodeGene): ConnectionGene {
        const connectionGene = new ConnectionGene(0, node1, node2);
        const hashKey = JSON.stringify(connectionGene);
        if (this.#allConnections.has(hashKey)) {
            const foundCon = this.#allConnections.get(hashKey);
            connectionGene.innovationNumber = foundCon ? foundCon.innovationNumber : 0;
        } else {
            this.#allConnections.set(hashKey, connectionGene);
            connectionGene.innovationNumber = this.#allConnections.size + 1;
        }

        return connectionGene;
    }

    getNode(id?: number): NodeGene {
        let nodeGene;
        if (id && id <= this.#allNodes.size()) {
            nodeGene = this.#allNodes.get(id - 1);
            if (!(nodeGene instanceof NodeGene)) {
                throw new Error('getNode returns not a NodeGene');
            }
        } else {
            nodeGene = new NodeGene(this.#allNodes.size() + 1);
            this.#allNodes.add(nodeGene);
        }
        return nodeGene;
    }

    static main() {
        const neat: Neat = new Neat(2, 1, 100);

        new Frame(neat.emptyGenome());
    }
}
