## 2024-06-29 - Real-time Audio Array Allocations
**Learning:** Using `Array.from()` on TypedArrays in high-frequency audio processing loops causes severe heap allocations and garbage collection pauses.
**Action:** Pass TypedArrays directly to `String.fromCharCode.apply()` by casting them as `unknown as number[]` to bypass TypeScript checks without incurring runtime allocation penalties.
