## 2024-05-04 - Array.from inside hot audio loop

**Learning:** Array.from creates a new Array instance which is slow and causes excessive heap allocations inside an audio processing loop, creating unnecessary GC pauses. Passing TypedArray directly is much faster.

**Action:** Use `TypedArray as unknown as number[]` to trick TS when passing TypedArrays to functions taking a rest parameter array like `String.fromCharCode.apply`.
