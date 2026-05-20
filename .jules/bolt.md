## 2024-05-20 - Initialization\n**Learning:** Started Bolt\n**Action:** Let's find some performance optimization
## 2024-05-20 - Avoid Array.from for TypedArray conversion
**Learning:** Using `Array.from(typedArray)` before passing it to `String.fromCharCode.apply` creates unnecessary heap allocations and is much slower (~4x slower) than casting and passing the typed array directly.
**Action:** When converting large binary buffers to Base64 strings, pass TypedArrays directly to `String.fromCharCode.apply` by casting to `unknown as number[]` to satisfy TypeScript compiler.
