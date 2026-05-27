## 2026-05-27 - Audio Node Collection Optimization
**Learning:** Using an Array with `.filter()` to manage dynamic, frequently added/removed active resources like AudioBufferSourceNodes causes O(N) removal complexity and unnecessary array reallocations on every node completion (`onended`).
**Action:** Use a `Set` to achieve O(1) removal (`.delete()`) and add (`.add()`) complexity, improving performance for high-frequency resource management.
