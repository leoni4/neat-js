import { ConnectionGene, NodeGene } from '../genome/index.js';

export class RandomHashSet {
    #data: Array<NodeGene | ConnectionGene>;

    constructor() {
        this.#data = [];
    }

    contains(gene: NodeGene | ConnectionGene): boolean {
        for (let i = 0; i < this.#data.length; i += 1) {
            if (this.#data[i].innovationNumber === gene.innovationNumber) {
                return true;
            }
        }

        return false;
    }

    randomElement(): NodeGene | ConnectionGene | null {
        if (!this.#data.length) {
            return null;
        }

        return this.#data[Math.floor(this.#data.length * Math.random())];
    }

    add(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            this.#data.push(gene);
        }
    }

    addSorted(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            for (let i = 0; i < this.size(); i++) {
                const innovation = this.get(i).innovationNumber;
                if (gene.innovationNumber < innovation) {
                    this.#data.splice(i, 0, gene);

                    return;
                }
            }
            this.#data.push(gene);
        }
    }

    size(): number {
        return this.#data.length;
    }

    clear() {
        this.#data = [];
    }

    get(index: number): NodeGene | ConnectionGene {
        return this.#data[index];
    }

    remove(arg: number | ConnectionGene | NodeGene) {
        if (arg instanceof ConnectionGene || arg instanceof NodeGene) {
            const index = this.#data.indexOf(arg);
            if (index === -1) {
                console.warn('Trying to remove() none existing Gene');

                return;
            }

            this.#data.splice(index, 1);
        } else {
            if (arg < 0 || arg >= this.#data.length) {
                console.warn('Trying to remove() none existing Gene');

                return;
            }
            this.#data.splice(arg, 1);
        }
    }

    removeByInnovation(innovationNumber: number) {
        const index = this.#data.findIndex(g => g.innovationNumber === innovationNumber);
        if (index === -1) {
            console.warn('Trying to removeByInnovation none existing Gene');

            return;
        }

        this.#data.splice(index, 1);
    }

    get data(): Array<NodeGene | ConnectionGene> {
        return this.#data;
    }
}
