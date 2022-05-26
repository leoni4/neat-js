export class Gene {
    #innovationNumber: number;

    constructor(innovationNumber: number) {
        this.#innovationNumber = innovationNumber;
    }

    get innovationNumber(): number {
        return this.#innovationNumber;
    }

    set innovationNumber(value: number) {
        this.#innovationNumber = value;
    }
}
