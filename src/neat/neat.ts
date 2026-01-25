import {
    ConnectionGene,
    Genome,
    NodeGene,
    type GenomeSaveData,
    type NodeSaveData,
    type ConnectionSaveData,
} from '../genome/index.js';
import { NETWORK_CONSTANTS } from './constants.js';
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
    BIAS_RANDOM_STRENGTH?: number;
    PROBABILITY_MUTATE_WEIGHT_SHIFT?: number;
    PROBABILITY_MUTATE_TOGGLE_LINK?: number;
    PROBABILITY_MUTATE_WEIGHT_RANDOM?: number;
    PROBABILITY_MUTATE_LINK?: number;
    PROBABILITY_MUTATE_NODES?: number;
    OPT_ERR_THRESHOLD?: number;
    OPTIMIZATION_PERIOD?: number;
    PERMANENT_MAIN_CONNECTIONS?: boolean;
    LAMBDA_HIGH?: number;
    LAMBDA_LOW?: number;
    EPS?: number;
}

const DEFAULT_PARAMS = {
    C1: 1,
    C2: 1,
    C3: 0.1,
    CP: 1,

    CT: 1,
    PERMANENT_MAIN_CONNECTIONS: false,

    MUTATION_RATE: 1,

    SURVIVORS: 0.4,

    WEIGHT_SHIFT_STRENGTH: 0.2,
    BIAS_SHIFT_STRENGTH: 0.15,
    WEIGHT_RANDOM_STRENGTH: 1,
    BIAS_RANDOM_STRENGTH: 1,

    PROBABILITY_MUTATE_WEIGHT_SHIFT: 0.8,
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.05,
    PROBABILITY_MUTATE_LINK: 0.08,
    PROBABILITY_MUTATE_TOGGLE_LINK: 0.08,
    PROBABILITY_MUTATE_NODES: 0.03,

    OPT_ERR_THRESHOLD: 0.01,
    OPTIMIZATION_PERIOD: 10,

    LAMBDA_HIGH: 0.3,
    LAMBDA_LOW: 0.1,
    EPS: 1e-4,
};
type MutationPressureType = 'topology' | 'weights';

export const MUTATION_PRESSURE_CONST: Record<EMutationPressure, Record<MutationPressureType, number>> = {
    NORMAL: {
        topology: 1,
        weights: 1,
    },
    BOOST: {
        topology: 1,
        weights: 2,
    },
    ESCAPE: {
        topology: 2,
        weights: 2,
    },
    PANIC: {
        topology: 5,
        weights: 2,
    },
};

export enum EMutationPressure {
    NORMAL = 'NORMAL',
    BOOST = 'BOOST',
    ESCAPE = 'ESCAPE',
    PANIC = 'PANIC',
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
    #BIAS_RANDOM_STRENGTH: number;

    #PROBABILITY_MUTATE_WEIGHT_SHIFT: number;
    #PROBABILITY_MUTATE_TOGGLE_LINK: number;
    #PROBABILITY_MUTATE_WEIGHT_RANDOM: number;
    #PROBABILITY_MUTATE_LINK: number;
    #PROBABILITY_MUTATE_NODES: number;

    #OPT_ERR_THRESHOLD: number;

    #EPS: number;
    #LAMBDA_HIGH: number;
    #LAMBDA_LOW: number;

    #OPTIMIZATION_PERIOD: number;

    #inputNodes = 0;
    #outputNodes = 0;
    #maxClients = 0;

    #evolveCounts = 0;

    #networkScoreRaw = 0;
    #stagnationCount = 0;

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

    #outputActivation: OutputActivation;

    #PRESSURE = EMutationPressure.NORMAL;

    constructor(
        inputNodes: number,
        outputNodes: number,
        clients: number,
        outputActivation: OutputActivation = OutputActivation.sigmoid,
        params?: INeatParams,
        loadData?: LoadData,
    ) {
        this.#C1 = params?.C1 ?? DEFAULT_PARAMS.C1;
        this.#C2 = params?.C2 ?? DEFAULT_PARAMS.C2;
        this.#C3 = params?.C3 ?? DEFAULT_PARAMS.C3;

        this.#CT = params?.CT ?? DEFAULT_PARAMS.CT;
        this.#CP = params?.CP ?? DEFAULT_PARAMS.CP;
        this.#PERMANENT_MAIN_CONNECTIONS =
            params?.PERMANENT_MAIN_CONNECTIONS || DEFAULT_PARAMS.PERMANENT_MAIN_CONNECTIONS;

        this.#MUTATION_RATE = params?.MUTATION_RATE ?? DEFAULT_PARAMS.MUTATION_RATE;

        this.#SURVIVORS = params?.SURVIVORS ?? DEFAULT_PARAMS.SURVIVORS;

        this.#WEIGHT_SHIFT_STRENGTH = params?.WEIGHT_SHIFT_STRENGTH ?? DEFAULT_PARAMS.WEIGHT_SHIFT_STRENGTH;
        this.#BIAS_SHIFT_STRENGTH = params?.BIAS_SHIFT_STRENGTH ?? DEFAULT_PARAMS.BIAS_SHIFT_STRENGTH;
        this.#WEIGHT_RANDOM_STRENGTH = params?.WEIGHT_RANDOM_STRENGTH ?? DEFAULT_PARAMS.WEIGHT_RANDOM_STRENGTH;
        this.#BIAS_RANDOM_STRENGTH = params?.BIAS_RANDOM_STRENGTH ?? DEFAULT_PARAMS.BIAS_RANDOM_STRENGTH;
        this.#PROBABILITY_MUTATE_WEIGHT_SHIFT =
            params?.PROBABILITY_MUTATE_WEIGHT_SHIFT ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_SHIFT;
        this.#PROBABILITY_MUTATE_TOGGLE_LINK =
            params?.PROBABILITY_MUTATE_TOGGLE_LINK ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_TOGGLE_LINK;
        this.#PROBABILITY_MUTATE_WEIGHT_RANDOM =
            params?.PROBABILITY_MUTATE_WEIGHT_RANDOM ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_RANDOM;
        this.#PROBABILITY_MUTATE_LINK = params?.PROBABILITY_MUTATE_LINK ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_LINK;
        this.#PROBABILITY_MUTATE_NODES = params?.PROBABILITY_MUTATE_NODES ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_NODES;
        this.#OPT_ERR_THRESHOLD = params?.OPT_ERR_THRESHOLD ?? DEFAULT_PARAMS.OPT_ERR_THRESHOLD;
        this.#OPTIMIZATION_PERIOD = params?.OPTIMIZATION_PERIOD ?? DEFAULT_PARAMS.OPTIMIZATION_PERIOD;

        this.#LAMBDA_HIGH = params?.LAMBDA_HIGH ?? DEFAULT_PARAMS.LAMBDA_HIGH;
        this.#LAMBDA_LOW = params?.LAMBDA_LOW ?? DEFAULT_PARAMS.LAMBDA_LOW;
        this.#EPS = params?.EPS ?? DEFAULT_PARAMS.EPS;

        this.#outputActivation = outputActivation;
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#maxClients = clients;

        this.#validateConfiguration();

        if (loadData) {
            this.load(loadData);
        } else {
            this.reset(inputNodes, outputNodes);
        }
    }

    #validateConfiguration(): void {
        if (this.#C1 < 0 || this.#C2 < 0 || this.#C3 < 0) {
            throw new Error('Distance coefficients (C1, C2, C3) must be non-negative');
        }

        if (this.#SURVIVORS < 0 || this.#SURVIVORS > 1) {
            throw new Error('SURVIVORS must be between 0 and 1 (inclusive)');
        }

        if (this.#MUTATION_RATE < 0) {
            throw new Error('MUTATION_RATE must be non-negative');
        }

        if (this.#inputNodes <= 0) {
            throw new Error('Number of input nodes must be positive');
        }

        if (this.#outputNodes <= 0) {
            throw new Error('Number of output nodes must be positive');
        }

        if (this.#maxClients <= 0) {
            throw new Error('Population size (clients) must be positive');
        }

        if (this.#PROBABILITY_MUTATE_WEIGHT_RANDOM < 0 || this.#PROBABILITY_MUTATE_WEIGHT_RANDOM > 1) {
            console.warn('PROBABILITY_MUTATE_WEIGHT_RANDOM typically should be between 0 and 1');
        }

        if (this.#CT > 1000) {
            console.warn(`CT threshold is unusually high: ${this.#CT}`);
        }

        if (this.#CP > 10) {
            console.warn(`CP threshold is unusually high: ${this.#CP}`);
        }

        if (this.#MUTATION_RATE > 10) {
            console.warn(`MUTATION_RATE is unusually high: ${this.#MUTATION_RATE}`);
        }

        if (this.#WEIGHT_SHIFT_STRENGTH > 1) {
            console.warn(
                `WEIGHT_SHIFT_STRENGTH is very high (${this.#WEIGHT_SHIFT_STRENGTH}). ` +
                    'Values > 1 can cause oscillations and prevent convergence. Recommended: 0.1-0.3',
            );
        }

        if (this.#SURVIVORS > 0.6) {
            console.warn(
                `SURVIVORS is high (${this.#SURVIVORS}). ` +
                    'Weak selection pressure may slow evolution. Recommended: 0.3-0.5',
            );
        }

        if (this.#PROBABILITY_MUTATE_LINK > 2) {
            console.warn(
                `PROBABILITY_MUTATE_LINK is high (${this.#PROBABILITY_MUTATE_LINK}). ` +
                    'This can cause rapid network bloat. Recommended: 0.5-1.5 for most problems',
            );
        }

        if (
            this.#WEIGHT_SHIFT_STRENGTH > 0 &&
            this.#BIAS_SHIFT_STRENGTH > 0 &&
            Math.abs(this.#WEIGHT_SHIFT_STRENGTH - this.#BIAS_SHIFT_STRENGTH) / this.#WEIGHT_SHIFT_STRENGTH > 0.8
        ) {
            console.warn(
                `WEIGHT_SHIFT_STRENGTH (${this.#WEIGHT_SHIFT_STRENGTH}) and ` +
                    `BIAS_SHIFT_STRENGTH (${this.#BIAS_SHIFT_STRENGTH}) are highly imbalanced. ` +
                    'Consider using similar values for both.',
            );
        }

        if (this.#LAMBDA_HIGH < 0 || this.#LAMBDA_LOW < 0) {
            throw new Error('LAMBDA_HIGH and LAMBDA_LOW must be non-negative');
        }

        if (this.#LAMBDA_HIGH > 0.8) {
            console.warn(
                `LAMBDA_HIGH is very high (${this.#LAMBDA_HIGH}). ` +
                    'Excessive complexity penalty may prevent networks from growing. Recommended: 0.2-0.4',
            );
        }

        if (this.#LAMBDA_LOW > 0.5) {
            console.warn(
                `LAMBDA_LOW is high (${this.#LAMBDA_LOW}). ` + 'This may restrict exploration. Recommended: 0.05-0.2',
            );
        }

        if (this.#EPS < 1e-6 || this.#EPS > 1e-2) {
            console.warn(
                `EPS is outside typical range (${this.#EPS}). ` +
                    'Recommended: 1e-6 to 1e-3 for meaningful tie-breaking',
            );
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
    get PRESSURE(): EMutationPressure {
        return this.#PRESSURE;
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
        return this.#MUTATION_RATE;
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

    get BIAS_RANDOM_STRENGTH(): number {
        return this.#BIAS_RANDOM_STRENGTH;
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

    get champion(): Client | undefined {
        return this.#champion?.client;
    }

    reset(inputNodes: number, outputNodes: number) {
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#allConnections.clear();
        this.#allNodes.clear();
        this.#clients = [];

        for (let i = 0; i < this.#inputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = NETWORK_CONSTANTS.INPUT_NODE_X;
            nodeGene.y = (i + 1) / (this.#inputNodes + 1);
        }

        for (let i = 0; i < this.#outputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = NETWORK_CONSTANTS.OUTPUT_NODE_X;
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

    calculate(input: Array<number>): Array<number> {
        return (this.#champion?.client ?? this.#clients[0]).calculate(input) || [];
    }

    evolve(optimization = false) {
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
                if (this.#PRESSURE === EMutationPressure.PANIC && this.#champion) {
                    const emptyGenome = this.emptyGenome();
                    emptyGenome.mutate();
                    c.genome =
                        Math.random() > 0.5
                            ? Genome.crossOver(this.#champion?.client.genome, emptyGenome)
                            : emptyGenome;
                    c.genome.mutate();
                    c.genome.mutate();
                    console.log('PANIC MUTATIONS');
                } else {
                    c.genome = s.breed();
                }
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

        let cMax = -Infinity;

        for (const cl of this.#clients) {
            cl.bestScore = false;
            cl.scoreRaw = cl.score;
            rawMax = Math.max(rawMax, cl.scoreRaw);
            rawMin = Math.min(rawMin, cl.scoreRaw);

            const c = cl.genome.connections.size() + cl.genome.nodes.size();
            cl.complexity = c;
            cMax = Math.max(cMax, c);
        }
        const span = rawMax - rawMin || 1;
        const effectiveSpan = Math.max(span, 0.05);

        const lambda = this.#optimization ? this.#LAMBDA_HIGH : this.#LAMBDA_LOW;
        for (const cl of this.#clients) {
            const cNorm = Math.log(1 + cl.complexity) / Math.log(1 + cMax);
            const penalty = lambda * cNorm * effectiveSpan;
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
            if (Math.abs(this.#champion.score - this.#networkScoreRaw) <= this.#OPT_ERR_THRESHOLD) {
                this.#stagnationCount += 1;
            } else {
                this.#networkScoreRaw = this.#champion.score;
                this.#stagnationCount = 0;
            }

            if (this.#stagnationCount > 430) {
                this.#PRESSURE = EMutationPressure.NORMAL;
                this.#stagnationCount = 0;
            } else if (this.#stagnationCount > 400) {
                this.#PRESSURE = EMutationPressure.PANIC;
            } else if (this.#stagnationCount > 200) {
                this.#PRESSURE = EMutationPressure.ESCAPE;
            } else if (this.#stagnationCount > 80) {
                this.#PRESSURE = EMutationPressure.BOOST;
            } else {
                this.#PRESSURE = EMutationPressure.NORMAL;
            }
            console.log(this.#PRESSURE);

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
            const incertedChampion = new Client(
                this.loadGenome(this.#champion.client.genome.save()),
                this.#outputActivation,
            );
            incertedChampion.score = this.#champion.score;
            this.#clients[this.#clients.length - 1] = incertedChampion;
        }
    }
}
