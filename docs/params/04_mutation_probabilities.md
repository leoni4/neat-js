# Mutation Probability Parameters

These parameters control HOW OFTEN each type of mutation occurs. `Genome.mutate()` runs once for each client in each `evolve()` call. The link, node, random-weight, and shift-weight probabilities are multiplied by `MUTATION_RATE` and by the pressure multiplier (`MUTATION_PRESSURE_CONST[neat.PRESSURE]`). The toggle probability is used as it is.

## How a probability becomes a mutation count

Each mutation type uses the same loop:

```typescript
while (prob > Math.random()) {
    prob--;
    this.mutateLink(); // or mutateNode(), mutateLinkToggle(), mutateWeightRandom(), mutateWeightShift()
}
```

- `prob = 0.3` → one mutation with a 30% chance
- `prob = 2.5` → two mutations, plus a third with a 50% chance
- `prob ≤ 0` → no mutation

The best client of the generation (`client.bestScore`) is not mutated, except in the first `evolve()` call of a population.

## PROBABILITY_MUTATE_WEIGHT_SHIFT - Weight Shift Frequency

**Default:** `0.8`  
**Type:** `number` (typically 0-10)  
**Location:** `INeatParams.PROBABILITY_MUTATE_WEIGHT_SHIFT`, `DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_SHIFT` (`src/neat/neat.ts`)

### Purpose

Controls how often small weight adjustments occur. This is typically the most frequent mutation as fine-tuning weights is crucial for network performance.

### How It's Used

**In mutation process** (`Genome.mutate()`):

```typescript
prob = this._neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this._neat.MUTATION_RATE * this._weightsPressure;
prob = prob > minWeight ? minWeight : prob;

while (prob > Math.random()) {
    prob--;
    this.mutateWeightShift(); // Shifts one connection weight and one node bias
}
```

**Limited by network size:**

```typescript
const minWeight = Math.min(this._connections.size(), this._nodes.size() - this._neat.CT);
```

This prevents excessive mutations on small networks. A genome without connections gets no weight mutations.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PROBABILITY_MUTATE_WEIGHT_SHIFT`
- **Usage:** `Genome.mutate()`, `Genome.mutateWeightShift()`
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>2):** Very frequent weight adjustments, faster convergence, risk of overfitting
- **Lower values (<0.5):** Rare weight adjustments, slower convergence, more exploration
- **Default (0.8):** High frequency - weight tuning is the most common mutation
- **Interpretation:** With MUTATION_RATE=1 and `NORMAL` pressure, a genome gets one weight shift with an 80% chance per generation (with `BOOST`, `ESCAPE`, or `PANIC` pressure, `prob = 1.6`: one shift plus a second with a 60% chance)
- **Works with:** WEIGHT_SHIFT_STRENGTH (magnitude) and BIAS_SHIFT_STRENGTH

---

## PROBABILITY_MUTATE_TOGGLE_LINK - Connection Enable/Disable Frequency

**Default:** `0.08`  
**Type:** `number` (typically 0-1)  
**Location:** `INeatParams.PROBABILITY_MUTATE_TOGGLE_LINK`, `DEFAULT_PARAMS.PROBABILITY_MUTATE_TOGGLE_LINK` (`src/neat/neat.ts`)

### Purpose

Controls how often connections are toggled between enabled and disabled states. This allows the network to explore different topologies without permanently adding/removing connections.

### How It's Used

**In mutation process** (`Genome.mutate()`):

```typescript
prob = this._neat.PROBABILITY_MUTATE_TOGGLE_LINK;

while (prob > Math.random()) {
    prob--;
    this.mutateLinkToggle();
}
```

**The toggle mutation** (`Genome.mutateLinkToggle()`):

```typescript
mutateLinkToggle(): ConnectionGene | null {
    const con = this._connections.randomElement();
    if (!(con instanceof ConnectionGene)) {
        return null;
    }
    con.enabled = !con.enabled;

    return con;
}
```

The toggle is the same in all modes. In optimization mode, the clean-up step at the start of the next `Genome.mutate()` call removes connections that are disabled (see [optimization](./05_optimization_and_scoring.md#opt_err_threshold---optimization-error-threshold)).

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PROBABILITY_MUTATE_TOGGLE_LINK`
- **Usage:** `Genome.mutate()`, `Genome.mutateLinkToggle()`
- **Tests:** `tests/genome/genome.test.ts`

### Tuning Recommendations

- **Higher values (>0.3):** Frequent topology changes, more exploration, less stable
- **Lower values (<0.05):** Rare topology changes, more stable, less exploration
- **Default (0.08):** Low topology exploration
- **Note:** NOT multiplied by MUTATION_RATE or by the pressure (operates independently)
- **Use cases:**
    - Higher during early evolution for exploration
    - Lower during fine-tuning for stability

---

## PROBABILITY_MUTATE_WEIGHT_RANDOM - Full Weight Randomization Frequency

**Default:** `0.05`  
**Type:** `number` (typically 0-1)  
**Location:** `INeatParams.PROBABILITY_MUTATE_WEIGHT_RANDOM`, `DEFAULT_PARAMS.PROBABILITY_MUTATE_WEIGHT_RANDOM` (`src/neat/neat.ts`)

### Purpose

Controls how often weights are completely randomized (rather than shifted). This provides large exploration jumps and helps escape local optima.

### How It's Used

**In mutation process** (`Genome.mutate()`):

```typescript
const minWeight = Math.min(this._connections.size(), this._nodes.size() - this._neat.CT);
prob = this._neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this._neat.MUTATION_RATE * this._weightsPressure;
prob = prob > minWeight ? minWeight : prob;

while (prob > Math.random()) {
    prob--;
    this.mutateWeightRandom(); // Randomizes one connection weight and one node bias
}
```

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PROBABILITY_MUTATE_WEIGHT_RANDOM`
- **Usage:** `Genome.mutate()`, `Genome.mutateWeightRandom()`
- **Validation:** `Neat.validateConfiguration()` (warns if not 0-1; with a value > 0, `WEIGHT_RANDOM_STRENGTH` and `BIAS_RANDOM_STRENGTH` must not be 0)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>0.2):** Frequent large exploration jumps, less stable, good for escaping local optima
- **Lower values (<0.02):** Rare randomization, more stable evolution, gradual improvement
- **Default (0.05):** Low frequency - randomization is disruptive but occasionally helpful
- **Interpretation:** With MUTATION_RATE=1 and `NORMAL` pressure, ~5% chance per genome per generation
- **Works with:** WEIGHT_RANDOM_STRENGTH and BIAS_RANDOM_STRENGTH (magnitude of randomization)

---

## PROBABILITY_MUTATE_LINK - New Connection Addition Frequency

**Default:** `0.08`  
**Type:** `number` (typically 0.02-1)  
**Location:** `INeatParams.PROBABILITY_MUTATE_LINK`, `DEFAULT_PARAMS.PROBABILITY_MUTATE_LINK` (`src/neat/neat.ts`)

### Purpose

Controls how often new connections are added to the network. This is a primary driver of network complexity growth.

### How It's Used

**In mutation process** (`Genome.mutate()`):

```typescript
const mainCons = this._neat.inputNodes * this._neat.outputNodes;
const protectingMain = this._neat.PERMANENT_MAIN_CONNECTIONS && this._connections.size() < mainCons;

if (protectingMain || (!selfOpt && !this._neat.optimization) || this._connections.size() < this._neat.CT) {
    prob = this._neat.PROBABILITY_MUTATE_LINK * this._neat.MUTATION_RATE * this._topologyPressure;
    prob = Math.max(prob, this._neat.CT - this._connections.size());
    prob = protectingMain ? mainCons : prob;
    while (prob > Math.random()) {
        prob--;
        this.mutateLink();
    }
    // ... mutateNode() loop
}
```

**Key behaviors:**

- Only active when the genome is NOT in optimization mode (global or self-optimization), OR when it has fewer than CT connections, OR when `PERMANENT_MAIN_CONNECTIONS` is on and the genome has fewer than `inputs × outputs` connections
- If the genome has fewer than CT connections, the probability is at least `CT − connections`
- With `PERMANENT_MAIN_CONNECTIONS` and fewer than `inputs × outputs` connections, the probability is `inputs × outputs`

**The mutation itself** (`Genome.mutateLink()`):

- Picks two random nodes with different `x`, and orders them so that the connection goes from the smaller `x` to the larger `x` (feed-forward)
- If the connection already exists, it tries again (up to `inputs × outputs × 5` tries)
- The innovation number comes from the population registry (`Neat.getConnection()`), so the same connection has the same innovation number in all genomes
- The weight is `random(-1, 1) × WEIGHT_RANDOM_STRENGTH`

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PROBABILITY_MUTATE_LINK`
- **Usage:** `Genome.mutate()`, `Genome.mutateLink()`
- **Validation:** `Neat.validateConfiguration()` (warns if > 2)
- **Tests:** `tests/genome/genome.mutate-link.test.ts`

### Tuning Recommendations

- **Higher values (>0.3):** Rapid network growth, complex topologies, risk of bloat
- **Lower values (<0.03):** Slow growth, simple networks, risk of insufficient complexity
- **Default (0.08):** Slow, steady growth rate
- **Warning:** Values > 2 trigger a warning about rapid network bloat
- **Historical note:** Was initially set to inputNodes \* outputNodes, causing explosive growth
- **Interaction:**
    - Disabled in optimization mode to prevent bloat
    - Boosted when connections < CT to encourage minimum complexity
    - Self-optimization depends on `client.error` (see [OPT_ERR_THRESHOLD](./05_optimization_and_scoring.md#opt_err_threshold---optimization-error-threshold)). If you never set `client.error`, it is `0`, and the networks stop growing after the first `evolve()` call (unless `ERROR_DRIVES_OPTIMIZATION` is `false`)

---

## PROBABILITY_MUTATE_NODES - New Node Addition Frequency

**Default:** `0.03`  
**Type:** `number` (typically 0.01-0.1)  
**Location:** `INeatParams.PROBABILITY_MUTATE_NODES`, `DEFAULT_PARAMS.PROBABILITY_MUTATE_NODES` (`src/neat/neat.ts`)

### Purpose

Controls how often new nodes (neurons) are added to the network. This increases network depth and complexity more dramatically than adding connections.

### How It's Used

**In mutation process** (`Genome.mutate()`, inside the same block as the link mutations):

```typescript
prob = this._neat.PROBABILITY_MUTATE_NODES * this._neat.MUTATION_RATE * this._topologyPressure;

while (prob > Math.random()) {
    prob--;
    this.mutateNode();
}
```

**The mutation itself** (`Genome.mutateNode()`):

- Picks a random **enabled** connection (up to 20 tries)
- The new node gets `x = (from.x + to.x) / 2` and `y` = the middle `y` ± 0.3, limited to [0.1, 0.9]. If `x ≤ 0.1`, there is no new node
- If the same connection was split before in the population, the same node id is used again (`Neat.getReplaceIndex()` / `Neat.setReplaceIndex()`)
- Adds the connections `from → middle` (weight `1`) and `middle → to` (weight of the old connection)
- When at least one of the two connections is new, disables the old connection and **removes** it from the genome (`removeConnection(con, true)`). With `PERMANENT_MAIN_CONNECTIONS`, an input→output connection is not removed; it stays disabled

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PROBABILITY_MUTATE_NODES`
- **Usage:** `Genome.mutate()`, `Genome.mutateNode()`
- **Tests:** `tests/genome/genome.mutate-node.test.ts`

### Tuning Recommendations

- **Higher values (>0.1):** Frequent node additions, deep networks, high complexity
- **Lower values (<0.01):** Rare node additions, shallow networks, simpler topologies
- **Default (0.03):** Low frequency - node addition is expensive and disruptive
- **Interpretation:** With MUTATION_RATE=1 and `NORMAL` pressure, ~3% chance per genome per generation
- **Balance:** Should be lower than PROBABILITY_MUTATE_LINK
- **Note:** Only active when not in optimization mode OR when connections < CT (same block as the link mutations)

### Relationship Between Structural Mutations

```
PROBABILITY_MUTATE_LINK (0.08)        : Add connections
PROBABILITY_MUTATE_NODES (0.03)       : Add nodes - rare
PROBABILITY_MUTATE_TOGGLE_LINK (0.08) : Enable/disable

Ratio: about 2.7:1:2.7 (link:node:toggle)
```

This ratio ensures:

- Networks grow primarily by adding connections (fast, flexible)
- Nodes added occasionally for depth (slow, impactful)
- Topology can be adjusted by toggling (exploration without growth)
