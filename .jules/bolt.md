## 2024-10-24 - Avoid Array.from in Audio Processing Hot Paths
**Learning:** Using `Array.from` on a TypedArray in a high-frequency real-time `onaudioprocess` handler creates massive, unnecessary heap allocations, causing frequent garbage collection and potential frame drops.
**Action:** When passing a TypedArray to `String.fromCharCode.apply()`, bypass the array copy by casting it directly via `as unknown as number[]` to satisfy the TypeScript compiler without incurring a runtime cost.
