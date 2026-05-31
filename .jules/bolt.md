
## 2024-06-25 - Avoid Array.from for TypedArray conversion
**Learning:** In realtime audio processing (like the Gemini Live API callback), using `Array.from` on a `Uint8Array` to pass arguments to `String.fromCharCode.apply` causes significant performance overhead due to unnecessary array re-allocation on every audio frame.
**Action:** Use the `as unknown as number[]` cast on the `Uint8Array` when using `String.fromCharCode.apply`. This avoids the heap allocation entirely and speeds up base64 conversion dramatically (measured ~6-7x faster).
