export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;

    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface SeededRun<T> {
    result: T;
    calls: number;
    checksum: number;
}

export function withSeededRandom<T>(seed: number, fn: () => T): SeededRun<T> {
    const original = Math.random;
    const next = mulberry32(seed);
    let calls = 0;
    let checksum = 2166136261;
    Math.random = () => {
        calls++;
        const v = next();
        checksum = Math.imul(checksum ^ Math.floor(v * 4294967296), 16777619) >>> 0;

        return v;
    };
    try {
        const result = fn();

        return { result, calls, checksum };
    } finally {
        Math.random = original;
    }
}

export function withRandomValues<T>(values: number[], fn: () => T): { result: T; calls: number } {
    const original = Math.random;
    let calls = 0;
    Math.random = () => {
        if (calls >= values.length) {
            throw new Error(`Unexpected Math.random() call #${calls + 1}`);
        }

        return values[calls++];
    };
    try {
        const result = fn();

        return { result, calls };
    } finally {
        Math.random = original;
    }
}

export function float64Hex(values: number[]): string {
    const view = new DataView(new ArrayBuffer(8));
    let hex = '';
    for (const value of values) {
        view.setFloat64(0, value);
        for (let i = 0; i < 8; i++) {
            hex += view.getUint8(i).toString(16).padStart(2, '0');
        }
    }

    return hex;
}
