import { ConnectionGene, NodeGene } from '../genome';

export class RandomHashSet {
    #set: Set<NodeGene | ConnectionGene>;
    #data: Array<NodeGene | ConnectionGene>;

    constructor() {
        this.#set = new Set();
        this.#data = [];
    }

    contains(gene: NodeGene | ConnectionGene): boolean {
        return this.#set.has(gene);
    }

    randomElement(): unknown | null {
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

    remove(index: number) {
        if (index < 0 || index >= this.#set.size) {
            return;
        }
        this.#set.delete(this.#data[index]);
        this.#data.splice(index, 1);
    }

    get data(): Array<unknown> {
        return this.#data;
    }
}
