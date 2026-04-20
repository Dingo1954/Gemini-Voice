## 2024-05-18 - Fast ArrayBuffer to Base64
**Learning:** `String.fromCharCode.apply(null, Array.from(subarray))` is extremely slow for large ArrayBuffers. `String.fromCharCode.apply(null, subarray)` without the `Array.from` conversion is significantly faster (over 6x faster in my benchmark). A simple `for` loop is also faster than `Array.from` but slower than the correct `apply` usage.
**Action:** Always avoid `Array.from` when passing typed array views to `String.fromCharCode.apply` when performing base64 encoding of real-time audio streams.
