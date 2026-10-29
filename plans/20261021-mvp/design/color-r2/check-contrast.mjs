import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const tokens = JSON.parse(readFileSync(resolve(root, 'design/tokens/tokens.json'), 'utf8'));
const old = {
  selected: ['#e8eefe', '#1e43b8'],
  success: ['#e7f6ec', '#14663f'],
  error: ['#fdecec', '#b42318'],
  pending: ['#fff3d6', '#8a5300'],
};
const tokenValue = name => {
  const value = tokens.state[name];
  const reference = value.match(/^var\(--(.+)\)$/);
  return reference ? tokens.color[reference[1]] : value;
};
const proposed = Object.fromEntries(Object.keys(old).map(name => [
  name,
  [tokenValue(`state-${name}-bg`), tokenValue(`state-${name}-fg`)],
]));
const cards = Object.fromEntries(['success', 'error', 'pending'].map(name => [
  name,
  [
    tokenValue(`card-${name}-bg`),
    tokenValue(`card-${name}-border`),
    tokenValue(`card-${name}-fg`),
  ],
]));
const white = tokens.color['color-on-primary'];

function luminance(hex) {
  const rgb = hex.slice(1).match(/.{2}/g).map(value => parseInt(value, 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

console.log('| Trạng thái | Nền/chữ cũ | Cũ | Nền/chữ đề xuất | Mới | Nền mới/bề mặt trắng |');
console.log('|---|---|---:|---|---:|---:|');
for (const name of Object.keys(old)) {
  const [oldBg, oldFg] = old[name];
  const [newBg, newFg] = proposed[name];
  console.log(`| ${name} | ${oldBg} / ${oldFg} | ${contrast(oldBg, oldFg)}:1 | ${newBg} / ${newFg} | ${contrast(newBg, newFg)}:1 | ${contrast(newBg, white)}:1 |`);
}

console.log('\n| Card | Nền/chữ | Chữ/nền | Viền/nền |');
console.log('|---|---|---:|---:|');
for (const [name, [bg, border, fg]] of Object.entries(cards)) {
  console.log(`| ${name} | ${bg} / ${fg} | ${contrast(bg, fg)}:1 | ${contrast(bg, border)}:1 |`);
}
