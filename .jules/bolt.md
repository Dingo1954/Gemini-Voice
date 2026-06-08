## 2026-06-08 - Avoid Array.from in Hot Audio Loops
**Learning:** Using `Array.from()` to convert typed arrays in performance-critical code paths like real-time audio processing creates unnecessary array allocations that cause heap churn and GC pauses.
**Action:** Pass TypedArrays directly to `String.fromCharCode.apply` using `(typedArray as unknown as number[])` to satisfy the TypeScript compiler while avoiding heap allocations.
