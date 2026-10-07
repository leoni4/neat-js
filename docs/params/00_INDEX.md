# NEAT Parameter Tuning Guide - Index

Complete documentation for all NEAT algorithm parameters. Each parameter includes purpose, usage examples, code references, and tuning recommendations.

## Quick Reference Table

The defaults are the values of `DEFAULT_PARAMS` in `src/neat/neat.ts`.

| Parameter                          | Default         | Type    | Primary Effect                         |
| ---------------------------------- | --------------- | ------- | -------------------------------------- |
| **Distance & Speciation**          |                 |         |                                        |
| `C1`                               | `1`             | number  | Excess gene weight in distance         |
| `C2`                               | `1`             | number  | Disjoint gene weight in distance       |
| `C3`                               | `0.2`           | number  | Weight/bias difference coefficient     |
| `CT`                               | `1`             | number  | Minimum distance divisor and links     |
| `CP`                               | `1`             | number  | Start species threshold (adapts)       |
| `CP_MIN`                           | `0`             | number  | Lower limit of adapted CP (0 = none)   |
| `SPECIES_TARGET_MIN`               | `8`             | number  | CP falls below this species count      |
| `SPECIES_TARGET_MAX`               | `25`            | number  | CP grows above this species count      |
| **Evolution Control**              |                 |         |                                        |
| `MUTATION_RATE`                    | `1`             | number  | Mutation probability multiplier        |
| `SURVIVORS`                        | `0.4`           | number  | Survival rate (selection pressure)     |
| `SPECIES_SELECTION`                | `'legacy'`      | string  | Parent species pick (or proportional)  |
| **Weight/Bias Adjustment**         |                 |         |                                        |
| `WEIGHT_SHIFT_STRENGTH`            | `0.2`           | number  | Weight shift magnitude                 |
| `BIAS_SHIFT_STRENGTH`              | `0.15`          | number  | Bias shift magnitude                   |
| `WEIGHT_RANDOM_STRENGTH`           | `1`             | number  | Random and new-link weight range       |
| `BIAS_RANDOM_STRENGTH`             | `1`             | number  | Random bias range                      |
| **Mutation Probabilities**         |                 |         |                                        |
| `PROBABILITY_MUTATE_WEIGHT_SHIFT`  | `0.8`           | number  | Weight shift frequency                 |
| `PROBABILITY_MUTATE_TOGGLE_LINK`   | `0.08`          | number  | Connection toggle frequency            |
| `PROBABILITY_MUTATE_WEIGHT_RANDOM` | `0.05`          | number  | Full randomization frequency           |
| `PROBABILITY_MUTATE_LINK`          | `0.08`          | number  | New connection frequency               |
| `PROBABILITY_MUTATE_NODES`         | `0.03`          | number  | New node frequency                     |
| **Optimization & Scoring**         |                 |         |                                        |
| `OPT_ERR_THRESHOLD`                | `0.005`         | number  | Self-optimization and stagnation limit |
| `OPTIMIZATION_PERIOD`              | `100`           | number  | Period of global optimization          |
| `PERMANENT_MAIN_CONNECTIONS`       | `false`         | boolean | Protect input-output connections       |
| `LAMBDA_HIGH`                      | `0.3`           | number  | Complexity penalty (optimization)      |
| `LAMBDA_LOW`                       | `0.1`           | number  | Complexity penalty (exploration)       |
| `EPS`                              | `1e-4` (0.0001) | number  | Tie threshold for normalized scores    |
| **Loading**                        |                 |         |                                        |
| `LOAD_PERCENT`                     | `0.5`           | number  | Fraction of clients that get the model |

Pass the parameters as the 6th constructor argument, after both activations:

```typescript
new Neat(inputNodes, outputNodes, clients, EActivation.sigmoid, EActivation.tanh, { CP: 2 });
```

## Detailed Documentation

### [01 - Distance Coefficients](./01_distance_coefficients.md)

**C1, C2, C3** - Control genetic distance calculation and speciation

- **C1 (Excess):** How much genes beyond highest common innovation matter
- **C2 (Disjoint):** How much mismatched genes within common range matter
- **C3 (Weights):** How much weight and bias differences matter

**Formula:** `distance = (C1 * excess) / N + (C2 * disjoint) / N + C3 * weightDiff`, with `N = max(connections1, connections2, CT)`

### [02 - Compatibility Thresholds](./02_compatibility_thresholds.md)

**CT, CP** - Control normalization and species formation

- **CT:** Minimum value of the divisor `N`; genomes with fewer than `CT` connections always add connections; limits the weight mutation count
- **CP:** Maximum distance for same species (start value; `evolve()` adapts it)

**Relationship:** If `distance < CP` → same species, else → new species

### [03 - Mutation Strength](./03_mutation_strength.md)

**MUTATION_RATE, SURVIVORS, Strength Parameters** - Control evolution intensity

- **MUTATION_RATE:** Multiplier for the link, node, and weight mutation probabilities (constant; the pressure levels add their own multipliers)
- **SURVIVORS:** What fraction survives selection (0.4 = top 40%) and which species can be parents
- **SPECIES_SELECTION:** `'legacy'` (only the top species are parents) or `'proportional'` (parent species in proportion to their scores)
- **WEIGHT_SHIFT_STRENGTH:** How much to adjust weights by
- **BIAS_SHIFT_STRENGTH:** How much to adjust biases by
- **WEIGHT_RANDOM_STRENGTH:** Range for weight randomization and new link weights
- **BIAS_RANDOM_STRENGTH:** Range for bias randomization

### [04 - Mutation Probabilities](./04_mutation_probabilities.md)

**PROBABILITY\_\* Parameters** - Control mutation frequency

- **PROBABILITY_MUTATE_WEIGHT_SHIFT (0.8):** Most frequent - fine-tuning
- **PROBABILITY_MUTATE_LINK (0.08):** Add connections
- **PROBABILITY_MUTATE_TOGGLE_LINK (0.08):** Enable/disable
- **PROBABILITY_MUTATE_WEIGHT_RANDOM (0.05):** Rare - large jumps
- **PROBABILITY_MUTATE_NODES (0.03):** Rare - add depth

**Ratio:** about 27:2.7:2.7:1.7:1 (shift:link:toggle:random:node)

### [05 - Optimization and Scoring](./05_optimization_and_scoring.md)

**Optimization Parameters** - Control complexity management

- **OPT_ERR_THRESHOLD:** When a client enters self-optimization (`client.error` below it) and the minimum score gain that resets stagnation
- **OPTIMIZATION_PERIOD:** Period of the global optimization phase and of elite reinsertion
- **PERMANENT_MAIN_CONNECTIONS:** Whether to protect input→output connections
- **LAMBDA_HIGH:** Strong complexity penalty during optimization
- **LAMBDA_LOW:** Light complexity penalty during exploration
- **EPS:** Tie threshold (simpler client first when normalized scores are close)
- **LOAD_PERCENT:** Fraction of clients that get the loaded genome

## Common Tuning Scenarios

The comments compare each value with the default.

### Fast Convergence (Favor Speed)

```typescript
{
    MUTATION_RATE: 1.5,              // More mutations
    SURVIVORS: 0.3,                   // Strong selection (top 30%)
    WEIGHT_SHIFT_STRENGTH: 0.3,       // Larger weight changes
    PROBABILITY_MUTATE_WEIGHT_SHIFT: 1.5, // More weight tuning
    PROBABILITY_MUTATE_LINK: 0.05,    // Slower structural growth
    LAMBDA_HIGH: 0.4,                 // Strong simplicity bias
    CP: 3                             // Fewer, larger species at the start
}
```

### Deep Exploration (Favor Diversity)

```typescript
{
    MUTATION_RATE: 0.8,               // Less aggressive
    SURVIVORS: 0.5,                   // Weak selection (top 50%)
    PROBABILITY_MUTATE_LINK: 0.2,     // Faster growth
    PROBABILITY_MUTATE_NODES: 0.05,   // More depth
    LAMBDA_LOW: 0.05,                 // Minimal complexity penalty
    CP: 0.5,                          // More species at the start
    C3: 0.05                          // Less weight-based speciation
}
```

### Fine-Tuning Existing Solution

```typescript
{
    MUTATION_RATE: 0.5,               // Conservative
    SURVIVORS: 0.4,                   // Moderate selection
    WEIGHT_SHIFT_STRENGTH: 0.1,       // Small adjustments
    BIAS_SHIFT_STRENGTH: 0.08,        // Small adjustments
    PROBABILITY_MUTATE_LINK: 0.02,    // Minimal growth
    PROBABILITY_MUTATE_NODES: 0.01,   // Minimal depth changes
    OPT_ERR_THRESHOLD: 0.02,          // Earlier optimization
    LAMBDA_HIGH: 0.5                  // Strong simplicity push
}
```

### Prevent Bloat (Complex Problem)

```typescript
{
    LAMBDA_LOW: 0.15,                 // Higher exploration penalty
    LAMBDA_HIGH: 0.4,                 // Strong optimization penalty
    PROBABILITY_MUTATE_LINK: 0.04,    // Slower growth
    PROBABILITY_MUTATE_NODES: 0.02,   // Fewer nodes
    OPT_ERR_THRESHOLD: 0.015,         // Optimize earlier
    EPS: 1e-3                         // Stronger tie-breaking for simplicity
}
```

### Stuck Population (Escape Local Optima)

```typescript
{
    MUTATION_RATE: 2,                 // High mutation (pressure levels add more when stuck)
    WEIGHT_RANDOM_STRENGTH: 1.5,      // Wider exploration
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.1, // More randomization
    SURVIVORS: 0.35,                  // Stronger selection
    CP: 0.5                           // More species at the start
}
```

## Parameter Interaction Diagrams

### Evolution Flow

One `evolve()` call (`Neat.evolve()`):

```
Scores → Champion + Pressure → Penalize + Normalize → Elites? → Speciate (CP) → Kill (SURVIVORS)
           (stagnation count)    (LAMBDA_LOW/HIGH, EPS)
    → Reproduce → Adapt CP → Mutate (MUTATION_RATE × pressure × PROBABILITY_*) → Next Gen
```

See [Selection & Scoring](../PARAMETER_TUNING.md#selection--scoring) and [Mutation Pressure](../PARAMETER_TUNING.md#mutation-pressure) for the details.

### Speciation Process

```
Genome A ←→ distance(A,B) = (C1*excess)/N + (C2*disjoint)/N + C3*weightDiff
Genome B

N = max(connections A, connections B, CT)
If distance < CP: Same species
Else: Different species

After reproduction: CP × 0.95 if species < SPECIES_TARGET_MIN (8), CP × 1.05 if species > SPECIES_TARGET_MAX (25); CP >= CP_MIN if CP_MIN > 0
```

### Optimization Trigger

```
evolve(true) OR evolveCounts % OPTIMIZATION_PERIOD === 0 OR pressure COMPACT  →  global optimization mode
client.error < OPT_ERR_THRESHOLD                                              →  self-optimization of that client
    ↓
LAMBDA_HIGH applied (global mode only)
    ↓
Remove disabled and dead connections
    ↓
No new links/nodes (unless connections < CT)
    ↓
Toggle and weight mutations continue
```

### Selection Process

```
Raw Scores → Apply Complexity Penalty (LAMBDA) → Normalize → Sort (ties within EPS: simpler first)
                                                                          ↓
                                   Keep Top SURVIVORS % per species (by raw score) → Reproduce → Mutate
```

## Validation and Warnings

The constructor (`validateConfiguration()`) throws an error (**ERROR**) or prints a console warning:

| Condition                                                                                                              | Result                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `C1, C2, C3 < 0`                                                                                                       | **ERROR:** Must be non-negative                                                                                       |
| `SURVIVORS not in [0,1]`                                                                                               | **ERROR:** Must be between 0 and 1                                                                                    |
| `MUTATION_RATE < 0`                                                                                                    | **ERROR:** Must be non-negative                                                                                       |
| Inputs, outputs, or clients `<= 0`                                                                                     | **ERROR:** Must be positive                                                                                           |
| `LAMBDA_HIGH < 0` or `LAMBDA_LOW < 0`                                                                                  | **ERROR:** Must be non-negative                                                                                       |
| `PROBABILITY_MUTATE_WEIGHT_RANDOM not in [0,1]`                                                                        | Typically should be between 0 and 1                                                                                   |
| `CT > 1000`                                                                                                            | Unusually high normalization threshold                                                                                |
| `CP > 10`                                                                                                              | Unusually high species threshold                                                                                      |
| `MUTATION_RATE > 10`                                                                                                   | Unusually high mutation rate                                                                                          |
| `WEIGHT_SHIFT_STRENGTH > 1`                                                                                            | May cause oscillations                                                                                                |
| `WEIGHT_RANDOM_STRENGTH` or `BIAS_RANDOM_STRENGTH` is `0` while `PROBABILITY_MUTATE_WEIGHT_RANDOM × MUTATION_RATE > 0` | **ERROR:** Random weight mutation would never end. Use `PROBABILITY_MUTATE_WEIGHT_RANDOM: 0` to turn it off           |
| `WEIGHT_SHIFT_STRENGTH` or `BIAS_SHIFT_STRENGTH` is `0` while `PROBABILITY_MUTATE_WEIGHT_SHIFT × MUTATION_RATE > 0`    | A shift mutation sets the value to `0` (it does not keep it). Use `PROBABILITY_MUTATE_WEIGHT_SHIFT: 0` to turn it off |
| `SURVIVORS > 0.6`                                                                                                      | Weak selection pressure                                                                                               |
| `PROBABILITY_MUTATE_LINK > 2`                                                                                          | Risk of rapid network bloat                                                                                           |
| `LAMBDA_HIGH > 0.8`                                                                                                    | May prevent necessary growth                                                                                          |
| `LAMBDA_LOW > 0.5`                                                                                                     | May restrict exploration                                                                                              |
| `EPS outside [1e-6, 1e-2]`                                                                                             | Outside typical range                                                                                                 |
| Weight/Bias shift strength imbalance >80%                                                                              | Consider balancing mutation strengths                                                                                 |

When you load a model without a valid `evolveCounts` (`undefined`, `null`, or `NaN`), the constructor warns and uses `0`.

## Files Organization

```
docs/params/
├── 00_INDEX.md (this file)
├── 01_distance_coefficients.md    # C1, C2, C3
├── 02_compatibility_thresholds.md # CT, CP
├── 03_mutation_strength.md        # MUTATION_RATE, SURVIVORS, *_STRENGTH
├── 04_mutation_probabilities.md   # PROBABILITY_* parameters
└── 05_optimization_and_scoring.md # OPT_ERR_THRESHOLD, OPTIMIZATION_PERIOD, LAMBDA_*, EPS, PERMANENT_MAIN_CONNECTIONS, LOAD_PERCENT
```

## See Also

- **Main README:** Project overview, quick start, saving and loading models, score rules
- **API Documentation:** Full API reference for the Neat class
- **Tests:** `tests/neat/` and `tests/genome/` for parameter behavior examples
- **Demo:** `demo/main.ts` for example parameter configurations
