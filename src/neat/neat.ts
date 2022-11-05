import { ConnectionGene, Genome, NodeGene } from '../genome';
import { RandomHashSet, RandomSelector } from '../dataStructures';
import { Client } from './client';
import { Species } from './species';

interface NeatParams {
    C1?: number;
    C2?: number;
    C3?: number;
    CT?: number;
    CP?: number;
    SURVIVORS?: number;
    WEIGHT_SHIFT_STRENGTH?: number;
    WEIGHT_RANDOM_STRENGTH?: number;
    PROBABILITY_MUTATE_WEIGHT_SHIFT?: number;
    PROBABILITY_MUTATE_TOGGLE_LINK?: number;
    PROBABILITY_MUTATE_WEIGHT_RANDOM?: number;
    PROBABILITY_MUTATE_LINK?: number;
    PROBABILITY_MUTATE_NODES?: number;
    OPT_ERR_TRASHHOLD?: number;
}

export class Neat {
    static get MAX_NODES(): number {
        return Math.pow(2, 20);
    }

    #C1 = 1;
    #C2 = 1;
    #C3 = 0.1;

    #CP: number;
    #CT: number;

    #SURVIVORS: number;

    #WEIGHT_SHIFT_STRENGTH: number;
    #WEIGHT_RANDOM_STRENGTH: number;

    #PROBABILITY_MUTATE_WEIGHT_SHIFT: number;
    #PROBABILITY_MUTATE_TOGGLE_LINK: number;
    #PROBABILITY_MUTATE_WEIGHT_RANDOM: number;
    #PROBABILITY_MUTATE_LINK: number;
    #PROBABILITY_MUTATE_NODES: number;

    #OPT_ERR_TRASHHOLD: number;

    #inputNodes = 0;
    #outputNodes = 0;
    #maxClients = 0;

    #evolveCounts = 0;

    #clients: Array<Client> = [];
    #species: Array<Species> = [];

    #allConnections: Map<string, ConnectionGene> = new Map<string, ConnectionGene>();
    #allNodes: RandomHashSet = new RandomHashSet();

    #optimization = false;

    #outputActivation: string;

    constructor(
        inputNodes: number,
        outputNodes: number,
        clients: number,
        outputActivation = 'sigmoid',
        params: NeatParams,
        loadData?: object
    ) {
        this.#C1 = params.C1 || 1;
        this.#C2 = params.C2 || 1;
        this.#C3 = params.C3 || 0.1;

        this.#CT = params.CT || inputNodes * outputNodes;
        this.#CP = params.CP || (inputNodes * outputNodes) / 10;

        this.#SURVIVORS = params.SURVIVORS || 0.8;
        this.#WEIGHT_SHIFT_STRENGTH = params.WEIGHT_SHIFT_STRENGTH || 5;
        this.#WEIGHT_RANDOM_STRENGTH = params.WEIGHT_RANDOM_STRENGTH || 10;
        this.#PROBABILITY_MUTATE_WEIGHT_SHIFT = params.PROBABILITY_MUTATE_WEIGHT_SHIFT || 4;
        this.#PROBABILITY_MUTATE_TOGGLE_LINK = params.PROBABILITY_MUTATE_TOGGLE_LINK || 0.5;
        this.#PROBABILITY_MUTATE_WEIGHT_RANDOM = params.PROBABILITY_MUTATE_WEIGHT_RANDOM || 0.2;
        this.#PROBABILITY_MUTATE_LINK = params.PROBABILITY_MUTATE_LINK || 0.05;
        this.#PROBABILITY_MUTATE_NODES = params.PROBABILITY_MUTATE_NODES || 0.05;
        this.#OPT_ERR_TRASHHOLD = params.OPT_ERR_TRASHHOLD || 0.005;

        this.#outputActivation = outputActivation;
        this.#inputNodes = inputNodes;
        this.#outputNodes = outputNodes;
        this.#maxClients = clients;

        if (loadData) {
            this.load(loadData);
        } else {
            this.reset(inputNodes, outputNodes);
        }
    }

    get OPT_ERR_TRASHHOLD(): number {
        return this.#OPT_ERR_TRASHHOLD;
    }

    get optimization(): boolean {
        return this.#optimization;
    }

    get clients(): Array<Client> {
        return this.#clients;
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
            const c: Client = new Client(this.emptyGenome(), this.#outputActivation);
            c.generateCalculator();
            this.#clients.push(c);
        }
    }

    load(data: any) {
        if (!data.allNodes) {
            console.log('wrong data to load: "allNodes" missed');
            return;
        }
        if (!data.genome) {
            console.log('wrong data to load: "genome" missed');
            return;
        }

        data.allNodes.forEach((item: any) => {
            const node = this.getNode();
            node.x = item.x;
            node.y = item.y;
        });

        for (let i = 0; i < this.#maxClients; i += 1) {
            const c: Client = new Client(this.loadGenome(data.genome), this.#outputActivation);
            c.generateCalculator();
            this.#clients.push(c);
        }
    }

    loadGenome(data: any) {
        const genome: Genome = new Genome(this);
        data.nodes.forEach((innovationNumber: number) => {
            const node = this.getNode(innovationNumber);
            genome.nodes.add(node);
        });

        data.connections.forEach((con: any) => {
            const geneA = this.getNode(con.from);
            const geneB = this.getNode(con.to);
            const node = this.getConnection(geneA, geneB);
            node.weight = con.weight;
            node.replaceIndex = con.replaceIndex;
            node.enabled = con.enabled;
            genome.connections.addSorted(node);
        });

        return genome;
    }

    save() {
        const bestClient = this.#clients.find(item => item.bestScore) || this.#clients[0];
        const genome = bestClient.genome.save();
        const allNodes: Array<any> = [];
        genome.nodes.forEach(id => {
            const found = this.#allNodes.data.find(item => {
                return item.innovationNumber === id;
            });
            if (found && found instanceof NodeGene) {
                allNodes.push({
                    innovationNumber: found.innovationNumber,
                    x: found.x,
                    y: found.y,
                });
            }
        });
        genome.connections.forEach(con => {
            if (!con || con.replaceIndex === 0) {
                return;
            }
            if (!genome.nodes.find(item => item === con.replaceIndex)) {
                con.replaceIndex = 0;
            }
        });
        genome.nodes.forEach((id, index) => {
            const trueIndex = index + 1;
            if (id !== trueIndex) {
                allNodes.find(item => {
                    return item.innovationNumber === id;
                }).innovationNumber = trueIndex;
                genome.connections.forEach(con => {
                    if (!con) {
                        return;
                    }
                    if (con.from === id) {
                        con.from = trueIndex;
                    } else if (con.to === id) {
                        con.to = trueIndex;
                    } else if (con.replaceIndex === id) {
                        con.replaceIndex = trueIndex;
                    }
                });
            }
            genome.nodes[index] = trueIndex;
        });
        return {
            genome,
            allNodes,
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

    evolve(optimization = false) {
        this.#evolveCounts++;
        this.#optimization = optimization || this.#evolveCounts % 10 === 0;
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
            this.#clients[i].mutate();
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
            if (this.#species[i].size() <= 1 && !this.#species[i].clients[0].bestScore && this.#species.length > 1) {
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
            this.#species[i].evaluateScore(this.optimization);
        }
    }

    #normalizeScore() {
        let maxScore = 0;
        const bestScoreSet = [];
        let minScore = Infinity;

        for (let i = 0; i < this.#clients.length; i += 1) {
            const item = this.#clients[i];
            item.bestScore = false;
            maxScore = item.score > maxScore ? item.score : maxScore;
            minScore = item.score < minScore ? item.score : minScore;
        }

        for (let i = 0; i < this.#clients.length; i += 1) {
            const item = this.#clients[i];
            if (item.score === maxScore) {
                bestScoreSet.push(i);
                item.bestScore = true;
                item.score = 1;
            } else if (item.score === minScore) {
                item.score = 0;
            } else {
                item.score = (item.score - minScore) / (maxScore - minScore);
            }
        }

        if (bestScoreSet.length > 1) {
            bestScoreSet.forEach((i, index) => {
                if (index === 0) return;
                this.#clients[i].bestScore = false;
            });
        }

        const cof = this.#optimization ? 0.01 : 0.0001;

        this.#clients.forEach(item => {
            const allCons = item.genome.connections.size();
            item.score -= Math.sqrt(Math.sqrt(allCons)) * cof;
        });
    }
}
