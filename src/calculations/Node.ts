import { Connection } from './Connection.js';
import { NodeGene } from '../genome/nodeGene.js';
import { EActivation } from '../neat/index.js';

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

    #activationFunction(sum: number, type: string): number {
        switch (type) {
            case 'none':
            case 'linear':
                return sum;
            case 'sigmoid':
                return 1 / (1 + Math.exp(-sum));
            case 'tanh':
                return Math.tanh(sum);
            case 'relu':
                return Math.max(0, sum);
            case 'leakyRelu':
                return sum > 0 ? sum : 0.01 * sum;
            case 'softmax':
                return sum;
            default:
                return 1 / (1 + Math.exp(-sum));
        }
    }

    calculate(activation: EActivation) {
        let sum = 0;
        for (let i = 0; i < this.#connections.length; i += 1) {
            const c = this.#connections[i];
            if (c.enabled) {
                sum += c.weight * c.from.output;
            }
        }
        if (this.#x !== 0) {
            sum += this.#node.bias;
        }
        this.#output = this.#activationFunction(sum, activation);
    }

    compareTo(node: Node): number {
        if (this.x > node.x) {
            return 1;
        } else if (this.x < node.x) {
            return -1;
        } else {
            return 0;
        }
    }
}
