# Distance Coefficients (C1, C2, C3)

## C1 - Excess Gene Coefficient

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `src/neat/neat.ts:119`

### Purpose

C1 determines how much excess genes contribute to genetic distance between two genomes. Excess genes are genes that exist in the more evolved genome beyond the highest innovation number of the less evolved genome.

### How It's Used

**In genome distance calculation** (`src/genome/genome.ts:175`):

```typescript
return (
  (this.#neat.C1 * excess) / N +
  (this.#neat.C2 * disjoint) / N +
  this.#neat.C3 * weightDiff
);
```

The formula calculates genetic distance as:

```
distance = (C1 * excess) / N + (C2 * disjoint) / N + C3 * weightDiff
```

Where:

- `excess` = number of genes beyond the highest common innovation number
- `N` = max number of connections between the two genomes (or 1 if below CT threshold)
- This normalized distance is used for speciation

### Code References

- **Definition:** `src/neat/neat.ts:51` (interface), `src/neat/neat.ts:119` (initialization)
- **Validation:** `src/neat/neat.ts:187-189` - Must be non-negative
- **Usage:** `src/genome/genome.ts:175` (distance calculation)
- **Getter:** `src/neat/neat.ts:383-385`
- **Tests:** `tests/genome/genome.distance.test.ts:108-126`

### Tuning Recommendations

- **Higher values (>1):** Make excess genes more significant in speciation, creating more species
- **Lower values (<1):** Make excess genes less important, allowing more genetic diversity within species
- **Default (1):** Balanced approach treating excess, disjoint equally in normalized distance

---

## C2 - Disjoint Gene Coefficient

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `src/neat/neat.ts:120`

### Purpose

C2 determines how much disjoint genes contribute to genetic distance. Disjoint genes are genes that exist in one genome but not the other, within the range of common innovation numbers.

### How It's Used

**In genome distance calculation** (`src/genome/genome.ts:175`):

```typescript
return (
  (this.#neat.C1 * excess) / N +
  (this.#neat.C2 * disjoint) / N +
  this.#neat.C3 * weightDiff
);
```

During comparison (`src/genome/genome.ts:118-136`):

```typescript
while (indexG1 < g1.connections.size() && indexG2 < g2.connections.size()) {
  const gene1 = g1.connections.get(indexG1);
  const gene2 = g2.connections.get(indexG2);
  const inn1 = gene1.innovationNumber;
  const inn2 = gene2.innovationNumber;

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
}
```

### Code References

- **Definition:** `src/neat/neat.ts:52` (interface), `src/neat/neat.ts:120` (initialization)
- **Validation:** `src/neat/neat.ts:187-189` - Must be non-negative
- **Usage:** `src/genome/genome.ts:118-175` (distance calculation)
- **Getter:** `src/neat/neat.ts:387-389`
- **Tests:** `tests/genome/genome.distance.test.ts:128-146`

### Tuning Recommendations

- **Higher values (>1):** Emphasize structural differences, promote speciation based on topology
- **Lower values (<1):** De-emphasize structural differences, allow more structural variation within species
- **Default (1):** Balanced with C1 for equal weighting of structural differences

---

## C3 - Weight Difference Coefficient

**Default:** `0.1`  
**Type:** `number` (non-negative)  
**Location:** `src/neat/neat.ts:121`

### Purpose

C3 determines how much weight differences in matching genes contribute to genetic distance. This affects how similar connection weights need to be for genomes to be considered part of the same species.

### How It's Used

**In genome distance calculation** (`src/genome/genome.ts:175`):

```typescript
weightDiff /= similar || 1; // Average weight difference
return (
  (this.#neat.C1 * excess) / N +
  (this.#neat.C2 * disjoint) / N +
  this.#neat.C3 * weightDiff
);
```

Weight differences are accumulated for matching genes (`src/genome/genome.ts:133-135`):

```typescript
similar++;
weightDiff += Math.abs(gene1.weight - gene2.weight);
```

And also for matching node biases (`src/genome/genome.ts:157-159`):

```typescript
similar++;
weightDiff += Math.abs(node1.bias - node2.bias);
```

### Code References

- **Definition:** `src/neat/neat.ts:53` (interface), `src/neat/neat.ts:121` (initialization)
- **Validation:** `src/neat/neat.ts:187-189` - Must be non-negative
- **Usage:** `src/genome/genome.ts:133-175` (distance calculation including both connection weights and node biases)
- **Getter:** `src/neat/neat.ts:391-393`
- **Tests:** `tests/genome/genome.distance.test.ts:148-169`

### Tuning Recommendations

- **Higher values (>0.5):** Make weight differences very important, species based more on functional similarity
- **Lower values (<0.05):** Focus speciation on topology rather than weights
- **Default (0.1):** Structural differences (C1, C2) dominate, but weight differences still matter
- **Note:** Default is 10x smaller than C1/C2 because weight differences are continuous values (can be large) while gene counts are discrete
