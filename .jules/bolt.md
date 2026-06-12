## 2024-06-12 - Prevent GC spikes in TypedArray to Base64 conversion
**Learning:** Using `Array.from` to pass a `Uint8Array` to `String.fromCharCode.apply` in hot loops (like `onaudioprocess`) creates massive GC pressure by allocating thousands of objects per second.
**Action:** Cast the TypedArray directly via `as unknown as number[]` when passing to `String.fromCharCode.apply` to avoid heap allocations.

## 2024-06-12 - O(1) removals for active resources
**Learning:** Storing transient active resources (like `AudioBufferSourceNode`) in an Array and filtering them out in `onended` callbacks causes O(N) re-allocations during frequent cleanups.
**Action:** Use a `Set` for collections that require frequent additions and removals to achieve O(1) removal complexity.
