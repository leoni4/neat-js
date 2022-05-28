import { ConnectionGene, Genome, NodeGene } from '../genome';
import { RandomHashSet, RandomSelector } from '../dataStructures';
import { Frame } from '../visual';
import { Client } from './client';
import { Species } from './species';

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

    #SURVIVORS = 0.9;

    #PROBABILITY_MUTATE_LINK = 0.1;
    #PROBABILITY_MUTATE_NODES = 0.1;
    #PROBABILITY_MUTATE_WEIGHT_SHIFT = 0.1;
    #PROBABILITY_MUTATE_WEIGHT_RANDOM = 0.1;
    #PROBABILITY_MUTATE_TOGGLE_LINK = 0.1;

    #inputNodes = 0;
    #outputNodes = 0;
    #maxClients = 0;

    #clients: Array<Client> = [];
    #species: Array<Species> = [];

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
        this.#maxClients = clients;

        this.#allConnections.clear();
        this.#allNodes.clear();
        this.#clients = [];

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
        for (let i = 0; i < this.#maxClients; i += 1) {
            const c: Client = new Client(this.emptyGenome());
            c.generateCalculator();
            this.#clients.push(c);
        }
    }

    setReplaceIndex(node1: NodeGene, node2: NodeGene, index: number) {
        const connectionGene = new ConnectionGene(0, node1, node2);
        const hashKey = connectionGene.getHashKey();
        const foundCon = this.#allConnections.get(hashKey);
        if (foundCon) {
            foundCon.replaceIndex = index;
        } else {
            throw new Error('setReplaceIndex to no connection');
        }
    }
    getReplaceIndex(node1: NodeGene, node2: NodeGene): number {
        const connectionGene = new ConnectionGene(0, node1, node2);
        const hashKey = connectionGene.getHashKey();
        const foundCon = this.#allConnections.get(hashKey);
        if (!foundCon) return 0;
        return foundCon.replaceIndex;
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
        const hashKey = connectionGene.getHashKey();
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

    evolve() {
        this.#genSpecies();
        this.#kill();
        this.#removeExtinct();
        this.#reproduce();
        this.#mutate();
        for (let i = 0; i < this.#clients.length; i += 1) {
            this.#clients[i].generateCalculator();
        }
    }

    printSpecies() {
        console.log('###################');
        for (let i = 0; i < this.#species.length; i += 1) {
            console.log(this.#species[i].score, this.#species[i].size());
        }
    }

    #mutate() {
        for (let i = 0; i < this.#clients.length; i += 1) {
            this.#clients[i].mutate();
        }
    }

    #reproduce() {
        const selector = new RandomSelector();
        for (let i = 0; i < this.#species.length; i += 1) {
            selector.add(this.#species[i], this.#species[i].score);
        }
        for (let i = 0; i < this.#clients.length; i += 1) {
            const c = this.#clients[i];
            if (c.species === null) {
                const s = selector.random();
                c.genome = s.breed();
                s.put(c, true);
            }
        }
    }

    #removeExtinct() {
        for (let i = this.#species.length - 1; i >= 0; i--) {
            if (this.#species[i].size() <= 1) {
                this.#species[i].goExtinct();
                this.#species.splice(i, 1);
            }
        }
    }

    #kill() {
        for (let i = 0; i < this.#species.length; i += 1) {
            this.#species[i].kill(1 - this.#SURVIVORS);
        }
    }

    #genSpecies() {
        for (let i = 0; i < this.#species.length; i += 1) {
            this.#species[i].reset();
        }
        for (let i = 0; i < this.#clients.length; i += 1) {
            const c = this.#clients[i];
            if (c.species !== null) {
                continue;
            }

            let found = false;
            for (let k = 0; k < this.#species.length; k += 1) {
                const s = this.#species[k];
                if (s.put(c)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.#species.push(new Species(c));
            }
        }
        for (let i = 0; i < this.#species.length; i += 1) {
            this.#species[i].evaluateScore();
        }
    }

    static main() {
        const neat: Neat = new Neat(2, 1, 1000);

        const test = {
            input: [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
            ],
            output: [0, 1, 0, 1],
        };

        let frame: Frame | null = null;
        if (typeof document !== 'undefined') {
            console.log('Create frame');
            frame = new Frame(neat.#clients[0].genome);
        }
        let k = 0;
        const epochs = 1000;
        setTimeout(function run() {
            if (k > epochs) {
                return;
            }
            k++;
            for (let i = 0; i < neat.#clients.length; i += 1) {
                const c = neat.#clients[i];
                c.score += 1 - Math.abs(c.calculate(test.input[0])[0] - test.output[0]);
                c.score += 1 - Math.abs(c.calculate(test.input[1])[0] - test.output[1]);
                c.score += 1 - Math.abs(c.calculate(test.input[2])[0] - test.output[2]);
                c.score += 1 - Math.abs(c.calculate(test.input[3])[0] - test.output[3]);
                c.score /= 4;
            }
            neat.evolve();
            console.log('EPOCH:', k, '| error:', 1 - neat.#species[0].score);
            // neat.printSpecies();
            if (frame) {
                frame.client = neat.#clients[0];
                frame.genome = neat.#clients[0].genome;
            }
            setTimeout(run, 1);
        }, 1);
    }
}
