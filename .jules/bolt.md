## 2024-05-18 - Optimize Audio Node Management
**Learning:** Managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals as an Array causes unnecessary re-allocations and O(N) complexity for removal.
**Action:** Use a 'Set' instead of an 'Array' for such dynamic collections to achieve O(1) removal complexity.
