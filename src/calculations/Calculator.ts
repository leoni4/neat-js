import { ConnectionGene, Genome, NodeGene } from '../genome/index.js';
import { Node } from './Node.js';
import { Connection } from './Connection.js';
import { NETWORK_CONSTANTS } from '../neat/constants.js';

export class Calculator {
    #inputNodes: Array<Node> = [];
    #hiddenNodes: Array<Node> = [];
    #outputNodes: Array<Node> = [];

    #outputActivation: string;

    constructor(genome: Genome, outputActivation: string) {
        this.#outputActivation = outputActivation;
        const nodes = genome.nodes;
        const connections = genome.connections;

        const nodeHashmap: Map<number, Node> = new Map();

        for (let i = 0; i < nodes.data.length; i += 1) {
            const n = nodes.data[i];
            if (n instanceof ConnectionGene) continue;
            const node: Node = new Node(n.x, n);
            nodeHashmap.set(n.innovationNumber, node);

            if (n.x <= NETWORK_CONSTANTS.INPUT_THRESHOLD_X) {
                this.#inputNodes.push(node);
            } else if (n.x >= NETWORK_CONSTANTS.OUTPUT_THRESHOLD_X) {
                this.#outputNodes.push(node);
            } else {
                node.hidden = true;
                this.#hiddenNodes.push(node);
            }
        }
        this.#hiddenNodes.sort((a, b) => {
            return a.compareTo(b);
        });

        for (let i = 0; i < connections.data.length; i += 1) {
            const c = connections.data[i];
            if (c instanceof NodeGene) continue;

            const from: NodeGene = c.from;
            const to: NodeGene = c.to;

            const nodeFrom = nodeHashmap.get(from.innovationNumber);
            const nodeTo = nodeHashmap.get(to.innovationNumber);
            if (!nodeFrom || !nodeTo) continue;

            const con = new Connection(nodeFrom, nodeTo);
            con.weight = c.weight;
            con.enabled = c.enabled;

            nodeTo.connections.push(con);
        }
    }

    calculate(input: Array<number>): Array<number> {
        if (input.length !== this.#inputNodes.length) {
            throw new Error(
                `Input length (${input.length}) does not match number of input nodes (${this.#inputNodes.length})`,
            );
        }
        for (let i = 0; i < this.#inputNodes.length; i++) {
            this.#inputNodes[i].output = input[i];
        }
        for (let i = 0; i < this.#hiddenNodes.length; i++) {
            this.#hiddenNodes[i].calculate('sigmoid');
        }
        const output = new Array<number>(this.#outputNodes.length);
        for (let i = 0; i < this.#outputNodes.length; i++) {
            this.#outputNodes[i].calculate(this.#outputActivation);
            output[i] = this.#outputNodes[i].output;
        }

        // Apply softmax if needed
        if (this.#outputActivation === 'softmax') {
            const max = Math.max(...output);
            const exps = output.map(x => Math.exp(x - max));
            const sum = exps.reduce((a, b) => a + b, 0);
            for (let i = 0; i < output.length; i++) {
                output[i] = exps[i] / sum;
            }
        }

        return output;
    }
}
