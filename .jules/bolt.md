## 2026-05-26 - Optimize Audio Base64 Conversion
**Learning:** In highly frequent paths like `onaudioprocess`, `Array.from(typedArray)` can lead to huge heap allocations causing garbage collection pauses and audio glitches. Modern browsers can accept TypedArrays in `Function.prototype.apply` directly.
**Action:** Cast the TypedArray using `as unknown as number[]` when passing to `String.fromCharCode.apply` to avoid array reallocation while satisfying TypeScript.
## 2026-05-26 - O(1) AudioBufferSourceNode Tracking
**Learning:** Managing dynamic arrays like `AudioBufferSourceNode[]` with frequent `.push()` and `.filter()` creates new arrays and linear time O(N) removals, creating unnecessary memory overhead during real-time scenarios.
**Action:** Use a `Set` and `.add()` / `.delete()` for constant time O(1) tracking.
