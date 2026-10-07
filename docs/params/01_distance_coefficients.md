# Distance Coefficients (C1, C2, C3)

All three coefficients are used in `Genome.distance()` (`src/genome/genome.ts`). The species code compares the result with `CP` (`Species.put()`).

## The distance formula

```typescript
let N = Math.max(g1.connections.size(), g2.connections.size());
N = N < this._neat.CT ? this._neat.CT : N;

return (this._neat.C1 * excess) / N + (this._neat.C2 * disjoint) / N + this._neat.C3 * weightDiff;
```

```
distance = (C1 * excess) / N + (C2 * disjoint) / N + C3 * weightDiff
N = max(connections of genome 1, connections of genome 2, CT)
```

How the terms are counted:

- `g1` is the genome with the higher last connection innovation number; `g2` is the other genome.
- The connection genes of both genomes are compared by innovation number. A gene that is in one genome only, inside the common range, is **disjoint**. The connection genes of `g1` after the end of `g2` are **excess**.
- The node genes are compared in the same way. Node genes of one genome only also add to `disjoint` or `excess`. Input and output nodes are in every genome, so they always match.
- `weightDiff` is the average of `|weight1 − weight2|` over the matching connections and `|bias1 − bias2|` over the matching nodes (inputs and outputs included).
- `N` counts connections only. `CT` is the minimum value of `N` (see [CT](./02_compatibility_thresholds.md#ct---minimum-distance-divisor-and-minimum-connection-count)).

## C1 - Excess Gene Coefficient

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `INeatParams.C1`, `DEFAULT_PARAMS.C1` (`src/neat/neat.ts`)

### Purpose

C1 determines how much excess genes contribute to genetic distance between two genomes. Excess genes are genes that exist in the more evolved genome beyond the highest innovation number of the less evolved genome.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Validation:** `Neat.validateConfiguration()` - Must be non-negative (throws)
- **Usage:** `Genome.distance()`
- **Getter:** `Neat.C1`
- **Tests:** `tests/genome/genome.distance.test.ts`

### Tuning Recommendations

- **Higher values (>1):** Make excess genes more significant in speciation, creating more species
- **Lower values (<1):** Make excess genes less important, allowing more genetic diversity within species
- **Default (1):** Balanced approach treating excess, disjoint equally in normalized distance

---

## C2 - Disjoint Gene Coefficient

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `INeatParams.C2`, `DEFAULT_PARAMS.C2` (`src/neat/neat.ts`)

### Purpose

C2 determines how much disjoint genes contribute to genetic distance. Disjoint genes are genes that exist in one genome but not the other, within the range of common innovation numbers.

### How It's Used

During comparison of the connection genes (`Genome.distance()`):

```typescript
if (inn1 > inn2) {
    indexG2++;
    disjoint++; // Gene in g2 but not in g1
} else if (inn1 < inn2) {
    indexG1++;
    disjoint++; // Gene in g1 but not in g2
} else {
    // Matching genes
    indexG1++;
    indexG2++;
    similar++;
    weightDiff += Math.abs(gene1.weight - gene2.weight);
}
```

The connection genes of `g2` that remain after the loop are also counted as disjoint. The node genes use the same loop.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Validation:** `Neat.validateConfiguration()` - Must be non-negative (throws)
- **Usage:** `Genome.distance()`
- **Getter:** `Neat.C2`
- **Tests:** `tests/genome/genome.distance.test.ts`

### Tuning Recommendations

- **Higher values (>1):** Emphasize structural differences, promote speciation based on topology
- **Lower values (<1):** De-emphasize structural differences, allow more structural variation within species
- **Default (1):** Balanced with C1 for equal weighting of structural differences

---

## C3 - Weight Difference Coefficient

**Default:** `0.2`  
**Type:** `number` (non-negative)  
**Location:** `INeatParams.C3`, `DEFAULT_PARAMS.C3` (`src/neat/neat.ts`)

### Purpose

C3 determines how much weight differences in matching genes contribute to genetic distance. This affects how similar connection weights and node biases need to be for genomes to be considered part of the same species.

### How It's Used

Weight differences are accumulated for matching connection genes:

```typescript
similar++;
weightDiff += Math.abs(gene1.weight - gene2.weight);
```

And also for matching node biases:

```typescript
similar++;
weightDiff += Math.abs(node1.bias - node2.bias);
```

Then the sum is averaged (`weightDiff /= similar || 1`) and multiplied by C3.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Validation:** `Neat.validateConfiguration()` - Must be non-negative (throws)
- **Usage:** `Genome.distance()` (connection weights and node biases)
- **Getter:** `Neat.C3`
- **Tests:** `tests/genome/genome.distance.test.ts`

### Tuning Recommendations

- **Higher values (>0.5):** Make weight differences very important, species based more on functional similarity
- **Lower values (<0.05):** Focus speciation on topology rather than weights
- **Default (0.2):** Structural differences (C1, C2) dominate, but weight differences still matter
- **Note:** Default is 5x smaller than C1/C2 because weight differences are continuous values (can be large) while gene counts are discrete
