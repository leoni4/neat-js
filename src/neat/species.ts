import { Client } from './client.js';
import { Genome } from '../genome/index.js';

export class Species {
    private _clients: Array<Client> = [];
    private _representative: Client;
    private _score = 0;

    constructor(client: Client) {
        this._representative = client;
        this._representative.species = this;
        this._clients.push(client);
    }

    get score(): number {
        return this._score;
    }

    get clients(): Array<Client> {
        return this._clients;
    }

    put(client: Client, force = false): boolean {
        if (force || client.distance(this._representative) < this._representative.genome.neat.CP) {
            client.species = this;
            this._clients.push(client);

            return true;
        }

        return false;
    }

    goExtinct() {
        for (let i = 0; i < this._clients.length; i += 1) {
            const c = this._clients[i];
            c.species = null;
        }
        this._clients = [];
    }

    evaluateScore() {
        let value = 0;
        for (let i = 0; i < this._clients.length; i += 1) {
            const c = this._clients[i];
            value += c.score;
        }
        this._score = value / this._clients.length;
    }

    #getRandomClient(): Client {
        return this._clients[Math.floor(Math.random() * this._clients.length)];
    }

    reset() {
        this._representative = this.#getRandomClient();
        this.goExtinct();
        this._clients.push(this._representative);
        this._representative.species = this;
        this._score = 0;
    }

    kill(survivors = 0.5) {
        this._clients.sort((a, b) => {
            return a.scoreRaw > b.scoreRaw ? -1 : 1;
        });

        const keep = Math.ceil(survivors * this._clients.length);
        for (let i = this._clients.length - 1; i >= keep; i--) {
            if (this._clients[i].bestScore) {
                continue;
            }
            this._clients[i].species = null;
            this._clients.splice(i, 1);
        }
    }

    breed(): Genome {
        const c1 = this.#getRandomClient();
        const c2 = this.#getRandomClient();
        if (c1.score >= c2.score) {
            return Genome.crossOver(c1.genome, c2.genome);
        } else {
            return Genome.crossOver(c2.genome, c1.genome);
        }
    }

    size(): number {
        return this._clients.length;
    }
}
