import { ConnectionGene, Genome, NodeGene } from '../genome/index.js';
import { Node } from './Node.js';
import { Connection } from './Connection.js';
import { NETWORK_CONSTANTS } from '../neat/constants.js';
import { EActivation } from '../neat/index.js';

export class Calculator {
    private _inputNodes: Array<Node> = [];
    private _hiddenNodes: Array<Node> = [];
    private _outputNodes: Array<Node> = [];

    private _outputActivation: EActivation;
    private _hiddenActivation: EActivation;

    constructor(genome: Genome, outputActivation: EActivation, hiddenActivation: EActivation) {
        this._outputActivation = outputActivation;
        this._hiddenActivation = hiddenActivation;
        const nodes = genome.nodes;
        const connections = genome.connections;

        const nodeHashmap: Map<number, Node> = new Map();

        for (let i = 0; i < nodes.data.length; i += 1) {
            const n = nodes.data[i];
            if (n instanceof ConnectionGene) continue;
            const node: Node = new Node(n.x, n);
            nodeHashmap.set(n.innovationNumber, node);

            if (n.x === NETWORK_CONSTANTS.INPUT_NODE_X) {
                this._inputNodes.push(node);
            } else if (n.x === NETWORK_CONSTANTS.OUTPUT_NODE_X) {
                this._outputNodes.push(node);
            } else {
                node.hidden = true;
                this._hiddenNodes.push(node);
            }
        }
        this._hiddenNodes.sort((a, b) => {
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
        if (input.length !== this._inputNodes.length) {
            throw new Error(
                `Input length (${input.length}) does not match number of input nodes (${this._inputNodes.length})`,
            );
        }
        for (let i = 0; i < this._inputNodes.length; i++) {
            this._inputNodes[i].output = input[i];
        }
        for (let i = 0; i < this._hiddenNodes.length; i++) {
            this._hiddenNodes[i].calculate(this._hiddenActivation);
        }
        const output = new Array<number>(this._outputNodes.length);
        for (let i = 0; i < this._outputNodes.length; i++) {
            this._outputNodes[i].calculate(this._outputActivation);
            output[i] = this._outputNodes[i].output;
        }

        if (this._outputActivation === EActivation.softmax) {
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
