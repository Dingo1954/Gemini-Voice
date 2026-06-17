## 2025-03-09 - Avoid heap allocations in real-time audio processing
**Learning:** Using `Array.from` with `String.fromCharCode.apply` inside high-frequency event handlers like `onaudioprocess` causes rapid heap allocations and potential garbage collection pauses. Additionally, managing dynamically changing audio nodes with Arrays creates O(N) removals.
**Action:** Cast `TypedArray` to `unknown as number[]` to bypass `Array.from` heap allocations. Use `Set` for O(1) additions and removals of short-lived audio resources.
