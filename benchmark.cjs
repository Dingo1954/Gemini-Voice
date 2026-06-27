const { performance } = require('perf_hooks');

const bufferSize = 4096 * 2;
const buffer = new ArrayBuffer(bufferSize);
const bytes = new Uint8Array(buffer);
for (let i=0; i<bytes.length; i++) bytes[i] = i % 256;

function withArrayFrom() {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return binary;
}

function withoutArrayFrom() {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return binary;
}

const N = 10000;

let start = performance.now();
for(let i=0; i<N; i++) withArrayFrom();
console.log('withArrayFrom:', performance.now() - start);

start = performance.now();
for(let i=0; i<N; i++) withoutArrayFrom();
console.log('withoutArrayFrom:', performance.now() - start);
