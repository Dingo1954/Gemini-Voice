## 2024-06-20 - Avoid Array.from in real-time audio processing
**Learning:** In the performance-critical real-time audio processing loop, using `Array.from` on a TypedArray before passing it to `String.fromCharCode.apply` creates unnecessary large arrays and triggers frequent garbage collection. `String.fromCharCode.apply` can actually accept a TypedArray directly in modern browsers.
**Action:** Cast the TypedArray directly as `unknown as number[]` to bypass TypeScript type-checking and avoid expensive heap allocations.
## 2024-06-20 - Use Set for dynamic AudioBufferSourceNode collections
**Learning:** Managing a rapidly changing collection of active resources like `AudioBufferSourceNode` using an Array (`[].filter`) results in O(n) removal complexity and unnecessary array re-allocations on every `onended` event.
**Action:** Use a `Set` instead of an Array for active resource tracking to achieve O(1) removal and avoid garbage collection overhead during rapid add/remove cycles.
