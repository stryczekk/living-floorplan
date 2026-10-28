// Furniture in the editor: new pieces (backed against the nearest wall),
// hit-testing turned pieces, moving them. Pure functions on the model v2 (cm).

import { wallThickness } from "../generator/model-v2.js";
import { FURNITURE_SIZE } from "../generator/furniture.js";
import { roomOf } from "./devices.js";

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const r2 = (v) => Math.round(v * 100) / 100;
const rad = (deg) => (deg * Math.PI) / 180;

export function uniquePieceId(m, kind) {
  const used = new Set((m.furniture || []).map((p) => p.id));
  let i = 1;
  while (used.has(`furniture-${kind}-${i}`)) i++;
  return `furniture-${kind}-${i}`;
}

// The nearest wall face within reach: {q: foot on the axis, n: unit normal away from the wall, h: half thickness}.
export function nearestWall(m, p, reach = 80) {
  let best = null, bd = reach;
  for (const w of m.walls || []) {
    const d = sub(w.b, w.a), L2 = d[0] * d[0] + d[1] * d[1];
    if (!L2) continue;
    const t = ((p[0] - w.a[0]) * d[0] + (p[1] - w.a[1]) * d[1]) / L2;
    if (t < 0 || t > 1) continue;
    const q = [w.a[0] + d[0] * t, w.a[1] + d[1] * t], v = sub(p, q), L = Math.hypot(...v);
    const h = wallThickness(m, w) / 2, dist = L - h;
    if (L > 1e-6 && dist < bd) { bd = dist; best = { q, n: [v[0] / L, v[1] / L], h }; }
  }
  return best;
}

// Place (or re-place) a piece at p: near a wall it turns its back to it and stands against its face.
export function backToWall(m, piece, p, reach = 80) {
  const w = nearestWall(m, p, reach);
  if (!w) { piece.at = [r2(p[0]), r2(p[1])]; return false; }
  // the back is local -y: turned by rot it points (sin rot, -cos rot) - that must be -n
  piece.rot = (Math.round((Math.atan2(-w.n[0], w.n[1]) * 180) / Math.PI) + 360) % 360;
  const off = w.h + piece.size[1] / 2;
  // keep the position along the wall, move across it to the face
  const along = sub(p, w.q), k = along[0] * w.n[0] + along[1] * w.n[1];
  piece.at = [r2(p[0] + w.n[0] * (off - k)), r2(p[1] + w.n[1] * (off - k))];
  return true;
}

export function makePiece(m, kind, p) {
  const piece = { id: uniquePieceId(m, kind), kind, at: [r2(p[0]), r2(p[1])], size: [...(FURNITURE_SIZE[kind] || [60, 60])], rot: 0 };
  backToWall(m, piece, p);
  placePiece(m, piece);
  return piece;
}

export function placePiece(m, piece) {
  const room = roomOf(m, piece.at);
  if (room) piece.room = room; else delete piece.room;
}

// Corners of a piece as placed (cm): its size around `at`, turned by rot.
export function pieceCorners(p) {
  const [w, d] = p.size, a = rad(p.rot || 0), c = Math.cos(a), s = Math.sin(a);
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
    .map(([x, y]) => [p.at[0] + x * c - y * s, p.at[1] + x * s + y * c]);
}

// The topmost piece under p (with a margin of `pad` cm), or -1.
export function pieceAt(m, p, pad = 0) {
  const list = m.furniture || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i], a = rad(-(f.rot || 0)), v = sub(p, f.at);
    const x = v[0] * Math.cos(a) - v[1] * Math.sin(a), y = v[0] * Math.sin(a) + v[1] * Math.cos(a);
    if (Math.abs(x) <= f.size[0] / 2 + pad && Math.abs(y) <= Math.max(f.size[1], 4) / 2 + pad) return i;
  }
  return -1;
}

// Resize handles of a piece: corners and the middles of its sides, [{sx, sy, p}] (sx, sy: -1, 0, 1 in its own axes).
export function pieceHandles(f) {
  const [w, d] = f.size, a = rad(f.rot || 0), c = Math.cos(a), s = Math.sin(a);
  const out = [];
  for (const sx of [-1, 0, 1]) for (const sy of [-1, 0, 1]) {
    if (!sx && !sy) continue;
    const x = (sx * w) / 2, y = (sy * d) / 2;
    out.push({ sx, sy, p: [f.at[0] + x * c - y * s, f.at[1] + x * s + y * c] });
  }
  return out;
}

// Resize by dragging handle (sx, sy) to p: the opposite side stays where it was (from the piece as it
// was when the drag started, `base`); sizes rounded by `round`.
export function resizeTo(f, base, sx, sy, p, round = (v) => v) {
  const a = rad(base.rot || 0), c = Math.cos(a), s = Math.sin(a);
  const v = sub(p, base.at), lx = v[0] * c + v[1] * s, ly = -v[0] * s + v[1] * c; // p in the piece's axes
  const [w0, d0] = base.size;
  const fx = (-sx * w0) / 2, fy = (-sy * d0) / 2; // the fixed side (local)
  const w = sx ? Math.max(5, round(sx * (lx - fx))) : w0;
  const d = sy ? Math.max(5, round(sy * (ly - fy))) : d0;
  const cx = sx ? fx + (sx * w) / 2 : 0, cy = sy ? fy + (sy * d) / 2 : 0;
  f.size = [r2(w), r2(d)];
  f.at = [r2(base.at[0] + cx * c - cy * s), r2(base.at[1] + cx * s + cy * c)];
}

// --- splitting a custom piece into its separate parts --------------------------------------------------------
// The direct children of a custom piece's <g>, clustered: children whose boxes overlap or touch stay together
// (a WC drawn as a cistern and a bowl is one thing; six chairs are six). `boxes`: [x0, y0, x1, y1] per child,
// in the piece's drawing units. -> [[child index, ...], ...]
export function clusters(boxes, touch = 0.6) {
  const parent = boxes.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a[0] <= b[2] + touch && b[0] <= a[2] + touch && a[1] <= b[3] + touch && b[1] <= a[3] + touch) parent[find(i)] = find(j);
  }
  const out = new Map();
  boxes.forEach((_, i) => { const r = find(i); if (!out.has(r)) out.set(r, []); out.get(r).push(i); });
  return [...out.values()];
}

// New custom pieces from parts of piece p: `parts` = [{svg (a <g id> wrapping the part), box: [x0, y0, x1, y1]
// (drawing units, as drawn - before p was moved or turned)}]; k = cm per drawing unit. Each part keeps p's
// turn and moves with it: placed exactly where it was shown.
export function splitPieces(p, parts, k) {
  const a = rad(p.rot || 0), c = Math.cos(a), s = Math.sin(a), o = p.origin || p.at;
  return parts.map((part, i) => {
    const [x0, y0, x1, y1] = part.box;
    const org = [r2(((x0 + x1) / 2) * k), r2(((y0 + y1) / 2) * k)];
    const v = sub(org, o);
    const piece = { id: `${p.id}-${i + 1}`, kind: "custom", at: [r2(p.at[0] + v[0] * c - v[1] * s), r2(p.at[1] + v[0] * s + v[1] * c)],
      origin: org, size: [r2((x1 - x0) * k), r2((y1 - y0) * k)] };
    if (p.rot) piece.rot = p.rot;
    if (p.group) piece.group = p.group;
    if (i === 0 && p.note) piece.note = p.note;
    piece.svg = part.svg;
    return piece;
  });
}

// Turn pieces (indices) by deg around their common middle; a single piece turns in place.
export function turnPieces(m, idx, deg) {
  const list = idx.map((i) => m.furniture[i]);
  const xs = list.flatMap((f) => pieceCorners(f).map((q) => q[0])), ys = list.flatMap((f) => pieceCorners(f).map((q) => q[1]));
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const a = rad(deg), c = Math.cos(a), s = Math.sin(a);
  for (const f of list) {
    if (list.length > 1) { const v = [f.at[0] - cx, f.at[1] - cy]; f.at = [r2(cx + v[0] * c - v[1] * s), r2(cy + v[0] * s + v[1] * c)]; }
    f.rot = (((Math.round((f.rot || 0) + deg)) % 360) + 360) % 360;
    placePiece(m, f);
  }
}

// Drawing order: move the pieces `idx` to the front / back, or one step up / down (past the next other piece).
export function reorder(m, idx, how) {
  const list = m.furniture, sel = new Set(idx);
  const picked = list.filter((_, i) => sel.has(i)), rest = list.filter((_, i) => !sel.has(i));
  if (how === "front") m.furniture = [...rest, ...picked];
  else if (how === "back") m.furniture = [...picked, ...rest];
  else {
    // one step: the block jumps over the nearest other piece above (up) or below (down)
    const first = Math.min(...idx), last = Math.max(...idx);
    const at = how === "up" ? rest.findIndex((f) => list.indexOf(f) > last) : -1;
    let pos;
    if (how === "up") pos = at < 0 ? rest.length : at + 1;
    else { let b = -1; rest.forEach((f, j) => { if (list.indexOf(f) < first) b = j; }); pos = Math.max(0, b); }
    m.furniture = [...rest.slice(0, pos), ...picked, ...rest.slice(pos)];
  }
  return m.furniture.map((f, i) => (picked.includes(f) ? i : -1)).filter((i) => i >= 0);
}
