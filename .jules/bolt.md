## 2026-06-23 - Use Set for Audio Node Tracking
**Learning:** Using an Array for dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals leads to O(n) reallocation on every removal via `.filter()`. A Set provides O(1) complexity for additions and deletions.
**Action:** Use `Set` instead of `Array` when tracking Web Audio API nodes or similar dynamic collections with frequent cleanup.
