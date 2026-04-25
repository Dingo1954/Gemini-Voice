## 2024-04-25 - Real-time Audio Base64 Conversion Allocation
**Learning:** `String.fromCharCode.apply(null, Array.from(bytes))` causes massive heap allocations and GC spikes because `Array.from` re-allocates a massive new JS array for every chunk of audio data.
**Action:** Since `apply` accepts Array-like objects, we can pass `bytes` directly (cast `as unknown as number[]` to satisfy TS) to eliminate intermediate array creation.
