## 2026-06-05 - O(1) Audio Resource Management
**Learning:** In real-time audio processing (like Gemini Live streaming), managing active 'AudioBufferSourceNode' lifecycles with an Array causes constant O(N) re-allocations during 'onended' callbacks. This triggers garbage collection spikes which can cause audio stutter.
**Action:** Always use a 'Set' for managing dynamic collections of active Web Audio API nodes that require frequent additions and removals.
