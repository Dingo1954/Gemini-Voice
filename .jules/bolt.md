
## 2024-11-20 - Fast Base64 Array Buffer to String Conversion
**Learning:** `Array.from` causes significant heap allocations (O(N)) when converting a `Uint8Array` to an array of numbers. Passing the `Uint8Array` directly to `String.fromCharCode.apply` works perfectly in JS, but TS needs `as unknown as number[]` to suppress type errors. Benchmarks show a 7x speedup (~3.4s down to ~0.48s for 10,000 iterations).
**Action:** Use direct `subarray` passing with `apply` when encoding audio to base64 in a hot loop instead of `Array.from`.
