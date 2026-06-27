## 2024-05-24 - [Avoid Array.from on Typed Arrays in Hot Paths]
**Learning:** Using `Array.from` on a typed array within a high-frequency loop creates significant unnecessary heap allocations, causing GC pressure and potential audio stuttering. `String.fromCharCode.apply` accepts typed arrays directly if cast to `number[]`.
**Action:** Always cast typed arrays directly via `as unknown as number[]` when passing to `String.fromCharCode.apply` in performance-critical code paths instead of using `Array.from`.
