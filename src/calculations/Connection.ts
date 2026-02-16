import { Node } from './Node.js';

export class Connection {
    from: Node;
    to: Node;
    weight = 0;
    enabled = true;

    constructor(from: Node, to: Node) {
        this.from = from;
        this.to = to;
    }
}
