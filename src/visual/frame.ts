import { ConnectionGene, Genome, NodeGene } from '../genome';
import Konva from 'konva';
import { Controls } from './controls';
import { Client } from '../neat';

interface FrameOptions {
    width?: number;
    height?: number;
}

export class Frame {
    #genome: Genome;
    #stage: Konva.Stage;
    #layer: Konva.Layer;
    #controls: Controls;
    #client: Client;
    #toggle = false;
    #text = '';

    readonly #width: number;
    readonly #height: number;

    constructor(client: Client, containerId: string, options?: FrameOptions) {
        this.#width = options?.width || 800;
        this.#height = options?.height || 650;
        this.#genome = client.genome;
        this.#client = new Client(client.genome, 'none');
        this.#controls = new Controls(client.genome, this);
        this.#stage = new Konva.Stage({
            container: containerId,
            width: this.#width,
            height: this.#height,
        });
        this.#layer = new Konva.Layer();
        this.#stage.add(this.#layer);
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

    get controls(): Controls {
        return this.#controls;
    }

    #renderGenome() {
        this.#layer.destroyChildren();

        let radius = this.#height / this.#genome.nodes.size() / 20;
        radius = radius < 5 ? 5 : radius > this.#height / 20 ? this.#height / 20 : radius;
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
                stroke: item.enabled ? (item.from.x === 0.01 && item.to.x === 0.99 ? '#000' : '#0f0') : 'red',
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

            if (item.x !== 0.01 && item.x !== 0.99 && !this.#toggle) {
                const text = new Konva.Text({
                    x: this.#width * item.x,
                    y: this.#height * item.y,
                    text: item.bias.toFixed(2) + '',
                    fontSize: 15,
                    fontFamily: 'Calibri',
                    fill: item.bias > 0 ? 'green' : 'red',
                });
                this.#layer.add(text);
            }
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
