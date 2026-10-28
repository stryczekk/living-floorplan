// Realistic light: every bulb lights what it can see. Walls cast shadows,
// light spills through open doorways, windows and closed doors stop it.
//
// Everything here works in plan (SVG) units on the lowered model (generator
// model-v2 lowerV2), so the polygons sit in the same group as the drawing.

const EPS = 1e-4;

// Light reach per fixture kind, in cm (converted with canvas.cm_per_svg).
export const REACH_CM = { ceiling: 330, rail: 300, wall: 230, night: 90, strip: 200, main: 380 };

// Wall pieces (rectangles [x, y, w, h] or polygons), window lines and the
// doorways of doors listed as closed -> segments [x1, y1, x2, y2].
// Wall pieces as polygons (rectangles [x, y, w, h] turned into four corners).
export function wallPolygons(model) {
  const out = [];
  for (const list of Object.values(model.walls || {})) {
    for (const r of list || []) {
      if (Array.isArray(r[0])) out.push(r);
      else { const [x, y, w, h] = r; out.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
    }
  }
  return out;
}

export function obstacles(model, closedDoors = new Set()) {
  const segs = [];
  const poly = (pts) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > EPS) segs.push([a[0], a[1], b[0], b[1]]);
    }
  };
  const walls = model.walls || {};
  for (const list of Object.values(walls)) {
    for (const r of list || []) {
      if (Array.isArray(r[0])) poly(r);
      else { const [x, y, w, h] = r; poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
    }
  }
  for (const w of model.windows || []) {
    const lines = w.line ? [w.line] : [];
    for (const s of Object.values(w.sashes || {})) { const l = Array.isArray(s) ? s : s && s.line; if (l) lines.push(l); }
    for (const [a, b] of lines) segs.push([a[0], a[1], b[0], b[1]]);
  }
  for (const d of model.doors || []) {
    // doors drawn as lines (sliding, pocket, garage): the lines, when the door is closed; a pocket is inside the wall
    if (d.lines && !d.pocket) {
      if (d.exterior || closedDoors.has(d.id)) for (const [a, b] of d.lines) segs.push([a[0], a[1], b[0], b[1]]);
      continue;
    }
    if (!d.hinge || !d.closed) continue;
    if (d.exterior || closedDoors.has(d.id)) segs.push([d.hinge[0], d.hinge[1], d.closed[0], d.closed[1]]);
  }
  return segs;
}

// Distance from a point to a segment, and the nearest point on it.
function nearest(px, py, s) {
  const dx = s[2] - s[0], dy = s[3] - s[1];
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / len2));
  const x = s[0] + t * dx, y = s[1] + t * dy;
  return { d: Math.hypot(px - x, py - y), x, y };
}

// A bulb on a wall face (wall lights, a strip along a wall) would see straight
// into the wall: move it off the nearest wall by `gap` units.
// A bulb drawn on the wall's axis sits inside the wall: out through the nearest face.
export function outOfWalls(px, py, polys, gap = 2.5) {
  for (const pts of polys) {
    if (!inside(px, py, pts)) continue;
    let best = null;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const n = nearest(px, py, [a[0], a[1], b[0], b[1]]);
      if (!best || n.d < best.d) best = n;
    }
    if (!best) continue;
    const dx = best.x - px, dy = best.y - py, l = Math.hypot(dx, dy) || 1;
    return [best.x + (dx / l) * gap, best.y + (dy / l) * gap];
  }
  return [px, py];
}

export function nudge(px, py, segs, gap = 2.5) {
  let best = null;
  for (const s of segs) {
    const n = nearest(px, py, s);
    if (!best || n.d < best.d) best = n;
  }
  if (!best || best.d >= gap) return [px, py];
  let nx = px - best.x, ny = py - best.y, l = Math.hypot(nx, ny);
  if (l < EPS) return [px, py];
  return [best.x + (nx / l) * gap, best.y + (ny / l) * gap];
}

// Point inside a polygon (even-odd).
function inside(px, py, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// The area a point light at (px, py) sees within radius R: a polygon sorted
// by angle. Rays go to every segment end near the light (and a hair to each
// side, to slip past corners) and at `steps` even angles for the round edge.
// `beam` = { dir, angle } in degrees (0 = +x, clockwise on screen) limits the
// light to a fan, e.g. a cabinet lit from its back wall.
export function visibility(px, py, segs, R, steps = 72, beam = null) {
  const near = segs.filter((s) => nearest(px, py, s).d < R);
  let angles = [];
  for (let i = 0; i < steps; i++) angles.push((i / steps) * Math.PI * 2 - Math.PI);
  const inBeam = (a) => {
    if (!beam) return true;
    let d = ((a * 180) / Math.PI - beam.dir) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return Math.abs(d) <= beam.angle / 2;
  };
  for (const s of near) {
    for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) {
      if (Math.hypot(x - px, y - py) > R * 1.05) continue;
      const a = Math.atan2(y - py, x - px);
      angles.push(a - 2e-4, a, a + 2e-4);
    }
  }
  if (beam) {
    const e = (beam.dir * Math.PI) / 180, h = (beam.angle * Math.PI) / 360;
    for (const a of [e - h, e + h]) angles.push(Math.atan2(Math.sin(a), Math.cos(a)));
    angles = angles.filter(inBeam);
    // the fan starts at the light, from its first edge round to the other
    const start = Math.atan2(Math.sin(e - h), Math.cos(e - h));
    const norm = (a) => (a - start + 4 * Math.PI) % (2 * Math.PI);
    angles.sort((a, b) => norm(a) - norm(b));
  } else angles.sort((a, b) => a - b);
  const out = beam ? [[px, py]] : [];
  let last = null;
  for (const a of angles) {
    if (last !== null && a - last < 1e-6) continue;
    last = a;
    const dx = Math.cos(a), dy = Math.sin(a);
    let t = R;
    for (const s of near) {
      const ex = s[2] - s[0], ey = s[3] - s[1];
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const qx = s[0] - px, qy = s[1] - py;
      const tt = (qx * ey - qy * ex) / den;
      const u = (qx * dy - qy * dx) / den;
      if (tt > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 && tt < t) t = tt;
    }
    out.push([px + dx * t, py + dy * t]);
  }
  return out;
}

// Bulbs of the lowered model, per light entity: [{ entity, kind, x, y, R, watts }].
export function bulbsOf(model) {
  const k = (model.canvas && model.canvas.cm_per_svg) || 1;
  const out = [];
  const reach = (kind, watts) => {
    let cm = REACH_CM[kind] || REACH_CM.ceiling;
    // brighter lamps reach a bit further: 10 W as the reference, square root of the ratio
    if (Number(watts) > 0) cm *= Math.max(0.7, Math.min(1.3, Math.sqrt(Number(watts) / 10)));
    return cm / k;
  };
  for (const l of model.lights || []) {
    if (l.type === "fixture") {
      for (const c of l.circuits || []) {
        if (!c.entity) continue;
        const at = c.at || l.at;
        if (at) out.push({ entity: c.entity, kind: "main", x: at[0], y: at[1], R: reach("main", c.watts), watts: c.watts });
      }
      continue;
    }
    if (!l.entity) continue;
    let pts = (l.bulbs && l.bulbs.length ? l.bulbs : l.rail || []).filter((b) => Array.isArray(b));
    if (!pts.length && Array.isArray(l.strip) && l.strip.length === 4) {
      // an LED strip [x, y, w, h]: points along its long side, about every 40 cm
      const [x, y, w, h] = l.strip, along = w >= h;
      const len = along ? w : h, n = Math.max(1, Math.round((len * k) / 40));
      pts = Array.from({ length: n }, (_, i) => (along ? [x + ((i + 0.5) * w) / n, y + h / 2] : [x + w / 2, y + ((i + 0.5) * h) / n]));
    }
    const beam = l.beam > 0 && l.beam < 360 ? { dir: (l.beam_dir || 0) - 90, angle: l.beam } : null;
    // a lamp's power is shared by its bulbs
    const per = Number(l.watts) > 0 && pts.length ? Number(l.watts) / pts.length : null;
    for (const b of pts) out.push({ entity: l.entity, kind: l.kind || "ceiling", x: b[0], y: b[1], R: reach(l.kind, per), watts: per, beam });
  }
  return out;
}

const fmt = (v) => (Math.round(v * 10) / 10).toString();

// SVG for the light field: one <g class="lf"> per light entity, a path per
// bulb filled with its own radial gradient. Opacity is set later per state.
export function lightLayer(model, { closedDoors = new Set(), idPrefix = "lf" } = {}) {
  const segs = obstacles(model, closedDoors);
  const polys = wallPolygons(model);
  const bulbs = bulbsOf(model);
  const groups = new Map();
  bulbs.forEach((b, i) => {
    const [x0, y0] = outOfWalls(b.x, b.y, polys);
    const [x, y] = b.beam ? [x0, y0] : nudge(x0, y0, segs);
    const poly = visibility(x, y, segs, b.R, 72, b.beam);
    if (poly.length < 3) return;
    const id = idPrefix + "-g" + i;
    // the colour comes from the lamp's group (--fc-light-color, set from rgb_color / colour temperature)
    const stop = (o, a) => `<stop offset="${o}" style="stop-color: var(--fc-light-color, #ffcf73)" stop-opacity="${a}"/>`;
    const grad = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(b.R)}">` +
      stop(0, 0.72) + stop(0.35, 0.32) + stop(1, 0) + `</radialGradient>`;
    const d = "M" + poly.map((p) => fmt(p[0]) + " " + fmt(p[1])).join(" L") + " Z";
    if (!groups.has(b.entity)) groups.set(b.entity, { defs: [], paths: [] });
    groups.get(b.entity).defs.push(grad);
    groups.get(b.entity).paths.push(`<path d="${d}" fill="url(#${id})"/>`);
  });
  // the gradients live inside their lamp's group, so they inherit its colour
  const body = [...groups].map(([entity, g]) =>
    `<g class="lf" data-lf="${entity.replace(/"/g, "&quot;")}"><defs>${g.defs.join("")}</defs>${g.paths.join("")}</g>`).join("");
  return `<g id="light-field" pointer-events="none">${body}</g>`;
}

export const _test = { inside, nearest };
