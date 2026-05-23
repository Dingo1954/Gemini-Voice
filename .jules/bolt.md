## 2024-05-23 - Avoid Array reallocations for frequently changing audio nodes
**Learning:** In a real-time application where AudioBufferSourceNodes are frequently added and removed upon playback completion, using an Array to track them results in O(N) removal complexity and forces reallocation on every node completion via `.filter()`.
**Action:** Use a `Set` instead of an Array for managing dynamically sized collections of short-lived objects that require frequent add/delete operations, achieving O(1) removal complexity.
