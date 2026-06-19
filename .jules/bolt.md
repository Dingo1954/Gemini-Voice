## 2024-05-24 - Optimizing Dynamic Active Resource Collections
**Learning:** Using an Array to track dynamically created and destroyed resources (like AudioBufferSourceNodes) causes O(N) removal and unnecessary memory allocations from array filtering. This can lead to garbage collection spikes in real-time audio applications.
**Action:** Always use a `Set` for managing collections of high-frequency ephemeral objects to achieve O(1) additions and removals.
