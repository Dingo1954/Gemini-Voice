const { performance } = require('perf_hooks');

const bufferSize = 8192;
const buffer = new ArrayBuffer(bufferSize * 2);
const pcm16 = new Int16Array(buffer);
for (let i = 0; i < pcm16.length; i++) {
  pcm16[i] = Math.random() * 0x7FFF;
}
const bytes = new Uint8Array(buffer);
const chunkSize = 0x8000;

function testArrayFrom() {
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function testDirect() {
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const ITERATIONS = 10000;

const startFrom = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  testArrayFrom();
}
const endFrom = performance.now();

const startDirect = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  testDirect();
}
const endDirect = performance.now();

console.log(`Array.from: ${endFrom - startFrom} ms`);
console.log(`Direct: ${endDirect - startDirect} ms`);
console.log(`Improvement: ${((endFrom - startFrom) - (endDirect - startDirect)) / (endFrom - startFrom) * 100}%`);
