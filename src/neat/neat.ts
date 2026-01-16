import {
    ConnectionGene,
    Genome,
    NodeGene,
    type GenomeSaveData,
    type NodeSaveData,
    type ConnectionSaveData,
} from '../genome/index.js';
import { RandomHashSet, RandomSelector } from '../dataStructures/index.js';
import { Client } from './client.js';
import { Species } from './species.js';

export enum OutputActivation {
    none = 'none',
    sigmoid = 'sigmoid',
    tanh = 'tanh',
    relu = 'relu',
    leakyRelu = 'leakyRelu',
    linear = 'linear',
    softmax = 'softmax',
}

export interface INeatParams {
    C1?: number;
    C2?: number;
    C3?: number;
    CT?: number;
    CP?: number;
    MUTATION_RATE?: number;
    SURVIVORS?: number;
    WEIGHT_SHIFT_STRENGTH?: number;
    BIAS_SHIFT_STRENGTH?: number;
    WEIGHT_RANDOM_STRENGTH?: number;
    PROBABILITY_MUTATE_WEIGHT_SHIFT?: number;
    PROBABILITY_MUTATE_TOGGLE_LINK?: number;
    PROBABILITY_MUTATE_WEIGHT_RANDOM?: number;
    PROBABILITY_MUTATE_LINK?: number;
    PROBABILITY_MUTATE_NODES?: number;
    OPT_ERR_THRESHOLD?: number;
    PERMANENT_MAIN_CONNECTIONS?: boolean;
}

interface LoadData {
    genome: GenomeSaveData;
    evolveCounts: number;
}

export class Neat {
    static get MAX_NODES(): number {
        return Math.pow(2, 20);
    }

    #C1: number;
    #C2: number;
    #C3: number;

    #CP: number;
    #CT: number;
    #PERMANENT_MAIN_CONNECTIONS: boolean;

    #SURVIVORS: number;

    #MUTATION_RATE: number;

    #WEIGHT_SHIFT_STRENGTH: number;
    #BIAS_SHIFT_STRENGTH: number;
    #WEIGHT_RANDOM_STRENGTH: number;

    #PROBABILITY_MUTATE_WEIGHT_SHIFT: number;
    #PROBABILITY_MUTATE_TOGGLE_LINK: number;
    #PROBABILITY_MUTATE_WEIGHT_RANDOM: number;
    #PROBABILITY_MUTATE_LINK: number;
    #PROBABILITY_MUTATE_NODES: number;

    #OPT_ERR_THRESHOLD: number;

    #EPS = 1e-9;
    #LAMBDA_HIGH = 0.6;
    #LAMBDA_LOW = 0.3;

    #OPTIMIZATION_PERIOD = 10;

    #inputNodes = 0;
    #outputNodes = 0;
    #maxClients = 0;

    #evolveCounts = 0;

    #clients: Array<Client> = [];
    #champion: {
        client: Client;
        score: number;
        epoch: number;
    } | null = null;
    #species: Array<Species> = [];

    #allConnections: Map<string, ConnectionGene> = new Map<string, ConnectionGene>();
    #allNodes: RandomHashSet = new RandomHashSet();

    #optimization = false;
    #lastError: number | undefined;
    #sameErrorEpoch = 0;

    #outputActivation: OutputActivation;

    constructor(
        inputNodes: number,
        outputNodes: number,
        clients: number,
        outputActivation: OutputActivation = OutputActivation.sigmoid,
        params?: INeatParams,
        loadData?: LoadData,
    ) {
        this.#C1 = params?.C1 || 1;
        this.#C2 = params?.C2 || 1;
        this.#C3 = params?.C3 || 0.1;

        this.#CT = params?.CT || inputNodes * outputNodes;
        this.#CP = params?.CP || (clients / 10 > 1 ? clients / 10 : 1);
        this.#PERMANENT_MAIN_CONNECTIONS = params?.PERMANENT_MAIN_CONNECTIONS || false;

        this.#MUTATION_RATE = params?.MUTATION_RATE || 1;

        this.#SURVIVORS = params?.SURVIVORS || 0.8;
        this.#WEIGHT_SHIFT_STRENGTH = params?.WEIGHT_SHIFT_STRENGTH || 5;
        this.#BIAS_SHIFT_STRENGTH = params?.BIAS_SHIFT_STRENGTH || 0.01;
        this.#WEIGHT_RANDOM_STRENGTH = params?.WEIGHT_RANDOM_STRENGTH || 1;
        this.#PROBABILITY_MUTATE_WEIGHT_SHIFT = params?.PROBABILITY_MUTATE_WEIGHT_SHIFT || 1;
        this.#PROBABILITY_MUTATE_TOGGLE_LINK = params?.PROBABILITY_MUTATE_TOGGLE_LINK || (inputNodes * outputNodes) / 4;
        this.#PROBABILITY_MUTATE_WEIGHT_RANDOM = params?.PROBABILITY_MUTATE_WEIGHT_RANDOM || 0.01;
        this.#PROBABILITY_MUTATE_LINK = params?.PROBABILITY_MUTATE_LINK || inputNodes * outputNodes;
        this.#PROBABILITY_MUTATE_NODES = params?.PROBABILITY_MUTATE_NODES || 0.01;
        this.#OPT_ERR_THRESHOLD = params?.OPT_ERR_THRESHOLD || 0.005;

        this.#outputActivation = outputActivation;
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#maxClients = clients;

        // Validate configuration
        this.#validateConfiguration();

        if (loadData) {
            this.load(loadData);
        } else {
            this.reset(inputNodes, outputNodes);
        }
    }

    /**
     * Validates NEAT configuration parameters.
     * Throws errors for invalid values and warns about unusual configurations.
     */
    #validateConfiguration(): void {
        // Validate distance coefficients
        if (this.#C1 < 0 || this.#C2 < 0 || this.#C3 < 0) {
            throw new Error('Distance coefficients (C1, C2, C3) must be non-negative');
        }

        // Validate SURVIVORS ratio
        if (this.#SURVIVORS < 0 || this.#SURVIVORS > 1) {
            throw new Error('SURVIVORS must be between 0 and 1 (inclusive)');
        }

        // Validate mutation rate
        if (this.#MUTATION_RATE < 0) {
            throw new Error('MUTATION_RATE must be non-negative');
        }

        // Validate network structure
        if (this.#inputNodes <= 0) {
            throw new Error('Number of input nodes must be positive');
        }

        if (this.#outputNodes <= 0) {
            throw new Error('Number of output nodes must be positive');
        }

        if (this.#maxClients <= 0) {
            throw new Error('Population size (clients) must be positive');
        }

        // Validate probabilities
        if (this.#PROBABILITY_MUTATE_WEIGHT_RANDOM < 0 || this.#PROBABILITY_MUTATE_WEIGHT_RANDOM > 1) {
            console.warn('PROBABILITY_MUTATE_WEIGHT_RANDOM typically should be between 0 and 1');
        }

        // Warn about unusual values
        if (this.#CT > 1000) {
            console.warn(`CT threshold is unusually high: ${this.#CT}`);
        }

        if (this.#CP > 10) {
            console.warn(`CP threshold is unusually high: ${this.#CP}`);
        }

        if (this.#MUTATION_RATE > 10) {
            console.warn(`MUTATION_RATE is unusually high: ${this.#MUTATION_RATE}`);
        }
    }

    get inputNodes(): number {
        return this.#inputNodes;
    }
    get outputNodes(): number {
        return this.#outputNodes;
    }

    get PERMANENT_MAIN_CONNECTIONS(): boolean {
        return this.#PERMANENT_MAIN_CONNECTIONS;
    }

    get OPT_ERR_THRESHOLD(): number {
        return this.#OPT_ERR_THRESHOLD;
    }

    get optimization(): boolean {
        return this.#optimization;
    }

    get clients(): ReadonlyArray<Client> {
        return this.#clients;
    }

    get allConnections(): ReadonlyMap<string, ConnectionGene> {
        return this.#allConnections;
    }
    get allNodes(): Readonly<RandomHashSet> {
        return this.#allNodes;
    }

    get MUTATION_RATE(): number {
        return this.#MUTATION_RATE + this.#sameErrorEpoch / 10;
    }

    get WEIGHT_SHIFT_STRENGTH(): number {
        return this.#WEIGHT_SHIFT_STRENGTH;
    }

    get BIAS_SHIFT_STRENGTH(): number {
        return this.#BIAS_SHIFT_STRENGTH;
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

    set CT(value: number) {
        this.#CT = value;
    }

    get CT(): number {
        return this.#CT;
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

    reset(inputNodes: number, outputNodes: number) {
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#allConnections.clear();
        this.#allNodes.clear();
        this.#clients = [];

        for (let i = 0; i < this.#inputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = 0.01;
            nodeGene.y = (i + 1) / (this.#inputNodes + 1);
        }

        for (let i = 0; i < this.#outputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = 0.99;
            nodeGene.y = (i + 1) / (this.#outputNodes + 1);
        }
        for (let i = 0; i < this.#maxClients; i += 1) {
            const c: Client = new Client(this.emptyGenome(), this.#outputActivation);
            c.generateCalculator();
            this.#clients.push(c);
        }
    }

    load(data: LoadData) {
        if (!data.genome) {
            throw new Error('Invalid load data: "genome" property is required');
        }
        if (!data.evolveCounts) {
            console.warn('Load data missing "evolveCounts", defaulting to 0');
            this.#evolveCounts = 0;
        } else {
            this.#evolveCounts = data.evolveCounts;
        }

        data.genome.nodes.forEach((item: NodeSaveData) => {
            const node = this.getNode();
            node.x = item.x;
            node.y = item.y;
        });

        for (let i = 0; i < this.#maxClients; i += 1) {
            const c: Client = new Client(this.loadGenome(data.genome), this.#outputActivation);
            this.#clients.push(c);
        }
    }

    loadGenome(data: GenomeSaveData) {
        const genome: Genome = new Genome(this);

        data.nodes.forEach((nodeItem: NodeSaveData) => {
            const node = this.getNode(nodeItem.innovationNumber);
            genome.nodes.add(node);
        });

        data.connections.forEach((con: ConnectionSaveData) => {
            const geneA = this.getNode(con.from);
            const geneB = this.getNode(con.to);
            const connectionNode = this.getConnection(geneA, geneB);
            connectionNode.weight = con.weight;
            connectionNode.replaceIndex = con.replaceIndex;
            connectionNode.enabled = con.enabled;
            genome.connections.addSorted(connectionNode);
        });

        return genome;
    }

    save() {
        const bestClient = this.#clients.find(item => item.bestScore) || this.#clients[0];
        const genome = bestClient.genome.save();
        genome.nodes.sort((a, b) => {
            return a.innovationNumber > b.innovationNumber ? 1 : -1;
        });
        genome.connections.forEach(con => {
            if (!con || con.replaceIndex === 0) {
                return;
            }
            const localReplaceNode = genome.nodes.find(node => node.innovationNumber === con.replaceIndex);
            if (!localReplaceNode) {
                const globalReplaceNode = this.#allNodes.data.find(node => node.innovationNumber === con.replaceIndex);
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
        return {
            genome,
            evolveCounts: this.#evolveCounts,
        };
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

    printSpecies() {
        for (let i = 0; i < this.#species.length; i += 1) {
            console.log(this.#species[i].score, this.#species[i].size());
        }
    }

    evolve(optimization = false, error?: number) {
        if (this.#lastError === error) {
            this.#sameErrorEpoch += 1;
        } else {
            this.#sameErrorEpoch = 0;
        }
        this.#lastError = error;
        this.#evolveCounts++;
        this.#optimization = optimization || this.#evolveCounts % this.#OPTIMIZATION_PERIOD === 0;
        this.#updateChampion();
        this.#normalizeScore();
        this.#genSpecies();
        this.#kill();
        this.#removeExtinct();
        this.#reproduce();
        this.#mutate();
        for (let i = 0; i < this.#clients.length; i += 1) {
            this.#clients[i].generateCalculator();
        }
    }

    #mutate() {
        for (let i = 0; i < this.#clients.length; i += 1) {
            this.#clients[i].mutate(this.#evolveCounts === 1);
        }
    }

    #reproduce() {
        const selector = new RandomSelector(this.#SURVIVORS);
        for (let i = 0; i < this.#species.length; i += 1) {
            selector.add(this.#species[i]);
        }
        for (let i = 0; i < this.#clients.length; i += 1) {
            const c = this.#clients[i];
            if (c.species === null) {
                const s = selector.random();
                c.genome = s.breed();
                s.put(c, true);
            }
        }
        selector.reset();
    }

    #removeExtinct() {
        for (let i = this.#species.length - 1; i >= 0; i--) {
            if (this.#species[i].size() <= 1 && !this.#species[i].clients[0]?.bestScore && this.#species.length > 1) {
                this.#species[i].goExtinct();
                this.#species.splice(i, 1);
            }
        }
    }

    #kill() {
        for (let i = 0; i < this.#species.length; i += 1) {
            this.#species[i].kill(this.#SURVIVORS);
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

    #normalizeScore() {
        let rawMax = -Infinity,
            rawMin = Infinity;

        let cMax = -Infinity,
            cMin = Infinity;

        for (const cl of this.#clients) {
            cl.bestScore = false;
            cl.scoreRaw = cl.score;
            rawMax = Math.max(rawMax, cl.scoreRaw);
            rawMin = Math.min(rawMin, cl.scoreRaw);

            const c = cl.genome.connections.size() + cl.genome.nodes.size();
            cl.complexity = c;
            cMax = Math.max(cMax, c);
            cMin = Math.min(cMin, c);
        }
        const span = rawMax - rawMin || 1;
        const cSpan = cMax - cMin || 1;

        const lambda = this.#optimization ? this.#LAMBDA_HIGH : this.#LAMBDA_LOW;
        for (const cl of this.#clients) {
            const cNorm = (cl.complexity - cMin) / cSpan;
            const penalty = lambda * cNorm * span;
            cl.adjustedScore = cl.scoreRaw - penalty;
        }

        let adjMax = -Infinity,
            adjMin = Infinity;
        for (const cl of this.#clients) {
            adjMax = Math.max(adjMax, cl.adjustedScore);
            adjMin = Math.min(adjMin, cl.adjustedScore);
        }
        const adjSpan = adjMax - adjMin || 1;

        for (const cl of this.#clients) {
            cl.score = (cl.adjustedScore - adjMin) / adjSpan;
        }

        this.#clients.sort((a, b) => b.score - a.score);

        const maxScore = Math.max(...this.#clients.map(c => c.score));
        const ties = this.#clients.map((c, i) => ({ c, i })).filter(({ c }) => maxScore - c.score <= this.#EPS);

        if (ties.length === 0) {
            this.#clients[0].bestScore = true;
        } else if (ties.length === 1) {
            ties[0].c.bestScore = true;
        } else {
            ties.sort((a, b) => a.c.complexity - b.c.complexity);
            ties[0].c.bestScore = true;
        }
    }

    #updateChampion() {
        if (this.#champion) {
            this.#champion.epoch += 1;
            if (this.#champion.epoch < this.#OPTIMIZATION_PERIOD) return;
        }

        this.#clients.sort((a, b) => b.score - a.score);
        const bestClient = this.#clients[0];
        if (!this.#champion || bestClient.score > this.#champion?.score) {
            this.#champion = {
                client: new Client(this.loadGenome(bestClient.genome.save()), this.#outputActivation),
                score: bestClient.score,
                epoch: 0,
            };
        } else if (this.#champion.epoch >= this.#OPTIMIZATION_PERIOD) {
            this.#champion.epoch = 0;
            this.#clients[this.#clients.length - 1] = new Client(
                this.loadGenome(this.#champion.client.genome.save()),
                this.#outputActivation,
            );
        }
    }
}
