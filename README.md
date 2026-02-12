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
import { Neat, EActivation } from '@leoni4/neat-js';

// Create a NEAT instance
const neat = new Neat(
    2, // input nodes
    1, // output nodes
    100, // population size
    EActivation.sigmoid, // output activation function
);

// Training data (XOR example)
const inputs = [
    [0, 0],
    [1, 1],
    [1, 0],
    [0, 1],
];
const outputs = [[0], [0], [1], [1]];

// Evolution loop
for (let epoch = 0; epoch < 1000; epoch++) {
    // Evaluate each client
    for (const client of neat.clients) {
        let error = 0;
        inputs.forEach((input, i) => {
            const output = client.calculate(input)[0];
            error += Math.abs(output - outputs[i][0]);
        });
        client.score = 1 - error / inputs.length;
    }

    // Evolve to next generation
    neat.evolve();
}
```

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
