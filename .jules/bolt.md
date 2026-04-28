## 2024-05-24 - Avoid `Array.from` on TypedArrays in hot loops
**Learning:** In real-time audio processing contexts (like the microphone data processor), using `Array.from()` to convert `Uint8Array` to an array for `String.fromCharCode.apply` causes significant performance overhead and unnecessary garbage collection due to creating many large arrays per second.
**Action:** Cast the TypedArray to an array (`as unknown as number[]`) to satisfy TypeScript, allowing `String.fromCharCode.apply` to iterate over the `Uint8Array` directly without creating a new Array instance.

## 2024-05-24 - Use `Set` for high-churn resource management
**Learning:** Using an Array for elements that are frequently added and removed (like `AudioBufferSourceNode`s playing short audio chunks) with a filter function (`array.filter(item => item !== removedItem)`) is O(n) and reallocates memory on every removal.
**Action:** Use a `Set` for managing dynamic lists of items that need individual removal (`.add()` and `.delete()`), bringing the removal operation to O(1) and preventing reallocation.
