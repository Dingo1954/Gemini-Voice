
## 2023-10-25 - Avoid Array.from in Audio hot-paths
**Learning:** Using `Array.from` on TypedArrays in high-frequency events like `onaudioprocess` creates unnecessary heap allocations, leading to Garbage Collection (GC) pressure and potential audio stutters.
**Action:** Cast the TypedArray segment directly (e.g., `bytes.subarray(i, i + chunkSize) as unknown as number[]`) when passing it to `String.fromCharCode.apply` to eliminate the allocation overhead.
