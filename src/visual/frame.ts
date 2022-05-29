import { ConnectionGene, Genome, NodeGene } from '../genome';
import Konva from 'konva';
import { Controls } from './controls';
import { Client } from '../neat';

export class Frame {
    #genome: Genome;
    #stage: Konva.Stage;
    #layer: Konva.Layer;
    #controls: Controls;
    #client: Client;

    #width = 800;
    #height = 400;

    constructor(genome: Genome) {
        this.#genome = genome;
        this.#client = new Client(genome);
        this.#controls = new Controls(genome);
        this.#stage = new Konva.Stage({
            container: 'container',
            width: this.#width,
            height: this.#height,
        });
        this.#layer = new Konva.Layer();
        this.#init();
    }

    get genome(): Genome {
        return this.#genome;
    }

    set genome(value: Genome) {
        this.#genome = value;
        this.#controls.genome = value;
        this.#renderGenome();
    }

    get client(): Client {
        return this.#client;
    }

    set client(value: Client) {
        this.#client = value;
        this.#controls.client = value;
    }

    #init() {
        this.#stage.add(this.#layer);
        this.#layer.draw();
    }

    #renderGenome() {
        this.#layer.removeChildren();

        let radius = this.#height / this.#genome.nodes.size() / 2;
        radius =
            radius < this.#height / 40 ? this.#height / 40 : radius > this.#height / 20 ? this.#height / 20 : radius;
        this.#genome.connections.data.forEach(item => {
            if (item instanceof NodeGene) {
                return;
            }
            let strokeWidth = item.weight * 5;
            strokeWidth = strokeWidth < 1 || !item.enabled ? 1 : strokeWidth;
            strokeWidth = strokeWidth > radius / 2 ? radius / 2 : strokeWidth;
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
