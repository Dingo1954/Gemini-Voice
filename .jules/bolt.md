## 2026-05-24 - AudioNode lifecycle optimization
**Learning:** When managing dynamic collections of active resources (like AudioBufferSourceNodes) in Web Audio API that require frequent additions and removals based on events (like `onended`), using an Array with `.filter` causes O(N) removal complexity. Since `onended` triggers independently for each node, this causes rapid array re-allocations and CPU spikes.
**Action:** Use a `Set` instead of an `Array` to manage these dynamic nodes, achieving O(1) removal complexity and avoiding array allocations.
