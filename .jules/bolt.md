## 2025-03-08 - Base64 Realtime Audio Optimizations

**Learning:** When encoding/decoding realtime audio buffers (Float32 to/from Int16/Base64), multiple `DataView`, `ArrayBuffer`, and `Array.from()` conversions generate severe GC pressure during `onaudioprocess`. Using `Uint8Array(typedArray.buffer)` directly and `String.fromCharCode.apply(null, chunk)` is significantly faster (approx. 4-5x speedup) than mapping arrays character by character.

**Action:** Whenever converting typed arrays to strings or vice versa in hot rendering paths (audio processing / WebGL), avoid intermediate generic Javascript array creations (`Array.from`) and avoid byte-by-byte copies whenever a direct buffer view or bulk method is applicable.
