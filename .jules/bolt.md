## 2024-06-16 - [Optimize Active Resource Tracking]
**Learning:** The application tracks active `AudioBufferSourceNode` objects in an array (`sourceNodesRef`). In the `onended` callback, it removes nodes using `.filter()`. Because `onended` is triggered frequently during real-time streaming, this causes O(N) removal complexity and unnecessary array re-allocations leading to garbage collection spikes.
**Action:** For managing dynamic collections of active resources that require frequent additions and removals, use a `Set` instead of an `Array` to achieve O(1) removal complexity.
