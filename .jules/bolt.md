## 2024-05-12 - Optimize Array to Set for active resource tracking
**Learning:** Using an Array with `.filter()` to manage dynamic collections of frequently created and destroyed objects (like AudioBufferSourceNodes) causes unnecessary memory re-allocations and has O(N) removal complexity.
**Action:** When tracking active system resources that frequently invoke `onended` or similar cleanup callbacks, use a `Set` to achieve O(1) removals via `.delete()` and avoid generating garbage collection overhead.
