import { Species } from '../neat';

export class RandomSelector {
    #objects: Array<Species> = [];
    #scores: Array<number> = [];
    #totalScore = 0;

    get objects(): Array<Species> {
        return this.#objects;
    }

    get scores(): Array<number> {
        return this.#scores;
    }

    get totalScore(): number {
        return this.#totalScore;
    }

    add(object: Species, score: number) {
        this.#objects.push(object);
        this.#scores.push(score);
        this.#totalScore += score;
    }

    random(): Species {
        const randomScore = Math.random() * this.#totalScore;
        let scoreIndex = 0;
        for (let i = 0; i < this.#objects.length; i++) {
            scoreIndex += this.#scores[i];
            if (scoreIndex >= randomScore) {
                return this.#objects[i];
            }
        }
        throw new Error('random Species not found');
    }

    reset() {
        this.#objects = [];
        this.#scores = [];
        this.#totalScore = 0;
    }
}
