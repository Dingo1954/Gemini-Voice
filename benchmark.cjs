const chunkSize = 0x8000;
const bytes = new Uint8Array(chunkSize);

console.time('Array.from');
for (let i = 0; i < 10000; i++) {
  String.fromCharCode.apply(null, Array.from(bytes.subarray(0, chunkSize)));
}
console.timeEnd('Array.from');

console.time('Direct cast');
for (let i = 0; i < 10000; i++) {
  String.fromCharCode.apply(null, bytes.subarray(0, chunkSize));
}
console.timeEnd('Direct cast');
