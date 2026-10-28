import { test } from "node:test";
import assert from "node:assert/strict";
import { lzw, makePalette, indexer, encodeGif } from "../../card/gif.js";

// a plain GIF LZW decoder (min code size 8)
function unlzw(bytes, n) {
  const CLEAR = 256, EOI = 257;
  let pos = 0, cur = 0, bits = 0, size = 9, dict = [], prev = null;
  const reset = () => { dict = []; for (let i = 0; i < 256; i++) dict[i] = [i]; dict[CLEAR] = null; dict[EOI] = null; size = 9; prev = null; };
  reset();
  const out = [];
  while (out.length < n) {
    while (bits < size) { cur |= bytes[pos++] << bits; bits += 8; }
    const code = cur & ((1 << size) - 1); cur >>>= size; bits -= size;
    if (code === CLEAR) { reset(); continue; }
    if (code === EOI) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else entry = [...prev, prev[0]];
    out.push(...entry);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length === 1 << size && size < 12) size++;
  }
  return out;
}

test("gif: LZW round trip, small and past a full table", () => {
  for (const data of [[1, 2, 3, 1, 2, 3, 1, 2, 3, 4], Array.from({ length: 50000 }, (_, i) => (i * 7919) % 251), Array.from({ length: 20000 }, () => 5)]) {
    assert.deepEqual(unlzw(lzw(data), data.length), data);
  }
});

test("gif: palette and indexes, a valid file", () => {
  const w = 4, h = 2, f = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { f[i * 4] = i < 4 ? 255 : 0; f[i * 4 + 2] = i < 4 ? 0 : 255; f[i * 4 + 3] = 255; }
  const pal = makePalette([f], 1), idx = indexer(pal)(f);
  assert.equal(pal.length, 2);
  assert.notEqual(idx[0], idx[7]);
  const gif = encodeGif(w, h, [idx, idx], pal, 40);
  assert.equal(String.fromCharCode(...gif.slice(0, 6)), "GIF89a");
  assert.equal(gif[gif.length - 1], 0x3b);
});
