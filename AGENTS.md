Always use ASD-STE100 Simplified Technical English (STE) when describing anything to the user.

# AGENTS.md

This file is the entry point to the `@leoni4/neat-js` repository instructions.

It is written for AI agents and human contributors.

`@leoni4/neat-js` is a TypeScript implementation of NEAT (NeuroEvolution of Augmenting Topologies).

The library is a reusable public package. Correct algorithm behaviour, stable public APIs, reproducibility, and performance are more important than adding features quickly.

## Core priorities

When working in this repository, use this priority order:

1. Preserve algorithm correctness.
2. Preserve public API compatibility unless a breaking change is explicitly requested.
3. Preserve deterministic and reproducible behaviour where the existing API supports it.
4. Preserve serialization and persisted-model compatibility when practical.
5. Keep runtime performance suitable for large evolutionary populations.
6. Keep the implementation understandable and maintainable.

Do not improve one of these areas by silently breaking another.

# Repository source of truth

Use the repository as the source of truth.

Before making assumptions, inspect:

- `package.json`;
- the lockfile;
- `README.md`;
- source code;
- tests;
- build configuration;
- exported types;
- existing examples;
- the nearest `AGENTS.md`, if one exists.

Do not rely on remembered package behaviour when the repository can answer the question.

Do not assume a dependency version from documentation text. Read the installed or declared version.

# General guidelines

- Use the package manager defined by the repository.
- Use existing `package.json` scripts instead of inventing equivalent commands.
- Make the smallest change that fully solves the requested task.
- Do not refactor unrelated code.
- Do not introduce a dependency when the current stack can solve the problem reasonably well.
- Do not change algorithm parameters as incidental cleanup.
- Do not change public behaviour during a formatting, typing, documentation, or performance-only task.
- Prefer extending existing abstractions over creating parallel implementations.
- Do not modify generated build output manually when a source file can be changed instead.

# Public library contract

This is a public reusable library.

Treat the following as part of the compatibility surface when they are publicly exposed:

- exported functions;
- exported classes;
- exported types and interfaces;
- constructor parameters;
- method parameters;
- return values;
- configuration objects;
- enum or string values;
- default values;
- package entry points;
- serialization formats;
- documented runtime behaviour.

Before changing a public symbol, search for:

- its declaration;
- all internal usages;
- tests;
- README examples;
- exported entry points;
- compatibility aliases;
- serialization code.

Do not remove, rename, or change a public API only because another API looks cleaner.

If a breaking change is required, make the break explicit.

Do not hide a breaking change inside a refactor.

# Semantic versioning

Treat semantic versioning as part of the package contract.

A change can require a major version when it intentionally breaks supported public behaviour.

A change can require a minor version when it adds backward-compatible functionality.

A compatible bug fix can normally use a patch version.

Do not change the package version unless the user asks for a release or version change.

Do not infer the required release version without first identifying the compatibility effect of the change.

# NEAT algorithm invariants

Changes to NEAT internals can have large behavioural effects even when the code diff is small.

Treat the following areas as algorithm-sensitive:

- genome structure;
- node genes;
- connection genes;
- innovation identifiers;
- enabled and disabled connections;
- topology mutation;
- weight mutation;
- node mutation;
- connection mutation;
- crossover;
- gene alignment;
- compatibility distance;
- speciation;
- species assignment;
- fitness handling;
- parent selection;
- offspring allocation;
- survival rules;
- stagnation handling;
- population replacement;
- network construction;
- network activation;
- recurrent or cyclic behaviour, if supported;
- topology simplification;
- topology complexification.

Do not change one of these behaviours as incidental cleanup.

If a task intentionally changes algorithm semantics:

1. Identify the old behaviour.
2. Identify the new behaviour.
3. Explain why the change is required.
4. Update or add focused tests.
5. Check whether the change affects serialization or public APIs.
6. Check whether README documentation or examples must change.

# Innovation identifiers

Innovation identifiers are part of NEAT structural matching.

Do not change innovation-number creation or reuse rules without checking:

- crossover;
- compatibility distance;
- duplicate connection detection;
- mutation;
- serialization;
- restored genomes;
- population-wide innovation tracking.

A local implementation simplification must not create incompatible innovation identities.

# Topology mutations

Topology mutations must preserve valid network structure according to the existing library rules.

When changing connection or node mutation logic, verify:

- duplicate connections;
- self-connections, if relevant;
- recurrent connections, if relevant;
- disabled connections;
- re-enabled connections;
- input and output node constraints;
- connection direction;
- innovation tracking;
- topology validation;
- serialization;
- crossover compatibility.

Do not silently introduce a topology restriction unless the requested feature requires it.

Do not silently remove an existing topology restriction.

# Permanent or protected connections

If the library supports permanent, protected, mandatory, or non-removable connections, treat that property as part of mutation semantics.

Verify how it affects:

- connection deletion;
- node deletion;
- topology simplification;
- crossover;
- cloning;
- serialization;
- restored genomes.

A connection that is protected from deletion must not become removable through another indirect mutation path unless that behaviour is explicitly intended.

# Crossover

Crossover must preserve the intended NEAT gene-alignment rules.

When changing crossover, verify:

- matching genes;
- disjoint genes;
- excess genes;
- disabled-gene handling;
- fitter-parent rules;
- equal-fitness rules;
- node dependencies;
- connection dependencies;
- innovation identifiers.

Do not optimize crossover by changing its selection semantics unless that is the requested experiment or feature.

# Speciation

Speciation is an algorithmic behaviour, not only an implementation detail.

When changing species logic, verify:

- compatibility-distance inputs;
- compatibility thresholds;
- representative selection;
- species reassignment;
- empty species handling;
- stagnation rules;
- fitness sharing or normalization, if used;
- offspring allocation.

A performance optimization must produce equivalent species behaviour unless the user explicitly requests new semantics.

# Evolution configuration

Configuration values can materially change evolution behaviour.

Do not silently change:

- mutation probabilities;
- compatibility coefficients;
- compatibility thresholds;
- population defaults;
- survival settings;
- elitism;
- stagnation limits;
- weight ranges;
- topology limits;
- activation defaults;
- initialization behaviour.

If a default changes, treat it as a public behaviour change.

Update tests and documentation when appropriate.

# Randomness and reproducibility

Evolutionary algorithms depend heavily on random-number generation.

If the repository supports seeded randomness or an injected RNG:

- use the existing RNG path;
- do not bypass it with direct `Math.random()` calls;
- keep random-number consumption predictable when practical;
- include the RNG dependency in new algorithmic code.

Do not claim deterministic behaviour unless it is tested or otherwise verified.

Be aware that changing the number or order of random draws can change evolutionary results even when mathematical logic appears equivalent.

# Fitness

Fitness is caller-defined unless the library explicitly provides a higher-level fitness abstraction.

Do not assume:

- larger is always better unless the API defines it;
- fitness is normalized;
- fitness is bounded;
- fitness is positive;
- fitness has a specific economic or statistical meaning.

Preserve existing direction and comparison semantics.

Do not add hidden transformations to user-provided fitness values.

# Genome and network separation

Keep genome representation and executable-network behaviour conceptually separate when the existing architecture does so.

Do not duplicate the same transformation logic in several places.

Prefer one canonical path from genotype to executable phenotype.

If network construction changes, verify that genome semantics did not change accidentally.

# Serialization and cloning

Genome serialization can be used to save evolved models between processes or versions.

When changing serialized structures:

- inspect current serialization and deserialization code;
- preserve existing fields when practical;
- preserve optional-field semantics;
- verify cloning behaviour;
- verify restored genomes behave like the original genomes;
- test round trips.

Do not claim backward compatibility without testing or inspecting the old schema.

If compatibility cannot be preserved, make the incompatibility explicit.

# Numerical behaviour

Neural-network and evolutionary code can be sensitive to numeric changes.

Be careful when changing:

- weight initialization;
- weight mutation;
- activation functions;
- clamping;
- normalization;
- floating-point comparisons;
- compatibility-distance calculations.

Do not add arbitrary clamps, epsilons, rounding, or normalization only to hide a failing test.

Handle `NaN` or infinite values according to the established library policy.

If no policy exists and a task requires one, make the decision explicit.

# Performance

Performance matters because callers can evolve hundreds or thousands of genomes for many generations.

Before adding work inside a hot path, determine how often it runs.

Pay special attention to:

- per-genome loops;
- per-connection loops;
- pairwise genome comparisons;
- species assignment;
- crossover;
- mutation;
- network activation;
- cloning;
- serialization.

Avoid unnecessary allocations in hot loops.

Reuse calculated values when correctness permits.

Do not introduce an accidental `O(n²)` operation where a simpler approach is available.

Do not sacrifice algorithm correctness for speed.

When adding a cache, ensure its key and invalidation rules contain everything that can affect the result.

# TypeScript

TypeScript correctness is mandatory.

Respect the repository compiler configuration.

Do not weaken type safety only to make a change compile.

Avoid:

- unnecessary `any`;
- broad type assertions;
- ignored TypeScript errors;
- duplicated public types;
- unsafe non-null assertions.

Use explicit narrowing when values can be `null` or `undefined`.

Use named interfaces or types for meaningful public domain structures.

For function parameters:

- one required value can be passed directly;
- two or three simple required values can use positional parameters;
- many values or optional values should normally use a named parameter object.

Follow the established local API when compatibility is more important than this general rule.

# Exports

When adding or changing a public API, verify the complete export path.

A symbol can exist in the source tree but still not be part of the package API.

Check:

- local module exports;
- barrel exports;
- package entry points;
- generated declarations;
- package `exports`, when present.

Do not expose internal implementation types accidentally.

Do not remove an export as cleanup without checking compatibility.

# Tests

Tests for algorithmic code must verify behaviour, not only implementation details.

Prefer focused deterministic tests where practical.

Important test areas include:

- mutation;
- crossover;
- speciation;
- innovation tracking;
- network construction;
- network evaluation;
- serialization round trips;
- cloning;
- public configuration defaults;
- regression cases.

When fixing a bug, add a regression test when the failure can be reproduced reliably.

Do not replace a meaningful behavioural assertion with a weaker assertion only to make a test pass.

# Documentation

README examples are part of the user experience and can effectively become part of the API contract.

When a public API changes, check:

- README usage;
- API examples;
- configuration examples;
- migration notes, if present;
- comments describing defaults.

Do not document behaviour that was not verified.

Keep examples simple and executable when practical.

# Comments

Prefer self-explanatory code.

Use comments when they preserve information that the code cannot express clearly.

Useful comments can explain:

- an algorithm invariant;
- a compatibility constraint;
- why a mutation path is intentionally restricted;
- why random-number ordering matters;
- why serialization keeps a legacy field;
- why an apparently simpler algorithm is incorrect.

Do not add comments that only restate the code.

Remove or update stale comments.

# Dependencies

Do not add a dependency when a small implementation with the current stack is sufficient.

Before updating a dependency:

1. Confirm that the task requires the update.
2. Check public API or runtime effects.
3. Update the lockfile through the package manager.
4. Run relevant validation.

Do not update unrelated dependency versions.

# Generated files and build output

Do not manually edit compiled or generated output when source code is available.

Examples can include:

- `dist/`;
- generated declaration files;
- bundled JavaScript;
- coverage output.

Change the source of truth.

Generate derived files only when the repository workflow requires it.

Do not include unrelated generated changes.

# Git

Unless the user explicitly asks for the specific operation, do not:

- commit;
- stage files;
- push;
- merge;
- rebase;
- force-push;
- create tags;
- create releases;
- publish packages;
- modify remote branches.

Read-only Git commands are allowed.

Treat existing uncommitted changes as user-owned work.

Never discard unrelated user changes.

Do not use destructive Git commands to solve an implementation problem.

# Package publishing

Publishing changes external state.

Do not run:

- `npm publish`;
- `npm version`;
- Git tag creation;
- GitHub release creation;

unless the user explicitly asks for that operation.

Before a requested release:

1. Inspect the current version.
2. Identify whether the change is breaking, additive, or a fix.
3. Run the repository's release or prepublish validation.
4. Verify the package build.
5. Verify intended files are included in the package.
6. Report failures before publishing.

Never claim a package was published unless the command completed successfully.

# Change discipline

Make the smallest change that fully solves the requested task.

Do not:

- refactor unrelated code;
- rename unrelated symbols;
- change algorithm defaults as cleanup;
- change public APIs without need;
- combine an algorithm experiment with infrastructure cleanup;
- replace established architecture because another style looks cleaner;
- perform broad formatting;
- introduce speculative abstractions.

If unrelated problems are discovered, report them separately.

# Reuse before creating

Before adding a new:

- class;
- type;
- helper;
- mutation abstraction;
- genome utility;
- network utility;
- serialization layer;
- configuration layer;

search for the same concept and related names.

Prefer one source of truth.

A new abstraction must solve an actual current problem.

Do not add architectural layers for possible future use.

# Verification

Before declaring a task complete:

1. Review the diff.
2. Check for unrelated changes.
3. Run the smallest relevant tests.
4. Run TypeScript validation when relevant.
5. Run lint when relevant.
6. Run the package build when package output is affected.
7. Run broader tests when the change affects shared algorithm behaviour.
8. State what was verified.
9. State what was not verified.
10. Do not claim success for a command that did not complete successfully.

For algorithm changes, focused tests are necessary but can be insufficient.

Consider whether the change can affect:

- mutation;
- crossover;
- speciation;
- serialization;
- network execution;
- deterministic behaviour.

# Error handling

When a change causes an error:

1. Stop expanding the scope.
2. Determine whether the current change caused it.
3. Find the smallest root cause.
4. Make the smallest correction.
5. Re-run the relevant validation.

Do not respond to a local error with a broad refactor.

Do not suppress errors only to make validation pass.

# Working on a task

Before making a change:

1. Read the applicable repository instructions.
2. Inspect the relevant source code.
3. Read related tests.
4. Search for existing implementations and usages.
5. Identify whether the task changes public API or algorithm semantics.
6. Identify serialization or compatibility impact when relevant.
7. Make the smallest complete change.
8. Run relevant validation.
9. Report anything that remains unverified.

More specific nested `AGENTS.md` files can add or refine rules for their directory.

They must not silently weaken repository-wide compatibility or correctness requirements.
