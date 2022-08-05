import { Species } from '../neat';

export class RandomSelector {
    #objects: Array<Species> = [];
    #survivors: number;
    #totalScore = 0;

    constructor(survivors: number) {
        this.#survivors = survivors;
    }

    add(object: Species) {
        this.#objects.push(object);
        this.#totalScore += object.score;
        this.#objects.sort((a, b) => {
            return a.score > b.score ? -1 : 1;
        });
    }

    random(): Species {
        const randomScore = Math.abs(Math.random() * this.#totalScore * this.#survivors);
        let scoreIndex = 0;
        for (let i = 0; i < this.#objects.length; i++) {
            scoreIndex += Math.abs(this.#objects[i].score);
            if (scoreIndex >= randomScore) {
                return this.#objects[i];
            }
        }
        throw new Error('random Species not found');
    }

    reset() {
        this.#objects = [];
        this.#totalScore = 0;
    }
}
