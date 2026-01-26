# NEAT Parameter Tuning Guide - Index

Complete documentation for all NEAT algorithm parameters. Each parameter includes purpose, usage examples, code references, and tuning recommendations.

## Quick Reference Table

| Parameter                          | Default         | Type    | Primary Effect                     |
| ---------------------------------- | --------------- | ------- | ---------------------------------- |
| **Distance & Speciation**          |                 |         |                                    |
| `C1`                               | `1`             | number  | Excess gene weight in distance     |
| `C2`                               | `1`             | number  | Disjoint gene weight in distance   |
| `C3`                               | `0.1`           | number  | Weight difference coefficient      |
| `CT`                               | `20`            | number  | Normalization threshold            |
| `CP`                               | `clients/20`    | number  | Species distance threshold         |
| **Evolution Control**              |                 |         |                                    |
| `MUTATION_RATE`                    | `1`             | number  | Global mutation multiplier         |
| `SURVIVORS`                        | `0.4`           | number  | Survival rate (selection pressure) |
| **Weight/Bias Adjustment**         |                 |         |                                    |
| `WEIGHT_SHIFT_STRENGTH`            | `0.2`           | number  | Weight shift magnitude             |
| `BIAS_SHIFT_STRENGTH`              | `0.15`          | number  | Bias shift magnitude               |
| `WEIGHT_RANDOM_STRENGTH`           | `1`             | number  | Random weight range                |
| **Mutation Probabilities**         |                 |         |                                    |
| `PROBABILITY_MUTATE_WEIGHT_SHIFT`  | `3`             | number  | Weight shift frequency             |
| `PROBABILITY_MUTATE_TOGGLE_LINK`   | `0.3`           | number  | Connection toggle frequency        |
| `PROBABILITY_MUTATE_WEIGHT_RANDOM` | `0.05`          | number  | Full randomization frequency       |
| `PROBABILITY_MUTATE_LINK`          | `0.8`           | number  | New connection frequency           |
| `PROBABILITY_MUTATE_NODES`         | `0.03`          | number  | New node frequency                 |
| **Optimization & Scoring**         |                 |         |                                    |
| `OPT_ERR_THRESHOLD`                | `0.01`          | number  | Optimization trigger threshold     |
| `PERMANENT_MAIN_CONNECTIONS`       | `false`         | boolean | Protect input-output connections   |
| `LAMBDA_HIGH`                      | `0.3`           | number  | Complexity penalty (optimization)  |
| `LAMBDA_LOW`                       | `0.1`           | number  | Complexity penalty (exploration)   |
| `EPS`                              | `1e-4` (0.0001) | number  | Tie-breaking threshold             |

## Detailed Documentation

### [01 - Distance Coefficients](./01_distance_coefficients.md)

**C1, C2, C3** - Control genetic distance calculation and speciation

- **C1 (Excess):** How much genes beyond highest common innovation matter
- **C2 (Disjoint):** How much mismatched genes within common range matter
- **C3 (Weights):** How much weight differences matter

**Formula:** `distance = (C1 * excess) / N + (C2 * disjoint) / N + C3 * weightDiff`

### [02 - Compatibility Thresholds](./02_compatibility_thresholds.md)

**CT, CP** - Control normalization and species formation

- **CT:** When to normalize distance by genome size (prevents small genome bias)
- **CP:** Maximum distance for same species (primary speciation control)

**Relationship:** If `distance < CP` → same species, else → new species

### [03 - Mutation Strength](./03_mutation_strength.md)

**MUTATION_RATE, SURVIVORS, Strength Parameters** - Control evolution intensity

- **MUTATION_RATE:** Global multiplier for all mutations (auto-increases when stuck)
- **SURVIVORS:** What fraction survives selection (0.4 = top 40%)
- **WEIGHT_SHIFT_STRENGTH:** How much to adjust weights by
- **BIAS_SHIFT_STRENGTH:** How much to adjust biases by
- **WEIGHT_RANDOM_STRENGTH:** Range for complete randomization

### [04 - Mutation Probabilities](./04_mutation_probabilities.md)

**PROBABILITY\_\* Parameters** - Control mutation frequency

- **PROBABILITY_MUTATE_WEIGHT_SHIFT (3):** Most frequent - fine-tuning
- **PROBABILITY_MUTATE_LINK (0.8):** Common - add connections
- **PROBABILITY_MUTATE_TOGGLE_LINK (0.3):** Moderate - enable/disable
- **PROBABILITY_MUTATE_WEIGHT_RANDOM (0.05):** Rare - large jumps
- **PROBABILITY_MUTATE_NODES (0.03):** Rare - add depth

**Ratio:** 100:27:10:1.7:1 (shift:link:toggle:random:node)

### [05 - Optimization and Scoring](./05_optimization_and_scoring.md)

**Optimization Parameters** - Control complexity management

- **OPT_ERR_THRESHOLD:** When to enter optimization mode (freeze topology, clean up)
- **PERMANENT_MAIN_CONNECTIONS:** Whether to protect input→output connections
- **LAMBDA_HIGH:** Strong complexity penalty during optimization
- **LAMBDA_LOW:** Light complexity penalty during exploration
- **EPS:** Tie-breaking threshold (choose simpler when scores are close)

## Common Tuning Scenarios

### Fast Convergence (Favor Speed)

```typescript
{
    MUTATION_RATE: 1.5,              // More mutations
    SURVIVORS: 0.3,                   // Strong selection (top 30%)
    WEIGHT_SHIFT_STRENGTH: 0.3,       // Larger weight changes
    PROBABILITY_MUTATE_WEIGHT_SHIFT: 5, // More weight tuning
    PROBABILITY_MUTATE_LINK: 0.5,     // Slower structural growth
    LAMBDA_HIGH: 0.4,                 // Strong simplicity bias
    CP: 3                             // Fewer, larger species
}
```

### Deep Exploration (Favor Diversity)

```typescript
{
    MUTATION_RATE: 0.8,               // Less aggressive
    SURVIVORS: 0.5,                   // Weak selection (top 50%)
    PROBABILITY_MUTATE_LINK: 1.2,     // Faster growth
    PROBABILITY_MUTATE_NODES: 0.05,   // More depth
    LAMBDA_LOW: 0.05,                 // Minimal complexity penalty
    CP: 2,                            // Many species
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
    PROBABILITY_MUTATE_LINK: 0.1,     // Minimal growth
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
    PROBABILITY_MUTATE_LINK: 0.6,     // Slower growth
    PROBABILITY_MUTATE_NODES: 0.02,   // Fewer nodes
    OPT_ERR_THRESHOLD: 0.015,         // Optimize slightly earlier
    EPS: 1e-3                         // Stronger tie-breaking for simplicity
}
```

### Stuck Population (Escape Local Optima)

```typescript
{
    MUTATION_RATE: 2,                 // High mutation (also auto-increases when stuck)
    WEIGHT_RANDOM_STRENGTH: 1.5,      // Wider exploration
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.1, // More randomization
    SURVIVORS: 0.35,                  // Stronger selection
    CP: 4                             // More species diversity
}
```

## Parameter Interaction Diagrams

### Evolution Flow

```
Population → Evaluate → Speciate (CP) → Kill (SURVIVORS) → Reproduce → Mutate (MUTATION_RATE * PROBABILITY_*) → Next Gen
                ↓                                                                         ↓
          Score & Penalize                                                        Structure + Weights
        (LAMBDA_LOW/HIGH)                                                         (CT controls when)
```

### Speciation Process

```
Genome A ←→ distance(A,B) = (C1*excess)/N + (C2*disjoint)/N + C3*weightDiff
Genome B

If N < CT: N = 1 (no normalization)
If distance < CP: Same species
Else: Different species
```

### Optimization Trigger

```
Every 10 generations OR error < OPT_ERR_THRESHOLD:
    ↓
LAMBDA_HIGH applied (strong complexity penalty)
    ↓
Remove disabled connections
    ↓
Freeze topology (no new links/nodes unless very small)
    ↓
Continue weight mutations only
```

### Selection Process

```
Raw Scores → Apply Complexity Penalty (LAMBDA) → Normalize → Sort → Find Ties (EPS) → Choose Simplest
                                                                          ↓
                                               Keep Top SURVIVORS % → Reproduce → Mutate
```

## Validation and Warnings

The implementation includes automatic validation that triggers console warnings:

| Condition                           | Warning                                |
| ----------------------------------- | -------------------------------------- |
| `C1, C2, C3 < 0`                    | **ERROR:** Must be non-negative        |
| `SURVIVORS not in [0,1]`            | **ERROR:** Must be between 0 and 1     |
| `CT > 1000`                         | Unusually high normalization threshold |
| `CP > 10`                           | Unusually high species threshold       |
| `MUTATION_RATE > 10`                | Unusually high mutation rate           |
| `WEIGHT_SHIFT_STRENGTH > 1`         | May cause oscillations                 |
| `SURVIVORS > 0.6`                   | Weak selection pressure                |
| `PROBABILITY_MUTATE_LINK > 2`       | Risk of rapid network bloat            |
| `LAMBDA_HIGH > 0.8`                 | May prevent necessary growth           |
| `LAMBDA_LOW > 0.5`                  | May restrict exploration               |
| `EPS outside [1e-6, 1e-2]`          | Outside typical range                  |
| Weight/Bias strength imbalance >80% | Consider balancing mutation strengths  |

## Files Organization

```
docs/params/
├── 00_INDEX.md (this file)
├── 01_distance_coefficients.md    # C1, C2, C3
├── 02_compatibility_thresholds.md # CT, CP
├── 03_mutation_strength.md        # MUTATION_RATE, SURVIVORS, *_STRENGTH
├── 04_mutation_probabilities.md   # PROBABILITY_* parameters
└── 05_optimization_and_scoring.md # OPT_ERR_THRESHOLD, LAMBDA_*, EPS, PERMANENT_MAIN_CONNECTIONS
```

## See Also

- **Main README:** Project overview and quick start
- **API Documentation:** Full API reference for the Neat class
- **Tests:** `tests/neat/` and `tests/genome/` for parameter behavior examples
- **Demo:** `demo/main.ts` for example parameter configurations
