import { RandomHashSet } from '../dataStructures';
import { Neat } from '../neat';
import { ConnectionGene } from './connectionGene';
import { NodeGene } from './nodeGene';
import { Calculator } from '../calculations';

export class Genome {
    #connections: RandomHashSet = new RandomHashSet();
    #nodes: RandomHashSet = new RandomHashSet();
    #neat: Neat;
    #calculator: Calculator;

    constructor(neat: Neat) {
        this.#neat = neat;
        this.#calculator = new Calculator(this);
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

    calculate(input: Array<number>): Array<number> {
        this.#calculator = new Calculator(this);
        return this.#calculator.calculate(input);
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
        N = N < 20 ? 1 : N;

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

            if (inn1 > inn2) {
                indexG2++;
            } else if (inn1 < inn2) {
                genome.connections.add(Neat.getConnection(gene1));
                indexG1++;
            } else {
                if (Math.random() > 0.5) {
                    genome.connections.add(Neat.getConnection(gene1));
                } else {
                    genome.connections.add(Neat.getConnection(gene2));
                }
                indexG1++;
                indexG2++;
            }
        }
        while (indexG1 < g1.connections.size()) {
            const gene1 = g1.connections.get(indexG1);
            if (!(gene1 instanceof ConnectionGene)) {
                throw new Error('gene is not a ConnectionGene');
            }
            genome.connections.add(Neat.getConnection(gene1));
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

    mutateLink(): ConnectionGene | null {
        for (let i = 0; i < 100; i++) {
            const geneA = this.#nodes.randomElement();
            const geneB = this.#nodes.randomElement();

            if (!(geneA instanceof NodeGene) || !(geneB instanceof NodeGene)) {
                continue;
            }
            if (geneA.x === geneB.x) {
                continue;
            }

            let con: ConnectionGene;
            if (geneA.x < geneB.x) {
                con = new ConnectionGene(0, geneA, geneB);
            } else {
                con = new ConnectionGene(0, geneB, geneA);
            }
            if (this.#connections.contains(con)) {
                continue;
            }
            con = this.#neat.getConnection(con.from, con.to);
            con.weight = (Math.random() * 2 - 1) * this.#neat.WEIGHT_RANDOM_STRENGTH;

            this.#connections.addSorted(con);
            return con;
        }
        return null;
    }

    mutateNode(): NodeGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }

        const from: NodeGene = con.from;
        const to: NodeGene = con.to;
        const middle: NodeGene = this.#neat.getNode();

        middle.x = (from.x + to.x) / 2;
        middle.y = (from.y + to.y) / 2 + Math.random() * 0.6 - 0.3;
        middle.y = middle.y < 0.1 ? 0.1 : middle.y > 0.9 ? 0.9 : middle.y;
        const con1: ConnectionGene = this.#neat.getConnection(from, middle);
        const con2: ConnectionGene = this.#neat.getConnection(middle, to);

        con1.weight = 1;
        con2.weight = con.weight;
        con2.enabled = con.enabled;

        this.#connections.remove(con);
        this.#connections.add(con1);
        this.#connections.add(con2);

        this.#nodes.add(middle);
        return middle;
    }

    mutateWeightShift(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }
        let newWeight = con.weight;
        while (newWeight === con.weight) {
            newWeight = con.weight + (Math.random() * 2 - 1) * this.#neat.WEIGHT_SHIFT_STRENGTH;
        }
        con.weight = newWeight;
        return con;
    }

    mutateWeightRandom(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }

        let newWeight = con.weight;
        while (newWeight === con.weight) {
            newWeight = (Math.random() * 2 - 1) * this.#neat.WEIGHT_RANDOM_STRENGTH;
        }
        con.weight = newWeight;
        return con;
    }

    mutateLinkToggle(): ConnectionGene | null {
        const con = this.#connections.randomElement();
        if (!(con instanceof ConnectionGene)) {
            return null;
        }
        con.enabled = !con.enabled;
        return con;
    }

    mutate(force = false) {
        if (force || this.#neat.PROBABILITY_MUTATE_LINK > Math.random()) {
            this.mutateLink();
        }
        if (force || this.#neat.PROBABILITY_MUTATE_NODES > Math.random()) {
            this.mutateNode();
        }
        if (force || this.#neat.PROBABILITY_MUTATE_TOGGLE_LINK > Math.random()) {
            this.mutateLinkToggle();
        }
        if (force || this.#neat.PROBABILITY_MUTATE_WEIGHT_SHIFT > Math.random()) {
            this.mutateWeightShift();
        }
        if (force || this.#neat.PROBABILITY_MUTATE_WEIGHT_RANDOM > Math.random()) {
            this.mutateWeightRandom();
        }
    }
}
