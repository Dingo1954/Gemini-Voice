## 2024-05-21 - Remove Array.from to avoid heap allocations in audio processing
**Learning:** For performance-critical code paths (like real-time audio processing), passing TypedArrays directly to `String.fromCharCode.apply` avoids heap allocations caused by `Array.from`.
**Action:** To satisfy TypeScript compiler checks, cast the TypedArray as `unknown as number[]` instead of calling `Array.from`.
