# Changelog

This file lists the changes of `@leoni4/neat-js` from 1.3.1. For earlier releases, see the git tags `v1.0.1` to `v1.3.0`.

## 1.3.1 - 2026-11-25

### Performance

- `RandomHashSet` keeps a `Map` from innovation number to gene next to its array. `contains()` and `add()` are O(1) instead of O(n).
- `RandomHashSet.addSorted()` appends in O(1) when the innovation number is not lower than any innovation number added since the last `clear()`. Other inserts scan for the position, as in 1.3.0.
- Thus it takes O(n) instead of O(n²) to build a set of n genes, for example the node registry, or a genome when a large saved genome is loaded. In `npm run bench` (50,000 genes), `add()` is about 400x faster and `addSorted()` about 700x faster than in 1.3.0. A load of a saved genome with 5,000 nodes and 50,000 connections took 6.4 s with 1.3.0 and takes 49 ms with 1.3.1 (same machine).
- `Genome.crossOver()` and `Neat.emptyGenome()` now add genes through the set methods, so that the index has all genes.

### Compatibility

- No change of results. With the same seed, the genomes, the outputs, the `model()` JSON, and the `genome.save()` JSON are the same as in 1.3.0. The number and the order of random draws do not change. The new golden test G8 (300 seeded generations with a save and load) was recorded with 1.3.0 and checks this.
- `RandomHashSet.data` is now documented as read-only. Change a set only with its methods. A direct change of the array (for example `set.data.push(gene)`) bypasses the index, and then `contains()` and `addSorted()` can give wrong results.
- `JSON.stringify()` of a `RandomHashSet` object itself now also contains the internal fields `_index` and `_maxInnovation`. The output of `genome.save()`, `model()`, and `randomState()` does not change.
