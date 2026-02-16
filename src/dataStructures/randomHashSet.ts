import { ConnectionGene, NodeGene } from '../genome/index.js';

export class RandomHashSet {
    private _data: Array<NodeGene | ConnectionGene>;

    constructor() {
        this._data = [];
    }

    contains(gene: NodeGene | ConnectionGene): boolean {
        for (let i = 0; i < this._data.length; i += 1) {
            if (this._data[i].innovationNumber === gene.innovationNumber) {
                return true;
            }
        }

        return false;
    }

    randomElement(): NodeGene | ConnectionGene | null {
        if (!this._data.length) {
            return null;
        }

        return this._data[Math.floor(this._data.length * Math.random())];
    }

    add(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            this._data.push(gene);
        }
    }

    addSorted(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            for (let i = 0; i < this.size(); i++) {
                const innovation = this.get(i).innovationNumber;
                if (gene.innovationNumber < innovation) {
                    this._data.splice(i, 0, gene);

                    return;
                }
            }
            this._data.push(gene);
        }
    }

    size(): number {
        return this._data.length;
    }

    clear() {
        this._data = [];
    }

    get(index: number): NodeGene | ConnectionGene {
        return this._data[index];
    }

    remove(arg: number | ConnectionGene | NodeGene) {
        if (arg instanceof ConnectionGene || arg instanceof NodeGene) {
            const index = this._data.indexOf(arg);
            if (index === -1) {
                console.warn('Trying to remove() none existing Gene');

                return;
            }

            this._data.splice(index, 1);
        } else {
            if (arg < 0 || arg >= this._data.length) {
                console.warn('Trying to remove() none existing Gene');

                return;
            }
            this._data.splice(arg, 1);
        }
    }

    removeByInnovation(innovationNumber: number) {
        const index = this._data.findIndex(g => g.innovationNumber === innovationNumber);
        if (index === -1) {
            console.warn('Trying to removeByInnovation none existing Gene');

            return;
        }

        this._data.splice(index, 1);
    }

    get data(): Array<NodeGene | ConnectionGene> {
        return this._data;
    }
}
