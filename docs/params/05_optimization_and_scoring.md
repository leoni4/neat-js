# Optimization and Scoring Parameters

## Optimization modes

There are two kinds of optimization. Both use the same clean-up in `Genome.mutate()`.

| Mode                                      | When it is on                                                                                                       | Scope       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------- |
| Global optimization (`neat.optimization`) | `evolve(true)`, or `evolveCounts % OPTIMIZATION_PERIOD === 0`, or pressure level `COMPACT`; for one `evolve()` call | All clients |
| Self-optimization (`genome.selfOpt`)      | `client.error < OPT_ERR_THRESHOLD`, except in the forced first mutation                                             | One client  |

Effects:

- **Clean-up** (`Genome.optimization()`): remove all disabled connections (`removeDead()`), then remove the connections and hidden nodes that are not on an enabled input→output path (`pruneDeadGraph()`). A removed connection can also remove a hidden node that loses its last connection, together with the other connections of that node
- **No new connections or nodes** - unless the genome has fewer than CT connections, or `PERMANENT_MAIN_CONNECTIONS` is on and the genome has fewer than `inputs × outputs` connections
- **Toggle and weight mutations continue**
- **Global mode only:** `LAMBDA_HIGH` instead of `LAMBDA_LOW` in the score normalization; crossover does not copy disabled excess genes of the fitter parent (and, when the fitter parent is also in self-optimization, no disabled disjoint genes)

## OPT_ERR_THRESHOLD - Optimization Error Threshold

**Default:** `0.005`  
**Type:** `number` (typically 0.001-0.1)  
**Location:** `INeatParams.OPT_ERR_THRESHOLD`, `DEFAULT_PARAMS.OPT_ERR_THRESHOLD` (`src/neat/neat.ts`)

### Purpose

OPT_ERR_THRESHOLD has two roles:

1. A client with `client.error < OPT_ERR_THRESHOLD` enters self-optimization mode.
2. The champion must improve its raw score by more than OPT_ERR_THRESHOLD to reset the stagnation count, which sets the pressure level.

### How It's Used

**In genome initialization** (`Genome` constructor):

```typescript
constructor(neat: Neat) {
    this._neat = neat;
    this._optErrThreshold = neat.OPT_ERR_THRESHOLD;
}
```

**In client mutation decision** (`Client.mutate()`):

```typescript
mutate(force = false) {
    if (this.bestScore && !force) {
        return;
    }
    this.genome.mutate(this.error < this.genome.optErrThreshold && !force);
}
```

`Neat.mutate()` passes `force = true` only in the first `evolve()` call of a population (when `evolveCounts` becomes `1`).

**`client.error` must be set by you.** Its default value is `0`, and `evolve()` does not compute it (`Neat.fit()` does). If you set only `client.score`, every client has `error = 0 < OPT_ERR_THRESHOLD`, so all clients are in self-optimization from the second `evolve()` call, and the networks stop growing after the first connection. Set `client.error` to your error measure (0 = perfect), or to a value ≥ OPT_ERR_THRESHOLD while you want the topology to grow.

**In stagnation tracking** (`Neat.updateStagnationAndPressure()`):

```typescript
const accumulatedGain = this._champion.scoreRaw - this._networkScoreRaw;
if (accumulatedGain <= this._OPT_ERR_THRESHOLD) {
    this._stagnationCount++;
} else {
    this._networkScoreRaw = this._champion.scoreRaw;
    this._stagnationCount = 0;
}
```

The stagnation count sets `neat.PRESSURE` (see [Mutation Pressure](../PARAMETER_TUNING.md#mutation-pressure)). So OPT_ERR_THRESHOLD is also the minimum raw score gain that counts as progress. Choose it on the scale of your scores.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.OPT_ERR_THRESHOLD`, `Genome.optErrThreshold`
- **Usage:** `Client.mutate()` (self-optimization decision), `Genome.mutate()` (optimization behavior), `Neat.updateStagnationAndPressure()` (stagnation), `Neat.fit()` (default `errorThreshold` and `evolve(true)` trigger)

### Behavior When Error < OPT_ERR_THRESHOLD

- **Disabled and dead connections are removed** - Network is simplified
- **No new connections or nodes added** - Topology is frozen (unless network is very small, < CT)
- **Weight and toggle mutations continue** - Fine-tuning still happens

### Tuning Recommendations

- **Higher values (>0.05):** Earlier optimization, faster convergence, risk of premature simplification; more generations count as stagnation
- **Lower values (<0.001):** Later optimization, more exploration, network may stay complex
- **Default (0.005):** Optimize when performance is very good
- **Interpretation:** If your error is in range [0, 1], a client optimizes when error < 0.5%
- **Problem-specific:** Adjust based on your error scale:
    - For MSE on normalized data: 0.005-0.05 reasonable
    - For classification accuracy: depends on encoding
    - For game scores: scale accordingly

---

## OPTIMIZATION_PERIOD - Period of Global Optimization

**Default:** `100`  
**Type:** `number` (positive integer)  
**Location:** `INeatParams.OPTIMIZATION_PERIOD`, `DEFAULT_PARAMS.OPTIMIZATION_PERIOD` (`src/neat/neat.ts`)

### Purpose

OPTIMIZATION_PERIOD sets how often the global optimization mode is on, and how long the champion can stay the same before the elites are put back into the population.

### How It's Used

**Global optimization mode** (`Neat.evolve()`):

```typescript
this._evolveCounts++;
this._optimization = optimization || this._evolveCounts % this._OPTIMIZATION_PERIOD === 0;
```

Optimization mode is on:

- Every 100 `evolve()` calls with the default (`evolveCounts` 100, 200, 300, ...)
- When explicitly requested via `evolve(true)`
- When the pressure level becomes `COMPACT` (set in `Neat.updateStagnationAndPressure()`; never with `PRESSURE_COMPACT: false`)

`evolveCounts` continues from the loaded value when you load a model, so a loaded model keeps the same optimization schedule.

**Elite reinsertion** (`Neat.reinsertElitesIfStagnant()`): when the champion did not change for `OPTIMIZATION_PERIOD` `evolve()` calls, copies of the champion and the runner-up replace the two lowest-ranked clients, and the champion age goes back to 0.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.evolve()`, `Neat.reinsertElitesIfStagnant()`

### Tuning Recommendations

- **Lower values:** More frequent clean-up phases and elite reinsertion, smaller networks
- **Higher values:** Rarer clean-up, more time for exploration

---

## PRESSURE_BOOST and PRESSURE_COMPACT - Pressure Level Switches

**Default:** `true` (both)  
**Type:** `boolean`  
**Location:** `INeatParams.PRESSURE_BOOST`, `INeatParams.PRESSURE_COMPACT`, `DEFAULT_PARAMS` (`src/neat/neat.ts`)

### Purpose

The stagnation count (see [OPT_ERR_THRESHOLD](#opt_err_threshold---optimization-error-threshold)) sets the pressure level `neat.PRESSURE` (see [Mutation Pressure](../PARAMETER_TUNING.md#mutation-pressure)). These switches turn off parts of this automatic adaptation.

- `PRESSURE_BOOST: false`: the level is never `BOOST`, `ESCAPE`, or `PANIC`, so the mutation multipliers stay at the `NORMAL` values and new children are never made from empty genomes (`PANIC` path in `Neat.reproduce()`). The stagnation count and its reset (count > 405 → 200) still run, because the `COMPACT` check uses them.
- `PRESSURE_COMPACT: false`: the `COMPACT` check is skipped. The level is never `COMPACT`, and the check does not turn on global optimization mode. `evolve(true)` and `OPTIMIZATION_PERIOD` still turn it on.

With both switches `false`, `neat.PRESSURE` is always `NORMAL`.

```typescript
new Neat(85, 1, 100, EActivation.tanh, EActivation.tanh, { PRESSURE_BOOST: false });
```

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.updateStagnationAndPressure()`

### Tuning Recommendations

- **Default (`true`, `true`):** The same behaviour as older versions
- **`PRESSURE_BOOST: false`:** Noisy or changing fitness data (for example a new data window in each generation). There, the champion seldom gains more than `OPT_ERR_THRESHOLD`, so the stagnation count grows and the higher levels can run for long periods. On a test workload (85 inputs, population 100, a new data window in each generation, 1,200 generations), the defaults gave `BOOST` or `ESCAPE` in 444 of 1,200 generations; with `PRESSURE_BOOST: false` all 1,200 were `NORMAL`.
- **`PRESSURE_COMPACT: false`:** When the complexity penalty and `OPTIMIZATION_PERIOD` are enough to control the network size, and you do not want extra global optimization phases

---

## PERMANENT_MAIN_CONNECTIONS - Protect Input-Output Connections

**Default:** `false`  
**Type:** `boolean`  
**Location:** `INeatParams.PERMANENT_MAIN_CONNECTIONS`, `DEFAULT_PARAMS.PERMANENT_MAIN_CONNECTIONS` (`src/neat/neat.ts`)

### Purpose

When enabled, prevents the removal of direct connections from input nodes to output nodes, and makes each genome add connections until it has `inputs × outputs` connections.

### How It's Used

**In connection removal** (`Genome.removeConnection()`):

```typescript
removeConnection(con: ConnectionGene, replace = false, down = true, up = true) {
    if (
        this._neat.PERMANENT_MAIN_CONNECTIONS &&
        con.from.x === NETWORK_CONSTANTS.INPUT_NODE_X &&
        con.to.x === NETWORK_CONSTANTS.OUTPUT_NODE_X
    ) {
        return false; // Skip removal, connection is protected
    }
    // ... rest of removal logic
}
```

**In structural mutations** (`Genome.mutate()`): while the genome has fewer than `inputs × outputs` connections, the structural block also runs in optimization mode, and the link probability is `inputs × outputs` (many link attempts in one generation).

**Constants used** (`NETWORK_CONSTANTS` in `src/neat/constants.ts`):

```typescript
export const NETWORK_CONSTANTS = {
    INPUT_NODE_X: 0.01,
    OUTPUT_NODE_X: 0.99,
    // ...
};
```

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Getter:** `Neat.PERMANENT_MAIN_CONNECTIONS`
- **Usage:** `Genome.removeConnection()` (connection removal protection), `Genome.mutate()` (link filling)
- **Tests:** `tests/genome/genome.remove-connection.test.ts`

### When Connections Are Removed

Connections can be removed in several scenarios:

1. **During node mutation** - Original connection is disabled and removed
2. **During optimization** - Disabled and dead connections are cleaned up
3. **When a node becomes isolated** - Cascade removal of orphaned connections

A protected input→output connection is not removed in these cases. It can still be disabled (by node mutation or toggle).

### Tuning Recommendations

- **true:**
    - Guarantees minimum connectivity
    - Good for problems requiring all inputs to directly influence outputs
    - Prevents network from becoming disconnected during evolution
    - May limit exploration of complex topologies; with many inputs and outputs, genomes become large
- **false (default):**
    - Allows full topology evolution
    - Network can evolve to use only relevant inputs
    - Hidden layers can completely mediate input-output relationship
    - Risk of losing important connections temporarily

### Use Cases

- **Enable (true)** when:
    - You have few inputs/outputs and want guaranteed connectivity
    - Problem requires direct input-output relationships
    - You're experiencing network disconnection issues
- **Disable (false)** when:
    - You want maximum evolutionary freedom
    - Problem may benefit from complex hidden layer processing
    - Using regularization/complexity penalties to manage topology

---

## LAMBDA_HIGH - Complexity Penalty During Optimization

**Default:** `0.3`  
**Type:** `number` (typically 0.1-0.5)  
**Location:** `INeatParams.LAMBDA_HIGH`, `DEFAULT_PARAMS.LAMBDA_HIGH` (`src/neat/neat.ts`)

### Purpose

LAMBDA_HIGH controls how strongly network complexity is penalized when selecting the best genomes during the global optimization mode. Higher values favor simpler networks.

### How It's Used

**In score normalization** (`Neat.normalizeScore()`):

```typescript
const rawSpan = rawMax - rawMin;
const effectiveSpan = Math.max(rawSpan, 0.05);
const lambda = this._optimization ? this._LAMBDA_HIGH : this._LAMBDA_LOW;

for (const client of this._clients) {
    const complexityNorm = maxComplexity > 0 ? Math.log1p(client.complexity) / Math.log1p(maxComplexity) : 0;
    const complexityPenalty = lambda * complexityNorm * effectiveSpan;
    client.adjustedScore = client.scoreRaw - complexityPenalty;
}
```

Then the adjusted scores are normalized to [0, 1] (`(adjusted − min) / (max − min)`; all scores are `1` when `max − min ≤ EPS`), and the clients are sorted.

**The penalty formula:**

```
complexity            = connections + nodes          (Neat.prepareRawScores())
complexity_normalized = ln(1 + complexity) / ln(1 + max_complexity)
score_span            = max(raw_max − raw_min, 0.05)
penalty               = lambda × complexity_normalized × score_span
adjusted_score        = raw_score − penalty
```

`lambda` is LAMBDA_HIGH when the global optimization mode is on (see [Optimization modes](#optimization-modes)); self-optimization of a client does not change it.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.normalizeScore()` (score adjustment)
- **Validation:** `Neat.validateConfiguration()` (throws if < 0, warns if > 0.8)

### Tuning Recommendations

- **Higher values (>0.5):** Very strong simplicity bias, aggressive pruning, risk of oversimplification
- **Lower values (<0.2):** Weak simplicity bias, allows complex solutions, slower convergence
- **Default (0.3):** Moderate penalty - encourages simplicity without forcing it
- **Historical note:** Was 0.6 (too aggressive), reduced to 0.3 for better balance

### Example Impact

With rawMax=100, rawMin=80 (score_span=20), max_complexity=50:

**Client A:** rawScore=94, complexity=15

- complexity_normalized = ln(16)/ln(51) = 0.7052
- penalty = 0.3 × 0.7052 × 20 = 4.231
- adjusted = 94 − 4.231 = 89.769

**Client B:** rawScore=95, complexity=45

- complexity_normalized = ln(46)/ln(51) = 0.9738
- penalty = 0.3 × 0.9738 × 20 = 5.843
- adjusted = 95 − 5.843 = 89.157

Client A wins despite lower raw score due to simplicity.

---

## LAMBDA_LOW - Complexity Penalty During Exploration

**Default:** `0.1`  
**Type:** `number` (typically 0.05-0.3)  
**Location:** `INeatParams.LAMBDA_LOW`, `DEFAULT_PARAMS.LAMBDA_LOW` (`src/neat/neat.ts`)

### Purpose

LAMBDA_LOW controls complexity penalties during normal evolution (exploration phases). It's lower than LAMBDA_HIGH to encourage experimentation with more complex topologies.

### How It's Used

Uses the same formula as LAMBDA_HIGH but applied when the global optimization mode is off:

```typescript
const lambda = this._optimization ? this._LAMBDA_HIGH : this._LAMBDA_LOW;
```

**Phases (default `OPTIMIZATION_PERIOD` = 100, no `evolve(true)`, no `COMPACT`):**

- **Optimization (uses LAMBDA_HIGH):** `evolveCounts` 100, 200, 300, ...
- **Exploration (uses LAMBDA_LOW):** all other `evolve()` calls

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.normalizeScore()` (score adjustment)
- **Validation:** `Neat.validateConfiguration()` (throws if < 0, warns if > 0.5)

### Tuning Recommendations

- **Higher values (>0.3):** Less exploration, prefer simpler networks even during exploration
- **Lower values (<0.05):** Maximum exploration, complexity barely penalized
- **Default (0.1):** Light penalty - allows growth while preventing excessive bloat
- **Historical note:** Was 0.3 (too restrictive), reduced to 0.1 for better exploration
- **Relationship:** Should be significantly lower than LAMBDA_HIGH (typically 1/3 to 1/2)

### Example Impact

Same scenario as LAMBDA_HIGH example but with LAMBDA_LOW=0.1:

- **Client A:** penalty = 0.1 × 0.7052 × 20 = 1.410 → adjusted = 92.590
- **Client B:** penalty = 0.1 × 0.9738 × 20 = 1.948 → adjusted = 93.052 (was 89.157 with LAMBDA_HIGH)

Client B wins during exploration phases.

---

## EPS - Tie-Breaking Epsilon

**Default:** `1e-4` (0.0001)  
**Type:** `number` (typically 1e-6 to 1e-3)  
**Location:** `INeatParams.EPS`, `DEFAULT_PARAMS.EPS` (`src/neat/neat.ts`)

### Purpose

EPS defines how close two normalized scores must be to be considered "tied". When two clients have scores within EPS, the simpler one is sorted first.

### How It's Used

**In score normalization** (`Neat.normalizeScore()`):

```typescript
for (const client of this._clients) {
    client.score = adjustedSpan <= this._EPS ? 1 : (client.adjustedScore - adjustedMin) / adjustedSpan;
}

this._clients.sort((a, b) => {
    const scoreDifference = b.score - a.score;
    if (Math.abs(scoreDifference) > this._EPS) {
        return scoreDifference;
    }
    return a.complexity - b.complexity;
});
```

- If the span of the adjusted scores is ≤ EPS, all clients get the normalized score `1`.
- The clients are sorted by normalized score; when two scores differ by not more than EPS, the client with the lower complexity comes first.

The sort order selects the runner-up (the first client), the clients that elite reinsertion replaces (the last two), and the order of species assignment. `client.bestScore` (the client that is not mutated and not killed) is the client with the highest **raw** score (`Neat.markBestRawClient()`); EPS does not change it.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.normalizeScore()` (normalization and tie detection)
- **Validation:** `Neat.validateConfiguration()` (warns if outside 1e-6 to 1e-2)

### Tuning Recommendations

- **Higher values (>1e-3):** More genomes considered tied, stronger simplicity bias in selection
- **Lower values (<1e-6):** Fewer ties, score differences matter more, less simplicity bias
- **Default (1e-4):** After normalization to [0, 1], differences ≤ 0.01% trigger tie-breaking
- **Historical note:** Was 1e-9 (too small, rarely triggered), increased to 1e-4 for meaningful tie-breaking

### Example Impact

**Scenario 1: EPS = 1e-4**

- Client A: score = 0.95000, complexity = 20
- Client B: score = 0.94995, complexity = 15
- Difference: 0.00005 ≤ EPS → **TIE** → B first (simpler)

**Scenario 2: EPS = 1e-6**

- Same clients
- Difference: 0.00005 > 1e-6 → **NOT A TIE** → A first (higher score)

### Interaction with Normalization

Scores are normalized to [0, 1] before tie-breaking:

- EPS = 1e-4 means 0.01% difference threshold
- EPS = 1e-3 means 0.1% difference threshold
- EPS = 1e-6 means 0.0001% difference threshold

### Use Cases

- **Larger EPS (1e-3):** When you want simplicity to strongly influence selection
- **Smaller EPS (1e-6):** When every performance difference matters
- **Default (1e-4):** Balanced - ties are meaningful but not overly common

---

## LOAD_PERCENT - Fraction of Clients That Get the Loaded Genome

**Default:** `0.5`  
**Type:** `number` (0 to 1; not validated)  
**Location:** `INeatParams.LOAD_PERCENT`, `DEFAULT_PARAMS.LOAD_PERCENT` (`src/neat/neat.ts`)

### Purpose

LOAD_PERCENT is used only when you pass `loadData` (`{ genome, evolveCounts }`) to the constructor. It sets which fraction of the population starts from the loaded genome.

### How It's Used

**In loading** (`Neat.load()`, called by the constructor):

- Client `i` gets its own copy of the loaded genome when `i / clients < LOAD_PERCENT`. The other clients start with empty genomes (inputs and outputs, no connections)
- `LOAD_PERCENT: 0` loads no client. The population registry still gets the nodes and connections of the model
- With a population of 1, the only client is loaded for each `LOAD_PERCENT > 0`

See [Save and load a model](../../README.md#save-and-load-a-model) in the README.

### Code References

- **Definition:** `INeatParams`, `DEFAULT_PARAMS`, `Neat` constructor
- **Usage:** `Neat.load()`

### Tuning Recommendations

- **High values (close to 1):** Continue the evolution of the saved model with little diversity
- **Low values:** Use the model as a seed; most clients explore from empty genomes
- **Default (0.5):** Half of the population starts from the model

---

## Parameter Interaction Summary

These parameters work together to control optimization behavior:

### Complexity Control

```
LAMBDA_LOW (exploration) → LAMBDA_HIGH (optimization) → EPS (tie-breaking)
    0.1                         0.3                      1e-4

Flow: Light penalty → Strong penalty → Final selection by simplicity if tied
```

### Optimization Trigger

```
client.error < OPT_ERR_THRESHOLD (0.005)  → Self-optimization of that client
OPTIMIZATION_PERIOD (100)                 → Periodic global optimization phases

When a client is optimizing:
- Remove disabled and dead connections
- Freeze topology (no new connections/nodes unless network is small)

In the global phase also:
- Use LAMBDA_HIGH for complexity penalty
```

### Protection

```
PERMANENT_MAIN_CONNECTIONS → Protects input-output connections

Ensures networks don't evolve to complete disconnection
```
