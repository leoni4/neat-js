import { Genome } from '../../src/genome';
import { Neat } from '../../src/neat';

describe('Genome test', () => {
    let genome: Genome;
    let neat: Neat;

    beforeEach(() => {
        neat = new Neat();
        genome = new Genome(neat);
    });

    it('Genome creates', () => {
        expect(genome instanceof Genome).toBe(true);
    });

    it.todo('crossOver');
    it.todo('distance');
    it.todo('mutate');
});
