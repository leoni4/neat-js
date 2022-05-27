import { Genome, NodeGene } from '../../src/genome';
import { Neat } from '../../src/neat';

describe('Genome test', () => {
    let genome: Genome;
    let neat: Neat;

    beforeEach(() => {
        neat = new Neat(2, 1, 10);
        genome = new Genome(neat);
    });

    it('Genome creates', () => {
        expect(genome instanceof Genome).toBe(true);
    });

    it.todo('calculate distance right');
    it.todo('crossOver');
    it.todo('mutate');
});
