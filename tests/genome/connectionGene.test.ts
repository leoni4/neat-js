import { ConnectionGene, NodeGene } from '../../src/genome';

describe('ConnectionGene test', () => {
    let connectionGene: ConnectionGene;
    let nodeGeneFrom: NodeGene;
    let nodeGeneTo: NodeGene;

    beforeEach(() => {
        nodeGeneFrom = new NodeGene(1);
        nodeGeneTo = new NodeGene(2);
        connectionGene = new ConnectionGene(3, nodeGeneFrom, nodeGeneTo);
    });

    it('creates ConnectionGene', () => {
        expect(connectionGene instanceof ConnectionGene).toBe(true);
    });

    it('get and set fromNode', () => {
        expect(connectionGene.from instanceof NodeGene).toBe(true);
        expect(connectionGene.from.innovationNumber).toBe(1);
        connectionGene.from = new NodeGene(10);
        expect(connectionGene.from.innovationNumber).toBe(10);
    });

    it('get and set toNode', () => {
        expect(connectionGene.to instanceof NodeGene).toBe(true);
        expect(connectionGene.to.innovationNumber).toBe(2);
        connectionGene.to = new NodeGene(10);
        expect(connectionGene.to.innovationNumber).toBe(10);
    });

    it('get and set weight / enabled', () => {
        expect(connectionGene.weight).toBe(0);
        connectionGene.weight = 10;
        expect(connectionGene.weight).toBe(10);
        expect(connectionGene.enabled).toBe(true);
        connectionGene.enabled = false;
        expect(connectionGene.enabled).toBe(false);
    });

    it('checks equals right', () => {
        expect(connectionGene.equals({})).toBe(false);
        expect(connectionGene.equals(new NodeGene(1))).toBe(false);
        expect(
            connectionGene.equals(
                new ConnectionGene(9, nodeGeneFrom, new NodeGene(10))
            )
        ).toBe(false);
        expect(
            connectionGene.equals(
                new ConnectionGene(9, nodeGeneFrom, nodeGeneTo)
            )
        ).toBe(true);
    });

    it('returns hashCode', () => {
        expect(connectionGene.hashCode()).toBe(1048578);
    });
});
