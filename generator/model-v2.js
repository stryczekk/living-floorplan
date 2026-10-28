// House model v2: walls as centre lines with a thickness, openings ON walls,
// everything in centimetres. lowerV2() turns it into the v1 shape (SVG units,
// walls as ready rectangles, windows/doors as lines) that floorplan-model.js
// draws - one drawing code for both.
//
// Wall geometry rules (the editor relies on them):
//  - a wall is a segment a -> b with `thickness` (default from wall_types);
//  - walls meet at NODES: an end equal to another wall's end (corner, or more
//    walls at one point) or lying on another wall's centre line (a T). At a
//    node the faces of neighbouring walls are cut where they cross (a mitre),
//    so any angle - 90, 45, anything - closes cleanly; a T stops at the
//    other wall's near face. A free end (e.g. a jamb) is cut square;
//  - openings cut the wall between `from` and `to` (cm along a -> b):
//      window, hst (sliding window: two sashes offset across the wall),
//      balcony_door (window + leaf), door, double_door, sliding_door,
//      garage_door, passage, corner_window (to the wall's end, the corner glazed:
//      corner "from" | "to"), pocket_door (slides into the wall on its hinge side), double_gate. Doors: hinge "from" | "to", swing "left" | "right";
//      exterior openings: facade and outside ("left" | "right" side of the wall).
//  - "left" of a wall = the side of the normal (-dy, dx) of a -> b; offsets and
//    door swing sides are signed along it.

export const CM_PER_SVG_DEFAULT = 30 / 17; // 17 SVG units = 30 cm (the original drawing)
import { gardenPoints } from "./garden.js";
import { faceAt, inset } from "./rooms.js";

const EPS = 0.05; // cm
const WALL_GROUP = { exterior: "exterior", load_bearing: "interior", partition: "interior", chimney: "fireplace" };

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => mul(a, 1 / len(a));
const near = (a, b, e = EPS) => len(sub(a, b)) <= e;

export function wallThickness(model, w) {
  return w.thickness ?? (model.wall_types?.[w.type]?.thickness) ?? 12;
}

const cross = (a, b) => a[0] * b[1] - a[1] * b[0];

// Directions leaving point p along walls: own ends at p, and both directions of
// a wall passing through p. -> [{d, h, group, through}] (unit direction, half
// thickness, drawing group, true for a wall passing through)
function spokes(model, p, self) {
  const out = [];
  for (const o of model.walls) {
    if (o === self) continue;
    const v = sub(o.b, o.a), L = len(v);
    if (L < EPS) continue;
    const u = mul(v, 1 / L), h = wallThickness(model, o) / 2, group = WALL_GROUP[o.type] || "interior";
    if (near(o.a, p)) out.push({ d: u, h, group });
    else if (near(o.b, p)) out.push({ d: mul(u, -1), h, group });
    else {
      const t = dot(sub(p, o.a), u);
      if (t > EPS && t < L - EPS && len(sub(sub(p, o.a), mul(u, t))) <= EPS) out.push({ d: u, h, group, through: true }, { d: mul(u, -1), h, group, through: true });
    }
  }
  return out;
}

// Line p + d*s crossed with line q + e*r -> s (or null when parallel)
function meet(p, d, q, e) {
  const c = cross(d, e);
  if (Math.abs(c) < 1e-9) return null;
  return cross(sub(q, p), e) / c;
}

// Where the two faces of wall `w` end at its end `end` ("a" | "b"), as
// positions along a -> b (cm from a): {left, right} (left = normal (-dy, dx)).
export function wallEnds(model, w, end) {
  const P = w[end];
  const L = len(sub(w.b, w.a));
  const u = unit(sub(w.b, w.a));
  const h = wallThickness(model, w) / 2;
  const d = end === "a" ? u : mul(u, -1);
  const base = end === "a" ? 0 : L;
  const flat = { left: base, right: base };
  const others = spokes(model, P, w);
  if (!others.length) return flat;
  const ang = (x) => Math.atan2(x[1], x[0]);
  const all = [{ d, h, own: true }, ...others].sort((x, y) => ang(x.d) - ang(y.d));
  const i = all.findIndex((x) => x.own);
  const next = all[(i + 1) % all.length], prev = all[(i - 1 + all.length) % all.length];
  const Ln = (x) => [-x[1], x[0]];
  const own = Ln(d);
  // own +h face meets next's -h face; own -h face meets prev's +h face (a
  // mitre). At a corner with a wall of ANOTHER drawing group (separate SVG
  // paths) the face runs on to that wall's far face instead (the farther of
  // its two faces) - overlapping, because two paths touching along a mitre
  // leave an anti-aliasing seam.
  const group = WALL_GROUP[w.type] || "interior";
  const face = (off, nb, sign) => {
    const at = (k) => meet(add(P, mul(own, off)), d, add(P, mul(Ln(nb.d), k * nb.h)), nb.d);
    if (nb.through || nb.group === group) return at(sign);
    const x = at(1), y = at(-1);
    return x === null || y === null ? null : Math.min(x, y);
  };
  const sPlus = face(h, next, -1);
  const sMinus = face(-h, prev, 1);
  const lim = 4 * Math.max(h, next.h, prev.h); // very sharp angles: no endless spikes
  const ok = (s) => s !== null && Math.abs(s) <= lim;
  // along d from P -> along u from a
  const toU = (s) => (end === "a" ? s : L - s);
  const plus = ok(sPlus) ? toU(sPlus) : base, minus = ok(sMinus) ? toU(sMinus) : base;
  // +h face of the end's own frame: global left at a, global right at b
  return end === "a" ? { left: plus, right: minus } : { left: minus, right: plus };
}

// Solid pieces of a wall (minus openings) as polygons in cm.
export function wallPolygons(model, w) {
  const u = unit(sub(w.b, w.a)), n = [-u[1], u[0]];
  const h = wallThickness(model, w) / 2;
  const A = wallEnds(model, w, "a"), B = wallEnds(model, w, "b");
  // a corner window at an end of the wall takes the wall's corner with it (glass round the corner)
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const cuts = (w.openings || []).map((o) => [o.from, o.to, o.type === "corner_window" ? o.corner : null]).sort((x, y) => x[0] - y[0]);
  const ranges = []; // [[l0, l1], [r0, r1]]
  let cur = [A.left, A.right];
  for (const [f, t, c] of cuts) {
    // (a stub of the wall before it - drawn past the corner - goes with the corner)
    if (!(c === "from" && f <= 2 * h + 0.5)) ranges.push([[cur[0], f], [cur[1], f]]);
    cur = [t, t];
  }
  const last = cuts[cuts.length - 1];
  if (!(last && last[2] === "to" && last[1] >= L - 2 * h - 0.5)) ranges.push([[cur[0], B.left], [cur[1], B.right]]);
  const Lp = (s) => add(add(w.a, mul(u, s)), mul(n, h));
  const Rp = (s) => add(add(w.a, mul(u, s)), mul(n, -h));
  return ranges
    .filter(([l, r]) => l[1] - l[0] > 1e-6 || r[1] - r[0] > 1e-6)
    .map(([l, r]) => [Lp(l[0]), Lp(l[1]), Rp(r[1]), Rp(r[0])]);
}


// The light of a lamp or device turned to one side: a wedge of `angle` degrees
// around `rot` (0 = up / -y, clockwise - the bulb icon's rotation), from c out
// to R. Glows are clipped to it (and to their room). [] for all around (360).
export const BEAM_REACH = 5000; // cm - far past any glow
export function beamWedge(c, rot, angle, R = BEAM_REACH) {
  if (!(angle > 0 && angle < 360)) return [];
  const mid = (rot ?? 0) - 90, n = Math.max(2, Math.ceil(angle / 5));
  const pts = [c];
  for (let i = 0; i <= n; i++) {
    const a = ((mid - angle / 2 + (angle * i) / n) * Math.PI) / 180;
    pts.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]);
  }
  return pts;
}

// The frame of the plan: the outline of the walls as shown (after canvas.rotate)
// plus canvas.margin - cm, one number or [top, right, bottom, left] on the shown
// plan; default 100. -> {viewBox (shown, SVG units), sheet (the background,
// in the drawing's own coordinates, under the rotation)}.
export const FRAME_MARGIN = 100;
export function frame(m) {
  const k = 1 / (m.canvas.cm_per_svg || CM_PER_SVG_DEFAULT);
  // the walls, and the garden round them (a plot is part of the picture)
  let pts = [...(m.walls || []).flatMap((w) => wallPolygons(m, w).flat()), ...gardenPoints(m.garden)];
  if (!pts.length) pts = [[0, 0], [1000, 1000]];
  const a = ((m.canvas.rotate || 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const turn = (p, s = 1) => [p[0] * cos - s * p[1] * sin, s * p[0] * sin + p[1] * cos];
  const box = (q) => {
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const [x0, y0, x1, y1] = box(pts.map((p) => turn([p[0] * k, p[1] * k])));
  const mg = m.canvas.margin ?? FRAME_MARGIN;
  const [t, r, b, l] = (Array.isArray(mg) ? mg : [mg, mg, mg, mg]).map((v) => v * k);
  const r2 = (v) => Math.round(v * 100) / 100;
  const viewBox = [x0 - l, y0 - t, x1 - x0 + l + r, y1 - y0 + t + b].map(r2);
  // the background: the frame turned back into the drawing, a unit bigger all round
  const [vx, vy, vw, vh] = viewBox;
  const [sx0, sy0, sx1, sy1] = box([[vx, vy], [vx + vw, vy], [vx, vy + vh], [vx + vw, vy + vh]].map((p) => turn(p, -1)));
  return { viewBox, sheet: [sx0 - 1, sy0 - 1, sx1 - sx0 + 2, sy1 - sy0 + 2].map(r2) };
}

// Floors: the model itself is the ground floor; `floors: [{id, name, walls, rooms, ...}]` are the
// ones above it, in order, each with its own lists (canvas and wall types are shared).
// floorModel(m, i): floor i as a model of its own (i < 0: the ground floor, without `floors`).
export function floorModel(m, i) {
  if (i === undefined || i < 0 || !m.floors || !m.floors[i]) { const { floors, ...g } = m; return g; }
  const { id, name, ...lists } = m.floors[i];
  return { version: m.version, canvas: m.canvas, wall_types: m.wall_types, ...lists };
}
export const floorIndex = (m, id) => (id === undefined || id === null ? -1 : (m.floors || []).findIndex((f) => f.id === id));

// v2 (cm) -> v1 (SVG units) for floorplan-model.js.
export function lowerV2(m) {
  const k = 1 / (m.canvas.cm_per_svg || CM_PER_SVG_DEFAULT); // svg units per cm
  const P = (p) => [p[0] * k, p[1] * k];
  const S = (v) => (v === undefined ? undefined : v * k);
  const v1 = { version: 1, canvas: { contract: 2, rotate: 0, ...m.canvas } };
  m = { rooms: [], walls: [], lights: [], covers: [], ...m };
  // rooms: drawn by hand (points) or found from the walls around `at`; rooms
  // split only by dividers share a zone (lights glow across the whole zone)
  const zones = (m.zones || []).map((z) => ({ ...z }));
  const rooms = [];
  for (const r of m.rooms) {
    if (r.points) { rooms.push(r); continue; }
    if (!r.at) continue;
    const f = faceAt(m, r.at);
    if (!f) continue; // not enclosed (yet) - skipped
    const room = { ...r, points: inset(f), label: r.label || r.at };
    const whole = faceAt(m, r.at, { withDividers: "light" }); // the glow zone: walls + light-stopping boundaries
    if (whole && Math.abs(whole.area - f.area) > 1) {
      const zkey = whole.pts.map((q) => q.join(",")).sort().join(";");
      let z = zones.find((x) => x._key === zkey);
      if (!z) zones.push((z = { id: "zone-" + r.id, points: inset(whole), _key: zkey }));
      room.zone = z.id;
    }
    rooms.push(room);
  }
  v1.rooms = rooms.map((r) => ({ ...r, points: r.points.map(P), label: r.label && P(r.label) }));
  v1.dividers = (m.dividers || []).filter((d) => d.show).map((d) => ({ ...d, a: P(d.a), b: P(d.b) }));
  v1.zones = zones.map(({ _key, ...z }) => ({ ...z, points: z.points.map(P) }));
  v1.clips = (m.clips || []).map((c) => (c.rect ? { ...c, rect: c.rect.map((v) => v * k) } : { ...c, points: c.points.map(P) }));

  v1.walls = { exterior: [], interior: [], fireplace: [] };
  v1.windows = [];
  v1.doors = [];
  for (const w of m.walls) {
    const group = WALL_GROUP[w.type] || "interior";
    const u = unit(sub(w.b, w.a));
    const nrm = [-u[1], u[0]];
    for (const poly of wallPolygons(m, w)) v1.walls[group].push(poly.map(P));
    const at = (s, off = 0) => add(add(w.a, mul(u, s)), mul(nrm, off));
    const exterior = w.type === "exterior";
    // the side of the wall that is outside (exterior walls): "left" = along the
    // normal (-dy, dx); the cover icons go to the other side
    const inward = o_ => (o_.outside ? mul(nrm, o_.outside === "left" ? -1 : 1) : undefined);
    const ext = (o_) => (exterior ? { exterior: true, facade: o_.facade } : {});
    // one door leaf hinged at `hs`, closing towards `cs`, swinging to `side`
    const leafAt = (id, hs, cs, width, side) => {
      const face = wallThickness(m, w) / 2 * side;
      const hinge = at(hs, face), closed = at(cs, face);
      const leaf = add(hinge, mul(nrm, width * side));
      const cr = sub(closed, hinge), lf = sub(leaf, hinge);
      return { id, hinge: P(hinge), leaf: P(leaf), closed: P(closed), sweep: cr[0] * lf[1] - cr[1] * lf[0] > 0 ? 1 : 0 };
    };
    for (const o of w.openings || []) {
      const width = o.to - o.from;
      const side = o.swing === "left" ? 1 : -1;
      const hs = o.hinge === "to" ? o.to : o.from, cs = o.hinge === "to" ? o.from : o.to;
      // panes (sashes) and contact sensors: one for the whole opening or one per pane
      const panes = { panes: o.panes, contacts: o.contacts, tick: wallThickness(m, w) / 2 * k };
      const contact = (o.contacts || [])[0];
      if (o.type === "window" || o.type === "corner_window") {
        // a corner window: the glass meets its other half on the other wall's centre line (a wall drawn
        // to the outer corner would otherwise run its glass past it)
        let g0 = o.from, g1 = o.to;
        const pw = o.type === "corner_window" && o.pair && m.walls.find((x) => x !== w && (x.openings || []).some((y) => y.id === o.pair));
        if (pw) {
          const e = sub(pw.b, pw.a), c = u[0] * e[1] - u[1] * e[0];
          if (Math.abs(c) > 1e-9) {
            const sc = ((pw.a[0] - w.a[0]) * e[1] - (pw.a[1] - w.a[1]) * e[0]) / c;
            if (o.corner === "to") g1 = sc; else g0 = sc;
          }
        }
        v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), line: [P(at(g0)), P(at(g1))], ...panes });
      } else if (o.type === "hst") {
        const sashes = {};
        for (const [name, sa] of Object.entries(o.sashes)) sashes[name] = [P(at(sa.from, sa.offset)), P(at(sa.to, sa.offset))];
        v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), type: "hst", width: width * k, sashes, contacts: o.contacts });
      } else if (o.type === "door") {
        v1.doors.push({ ...leafAt(o.id, hs, cs, width, side), ...ext(o), contact });
      } else if (o.type === "double_door" || o.type === "double_gate") {
        // two leaves of half the width, hinged at both jambs, meeting in the middle
        const mid = (o.from + o.to) / 2;
        v1.doors.push({ ...leafAt(o.id + "-1", o.from, mid, width / 2, side), ...ext(o), contact });
        v1.doors.push({ ...leafAt(o.id + "-2", o.to, mid, width / 2, side), ...ext(o), contact });
      } else if (o.type === "balcony_door") {
        // glazed: a window line plus one leaf (it can carry a cover like a window)
        v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), line: [P(at(o.from)), P(at(o.to))], ...panes });
        v1.doors.push({ ...leafAt(o.id + "-leaf", hs, cs, width, side), ...ext(o), contact });
      } else if (o.type === "sliding_door") {
        // the leaf on the swing-side face, and its track shifted by half the
        // width towards the side it slides to (the hinge end)
        const face = wallThickness(m, w) / 2 * side, track = face + 4 * side;
        const dir = o.hinge === "to" ? 1 : -1;
        v1.doors.push({ id: o.id, lines: [[P(at(o.from, face)), P(at(o.to, face))],
          [P(at(o.from + dir * width / 2, track)), P(at(o.to + dir * width / 2, track))]], width: width * k, ...ext(o), contact });
      } else if (o.type === "pocket_door") {
        // the leaf across the opening, and the pocket in the wall it slides into (dashed, past its hinge end)
        const dir = o.hinge === "to" ? 1 : -1, end = o.hinge === "to" ? o.to : o.from;
        v1.doors.push({ id: o.id, lines: [[P(at(o.from)), P(at(o.to))]], width: width * k, ...ext(o), contact });
        v1.doors.push({ id: o.id + "-pocket", lines: [[P(at(end)), P(at(end + dir * width))]], dashed: true, width: width * k, pocket: true });
      } else if (o.type === "garage_door") {
        // an overhead door: dashed line along the axis
        v1.doors.push({ id: o.id, lines: [[P(at(o.from)), P(at(o.to))]], dashed: true, width: width * k, ...ext(o), contact });
      }
      // "passage": just the gap in the wall
    }
  }

  v1.covers = m.covers;
  if (!v1.canvas.viewBox) {
    // the frame follows the walls: a fixed viewBox in the model is a manual override
    const f = frame(m);
    v1.canvas.viewBox = f.viewBox;
    v1.canvas.sheet = f.sheet;
  }
  delete v1.canvas.margin;
  const bulb = (b) => [b[0] * k, b[1] * k, ...b.slice(2)];
  // a beam narrower than all around: its wedge becomes a clip of the glow
  const beamClip = (id, c, rot, angle) => {
    const w = beamWedge(c, rot, angle);
    if (!w.length) return undefined;
    v1.clips.push({ id, points: w.map(P) });
    return id;
  };
  const beamGlows = (l) => {
    // a beam narrower than all around: for the whole light, or a bulb's own (its 4th value)
    const narrow = (a) => a > 0 && a < 360;
    if (!(narrow(l.beam) || (l.bulbs || []).some((b) => narrow(b[3]))) || l.glows) return l.glows && l.glows.map((g) => ({ ...g, at: P(g.at), r: S(g.r) }));
    const r = S(l.glow_r);
    if (l.bulbs && l.bulbs.length) return l.bulbs.map((b, i) =>
      ({ at: P(b), r, clip: beamClip(`beam-${l.id}${l.bulbs.length > 1 ? "-" + (i + 1) : ""}`, b, b[2], b[3] ?? l.beam) }));
    if (l.strip) {
      const c = [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2];
      return [{ at: P(c), r, clip: beamClip(`beam-${l.id}`, c, l.beam_dir, l.beam) }];
    }
    return undefined;
  };
  v1.lights = m.lights.map((l) => l.type === "fixture"
    ? { ...l, at: P(l.at), circuits: l.circuits.map((c) => ({ ...c, r: S(c.r) })) }
    : { ...l, bulbs: l.bulbs && l.bulbs.map(bulb), rail: l.rail && l.rail.map(P), strip: l.strip && l.strip.map((v) => v * k),
        glow_r: S(l.glow_r), glows: beamGlows(l) });
  v1.devices = (m.devices || []).map((d) => ({ ...d,
    clip: d.clip || (d.glow && beamClip(`beam-${d.id}`, d.glow.at, d.beam_dir, d.beam)),
    at: d.at && P(d.at), hit: d.hit && d.hit.map((v) => v * k),
    glow: d.glow && { at: P(d.glow.at), r: S(d.glow.r), rx: S(d.glow.rx), ry: S(d.glow.ry) }, range: S(d.range),
    labels: d.labels && { ...d.labels, at: P(d.labels.at) } }));
  v1.climate = (m.climate || []).map((c) => ({ ...c, at: P(c.at) }));
  v1.cameras = (m.cameras || []).map((c) => ({ ...c, at: P(c.at), range: S(c.range) }));
  v1.locks = (m.locks || []).map((l) => ({ ...l, at: P(l.at) }));
  // the garden: points to plan units (sizes stay cm, garden.js scales them)
  if (m.garden) v1.garden = m.garden.map((g) => ({ ...g, points: g.points && g.points.map(P), line: g.line && g.line.map(P), at: g.at && P(g.at) }));
  // notes: text sizes in cm too
  if (m.notes) v1.notes = m.notes.map((x) => ({ ...x, at: x.at && P(x.at), from: x.from && P(x.from), to: x.to && P(x.to),
    size: x.type === "text" ? S(x.size || 24) : undefined }));
  // furniture: positions and sizes to SVG units (a custom piece's drawing already is)
  if (m.furniture) v1.furniture = m.furniture.map((p) => ({ ...p, at: P(p.at), origin: p.origin && P(p.origin),
    size: p.size && p.size.map((v) => v * k) }));
  return v1;
}
