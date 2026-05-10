## 2026-05-10 - Avoid Array.from in Audio Processing
**Learning:** In real-time audio processing paths, `Array.from(typedArray)` creates unnecessary heap allocations per chunk. Passing the TypedArray directly to `String.fromCharCode.apply` works in modern JS engines and avoids this allocation overhead.
**Action:** Always cast the TypedArray directly as `unknown as number[]` instead of using `Array.from` when feeding binary data into `String.fromCharCode.apply`.
