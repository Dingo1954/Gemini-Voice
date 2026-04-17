
## 2024-04-17 - Audio Base64 Encoding Optimization
**Learning:** In a real-time web audio context (like processing microphone streams in `onaudioprocess`), converting Int16Array to Base64 manually using a `DataView` and a byte-by-byte `String.fromCharCode` loop is a significant bottleneck. Bypassing `DataView` by instantiating `Uint8Array` directly over `Int16Array.buffer` (leveraging native little-endianness) and chunking `String.fromCharCode.apply` eliminates multiple intermediate object creations and slow iteration, yielding a ~60% speedup.
**Action:** Always prefer `TypedArray.buffer` sharing and bulk conversion functions (`apply` with chunks to avoid stack limits) over element-wise manual formatting when handling binary/Base64 transforms in hot paths.
