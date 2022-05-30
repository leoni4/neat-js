import { ConnectionGene, NodeGene } from '../genome';

export class RandomHashSet {
    #set: Set<NodeGene | ConnectionGene>;
    #data: Array<NodeGene | ConnectionGene>;

    constructor() {
        this.#set = new Set();
        this.#data = [];
    }

    contains(gene: NodeGene | ConnectionGene): boolean {
        let contains = false;
        for (let i = 0; i < this.data.length; i += 1) {
            if (this.data[i].innovationNumber === gene.innovationNumber) {
                contains = true;
            }
        }
        return contains;
    }

    randomElement(): NodeGene | ConnectionGene | null {
        if (!this.#set.size) {
            return null;
        }
        return this.#data[Math.floor(this.#data.length * Math.random())];
    }

    add(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            this.#set.add(gene);
            this.#data.push(gene);
        }
    }

    addSorted(gene: NodeGene | ConnectionGene) {
        for (let i = 0; i < this.size(); i++) {
            const innovation = this.get(i).innovationNumber;
            if (gene.innovationNumber < innovation) {
                this.#data.splice(i, 0, gene);
                this.#set.add(gene);
                return;
            }
        }
        this.add(gene);
    }

    size(): number {
        return this.#data.length;
    }

    clear() {
        this.#set.clear();
        this.#data = [];
    }

    get(index: number): NodeGene | ConnectionGene {
        return this.#data[index];
    }

    remove(arg: number | ConnectionGene) {
        if (arg instanceof ConnectionGene) {
            const index = this.#data.indexOf(arg);
            this.#data.splice(index, 1);
            this.#set.delete(arg);
        } else {
            if (arg < 0 || arg >= this.#set.size) {
                return;
            }
            this.#set.delete(this.#data[arg]);
            this.#data.splice(arg, 1);
        }
    }

    get data(): Array<NodeGene | ConnectionGene> {
        return this.#data;
    }
}
