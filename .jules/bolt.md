## 2024-05-24 - [AudioNode Set Conversion]
**Learning:** For managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals, use a 'Set' instead of an 'Array' to achieve O(1) removal complexity and avoid unnecessary array re-allocations.
**Action:** Replace arrays with Sets for active connection tracking.
## 2024-05-24 - [TypedArray Base64 Conversion]
**Learning:** For performance-critical code paths (like real-time audio processing), passing TypedArrays directly to `String.fromCharCode.apply` avoids heap allocations caused by `Array.from`.
**Action:** Use `unknown as number[]` cast to satisfy TypeScript when passing TypedArrays to functions expecting number arrays.
