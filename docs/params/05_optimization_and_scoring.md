# Optimization and Scoring Parameters

## OPT_ERR_THRESHOLD - Optimization Error Threshold

**Default:** `0.01`  
**Type:** `number` (typically 0.001-0.1)  
**Location:** `src/neat/neat.ts:141`

### Purpose

OPT_ERR_THRESHOLD determines when a genome enters "self-optimization" mode. When a client's error drops below this threshold, it starts optimizing by removing disabled connections and being more conservative with structural mutations.

### How It's Used

**In genome initialization** (`src/genome/genome.ts:31-34`):

```typescript
constructor(neat: Neat) {
    this.#neat = neat;
    this.#optErrThreshold = neat.OPT_ERR_THRESHOLD;
}
```

**In client mutation decision** (`src/client/client.ts:96-101`):

```typescript
mutate(force = false) {
    if (this.bestScore && !force) {
        return;
    }
    this.genome.mutate(this.error < this.genome.optErrThreshold && !force);
}
```

**In genome mutation** (`src/genome/genome.ts:527-577`):

```typescript
mutate(selfOpt = false) {
    this.#selfOpt = selfOpt;
    const optimize = this.#selfOpt || this.#neat.optimization;

    if (optimize) {
        this.#optimization();  // Remove disabled connections
    }

    // Structural mutations only allowed if NOT optimizing OR network is small
    if ((!selfOpt && !this.#neat.optimization) || this.#connections.size() < this.#neat.CT) {
        // Add connections and nodes
    }

    // Weight mutations still allowed during optimization
}
```

**Optimization removes disabled connections** (`src/genome/genome.ts:489-497`):

```typescript
#optimization(start = 0) {
    for (let i = start; i < this.#connections.size(); i += 1) {
        const c = this.#connections.get(i);
        if (!(c instanceof ConnectionGene)) continue;
        if (!c.enabled) {
            this.removeConnection(c);
            return;
        }
    }
}
```

### Code References

- **Definition:** `src/neat/neat.ts:66` (interface), `src/neat/neat.ts:141` (initialization)
- **Getter:** `src/neat/neat.ts:325-327`
- **Usage:** `src/genome/genome.ts:31-34` (stored per genome), `src/client/client.ts:96-101` (mutation decision), `src/genome/genome.ts:527-577` (optimization behavior)

### Behavior When Error < OPT_ERR_THRESHOLD

- **Disabled connections are removed** - Network is simplified
- **No new connections or nodes added** - Topology is frozen (unless network is very small, < CT)
- **Weight mutations continue** - Fine-tuning still happens
- **Toggle mutations behave differently** - Can enable disabled connections but cannot disable enabled ones

### Tuning Recommendations

- **Higher values (>0.05):** Earlier optimization, faster convergence, risk of premature simplification
- **Lower values (<0.005):** Later optimization, more exploration, network may stay complex
- **Default (0.01):** Balanced - optimize when performance is good
- **Interpretation:** If your fitness metric produces errors in range [0, 1], optimize when error < 1%
- **Problem-specific:** Adjust based on your error scale:
  - For MSE on normalized data: 0.01-0.05 reasonable
  - For classification accuracy: depends on encoding
  - For game scores: scale accordingly

---

## PERMANENT_MAIN_CONNECTIONS - Protect Input-Output Connections

**Default:** `false`  
**Type:** `boolean`  
**Location:** `src/neat/neat.ts:126`

### Purpose

When enabled, prevents the removal of direct connections from input nodes to output nodes. This ensures the network always maintains at least basic connectivity from inputs to outputs.

### How It's Used

**In connection removal** (`src/genome/genome.ts:273-280`):

```typescript
removeConnection(con: ConnectionGene, replace = false, down = true, up = true) {
    if (
        this.#neat.PERMANENT_MAIN_CONNECTIONS &&
        con.from.x === NETWORK_CONSTANTS.INPUT_NODE_X &&
        con.to.x === NETWORK_CONSTANTS.OUTPUT_NODE_X
    ) {
        return;  // Skip removal, connection is protected
    }
    this.#connections.remove(con);
    // ... rest of removal logic
}
```

**Constants used** (`src/neat/constants.ts:8-11`):

```typescript
export const NETWORK_CONSTANTS = {
  INPUT_NODE_X: 0.01,
  OUTPUT_NODE_X: 0.99,
  // ...
};
```

### Code References

- **Definition:** `src/neat/neat.ts:67` (interface), `src/neat/neat.ts:126` (initialization)
- **Getter:** `src/neat/neat.ts:321-323`
- **Usage:** `src/genome/genome.ts:273-280` (connection removal protection)
- **Tests:** `tests/genome/genome.remove-connection.test.ts:93-154`

### When Connections Are Removed

Connections can be removed in several scenarios:

1. **During node mutation** - Original connection is disabled and potentially removed
2. **During optimization** - Disabled connections are cleaned up
3. **When a node becomes isolated** - Cascade removal of orphaned connections

### Tuning Recommendations

- **true:**
  - Guarantees minimum connectivity
  - Good for problems requiring all inputs to directly influence outputs
  - Prevents network from becoming disconnected during evolution
  - May limit exploration of complex topologies
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
**Location:** `src/neat/neat.ts:143`

### Purpose

LAMBDA_HIGH controls how strongly network complexity is penalized when selecting the best genomes during optimization phases. Higher values favor simpler networks.

### How It's Used

**In score normalization** (`src/neat/neat.ts:689-722`):

```typescript
#normalizeScore() {
    // Calculate raw score range and complexity range
    let rawMax = -Infinity, rawMin = Infinity;
    let cMax = -Infinity, cMin = Infinity;

    for (const cl of this.#clients) {
        cl.scoreRaw = cl.score;
        rawMax = Math.max(rawMax, cl.scoreRaw);
        rawMin = Math.min(rawMin, cl.scoreRaw);

        const c = cl.genome.connections.size() + cl.genome.nodes.size();
        cl.complexity = c;
        cMax = Math.max(cMax, c);
        cMin = Math.min(cMin, c);
    }

    const span = rawMax - rawMin || 1;
    const cSpan = cMax - cMin || 1;

    // Choose lambda based on optimization mode
    const lambda = this.#optimization ? this.#LAMBDA_HIGH : this.#LAMBDA_LOW;

    // Apply complexity penalty
    for (const cl of this.#clients) {
        const cNorm = (cl.complexity - cMin) / cSpan;
        const penalty = lambda * cNorm * span;
        cl.adjustedScore = cl.scoreRaw - penalty;
    }

    // Normalize adjusted scores to [0, 1]
    let adjMax = -Infinity, adjMin = Infinity;
    for (const cl of this.#clients) {
        adjMax = Math.max(adjMax, cl.adjustedScore);
        adjMin = Math.min(adjMin, cl.adjustedScore);
    }
    const adjSpan = adjMax - adjMin || 1;

    for (const cl of this.#clients) {
        cl.score = (cl.adjustedScore - adjMin) / adjSpan;
    }
}
```

**The penalty formula:**

```
complexity_normalized = (complexity - min_complexity) / (max_complexity - min_complexity)
penalty = lambda * complexity_normalized * score_span
adjusted_score = raw_score - penalty
```

**When optimization mode is active** (`src/neat/neat.ts:627-629`):

```typescript
this.#optimization =
  optimization || this.#evolveCounts % this.#OPTIMIZATION_PERIOD === 0;
```

Optimization mode activates:

- Every 10 generations (OPTIMIZATION_PERIOD = 10)
- When explicitly requested via `evolve(true)`

### Code References

- **Definition:** `src/neat/neat.ts:68` (interface), `src/neat/neat.ts:143` (initialization)
- **Usage:** `src/neat/neat.ts:707` (score adjustment)
- **Validation:** `src/neat/neat.ts:257-266` (warns if > 0.8 or < 0)

### Tuning Recommendations

- **Higher values (>0.5):** Very strong simplicity bias, aggressive pruning, risk of oversimplification
- **Lower values (<0.2):** Weak simplicity bias, allows complex solutions, slower convergence
- **Default (0.3):** Moderate penalty - encourages simplicity without forcing it
- **Historical note:** Was 0.6 (too aggressive), reduced to 0.3 for better balance

### Example Impact

With rawMax=100, rawMin=80 (span=20), cMax=50, cMin=10 (cSpan=40):

**Client A:** rawScore=95, complexity=15

- cNorm = (15-10)/40 = 0.125
- penalty = 0.3 _ 0.125 _ 20 = 0.75
- adjusted = 95 - 0.75 = 94.25

**Client B:** rawScore=93, complexity=45

- cNorm = (45-10)/40 = 0.875
- penalty = 0.3 _ 0.875 _ 20 = 5.25
- adjusted = 93 - 5.25 = 87.75

Client A wins despite lower raw score due to simplicity.

---

## LAMBDA_LOW - Complexity Penalty During Exploration

**Default:** `0.1`  
**Type:** `number` (typically 0.05-0.3)  
**Location:** `src/neat/neat.ts:144`

### Purpose

LAMBDA_LOW controls complexity penalties during normal evolution (exploration phases). It's lower than LAMBDA_HIGH to encourage experimentation with more complex topologies.

### How It's Used

Uses the same formula as LAMBDA_HIGH but applied during non-optimization phases:

```typescript
const lambda = this.#optimization ? this.#LAMBDA_HIGH : this.#LAMBDA_LOW;
```

**Phases:**

- **Optimization (uses LAMBDA_HIGH):** Generations 10, 20, 30, ...
- **Exploration (uses LAMBDA_LOW):** Generations 1-9, 11-19, 21-29, ...

### Code References

- **Definition:** `src/neat/neat.ts:69` (interface), `src/neat/neat.ts:144` (initialization)
- **Usage:** `src/neat/neat.ts:707` (score adjustment)
- **Validation:** `src/neat/neat.ts:268-274` (warns if > 0.5 or < 0)

### Tuning Recommendations

- **Higher values (>0.3):** Less exploration, prefer simpler networks even during exploration
- **Lower values (<0.05):** Maximum exploration, complexity barely penalized
- **Default (0.1):** Light penalty - allows growth while preventing excessive bloat
- **Historical note:** Was 0.3 (too restrictive), reduced to 0.1 for better exploration
- **Relationship:** Should be significantly lower than LAMBDA_HIGH (typically 1/3 to 1/2)

### Example Impact

Same scenario as LAMBDA_HIGH example but with LAMBDA_LOW=0.1:

**Client B:** rawScore=93, complexity=45

- cNorm = (45-10)/40 = 0.875
- penalty = 0.1 _ 0.875 _ 20 = 1.75 (was 5.25 with LAMBDA_HIGH)
- adjusted = 93 - 1.75 = 91.25

Client B has a better chance during exploration phases.

---

## EPS - Tie-Breaking Epsilon

**Default:** `1e-4` (0.0001)  
**Type:** `number` (typically 1e-6 to 1e-3)  
**Location:** `src/neat/neat.ts:145`

### Purpose

EPS defines how close two scores must be to be considered "tied". When multiple genomes have nearly identical scores (within EPS), the simplest one is chosen as the best.

### How It's Used

**In best score selection** (`src/neat/neat.ts:724-737`):

```typescript
this.#clients.sort((a, b) => b.score - a.score);

const maxScore = Math.max(...this.#clients.map((c) => c.score));
const ties = this.#clients
  .map((c, i) => ({ c, i }))
  .filter(({ c }) => maxScore - c.score <= this.#EPS);

if (ties.length === 0) {
  this.#clients[0].bestScore = true;
} else if (ties.length === 1) {
  ties[0].c.bestScore = true;
} else {
  // Multiple tied genomes - choose simplest
  ties.sort((a, b) => a.c.complexity - b.c.complexity);
  ties[0].c.bestScore = true;
}
```

### Code References

- **Definition:** `src/neat/neat.ts:70` (interface), `src/neat/neat.ts:145` (initialization)
- **Usage:** `src/neat/neat.ts:726` (tie detection)
- **Validation:** `src/neat/neat.ts:276-281` (warns if outside 1e-6 to 1e-2)

### Tuning Recommendations

- **Higher values (>1e-3):** More genomes considered tied, stronger simplicity bias in selection
- **Lower values (<1e-6):** Fewer ties, score differences matter more, less simplicity bias
- **Default (1e-4):** After normalization to [0, 1], differences < 0.01% trigger tie-breaking
- **Historical note:** Was 1e-9 (too small, rarely triggered), increased to 1e-4 for meaningful tie-breaking

### Example Impact

**Scenario 1: EPS = 1e-4**

- Client A: score = 0.9500, complexity = 20
- Client B: score = 0.9499, complexity = 15
- Difference: 0.0001 = EPS → **TIE** → Choose B (simpler)

**Scenario 2: EPS = 1e-6**

- Same clients
- Difference: 0.0001 > 1e-6 → **NOT A TIE** → Choose A (higher score)

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
OPT_ERR_THRESHOLD → Self-optimization mode
OPTIMIZATION_PERIOD (10) → Periodic optimization phases

When error < 0.01 OR every 10 generations:
- Use LAMBDA_HIGH for complexity penalty
- Remove disabled connections
- Freeze topology (no new connections/nodes unless network is small)
```

### Protection

```
PERMANENT_MAIN_CONNECTIONS → Protects input-output connections

Ensures networks don't evolve to complete disconnection
```
