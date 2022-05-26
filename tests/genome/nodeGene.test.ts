import { NodeGene } from '../../src/genome';

describe('NodeGene test', () => {
    let nodeGene: NodeGene;

    beforeEach(() => {
        nodeGene = new NodeGene(1);
    });

    it('creates NodeGene', () => {
        expect(nodeGene instanceof NodeGene).toBe(true);
    });

    it('getters and setters for x/y', () => {
        expect(nodeGene.x).toBe(0);
        expect(nodeGene.y).toBe(0);
        nodeGene.x = 10;
        nodeGene.y = 20;
        expect(nodeGene.x).toBe(10);
        expect(nodeGene.y).toBe(20);
    });

    it('returns innovation number', () => {
        expect(nodeGene.hashCode()).toBe(1);
    });

    it('check equals right', () => {
        const secondGene: NodeGene = new NodeGene(1);
        const anotherGene: NodeGene = new NodeGene(2);

        expect(nodeGene.equals({})).toBeFalsy();
        expect(nodeGene.equals(secondGene)).toBeTruthy();
        expect(nodeGene.equals(anotherGene)).toBeFalsy();
    });
});
