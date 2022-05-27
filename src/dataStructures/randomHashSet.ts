import { NodeGene } from '../genome';

export class RandomHashSet {
    #set: Set<unknown>;
    #data: Array<NodeGene>;

    constructor() {
        this.#set = new Set();
        this.#data = [];
    }

    contains(object: unknown): boolean {
        return this.#set.has(object);
    }

    randomElement(): unknown | null {
        if (!this.#set.size) {
            return null;
        }
        return this.#data[Math.floor(this.#data.length * Math.random())];
    }

    add(object: NodeGene) {
        if (!this.contains(object)) {
            this.#set.add(object);
            this.#data.push(object);
        }
    }

    size(): number {
        return this.#data.length;
    }

    clear() {
        this.#set.clear();
        this.#data = [];
    }

    get(index: number): NodeGene {
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
