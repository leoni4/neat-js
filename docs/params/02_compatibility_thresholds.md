# Compatibility Thresholds (CT, CP)

## CT - Minimum Distance Divisor and Minimum Connection Count

**Default:** `1`  
**Type:** `number` (positive)  
**Location:** `INeatParams.CT`, `DEFAULT_PARAMS.CT` (`src/neat/neat.ts`)

### Purpose

CT has three roles:

1. It is the minimum value of the divisor `N` in the distance formula. This prevents genomes with few connections from appearing artificially distant.
2. A genome with fewer than `CT` connections always gets link mutations, also in optimization mode.
3. It limits the number of random-weight and shift-weight mutations.

### How It's Used

**In distance calculation normalization** (`Genome.distance()`):

```typescript
let N = Math.max(g1.connections.size(), g2.connections.size());
N = N < this._neat.CT ? this._neat.CT : N;
```

`N = max(connections of genome 1, connections of genome 2, CT)`. The excess and disjoint terms are always divided by `N`; when both genomes have fewer than `CT` connections, they are divided by `CT`.

**In structural mutations** (`Genome.mutate()`):

```typescript
if (protectingMain || (!selfOpt && !this._neat.optimization) || this._connections.size() < this._neat.CT) {
    prob = this._neat.PROBABILITY_MUTATE_LINK * this._neat.MUTATION_RATE * this._topologyPressure;
    prob = Math.max(prob, this._neat.CT - this._connections.size());
    prob = protectingMain ? mainCons : prob;
    while (prob > Math.random()) {
        prob--;
        this.mutateLink();
    }
    // ... node mutations
}
```

When a genome has fewer than `CT` connections, the structural block runs also in optimization mode, and the link probability is at least `CT − connections`. So the genome tries to add the missing connections in the same generation.

**In weight mutation limits** (`Genome.mutate()`):

```typescript
const minWeight = Math.min(this._connections.size(), this._nodes.size() - this._neat.CT);
```

The random-weight and shift-weight probabilities are limited to `minWeight`. If `CT` is larger than the node count of a genome, `minWeight` is negative, and that genome gets **no** weight mutations.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Field:** `Neat.CT` (a public field)
- **Usage in distance:** `Genome.distance()`
- **Usage in mutation:** `Genome.mutate()`
- **Validation:** `Neat.validateConfiguration()` (warns if > 1000)
- **Tests:** `tests/genome/genome.distance.test.ts`

### Tuning Recommendations

- **Higher values:** Smaller distances for small genomes, more connections forced at the start, and fewer weight mutations (none when `CT` > node count)
- **Default (1):** Distance divided by the real connection count; only an empty genome is forced to add a connection
- **Warning:** Values > 1000 are considered unusually high and will trigger a console warning

---

## CP - Compatibility Threshold for Speciation

**Default:** `1` (start value; `evolve()` changes it)  
**Type:** `number` (positive)  
**Location:** `INeatParams.CP`, `DEFAULT_PARAMS.CP` (`src/neat/neat.ts`)

### Purpose

CP defines the maximum genetic distance for two genomes to be considered part of the same species. This is the primary parameter controlling speciation and biodiversity in the population.

### How It's Used

**In species assignment** (`Species.put()`):

```typescript
put(client: Client, force = false): boolean {
    if (force || client.distance(this._representative) < this._representative.genome.neat.CP) {
        client.species = this;
        this._clients.push(client);

        return true;
    }

    return false;
}
```

**In speciation process** (`Neat.genSpecies()`):

1. Each existing species takes a random member as its new representative and removes all other members (`Species.reset()`).
2. Each client without a species goes into the first species with `distance < CP`, or it starts a new species.

**Adaptation** (end of `Neat.reproduce()`):

```typescript
if (this._species.length < 8) this._CP *= 0.95;
else if (this._species.length > 25) this._CP *= 1.05;
```

The `CP` parameter is only the start value. After each `evolve()` call, CP falls by 5% when there are fewer than 8 species, and grows by 5% when there are more than 25 species. There is no lower or upper limit. `CONFIG_CONSTANTS.DEFAULT_CP_RATIO` and `CONFIG_CONSTANTS.MIN_CP` (`src/neat/constants.ts`) are not used by this logic.

Species with only one client are removed before reproduction (unless they hold the best client or are the last species, `Neat.removeExtinct()`), and the orphan clients are bred into the remaining species. So the species count after reproduction can stay below 8, and CP can fall close to `0` in long runs. Read the current value with `neat.CP`.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.CP`
- **Usage:** `Species.put()` (speciation decision), `Neat.genSpecies()`
- **Adaptation:** `Neat.reproduce()`
- **Validation:** `Neat.validateConfiguration()` (warns if > 10)

### Relationship with Distance Coefficients

The distance compared against CP is calculated using C1, C2, and C3:

```
distance = (C1 * excess) / N + (C2 * disjoint) / N + C3 * weightDiff

if (distance < CP) {
    // Same species
} else {
    // Different species
}
```

### Tuning Recommendations

- **Higher start values:** Fewer, larger species at the start; less diversity; faster convergence within species
- **Lower start values:** Many small species at the start; high diversity; slower convergence
- **Default (1):** Start value; the adaptation then moves CP toward 8-25 species
- **Warning:** Values > 10 are considered unusually high and will trigger a console warning

### Interaction with Other Parameters

CP works together with C1, C2, C3:

- If C1, C2, C3 are high → distances are large → need higher CP to maintain reasonable species count
- If C1, C2, C3 are low → distances are small → need lower CP to maintain speciation

**Example scenarios (start values):**

- **High diversity:** C1=1, C2=1, C3=0.2, CP=0.5 → Many species at the start
- **Low diversity:** C1=0.5, C2=0.5, C3=0.05, CP=5 → Few species at the start
- **Default:** C1=1, C2=1, C3=0.2, CP=1
