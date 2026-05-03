## 2025-05-18 - Avoid Array.from with TypedArrays in real-time processing
**Learning:** In performance-critical paths like real-time audio chunking, using `Array.from` on a `TypedArray` to pass to `String.fromCharCode.apply` creates unnecessary heap allocations and garbage collection overhead.
**Action:** Pass the `TypedArray` directly. In TypeScript, to satisfy the signature of `.apply` which expects `number[]`, cast the typed array like `bytes.subarray(...) as unknown as number[]`.
