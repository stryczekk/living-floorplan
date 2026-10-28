// Notes on the plan: free text ("Kubuś's cot"), markers (a pin with an icon,
// a caption and a longer note - "main water valve", "fuse box") and arrows.
// Static drawing; a card may show a marker's note on a tap.
//
//   { id, type: "text",   at, text, size: 24, color, rot: 0, bold: false }
//   { id, type: "marker", at, icon: "valve", text, note, entity? }
//   { id, type: "arrow",  from, to, color, width: 2 }
//
// Sizes are in plan units here (the v2 model's centimetres are converted by lowerV2).

// marker icons: a key the editor offers -> the character drawn in the pin (any other text is drawn as is)
export const MARKER_ICONS = {
  pin: "📍", valve: "🚰", water: "💧", fuse: "⚡", gas: "🔥", heat: "♨️", key: "🔑", warning: "⚠️",
  extinguisher: "🧯", tools: "🔧", wifi: "📶", box: "📦", bed: "🛏️", plant: "🪴", star: "⭐", info: "ℹ️",
};
export const NOTE_TYPES = ["text", "marker", "arrow"];
const DEFAULT_COLOR = "#c3cfdf";

const n = (v) => Number(Number(v).toFixed(2)).toString();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hexOk = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);

// `k` = plan units per cm (for the default sizes), `upright` = the angle that keeps text level.
export function notesLayer(notes, upright = 0, k = 1) {
  if (!notes || !notes.length) return "";
  const L = [`  <g id="notes" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="middle" pointer-events="none">`];
  for (const x of notes) {
    const color = hexOk(x.color) ? x.color : DEFAULT_COLOR;
    if (x.type === "text" && x.at && x.text) {
      const [px, py] = x.at;
      const size = x.size || 24 * k; // lowerV2 turns the model's cm into plan units
      const rot = upright + (Number(x.rot) || 0);
      const lines = String(x.text).split("\n");
      const spans = lines.map((t, i) => `<tspan x="${n(px)}" dy="${n(i ? size * 1.15 : -((lines.length - 1) * size * 1.15) / 2)}">${esc(t)}</tspan>`).join("");
      L.push(`    <text id="${esc(x.id)}" class="note-text" x="${n(px)}" y="${n(py)}" font-size="${n(size)}" fill="${color}"` +
        `${x.bold ? ' font-weight="600"' : ""} transform="rotate(${n(rot)} ${n(px)} ${n(py)})">${spans}</text>`);
    } else if (x.type === "marker" && x.at) {
      // a round pin (always the same size on the plan) with the icon, the caption under it
      const [px, py] = x.at;
      const r = 9; // plan units: a pin is a symbol, it does not grow with the room
      const glyph = MARKER_ICONS[x.icon] || x.icon || MARKER_ICONS.pin;
      L.push(`    <g id="${esc(x.id)}" class="note-marker"${x.note ? ` data-note="${esc(x.note)}"` : ""}${x.text ? ` data-title="${esc(x.text)}"` : ""}` +
        `${x.entity ? ` data-entity="${esc(x.entity)}"` : ""} pointer-events="all">`);
      L.push(`      <circle class="note-pin" cx="${n(px)}" cy="${n(py)}" r="${n(r)}" fill="#243040" stroke="${color}" stroke-width="1"/>`);
      L.push(`      <text class="note-glyph" x="${n(px)}" y="${n(py + 0.5)}" font-size="10" transform="rotate(${n(upright)} ${n(px)} ${n(py)})">${esc(glyph)}</text>`);
      if (x.text) L.push(`      <text class="note-caption" x="${n(px)}" y="${n(py + r + 7)}" font-size="9" fill="${color}" transform="rotate(${n(upright)} ${n(px)} ${n(py)})">${esc(x.text)}</text>`);
      L.push(`    </g>`);
    } else if (x.type === "arrow" && x.from && x.to) {
      const [a, b] = [x.from, x.to];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1) continue;
      const w = x.width || 1.6;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, h = Math.min(8 + w * 2, len / 2);
      const head = [[b[0] - ux * h - uy * h * 0.5, b[1] - uy * h + ux * h * 0.5], [b[0] - ux * h + uy * h * 0.5, b[1] - uy * h - ux * h * 0.5]];
      L.push(`    <g id="${esc(x.id)}" class="note-arrow" stroke="${color}" fill="${color}">`);
      L.push(`      <line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0] - ux * h * 0.8)}" y2="${n(b[1] - uy * h * 0.8)}" stroke-width="${n(w)}" stroke-linecap="round"/>`);
      L.push(`      <path d="M${n(b[0])} ${n(b[1])} L${n(head[0][0])} ${n(head[0][1])} L${n(head[1][0])} ${n(head[1][1])} Z" stroke="none"/>`);
      L.push(`    </g>`);
    }
  }
  L.push(`  </g>`);
  return L.join("\n");
}
