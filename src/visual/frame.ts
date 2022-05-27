import { ConnectionGene, Genome } from '../genome';
import Matter, { Engine } from 'matter-js';

export class Frame {
    #genome: Genome;
    #radius: number;
    #engine: Engine;

    #width = 600;
    #height = 400;

    constructor(genome: Genome) {
        this.#genome = genome;
        this.#radius = 200 / genome.nodes.size();
        this.#engine = Engine.create({
            gravity: {
                x: 0,
                y: 0,
            },
        });
        this.#init();
    }

    #init() {
        const Render = Matter.Render,
            Runner = Matter.Runner;

        const render = Render.create({
            element: document.body,
            engine: this.#engine,
            options: {
                height: this.#height,
                width: this.#width,
            },
        });

        Render.run(render);

        const runner = Runner.create();

        Runner.run(runner, this.#engine);

        this.#renderGenome();
    }

    #renderGenome() {
        const Bodies = Matter.Bodies,
            World = Matter.World;

        this.#radius = this.#height / (this.#genome.nodes.size() * 3);

        this.#engine.world.bodies.splice(0, this.#engine.world.bodies.length);
        this.#genome.nodes.data.forEach(item => {
            if (item instanceof ConnectionGene) {
                return;
            }
            World.add(
                this.#engine.world,
                Bodies.circle(item.x * this.#width, item.y * this.#height, this.#radius, { isStatic: true })
            );
        });
    }
}
