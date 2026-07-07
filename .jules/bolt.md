## 2024-03-24 - O(1) Set operations for frequent AudioNode management
**Learning:** In real-time audio applications, `AudioBufferSourceNode` objects are created and destroyed extremely frequently. Using an Array to track them and `.filter()` on every `onended` event causes O(n) iteration and unnecessary array re-allocations which can cause GC pauses and stuttering audio.
**Action:** Always use a `Set` when managing dynamic collections of active resources (like AudioBufferSourceNodes) that require frequent additions and removals to achieve O(1) removal complexity.
