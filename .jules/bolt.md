## 2026-06-14 - Optimize Active Resource Collections
**Learning:** Filtering arrays for active resource collection removals (like AudioBufferSourceNodes) causes O(N) complexity and repeated allocations, which is inefficient for high-frequency updates.
**Action:** Use a Set instead of an Array for O(1) removal complexity to avoid unnecessary array re-allocations.
