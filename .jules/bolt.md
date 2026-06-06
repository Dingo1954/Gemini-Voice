## 2024-06-06 - O(1) Removal for Dynamic Audio Nodes
**Learning:** Using an Array for frequently added/removed items (like short-lived `AudioBufferSourceNode`s during streaming) causes O(N) removal and memory re-allocations via `.filter()`.
**Action:** Use a `Set` for dynamic collections of active resources to achieve O(1) removal complexity and eliminate unnecessary array re-allocations.
