/**
 * Constants used throughout the NEAT algorithm implementation.
 * These values control various aspects of network topology and evolution.
 */

/**
 * Network topology constants
 */
export const NETWORK_CONSTANTS = {
    /** X-coordinate for input nodes */
    INPUT_NODE_X: 0.01,
    /** X-coordinate for output nodes */
    OUTPUT_NODE_X: 0.99,
    /** Minimum Y-coordinate for nodes */
    NODE_Y_MIN: 0.1,
    /** Maximum Y-coordinate for nodes */
    NODE_Y_MAX: 0.9,
    /** Y-coordinate variation range for new nodes */
    NODE_Y_VARIATION: 0.6,
    /** X-coordinate threshold for input node detection */
    INPUT_THRESHOLD_X: 0.01,
    /** X-coordinate threshold for output node detection */
    OUTPUT_THRESHOLD_X: 0.99,
    /**
     * Minimum X-coordinate for middle nodes during mutation.
     * This prevents nodes from being created too close to the input layer.
     * Note: There is intentionally NO MAX_MIDDLE_X constraint.
     *
     * Design Decision: Middle nodes can be created anywhere between MIN_MIDDLE_X
     * and the output layer (up to ~0.99). This allows the network maximum flexibility
     * to evolve complex topologies. The midpoint calculation (from.x + to.x) / 2
     * naturally prevents nodes from being placed exactly at layer boundaries.
     *
     * Rationale:
     * - Prevents structural issues near input layer (x approaching 0)
     * - Allows deep networks with nodes close to output layer
     * - Natural midpoint calculation provides sufficient distribution
     * - No need for artificial upper bound that could limit evolution
     */
    MIN_MIDDLE_X: 0.1,
} as const;

/**
 * Crossover and mutation constants
 */
export const MUTATION_CONSTANTS = {
    /** Probability threshold for gene selection during crossover */
    CROSSOVER_GENE_SELECTION_THRESHOLD: 0.4,
} as const;

/**
 * Default configuration ratios
 */
export const CONFIG_CONSTANTS = {
    /** Default CP (compatibility threshold) ratio relative to population size */
    DEFAULT_CP_RATIO: 0.1,
    /** Minimum CP value */
    MIN_CP: 1,
} as const;
