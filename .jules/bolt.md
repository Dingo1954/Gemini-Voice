## 2024-05-19 - Removed unnecessary heap allocations in audio Base64 conversion
**Learning:** Found a performance bottleneck in real-time audio processing where `Array.from` was used to convert a `Uint8Array` to a regular array before passing to `String.fromCharCode.apply()`. This caused excessive intermediate heap allocations of JavaScript numbers during audio chunk processing.
**Action:** Use typed arrays directly with `apply()` (casting `as unknown as number[]` for TS) when converting large binary buffers to Base64 to bypass massive intermediate array allocations.
