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

export enum EActivation {
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
    LOAD_PERCENT?: number;
}

const HISTORY_WINDOW = 80;

const SMALL_GAIN_THRESHOLD = 0.001;
const COMPLEXITY_GROWTH_ABS = 30;
const COMPLEXITY_GROWTH_RATIO = 0.1;

const DEFAULT_PARAMS = {
    C1: 1,
    C2: 1,
    C3: 0.2,
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

    OPT_ERR_THRESHOLD: 0.005,
    OPTIMIZATION_PERIOD: 100,

    LAMBDA_HIGH: 0.3,
    LAMBDA_LOW: 0.1,
    EPS: 1e-4,

    LOAD_PERCENT: 0.5,
};
type MutationPressureType = 'topology' | 'weights';

export const MUTATION_PRESSURE_CONST: Record<EMutationPressure, Record<MutationPressureType, number>> = {
    COMPACT: {
        topology: 0.2,
        weights: 1,
    },
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
    COMPACT = 'COMPACT',
    NORMAL = 'NORMAL',
    BOOST = 'BOOST',
    ESCAPE = 'ESCAPE',
    PANIC = 'PANIC',
}

interface LoadData {
    genome: GenomeSaveData;
    evolveCounts: number;
}

export interface IFitOptions {
    /**
     * Number of training epochs (generations). Default: Infinity
     */
    epochs?: number;
    /**
     * Error threshold for early stopping. Defaults to OPT_ERR_THRESHOLD from params.
     */
    errorThreshold?: number;
    /**
     * Fraction of training data to use for validation (0-1). Default: 0
     */
    validationSplit?: number;
    /**
     * Verbosity level:
     * - 0: Silent
     * - 1: Progress updates at intervals
     * - 2: Detailed per-epoch logs
     * Default: 1
     */
    verbose?: 0 | 1 | 2;
    /**
     * How often to log when verbose=1. Default: 100
     */
    logInterval?: number;
}

export interface IFitHistory {
    /**
     * Training errors per epoch
     */
    error: number[];
    /**
     * Validation errors per epoch (if validationSplit > 0)
     */
    validationError?: number[];
    /**
     * Number of epochs completed
     */
    epochs: number;
    /**
     * Final champion client
     */
    champion: Client | null;
    /**
     * Whether training was stopped early (error threshold reached)
     */
    stoppedEarly: boolean;
}

export class Neat {
    static get MAX_NODES(): number {
        return Math.pow(2, 20);
    }

    private _C1: number;
    private _C2: number;
    private _C3: number;

    private _CP: number;
    CT: number;
    private _PERMANENT_MAIN_CONNECTIONS: boolean;

    private _SURVIVORS: number;

    private _MUTATION_RATE: number;

    private _WEIGHT_SHIFT_STRENGTH: number;
    private _BIAS_SHIFT_STRENGTH: number;
    private _WEIGHT_RANDOM_STRENGTH: number;
    private _BIAS_RANDOM_STRENGTH: number;

    private _PROBABILITY_MUTATE_WEIGHT_SHIFT: number;
    private _PROBABILITY_MUTATE_TOGGLE_LINK: number;
    private _PROBABILITY_MUTATE_WEIGHT_RANDOM: number;
    private _PROBABILITY_MUTATE_LINK: number;
    private _PROBABILITY_MUTATE_NODES: number;

    private _OPT_ERR_THRESHOLD: number;

    private _EPS: number;
    private _LAMBDA_HIGH: number;
    private _LAMBDA_LOW: number;

    private _OPTIMIZATION_PERIOD: number;

    private _inputNodes = 0;
    private _outputNodes = 0;
    private _maxClients = 0;

    private _evolveCounts = 0;

    private _networkScoreRaw = -Infinity;
    private _stagnationCount = 0;

    private _clients: Array<Client> = [];
    private _champion: {
        client: Client;
        scoreRaw: number;
        scoreHistory: number[];
        complexity: number;
        complexityHistory: number[];
        epoch: number;
    } | null = null;

    private _runnerUp: Client | null = null;
    private _species: Array<Species> = [];

    private _allConnections: Map<string, ConnectionGene> = new Map<string, ConnectionGene>();
    private _allNodes: RandomHashSet = new RandomHashSet();

    private _optimization = false;

    private _outputActivation: EActivation;
    private _hiddenActivation: EActivation;

    private _PRESSURE = EMutationPressure.NORMAL;

    constructor(
        inputNodes: number,
        outputNodes: number,
        clients: number,
        outputActivation: EActivation = EActivation.sigmoid,
        hiddenActivation: EActivation = EActivation.tanh,
        params?: INeatParams,
        loadData?: LoadData,
    ) {
        this._C1 = params?.C1 ?? DEFAULT_PARAMS.C1;
        this._C2 = params?.C2 ?? DEFAULT_PARAMS.C2;
        this._C3 = params?.C3 ?? DEFAULT_PARAMS.C3;

        this.CT = params?.CT ?? DEFAULT_PARAMS.CT;
        this._CP = params?.CP ?? DEFAULT_PARAMS.CP;
        this._PERMANENT_MAIN_CONNECTIONS =
            params?.PERMANENT_MAIN_CONNECTIONS || DEFAULT_PARAMS.PERMANENT_MAIN_CONNECTIONS;

        this._MUTATION_RATE = params?.MUTATION_RATE ?? DEFAULT_PARAMS.MUTATION_RATE;

        this._SURVIVORS = params?.SURVIVORS ?? DEFAULT_PARAMS.SURVIVORS;

        this._WEIGHT_SHIFT_STRENGTH = params?.WEIGHT_SHIFT_STRENGTH ?? DEFAULT_PARAMS.WEIGHT_SHIFT_STRENGTH;
        this._BIAS_SHIFT_STRENGTH = params?.BIAS_SHIFT_STRENGTH ?? DEFAULT_PARAMS.BIAS_SHIFT_STRENGTH;
        this._WEIGHT_RANDOM_STRENGTH = params?.WEIGHT_RANDOM_STRENGTH ?? DEFAULT_PARAMS.WEIGHT_RANDOM_STRENGTH;
        this._BIAS_RANDOM_STRENGTH = params?.BIAS_RANDOM_STRENGTH ?? DEFAULT_PARAMS.BIAS_RANDOM_STRENGTH;
        this._PROBABILITY_MUTATE_WEIGHT_SHIFT =
            params?.PROBABILITY_MUTATE_WEIGHT_SHIFT ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_SHIFT;
        this._PROBABILITY_MUTATE_TOGGLE_LINK =
            params?.PROBABILITY_MUTATE_TOGGLE_LINK ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_TOGGLE_LINK;
        this._PROBABILITY_MUTATE_WEIGHT_RANDOM =
            params?.PROBABILITY_MUTATE_WEIGHT_RANDOM ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_RANDOM;
        this._PROBABILITY_MUTATE_LINK = params?.PROBABILITY_MUTATE_LINK ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_LINK;
        this._PROBABILITY_MUTATE_NODES = params?.PROBABILITY_MUTATE_NODES ?? DEFAULT_PARAMS.PROBABILITY_MUTATE_NODES;
        this._OPT_ERR_THRESHOLD = params?.OPT_ERR_THRESHOLD ?? DEFAULT_PARAMS.OPT_ERR_THRESHOLD;
        this._OPTIMIZATION_PERIOD = params?.OPTIMIZATION_PERIOD ?? DEFAULT_PARAMS.OPTIMIZATION_PERIOD;

        this._LAMBDA_HIGH = params?.LAMBDA_HIGH ?? DEFAULT_PARAMS.LAMBDA_HIGH;
        this._LAMBDA_LOW = params?.LAMBDA_LOW ?? DEFAULT_PARAMS.LAMBDA_LOW;
        this._EPS = params?.EPS ?? DEFAULT_PARAMS.EPS;

        this._outputActivation = outputActivation;
        this._hiddenActivation = hiddenActivation;
        this._inputNodes = inputNodes;
        this._outputNodes = outputNodes;
        this._maxClients = clients;

        this.validateConfiguration();

        if (loadData) {
            this.load(loadData, params?.LOAD_PERCENT || DEFAULT_PARAMS.LOAD_PERCENT);
        } else {
            this.reset(inputNodes, outputNodes);
        }
    }

    private validateConfiguration(): void {
        if (this._C1 < 0 || this._C2 < 0 || this._C3 < 0) {
            throw new Error('Distance coefficients (C1, C2, C3) must be non-negative');
        }

        if (this._SURVIVORS < 0 || this._SURVIVORS > 1) {
            throw new Error('SURVIVORS must be between 0 and 1 (inclusive)');
        }

        if (this._MUTATION_RATE < 0) {
            throw new Error('MUTATION_RATE must be non-negative');
        }

        if (this._inputNodes <= 0) {
            throw new Error('Number of input nodes must be positive');
        }

        if (this._outputNodes <= 0) {
            throw new Error('Number of output nodes must be positive');
        }

        if (this._maxClients <= 0) {
            throw new Error('Population size (clients) must be positive');
        }

        if (this._PROBABILITY_MUTATE_WEIGHT_RANDOM < 0 || this._PROBABILITY_MUTATE_WEIGHT_RANDOM > 1) {
            console.warn('PROBABILITY_MUTATE_WEIGHT_RANDOM typically should be between 0 and 1');
        }

        if (this.CT > 1000) {
            console.warn(`CT threshold is unusually high: ${this.CT}`);
        }

        if (this._CP > 10) {
            console.warn(`CP threshold is unusually high: ${this._CP}`);
        }

        if (this._MUTATION_RATE > 10) {
            console.warn(`MUTATION_RATE is unusually high: ${this._MUTATION_RATE}`);
        }

        if (this._WEIGHT_SHIFT_STRENGTH > 1) {
            console.warn(
                `WEIGHT_SHIFT_STRENGTH is very high (${this._WEIGHT_SHIFT_STRENGTH}). ` +
                    'Values > 1 can cause oscillations and prevent convergence. Recommended: 0.1-0.3',
            );
        }

        if (this._SURVIVORS > 0.6) {
            console.warn(
                `SURVIVORS is high (${this._SURVIVORS}). ` +
                    'Weak selection pressure may slow evolution. Recommended: 0.3-0.5',
            );
        }

        if (this._PROBABILITY_MUTATE_LINK > 2) {
            console.warn(
                `PROBABILITY_MUTATE_LINK is high (${this._PROBABILITY_MUTATE_LINK}). ` +
                    'This can cause rapid network bloat. Recommended: 0.5-1.5 for most problems',
            );
        }

        if (
            this._WEIGHT_SHIFT_STRENGTH > 0 &&
            this._BIAS_SHIFT_STRENGTH > 0 &&
            Math.abs(this._WEIGHT_SHIFT_STRENGTH - this._BIAS_SHIFT_STRENGTH) / this._WEIGHT_SHIFT_STRENGTH > 0.8
        ) {
            console.warn(
                `WEIGHT_SHIFT_STRENGTH (${this._WEIGHT_SHIFT_STRENGTH}) and ` +
                    `BIAS_SHIFT_STRENGTH (${this._BIAS_SHIFT_STRENGTH}) are highly imbalanced. ` +
                    'Consider using similar values for both.',
            );
        }

        if (this._LAMBDA_HIGH < 0 || this._LAMBDA_LOW < 0) {
            throw new Error('LAMBDA_HIGH and LAMBDA_LOW must be non-negative');
        }

        if (this._LAMBDA_HIGH > 0.8) {
            console.warn(
                `LAMBDA_HIGH is very high (${this._LAMBDA_HIGH}). ` +
                    'Excessive complexity penalty may prevent networks from growing. Recommended: 0.2-0.4',
            );
        }

        if (this._LAMBDA_LOW > 0.5) {
            console.warn(
                `LAMBDA_LOW is high (${this._LAMBDA_LOW}). ` + 'This may restrict exploration. Recommended: 0.05-0.2',
            );
        }

        if (this._EPS < 1e-6 || this._EPS > 1e-2) {
            console.warn(
                `EPS is outside typical range (${this._EPS}). ` +
                    'Recommended: 1e-6 to 1e-3 for meaningful tie-breaking',
            );
        }
    }

    get inputNodes(): number {
        return this._inputNodes;
    }
    get outputNodes(): number {
        return this._outputNodes;
    }

    get PERMANENT_MAIN_CONNECTIONS(): boolean {
        return this._PERMANENT_MAIN_CONNECTIONS;
    }

    get OPT_ERR_THRESHOLD(): number {
        return this._OPT_ERR_THRESHOLD;
    }
    get PRESSURE(): EMutationPressure {
        return this._PRESSURE;
    }

    get optimization(): boolean {
        return this._optimization;
    }

    get clients(): ReadonlyArray<Client> {
        return this._clients;
    }

    get allConnections(): ReadonlyMap<string, ConnectionGene> {
        return this._allConnections;
    }
    get allNodes(): Readonly<RandomHashSet> {
        return this._allNodes;
    }

    get MUTATION_RATE(): number {
        return this._MUTATION_RATE;
    }

    get WEIGHT_SHIFT_STRENGTH(): number {
        return this._WEIGHT_SHIFT_STRENGTH;
    }

    get BIAS_SHIFT_STRENGTH(): number {
        return this._BIAS_SHIFT_STRENGTH;
    }

    get WEIGHT_RANDOM_STRENGTH(): number {
        return this._WEIGHT_RANDOM_STRENGTH;
    }

    get BIAS_RANDOM_STRENGTH(): number {
        return this._BIAS_RANDOM_STRENGTH;
    }

    get PROBABILITY_MUTATE_LINK(): number {
        return this._PROBABILITY_MUTATE_LINK;
    }

    get PROBABILITY_MUTATE_NODES(): number {
        return this._PROBABILITY_MUTATE_NODES;
    }

    get PROBABILITY_MUTATE_WEIGHT_SHIFT(): number {
        return this._PROBABILITY_MUTATE_WEIGHT_SHIFT;
    }

    get PROBABILITY_MUTATE_WEIGHT_RANDOM(): number {
        return this._PROBABILITY_MUTATE_WEIGHT_RANDOM;
    }

    get PROBABILITY_MUTATE_TOGGLE_LINK(): number {
        return this._PROBABILITY_MUTATE_TOGGLE_LINK;
    }

    get CP(): number {
        return this._CP;
    }

    get C1(): number {
        return this._C1;
    }

    get C2(): number {
        return this._C2;
    }

    get C3(): number {
        return this._C3;
    }

    get champion() {
        return this._champion;
    }

    get runnerUp(): Client | null {
        return this._runnerUp;
    }

    reset(inputNodes: number, outputNodes: number) {
        this._inputNodes = inputNodes;
        this._outputNodes = outputNodes;

        this._evolveCounts = 0;
        this._networkScoreRaw = -Infinity;
        this._stagnationCount = 0;

        this._champion = null;
        this._runnerUp = null;
        this._species = [];

        this._optimization = false;
        this._PRESSURE = EMutationPressure.NORMAL;

        this._allConnections.clear();
        this._allNodes.clear();
        this._clients = [];

        for (let i = 0; i < this._inputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = NETWORK_CONSTANTS.INPUT_NODE_X;
            nodeGene.y = (i + 1) / (this._inputNodes + 1);
        }

        for (let i = 0; i < this._outputNodes; i += 1) {
            const nodeGene: NodeGene = this.getNode();
            nodeGene.x = NETWORK_CONSTANTS.OUTPUT_NODE_X;
            nodeGene.y = (i + 1) / (this._outputNodes + 1);
        }
        for (let i = 0; i < this._maxClients; i += 1) {
            const c: Client = new Client(this.emptyGenome(), this._outputActivation, this._hiddenActivation);
            c.generateCalculator();
            this._clients.push(c);
        }
    }

    load(data: LoadData, loadPercent: number) {
        if (!data.genome) {
            throw new Error('Invalid load data: "genome" property is required');
        }
        if (!data.evolveCounts) {
            console.warn('Load data missing "evolveCounts", defaulting to 0');
            this._evolveCounts = 0;
        } else {
            this._evolveCounts = data.evolveCounts;
        }

        data.genome.nodes.forEach((item: NodeSaveData) => {
            const node = this.getNode();
            node.x = item.x;
            node.y = item.y;
        });

        const genome = this.loadGenome(data.genome);

        const getGenome = (ptc: number): Genome => {
            if (data && loadPercent && ptc < loadPercent) return genome;

            return this.emptyGenome();
        };

        for (let i = 0; i < this._maxClients; i += 1) {
            const c: Client = new Client(
                getGenome(i / this._maxClients),
                this._outputActivation,
                this._hiddenActivation,
            );
            this._clients.push(c);
        }
    }

    loadGenome(data: GenomeSaveData) {
        const genome: Genome = new Genome(this);

        const nodeMap = new Map<number, NodeGene>();

        data.nodes.forEach(nodeItem => {
            const node = new NodeGene(nodeItem.innovationNumber);
            node.x = nodeItem.x;
            node.y = nodeItem.y;
            node.bias = nodeItem.bias;

            nodeMap.set(node.innovationNumber, node);
            genome.nodes.add(node);
        });

        data.connections.forEach((con: ConnectionSaveData) => {
            const geneA = nodeMap.get(con.from);
            const geneB = nodeMap.get(con.to);
            if (!geneA || !geneB) return;
            const connectionNode = this.getConnection(geneA, geneB);
            connectionNode.weight = con.weight;
            connectionNode.replaceIndex = con.replaceIndex;
            connectionNode.enabled = con.enabled;
            genome.connections.addSorted(connectionNode);
        });

        return genome;
    }

    save() {
        const bestClient = this._champion?.client ?? this._clients.find(item => item.bestScore) ?? this._clients[0];
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
                const globalReplaceNode = this._allNodes.data.find(node => node.innovationNumber === con.replaceIndex);
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
            evolveCounts: this._evolveCounts,
        };
    }

    setReplaceIndex(node1: NodeGene, node2: NodeGene, index: number) {
        const connectionGene = new ConnectionGene(0, node1, node2);
        const hashKey = connectionGene.getHashKey();
        const foundCon = this._allConnections.get(hashKey);
        if (foundCon) {
            foundCon.replaceIndex = index;
        } else {
            throw new Error('setReplaceIndex to no connection');
        }
    }
    getReplaceIndex(node1: NodeGene, node2: NodeGene): number {
        const connectionGene = new ConnectionGene(0, node1, node2);
        const hashKey = connectionGene.getHashKey();
        const foundCon = this._allConnections.get(hashKey);
        if (!foundCon) return 0;

        return foundCon.replaceIndex;
    }

    emptyGenome(): Genome {
        const genome: Genome = new Genome(this);

        for (let i = 0; i < this._inputNodes + this._outputNodes; i += 1) {
            const global = this.getNode(i + 1);
            const node = new NodeGene(i + 1);

            node.x = global.x;
            node.y = global.y;
            node.bias = 0;

            genome.nodes.add(node);
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
        if (this._allConnections.has(hashKey)) {
            const foundCon = this._allConnections.get(hashKey);
            connectionGene.innovationNumber = foundCon ? foundCon.innovationNumber : 0;
        } else {
            this._allConnections.set(hashKey, connectionGene);
            connectionGene.innovationNumber = this._allConnections.size + 1;
        }

        return connectionGene;
    }

    getNode(id?: number): NodeGene {
        let nodeGene;
        if (id && id <= this._allNodes.size()) {
            nodeGene = this._allNodes.get(id - 1);
            if (!(nodeGene instanceof NodeGene)) {
                throw new Error('getNode returns not a NodeGene');
            }
        } else {
            nodeGene = new NodeGene(this._allNodes.size() + 1);
            this._allNodes.add(nodeGene);
        }

        return nodeGene;
    }

    printSpecies() {
        for (let i = 0; i < this._species.length; i += 1) {
            console.log(this._species[i].score, this._species[i].size());
        }
    }

    calculate(input: Array<number>): Array<number> {
        return (this._champion?.client ?? this._clients[0]).calculate(input) || [];
    }

    /**
     * Train the neural network on the provided dataset.
     * Similar to TensorFlow's model.fit() API.
     *
     * @param xTrain - Training input data (array of input vectors)
     * @param yTrain - Training output data (array of output vectors)
     * @param options - Training options (epochs, errorThreshold, validationSplit, verbose, logInterval)
     * @returns Training history with errors, epochs, and champion
     *
     * @example
     * ```typescript
     * const neat = new Neat(2, 1, 100);
     * const history = neat.fit(
     *   [[0, 0], [0, 1], [1, 0], [1, 1]],
     *   [[0], [1], [1], [0]],
     *   { epochs: 1000, verbose: 1 }
     * );
     * console.log(`Trained in ${history.epochs} epochs`);
     * ```
     */
    fit(xTrain: number[][], yTrain: number[][], options: IFitOptions = {}): IFitHistory {
        // Validate inputs
        if (!xTrain || !yTrain || xTrain.length === 0 || yTrain.length === 0) {
            throw new Error('Training data cannot be empty');
        }

        if (xTrain.length !== yTrain.length) {
            throw new Error(
                `Input and output data must have the same length (got ${xTrain.length} vs ${yTrain.length})`,
            );
        }

        if (xTrain[0].length !== this._inputNodes) {
            throw new Error(`Input dimension mismatch: expected ${this._inputNodes}, got ${xTrain[0].length}`);
        }

        if (yTrain[0].length !== this._outputNodes) {
            throw new Error(`Output dimension mismatch: expected ${this._outputNodes}, got ${yTrain[0].length}`);
        }

        // Parse options with defaults
        const maxEpochs = options.epochs ?? Infinity;
        const errorThreshold = options.errorThreshold ?? this._OPT_ERR_THRESHOLD;
        const validationSplit = options.validationSplit ?? 0;
        const verbose = options.verbose ?? 1;
        const logInterval = options.logInterval ?? 100;

        // Validate options
        if (validationSplit < 0 || validationSplit >= 1) {
            throw new Error('validationSplit must be between 0 and 1 (exclusive)');
        }

        // Split data into training and validation sets
        let trainX = xTrain;
        let trainY = yTrain;
        let valX: number[][] | null = null;
        let valY: number[][] | null = null;

        if (validationSplit > 0) {
            const splitIndex = Math.floor(xTrain.length * (1 - validationSplit));
            trainX = xTrain.slice(0, splitIndex);
            trainY = yTrain.slice(0, splitIndex);
            valX = xTrain.slice(splitIndex);
            valY = yTrain.slice(splitIndex);

            if (trainX.length === 0) {
                throw new Error('Validation split too large, no training data remaining');
            }
        }

        // Initialize history
        const history: IFitHistory = {
            error: [],
            validationError: valX ? [] : undefined,
            epochs: 0,
            champion: null,
            stoppedEarly: false,
        };

        // Training loop
        let epoch = 0;

        while (epoch < maxEpochs) {
            // Evaluate all clients on training data
            let topScore = -Infinity;
            let topClient: Client = this._clients[0];

            for (const client of this._clients) {
                let totalError = 0;

                // Calculate error for each training sample
                for (let i = 0; i < trainX.length; i++) {
                    const output = client.calculate(trainX[i]);
                    const sampleError = output.reduce((sum, val, k) => {
                        return sum + Math.abs(val - trainY[i][k]);
                    }, 0);
                    totalError += sampleError;
                }

                // Normalize error by number of samples and outputs
                client.error = totalError / (trainX.length * this._outputNodes);
                client.score = 1 - client.error;
                // tiny tie-breaker noise (important on flat landscapes)
                client.score += Math.random() * 1e-9;

                if (client.score > topScore) {
                    topScore = client.score;
                    topClient = client;
                }
            }

            const trainError = 1 - topScore;
            history.error.push(trainError);

            // Evaluate on validation set if provided
            let valError: number | undefined;
            if (valX && valY) {
                let totalValError = 0;
                for (let i = 0; i < valX.length; i++) {
                    const output = topClient.calculate(valX[i]);
                    const sampleError = output.reduce((sum, val, k) => {
                        return sum + Math.abs(val - valY[i][k]);
                    }, 0);
                    totalValError += sampleError;
                }
                valError = totalValError / (valX.length * this._outputNodes);
                history.validationError!.push(valError);
            }

            // Logging
            if (verbose === 2 || (verbose === 1 && (epoch % logInterval === 0 || epoch === 0))) {
                const complexity = topClient.genome.connections.size() + topClient.genome.nodes.size();
                let logMsg = `Epoch ${epoch} - error: ${trainError.toFixed(6)} - complexity: ${complexity}`;

                if (valError !== undefined) {
                    logMsg += ` - val_error: ${valError.toFixed(6)}`;
                }

                if (verbose === 2) {
                    logMsg += ` - species: ${this._species.length} - pressure: ${this._PRESSURE}`;
                }

                console.log(logMsg);
            }

            // Check early stopping
            if (trainError <= errorThreshold) {
                // evolve() will not be called, so explicitly
                // capture the final evaluated generation.
                const finalRawBest = this.prepareRawScores();

                this.updateChampion(finalRawBest);

                this.normalizeScore();
                this.updateRunnerUp(this._clients[0]);

                history.stoppedEarly = true;
                history.epochs = epoch;
                history.champion = this._champion?.client ?? finalRawBest;

                if (verbose > 0) {
                    console.log(`✓ Training completed: error threshold reached at epoch ${epoch}`);
                }

                break;
            }

            // Evolve to next generation
            const shouldOptimize = trainError <= this._OPT_ERR_THRESHOLD;
            this.evolve(shouldOptimize);

            epoch++;
        }

        // Training finished (max epochs reached)
        if (!history.stoppedEarly) {
            history.epochs = epoch;
            history.champion = this._champion?.client ?? this._clients[0];

            if (verbose > 0) {
                console.log(`Training completed: max epochs (${maxEpochs}) reached`);
            }
        }

        return history;
    }
    private markBestRawClient(): Client {
        if (this._clients.length === 0) {
            throw new Error('Cannot select the best client from an empty population');
        }

        let bestClient = this._clients[0];

        for (const client of this._clients) {
            client.bestScore = false;

            // Strict raw comparison:
            // no EPS and no complexity tie-break.
            if (client.scoreRaw > bestClient.scoreRaw) {
                bestClient = client;
            }
        }

        bestClient.bestScore = true;

        return bestClient;
    }

    private prepareRawScores(): Client {
        if (this._clients.length === 0) {
            throw new Error('Cannot prepare scores for an empty population');
        }

        for (const client of this._clients) {
            if (!Number.isFinite(client.score)) {
                throw new Error(`Client has a non-finite score: ${client.score}`);
            }

            // tiny tie-breaker noise (important on flat landscapes)
            client.score += Math.random() * 1e-9;
            // Public score is the fitness assigned by fit()
            // or by an external evaluation loop.
            client.scoreRaw = client.score;
            client.adjustedScore = client.scoreRaw;
            client.complexity = client.genome.connections.size() + client.genome.nodes.size();
        }

        return this.markBestRawClient();
    }

    evolve(optimization = false) {
        this._evolveCounts++;

        this._optimization = optimization || this._evolveCounts % this._OPTIMIZATION_PERIOD === 0;

        if (this._clients.length === 0) {
            return;
        }

        // 1. Capture externally assigned objective fitness.
        const currentRawBest = this.prepareRawScores();

        // 2. Preserve the absolute raw champion.
        this.updateChampion(currentRawBest);

        // 3. Produce complexity-adjusted selection scores.
        this.normalizeScore();

        // 4. Preserve the current complexity-aware winner.
        this.updateRunnerUp(this._clients[0]);

        // 5. During strict champion stagnation,
        // return both elites into the population.
        const elitesReinserted = this.reinsertElitesIfStagnant();

        if (elitesReinserted) {
            // Recalculate generation-relative scores after
            // changing the population.
            this.normalizeScore();
        }

        this.genSpecies();
        this.kill();
        this.removeExtinct();
        this.reproduce();
        this.mutate();

        for (const client of this._clients) {
            client.generateCalculator();
        }
    }

    private mutate() {
        for (let i = 0; i < this._clients.length; i += 1) {
            this._clients[i].mutate(this._evolveCounts === 1);
        }
    }

    private reproduce() {
        const selector = new RandomSelector(this._SURVIVORS);
        for (let i = 0; i < this._species.length; i += 1) {
            selector.add(this._species[i]);
        }
        for (let i = 0; i < this._clients.length; i += 1) {
            const c = this._clients[i];
            if (c.species === null) {
                const s = selector.random();
                if (this._PRESSURE === EMutationPressure.PANIC && this._champion) {
                    const emptyGenome = this.emptyGenome();
                    emptyGenome.mutate();
                    c.genome =
                        Math.random() > 0.5
                            ? Genome.crossOver(this._champion?.client.genome, emptyGenome)
                            : emptyGenome;
                    c.genome.mutate();
                    c.genome.mutate();
                } else {
                    c.genome = s.breed();
                }
                s.put(c, true);
            }
        }
        selector.reset();

        if (this._species.length < 8) this._CP *= 0.95;
        else if (this._species.length > 25) this._CP *= 1.05;
    }

    private removeExtinct() {
        for (let i = this._species.length - 1; i >= 0; i--) {
            if (this._species[i].size() <= 1 && !this._species[i].clients[0]?.bestScore && this._species.length > 1) {
                this._species[i].goExtinct();
                this._species.splice(i, 1);
            }
        }
    }

    private kill() {
        for (let i = 0; i < this._species.length; i += 1) {
            this._species[i].kill(this._SURVIVORS);
        }
    }

    private genSpecies() {
        for (let i = 0; i < this._species.length; i += 1) {
            this._species[i].reset();
        }
        for (let i = 0; i < this._clients.length; i += 1) {
            const c = this._clients[i];
            if (c.species !== null) {
                continue;
            }

            let found = false;
            for (let k = 0; k < this._species.length; k += 1) {
                const s = this._species[k];
                if (s.put(c)) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this._species.push(new Species(c));
            }
        }
        for (let i = 0; i < this._species.length; i += 1) {
            this._species[i].evaluateScore();
        }
    }

    private normalizeScore(): void {
        if (this._clients.length === 0) {
            return;
        }

        let rawMax = -Infinity;
        let rawMin = Infinity;
        let maxComplexity = 0;

        for (const client of this._clients) {
            rawMax = Math.max(rawMax, client.scoreRaw);
            rawMin = Math.min(rawMin, client.scoreRaw);
            maxComplexity = Math.max(maxComplexity, client.complexity);
        }

        const rawSpan = rawMax - rawMin;
        const effectiveSpan = Math.max(rawSpan, 0.05);

        const lambda = this._optimization ? this._LAMBDA_HIGH : this._LAMBDA_LOW;

        for (const client of this._clients) {
            const complexityNorm = maxComplexity > 0 ? Math.log1p(client.complexity) / Math.log1p(maxComplexity) : 0;

            const complexityPenalty = lambda * complexityNorm * effectiveSpan;

            client.adjustedScore = client.scoreRaw - complexityPenalty;
        }

        let adjustedMax = -Infinity;
        let adjustedMin = Infinity;

        for (const client of this._clients) {
            adjustedMax = Math.max(adjustedMax, client.adjustedScore);

            adjustedMin = Math.min(adjustedMin, client.adjustedScore);
        }

        const adjustedSpan = adjustedMax - adjustedMin;

        for (const client of this._clients) {
            client.score = adjustedSpan <= this._EPS ? 1 : (client.adjustedScore - adjustedMin) / adjustedSpan;
        }

        // Best complexity-adjusted clients first.
        this._clients.sort((a, b) => {
            const scoreDifference = b.score - a.score;

            if (Math.abs(scoreDifference) > this._EPS) {
                return scoreDifference;
            }

            return a.complexity - b.complexity;
        });
    }

    private updateStagnationAndPressure(currentBestComplexity: number): void {
        if (!this._champion) {
            return;
        }

        if (!Number.isFinite(this._networkScoreRaw)) {
            this._networkScoreRaw = this._champion.scoreRaw;

            this._stagnationCount = 0;
        } else {
            const accumulatedGain = this._champion.scoreRaw - this._networkScoreRaw;

            if (accumulatedGain <= this._OPT_ERR_THRESHOLD) {
                this._stagnationCount++;
            } else {
                this._networkScoreRaw = this._champion.scoreRaw;

                this._stagnationCount = 0;
            }
        }

        this._champion.scoreHistory.push(this._champion.scoreRaw);

        this._champion.complexityHistory.push(currentBestComplexity);

        if (this._champion.scoreHistory.length > HISTORY_WINDOW) {
            this._champion.scoreHistory.shift();
        }

        if (this._champion.complexityHistory.length > HISTORY_WINDOW) {
            this._champion.complexityHistory.shift();
        }

        const canCompact =
            this._stagnationCount > HISTORY_WINDOW &&
            this._champion.scoreHistory.length >= 2 &&
            this._champion.complexityHistory.length >= 2;

        if (canCompact) {
            const scoreHistory = this._champion.scoreHistory;

            const complexityHistory = this._champion.complexityHistory;

            const firstScore = scoreHistory[0];
            const bestScore = Math.max(...scoreHistory);

            const gain = bestScore - firstScore;

            const firstComplexity = complexityHistory[0];

            const currentComplexity = complexityHistory[complexityHistory.length - 1];

            const complexityGrowth = currentComplexity - firstComplexity;

            const complexityGrowthRatio =
                firstComplexity > 0 ? complexityGrowth / firstComplexity : complexityGrowth > 0 ? 1 : 0;

            const growingMeaningfully =
                complexityGrowth >= COMPLEXITY_GROWTH_ABS || complexityGrowthRatio >= COMPLEXITY_GROWTH_RATIO;

            const tinyProgress = gain <= SMALL_GAIN_THRESHOLD;

            if (growingMeaningfully && tinyProgress) {
                this._PRESSURE = EMutationPressure.COMPACT;

                this._optimization = true;

                return;
            }
        }

        if (this._stagnationCount > 405) {
            this._stagnationCount = 200;
        } else if (this._stagnationCount > 400) {
            this._PRESSURE = EMutationPressure.PANIC;
        } else if (this._stagnationCount > 200) {
            this._PRESSURE = EMutationPressure.ESCAPE;
        } else if (this._stagnationCount > 80) {
            this._PRESSURE = EMutationPressure.BOOST;
        } else {
            this._PRESSURE = EMutationPressure.NORMAL;
        }
    }

    private reinsertElitesIfStagnant(): boolean {
        if (this._champion === null || this._champion.epoch < this._OPTIMIZATION_PERIOD || this._clients.length === 0) {
            return false;
        }

        const elites: Client[] = [this._champion.client];

        if (this._runnerUp !== null) {
            elites.push(this._runnerUp);
        }

        const insertCount = Math.min(elites.length, this._clients.length);

        for (let i = 0; i < insertCount; i++) {
            // Population is currently sorted by
            // normalized selection score.
            const targetIndex = this._clients.length - 1 - i;

            const replacedClient = this._clients[targetIndex];

            if (replacedClient.species !== null) {
                replacedClient.species = null;
            }

            const eliteCopy = this.copyClient(elites[i]);

            eliteCopy.bestScore = false;

            this._clients[targetIndex] = eliteCopy;
        }

        this._champion.epoch = 0;

        // Champion may now be the strongest raw client
        // in the current population.
        this.markBestRawClient();

        return true;
    }

    private updateRunnerUp(selectionBest: Client): void {
        // Snapshot of the current generation's
        // best complexity-adjusted client.
        this._runnerUp = this.copyClient(selectionBest);

        this._runnerUp.bestScore = false;
    }

    private copyClient(client: Client): Client {
        const copiedClient = new Client(
            this.loadGenome(client.genome.save()),
            this._outputActivation,
            this._hiddenActivation,
        );

        copiedClient.score = client.score;
        copiedClient.scoreRaw = client.scoreRaw;
        copiedClient.adjustedScore = client.adjustedScore;
        copiedClient.complexity = client.complexity;

        copiedClient.error = client.error;
        copiedClient.bestScore = false;

        // Champion and runnerUp may be used outside evolve().
        copiedClient.generateCalculator();

        return copiedClient;
    }

    private updateChampion(currentBest: Client): void {
        const shouldReplace = this._champion === null || currentBest.scoreRaw > this._champion.scoreRaw;

        if (shouldReplace) {
            const scoreHistory = this._champion?.scoreHistory ?? [];

            const complexityHistory = this._champion?.complexityHistory ?? [];

            this._champion = {
                client: this.copyClient(currentBest),
                scoreRaw: currentBest.scoreRaw,
                complexity: currentBest.complexity,
                scoreHistory,
                complexityHistory,
                epoch: 0,
            };
        } else {
            this._champion!.epoch++;
        }

        this.updateStagnationAndPressure(currentBest.complexity);
    }
}
