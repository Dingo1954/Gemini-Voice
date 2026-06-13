
## 2024-05-24 - O(1) Resource Management in React Refs
**Learning:** Using an Array to manage frequently added/removed active audio nodes in a `useRef` creates O(n) operations on every node end and unnecessary array re-allocations due to `.filter()`.
**Action:** Always use a `Set` for managing dynamic collections of active Web Audio API nodes (or similar event-driven resources) to achieve O(1) removal and avoid unnecessary array re-allocations.
