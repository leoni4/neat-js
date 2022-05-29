import { Client } from './client';
import { Genome } from '../genome';

export class Species {
    #clients: Array<Client> = [];
    #representative: Client;
    #score = 0;

    constructor(client: Client) {
        this.#representative = client;
        this.#representative.species = this;
        this.#clients.push(client);
    }

    get score(): number {
        return this.#score;
    }

    get clients(): Array<Client> {
        return this.#clients;
    }

    put(client: Client, force = false): boolean {
        if (force || client.distance(this.#representative) < this.#representative.genome.neat.CP) {
            client.species = this;
            this.#clients.push(client);
            return true;
        }
        return false;
    }

    goExtinct() {
        for (let i = 0; i < this.#clients.length; i += 1) {
            const c = this.#clients[i];
            c.species = null;
        }
    }

    evaluateScore() {
        let value = 0;
        for (let i = 0; i < this.#clients.length; i += 1) {
            const c = this.#clients[i];
            value += c.score;
        }
        this.#score = value / this.#clients.length;
    }

    #getRandomClient(): Client {
        return this.#clients[Math.floor(Math.random() * this.#clients.length)];
    }

    reset() {
        this.#representative = this.#getRandomClient();
        this.goExtinct();
        this.#clients = [];
        this.#clients.push(this.#representative);
        this.#representative.species = this;
        this.#score = 0;
    }

    kill(survivors = 0.5) {
        this.#clients.sort((a, b) => {
            return a.score > b.score ? -1 : 1;
        });

        const elems = survivors * (this.#clients.length - 1);
        for (let i = this.#clients.length - 1; i > elems; i -= 1) {
            this.#clients[i].species = null;
            this.#clients.splice(i, 1);
        }
    }

    breed(): Genome {
        const c1 = this.#getRandomClient();
        const c2 = this.#getRandomClient();
        if (c1.score > c2.score) {
            return Genome.crossOver(c1.genome, c2.genome);
        } else {
            return Genome.crossOver(c2.genome, c1.genome);
        }
    }

    size(): number {
        return this.#clients.length;
    }
}
