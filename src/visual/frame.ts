import { ConnectionGene, Genome, NodeGene } from '../genome';
import Konva from 'konva';
import { Controls } from './controls';

export class Frame {
    #genome: Genome;
    #stage: Konva.Stage;
    #layer: Konva.Layer;

    #width = 800;
    #height = 400;

    constructor(genome: Genome) {
        this.#genome = genome;
        new Controls(genome);
        this.#stage = new Konva.Stage({
            container: 'container',
            width: this.#width,
            height: this.#height,
        });
        this.#layer = new Konva.Layer();
        this.#init();
    }

    #init() {
        this.#stage.add(this.#layer);
        this.#layer.draw();
        setInterval(() => {
            this.#renderGenome();
        }, 1000 / 30);
    }

    #renderGenome() {
        this.#layer.removeChildren();
        this.#genome.connections.data.forEach(item => {
            if (item instanceof NodeGene) {
                return;
            }
            let strokeWidth = item.weight * 5;
            strokeWidth = strokeWidth < 1 || !item.enabled ? 1 : strokeWidth;
            const line = new Konva.Line({
                points: [
                    this.#width * item.from.x,
                    this.#height * item.from.y,
                    this.#width * item.to.x,
                    this.#height * item.to.y,
                ],
                stroke: item.enabled ? '#0f0' : 'red',
                strokeWidth,
            });

            this.#layer.add(line);
        });

        let radius = this.#height / this.#genome.nodes.size() / 2;
        radius =
            radius < this.#height / 40 ? this.#height / 40 : radius > this.#height / 20 ? this.#height / 20 : radius;
        this.#genome.nodes.data.forEach(item => {
            if (item instanceof ConnectionGene) {
                return;
            }

            const circle = new Konva.Circle({
                x: this.#width * item.x,
                y: this.#height * item.y,
                radius,
                fill: '#0f0',
                stroke: 'black',
                strokeWidth: 1,
            });

            this.#layer.add(circle);
        });
    }
}
