import { Gene } from '../../src/genome';

describe('Gene test', () => {
    let gene: Gene;

    beforeEach(() => {
        gene = new Gene(1);
    });

    it('creates Gene', () => {
        expect(gene instanceof Gene).toBe(true);
    });

    it('gets and sets innovationNumber', () => {
        expect(gene.innovationNumber).toBe(1);
        gene.innovationNumber = 2;
        expect(gene.innovationNumber).toBe(2);
    });
});
