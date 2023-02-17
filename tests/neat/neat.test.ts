import { Neat } from '../../src/neat';
import { ConnectionGene, Genome, NodeGene } from '../../src/genome';

describe('Neat test', () => {
    let neat: Neat;
    let node1: NodeGene;
    let node2: NodeGene;

    beforeEach(() => {
        neat = new Neat(2, 1, 10);
        node1 = new NodeGene(1);
        node2 = new NodeGene(2);
    });

    it('Neat created', () => {
        expect(neat instanceof Neat).toBe(true);
        expect(neat.allNodes.size()).toBe(3);
    });

    it('resets well', () => {
        neat.reset(10, 10);
        expect(neat.allNodes.size()).toBe(20);
    });

    it('getNode creates and returns NodeGene', () => {
        expect(neat.allNodes.size()).toBe(3);
        neat.getNode();
        expect(neat.allNodes.size()).toBe(4);
        neat.getNode(4);
        expect(neat.allNodes.size()).toBe(4);
        neat.getNode(5);
        expect(neat.allNodes.size()).toBe(5);
    });

    it('creates emptyGenome', () => {
        const genome = neat.emptyGenome();
        expect(genome instanceof Genome).toBe(true);
        expect(genome.nodes.size()).toBe(3);
    });

    it('creates connections by getConnection', () => {
        expect(neat.allConnections.size).toBe(0);
        neat.getConnection(node1, node2);
        expect(neat.allConnections.size).toBe(1);
        neat.getConnection(node1, node2);
        expect(neat.allConnections.size).toBe(1);
    });

    it('returns a copy of a connection by static method', () => {
        const con = neat.getConnection(node1, node2);
        const newCon = Neat.getConnection(con);
        expect(con instanceof ConnectionGene).toBe(true);
        expect(newCon instanceof ConnectionGene).toBe(true);
        expect(con === newCon).toBe(false);
        expect(JSON.stringify(con) === JSON.stringify(newCon)).toBe(true);
    });
});
