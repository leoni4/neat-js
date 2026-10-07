import { Neat } from '../../src/neat/neat.js';
import { Genome } from '../../src/genome/genome.js';
import { NodeGene } from '../../src/genome/nodeGene.js';

export type NodeLayout = Record<number, { x: number; y: number }>;

export interface LinkSpec {
    from: number;
    to: number;
    weight: number;
    enabled?: boolean;
    replaceIndex?: number;
}

export interface GenomeSpec {
    nodes: Record<number, number>;
    links: LinkSpec[];
}

function layoutNode(layout: NodeLayout, id: number): NodeGene {
    const node = new NodeGene(id);
    node.x = layout[id].x;
    node.y = layout[id].y;

    return node;
}

export function registerLinks(neat: Neat, layout: NodeLayout, links: Array<[number, number]>): number[] {
    return links.map(
        ([from, to]) => neat.getConnection(layoutNode(layout, from), layoutNode(layout, to)).innovationNumber,
    );
}

export function buildGenome(neat: Neat, layout: NodeLayout, spec: GenomeSpec): Genome {
    const nodes = Object.keys(spec.nodes)
        .map(Number)
        .sort((a, b) => a - b)
        .map(id => ({ innovationNumber: id, bias: spec.nodes[id], x: layout[id].x, y: layout[id].y }));
    const connections = spec.links.map(link => ({
        from: link.from,
        to: link.to,
        weight: link.weight,
        enabled: link.enabled ?? true,
        replaceIndex: link.replaceIndex ?? 0,
    }));

    return neat.loadGenome({ nodes, connections });
}
