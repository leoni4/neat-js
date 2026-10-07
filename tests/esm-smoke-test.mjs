/* eslint-disable no-undef */
/**
 * ESM Smoke Test
 * Verifies that the package can be imported and used in a Node.js ESM environment
 * This catches issues with missing .js extensions in relative imports
 */

import {
    Neat,
    Client,
    Species,
    Genome,
    NodeGene,
    ConnectionGene,
    Calculator,
    Node,
    Connection,
    RandomHashSet,
    RandomSelector,
    EActivation,
    EMutationPressure,
} from '../dist/index.js';

console.log('✓ ESM imports successful');

// Test 1: Verify main exports are defined
const exports = {
    Neat,
    Client,
    Species,
    Genome,
    NodeGene,
    ConnectionGene,
    Calculator,
    Node,
    Connection,
    RandomHashSet,
    RandomSelector,
    EActivation,
    EMutationPressure,
};

for (const [name, value] of Object.entries(exports)) {
    if (value === undefined) {
        console.error(`✗ Export '${name}' is undefined`);
        process.exit(1);
    }
}

console.log('✓ All exports are defined');

// Test 2: Basic instantiation test - Create a NEAT instance
try {
    const neat = new Neat(2, 1, 100);
    if (!neat) {
        throw new Error('Neat instance is falsy');
    }
    console.log('✓ Neat instance created successfully');
} catch (error) {
    console.error('✗ Failed to create Neat instance:', error.message);
    process.exit(1);
}

// Test 3: Test RandomHashSet
try {
    const set = new RandomHashSet();
    // RandomHashSet expects objects with innovationNumber property
    const gene1 = new NodeGene(1);
    const gene2 = new NodeGene(2);
    set.add(gene1);
    set.add(gene2);
    if (set.size() !== 2) {
        throw new Error(`Expected size 2, got ${set.size()}`);
    }
    // Test contains method
    if (!set.contains(gene1)) {
        throw new Error('contains() should return true for added gene');
    }
    console.log('✓ RandomHashSet works correctly');
} catch (error) {
    console.error('✗ RandomHashSet test failed:', error.message);
    process.exit(1);
}

// Test 4: Test RandomSelector
try {
    const selector = new RandomSelector(1);
    const first = { id: 1, score: 1 };
    const second = { id: 2, score: 2 };
    selector.add(first);
    selector.add(second);
    if (selector.totalScore !== 3) {
        throw new Error(`Expected totalScore 3, got ${selector.totalScore}`);
    }
    const selected = selector.random();
    if (selected !== first && selected !== second) {
        throw new Error('RandomSelector.random() did not return an added object');
    }
    console.log('✓ RandomSelector works correctly');
} catch (error) {
    console.error('✗ RandomSelector test failed:', error.message);
    process.exit(1);
}

// Test 5: Test EActivation enum
try {
    if (typeof EActivation.linear !== 'string') {
        throw new Error('EActivation.linear is not a string');
    }
    if (typeof EActivation.sigmoid !== 'string') {
        throw new Error('EActivation.sigmoid is not a string');
    }
    if (EActivation.linear !== 'linear') {
        throw new Error('EActivation.linear should equal "linear"');
    }
    console.log('✓ EActivation enum is accessible');
} catch (error) {
    console.error('✗ EActivation enum test failed:', error.message);
    process.exit(1);
}

// Test 6: Test EMutationPressure enum
try {
    if (EMutationPressure.NORMAL !== 'NORMAL') {
        throw new Error('EMutationPressure.NORMAL should equal "NORMAL"');
    }
    console.log('✓ EMutationPressure enum is accessible');
} catch (error) {
    console.error('✗ EMutationPressure enum test failed:', error.message);
    process.exit(1);
}

console.log('\n✅ All ESM smoke tests passed!');
console.log('The package can be successfully imported and used in Node.js ESM environment.');
