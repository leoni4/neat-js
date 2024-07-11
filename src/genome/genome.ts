import { RandomHashSet } from '../dataStructures';
import { Neat } from '../neat';
import { ConnectionGene } from './connectionGene';
import { NodeGene } from './nodeGene';

export class Genome {
    #connections: RandomHashSet = new RandomHashSet();
    #nodes: RandomHashSet = new RandomHashSet();
    #neat: Neat;
    #optErrTrashhold: number;
    #selfOpt = false;

    constructor(neat: Neat) {
        this.#neat = neat;
        this.#optErrTrashhold = neat.OPT_ERR_TRASHHOLD;
    }

    get selfOpt(): boolean {
        return this.#selfOpt;
    }

    get optErrTrashhold(): number {
        return this.#optErrTrashhold;
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

    save() {
        const nodes: Array<any> = [];
        this.#nodes.data.forEach(item => {
            if (!(item instanceof NodeGene)) return;
            nodes.push({
                innovationNumber: item.innovationNumber,
                x: item.x,
                y: item.y,
            });
        });
        const connections: Array<any> = [];
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

        weightDiff /= similar || 1;

        const excess = g1.connections.size() - indexG1;
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
                    if (Math.random() > 0.4) {
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
        if (this.#neat.PERMANENT_MAIN_CONNECTIONS && con.from.x === 0.01 && con.to.x === 0.99) {
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

        if (con.from.x !== 0.01 && singleFrom && !replace && down) {
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
        if (con.to.x !== 0.99 && singleTo && !replace && up) {
            const removingTo = [];
            for (let i = 0; i < this.#connections.size(); i += 1) {
                const c = this.#connections.get(i);
                if (!(c instanceof ConnectionGene)) continue;
                if (c.from.innovationNumber === con.to.innovationNumber) {
                    removingTo.push(c);
                    break;
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
        if (replaceIndex === 0) {
            middle = this.#neat.getNode();
            middle.x = (from.x + to.x) / 2;
            middle.y = (from.y + to.y) / 2 + Math.random() * 0.6 - 0.3;
            middle.y = middle.y < 0.1 ? 0.1 : middle.y > 0.9 ? 0.9 : middle.y;
            this.#neat.setReplaceIndex(from, to, middle.innovationNumber);
        } else {
            middle = this.#neat.getNode(replaceIndex);
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

    #mutateWeightShiftBias(): NodeGene | null {
        const node = this.#nodes.randomElement();
        if (!(node instanceof NodeGene)) {
            return null;
        }
        let newWeight = node.bias;
        let counter = 0;
        while (newWeight === node.bias && counter < 10) {
            counter++;
            newWeight = node.bias + (Math.random() * 2 - 1) * this.#neat.WEIGHT_SHIFT_STRENGTH;
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
            newWeight = con.weight + (Math.random() * 2 - 1) * this.#neat.WEIGHT_SHIFT_STRENGTH;
        }
        if (counter >= 10) {
            newWeight = 0;
        }
        con.weight = newWeight;
        return con;
    }

    mutateWeightShift(): ConnectionGene | NodeGene | null {
        if (Math.random() < 0.5) {
            return this.#mutateWeightShiftConnection();
        } else {
            return this.#mutateWeightShiftBias();
        }
    }

    #mutateWeightRandomNode(): NodeGene | null {
        const node = this.#nodes.randomElement();
        if (!(node instanceof NodeGene)) {
            return null;
        }

        let newWeight = node.bias || this.#neat.WEIGHT_RANDOM_STRENGTH;
        while (newWeight === node.bias) {
            newWeight = (Math.random() * newWeight * 2 - newWeight) * this.#neat.WEIGHT_RANDOM_STRENGTH;
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

    mutateWeightRandom(): ConnectionGene | NodeGene | null {
        if (Math.random() < 0.5) {
            return this.#mutateWeightRandomConnection();
        } else {
            return this.#mutateWeightRandomNode();
        }
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

    #optimization(start = 0) {
        for (let i = start; i < this.#connections.size(); i += 1) {
            const c = this.#connections.get(i);
            if (!(c instanceof ConnectionGene)) continue;
            if (!c.enabled) {
                this.removeConnection(c);
                return;
            }
        }
    }

    mutate(selfOpt = false) {
        this.#selfOpt = selfOpt;
        const optimize = this.#selfOpt || this.#neat.optimization;
        if (optimize) {
            this.#optimization();
        }
        let prob: number;

        if ((!selfOpt && !this.#neat.optimization) || this.#connections.size() < this.#neat.CT) {
            prob = this.#neat.PROBABILITY_MUTATE_LINK * this.#neat.MUTATION_RATE;
            prob = this.#connections.size() < this.#neat.CT ? this.#neat.CT : prob;
            if (optimize) {
                prob = prob > 1 ? 1 : prob;
            }
            while (prob > Math.random()) {
                prob--;
                this.mutateLink();
            }

            prob = this.#neat.PROBABILITY_MUTATE_NODES * this.#neat.MUTATION_RATE;
            if (optimize) {
                prob = prob > 1 ? 1 : prob;
            }
            while (prob > Math.random()) {
                prob--;
                this.mutateNode();
            }
        }

        prob = this.#neat.PROBABILITY_MUTATE_TOGGLE_LINK * this.#neat.MUTATION_RATE;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateLinkToggle();
        }

        prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this.#neat.MUTATION_RATE;
        prob = prob > this.#connections.size() ? this.#connections.size() : prob;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateWeightRandom();
        }

        prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this.#neat.MUTATION_RATE;
        prob = prob > this.#connections.size() ? this.#connections.size() : prob;
        if (optimize) {
            prob = prob > 1 ? 1 : prob;
        }
        while (prob > Math.random()) {
            prob--;
            this.mutateWeightShift();
        }
    }
}
