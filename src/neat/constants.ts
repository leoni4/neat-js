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
    /** Minimum X-coordinate for middle nodes during mutation */
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
