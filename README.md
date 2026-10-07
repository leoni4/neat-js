# 🧬 NEAT.js

A TypeScript implementation of the NEAT (NeuroEvolution of Augmenting Topologies) algorithm for evolving neural networks.

## 🎮 Live Demo

Try the interactive demo: **[https://leoni4.github.io/neat-js/](https://leoni4.github.io/neat-js/)**

The demo showcases NEAT solving various problems including XOR, parity functions, and classification tasks with real-time visualization of the neural network evolution.

## Installation

```bash
npm install @leoni4/neat-js
```

## Usage

### Basic Library Usage

```typescript
import { Neat } from '@leoni4/neat-js';

// Create a NEAT instance
const neat = new Neat(
    2, // input nodes
    1, // output nodes
    1000, // population size
);

// Training data (XOR example)
const inputs = [
    [0, 0],
    [1, 1],
    [1, 0],
    [0, 1],
];
const outputs = [[0], [0], [1], [1]];

const solved = neat.fit(inputs, outputs, {
    verbose: 1,
});

console.log('solved in:', solved.epochs);
```

### Manual Library Usage

Could be helpfull with non linear score determination, or complex environment

```typescript
import { Neat } from '@leoni4/neat-js';

// Create a NEAT instance same as above
const neat = new Neat(2, 1, 1000);

// Training data (XOR example) ... same as above
const inputs = [
    [0, 0],
    [1, 1],
    [1, 0],
    [0, 1],
];
const outputs = [[0], [0], [1], [1]];

let finalError = 1; // just for the demo
let counter = 0;
// Evolution loop
for (let epoch = 0; epoch < 1000; epoch++) {
    // Evaluate each client
    for (const client of neat.clients) {
        let error = 0;
        inputs.forEach((input, i) => {
            const output = client.calculate(input)[0];
            error += Math.abs(output - outputs[i][0]);
        });
        error = error / inputs.length;

        // calculate error and score of the client
        client.error = error;
        client.score = 1 - client.error;

        if (finalError > error) {
            finalError = error;
        }
    }
    counter++;
    // Evolve to next generation
    neat.evolve();

    if (epoch % 10 === 0) console.log('Epoch:', epoch, ' Error:', finalError);

    if (finalError < 0.01) break;
}

console.log('Total epochs:', counter, ' Final Error:', finalError);
// ... rest of the logic
```

### Constructor

```typescript
import { Neat, EActivation } from '@leoni4/neat-js';

const neat = new Neat(
    2, // input nodes
    1, // output nodes
    100, // population size
    EActivation.sigmoid, // output activation (default: sigmoid)
    EActivation.tanh, // hidden activation (default: tanh)
    { CP: 2, PROBABILITY_MUTATE_LINK: 0.1 }, // parameters (optional)
    // 7th argument: { genome, evolveCounts } to load a saved model (optional)
);
```

The parameters are the **6th** argument. Pass both activations before them. All parameters, their defaults, and tuning tips are in [docs/PARAMETER_TUNING.md](docs/PARAMETER_TUNING.md).

Activations (`EActivation`): `none`, `linear`, `sigmoid`, `tanh`, `relu`, `leakyRelu`, `softmax`. As the output activation, `softmax` normalizes all outputs together. As the hidden activation, `softmax` acts as `linear`.

### Score rules

- Set `client.score` for **each** client before **each** `neat.evolve()` call. A higher score is better.
- The score can be any finite number (also negative). `evolve()` throws an error when a score is `NaN`, `Infinity`, or `-Infinity`.
- `evolve()` changes `client.score`. It adds a small random tie-breaker (`Math.random() * 1e-9`) and stores the result in `client.scoreRaw`. Then it replaces `client.score` with a normalized score in [0, 1] that includes a complexity penalty. Do not read `client.score` after `evolve()` as your own value.
- `neat.evolve()` takes one optional argument: `evolve(true)` turns on the global optimization mode for this call.

### Set `client.error` and `client.score`

`client.error` is not only for logging. `evolve()` compares `client.error` with `OPT_ERR_THRESHOLD` (default `0.005`) before it mutates a client. When `client.error < OPT_ERR_THRESHOLD`, the client is in self-optimization mode: it removes disabled and dead connections, and it does not add new connections or nodes.

The default value of `client.error` is `0`. If you set only `client.score`, all clients are in self-optimization mode from the second `evolve()` call, and the networks stop growing after the first connection.

- Set `client.error` to your error measure, where `0` is perfect (for example, the mean absolute error), as in the manual example above.
- If your task has no error measure, set `client.error` to a value that is not smaller than `OPT_ERR_THRESHOLD` (for example `1`) while you want the networks to grow.
- `neat.fit()` sets both `client.error` and `client.score` for you.

### Save and load a model

```typescript
import { Neat, EActivation } from '@leoni4/neat-js';

const neat = new Neat(2, 1, 100, EActivation.sigmoid, EActivation.tanh);
// ... set scores and call neat.evolve() ...

// Save
const saved = { genome: neat.model(), evolveCounts: neat.evolveCounts };
const json = JSON.stringify(saved);

// Load: use the same inputs, outputs, and activations
const restored = new Neat(2, 1, 100, EActivation.sigmoid, EActivation.tanh, { LOAD_PERCENT: 0.5 }, JSON.parse(json));
```

- `neat.model()` returns the genome of the champion (a copy of the client with the highest raw score of all generations so far). Before the first `evolve()`, it returns the genome of the best or first client.
- The model contains the genome only. It does not contain the number of inputs and outputs, the activations, or the parameters. Use the same values when you load it.
- `LOAD_PERCENT` (default `0.5`) is the fraction of clients that get their own copy of the loaded genome. The other clients start with empty genomes. `LOAD_PERCENT: 0` loads no client.
- `evolveCounts` continues the generation counter. If it is missing, `null`, or `NaN`, the constructor prints a warning and uses `0`. With `0`, the first `evolve()` call mutates all clients, also the best one (the same as for a new population). With a value that is not `0`, the best client is not mutated. The counter also sets when the next global optimization phase comes (`evolveCounts % OPTIMIZATION_PERIOD === 0`).

**Frozen model.** To use a saved model for predictions only, load it into a population of 1 and call `neat.calculate()`. It uses the champion, or the first client when there is no champion:

```typescript
const frozen = new Neat(2, 1, 1, EActivation.sigmoid, EActivation.tanh, {}, JSON.parse(json));
const output = frozen.calculate([0, 1]);
```

A population of 1 does not change after the first `evolve()` call: the only client is always the best client, and the best client is not mutated. Use a population of 1 only for frozen models.

## Development

### Running the Demo

Clone the repository and run the demo locally:

```bash
git clone https://github.com/leoni4/neat-js.git
cd neat-js
npm install
npm start
```

The demo will start a Vite development server at http://localhost:3000 with a visual demonstration of the NEAT algorithm solving the selected problem.

### Available Scripts

- `npm start` - Start the Vite development server with demo
- `npm run build` - Build the library for production
- `npm run build:demo` - Build the demo for production
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint the codebase
- `npm run typecheck` - Run TypeScript type checking

## API

### Core Classes

- **`Neat`** - Main NEAT algorithm class
- **`Client`** - Individual neural network in the population
- **`Genome`** - Genetic representation of a neural network
- **`Species`** - Group of similar genomes

### Data Structures

- **`RandomHashSet`** - Efficient random selection from a set
- **`RandomSelector`** - Weighted random selection

### Internal methods

These `Neat` methods are public in TypeScript, but they are internal. Do not call them from your code: `load()`, `loadGenome()`, `reset()`, `getConnection()`, `getNode()`, `setReplaceIndex()`, `getReplaceIndex()`, `emptyGenome()`, and the static `Neat.getConnection()`. For example, `load()` on an instance that already has clients adds a second set of clients. To load a model, use the 7th constructor argument (see [Save and load a model](#save-and-load-a-model)).

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT

## Repository

https://github.com/leoni4/neat-js
