import { ConnectionGene, NodeGene } from '../genome/index.js';
import { mathRandom } from '../neat/random.js';

export class RandomHashSet {
    private _data: Array<NodeGene | ConnectionGene>;
    private readonly _index = new Map<number, NodeGene | ConnectionGene>();
    // Not lower than any innovation number in _data, because removals do not lower it. When addSorted() gets a gene
    // at or above it, the scan would not find a larger innovation number, so a push gives the same position.
    private _maxInnovation = -Infinity;

    constructor() {
        this._data = [];
    }

    contains(gene: NodeGene | ConnectionGene): boolean {
        return this._index.has(gene.innovationNumber);
    }

    private track(gene: NodeGene | ConnectionGene) {
        const innovation = gene.innovationNumber;
        // A Map matches a NaN key, but the 1.3.0 scan compared with ===, which never matches NaN.
        if (!Number.isNaN(innovation)) {
            this._index.set(innovation, gene);
        }
        if (innovation > this._maxInnovation) {
            this._maxInnovation = innovation;
        }
    }

    private removeAt(index: number) {
        const [gene] = this._data.splice(index, 1);
        this._index.delete(gene.innovationNumber);
    }

    randomElement(rng: () => number = mathRandom): NodeGene | ConnectionGene | null {
        if (!this._data.length) {
            return null;
        }

        return this._data[Math.floor(this._data.length * rng())];
    }

    add(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            this._data.push(gene);
            this.track(gene);
        }
    }

    addSorted(gene: NodeGene | ConnectionGene) {
        if (!this.contains(gene)) {
            if (gene.innovationNumber >= this._maxInnovation) {
                this._data.push(gene);
                this.track(gene);

                return;
            }
            for (let i = 0; i < this.size(); i++) {
                const innovation = this.get(i).innovationNumber;
                if (gene.innovationNumber < innovation) {
                    this._data.splice(i, 0, gene);
                    this.track(gene);

                    return;
                }
            }
            this._data.push(gene);
            this.track(gene);
        }
    }

    size(): number {
        return this._data.length;
    }

    clear() {
        this._data = [];
        this._index.clear();
        this._maxInnovation = -Infinity;
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

            this.removeAt(index);
        } else {
            if (arg < 0 || arg >= this._data.length) {
                console.warn('Trying to remove() none existing Gene');

                return;
            }
            this.removeAt(arg);
        }
    }

    removeByInnovation(innovationNumber: number) {
        const index = this._data.findIndex(g => g.innovationNumber === innovationNumber);
        if (index === -1) {
            console.warn('Trying to removeByInnovation none existing Gene');

            return;
        }

        this.removeAt(index);
    }

    /**
     * The genes in set order. Treat the array as read-only: change the set only with add(), addSorted(), remove(),
     * removeByInnovation(), and clear(). A direct change of the array bypasses the innovation index, and then
     * contains() and addSorted() can give wrong results.
     */
    get data(): Array<NodeGene | ConnectionGene> {
        return this._data;
    }
}
