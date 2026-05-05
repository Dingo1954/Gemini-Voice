## 2024-05-05 - Optimize Active Audio Nodes Management
**Learning:** Managing dynamic collections of active resources like `AudioBufferSourceNode` with frequent additions and removals can be an unnecessary CPU bottleneck if arrays are used (reallocating and mapping).
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity and avoid unnecessary array re-allocations during active voice sessions.
