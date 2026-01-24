import { RandomHashSet } from '../dataStructures/index.js';
import { Neat } from '../neat/index.js';
import { ConnectionGene } from './connectionGene.js';
import { NodeGene } from './nodeGene.js';
import { MUTATION_CONSTANTS, NETWORK_CONSTANTS } from '../neat/constants.js';

export type NodeSaveData = {
    innovationNumber: number;
    x: number;
    y: number;
};

export type ConnectionSaveData = {
    replaceIndex: number;
    enabled: boolean;
    weight: number;
    from: number;
    to: number;
};

export interface GenomeSaveData {
    nodes: NodeSaveData[];
    connections: ConnectionSaveData[];
}

export class Genome {
    #connections: RandomHashSet = new RandomHashSet();
    #nodes: RandomHashSet = new RandomHashSet();
    #neat: Neat;
    #optErrThreshold: number;
    #selfOpt = false;
    #mutationPressure = 1;

    constructor(neat: Neat) {
        this.#neat = neat;
        this.#optErrThreshold = neat.OPT_ERR_THRESHOLD;
    }

    get selfOpt(): boolean {
        return this.#selfOpt;
    }

    get optErrThreshold(): number {
        return this.#optErrThreshold;
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

    save(): GenomeSaveData {
        const nodes: NodeSaveData[] = [];
        this.#nodes.data.forEach(item => {
            if (!(item instanceof NodeGene)) return;
            nodes.push({
                innovationNumber: item.innovationNumber,
                x: item.x,
                y: item.y,
            });
        });
        const connections: ConnectionSaveData[] = [];
        this.#connections.data.forEach(item => {
            if (!(item instanceof ConnectionGene)) return;

            connections.push({
                replaceIndex: item.replaceIndex,
                enabled: item.enabled,
                weight: item.weight,
                from: item.from.innovationNumber,
                to: item.to.innovationNumber,
            });
        });
        return {
            nodes,
            connections,
        };
    }

    distance(g2: Genome): number {
        let g1: Genome = this;

        const higGene1: ConnectionGene | NodeGene = g1.connections.get(g1.connections.size() - 1);
        const higGene2: ConnectionGene | NodeGene = g2.connections.get(g2.connections.size() - 1);

        const higInnovationG1 = higGene1 instanceof ConnectionGene ? higGene1.innovationNumber : 0;
        const higInnovationG2 = higGene2 instanceof ConnectionGene ? higGene2.innovationNumber : 0;
        if (higInnovationG1 < higInnovationG2) {
            const tempG = g1;
            g1 = g2;
            g2 = tempG;
        }

        let indexG1 = 0;
        let indexG2 = 0;

        let disjoint = 0;
        let weightDiff = 0;
        let similar = 0;
        while (indexG1 < g1.connections.size() && indexG2 < g2.connections.size()) {
            const gene1: ConnectionGene | NodeGene = g1.connections.get(indexG1);
            const gene2: ConnectionGene | NodeGene = g2.connections.get(indexG2);
            if (!(gene1 instanceof ConnectionGene) || !(gene2 instanceof ConnectionGene)) {
                throw new Error('gene is not a ConnectionGene');
            }
            const inn1: number = gene1.innovationNumber;
            const inn2: number = gene2.innovationNumber;

            if (inn1 > inn2) {
                indexG2++;
                disjoint++;
            } else if (inn1 < inn2) {
                indexG1++;
                disjoint++;
            } else {
                indexG1++;
                indexG2++;
                similar++;
                weightDiff += Math.abs(gene1.weight - gene2.weight);
            }
        }

        let indexNode1 = 0;
        let indexNode2 = 0;
        while (indexNode1 < g1.nodes.size() && indexNode2 < g2.nodes.size()) {
            const node1: ConnectionGene | NodeGene = g1.nodes.get(indexNode1);
            const node2: ConnectionGene | NodeGene = g2.nodes.get(indexNode2);
            if (!(node1 instanceof NodeGene) || !(node2 instanceof NodeGene)) {
                throw new Error('node is not a NodeGene');
            }
            const inn1: number = node1.innovationNumber;
            const inn2: number = node2.innovationNumber;

            if (inn1 > inn2) {
                indexNode2++;
                disjoint++;
            } else if (inn1 < inn2) {
                indexNode1++;
                disjoint++;
            } else {
                indexNode1++;
                indexNode2++;
                similar++;
                weightDiff += Math.abs(node1.bias - node2.bias);
            }
        }

        weightDiff /= similar || 1;

        const excess = g1.connections.size() - indexG1 + g1.nodes.size() - indexNode1;
        let N = Math.max(g1.connections.size(), g2.connections.size());
        N = N < this.#neat.CT ? 1 : N;

        return (this.#neat.C1 * excess) / N + (this.#neat.C2 * disjoint) / N + this.#neat.C3 * weightDiff;
    }

    static crossOver(g1: Genome, g2: Genome): Genome {
        const genome: Genome = g1.neat.emptyGenome();

        let indexG1 = 0;
        let indexG2 = 0;

        while (indexG1 < g1.connections.size() && indexG2 < g2.connections.size()) {
            const gene1 = g1.connections.get(indexG1);
            const gene2 = g2.connections.get(indexG2);
            if (!(gene1 instanceof ConnectionGene) || !(gene2 instanceof ConnectionGene)) {
                throw new Error('gene is not a ConnectionGene');
            }
            const inn1: number = gene1.innovationNumber;
            const inn2: number = gene2.innovationNumber;
            let addedCon: ConnectionGene | null = null;
            if (inn1 > inn2) {
                indexG2++;
            } else if (inn1 < inn2) {
                if (!g1.selfOpt || !genome.neat.optimization || gene1.enabled) {
                    addedCon = Neat.getConnection(gene1);
                }
                indexG1++;
            } else {
                if ((!g1.selfOpt && !g2.selfOpt) || !genome.neat.optimization || (gene1.enabled && gene2.enabled)) {
                    if (Math.random() > MUTATION_CONSTANTS.CROSSOVER_GENE_SELECTION_THRESHOLD) {
                        addedCon = Neat.getConnection(gene1);
                    } else {
                        addedCon = Neat.getConnection(gene2);
                    }
                }
                indexG1++;
                indexG2++;
            }
            if (!(addedCon instanceof ConnectionGene)) {
                continue;
            }
            genome.connections.addSorted(addedCon);
        }
        while (indexG1 < g1.connections.size()) {
            const gene1 = g1.connections.get(indexG1);
            if (!(gene1 instanceof ConnectionGene)) {
                throw new Error('gene is not a ConnectionGene');
            }

            if (!g1.neat.optimization || gene1.enabled) {
                genome.connections.addSorted(Neat.getConnection(gene1));
            }
            indexG1++;
        }
        for (let i = 0; i < genome.connections.data.length; i++) {
            const conn = genome.connections.get(i);
            if (!(conn instanceof ConnectionGene)) {
                throw new Error('gene is not a ConnectionGene');
            }
            genome.nodes.add(conn.from);
            genome.nodes.add(conn.to);
        }

        return genome;
    }

    removeConnection(con: ConnectionGene, replace = false, down = true, up = true) {
        if (
            this.#neat.PERMANENT_MAIN_CONNECTIONS &&
            con.from.x === NETWORK_CONSTANTS.INPUT_NODE_X &&
            con.to.x === NETWORK_CONSTANTS.OUTPUT_NODE_X
        ) {
            return;
        }
        this.#connections.remove(con);
        let singleFrom = true;
        let singleTo = true;
        if (!replace) {
            for (let i = 0; i < this.#connections.size(); i += 1) {
                const c = this.#connections.get(i);
                if (!(c instanceof ConnectionGene)) continue;

                if (singleFrom && c.from.innovationNumber === con.from.innovationNumber) {
                    singleFrom = false;
                }
                if (singleTo && c.to.innovationNumber === con.to.innovationNumber) {
                    singleTo = false;
                }
                if (!singleFrom && !singleTo) {
                    break;
                }
            }
        }

        if (con.from.x !== NETWORK_CONSTANTS.INPUT_NODE_X && singleFrom && !replace && down) {
            const removingFrom = [];
            for (let i = 0; i < this.#connections.size(); i += 1) {
                const c = this.#connections.get(i);
                if (!(c instanceof ConnectionGene)) continue;
                if (c.to.innovationNumber === con.from.innovationNumber) {
                    removingFrom.push(c);
                }
            }
            this.#nodes.remove(con.from);
            removingFrom.forEach(c => {
                this.removeConnection(c, false, true, false);
            });
        }
        if (con.to.x !== NETWORK_CONSTANTS.OUTPUT_NODE_X && singleTo && !replace && up) {
            const removingTo = [];
            for (let i = 0; i < this.#connections.size(); i += 1) {
                const c = this.#connections.get(i);
                if (!(c instanceof ConnectionGene)) continue;
                if (c.from.innovationNumber === con.to.innovationNumber) {
                    removingTo.push(c);
                }
            }
            this.#nodes.remove(con.to);
            removingTo.forEach(c => {
                this.removeConnection(c, false, false, true);
            });
        }
    }

    mutateLink(): ConnectionGene | null {
        let geneA = this.#nodes.randomElement();
        let geneB = this.#nodes.randomElement();

        if (!(geneA instanceof NodeGene) || !(geneB instanceof NodeGene)) {
            return null;
        }
        let triesCount = 0;
        while (geneB instanceof NodeGene && geneA.x === geneB.x) {
            triesCount += 1;
            if (triesCount > 10) {
                return null;
            }
            geneB = this.#nodes.randomElement();
        }

        if (!(geneB instanceof NodeGene)) {
            return null;
        }

        if (geneA.x > geneB.x) {
            const temp = geneA;
            geneA = geneB;
            geneB = temp;
        }
        let exists = false;
        this.#connections.data.forEach(item => {
            if (item instanceof NodeGene) return;
            if (item.from === geneA && item.to === geneB) {
                exists = true;
            }
        });
        if (exists) {
            return null;
        }

        const con: ConnectionGene = this.#neat.getConnection(geneA, geneB);
        con.weight = (Math.random() * 2 - 1) * this.#neat.WEIGHT_RANDOM_STRENGTH;

        this.#connections.addSorted(con);
        return con;
    }

    mutateNode(): NodeGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }

        const from: NodeGene = con.from;
        const to: NodeGene = con.to;
        const replaceIndex = this.#neat.getReplaceIndex(from, to);
        let middle: NodeGene;
        const middleX = (from.x + to.x) / 2;
        let middleY =
            (from.y + to.y) / 2 +
            Math.random() * NETWORK_CONSTANTS.NODE_Y_VARIATION -
            NETWORK_CONSTANTS.NODE_Y_VARIATION / 2;
        middleY =
            middleY < NETWORK_CONSTANTS.NODE_Y_MIN
                ? NETWORK_CONSTANTS.NODE_Y_MIN
                : middleY > NETWORK_CONSTANTS.NODE_Y_MAX
                  ? NETWORK_CONSTANTS.NODE_Y_MAX
                  : middleY;
        if (middleX <= NETWORK_CONSTANTS.MIN_MIDDLE_X) {
            return null;
        }
        if (replaceIndex === 0) {
            middle = this.#neat.getNode();
            middle.x = middleX;
            middle.y = middleY;
            this.#neat.setReplaceIndex(from, to, middle.innovationNumber);
        } else {
            middle = this.#neat.getNode(replaceIndex);
            middle.x = middle.x || middleX;
            middle.y = middle.y || middleY;
        }

        const con1: ConnectionGene = this.#neat.getConnection(from, middle);
        const con2: ConnectionGene = this.#neat.getConnection(middle, to);
        let exists1 = false;
        let exists2 = false;
        this.#connections.data.forEach(item => {
            if (item instanceof NodeGene) return;
            if (item.from === from && item.to === middle) {
                exists1 = true;
            }
            if (item.from === middle && item.to === to) {
                exists2 = true;
            }
        });
        if (!exists1) {
            con1.weight = 1;
            con2.weight = con.weight;
            this.#connections.addSorted(con1);
        }
        if (!exists2) {
            con2.enabled = con.enabled;
            this.#connections.addSorted(con2);
        }
        this.#nodes.add(middle);

        if (!exists1 || !exists2) {
            con.enabled = false;
            this.removeConnection(con, true);
        }

        return middle;
    }

    #mutateWeightShiftNode(): NodeGene | null {
        let counter = 0;
        let node;
        // Skip only input nodes (they receive direct input values, bias is not meaningful)
        // Output and hidden nodes can have bias mutations
        while ((!(node instanceof NodeGene) || node.x === NETWORK_CONSTANTS.INPUT_NODE_X) && counter < 10) {
            counter++;
            node = this.#nodes.randomElement();
        }
        if (counter >= 10) {
            return null;
        }
        counter = 0;
        if (!(node instanceof NodeGene)) {
            return null;
        }
        let newWeight = node.bias;
        while (newWeight === node.bias && counter < 10) {
            counter++;
            newWeight = node.bias + (Math.random() * 2 - 1) * this.#neat.BIAS_SHIFT_STRENGTH * this.#mutationPressure;
        }
        if (counter >= 10) {
            newWeight = 0;
        }
        node.bias = newWeight;
        return node;
    }

    #mutateWeightShiftConnection(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }
        let newWeight = con.weight;
        let counter = 0;
        while (newWeight === con.weight && counter < 10) {
            counter++;
            newWeight =
                con.weight + (Math.random() * 2 - 1) * this.#neat.WEIGHT_SHIFT_STRENGTH * this.#mutationPressure;
        }
        if (counter >= 10) {
            newWeight = 0;
        }
        con.weight = newWeight;
        return con;
    }

    mutateWeightShift(): void {
        this.#mutateWeightShiftConnection();
        this.#mutateWeightShiftNode();
    }

    #mutateWeightRandomNode(): NodeGene | null {
        let counter = 0;
        let node;
        // Skip only input nodes (they receive direct input values, bias is not meaningful)
        // Output and hidden nodes can have bias mutations
        while ((!(node instanceof NodeGene) || node.x === NETWORK_CONSTANTS.INPUT_NODE_X) && counter < 10) {
            counter++;
            node = this.#nodes.randomElement();
        }
        if (counter >= 10) {
            return null;
        }
        counter = 0;
        if (!(node instanceof NodeGene)) {
            return null;
        }

        let newWeight = node.bias || this.#neat.BIAS_RANDOM_STRENGTH;
        while (newWeight === node.bias) {
            newWeight = (Math.random() * newWeight * 2 - newWeight) * this.#neat.BIAS_RANDOM_STRENGTH;
        }
        node.bias = newWeight;
        return node;
    }

    #mutateWeightRandomConnection(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }

        let newWeight = con.weight || this.#neat.WEIGHT_RANDOM_STRENGTH;
        while (newWeight === con.weight) {
            newWeight = (Math.random() * newWeight * 2 - newWeight) * this.#neat.WEIGHT_RANDOM_STRENGTH;
        }
        con.weight = newWeight;
        return con;
    }

    mutateWeightRandom(): void {
        this.#mutateWeightRandomConnection();
        this.#mutateWeightRandomNode();
    }

    mutateLinkToggle(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }
        if (!this.#selfOpt || con.enabled) {
            con.enabled = !con.enabled;
        }
        return con;
    }

    #pruneDeadGraph() {
        const nodes = this.nodes.data.filter(n => n instanceof NodeGene) as NodeGene[];
        const cons = this.connections.data.filter(c => c instanceof ConnectionGene) as ConnectionGene[];

        const nodeById = new Map<number, NodeGene>();
        for (const n of nodes) nodeById.set(n.innovationNumber, n);

        const out = new Map<number, number[]>();
        const inc = new Map<number, number[]>();

        const enabledCons: ConnectionGene[] = [];
        for (const c of cons) {
            if (!c.enabled) continue;
            const fromId = c.from.innovationNumber;
            const toId = c.to.innovationNumber;

            if (!nodeById.has(fromId) || !nodeById.has(toId)) continue;

            enabledCons.push(c);

            if (!out.has(fromId)) out.set(fromId, []);
            out.get(fromId)!.push(toId);

            if (!inc.has(toId)) inc.set(toId, []);
            inc.get(toId)!.push(fromId);
        }

        const inputIds = nodes.filter(n => n.x <= NETWORK_CONSTANTS.INPUT_THRESHOLD_X).map(n => n.innovationNumber);

        const outputIds = nodes.filter(n => n.x >= NETWORK_CONSTANTS.OUTPUT_THRESHOLD_X).map(n => n.innovationNumber);

        const forward = new Set<number>();
        const q1 = [...inputIds];
        for (const id of q1) forward.add(id);

        while (q1.length) {
            const cur = q1.pop()!;
            const next = out.get(cur);
            if (!next) continue;
            for (const to of next) {
                if (!forward.has(to)) {
                    forward.add(to);
                    q1.push(to);
                }
            }
        }

        const backward = new Set<number>();
        const q2 = [...outputIds];
        for (const id of q2) backward.add(id);

        while (q2.length) {
            const cur = q2.pop()!;
            const prev = inc.get(cur);
            if (!prev) continue;
            for (const from of prev) {
                if (!backward.has(from)) {
                    backward.add(from);
                    q2.push(from);
                }
            }
        }

        const aliveNodes = new Set<number>();
        for (const id of forward) {
            if (backward.has(id)) aliveNodes.add(id);
        }
        for (const id of inputIds) aliveNodes.add(id);
        for (const id of outputIds) aliveNodes.add(id);

        for (let i = this.connections.size() - 1; i >= 0; i--) {
            const c = this.connections.get(i);
            if (!(c instanceof ConnectionGene)) continue;

            const fromId = c.from.innovationNumber;
            const toId = c.to.innovationNumber;

            if (!aliveNodes.has(fromId) || !aliveNodes.has(toId)) {
                this.removeConnection(c);
            }
        }

        for (let i = this.nodes.size() - 1; i >= 0; i--) {
            const n = this.nodes.get(i);
            if (!(n instanceof NodeGene)) continue;

            const id = n.innovationNumber;
            const isInput = n.x <= NETWORK_CONSTANTS.INPUT_THRESHOLD_X;
            const isOutput = n.x >= NETWORK_CONSTANTS.OUTPUT_THRESHOLD_X;

            if (!isInput && !isOutput && !aliveNodes.has(id)) {
                this.nodes.remove(n);
            }
        }
    }

    optimization() {
        this.#pruneDeadGraph();
    }

    mutate(selfOpt = false, mutationPressure = 1) {
        this.#mutationPressure = mutationPressure ?? 1;
        this.#selfOpt = selfOpt;
        const optimize = this.#selfOpt || this.#neat.optimization;
        if (optimize) {
            this.optimization();
        }
        let prob: number;

        if ((!selfOpt && !this.#neat.optimization) || this.#connections.size() < this.#neat.CT) {
            prob = this.#neat.PROBABILITY_MUTATE_LINK * this.#neat.MUTATION_RATE * this.#mutationPressure;
            prob = this.#connections.size() < this.#neat.CT ? this.#neat.CT : prob;
            if (optimize) {
                prob = prob > 1 ? 1 : prob;
            }
            while (prob > Math.random()) {
                prob--;
                this.mutateLink();
            }

            prob = this.#neat.PROBABILITY_MUTATE_NODES * this.#neat.MUTATION_RATE * this.#mutationPressure;
            if (optimize) {
                prob = prob > 1 ? 1 : prob;
            }
            while (prob > Math.random()) {
                prob--;
                this.mutateNode();
            }
        }

        prob = this.#neat.PROBABILITY_MUTATE_TOGGLE_LINK;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateLinkToggle();
        }

        const minWeight = Math.min(this.#connections.size(), this.#nodes.size() - this.#neat.CT);
        prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this.#neat.MUTATION_RATE;
        prob = prob > minWeight ? minWeight : prob;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateWeightRandom();
        }

        prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this.#neat.MUTATION_RATE * this.#mutationPressure;
        prob = prob > minWeight ? minWeight : prob;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateWeightShift();
        }
    }
}
