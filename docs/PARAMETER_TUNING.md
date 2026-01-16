# NEAT Parameter Tuning Guide

This document explains the default parameters used in the NEAT implementation and provides guidance on when and how to adjust them.

## Critical Parameter Fixes (v0.1.1)

Several default parameters were adjusted to fix convergence issues that prevented the algorithm from solving even simple problems like XOR in reasonable time.

### 🔴 Critical Changes

#### 1. WEIGHT_SHIFT_STRENGTH: 5 → 0.2 (25x reduction)

**Problem:** The original value of 5 caused extreme weight oscillations, preventing network convergence.

**Impact:** Each weight mutation could shift by up to ±5, which is massive compared to typical neural network weight ranges. This caused:

- Networks to constantly overshoot optimal weight values
- Random walk behavior instead of gradual refinement
- Near-impossible convergence for simple problems

**New Value:** 0.2 (recommended range: 0.1 - 0.3)

**Reasoning:** Smaller shifts allow gradual refinement while still exploring the weight space effectively.

---

#### 2. BIAS_SHIFT_STRENGTH: 0.01 → 0.15 (15x increase)

**Problem:** The original value was 500x smaller than WEIGHT_SHIFT_STRENGTH, creating severe imbalance.

**Impact:** While weights were thrashing wildly, biases barely changed, preventing proper network optimization.

**New Value:** 0.15 (recommended range: 0.1 - 0.2)

**Reasoning:** Biases should be mutated with similar strength as weights for balanced learning.

---

#### 3. PROBABILITY_MUTATE_LINK: inputNodes × outputNodes → 0.8

**Problem:** For XOR (2 inputs, 1 output), this was 2, causing rapid network bloat.

**Impact:**

- Average of 2 new connections added per mutation
- Networks growing too complex before learning anything useful
- Slower evolution and harder optimization

**New Value:** 0.8 (recommended range: 0.5 - 1.5)

**Reasoning:** Controlled structural growth allows networks to start simple and complexify only when needed.

---

#### 4. SURVIVORS: 0.8 → 0.4 (stronger selection)

**Problem:** Keeping 80% of each species provided too little selection pressure.

**Impact:** Weak solutions survived too long, slowing evolution.

**New Value:** 0.4 (recommended range: 0.3 - 0.5)

**Reasoning:** Stronger selection pressure (keeping only top 40%) drives faster evolution.

---

#### 5. CP (Species Compatibility): clients / 10 → clients / 20

**Problem:** High threshold led to fewer species and reduced diversity.

**Impact:** Less exploration of different network topologies.

**New Value:** clients / 20, minimum 1 (e.g., 5 for 100 clients)

**Reasoning:** Lower threshold allows more species, increasing diversity in the population.

---

#### 6. CT (Compatibility Threshold): inputNodes × outputNodes → 20

**Problem:** Scaling with network size isn't always appropriate.

**Impact:** For small networks like XOR (CT=2), the distance metric behaved incorrectly.

**New Value:** 20 (fixed value)

**Reasoning:** A fixed, reasonable threshold works better across different problem sizes.

---

#### 7. LAMBDA_HIGH: 0.6 → 0.3 (2x reduction)

**Problem:** Excessive complexity penalty of 60% prevented networks from growing when needed.

**Impact:** Networks couldn't add necessary nodes/connections even when the problem required it.

**New Value:** 0.3 (recommended range: 0.2 - 0.4)

**Reasoning:** Moderate penalty encourages simplicity without forcing it.

---

#### 8. LAMBDA_LOW: 0.3 → 0.1 (3x reduction)

**Problem:** Even during exploration phase, complexity penalty was too restrictive.

**Impact:** Networks struggled to find good topologies before being penalized.

**New Value:** 0.1 (recommended range: 0.05 - 0.2)

**Reasoning:** Gentle penalty during exploration allows network discovery while still discouraging bloat.

---

#### 9. EPS: 1e-9 → 1e-4 (100,000x increase!)

**Problem:** Value was 5 orders of magnitude too small to detect ties in normalized scores.

**Impact:**

- Tie-breaking logic essentially never ran
- Lost the benefit of preferring simpler networks among equal performers
- No safety mechanism against bloat

**New Value:** 1e-4 (recommended range: 1e-6 to 1e-3)

**Reasoning:** This is the **actual** defense against bloat - when networks perform equally, choose the simpler one!

---

## Complete Default Parameters

```typescript
{
    // Distance coefficients for speciation
    C1: 1,                                    // Excess genes coefficient
    C2: 1,                                    // Disjoint genes coefficient
    C3: 0.1,                                  // Weight difference coefficient

    // Compatibility thresholds
    CT: 20,                                   // Normalizing factor for distance
    CP: Math.max(clients / 20, 1),            // Species compatibility threshold

    // Selection
    SURVIVORS: 0.4,                           // Keep top 40% (strong selection)
    MUTATION_RATE: 1,                         // Base mutation rate

    // Weight/Bias mutation strengths
    WEIGHT_SHIFT_STRENGTH: 0.2,               // ±0.2 max shift per mutation
    BIAS_SHIFT_STRENGTH: 0.15,                // ±0.15 max shift per mutation
    WEIGHT_RANDOM_STRENGTH: 1,                // Randomization strength

    // Mutation probabilities (per genome per generation)
    PROBABILITY_MUTATE_WEIGHT_SHIFT: 3,       // ~3 weight shifts per mutation
    PROBABILITY_MUTATE_WEIGHT_RANDOM: 0.05,   // 5% chance of full randomization
    PROBABILITY_MUTATE_TOGGLE_LINK: 0.3,      // 30% chance to toggle connection
    PROBABILITY_MUTATE_LINK: 0.8,             // ~0.8 new connections per mutation
    PROBABILITY_MUTATE_NODES: 0.03,           // 3% chance to add node

    // Optimization
    OPT_ERR_THRESHOLD: 0.01,                  // Error threshold for optimization mode
    PERMANENT_MAIN_CONNECTIONS: false,        // Allow removal of input-output connections

    // Complexity penalty (controls network growth)
    LAMBDA_HIGH: 0.3,                         // Penalty during optimization (was 0.6)
    LAMBDA_LOW: 0.1,                          // Penalty during exploration (was 0.3)
    EPS: 1e-4,                                // Tie-breaking threshold (was 1e-9)
}
```

## Parameter Tuning Guidelines

### For Simple Problems (XOR, basic classification)

- **WEIGHT_SHIFT_STRENGTH:** 0.15 - 0.25
- **SURVIVORS:** 0.3 - 0.4 (strong selection)
- **PROBABILITY_MUTATE_LINK:** 0.5 - 1.0

### For Medium Complexity Problems

- **WEIGHT_SHIFT_STRENGTH:** 0.2 - 0.3
- **SURVIVORS:** 0.4 - 0.5
- **PROBABILITY_MUTATE_LINK:** 0.8 - 1.5
- **PROBABILITY_MUTATE_NODES:** 0.05 - 0.1

### For Complex Problems (control, game playing)

- **WEIGHT_SHIFT_STRENGTH:** 0.1 - 0.2 (finer tuning)
- **SURVIVORS:** 0.4 - 0.5
- **PROBABILITY_MUTATE_LINK:** 1.0 - 2.0
- **PROBABILITY_MUTATE_NODES:** 0.05 - 0.15 (allow more complexity)
- **CP:** Lower value (e.g., clients / 30) for more species
- **LAMBDA_HIGH:** 0.15 - 0.25 (lower penalty for complex problems)
- **LAMBDA_LOW:** 0.05 - 0.1 (very gentle during exploration)

### Controlling Network Complexity

The complexity penalty parameters control how aggressively NEAT penalizes larger networks:

- **LAMBDA_HIGH/LOW = 0:** No penalty (networks can bloat)
- **LAMBDA_HIGH/LOW too high:** Networks can't grow (underfitting)
- **LAMBDA_HIGH/LOW balanced:** Networks grow only when beneficial

**Rule of thumb:** Start with defaults, reduce if networks aren't reaching necessary complexity.

## Validation Warnings

The implementation now warns about problematic parameter combinations:

### WEIGHT_SHIFT_STRENGTH > 1

```
Values > 1 can cause oscillations and prevent convergence.
Recommended: 0.1-0.3
```

### SURVIVORS > 0.6

```
Weak selection pressure may slow evolution.
Recommended: 0.3-0.5
```

### PROBABILITY_MUTATE_LINK > 2

```
This can cause rapid network bloat.
Recommended: 0.5-1.5 for most problems
```

### Imbalanced WEIGHT_SHIFT_STRENGTH vs BIAS_SHIFT_STRENGTH

```
Highly imbalanced mutation strengths detected.
Consider using similar values for both.
```

### LAMBDA_HIGH > 0.8

```
Excessive complexity penalty may prevent networks from growing.
Recommended: 0.2-0.4
```

### LAMBDA_LOW > 0.5

```
This may restrict exploration.
Recommended: 0.05-0.2
```

### EPS outside 1e-6 to 1e-2

```
EPS is outside typical range.
Recommended: 1e-6 to 1e-3 for meaningful tie-breaking
```

## Expected Performance

With the corrected defaults:

- **XOR Problem:** Should solve in 100-500 generations (was: never)
- **Network Complexity:** Starts minimal, grows only as needed
- **Convergence:** Smooth reduction in error rather than oscillation

## Debugging Tips

If your network isn't converging:

1. **Check WEIGHT_SHIFT_STRENGTH** - Most common issue
    - Too high (>1): Oscillations, no convergence
    - Too low (<0.05): Very slow learning

2. **Check PROBABILITY_MUTATE_LINK** - Second most common
    - Too high: Network bloat, slow evolution
    - Too low: Network can't find good topology

3. **Check SURVIVORS**
    - Too high (>0.7): Weak selection, slow evolution
    - Too low (<0.2): May lose diversity

4. **Monitor species count**
    - Too many species: Increase CP
    - Too few species: Decrease CP

5. **Check complexity penalty (LAMBDA values)**
    - Networks too simple: Reduce LAMBDA_HIGH/LOW
    - Unbounded growth: Increase LAMBDA_HIGH/LOW
    - Networks aren't being compared properly: Increase EPS

6. **Verify tie-breaking works**
    - If you see many networks with identical scores but different complexities
    - Increase EPS to 1e-4 or 1e-3

## References

These defaults are based on:

- Original NEAT paper (Stanley & Miikkulainen, 2002)
- Empirical testing with XOR and other benchmark problems
- Common practices in neuroevolution research

---

**Last Updated:** January 2026  
**Version:** 0.1.1
