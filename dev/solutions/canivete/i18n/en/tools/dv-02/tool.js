import { convert, ToolError } from '../../templates/convert.js';

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// UTF-8 with TextEncoder/TextDecoder (browser and Node), Base64 by hand (no Buffer, no btoa/atob).
function encode(s) {
  const b = new TextEncoder().encode(s);
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63] + (i + 1 < b.length ? ABC[(n >> 6) & 63] : '=') + (i + 2 < b.length ? ABC[n & 63] : '=');
  }
  return out;
}

function decode(raw) {
  const s = raw.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) throw new ToolError('This is not valid Base64.');
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) {
    let n = 0;
    for (let k = 0; k < 4; k++) n = (n << 6) | (s[i + k] === '=' ? 0 : ABC.indexOf(s[i + k]));
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255);
  }
  bytes.length -= s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(new Uint8Array(bytes));
  } catch {
    throw new ToolError('The Base64 is not valid UTF-8 text.');
  }
}

export default convert({
  id: 'dv-02',
  title: 'Base64 encode and decode',
  inputs: [
    { name: 'text', type: 'multiline', label: 'Text' },
    {
      name: 'direction',
      type: 'choice',
      label: 'Direction',
      default: 'encode',
      options: [
        { value: 'encode', label: 'Encode (text → Base64)' },
        { value: 'decode', label: 'Decode (Base64 → text)' },
      ],
    },
  ],
  run({ text, direction }) {
    return direction === 'encode' ? encode(text) : decode(text);
  },
});
