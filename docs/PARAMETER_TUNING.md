# NEAT Parameter Tuning Guide

Complete documentation for all NEAT algorithm parameters with detailed explanations, code references, and tuning recommendations.

## 📚 Full Documentation

All parameters are thoroughly documented in the `docs/params/` directory:

- **[00_INDEX.md](./params/00_INDEX.md)** - Complete overview with quick reference table, tuning scenarios, and parameter interactions
- **[01_distance_coefficients.md](./params/01_distance_coefficients.md)** - C1, C2, C3 (genetic distance calculation)
- **[02_compatibility_thresholds.md](./params/02_compatibility_thresholds.md)** - CT, CP (speciation control)
- **[03_mutation_strength.md](./params/03_mutation_strength.md)** - MUTATION_RATE, SURVIVORS, strength parameters
- **[04_mutation_probabilities.md](./params/04_mutation_probabilities.md)** - PROBABILITY\_\* parameters (mutation frequency)
- **[05_optimization_and_scoring.md](./params/05_optimization_and_scoring.md)** - OPT_ERR_THRESHOLD, ERROR_DRIVES_OPTIMIZATION, OPTIMIZATION_PERIOD, LAMBDA\_\*, EPS, PERMANENT_MAIN_CONNECTIONS, LOAD_PERCENT

## 🎯 Quick Start

### All Parameters at a Glance

The defaults are the values of `DEFAULT_PARAMS` in `src/neat/neat.ts`.

| Parameter                          | Default         | What It Does                                                         |
| ---------------------------------- | --------------- | -------------------------------------------------------------------- |
| `C1`                               | `1`             | Weight of excess genes in distance calculation                       |
| `C2`                               | `1`             | Weight of disjoint genes in distance calculation                     |
| `C3`                               | `0.2`           | Weight of weight and bias differences in distance                    |
| `CT`                               | `1`             | Minimum value of the distance divisor `N`; minimum connection count  |
| `CP`                               | `1`             | Start value of the species distance threshold (adapts each `evolve`) |
| `CP_MIN`                           | `0`             | Lower limit of the adapted `CP` (`0` = no limit)                     |
| `SPECIES_TARGET_MIN`               | `8`             | `CP` falls when there are fewer species than this                    |
| `SPECIES_TARGET_MAX`               | `25`            | `CP` grows when there are more species than this                     |
| `MUTATION_RATE`                    | `1`             | Multiplier for the link, node, and weight mutation probabilities     |
| `SURVIVORS`                        | `0.4`           | Fraction of each species that survives selection (40%)               |
| `SPECIES_SELECTION`                | `'legacy'`      | Parent species pick: `'legacy'` (top part) or `'proportional'`       |
| `WEIGHT_SHIFT_STRENGTH`            | `0.2`           | Magnitude of weight adjustments                                      |
| `BIAS_SHIFT_STRENGTH`              | `0.15`          | Magnitude of bias adjustments                                        |
| `WEIGHT_RANDOM_STRENGTH`           | `1`             | Range for random weights and new link weights                        |
| `BIAS_RANDOM_STRENGTH`             | `1`             | Range for random biases                                              |
| `BIAS_NODE_SAMPLING`               | `'legacy'`      | Bias mutation node pick: `'legacy'` (10 tries) or `'nonInput'`       |
| `PROBABILITY_MUTATE_WEIGHT_SHIFT`  | `0.8`           | How often to adjust weights and biases                               |
| `PROBABILITY_MUTATE_TOGGLE_LINK`   | `0.08`          | How often to enable/disable connections                              |
| `PROBABILITY_MUTATE_WEIGHT_RANDOM` | `0.05`          | How often to randomize weights and biases                            |
| `PROBABILITY_MUTATE_LINK`          | `0.08`          | How often to add new connections                                     |
| `PROBABILITY_MUTATE_NODES`         | `0.03`          | How often to add new nodes                                           |
| `OPT_ERR_THRESHOLD`                | `0.005`         | `client.error` limit for self-optimization; stagnation gain limit    |
| `ERROR_DRIVES_OPTIMIZATION`        | `true`          | Whether `client.error` can turn on self-optimization                 |
| `OPTIMIZATION_PERIOD`              | `100`           | Period (in `evolve()` calls) of the global optimization phase        |
| `PRESSURE_BOOST`                   | `true`          | Allow the `BOOST`, `ESCAPE`, and `PANIC` pressure levels             |
| `PRESSURE_COMPACT`                 | `true`          | Allow the `COMPACT` pressure level                                   |
| `CHAMPION_MAX_AGE`                 | `Infinity`      | Maximum number of generations one champion is kept                   |
| `PERMANENT_MAIN_CONNECTIONS`       | `false`         | Whether to protect input→output connections                          |
| `LAMBDA_HIGH`                      | `0.3`           | Complexity penalty during optimization                               |
| `LAMBDA_LOW`                       | `0.1`           | Complexity penalty during exploration                                |
| `EPS`                              | `1e-4` (0.0001) | Tie threshold for normalized scores                                  |
| `LOAD_PERCENT`                     | `0.5`           | Fraction of clients that get the loaded genome (load only)           |
| `seed`                             | —               | Seed of the random source; without it, `Math.random()` is used       |

## 🧱 Constructor

```typescript
new Neat(inputNodes, outputNodes, clients, outputActivation, hiddenActivation, params, loadData);
```

| Argument           | Default               | Meaning                                                    |
| ------------------ | --------------------- | ---------------------------------------------------------- |
| `inputNodes`       | —                     | Number of inputs                                           |
| `outputNodes`      | —                     | Number of outputs                                          |
| `clients`          | —                     | Population size                                            |
| `outputActivation` | `EActivation.sigmoid` | Activation of the output nodes                             |
| `hiddenActivation` | `EActivation.tanh`    | Activation of the hidden nodes                             |
| `params`           | `{}`                  | Parameter object (this guide)                              |
| `loadData`         | —                     | `{ genome, evolveCounts }` to load a model (see README.md) |

The parameter object is the **6th** argument. Always pass both activations before it. If you pass the parameters as the 5th argument, TypeScript rejects the call; in JavaScript the parameters are ignored and the hidden nodes use sigmoid.

## 🚀 Common Use Cases

All examples use this import:

```typescript
import { Neat, EActivation } from '@leoni4/neat-js';
```

### Scenario 1: Fast Convergence

**Goal:** Quick results, willing to sacrifice some diversity

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, EActivation.sigmoid, EActivation.tanh, {
    MUTATION_RATE: 1.5, // More aggressive
    SURVIVORS: 0.3, // Strong selection (top 30%)
    WEIGHT_SHIFT_STRENGTH: 0.3, // Larger changes
    PROBABILITY_MUTATE_WEIGHT_SHIFT: 1.5, // Frequent weight tuning (default 0.8)
    PROBABILITY_MUTATE_LINK: 0.05, // Slower growth (default 0.08)
    LAMBDA_HIGH: 0.4, // Favor simplicity
    CP: 3, // Fewer species at the start (CP adapts)
});
```

### Scenario 2: Deep Exploration

**Goal:** Find novel solutions, prioritize diversity

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, EActivation.sigmoid, EActivation.tanh, {
    MUTATION_RATE: 0.8, // More conservative
    SURVIVORS: 0.5, // Weak selection (top 50%)
    PROBABILITY_MUTATE_LINK: 0.2, // Faster structural growth (default 0.08)
    PROBABILITY_MUTATE_NODES: 0.05, // More depth (default 0.03)
    LAMBDA_LOW: 0.05, // Minimal complexity penalty
    CP: 0.5, // More species at the start (CP adapts)
    C3: 0.05, // Less weight-based speciation (default 0.2)
});
```

### Scenario 3: Fine-Tuning

**Goal:** Refine existing solution without major changes

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, EActivation.sigmoid, EActivation.tanh, {
    MUTATION_RATE: 0.5, // Conservative
    WEIGHT_SHIFT_STRENGTH: 0.1, // Small adjustments only
    BIAS_SHIFT_STRENGTH: 0.08, // Small adjustments only
    PROBABILITY_MUTATE_LINK: 0.02, // Minimal structural changes (default 0.08)
    PROBABILITY_MUTATE_NODES: 0.01, // Very rare depth changes (default 0.03)
    OPT_ERR_THRESHOLD: 0.02, // Optimize earlier (default 0.005)
    LAMBDA_HIGH: 0.5, // Strong simplicity push
});
```

### Scenario 4: Prevent Network Bloat

**Goal:** Keep networks small and efficient

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, EActivation.sigmoid, EActivation.tanh, {
    LAMBDA_LOW: 0.15, // Penalize complexity earlier
    LAMBDA_HIGH: 0.4, // Strong optimization penalty
    PROBABILITY_MUTATE_LINK: 0.04, // Slower growth (default 0.08)
    PROBABILITY_MUTATE_NODES: 0.02, // Fewer nodes (default 0.03)
    OPT_ERR_THRESHOLD: 0.015, // Optimize earlier (default 0.005)
    EPS: 1e-3, // Stronger simplicity tie-breaking
});
```

### Scenario 5: Escape Local Optima

**Goal:** Break out of stagnation

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, EActivation.sigmoid, EActivation.tanh, {
    MUTATION_RATE: 2, // High mutation
    WEIGHT_RANDOM_STRENGTH: 1.5, // Wider exploration
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.1, // More complete randomization
    SURVIVORS: 0.35, // Stronger selection
    CP: 0.5, // More species at the start (CP adapts)
});
```

The pressure levels (see [Mutation Pressure](#mutation-pressure)) also increase the mutation probabilities automatically when the champion does not improve.

## 📖 Understanding Key Concepts

### Speciation

Genomes are grouped into species based on genetic distance (`Genome.distance()`). The distance formula is:

```
distance = (C1 × excess)/N + (C2 × disjoint)/N + C3 × weightDiff
N = max(connections of genome 1, connections of genome 2, CT)
```

- Excess and disjoint genes are counted for connection genes **and** node genes.
- `weightDiff` is the average absolute difference of the matching connection weights and matching node biases.
- `N` counts connections only. `CT` is the minimum value of `N`.
- If `distance < CP` → same species (`Species.put()`).
- Each generation, each species takes a random member as its representative (`Species.reset()`). A client goes into the first species that matches, or it starts a new species.

**CP adapts.** After reproduction, `CP` is multiplied by `0.95` when there are fewer than `SPECIES_TARGET_MIN` (default 8) species, and by `1.05` when there are more than `SPECIES_TARGET_MAX` (default 25) species. The `CP` parameter is only the start value. With the default `CP_MIN: 0` there is no lower limit, so in long runs `CP` can fall close to `0`. Set `CP_MIN > 0` to keep `CP` at or above that value (see [02_compatibility_thresholds.md](./params/02_compatibility_thresholds.md)).

### Mutation Process

`evolve()` calls `Genome.mutate()` for each client, in this order:

1. **Clean-up** (only in optimization mode, see below) - Remove disabled connections, then remove connections and hidden nodes that are not on an enabled input→output path
2. **Structural mutations** - Add connections, then add nodes (skipped in optimization mode, unless the genome has fewer than `CT` connections or `PERMANENT_MAIN_CONNECTIONS` is filling the input→output connections)
3. **Toggle mutations** - Enable/disable a random connection
4. **Random weight mutations** - Randomize a connection weight and a node bias
5. **Shift weight mutations** - Shift a connection weight and a node bias

`MUTATION_RATE` and the pressure multipliers apply to the link, node, random-weight, and shift-weight probabilities. They do **not** apply to `PROBABILITY_MUTATE_TOGGLE_LINK`.

A probability `p` can be larger than 1. The code runs `while (p > this._neat.rng()) { p--; mutate(); }`, so `p = 0.3` gives one mutation with a 30% chance, and `p = 2.5` gives two mutations plus a third with a 50% chance.

The best client of the generation (`client.bestScore`) is not mutated. Exception: in the first `evolve()` call of a population (when `evolveCounts` becomes `1`), all clients are mutated.

### Optimization Phases

There are two kinds of optimization:

- **Global optimization mode** (`neat.optimization`) is on for one `evolve()` call when you call `evolve(true)`, when `evolveCounts % OPTIMIZATION_PERIOD === 0` (every 100 `evolve()` calls with the default), or when the pressure level is `COMPACT`.
- **Self-optimization** is per client: it is on when `client.error < OPT_ERR_THRESHOLD` and `ERROR_DRIVES_OPTIMIZATION` is `true` (the default). See [client.error](../README.md#set-clienterror-and-clientscore) in the README and [ERROR_DRIVES_OPTIMIZATION](./params/05_optimization_and_scoring.md#error_drives_optimization---self-optimization-from-clienterror).

Effects:

- Global mode applies `LAMBDA_HIGH` instead of `LAMBDA_LOW` in the score normalization
- Both kinds remove disabled and dead connections in `Genome.mutate()`
- Both kinds stop new connections and nodes (unless the genome has fewer than `CT` connections)
- Weight and toggle mutations continue

### Mutation Pressure

`evolve()` counts the generations in which the champion's raw score did not improve by more than `OPT_ERR_THRESHOLD` (`updateStagnationAndPressure()`). The count sets `neat.PRESSURE`, which multiplies the mutation probabilities (`MUTATION_PRESSURE_CONST`):

| Level     | When                                                      | Topology × | Weights × | Other effect                                            |
| --------- | --------------------------------------------------------- | ---------- | --------- | ------------------------------------------------------- |
| `NORMAL`  | stagnation count ≤ 80                                     | 1          | 1         | —                                                       |
| `BOOST`   | count > 80                                                | 1          | 2         | —                                                       |
| `ESCAPE`  | count > 200                                               | 2          | 2         | —                                                       |
| `PANIC`   | count > 400                                               | 5          | 2         | New children start from mutated empty genomes           |
| `COMPACT` | count > 80, complexity grows, and the score does not (\*) | 0.2        | 1         | Global optimization mode is on for this `evolve()` call |

(\*) In the last 80 generations, the complexity of the best client grew by at least 30 or by at least 10%, and the champion score grew by not more than `0.001`. `COMPACT` is checked first.

When the count becomes larger than 405, it goes back to 200.

Two switches turn the levels off (both are `true` by default):

- `PRESSURE_BOOST: false`: the level is never `BOOST`, `ESCAPE`, or `PANIC`. It is `NORMAL` unless `COMPACT` applies. The stagnation count and its reset to 200 still run, because the `COMPACT` check uses the count. Without `PANIC`, new children are never made from empty genomes.
- `PRESSURE_COMPACT: false`: the level is never `COMPACT`, and the `COMPACT` check does not turn on global optimization mode.

With both switches `false`, the level is always `NORMAL`. Use them when the fitness data is noisy or changes in each generation, so that the champion seldom improves by more than `OPT_ERR_THRESHOLD` and the stagnation count grows without a real stagnation.

`TOPOLOGY ×` multiplies the link and node probabilities. `WEIGHTS ×` multiplies the random-weight and shift-weight probabilities.

### Selection & Scoring

Each `evolve()` call (`prepareRawScores()`, `normalizeScore()`, `kill()`, `reproduce()`):

1. Read `client.score` (raw fitness; higher is better). `NaN` and `±Infinity` throw an error. A tie-breaker `rng() × 1e-9` is added (`rng` is the seeded generator with `seed`, `Math.random()` without `seed`), and the result is stored in `client.scoreRaw`
2. Complexity = connections + nodes. Penalty: `adjusted = raw − lambda × ln(1 + complexity) / ln(1 + maxComplexity) × max(rawMax − rawMin, 0.05)`
3. Normalize the adjusted scores to [0, 1] (all scores are `1` if the adjusted span is ≤ `EPS`)
4. Sort by normalized score; if two scores differ by not more than `EPS` → the simpler client comes first
5. In each species, keep the best `ceil(SURVIVORS × size)` clients by raw score (the best raw client is never removed)
6. Breed to fill the population. Parent species are picked by average normalized score from the top part of the ranking (see [SURVIVORS](./params/03_mutation_strength.md#survivors---selection-pressure)), or in proportion to it with `SPECIES_SELECTION: 'proportional'` (see [SPECIES_SELECTION](./params/03_mutation_strength.md#species_selection---parent-species-selection)). Children keep the output-node biases of the fitter parent

### Champion and Elites

- **Champion** (`neat.champion`): a copy of the client with the highest raw score of all generations so far. It changes only when a new raw score is strictly higher. `neat.model()` and `neat.calculate()` use the champion.
- **Champion age limit** (`CHAMPION_MAX_AGE`, default `Infinity` = no limit): one champion is kept for not more than `CHAMPION_MAX_AGE` generations (the generation in which it became the champion counts as 1). Then the best client of the current generation becomes the champion, also when its raw score is lower, and the stagnation count goes back to 0. Use it when the fitness data changes in each generation, so that an old lucky score does not stay the champion. With `1`, the champion is always the best client of the current generation. See [CHAMPION_MAX_AGE](./params/05_optimization_and_scoring.md#champion_max_age---champion-age-limit).
- **Elite reinsertion**: when the champion did not change for `OPTIMIZATION_PERIOD` generations, copies of the champion and the runner-up (the best client of the current generation) replace the two lowest-ranked clients.

## ⚠️ Important Notes

### Automatic Adaptations

- `CP` changes after each `evolve()` call to keep the species count between `SPECIES_TARGET_MIN` and `SPECIES_TARGET_MAX` (default 8 and 25); it does not fall below `CP_MIN` when `CP_MIN > 0`
- The pressure level increases the mutation probabilities when the champion does not improve (see [Mutation Pressure](#mutation-pressure)). `MUTATION_RATE` itself does not change
- Optimization mode activates every `OPTIMIZATION_PERIOD` (default 100) `evolve()` calls regardless of error
- Small networks (< CT connections) still add connections during optimization

### Validation Errors and Warnings

The constructor (`validateConfiguration()`) checks the parameters.

It **throws an error** when:

- Distance coefficients (C1, C2, C3) are negative
- SURVIVORS is not between 0 and 1
- SPECIES_SELECTION is not `'legacy'` or `'proportional'`
- BIAS_NODE_SAMPLING is not `'legacy'` or `'nonInput'`
- MUTATION_RATE is negative
- The number of inputs, outputs, or clients is not positive
- WEIGHT_RANDOM_STRENGTH or BIAS_RANDOM_STRENGTH = 0 while random weight mutation is on (`PROBABILITY_MUTATE_WEIGHT_RANDOM × MUTATION_RATE > 0`), because the mutation would never end. Use `PROBABILITY_MUTATE_WEIGHT_RANDOM: 0` to turn random weight mutation off
- LAMBDA_HIGH or LAMBDA_LOW is negative
- CP_MIN is negative or not finite, or CP_MIN > 0 and CP < CP_MIN
- SPECIES_TARGET_MIN or SPECIES_TARGET_MAX is not an integer, SPECIES_TARGET_MIN is negative, or SPECIES_TARGET_MIN > SPECIES_TARGET_MAX
- seed is set (not `undefined` or `null`) and is not a safe integer

It **warns** (console) when:

- PROBABILITY_MUTATE_WEIGHT_RANDOM is not between 0 and 1
- Very high values for CT (> 1000), CP (> 10), MUTATION_RATE (> 10)
- WEIGHT_SHIFT_STRENGTH > 1 may cause oscillations
- WEIGHT_SHIFT_STRENGTH or BIAS_SHIFT_STRENGTH = 0 while shift mutation is on: a shift mutation then sets the value to 0 (it does not keep it). Use `PROBABILITY_MUTATE_WEIGHT_SHIFT: 0` to turn shift mutation off
- SURVIVORS > 0.6, PROBABILITY_MUTATE_LINK > 2, LAMBDA_HIGH > 0.8, LAMBDA_LOW > 0.5
- EPS is outside [1e-6, 1e-2]
- Weight/bias shift strength imbalance > 80% triggers a rebalancing suggestion

### Parameter Dependencies

Some parameters work together:

- **C1, C2, C3** affect the distance compared to **CP**
- **MUTATION_RATE** multiplies the **PROBABILITY\_\*** values, except `PROBABILITY_MUTATE_TOGGLE_LINK`
- **CT** affects distance normalization, the minimum connection count, and the limit of weight mutations
- **LAMBDA_LOW/HIGH** switch based on the global optimization mode
- **EPS** uses normalized scores (after LAMBDA penalty)
- **OPT_ERR_THRESHOLD** is compared with `client.error` and with the champion's score gain

## 📚 Detailed Documentation

For comprehensive explanations including:

- Code references by symbol name
- Detailed formulas and algorithms
- Historical notes about default changes
- Complete tuning recommendations
- Test file references

Please see the [full documentation index](./params/00_INDEX.md).

## 🔧 Example: Creating a Custom Configuration

```typescript
import { Neat, EActivation } from '@leoni4/neat-js';

const neat = new Neat(
    3, // 3 inputs
    2, // 2 outputs
    100, // population of 100
    EActivation.sigmoid, // output activation
    EActivation.tanh, // hidden activation
    {
        // Speciation - favor topology over weights
        C1: 1.2,
        C2: 1.2,
        C3: 0.05,
        CP: 4,

        // Evolution - balanced approach
        MUTATION_RATE: 1,
        SURVIVORS: 0.4,

        // Mutations - conservative growth
        WEIGHT_SHIFT_STRENGTH: 0.2,
        BIAS_SHIFT_STRENGTH: 0.18,
        PROBABILITY_MUTATE_LINK: 0.05,
        PROBABILITY_MUTATE_NODES: 0.02,

        // Optimization - moderate complexity control
        OPT_ERR_THRESHOLD: 0.01,
        LAMBDA_LOW: 0.08,
        LAMBDA_HIGH: 0.35,
        EPS: 1e-4,

        // Protection
        PERMANENT_MAIN_CONNECTIONS: false,
    },
);

// Use the NEAT instance
for (let generation = 0; generation < 1000; generation++) {
    // Evaluate each client
    for (const client of neat.clients) {
        const output = client.calculate([input1, input2, input3]);
        client.score = evaluateFitness(output); // higher is better
        client.error = calculateError(output); // 0 is perfect; compared with OPT_ERR_THRESHOLD
    }

    // Evolve to next generation
    neat.evolve();
}
```

## 🎓 Further Reading

- [Original NEAT Paper](http://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf) by Kenneth O. Stanley
- [Code Implementation](../src/neat/neat.ts) - See the actual parameter usage
- [Test Suite](../tests/neat/) - Examples of parameter behavior
- [Demo](../demo/main.ts) - Working example with parameter customization

---

**Need more details?** Check out the [comprehensive parameter documentation](./params/00_INDEX.md) with code references, formulas, and detailed tuning guides for each parameter.
