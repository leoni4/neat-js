# Mutation Strength Parameters

## MUTATION_RATE - Global Mutation Rate Multiplier

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `src/neat/neat.ts:127`

### Purpose

MUTATION_RATE is a global multiplier applied to all mutation probabilities. It controls the overall intensity of evolution and has a dynamic component that increases when the population is stuck at the same error level.

**Used in mutation probability calculations** (`src/genome/genome.ts:537-576`):

```typescript
// Add new connections
prob = this.#neat.PROBABILITY_MUTATE_LINK * this.#neat.MUTATION_RATE;

// Add new nodes
prob = this.#neat.PROBABILITY_MUTATE_NODES * this.#neat.MUTATION_RATE;

// Random weight changes
prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this.#neat.MUTATION_RATE;

// Weight shift mutations
prob = this.#neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this.#neat.MUTATION_RATE;
```

### Code References

- **Definition:** `src/neat/neat.ts:56` (interface), `src/neat/neat.ts:127` (initialization)
- **Dynamic getter:** `src/neat/neat.ts:335-337`
- **Usage:** `src/genome/genome.ts:537-576` (all probability-based mutations)
- **Validation:** `src/neat/neat.ts:204-206` (warns if > 10)

### Tuning Recommendations

- **Higher values (>2):** Very aggressive evolution, high exploration, risk of instability
- **Lower values (<0.5):** Conservative evolution, slow progress, good for fine-tuning
- **Default (1):** Standard evolution speed with automatic adaptation
- **Dynamic behavior:** Automatically increases by 0.1 per stuck epoch, helping escape plateaus
- **Warning:** Values > 10 trigger a console warning as they can cause chaos

---

## SURVIVORS - Selection Pressure

**Default:** `0.4` (40%)  
**Type:** `number` (0 to 1)  
**Location:** `src/neat/neat.ts:130`

### Purpose

SURVIVORS determines what fraction of each species survives the selection phase. Higher values mean weaker selection pressure (more survival), lower values mean stronger selection (only the best survive).

### How It's Used

**In species killing phase** (`src/neat/species.ts:65-75`):

```typescript
kill(survivors = 0.5) {
    this.#clients.sort((a, b) => {
        return a.score > b.score ? -1 : 1;
    });

    const elems = survivors * this.#clients.length;
    for (let i = this.#clients.length - 1; i > elems; i -= 1) {
        if (this.#clients[i].bestScore) {
            continue;  // Never kill the best genome
        }
        this.#clients[i].species = null;
        this.#clients.splice(i, 1);
    }
}
```

**In reproduction** (`src/neat/neat.ts:641-652`):

```typescript
#reproduce() {
    const selector = new RandomSelector(this.#SURVIVORS);
    for (let i = 0; i < this.#species.length; i += 1) {
        selector.add(this.#species[i]);
    }
    for (let i = 0; i < this.#clients.length; i += 1) {
        const c = this.#clients[i];
        if (c.species === null) {
            const s = selector.random();  // Select from top SURVIVORS%
            c.genome = s.breed();
            s.put(c, true);
        }
    }
    selector.reset();
}
```

### Code References

- **Definition:** `src/neat/neat.ts:57` (interface), `src/neat/neat.ts:130` (initialization)
- **Validation:** `src/neat/neat.ts:192-194` (must be 0-1)
- **Usage in killing:** `src/neat/species.ts:65`, called from `src/neat/neat.ts:669`
- **Usage in reproduction:** `src/neat/neat.ts:641-652`
- **Warning:** `src/neat/neat.ts:240-244` (warns if > 0.6)

### Tuning Recommendations

- **Higher values (0.6-0.8):** Weak selection, high diversity, slow convergence, risk of stagnation
- **Lower values (0.2-0.3):** Strong selection, fast convergence, risk of premature convergence
- **Default (0.4):** Balanced selection pressure - top 40% survive and reproduce
- **Warning:** Values > 0.6 trigger a warning about weak selection pressure

### Impact on Evolution

- **With 0.4 (40%):** Top 40% of each species survive, bottom 60% are replaced by offspring
- **Example with 10 individuals:**
    - Top 4 survive
    - Bottom 6 are replaced by breeding the top 4
- **Best genome protection:** The globally best genome is never killed regardless of SURVIVORS value

---

## WEIGHT_SHIFT_STRENGTH - Connection Weight Shift Magnitude

**Default:** `0.2`  
**Type:** `number` (typically 0.1-1.0)  
**Location:** `src/neat/neat.ts:133`

### Purpose

Controls the magnitude of small adjustments to existing connection weights. This is the primary mechanism for fine-tuning network behavior.

### How It's Used

**In weight shift mutation** (`src/genome/genome.ts:422-434`):

```typescript
#mutateWeightShiftConnection(): ConnectionGene | null {
    const con = this.#connections.randomElement();
    if (!(con instanceof ConnectionGene)) {
        return null;
    }
    let newWeight = con.weight;
    let counter = 0;
    while (newWeight === con.weight && counter < 10) {
        counter++;
        newWeight = con.weight + (Math.random() * 2 - 1) * this.#neat.WEIGHT_SHIFT_STRENGTH;
    }
    if (counter >= 10) {
        newWeight = 0;
    }
    con.weight = newWeight;
    return con;
}
```

The formula: `newWeight = oldWeight + random(-1, 1) * WEIGHT_SHIFT_STRENGTH`

- Random value in range `[-WEIGHT_SHIFT_STRENGTH, +WEIGHT_SHIFT_STRENGTH]` is added
- Example with WEIGHT_SHIFT_STRENGTH = 0.2:
    - If current weight = 1.5
    - New weight could be anywhere from 1.3 to 1.7

**Applied to both connections and nodes:**

```typescript
mutateWeightShift(): void {
    this.#mutateWeightShiftConnection();
    this.#mutateWeightShiftNode();
}
```

### Code References

- **Definition:** `src/neat/neat.ts:58` (interface), `src/neat/neat.ts:133` (initialization)
- **Getter:** `src/neat/neat.ts:339-341`
- **Usage:** `src/genome/genome.ts:422-434` (connection shifts), `src/genome/genome.ts:406-420` (node bias shifts)
- **Validation:** `src/neat/neat.ts:232-237` (warns if > 1)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>0.5):** Large weight changes, fast adaptation, risk of oscillation and instability
- **Lower values (<0.1):** Small weight changes, slow but stable convergence, good for final tuning
- **Default (0.2):** Balanced - allows meaningful adjustments without excessive disruption
- **Warning:** Values > 1 trigger a warning about potential oscillations preventing convergence
- **Historical note:** Original default was 5.0 which caused extreme instability

### Relationship with Other Parameters

- Works with PROBABILITY_MUTATE_WEIGHT_SHIFT to control frequency
- Should be balanced with BIAS_SHIFT_STRENGTH (see validation warnings)
- Lower values work better with higher MUTATION_RATE

---

## BIAS_SHIFT_STRENGTH - Node Bias Shift Magnitude

**Default:** `0.15`  
**Type:** `number` (typically 0.1-1.0)  
**Location:** `src/neat/neat.ts:134`

### Purpose

Controls the magnitude of small adjustments to node biases (the activation threshold for each node). Biases affect when neurons activate and are crucial for network behavior.

### How It's Used

**In bias shift mutation** (`src/genome/genome.ts:406-420`):

```typescript
#mutateWeightShiftNode(): NodeGene | null {
    let counter = 0;
    let node;
    // Skip only input nodes (they receive direct input values, bias is not meaningful)
    // Output and hidden nodes can have bias mutations
    while ((!(node instanceof NodeGene) || node.x === NETWORK_CONSTANTS.INPUT_NODE_X) && counter < 10) {
        counter++;
        node = this.#nodes.randomElement();
    }
    if (counter >= 10) {
        return null;
    }
    counter = 0;
    if (!(node instanceof NodeGene)) {
        return null;
    }
    let newWeight = node.bias;
    while (newWeight === node.bias && counter < 10) {
        counter++;
        newWeight = node.bias + (Math.random() * 2 - 1) * this.#neat.BIAS_SHIFT_STRENGTH;
    }
    if (counter >= 10) {
        newWeight = 0;
    }
    node.bias = newWeight;
    return node;
}
```

**Key behaviors:**

- Only affects output and hidden nodes (NOT input nodes)
- Formula: `newBias = oldBias + random(-1, 1) * BIAS_SHIFT_STRENGTH`
- Tries up to 10 times to generate a different value

### Code References

- **Definition:** `src/neat/neat.ts:59` (interface), `src/neat/neat.ts:134` (initialization)
- **Getter:** `src/neat/neat.ts:343-345`
- **Usage:** `src/genome/genome.ts:406-420`
- **Validation:** `src/neat/neat.ts:246-254` (warns if imbalanced with WEIGHT_SHIFT_STRENGTH)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>0.3):** Large bias changes, can dramatically alter activation patterns
- **Lower values (<0.1):** Subtle bias adjustments, stable evolution
- **Default (0.15):** Slightly smaller than WEIGHT_SHIFT_STRENGTH (0.2) for balanced evolution
- **Balance warning:** If difference with WEIGHT_SHIFT_STRENGTH > 80%, a warning is issued
- **Historical note:** Original default was 0.01 (500x smaller than weights), now balanced at 0.15

---

## WEIGHT_RANDOM_STRENGTH - Random Weight Assignment Magnitude

**Default:** `1`  
**Type:** `number` (typically 0.5-2.0)  
**Location:** `src/neat/neat.ts:135`

### Purpose

Controls the range for completely randomizing weights (rather than shifting them). This provides larger exploration jumps and helps escape local optima.

### How It's Used

**In random weight mutation for connections** (`src/genome/genome.ts:459-472`):

```typescript
#mutateWeightRandomConnection(): ConnectionGene | null {
    const con = this.#connections.randomElement();
    if (!(con instanceof ConnectionGene)) {
        return null;
    }

    let newWeight = con.weight || this.#neat.WEIGHT_RANDOM_STRENGTH;
    while (newWeight === con.weight) {
        newWeight = (Math.random() * newWeight * 2 - newWeight) * this.#neat.WEIGHT_RANDOM_STRENGTH;
    }
    con.weight = newWeight;
    return con;
}
```

**In random weight mutation for nodes** (`src/genome/genome.ts:437-450`):

```typescript
#mutateWeightRandomNode(): NodeGene | null {
    // ... (selects non-input node)

    let newWeight = node.bias || this.#neat.WEIGHT_RANDOM_STRENGTH;
    while (newWeight === node.bias) {
        newWeight = (Math.random() * newWeight * 2 - newWeight) * this.#neat.WEIGHT_RANDOM_STRENGTH;
    }
    node.bias = newWeight;
    return node;
}
```

**For new connections** (`src/genome/genome.ts:352`):

```typescript
mutateLink(): ConnectionGene | null {
    // ... (creates new connection)
    con.weight = (Math.random() * 2 - 1) * this.#neat.WEIGHT_RANDOM_STRENGTH;
    // New weight in range [-WEIGHT_RANDOM_STRENGTH, +WEIGHT_RANDOM_STRENGTH]
    this.#connections.addSorted(con);
    return con;
}
```

### Code References

- **Definition:** `src/neat/neat.ts:60` (interface), `src/neat/neat.ts:135` (initialization)
- **Getter:** `src/neat/neat.ts:347-349`
- **Usage:** `src/genome/genome.ts:352` (new links), `src/genome/genome.ts:437-472` (random mutations)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`, `tests/genome/genome.mutate-link.test.ts`

### Tuning Recommendations

- **Higher values (>1.5):** Wide exploration range, good for initial population, risk of instability
- **Lower values (<0.5):** Narrow exploration range, conservative, good for fine-tuning
- **Default (1):** Balanced - allows exploration while maintaining some stability
- **Use cases:**
    - Initial evolution: Higher values (1.5-2.0) for broad exploration
    - Later stages: Lower values (0.5-1.0) for refinement
    - Stuck populations: Higher values to escape local optima
