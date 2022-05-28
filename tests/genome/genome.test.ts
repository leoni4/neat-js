import { ConnectionGene, Genome, NodeGene } from '../../src/genome';
import { Neat } from '../../src/neat';

describe('Genome test', () => {
    let genome: Genome;
    let neat: Neat;

    beforeEach(() => {
        neat = new Neat(2, 1, 10);
        genome = neat.emptyGenome();
    });

    it('Genome creates', () => {
        expect(genome instanceof Genome).toBe(true);
    });

    it('mutateLink', () => {
        expect(genome.connections.size()).toBe(0);
        const link = genome.mutateLink();
        expect(genome.connections.size()).toBe(1);
        expect(link instanceof ConnectionGene).toBe(true);
    });

    it('mutateNode', () => {
        let node;
        expect(genome.nodes.size()).toBe(3);
        node = genome.mutateNode();
        expect(node === null).toBe(true);
        expect(genome.nodes.size()).toBe(3);
        genome.mutateLink();
        node = genome.mutateNode();
        expect(genome.nodes.size()).toBe(4);
        expect(node instanceof NodeGene).toBe(true);
    });

    it('mutateWeightShift', () => {
        const link = genome.mutateLink();
        const weight1 = link?.weight;
        genome.mutateWeightShift();
        const weight2 = link?.weight;
        expect(weight1).not.toBe(weight2);
    });

    it('mutateWeightRandom', () => {
        const link = genome.mutateLink();
        const weight1 = link?.weight;
        genome.mutateWeightRandom();
        const weight2 = link?.weight;
        expect(weight1).not.toBe(weight2);
    });

    it('mutateLinkToggle', () => {
        const link = genome.mutateLink();
        expect(link?.enabled).toBe(true);
        genome.mutateLinkToggle();
        expect(link?.enabled).toBe(false);
    });

    it('mutates all', () => {
        expect(genome.connections.size()).toBe(0);
        expect(genome.nodes.size()).toBe(3);
        genome.mutate(true);
        expect(genome.connections.size()).toBe(2);
        expect(genome.nodes.size()).toBe(4);
        genome.mutate(true);
        expect(genome.connections.size()).toBe(4);
        expect(genome.nodes.size()).toBe(5);
    });

    it.todo('distance');
    it.todo('calculate distance right');
    it.todo('crossOver');
});
