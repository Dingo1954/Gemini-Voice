## 2024-07-05 - Bolt Started
## 2025-02-27 - Fast Base64 TypedArray conversion
**Learning:** Using `Array.from` on a TypedArray in a high-frequency real-time loop (like audio processing) causes significant unnecessary heap allocations and garbage collection overhead.
**Action:** Pass TypedArrays directly to `String.fromCharCode.apply` by casting them as `(bytes.subarray(...) as unknown as number[])` to satisfy TypeScript without the runtime cost.
