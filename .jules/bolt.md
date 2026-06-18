## 2024-06-18 - Audio Node Collection Optimization
**Learning:** The application was managing dynamic collections of active `AudioBufferSourceNode` objects using an Array. Since nodes are frequently added and removed during audio playback, the array `filter()` operation causes unnecessary O(N) array re-allocations on every `onended` event.
**Action:** For managing dynamic collections of active resources that require frequent additions and removals, always use a `Set` to achieve O(1) removal complexity and avoid unnecessary array re-allocations.
