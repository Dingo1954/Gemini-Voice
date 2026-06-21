## 2026-06-21 - Active Audio Node Tracking Optimization
**Learning:** Using arrays and `.filter()` to track rapidly created and destroyed resources (like AudioBufferSourceNodes in a real-time streaming context) leads to continuous O(n) array re-allocations and CPU overhead.
**Action:** Use a `Set` for dynamic collections of short-lived resources that require frequent individual additions and removals to achieve O(1) complexity and avoid unnecessary heap allocations.
