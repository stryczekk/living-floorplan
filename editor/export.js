// Export of the plan: PNG, or a PDF page at a true scale (1:50, 1:100, 1:200 ...)
// so a builder can measure it with a ruler. Pure helpers - the editor composes
// the drawing (the plan, its dimensions, a title block) and rasterises it.

// paper sizes in mm, landscape
export const PAPERS = { a4: [297, 210], a3: [420, 297] };
export const SCALES = [20, 25, 50, 100, 200, 250, 500];
const MARGIN = 10, TITLE = 16; // mm: the page's margin, the title block under the drawing

// The largest standard scale at which a drawing of w x h cm fits the paper (landscape or portrait).
// -> { scale, page: [W, H] mm, area: [x, y, w, h] mm (the drawing at that scale, centred) }
export function pickScale(wCm, hCm, paper = "a4") {
  const [A, B] = PAPERS[paper] || PAPERS.a4;
  let best = null;
  for (const page of [[A, B], [B, A]]) {
    const fw = page[0] - 2 * MARGIN, fh = page[1] - 2 * MARGIN - TITLE;
    // 1 cm of the house = 10 / scale mm on paper
    // a standard scale, else the next round 1:n that fits (a big plot on A4)
    const need = Math.max((wCm * 10) / fw, (hCm * 10) / fh);
    const sc = SCALES.find((s) => s >= need) || Math.ceil(need / 100) * 100;
    if (!best || sc < best.scale) {
      const w = (wCm * 10) / sc, h = (hCm * 10) / sc;
      best = { scale: sc, page, area: [(page[0] - w) / 2, MARGIN + (page[1] - 2 * MARGIN - TITLE - h) / 2, w, h] };
    }
  }
  return best;
}

// A scale bar: the largest of 0.5 / 1 / 2 / 5 / 10 m that is at most `maxCm` long.
export function barLength(maxCm) {
  return [1000, 500, 200, 100, 50].find((c) => c <= maxCm) || 50;
}

// One PDF page with a JPEG on it (no fonts, no other objects): page and image rect in mm.
export function pdfWithImage(jpeg, pxW, pxH, page, rect) {
  const pt = (mm) => ((mm * 72) / 25.4).toFixed(2);
  const [PW, PH] = page, [x, y, w, h] = rect;
  // PDF's origin is the lower left corner
  const content = `q ${pt(w)} 0 0 ${pt(h)} ${pt(x)} ${pt(PH - y - h)} cm /Im0 Do Q`;
  const enc = new TextEncoder();
  const parts = [], offsets = [];
  let size = 0;
  const push = (chunk) => { const b = typeof chunk === "string" ? enc.encode(chunk) : chunk; parts.push(b); size += b.length; };
  const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); for (const b of [].concat(body)) push(b); push(`\nendobj\n`); };
  push("%PDF-1.4\n%âãÏÓ\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt(PW)} ${pt(PH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"]);
  obj(5, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`);
  const xref = size;
  push(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(size);
  let p = 0;
  for (const b of parts) { out.set(b, p); p += b.length; }
  return out;
}

// The overlay's look on a sheet (the editor's CSS uses its own variables): dimensions and room
// names, in the plan's palette (generator/light.js turns them light for print). Detection ranges
// of cameras and sensors are for the card, not for a builder.
export const EXPORT_CSS = `
.ov-room { fill: #c3cfdf; font-family: system-ui, sans-serif; font-weight: 600; text-anchor: middle; dominant-baseline: middle;
  paint-order: stroke; stroke: #131a24; stroke-width: 3px; stroke-linejoin: round; }
.ov-room.area { fill: #8ea1ba; font-weight: normal; }
.ov-dim { fill: #c3cfdf; font-family: system-ui, sans-serif; text-anchor: middle; dominant-baseline: middle;
  paint-order: stroke; stroke: #131a24; stroke-width: 3px; stroke-linejoin: round; }
.ov-dim.chain { fill: #8ea1ba; }
.ov-chain { stroke: #7c8ca3; stroke-width: 1; vector-effect: non-scaling-stroke; }
.ov-chain.ext { stroke-opacity: 0.5; }
.camera-fan, .sensor-fan { display: none; }
#room-climate, #device-labels, .device-value { display: none; } /* live readings: empty on paper */
`;
