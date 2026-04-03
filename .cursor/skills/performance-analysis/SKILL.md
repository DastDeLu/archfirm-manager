---
name: performance-analysis
description: Finds performance bottlenecks using measurement-first workflows, then proposes targeted optimizations for CPU, latency, rendering, and memory. Use when the user reports slowness, jank, high memory use, large bundles, slow APIs, or asks for profiling, performance review, or optimization.
---

# Performance analysis

## Default stance

1. **Measure before changing**: reproduce the symptom, establish a baseline (timing, frame rate, heap, network waterfall, bundle stats). Avoid “speed-ups” justified only by intuition.
2. **Target the dominant cost**: fix what the profile or metrics show is actually expensive; ignore noise until the main bucket is addressed.
3. **Preserve behavior and clarity**: faster code that breaks correctness or massively hurts readability needs a justified trade-off; note migration or risk when suggesting caching or denormalization.
4. **Match the stack**: use tools and patterns native to the project (e.g. React + Vite vs. Node services vs. Python); align with existing build and runtime constraints.

## Workflow

1. **Characterize**: user-facing (UI jank, TTI), server (p95 latency, throughput), build (bundle size), or memory growth/leaks.
2. **Reproduce**: minimal path, dataset size, device/network class if relevant.
3. **Instrument**: one layer at a time (JS main thread, network, server, DB, disk).
4. **Hypothesis → change → verify**: smallest change that attacks the measured hotspot; compare before/after with the same inputs.
5. **Document**: what was slow, what changed, how to re-measure, and any operational caveats (cache TTL, stale data).

## Common bottleneck signatures

| Signal | Often implicates |
|--------|-------------------|
| Long tasks / dropped frames | Main-thread JS, layout thrashing, heavy sync work, large lists without virtualization |
| Slow TTI / large JS transfer | Bundle size, missing code-splitting, heavy dependencies, sync third-party scripts |
| Many re-renders / profiler noise | Unstable props, context churn, derived state recompute, missing memoization **where proven** |
| Growing RAM over time | Retained listeners, caches without bounds, closures holding large graphs, leaked DOM/subscription |
| Slow “first byte” or DB time | N+1 queries, missing indexes, cold pools, lock contention, oversized responses |
| High CPU on server hot path | Algorithmic complexity, serialization, regex/string churn, unnecessary work per request |

## Tooling (pick what fits the codebase)

**Browser / frontend**

- Performance panel / recorder: long tasks, scripting vs. layout vs. paint.
- React DevTools Profiler (React apps): commit duration, avoid indiscriminate `memo`; fix root causes (state colocation, stable callbacks).
- Lighthouse or Web Vitals when the issue is page load or CWV—not the only metric for SPA in-app slowness.
- Network: payload size, sequential waterfalls, caching headers.

**Node / backend JS**

- `--inspect` / Chrome CPU profiling for hot JS; `clinic.js`, `0x`, or built-in logging for flame-shaped investigations when already in use.
- APM or structured timing logs around I/O boundaries if present.

**Python**

- `cProfile` / `py-spy` for CPU; `tracemalloc`, `memory_profiler`, or heap dumps for memory; line_profiler when a function is suspect.

**Data stores**

- Query plans, index usage, batching vs. chatty calls; measure round-trips and payload size.

## Memory vs execution speed

- **Speed**: reduce work (skip redundant computation), move work off critical path (async, workers when appropriate), better algorithms, batch I/O, cache **with invalidation story**.
- **Memory**: bounded caches, stream large payloads, release references (listeners, timers), avoid accidental global retention; fix leaks before tweaking GC “hints.”

## What to deliver in recommendations

1. **Evidence**: what was measured and how (tool + scenario).
2. **Primary bottleneck**: one labeled hotspot or constraint.
3. **Options**: 1–3 concrete approaches with trade-offs (complexity, staleness, operational cost).
4. **Verification**: how to re-run the same measurement; thresholds or budgets if the team uses them.

## Anti-patterns

- Premature micro-optimization without profiling.
- Blanket `useMemo`/`React.memo` or premature `useCallback` without profiler proof.
- Caching without TTL/invalidation or cache stampedes.
- Benchmarks that don’t mirror production data size, concurrency, or build mode.
- “Rewrite in X” as first suggestion when a profiled 20-line fix would suffice.

## Additional resources

For deep dives (allocators, kernel, distributed tracing), add focused reading only when the bottleneck spans systems; keep the main thread of work on the project’s measurable path.

