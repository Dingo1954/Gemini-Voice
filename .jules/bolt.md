## 2024-06-04 - Optimize dynamic active resource collections with Set
**Learning:** Managing dynamically added/removed resources (like active AudioBufferSourceNodes) using arrays causes O(n) reallocation and unnecessary GC overhead via filter/splice methods.
**Action:** Use a Set for dynamic collections requiring frequent modifications to ensure O(1) insertion/deletion.
