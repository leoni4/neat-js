import { Connection } from './Connection.js';
import { NodeGene } from '../genome/nodeGene.js';

export class Node {
    #x: number;
    #output = 0;
    #node: NodeGene;
    #hidden: boolean = false;
    #connections: Array<Connection> = [];

    constructor(x: number, node: NodeGene) {
        this.#x = x;
        this.#node = node;
    }

    get hidden(): boolean {
        return this.#hidden;
    }

    set hidden(hidden: boolean) {
        this.#hidden = hidden;
    }

    get x(): number {
        return this.#x;
    }

    set x(value: number) {
        this.#x = value;
    }

    get output(): number {
        return this.#output;
    }

    set output(value: number) {
        this.#output = value;
    }

    get connections(): Array<Connection> {
        return this.#connections;
    }

    set connections(value: Array<Connection>) {
        this.#connections = value;
    }

    #activation(sum: number): number {
        return 1 / (1 + Math.exp(-sum));
    }

    calculate(outputActivation: string) {
        let sum = 0;
        for (let i = 0; i < this.#connections.length; i += 1) {
            const c = this.#connections[i];
            if (c.enabled) {
                sum += c.weight * c.from.output;
            }
        }
        if (this.#hidden) {
            sum += this.#node.bias;
        }
        this.#output = outputActivation === 'none' ? sum : this.#activation(sum);
    }

    compereTo(node: Node): number {
        if (this.x > node.x) {
            return 1;
        } else if (this.x < node.x) {
            return -1;
        } else {
            return 0;
        }
    }
}
