## 2024-05-18 - Set for Dynamic Active Resources
**Learning:** Managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals can be bottlenecked by Array re-allocations during `.filter()`.
**Action:** Use a `Set` instead of an `Array` to achieve O(1) removal complexity and avoid unnecessary array re-allocations on every audio chunk completion.
