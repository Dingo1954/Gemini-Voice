## 2024-10-25 - Real-time Audio Array.from Bottleneck
**Learning:** Using `Array.from()` to chunk `Uint8Array` into `String.fromCharCode.apply()` inside an `onaudioprocess` handler creates massive GC pressure and CPU overhead, blocking the main thread.
**Action:** When converting `Int16Array` or `Float32Array` audio data to Base64 in hot loops, read the underlying buffer directly (`new Uint8Array(typedArray.buffer)`) and use a simple byte loop with `String.fromCharCode()` instead of relying on `DataView` or intermediate array creations.
