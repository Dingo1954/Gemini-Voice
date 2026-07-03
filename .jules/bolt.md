## 2024-05-24 - Audio GC Optimization
**Learning:** Array.from in high-frequency audio callbacks causes hidden GC allocations.
**Action:** Use TypedArrays directly in String.fromCharCode.apply.
