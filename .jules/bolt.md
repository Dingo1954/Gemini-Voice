
## 2024-05-30 - O(1) Audio Resource Management
**Learning:** Managing dynamic audio resources (`AudioBufferSourceNode`) that require frequent additions and removals (e.g., in `onended` callbacks) with arrays leads to unnecessary O(N) array re-allocations and memory pressure.
**Action:** Use a `Set` instead of an `Array` to track these nodes, allowing for O(1) removals and reducing garbage collection overhead during audio playback.
