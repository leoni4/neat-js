# Mutation Strength Parameters

## MUTATION_RATE - Mutation Probability Multiplier

**Default:** `1`  
**Type:** `number` (non-negative)  
**Location:** `INeatParams.MUTATION_RATE`, `DEFAULT_PARAMS.MUTATION_RATE` (`src/neat/neat.ts`)

### Purpose

MUTATION_RATE is a multiplier for the link, node, random-weight, and shift-weight mutation probabilities. It controls the overall intensity of evolution. Its value does not change during evolution.

**Used in mutation probability calculations** (`Genome.mutate()`):

```typescript
// Add new connections
prob = this._neat.PROBABILITY_MUTATE_LINK * this._neat.MUTATION_RATE * this._topologyPressure;

// Add new nodes
prob = this._neat.PROBABILITY_MUTATE_NODES * this._neat.MUTATION_RATE * this._topologyPressure;

// Random weight changes
prob = this._neat.PROBABILITY_MUTATE_WEIGHT_RANDOM * this._neat.MUTATION_RATE * this._weightsPressure;

// Weight shift mutations
prob = this._neat.PROBABILITY_MUTATE_WEIGHT_SHIFT * this._neat.MUTATION_RATE * this._weightsPressure;
```

`PROBABILITY_MUTATE_TOGGLE_LINK` is **not** multiplied by MUTATION_RATE or by the pressure.

`_topologyPressure` and `_weightsPressure` come from the pressure level (`MUTATION_PRESSURE_CONST[neat.PRESSURE]`). When the champion does not improve, the level changes from `NORMAL` to `BOOST`, `ESCAPE`, and `PANIC`, and the multipliers grow (see [Mutation Pressure](../PARAMETER_TUNING.md#mutation-pressure)). This is the automatic adaptation; MUTATION_RATE itself stays the same.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.MUTATION_RATE`
- **Usage:** `Genome.mutate()`
- **Validation:** `Neat.validateConfiguration()` (throws if < 0, warns if > 10)

### Tuning Recommendations

- **Higher values (>2):** Very aggressive evolution, high exploration, risk of instability
- **Lower values (<0.5):** Conservative evolution, slow progress, good for fine-tuning
- **Default (1):** Standard evolution speed
- **Warning:** Values > 10 trigger a console warning as they can cause chaos

---

## SURVIVORS - Selection Pressure

**Default:** `0.4` (40%)  
**Type:** `number` (0 to 1)  
**Location:** `INeatParams.SURVIVORS`, `DEFAULT_PARAMS.SURVIVORS` (`src/neat/neat.ts`)

### Purpose

SURVIVORS determines what fraction of each species survives the selection phase. Higher values mean weaker selection pressure (more survival), lower values mean stronger selection (only the best survive). It also limits which species can be parents.

### How It's Used

**In species killing phase** (`Species.kill()`):

```typescript
kill(survivors = 0.5) {
    this._clients.sort((a, b) => {
        return a.scoreRaw > b.scoreRaw ? -1 : 1;
    });

    const keep = Math.ceil(survivors * this._clients.length);
    for (let i = this._clients.length - 1; i >= keep; i--) {
        if (this._clients[i].bestScore) {
            continue;
        }
        this._clients[i].species = null;
        this._clients.splice(i, 1);
    }
}
```

The clients are sorted by **raw** score. `Neat.kill()` passes `SURVIVORS` to each species.

**In reproduction** (`Neat.reproduce()` and `RandomSelector.random()`):

```typescript
const selector = new RandomSelector(this._SURVIVORS);
for (let i = 0; i < this._species.length; i += 1) {
    selector.add(this._species[i]);
}
for (let i = 0; i < this._clients.length; i += 1) {
    const c = this._clients[i];
    if (c.species === null) {
        const s = selector.random();
        // PANIC pressure: c.genome is made from an empty genome (see PARAMETER_TUNING.md)
        c.genome = s.breed();
        s.put(c, true);
    }
}
```

`RandomSelector` sorts the species by average normalized score (highest first). `random()` draws a value in `[0, SURVIVORS × total score)` and returns the first species whose cumulative score reaches that value. So only the top species that hold the first `SURVIVORS` part of the total species score are picked as parents. `Species.breed()` picks two random members (they can be the same client) and calls `Genome.crossOver()` with the member that has the higher normalized score first.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Validation:** `Neat.validateConfiguration()` (throws if not in 0-1, warns if > 0.6)
- **Usage in killing:** `Species.kill()`, called from `Neat.kill()`
- **Usage in reproduction:** `Neat.reproduce()`, `RandomSelector.random()`

### Tuning Recommendations

- **Higher values (0.6-0.8):** Weak selection, high diversity, slow convergence, risk of stagnation
- **Lower values (0.2-0.3):** Strong selection, fast convergence, risk of premature convergence
- **Default (0.4):** Balanced selection pressure - top 40% survive and reproduce
- **Warning:** Values > 0.6 trigger a warning about weak selection pressure

### Impact on Evolution

- **With 0.4 (40%):** Top 40% of each species survive (rounded up), the others are replaced by offspring
- **Example with 10 individuals:**
    - Top 4 survive
    - Bottom 6 are replaced by offspring of the parent species
- **Best genome protection:** The client with the best raw score (`client.bestScore`) is never killed regardless of SURVIVORS value

---

## WEIGHT_SHIFT_STRENGTH - Connection Weight Shift Magnitude

**Default:** `0.2`  
**Type:** `number` (typically 0.1-1.0)  
**Location:** `INeatParams.WEIGHT_SHIFT_STRENGTH`, `DEFAULT_PARAMS.WEIGHT_SHIFT_STRENGTH` (`src/neat/neat.ts`)

### Purpose

Controls the magnitude of small adjustments to existing connection weights. This is the primary mechanism for fine-tuning network behavior.

### How It's Used

**In weight shift mutation** (`Genome.mutateWeightShiftConnection()`):

```typescript
private mutateWeightShiftConnection(): ConnectionGene | null {
    const con = this._connections.randomElement();
    if (!(con instanceof ConnectionGene)) {
        return null;
    }
    let newWeight = con.weight;
    let counter = 0;
    while (newWeight === con.weight && counter < 10) {
        counter++;
        newWeight = con.weight + (Math.random() * 2 - 1) * this._neat.WEIGHT_SHIFT_STRENGTH;
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
- If 10 tries give no different value (for example when the strength is `0`), the weight is set to `0`

**Applied to both connections and nodes:**

```typescript
mutateWeightShift(): void {
    this.mutateWeightShiftConnection();
    this.mutateWeightShiftNode();
}
```

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.WEIGHT_SHIFT_STRENGTH`
- **Usage:** `Genome.mutateWeightShiftConnection()` (connection shifts), `Genome.mutateWeightShiftNode()` (node bias shifts)
- **Validation:** `Neat.validateConfiguration()` (warns if > 1, and if 0 while shift mutation is on)
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
**Location:** `INeatParams.BIAS_SHIFT_STRENGTH`, `DEFAULT_PARAMS.BIAS_SHIFT_STRENGTH` (`src/neat/neat.ts`)

### Purpose

Controls the magnitude of small adjustments to node biases. Biases affect when neurons activate and are crucial for network behavior.

### How It's Used

**In bias shift mutation** (`Genome.mutateWeightShiftNode()`):

```typescript
private mutateWeightShiftNode(): NodeGene | null {
    let counter = 0;
    let node;
    while ((!(node instanceof NodeGene) || node.x === NETWORK_CONSTANTS.INPUT_NODE_X) && counter < 10) {
        counter++;
        node = this._nodes.randomElement();
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
        newWeight = node.bias + (Math.random() * 2 - 1) * this._neat.BIAS_SHIFT_STRENGTH;
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
- The node is picked from all nodes; if 10 random picks give only input nodes, there is no bias mutation in this call
- Formula: `newBias = oldBias + random(-1, 1) * BIAS_SHIFT_STRENGTH`
- Tries up to 10 times to generate a different value, else sets `0`

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.BIAS_SHIFT_STRENGTH`
- **Usage:** `Genome.mutateWeightShiftNode()`
- **Validation:** `Neat.validateConfiguration()` (warns if imbalanced with WEIGHT_SHIFT_STRENGTH, and if 0 while shift mutation is on)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- **Higher values (>0.3):** Large bias changes, can dramatically alter activation patterns
- **Lower values (<0.1):** Subtle bias adjustments, stable evolution
- **Default (0.15):** Slightly smaller than WEIGHT_SHIFT_STRENGTH (0.2) for balanced evolution
- **Balance warning:** If `|WEIGHT_SHIFT_STRENGTH − BIAS_SHIFT_STRENGTH| / WEIGHT_SHIFT_STRENGTH > 0.8`, a warning is issued
- **Historical note:** Original default was 0.01 (500x smaller than weights), now balanced at 0.15

---

## WEIGHT_RANDOM_STRENGTH - Random Weight Assignment Magnitude

**Default:** `1`  
**Type:** `number` (typically 0.5-2.0; must not be `0` while random weight mutation is on)  
**Location:** `INeatParams.WEIGHT_RANDOM_STRENGTH`, `DEFAULT_PARAMS.WEIGHT_RANDOM_STRENGTH` (`src/neat/neat.ts`)

### Purpose

Controls the range for randomizing connection weights (rather than shifting them), and the range of the weight of a new connection.

### How It's Used

**In random weight mutation for connections** (`Genome.mutateWeightRandomConnection()`):

```typescript
let newWeight = con.weight || this._neat.WEIGHT_RANDOM_STRENGTH;
while (newWeight === con.weight) {
    newWeight = (Math.random() * newWeight * 2 - newWeight) * this._neat.WEIGHT_RANDOM_STRENGTH;
}
con.weight = newWeight;
```

The new weight is `random(-|base|, |base|) × WEIGHT_RANDOM_STRENGTH`, where `base` is the current weight, or `WEIGHT_RANDOM_STRENGTH` when the current weight is `0`. So the range scales with the current weight. The loop draws again until the value is different.

**For new connections** (`Genome.mutateLink()`):

```typescript
con.weight = (Math.random() * 2 - 1) * this._neat.WEIGHT_RANDOM_STRENGTH;
```

New weight in range `[-WEIGHT_RANDOM_STRENGTH, +WEIGHT_RANDOM_STRENGTH]`.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.WEIGHT_RANDOM_STRENGTH`
- **Usage:** `Genome.mutateLink()` (new links), `Genome.mutateWeightRandomConnection()` (random mutations)
- **Validation:** `Neat.validateConfiguration()` (throws if 0 while `PROBABILITY_MUTATE_WEIGHT_RANDOM × MUTATION_RATE > 0`)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`, `tests/genome/genome.mutate-link.test.ts`

### Tuning Recommendations

- **Higher values (>1.5):** Wide exploration range, good for initial population, risk of instability
- **Lower values (<0.5):** Narrow exploration range, conservative, good for fine-tuning
- **Default (1):** Balanced - allows exploration while maintaining some stability
- **Use cases:**
    - Initial evolution: Higher values (1.5-2.0) for broad exploration
    - Later stages: Lower values (0.5-1.0) for refinement
    - Stuck populations: Higher values to escape local optima

---

## BIAS_RANDOM_STRENGTH - Random Bias Assignment Magnitude

**Default:** `1`  
**Type:** `number` (must not be `0` while random weight mutation is on)  
**Location:** `INeatParams.BIAS_RANDOM_STRENGTH`, `DEFAULT_PARAMS.BIAS_RANDOM_STRENGTH` (`src/neat/neat.ts`)

### Purpose

Controls the range for randomizing node biases. `PROBABILITY_MUTATE_WEIGHT_RANDOM` controls how often it happens: each random weight mutation changes one connection weight and one node bias (`Genome.mutateWeightRandom()`).

### How It's Used

**In random weight mutation for nodes** (`Genome.mutateWeightRandomNode()`):

```typescript
let newWeight = node.bias || this._neat.BIAS_RANDOM_STRENGTH;
while (newWeight === node.bias) {
    newWeight = (Math.random() * newWeight * 2 - newWeight) * this._neat.BIAS_RANDOM_STRENGTH;
}
node.bias = newWeight;
```

- The node is picked like in the bias shift mutation (output and hidden nodes only; up to 10 random picks)
- The new bias is `random(-|base|, |base|) × BIAS_RANDOM_STRENGTH`, where `base` is the current bias, or `BIAS_RANDOM_STRENGTH` when the current bias is `0`

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.BIAS_RANDOM_STRENGTH`
- **Usage:** `Genome.mutateWeightRandomNode()`
- **Validation:** `Neat.validateConfiguration()` (throws if 0 while `PROBABILITY_MUTATE_WEIGHT_RANDOM × MUTATION_RATE > 0`)
- **Tests:** `tests/genome/genome.mutate-weights.test.ts`

### Tuning Recommendations

- Use a value close to WEIGHT_RANDOM_STRENGTH unless biases need a different range
- To turn random weight and bias mutation off, use `PROBABILITY_MUTATE_WEIGHT_RANDOM: 0` (not a strength of `0`)
