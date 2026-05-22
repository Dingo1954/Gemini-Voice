## 2024-05-15 - Set for AudioBufferSourceNode Management
**Learning:** For managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals, `Array.filter` causes O(n) reallocation on every removal.
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity.

## 2024-05-15 - TypedArray to String Conversion
**Learning:** Using `Array.from` on a TypedArray to convert it for `String.fromCharCode.apply` causes unnecessary heap allocations, which is problematic in high-frequency real-time loops like `onaudioprocess`.
**Action:** Cast the `TypedArray.subarray()` directly to `unknown as number[]` instead of using `Array.from` when passing to `String.fromCharCode.apply()`.
