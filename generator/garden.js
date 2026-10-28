// The plot and the garden round the house: areas (lawn, terrace, driveway, path,
// flower bed, pool, gravel, the plot's boundary), lines (fence, hedge) and plants
// (trees, bushes). Drawn under the house in the plan's dark palette; the card's
// light theme turns them light like everything else.
//
//   { id, kind: "lawn",  points: [[x, y], ...] }     an area (closed)
//   { id, kind: "fence", line: [[x, y], ...] }       a line (open)
//   { id, kind: "tree",  at: [x, y], r: 250 }        a plant (r = crown radius)
//
// Coordinates in plan units here (lowerV2 converts the model's cm).

export const GARDEN_AREAS = ["lawn", "terrace", "driveway", "path", "flowerbed", "pool", "gravel", "plot"];
export const GARDEN_LINES = ["fence", "hedge"];
export const GARDEN_PLANTS = ["tree", "bush"];
export const GARDEN_KINDS = [...GARDEN_AREAS, ...GARDEN_LINES, ...GARDEN_PLANTS];
export const PLANT_R = { tree: 250, bush: 60 }; // cm
export const HEDGE_W = 60; // cm

// drawing order: ground first, then what stands on it
const ORDER = ["plot", "lawn", "gravel", "driveway", "path", "terrace", "flowerbed", "pool", "hedge", "fence", "bush", "tree"];
const FILL = {
  lawn: "url(#gd-lawn)", terrace: "url(#gd-terrace)", driveway: "url(#gd-driveway)", path: "url(#gd-path)",
  flowerbed: "url(#gd-flowerbed)", pool: "#1d4a6b", gravel: "url(#gd-gravel)",
};

const n = (v) => Number(Number(v).toFixed(2)).toString();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const pts = (p) => p.map((q) => `${n(q[0])},${n(q[1])}`).join(" ");

// Every point a garden item covers (for the plan's frame): areas and lines by their
// points, plants by the box round their crown.
export function gardenPoints(items) {
  const out = [];
  for (const g of items || []) {
    if (g.points) out.push(...g.points);
    if (g.line) out.push(...g.line);
    if (g.at) { const r = g.r || 0; out.push([g.at[0] - r, g.at[1] - r], [g.at[0] + r, g.at[1] + r]); }
  }
  return out;
}

// <pattern>s and the tree's gradient; k = plan units per cm.
export function gardenDefs(items, k) {
  if (!items || !items.length) return "";
  const used = new Set(items.map((g) => g.kind));
  const s = (v) => n(v * k);
  const P = (id, w, h, body) => `    <pattern id="gd-${id}" patternUnits="userSpaceOnUse" width="${s(w)}" height="${s(h)}">${body}</pattern>`;
  const out = [];
  if (used.has("lawn")) out.push(P("lawn", 40, 40, `<rect width="${s(40)}" height="${s(40)}" fill="#1f3326"/>` +
    [[6, 9], [22, 4], [33, 18], [14, 27], [29, 34], [3, 36]].map(([x, y]) => `<path d="M${s(x)} ${s(y)} l${s(1)} ${s(-4)}" stroke="#2b4634" stroke-width="${s(1)}"/>`).join("")));
  if (used.has("terrace")) out.push(P("terrace", 200, 14, `<rect width="${s(200)}" height="${s(14)}" fill="#332c27"/><path d="M0 0H${s(200)}" stroke="#463c35" stroke-width="${s(1.2)}"/>`));
  if (used.has("driveway")) out.push(P("driveway", 20, 20, `<rect width="${s(20)}" height="${s(20)}" fill="#2a2f37"/><path d="M0 0H${s(20)}M0 ${s(10)}H${s(20)}M0 0V${s(10)}M${s(10)} ${s(10)}V${s(20)}" stroke="#363c46" stroke-width="${s(1)}"/>`));
  if (used.has("path")) out.push(P("path", 50, 50, `<rect width="${s(50)}" height="${s(50)}" fill="#2e3541"/><path d="M0 0H${s(50)}M0 0V${s(50)}" stroke="#3b4352" stroke-width="${s(1.2)}"/>`));
  if (used.has("flowerbed")) out.push(P("flowerbed", 30, 30, `<rect width="${s(30)}" height="${s(30)}" fill="#2f271f"/>` +
    [[7, 8], [21, 13], [12, 23], [26, 27]].map(([x, y]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${s(2.4)}" fill="#3d5838"/>`).join("")));
  if (used.has("gravel")) out.push(P("gravel", 24, 24, `<rect width="${s(24)}" height="${s(24)}" fill="#323437"/>` +
    [[4, 5], [15, 3], [20, 13], [9, 16], [3, 21], [17, 21]].map(([x, y]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${s(1.3)}" fill="#46494d"/>`).join("")));
  if (used.has("tree") || used.has("bush")) out.push(`    <radialGradient id="gd-crown"><stop offset="0" stop-color="#2f4f36"/><stop offset="1" stop-color="#21382a"/></radialGradient>`);
  return out.join("\n");
}

// The garden layer (under the rooms); k = plan units per cm.
export function gardenLayer(items, k) {
  if (!items || !items.length) return "";
  const L = [`  <g id="garden" pointer-events="none">`];
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  for (const g of sorted) {
    const id = esc(g.id);
    if (g.points && g.points.length >= 3) {
      if (g.kind === "plot") {
        L.push(`    <polygon id="${id}" class="gd-plot" points="${pts(g.points)}" fill="none" stroke="#5a6b86" stroke-width="1.4" stroke-dasharray="10 4 2 4"/>`);
      } else if (g.kind === "pool") {
        L.push(`    <polygon id="${id}" class="gd-pool" points="${pts(g.points)}" fill="#1d4a6b" stroke="#6f8fb0" stroke-width="${n(Math.max(1, 15 * k))}" stroke-linejoin="round"/>`);
      } else {
        L.push(`    <polygon id="${id}" class="gd-${g.kind}" points="${pts(g.points)}" fill="${FILL[g.kind] || "#22302a"}" stroke="none"/>`);
      }
    } else if (g.line && g.line.length >= 2) {
      if (g.kind === "hedge") {
        L.push(`    <polyline id="${id}" class="gd-hedge" points="${pts(g.line)}" fill="none" stroke="#284531" stroke-width="${n((g.width || HEDGE_W) * k)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      } else {
        // a fence: the line and a post at every corner
        L.push(`    <g id="${id}" class="gd-fence"><polyline points="${pts(g.line)}" fill="none" stroke="#6b7f9c" stroke-width="1.2" stroke-dasharray="7 2"/>` +
          g.line.map((p) => `<rect x="${n(p[0] - 2)}" y="${n(p[1] - 2)}" width="4" height="4" fill="#6b7f9c"/>`).join("") + `</g>`);
      }
    } else if (g.at) {
      const r = (g.r || PLANT_R[g.kind] || 60) * k;
      const [x, y] = g.at;
      if (g.kind === "tree") {
        L.push(`    <g id="${id}" class="gd-tree"><circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#gd-crown)" stroke="#3b5f42" stroke-width="1"/>` +
          `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.55)}" fill="none" stroke="#2a4632" stroke-width="0.8" stroke-dasharray="3 3"/>` +
          `<circle cx="${n(x)}" cy="${n(y)}" r="${n(Math.max(1.5, r * 0.08))}" fill="#3a3027"/></g>`);
      } else {
        L.push(`    <circle id="${id}" class="gd-bush" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#gd-crown)" stroke="#3b5f42" stroke-width="0.8"/>`);
      }
    }
  }
  L.push(`  </g>`);
  return L.join("\n");
}
