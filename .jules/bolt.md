## 2024-03-08 - Base64 Conversion Allocation
**Learning:** Using `Array.from` on a `Uint8Array` to pass arguments to `String.fromCharCode.apply` inside a high-frequency loop (like `onaudioprocess`) causes massive unnecessary heap allocations.
**Action:** Cast the TypedArray `as unknown as number[]` instead of calling `Array.from` when invoking `apply` to skip creating an intermediate regular array while keeping TypeScript happy.
