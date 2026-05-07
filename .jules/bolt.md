## 2024-05-15 - Managing Dynamic Resources Collections
**Learning:** Using `Array.filter` to remove dynamically added/removed resources (like `AudioBufferSourceNode`s in `source.onended`) is an anti-pattern as it causes O(n) removal complexity and unnecessary array re-allocations on every single removal.
**Action:** For managing dynamic collections of active resources that require frequent additions and removals, use a `Set` instead of an `Array` to achieve O(1) removal complexity and avoid unnecessary memory allocations.
