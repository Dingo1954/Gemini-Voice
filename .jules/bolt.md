## 2024-03-24 - [Avoid Array.from when converting Audio Buffers]
**Learning:** In hot loops like `onaudioprocess` (running multiple times per second), using `Array.from()` to convert `Uint8Array` to a regular array before passing to `String.fromCharCode.apply` creates significant unnecessary garbage collection pressure and heap allocations.
**Action:** Pass `TypedArray.subarray()` directly to `String.fromCharCode.apply()` using `as unknown as number[]` to satisfy TypeScript. The underlying JS engine handles the TypedArray directly, resulting in zero extra heap allocation overhead per chunk.
