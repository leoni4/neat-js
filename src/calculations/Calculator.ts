import { ConnectionGene, Genome, NodeGene } from '../genome/index.js';
import { NETWORK_CONSTANTS } from '../neat/constants.js';
import { EActivation } from '../neat/index.js';

const ACT_IDENTITY = 0;
const ACT_SIGMOID = 1;
const ACT_TANH = 2;
const ACT_RELU = 3;
const ACT_LEAKY_RELU = 4;

function activationCode(type: string): number {
    switch (type) {
        case 'none':
        case 'linear':
        case 'softmax':
            return ACT_IDENTITY;
        case 'tanh':
            return ACT_TANH;
        case 'relu':
            return ACT_RELU;
        case 'leakyRelu':
            return ACT_LEAKY_RELU;
        default:
            return ACT_SIGMOID;
    }
}

function activate(code: number, sum: number): number {
    switch (code) {
        case ACT_IDENTITY:
            return sum;
        case ACT_TANH:
            return Math.tanh(sum);
        case ACT_RELU:
            return Math.max(0, sum);
        case ACT_LEAKY_RELU:
            return sum > 0 ? sum : 0.01 * sum;
        default:
            return 1 / (1 + Math.exp(-sum));
    }
}

export class Calculator {
    private readonly _inputCount: number;
    private readonly _usedInputs: number[];
    private readonly _start: number[];
    private readonly _src: number[];
    private readonly _weights: number[];
    private readonly _dst: number[];
    private readonly _biasGenes: Array<NodeGene | null>;
    private readonly _hiddenEvalCount: number;
    private readonly _hiddenCode: number;
    private readonly _outputCode: number;
    private readonly _values: number[];
    private readonly _outputSlots: number[];

    private _outputActivation: EActivation;

    constructor(genome: Genome, outputActivation: EActivation, hiddenActivation: EActivation) {
        this._outputActivation = outputActivation;
        this._hiddenCode = activationCode(hiddenActivation);
        this._outputCode = activationCode(outputActivation);
        const nodeData = genome.nodes.data;
        const connectionData = genome.connections.data;

        const inputIdx: number[] = [];
        const hiddenIdx: number[] = [];
        const outputIdx: number[] = [];
        const geneOf = new Array<NodeGene>(nodeData.length);
        for (let i = 0; i < nodeData.length; i += 1) {
            const n = nodeData[i];
            if (n instanceof ConnectionGene) continue;
            geneOf[i] = n;
            if (n.x === NETWORK_CONSTANTS.INPUT_NODE_X) {
                inputIdx.push(i);
            } else if (n.x === NETWORK_CONSTANTS.OUTPUT_NODE_X) {
                outputIdx.push(i);
            } else {
                hiddenIdx.push(i);
            }
        }
        hiddenIdx.sort((a, b) => {
            const ax = geneOf[a].x;
            const bx = geneOf[b].x;

            return ax > bx ? 1 : ax < bx ? -1 : 0;
        });

        const inputCount = inputIdx.length;
        const hiddenEnd = inputCount + hiddenIdx.length;
        const slotCount = hiddenEnd + outputIdx.length;
        const slotIdx = inputIdx.concat(hiddenIdx, outputIdx);
        const slotOfIdx = new Array<number>(nodeData.length);
        for (let s = 0; s < slotCount; s += 1) {
            slotOfIdx[slotIdx[s]] = s;
        }
        const slotById: Map<number, number> = new Map();
        for (let i = 0; i < nodeData.length; i += 1) {
            const n = nodeData[i];
            if (n instanceof ConnectionGene) continue;
            slotById.set(n.innovationNumber, slotOfIdx[i]);
        }

        const inSrc: number[][] = [];
        const inWeight: number[][] = [];
        for (let s = inputCount; s < slotCount; s += 1) {
            inSrc.push([]);
            inWeight.push([]);
        }
        for (let i = 0; i < connectionData.length; i += 1) {
            const c = connectionData[i];
            if (c instanceof NodeGene) continue;
            const from = slotById.get(c.from.innovationNumber);
            const to = slotById.get(c.to.innovationNumber);
            if (from === undefined || to === undefined || to < inputCount || !c.enabled) continue;
            inSrc[to - inputCount].push(from);
            inWeight[to - inputCount].push(c.weight);
        }

        const needed = new Array<number>(slotCount).fill(0);
        const stack: number[] = [];
        for (let s = hiddenEnd; s < slotCount; s += 1) {
            needed[s] = 1;
            stack.push(s);
        }
        for (let s = stack.pop(); s !== undefined; s = stack.pop()) {
            const sources = inSrc[s - inputCount];
            for (let k = 0; k < sources.length; k += 1) {
                const f = sources[k];
                if (needed[f] === 1) continue;
                needed[f] = 1;
                if (f >= inputCount) stack.push(f);
            }
        }

        const usedInputs: number[] = [];
        for (let s = 0; s < inputCount; s += 1) {
            if (needed[s] === 1) usedInputs.push(s);
        }
        const evalSlots: number[] = [];
        for (let s = inputCount; s < hiddenEnd; s += 1) {
            if (needed[s] === 1) evalSlots.push(s);
        }
        this._hiddenEvalCount = evalSlots.length;
        for (let s = hiddenEnd; s < slotCount; s += 1) {
            evalSlots.push(s);
        }

        const start: number[] = [];
        const src: number[] = [];
        const weights: number[] = [];
        const biasGenes: Array<NodeGene | null> = [];
        for (let j = 0; j < evalSlots.length; j += 1) {
            const s = evalSlots[j];
            start.push(src.length);
            const sources = inSrc[s - inputCount];
            const ws = inWeight[s - inputCount];
            for (let m = 0; m < sources.length; m += 1) {
                src.push(sources[m]);
                weights.push(ws[m]);
            }
            const n = geneOf[slotIdx[s]];
            biasGenes.push(n.x !== 0 ? n : null);
        }
        start.push(src.length);

        this._inputCount = inputCount;
        this._usedInputs = usedInputs;
        this._start = start;
        this._src = src;
        this._weights = weights;
        this._dst = evalSlots;
        this._biasGenes = biasGenes;
        this._values = new Array<number>(slotCount).fill(0);
        const outputSlots: number[] = [];
        for (let s = hiddenEnd; s < slotCount; s += 1) {
            outputSlots.push(s);
        }
        this._outputSlots = outputSlots;
    }

    calculate(input: Array<number>): Array<number> {
        if (input.length !== this._inputCount) {
            throw new Error(
                `Input length (${input.length}) does not match number of input nodes (${this._inputCount})`,
            );
        }
        const values = this._values;
        const usedInputs = this._usedInputs;
        for (let i = 0; i < usedInputs.length; i++) {
            const s = usedInputs[i];
            values[s] = input[s];
        }

        const start = this._start;
        const src = this._src;
        const weights = this._weights;
        const dst = this._dst;
        const biasGenes = this._biasGenes;
        const hiddenEvalCount = this._hiddenEvalCount;
        for (let j = 0; j < dst.length; j++) {
            let sum = 0;
            for (let k = start[j], end = start[j + 1]; k < end; k++) {
                sum += weights[k] * values[src[k]];
            }
            const biasGene = biasGenes[j];
            if (biasGene !== null) {
                sum += biasGene.bias;
            }
            values[dst[j]] = activate(j < hiddenEvalCount ? this._hiddenCode : this._outputCode, sum);
        }

        const outputSlots = this._outputSlots;
        const output = new Array<number>(outputSlots.length);
        for (let i = 0; i < outputSlots.length; i++) {
            output[i] = values[outputSlots[i]];
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
