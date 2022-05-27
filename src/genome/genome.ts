import { RandomHashSet } from '../dataStructures';
import { Neat } from '../neat';
import { ConnectionGene } from './connectionGene';
import { NodeGene } from './nodeGene';

export class Genome {
    #connections: RandomHashSet = new RandomHashSet();
    #nodes: RandomHashSet = new RandomHashSet();
    #neat: Neat;

    constructor(neat: Neat) {
        this.#neat = neat;
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

    distance(g2: Genome): number {
        let g1: Genome = this;

        const higGene1: ConnectionGene | NodeGene = g1.connections.get(g1.connections.size() - 1);
        const higGene2: ConnectionGene | NodeGene = g2.connections.get(g2.connections.size() - 1);

        if (!(higGene1 instanceof ConnectionGene) || !(higGene2 instanceof ConnectionGene)) {
            throw new Error('higGene is not a ConnectionGene');
        }
        const higInnovationG1: number = higGene1.innovationNumber;
        const higInnovationG2: number = higGene2.innovationNumber;

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

        weightDiff /= similar;

        const excess = g1.connections.size() - indexG1;
        let N = Math.max(g1.connections.size(), g2.connections.size());
        N = N < 20 ? 1 : N;

        return (this.#neat.C1 * excess) / N + (this.#neat.C2 * disjoint) / N + this.#neat.C3 * weightDiff;
    }

    static crossOver(g1: Genome, g2: Genome) {
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
    }

    mutate() {
        return null;
    }
}
