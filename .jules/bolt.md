## 2024-05-17 - [Real-time Audio Processing Memory Allocation]
**Learning:** In highly frequent callbacks (like `onaudioprocess` for real-time audio), using `Array.from(typedArray)` creates massive, continuous heap allocations that trigger garbage collection pauses, causing audio stuttering.
**Action:** Pass TypedArrays directly to `String.fromCharCode.apply` by casting them as `unknown as number[]` to bypass the unnecessary intermediary Array allocation while satisfying TypeScript.
