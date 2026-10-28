// An animated GIF from RGBA frames, no dependencies: one palette for the whole
// animation (the most used colours of all frames, 5 bits a channel), LZW-packed
// frames, looping forever. Enough for a plan's "day in 30 seconds".

// The palette: up to 256 colours, the averages of the most used 15-bit colour bins.
// frames: [Uint8ClampedArray RGBA]; step: every n-th pixel is counted.
export function makePalette(frames, step = 3) {
  const count = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 4 * step) {
      const k = ((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3);
      count[k]++; sr[k] += f[i]; sg[k] += f[i + 1]; sb[k] += f[i + 2];
    }
  }
  const bins = [];
  for (let k = 0; k < 32768; k++) if (count[k]) bins.push(k);
  bins.sort((a, b) => count[b] - count[a]);
  const pal = [];
  for (const k of bins.slice(0, 256)) pal.push([Math.round(sr[k] / count[k]), Math.round(sg[k] / count[k]), Math.round(sb[k] / count[k])]);
  while (pal.length < 2) pal.push([0, 0, 0]);
  return pal;
}

// RGBA -> palette indexes; the nearest colour of each 15-bit bin is found once.
export function indexer(pal) {
  const cache = new Int16Array(32768).fill(-1);
  return (f) => {
    const out = new Uint8Array(f.length / 4);
    for (let i = 0, j = 0; i < f.length; i += 4, j++) {
      const k = ((f[i] >> 3) << 10) | ((f[i + 1] >> 3) << 5) | (f[i + 2] >> 3);
      let c = cache[k];
      if (c < 0) {
        const r = ((k >> 10) << 3) + 4, g = (((k >> 5) & 31) << 3) + 4, b = ((k & 31) << 3) + 4;
        let best = 0, bd = Infinity;
        for (let p = 0; p < pal.length; p++) {
          const dr = pal[p][0] - r, dg = pal[p][1] - g, db = pal[p][2] - b, d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
          if (d < bd) { bd = d; best = p; }
        }
        c = cache[k] = best;
      }
      out[j] = c;
    }
    return out;
  };
}

// LZW for GIF: min code size 8, code width 9..12 bits, packed LSB first. The width grows
// after a code is written once the next free entry no longer fits (as decoders expect).
export function lzw(indexes) {
  const MIN = 8, CLEAR = 1 << MIN, EOI = CLEAR + 1, MAX = 4096;
  const out = [];
  let cur = 0, bits = 0, size = MIN + 1, next = EOI + 1, dict = new Map();
  const emit = (code, clear = false) => {
    cur |= code << bits; bits += size;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
    if (clear) { size = MIN + 1; next = EOI + 1; dict = new Map(); }
    else if (next > (size === 12 ? MAX : (1 << size) - 1) && size < 12) size++;
  };
  emit(CLEAR, true);
  let prefix = indexes[0];
  for (let i = 1; i < indexes.length; i++) {
    const c = indexes[i], key = prefix * 256 + c, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < MAX) dict.set(key, next++);
    else emit(CLEAR, true); // the table is full: start again
    prefix = c;
  }
  emit(prefix);
  emit(EOI);
  if (bits > 0) out.push(cur & 255);
  return out;
}

// frames: [Uint8Array of palette indexes, w * h each]; delay in 1/100 s.
export function encodeGif(w, h, frames, pal, delay = 40) {
  const bytes = [];
  const u16 = (v) => bytes.push(v & 255, (v >> 8) & 255);
  const str = (s) => { for (const ch of s) bytes.push(ch.charCodeAt(0)); };
  str("GIF89a"); u16(w); u16(h);
  bytes.push(0xf7, 0, 0); // a global colour table of 256 entries
  for (let i = 0; i < 256; i++) { const c = pal[i] || [0, 0, 0]; bytes.push(c[0], c[1], c[2]); }
  bytes.push(0x21, 0xff, 11); str("NETSCAPE2.0"); bytes.push(3, 1, 0, 0, 0); // loop forever
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0, delay & 255, (delay >> 8) & 255, 0, 0); // graphic control: the delay
    bytes.push(0x2c); u16(0); u16(0); u16(w); u16(h); bytes.push(0);
    bytes.push(8);
    const data = lzw(f);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      bytes.push(n);
      for (let k = 0; k < n; k++) bytes.push(data[i + k]);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Uint8Array(bytes);
}
