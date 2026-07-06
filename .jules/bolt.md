## 2024-07-06 - O(1) removals for active resources
**Learning:** For managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals, using an Array with `.filter()` causes O(N) removals and unnecessary array re-allocations which can cause minor performance degradation or memory spikes in hot paths.
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity with `delete()` and avoid unnecessary array re-allocations.
