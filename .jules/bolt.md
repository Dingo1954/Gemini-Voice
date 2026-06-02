## 2024-05-15 - [AudioBufferSourceNode Cleanup]
**Learning:** Managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals using Arrays causes unnecessary O(n) Array reallocation with `.filter()`.
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity and avoid continuous memory allocations during high-frequency audio chunk processing.
