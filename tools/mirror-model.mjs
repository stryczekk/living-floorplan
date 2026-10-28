#!/usr/bin/env node
// Mirror a house model left <-> right (model v2): every point, angle, box and side.
//   node tools/mirror-model.mjs <in.json> <out.json>
// The x axis is mirrored about the middle of the ground floor's walls, so every floor stays
// over the one below. Sides flip (a door's swing, the outside of a wall), east and west swap.
import { readFileSync, writeFileSync } from "node:fs";

export function mirrorModel(model) {
  const m = JSON.parse(JSON.stringify(model));
  const xs = (m.walls || []).flatMap((w) => [w.a[0], w.b[0]]);
  const C = Math.min(...xs) + Math.max(...xs);
  const X = (x) => Math.round((C - x) * 100) / 100;
  const pt = (p) => (Array.isArray(p) && typeof p[0] === "number" ? [X(p[0]), ...p.slice(1)] : p);
  // an angle counted from up, clockwise (bulbs, beams, furniture): mirrored about the vertical
  const ang = (a) => (typeof a === "number" ? (360 - a) % 360 : a);
  const box = (r) => (Array.isArray(r) && r.length === 4 ? [X(r[0] + r[2]), r[1], r[2], r[3]] : r);
  const side = (s) => (s === "left" ? "right" : s === "right" ? "left" : s);
  const FACADE = { E: "W", W: "E", NE: "NW", NW: "NE", SE: "SW", SW: "SE", east: "west", west: "east" };
  const floor = (f) => {
    for (const w of f.walls || []) {
      w.a = pt(w.a); w.b = pt(w.b);
      for (const o of w.openings || []) {
        if (o.outside) o.outside = side(o.outside);
        // a sliding window's sashes sit either side of the axis: the other side once mirrored
        for (const sa of Object.values(o.sashes || {})) if (typeof sa.offset === "number") sa.offset = -sa.offset;
        if (o.swing) o.swing = side(o.swing);
        if (o.facade && FACADE[o.facade]) o.facade = FACADE[o.facade];
      }
    }
    for (const d of f.dividers || []) { d.a = pt(d.a); d.b = pt(d.b); }
    for (const r of f.rooms || []) { if (r.at) r.at = pt(r.at); if (r.label) r.label = pt(r.label); if (r.points) r.points = r.points.map(pt); }
    for (const l of f.lights || []) {
      if (l.at) l.at = pt(l.at);
      if (l.bulbs) l.bulbs = l.bulbs.map((b) => { const q = pt(b); if (typeof q[2] === "number") q[2] = ang(q[2]); return q; });
      if (l.rail) l.rail = l.rail.map(pt);
      if (l.strip) l.strip = box(l.strip);
      if (l.beam_dir !== undefined) l.beam_dir = ang(l.beam_dir);
    }
    for (const d of [...(f.devices || []), ...(f.cameras || []), ...(f.climate || []), ...(f.locks || [])]) {
      if (d.at) d.at = pt(d.at);
      if (d.hit) d.hit = box(d.hit);
      if (d.glow && d.glow.at) d.glow.at = pt(d.glow.at);
      if (d.labels && d.labels.at) d.labels.at = pt(d.labels.at);
      // cameras and sensor fans count from the x axis (0 = right), the rest from up
      if (d.direction !== undefined) d.direction = (540 - d.direction) % 360;
      for (const k of ["beam_dir", "rot"]) if (d[k] !== undefined) d[k] = ang(d[k]);
    }
    for (const p of f.furniture || []) { p.at = pt(p.at); if (p.rot !== undefined) p.rot = ang(p.rot); }
  };
  floor(m);
  for (const f of m.floors || []) floor(f);
  if (Array.isArray(m.canvas && m.canvas.margin)) { const [t, r, b, l] = m.canvas.margin; m.canvas.margin = [t, l, b, r]; }
  return m;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error("usage: node tools/mirror-model.mjs <in.json> <out.json>"); process.exit(2); }
  writeFileSync(out, JSON.stringify(mirrorModel(JSON.parse(readFileSync(src, "utf8")))));
  console.log(out);
}
