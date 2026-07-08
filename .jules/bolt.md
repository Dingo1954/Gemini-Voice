## 2024-05-24 - TypedArray to String Conversion
**Learning:** Using `Array.from()` to convert TypedArrays for `String.fromCharCode.apply` inside high-frequency audio processing loops causes excessive heap allocations and potential GC pauses.
**Action:** Pass TypedArrays directly to `String.fromCharCode.apply` and cast as `unknown as number[]` to satisfy TypeScript, avoiding intermediate array creation.

## 2024-05-24 - AudioBufferSourceNode Collection Management
**Learning:** Using an Array with `.filter()` for managing dynamic AudioBufferSourceNodes causes O(N) removal and array re-allocations, creating unnecessary garbage.
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity and avoid unnecessary re-allocations for frequently added/removed resources.
