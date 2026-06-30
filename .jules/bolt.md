
## 2024-05-18 - Optimized AudioBufferSourceNode management
**Learning:** Managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals using arrays can lead to unnecessary O(n) array re-allocations on removal.
**Action:** Use a `Set` instead of an `Array` for such collections to achieve O(1) removal complexity.
