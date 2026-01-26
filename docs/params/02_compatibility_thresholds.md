# Compatibility Thresholds (CT, CP)

## CT - Compatibility Threshold for Normalization

**Default:** `20`  
**Type:** `number` (positive)  
**Location:** `src/neat/neat.ts:124`

### Purpose

CT is used to determine whether to normalize genetic distance calculations by the number of genes. When the number of connections is below CT, normalization is disabled (N=1), which prevents small genomes from appearing artificially distant.

### How It's Used

**In distance calculation normalization** (`src/genome/genome.ts:171-172`):

```typescript
let N = Math.max(g1.connections.size(), g2.connections.size());
N = N < this.#neat.CT ? 1 : N; // If connections < CT, use N=1 (no normalization)
```

This affects the final distance formula:

- **When connections >= CT:** Distance is normalized by N (number of connections)
- **When connections < CT:** Distance is NOT normalized (N=1), preventing division by small numbers

**In mutation probability calculations** (`src/genome/genome.ts:537-540`):

```typescript
if (
  (!selfOpt && !this.#neat.optimization) ||
  this.#connections.size() < this.#neat.CT
) {
  prob = this.#neat.PROBABILITY_MUTATE_LINK * this.#neat.MUTATION_RATE;
  prob = this.#connections.size() < this.#neat.CT ? this.#neat.CT : prob;
  // ... mutation logic
}
```

When genome has fewer connections than CT, it's encouraged to add more connections/nodes:

```typescript
if (optimize) {
  prob = prob > 1 ? 1 : prob;
}
while (prob > Math.random()) {
  prob--;
  this.mutateLink();
}
```

**In weight mutation limits** (`src/genome/genome.ts:560`):

```typescript
const minWeight = Math.min(
  this.#connections.size(),
  this.#nodes.size() - this.#neat.CT
);
```

This limits the number of weight mutations based on network size and CT.

### Code References

- **Definition:** `src/neat/neat.ts:54` (interface), `src/neat/neat.ts:124` (initialization)
- **Setter/Getter:** `src/neat/neat.ts:373-380`
- **Usage in distance:** `src/genome/genome.ts:171-172`
- **Usage in mutation:** `src/genome/genome.ts:537-560`
- **Validation:** `src/neat/neat.ts:210-212` (warns if > 1000)
- **Tests:** `tests/genome/genome.distance.test.ts:58-105`

### Tuning Recommendations

- **Higher values (>30):** More aggressive normalization, small networks treated more leniently, slower initial growth
- **Lower values (<10):** Earlier normalization, stricter distance calculation for small networks, faster structural evolution
- **Default (20):** Balanced approach allowing initial exploration before strict normalization kicks in
- **Warning:** Values > 1000 are considered unusually high and will trigger a console warning

---

## CP - Compatibility Threshold for Speciation

**Default:** `Math.max(clients / 20, 1)` (5 for 100 clients, minimum 1)  
**Type:** `number` (positive)  
**Location:** `src/neat/neat.ts:125`

### Purpose

CP defines the maximum genetic distance for two genomes to be considered part of the same species. This is the primary parameter controlling speciation and biodiversity in the population.

### How It's Used

**In species assignment** (`src/neat/species.ts:23-28`):

```typescript
put(client: Client, force = false): boolean {
    if (force || client.distance(this.#representative) < this.#representative.genome.neat.CP) {
        client.species = this;
        this.#clients.push(client);
        return true;
    }
    return false;
}
```

**In speciation process** (`src/neat/neat.ts:672-687`):

```typescript
#genSpecies() {
    // Reset all species
    for (let i = 0; i < this.#species.length; i += 1) {
        this.#species[i].reset();
    }

    // Try to place each client in existing species
    for (let i = 0; i < this.#clients.length; i += 1) {
        const c = this.#clients[i];
        if (c.species !== null) continue;

        let found = false;
        for (let k = 0; k < this.#species.length; k += 1) {
            const s = this.#species[k];
            if (s.put(c)) {  // Uses CP internally via distance comparison
                found = true;
                break;
            }
        }

        // Create new species if no match found
        if (!found) {
            this.#species.push(new Species(c));
        }
    }
}
```

### Code References

- **Definition:** `src/neat/neat.ts:55` (interface), `src/neat/neat.ts:125` (initialization)
- **Constants:** `src/neat/constants.ts:51-54` (DEFAULT_CP_RATIO: 0.1, MIN_CP: 1)
- **Getter:** `src/neat/neat.ts:377-379`
- **Usage:** `src/neat/species.ts:23` (speciation decision)
- **Validation:** `src/neat/neat.ts:214-216` (warns if > 10)

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

- **Higher values (>5):** Fewer, larger species; less diversity; faster convergence within species
- **Lower values (<2):** Many small species; high diversity; slower convergence; risk of stagnation
- **Default (clients/20):** Scales with population size
  - 100 clients → CP = 5
  - 50 clients → CP = 2.5
  - 20 clients → CP = 1
- **Minimum:** Always at least 1 to prevent over-speciation
- **Warning:** Values > 10 are considered unusually high and will trigger a console warning

### Interaction with Other Parameters

CP works together with C1, C2, C3:

- If C1, C2, C3 are high → distances are large → need higher CP to maintain reasonable species count
- If C1, C2, C3 are low → distances are small → need lower CP to maintain speciation

**Example scenarios:**

- **High diversity:** C1=1, C2=1, C3=0.1, CP=2 → Many species, slow evolution
- **Low diversity:** C1=0.5, C2=0.5, C3=0.05, CP=10 → Few species, fast evolution
- **Balanced (default):** C1=1, C2=1, C3=0.1, CP=5 → Moderate speciation
