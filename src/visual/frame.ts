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
    #toggle = false;
    #text = '';

    #width = 800;
    #height = 650;

    constructor(client: Client) {
        this.#genome = client.genome;
        this.#client = new Client(client.genome);
        this.#controls = new Controls(client.genome, this);
        this.#stage = new Konva.Stage({
            container: 'container',
            width: this.#width,
            height: this.#height,
        });
        this.#layer = new Konva.Layer();
    }

    get text(): string {
        return this.#text;
    }

    set text(value: string) {
        this.#text = value;
    }

    get toggle(): boolean {
        return this.#toggle;
    }

    set toggle(value: boolean) {
        this.#toggle = value;
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

    #renderGenome() {
        this.#stage.destroyChildren();
        this.#layer = new Konva.Layer();
        this.#stage.add(this.#layer);

        let radius = this.#height / this.#genome.nodes.size() / 20;
        radius =
            radius < this.#height / 80 ? this.#height / 80 : radius > this.#height / 20 ? this.#height / 20 : radius;
        this.#genome.connections.data.forEach(item => {
            if (item instanceof NodeGene) {
                return;
            }
            let strokeWidth = this.#toggle ? Math.abs(item.weight / 2) : 1;
            strokeWidth = strokeWidth < 1 || !item.enabled ? 1 : strokeWidth;
            strokeWidth = strokeWidth > radius / 2 ? radius / 2 : strokeWidth;
            const line = new Konva.Line({
                points: [
                    this.#width * item.from.x,
                    this.#height * item.from.y,
                    this.#width * item.to.x,
                    this.#height * item.to.y,
                ],
                stroke: item.enabled ? (item.from.x === 0.1 && item.to.x === 0.9 ? '#000' : '#0f0') : 'red',
                strokeWidth,
            });
            this.#layer.add(line);

            if (item.enabled && !this.#toggle) {
                const text = new Konva.Text({
                    x: (this.#width * item.from.x + this.#width * item.to.x) / 2,
                    y: (this.#height * item.from.y + this.#height * item.to.y) / 2,
                    text: item.weight.toFixed(2) + '',
                    fontSize: 20,
                    fontFamily: 'Calibri',
                    fill: item.weight > 0 ? 'green' : 'red',
                });
                this.#layer.add(text);
            }
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

        const gensText = new Konva.Text({
            x: 10,
            y: 60,
            text: `Nodes: ${this.#genome.nodes.data.length}`,
            fontSize: 20,
            fontFamily: 'Calibri',
            fill: '#000',
        });
        const constText = new Konva.Text({
            x: 10,
            y: 30,
            text: `Connections: ${this.#genome.connections.data.length}`,
            fontSize: 20,
            fontFamily: 'Calibri',
            fill: '#000',
        });
        const summary = new Konva.Text({
            x: 10,
            y: 0,
            text: this.text,
            fontSize: 20,
            fontFamily: 'Calibri',
            fill: '#000',
        });
        this.#layer.add(summary);
        this.#layer.add(constText);
        this.#layer.add(gensText);
        this.#layer.draw();
    }
}
