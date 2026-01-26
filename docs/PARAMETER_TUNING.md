# NEAT Parameter Tuning Guide

Complete documentation for all NEAT algorithm parameters with detailed explanations, code references, and tuning recommendations.

## 📚 Full Documentation

All parameters are thoroughly documented in the `docs/params/` directory:

- **[00_INDEX.md](./params/00_INDEX.md)** - Complete overview with quick reference table, tuning scenarios, and parameter interactions
- **[01_distance_coefficients.md](./params/01_distance_coefficients.md)** - C1, C2, C3 (genetic distance calculation)
- **[02_compatibility_thresholds.md](./params/02_compatibility_thresholds.md)** - CT, CP (speciation control)
- **[03_mutation_strength.md](./params/03_mutation_strength.md)** - MUTATION_RATE, SURVIVORS, strength parameters
- **[04_mutation_probabilities.md](./params/04_mutation_probabilities.md)** - PROBABILITY\_\* parameters (mutation frequency)
- **[05_optimization_and_scoring.md](./params/05_optimization_and_scoring.md)** - OPT*ERR_THRESHOLD, LAMBDA*\*, EPS, PERMANENT_MAIN_CONNECTIONS

## 🎯 Quick Start

### All Parameters at a Glance

| Parameter                          | Default         | What It Does                                     |
| ---------------------------------- | --------------- | ------------------------------------------------ |
| `C1`                               | `1`             | Weight of excess genes in distance calculation   |
| `C2`                               | `1`             | Weight of disjoint genes in distance calculation |
| `C3`                               | `0.1`           | Weight of weight differences in distance         |
| `CT`                               | `20`            | Threshold for distance normalization             |
| `CP`                               | `clients/20`    | Species compatibility threshold                  |
| `MUTATION_RATE`                    | `1`             | Global mutation intensity multiplier             |
| `SURVIVORS`                        | `0.4`           | Fraction surviving selection (40%)               |
| `WEIGHT_SHIFT_STRENGTH`            | `0.2`           | Magnitude of weight adjustments                  |
| `BIAS_SHIFT_STRENGTH`              | `0.15`          | Magnitude of bias adjustments                    |
| `WEIGHT_RANDOM_STRENGTH`           | `1`             | Range for complete weight randomization          |
| `PROBABILITY_MUTATE_WEIGHT_SHIFT`  | `3`             | How often to adjust weights                      |
| `PROBABILITY_MUTATE_TOGGLE_LINK`   | `0.3`           | How often to enable/disable connections          |
| `PROBABILITY_MUTATE_WEIGHT_RANDOM` | `0.05`          | How often to completely randomize weights        |
| `PROBABILITY_MUTATE_LINK`          | `0.8`           | How often to add new connections                 |
| `PROBABILITY_MUTATE_NODES`         | `0.03`          | How often to add new nodes                       |
| `OPT_ERR_THRESHOLD`                | `0.01`          | Error threshold to trigger optimization mode     |
| `PERMANENT_MAIN_CONNECTIONS`       | `false`         | Whether to protect input→output connections      |
| `LAMBDA_HIGH`                      | `0.3`           | Complexity penalty during optimization           |
| `LAMBDA_LOW`                       | `0.1`           | Complexity penalty during exploration            |
| `EPS`                              | `1e-4` (0.0001) | Tie-breaking threshold for score comparison      |

## 🚀 Common Use Cases

### Scenario 1: Fast Convergence

**Goal:** Quick results, willing to sacrifice some diversity

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, activation, {
    MUTATION_RATE: 1.5, // More aggressive
    SURVIVORS: 0.3, // Strong selection (top 30%)
    WEIGHT_SHIFT_STRENGTH: 0.3, // Larger changes
    PROBABILITY_MUTATE_WEIGHT_SHIFT: 5, // Frequent weight tuning
    PROBABILITY_MUTATE_LINK: 0.5, // Slower growth
    LAMBDA_HIGH: 0.4, // Favor simplicity
    CP: 3, // Fewer species
});
```

### Scenario 2: Deep Exploration

**Goal:** Find novel solutions, prioritize diversity

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, activation, {
    MUTATION_RATE: 0.8, // More conservative
    SURVIVORS: 0.5, // Weak selection (top 50%)
    PROBABILITY_MUTATE_LINK: 1.2, // Faster structural growth
    PROBABILITY_MUTATE_NODES: 0.05, // More depth
    LAMBDA_LOW: 0.05, // Minimal complexity penalty
    CP: 2, // More species
    C3: 0.05, // Less weight-based speciation
});
```

### Scenario 3: Fine-Tuning

**Goal:** Refine existing solution without major changes

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, activation, {
    MUTATION_RATE: 0.5, // Conservative
    WEIGHT_SHIFT_STRENGTH: 0.1, // Small adjustments only
    BIAS_SHIFT_STRENGTH: 0.08, // Small adjustments only
    PROBABILITY_MUTATE_LINK: 0.1, // Minimal structural changes
    PROBABILITY_MUTATE_NODES: 0.01, // Very rare depth changes
    OPT_ERR_THRESHOLD: 0.02, // Optimize earlier
    LAMBDA_HIGH: 0.5, // Strong simplicity push
});
```

### Scenario 4: Prevent Network Bloat

**Goal:** Keep networks small and efficient

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, activation, {
    LAMBDA_LOW: 0.15, // Penalize complexity earlier
    LAMBDA_HIGH: 0.4, // Strong optimization penalty
    PROBABILITY_MUTATE_LINK: 0.6, // Slower growth
    PROBABILITY_MUTATE_NODES: 0.02, // Fewer nodes
    OPT_ERR_THRESHOLD: 0.015, // Optimize slightly earlier
    EPS: 1e-3, // Stronger simplicity tie-breaking
});
```

### Scenario 5: Escape Local Optima

**Goal:** Break out of stagnation

```typescript
const neat = new Neat(inputNodes, outputNodes, populationSize, activation, {
    MUTATION_RATE: 2, // High mutation
    WEIGHT_RANDOM_STRENGTH: 1.5, // Wider exploration
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.1, // More complete randomization
    SURVIVORS: 0.35, // Stronger selection
    CP: 4, // More species for diversity
});
```

## 📖 Understanding Key Concepts

### Speciation

Genomes are grouped into species based on genetic distance. The distance formula is:

```
distance = (C1 × excess)/N + (C2 × disjoint)/N + C3 × weightDiff
```

- If `distance < CP` → same species
- If `N < CT` → no normalization (N=1)

### Mutation Process

Each generation:

1. **Weight mutations** (most frequent) - Fine-tune existing connections
2. **Toggle mutations** (moderate) - Enable/disable connections
3. **Structural mutations** (rare) - Add connections/nodes
4. All probabilities are multiplied by `MUTATION_RATE`

### Optimization Phases

Every 10 generations OR when error < `OPT_ERR_THRESHOLD`:

- Apply `LAMBDA_HIGH` instead of `LAMBDA_LOW`
- Remove disabled connections
- Freeze topology (no new structure unless network is very small)
- Continue weight mutations for fine-tuning

### Selection & Scoring

1. Calculate raw fitness scores
2. Apply complexity penalty: `adjusted = raw - lambda × complexity_normalized × score_span`
3. Normalize to [0, 1]
4. If scores within `EPS` → choose simplest
5. Keep top `SURVIVORS` fraction
6. Breed to fill population

## ⚠️ Important Notes

### Automatic Adaptations

- `MUTATION_RATE` automatically increases when population is stuck (error not improving)
- Optimization mode activates every 10 generations regardless of error
- Small networks (< CT connections) are encouraged to grow even during optimization

### Validation Warnings

The code will warn you about potentially problematic values:

- Distance coefficients must be non-negative
- SURVIVORS must be between 0 and 1
- Very high values for CT, CP, MUTATION_RATE trigger warnings
- WEIGHT_SHIFT_STRENGTH > 1 may cause oscillations
- Weight/bias imbalance > 80% triggers rebalancing suggestion

### Parameter Dependencies

Some parameters work together:

- **C1, C2, C3** affect the distance compared to **CP**
- **MUTATION_RATE** multiplies all **PROBABILITY\_\*** values
- **CT** affects both distance normalization and mutation behavior
- **LAMBDA_LOW/HIGH** switch based on optimization phase
- **EPS** uses normalized scores (after LAMBDA penalty)

## 📚 Detailed Documentation

For comprehensive explanations including:

- Code references with line numbers
- Detailed formulas and algorithms
- Historical notes about default changes
- Complete tuning recommendations
- Test file references

Please see the [full documentation index](./params/00_INDEX.md).

## 🔧 Example: Creating a Custom Configuration

```typescript
import { Neat, EActivation } from 'neat-js';

const customNeat = new Neat(
    3, // 3 inputs
    2, // 2 outputs
    100, // population of 100
    EActivation.sigmoid, // sigmoid activation
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
        PROBABILITY_MUTATE_LINK: 0.6,
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
        client.score = evaluateFitness(output);
        client.error = calculateError(output);
    }

    // Evolve to next generation
    neat.evolve(false, averageError);
}
```

## 🎓 Further Reading

- [Original NEAT Paper](http://nn.cs.utexas.edu/downloads/papers/stanley.ec02.pdf) by Kenneth O. Stanley
- [Code Implementation](../src/neat/neat.ts) - See the actual parameter usage
- [Test Suite](../tests/neat/) - Examples of parameter behavior
- [Demo](../demo/main.ts) - Working example with parameter customization

---

**Need more details?** Check out the [comprehensive parameter documentation](./params/00_INDEX.md) with code references, formulas, and detailed tuning guides for each parameter.
