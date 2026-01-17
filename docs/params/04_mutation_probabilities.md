# Mutation Probability Parameters

These parameters control HOW OFTEN each type of mutation occurs. They are multiplied by MUTATION_RATE to get the effective probability.

## PROBABILITY_MUTATE_WEIGHT_SHIFT - Weight Shift Frequency

**Default:** `3`  
**Type:** `number` (typically 0-10)  
**Location:** `src/neat/neat.ts:136`

### Purpose

Controls how often small weight adjustments occur. This is typically the most frequent mutation as fine-tuning weights is crucial for network performance.

### How It's Used

**In mutation process** (`src/genome/genome.ts:569-576`):

```typescript
prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this.#neat.MUTATION_RATE;
prob = prob > minWeight ? minWeight : prob; // Limited by network size
if (optimize) {
  prob = prob > 1 ? 1 : prob; // Cap at 1 during optimization
}
while (prob > Math.random()) {
  prob--;
  this.mutateWeightShift(); // Applies both connection and bias shifts
}
```

**Limited by network size** (`src/genome/genome.ts:560`):

```typescript
const minWeight = Math.min(
  this.#connections.size(),
  this.#nodes.size() - this.#neat.CT
);
```

This prevents excessive mutations on small networks.

### Code References

- **Definition:** `src/neat/neat.ts:61` (interface), `src/neat/neat.ts:136` (initialization)
- **Getter:** `src/neat/neat.ts:355-357`
- **Usage:** `src/genome/genome.ts:569-576`
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>5):** Very frequent weight adjustments, faster convergence, risk of overfitting
- **Lower values (<1):** Rare weight adjustments, slower convergence, more exploration
- **Default (3):** High frequency - weight tuning is the most common mutation
- **Interpretation:** With default MUTATION_RATE=1, this means ~3 weight shifts per genome per generation
- **Works with:** WEIGHT_SHIFT_STRENGTH (magnitude) and BIAS_SHIFT_STRENGTH

---

## PROBABILITY_MUTATE_TOGGLE_LINK - Connection Enable/Disable Frequency

**Default:** `0.3`  
**Type:** `number` (typically 0-1)  
**Location:** `src/neat/neat.ts:137`

### Purpose

Controls how often connections are toggled between enabled and disabled states. This allows the network to explore different topologies without permanently adding/removing connections.

### How It's Used

**In mutation process** (`src/genome/genome.ts:553-559`):

```typescript
prob = this.#neat.PROBABILITY_MUTATE_TOGGLE_LINK;
if (optimize) {
  prob = prob > 1 ? 1 : prob;
}
while (prob > Math.random()) {
  prob--;
  this.mutateLinkToggle();
}
```

**The toggle mutation** (`src/genome/genome.ts:480-487`):

```typescript
mutateLinkToggle(): ConnectionGene | null {
    const con = this.#connections.randomElement();
    if (!(con instanceof ConnectionGene)) {
        return null;
    }
    if (!this.#selfOpt || con.enabled) {
        con.enabled = !con.enabled;
    }
    return con;
}
```

**Special behavior in optimization mode:**

- During self-optimization, disabled connections can be toggled on, but enabled ones cannot be toggled off
- This prevents undoing optimization decisions

### Code References

- **Definition:** `src/neat/neat.ts:62` (interface), `src/neat/neat.ts:137` (initialization)
- **Getter:** `src/neat/neat.ts:363-365`
- **Usage:** `src/genome/genome.ts:553-559`, `src/genome/genome.ts:480-487`
- **Tests:** `tests/genome/genome.test.ts`

### Tuning Recommendations

- **Higher values (>0.5):** Frequent topology changes, more exploration, less stable
- **Lower values (<0.1):** Rare topology changes, more stable, less exploration
- **Default (0.3):** Moderate topology exploration
- **Note:** NOT multiplied by MUTATION_RATE (operates independently)
- **Use cases:**
  - Higher during early evolution for exploration
  - Lower during fine-tuning for stability

---

## PROBABILITY_MUTATE_WEIGHT_RANDOM - Full Weight Randomization Frequency

**Default:** `0.05`  
**Type:** `number` (typically 0-1)  
**Location:** `src/neat/neat.ts:138`

### Purpose

Controls how often weights are completely randomized (rather than shifted). This provides large exploration jumps and helps escape local optima.

### How It's Used

**In mutation process** (`src/genome/genome.ts:561-568`):

```typescript
const minWeight = Math.min(
  this.#connections.size(),
  this.#nodes.size() - this.#neat.CT
);
prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this.#neat.MUTATION_RATE;
prob = prob > minWeight ? minWeight : prob;
if (optimize) {
  prob = prob > 1 ? 1 : prob;
}
while (prob > Math.random()) {
  prob--;
  this.mutateWeightRandom(); // Completely randomizes weight/bias
}
```

### Code References

- **Definition:** `src/neat/neat.ts:63` (interface), `src/neat/neat.ts:138` (initialization)
- **Getter:** `src/neat/neat.ts:359-361`
- **Usage:** `src/genome/genome.ts:561-568`
- **Validation:** `src/neat/neat.ts:208-210` (warns if not 0-1)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>0.2):** Frequent large exploration jumps, less stable, good for escaping local optima
- **Lower values (<0.02):** Rare randomization, more stable evolution, gradual improvement
- **Default (0.05):** Low frequency - randomization is disruptive but occasionally helpful
- **Interpretation:** With MUTATION_RATE=1, ~5% chance per generation
- **Works with:** WEIGHT_RANDOM_STRENGTH (magnitude of randomization)

---

## PROBABILITY_MUTATE_LINK - New Connection Addition Frequency

**Default:** `0.8`  
**Type:** `number` (typically 0.5-2.0)  
**Location:** `src/neat/neat.ts:139`

### Purpose

Controls how often new connections are added to the network. This is a primary driver of network complexity growth.

### How It's Used

**In mutation process** (`src/genome/genome.ts:537-548`):

```typescript
if (
  (!selfOpt && !this.#neat.optimization) ||
  this.#connections.size() < this.#neat.CT
) {
  prob = this.#neat.PROBABILITY_MUTATE_LINK * this.#neat.MUTATION_RATE;
  prob = this.#connections.size() < this.#neat.CT ? this.#neat.CT : prob;
  if (optimize) {
    prob = prob > 1 ? 1 : prob;
  }
  while (prob > Math.random()) {
    prob--;
    this.mutateLink();
  }
  // ... similar for mutateNode
}
```

**Key behaviors:**

- Only active when NOT in optimization mode OR when network is below CT threshold
- If network has fewer than CT connections, probability is boosted to CT value
- This encourages initial growth of small networks

**The mutation itself** (`src/genome/genome.ts:311-352`):

```typescript
mutateLink(): ConnectionGene | null {
    let geneA = this.#nodes.randomElement();
    let geneB = this.#nodes.randomElement();

    // Ensure nodes are in different layers
    // Check connection doesn't already exist
    // Create new connection with random weight

    con.weight = (Math.random() * 2 - 1) * this.#neat.WEIGHT_RANDOM_STRENGTH;
    this.#connections.addSorted(con);
    return con;
}
```

### Code References

- **Definition:** `src/neat/neat.ts:64` (interface), `src/neat/neat.ts:139` (initialization)
- **Getter:** `src/neat/neat.ts:351-353`
- **Usage:** `src/genome/genome.ts:537-548`, `src/genome/genome.ts:311-352`
- **Validation:** `src/neat/neat.ts:246-251` (warns if > 2)
- **Tests:** `tests/genome/genome.mutate-link.test.ts`

### Tuning Recommendations

- **Higher values (>1.5):** Rapid network growth, complex topologies, risk of bloat
- **Lower values (<0.5):** Slow growth, simple networks, risk of insufficient complexity
- **Default (0.8):** Moderate growth rate
- **Warning:** Values > 2 trigger a warning about rapid network bloat
- **Historical note:** Was initially set to inputNodes \* outputNodes, causing explosive growth
- **Interaction:**
  - Disabled during optimization mode to prevent bloat
  - Boosted when connections < CT to encourage minimum complexity

---

## PROBABILITY_MUTATE_NODES - New Node Addition Frequency

**Default:** `0.03`  
**Type:** `number` (typically 0.01-0.1)  
**Location:** `src/neat/neat.ts:140`

### Purpose

Controls how often new nodes (neurons) are added to the network. This increases network depth and complexity more dramatically than adding connections.

### How It's Used

**In mutation process** (`src/genome/genome.ts:549-552`):

```typescript
prob = this.#neat.PROBABILITY_MUTATE_NODES * this.#neat.MUTATION_RATE;
if (optimize) {
  prob = prob > 1 ? 1 : prob;
}
while (prob > Math.random()) {
  prob--;
  this.mutateNode();
}
```

**The mutation itself** (`src/genome/genome.ts:354-404`):

```typescript
mutateNode(): NodeGene | null {
    const con = this.#connections.randomElement();
    // Pick random connection
    const from = con.from;
    const to = con.to;

    // Create new node in the middle
    const middleX = (from.x + to.x) / 2;
    const middleY = (from.y + to.y) / 2 + randomVariation;

    // Create two new connections: from->middle and middle->to
    con1.weight = 1;
    con2.weight = con.weight;  // Preserve original weight

    // Disable original connection
    con.enabled = false;
    this.removeConnection(con, true);

    return middle;
}
```

**Key behaviors:**

- Splits an existing connection into two connections with a new node
- Original connection is disabled (not deleted for historical tracking)
- First new connection has weight=1, second preserves original weight
- This maintains functional equivalence initially

### Code References

- **Definition:** `src/neat/neat.ts:65` (interface), `src/neat/neat.ts:140` (initialization)
- **Getter:** `src/neat/neat.ts:355-357`
- **Usage:** `src/genome/genome.ts:549-552`, `src/genome/genome.ts:354-404`
- **Tests:** `tests/genome/genome.mutate-node.test.ts`

### Tuning Recommendations

- **Higher values (>0.1):** Frequent node additions, deep networks, high complexity
- **Lower values (<0.01):** Rare node additions, shallow networks, simpler topologies
- **Default (0.03):** Low frequency - node addition is expensive and disruptive
- **Interpretation:** With MUTATION_RATE=1, ~3% chance per generation
- **Balance:** Should be much lower than PROBABILITY_MUTATE_LINK (typically 10-30x lower)
- **Note:** Only active when not in optimization mode OR when connections < CT

### Relationship Between Structural Mutations

```
PROBABILITY_MUTATE_LINK (0.8)     : Add connections - frequent
PROBABILITY_MUTATE_NODES (0.03)   : Add nodes - rare
PROBABILITY_MUTATE_TOGGLE_LINK (0.3) : Enable/disable - moderate

Ratio: 27:1:10 (link:node:toggle)
```

This ratio ensures:

- Networks grow primarily by adding connections (fast, flexible)
- Nodes added occasionally for depth (slow, impactful)
- Topology can be adjusted by toggling (exploration without growth)
