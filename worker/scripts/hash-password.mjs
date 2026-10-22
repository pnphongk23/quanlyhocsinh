import { randomBytes, webcrypto } from 'node:crypto';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');

if (password.length < 8 || password.length > 128) {
  process.stderr.write('Password must be 8 to 128 characters.\n');
  process.exitCode = 1;
} else {
  const iterations = 30_000;
  const salt = randomBytes(16);
  const key = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(password, 'utf8'),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  const hash = Buffer.from(bits).toString('base64url');
  process.stdout.write(`pbkdf2-sha256$${iterations}$${salt.toString('base64url')}$${hash}\n`);
}
