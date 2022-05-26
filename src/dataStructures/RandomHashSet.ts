export class RandomHashSet {
    #set: Set<unknown>;
    #data: Array<unknown>;

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

    add(object: unknown) {
        if (!this.contains(object)) {
            this.#set.add(object);
            this.#data.push(object);
        }
    }

    clear() {
        this.#set.clear();
        this.#data = [];
    }

    get(index: number): unknown | null {
        if (index < 0 || index >= this.#set.size) {
            return null;
        }
        return this.#data[index];
    }

    remove(index: number) {
        if (index < 0 || index >= this.#set.size) {
            return;
        }
        this.#set.delete(this.#data[index]);
        this.#data.splice(index, 1);
    }

    getData(): Array<unknown> {
        return this.#data;
    }
}
