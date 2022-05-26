export class RandomSelector {
    #objects: Array<unknown> = [];
    #scores: Array<number> = [];
    #totalScore = 0;

    getObjects(): Array<unknown> {
        return this.#objects;
    }

    getScores(): Array<number> {
        return this.#scores;
    }

    getTotalScore(): number {
        return this.#totalScore;
    }

    add(object: unknown, score: number) {
        this.#objects.push(object);
        this.#scores.push(score);
        this.#totalScore += score;
    }

    random(): unknown | null {
        const randomScore = Math.random() * this.#totalScore;
        let scoreIndex = 0;

        for (let i = 0; i < this.#objects.length; i++) {
            scoreIndex += this.#scores[i];
            if (scoreIndex > randomScore) {
                return this.#objects[i];
            }
        }
        return null;
    }

    reset() {
        this.#objects = [];
        this.#scores = [];
        this.#totalScore = 0;
    }
}
