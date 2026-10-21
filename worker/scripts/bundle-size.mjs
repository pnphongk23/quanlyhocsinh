import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const bundlePath = resolve('dist/index.js');
const bundle = readFileSync(bundlePath);
const gzipBytes = gzipSync(bundle).byteLength;
const kib = (bytes) => (bytes / 1024).toFixed(2);

console.log(`Bundle: ${kib(statSync(bundlePath).size)} KiB`);
console.log(`Gzip: ${kib(gzipBytes)} KiB`);
