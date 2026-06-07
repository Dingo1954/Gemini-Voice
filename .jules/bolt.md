
## 2024-05-24 - [Use Set for Dynamic Resource Tracking]
**Learning:** Using an Array to track dynamically added and removed AudioBufferSourceNodes results in O(n) removal time and array re-allocations, which can impact performance in a high-frequency real-time audio loop.
**Action:** Always use a `Set` for managing collections of active resources that require frequent additions and removals to ensure O(1) removal complexity.
