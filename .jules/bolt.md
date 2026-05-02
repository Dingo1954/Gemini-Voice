## 2023-10-25 - Avoid Array.from in Audio Processing
**Learning:** Using `Array.from` on a Uint8Array to pass to `String.fromCharCode.apply` causes significant heap allocation and GC pressure in tight loops (like `onaudioprocess`). `String.fromCharCode.apply` accepts typed arrays directly in modern engines.
**Action:** Always cast the typed array to `unknown as number[]` instead of using `Array.from` when processing audio to avoid GC pauses.
