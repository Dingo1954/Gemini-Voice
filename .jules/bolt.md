## 2024-05-24 - O(1) removal complexity for audio nodes
**Learning:** Using an Array to manage dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals leads to unnecessary O(N) re-allocations when using `.filter()`.
**Action:** For frequently changing active resource collections, always use a `Set` to achieve O(1) insertion and removal complexity, preventing memory churn and minor performance hitches.
