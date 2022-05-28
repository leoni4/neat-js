import { Node } from './Node';

export class Connection {
    #from: Node;
    #to: Node;
    #weight = 0;
    #enabled = true;

    constructor(from: Node, to: Node) {
        this.#from = from;
        this.#to = to;
    }

    get from(): Node {
        return this.#from;
    }

    set from(value: Node) {
        this.#from = value;
    }

    get to(): Node {
        return this.#to;
    }

    set to(value: Node) {
        this.#to = value;
    }

    get weight(): number {
        return this.#weight;
    }

    set weight(value: number) {
        this.#weight = value;
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    set enabled(value: boolean) {
        this.#enabled = value;
    }
}
