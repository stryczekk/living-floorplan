// Floor plan generator: house model (JSON) -> SVG for a Home Assistant floor plan card.
//
// One source of truth for the plan: a house model (JSON, see README) describes
// rooms, walls, openings and devices; this module draws them. No dependencies,
// plain string output - runs in Node (tools/build-svg.mjs) and in a browser
// (editor/).
//
// Coordinates are plan units (canvas.scale units = 1 m), x to the east,
// y to the south, BEFORE canvas.rotate - the whole drawing sits in one group
// rotated by canvas.rotate, so the model never deals with the screen
// orientation. Angles in degrees, 0 = +x, positive = clockwise (SVG).
//
// The ids, classes and data-* attributes a card reads come from the name table
// (names.js) - pass `names` to match another card's vocabulary. Changing the
// structure = bump canvas.contract and the card's contract constant together.

import { furnitureLayer, stairVoids } from "./furniture.js";
import { floorId, floorDefs } from "./floors.js";
import { style, defs } from "./theme.js";
import { resolveNames } from "./names.js";
import { iconDefs, ALARM_KINDS, VALUE_KINDS } from "./icons.js";
import { lowerV2, floorModel, floorIndex } from "./model-v2.js";
import { notesLayer } from "./notes.js";
import { gardenDefs, gardenLayer } from "./garden.js";

export const GENERATOR_VERSION = 1;

// Default glow radius and gradient per light kind.
const GLOW = {
  ceiling: { r: 60, fill: "light-pool" },
  rail: { r: 40, fill: "light-pool" },
  wall: { r: 45, fill: "light-pool" },
  main: { r: 110, fill: "light-pool" },
  night: { r: 22, fill: "night-pool" },
  spot: { r: 80, fill: "light-pool" },
  strip: { r: 50, fill: "light-pool" },
  pendant: { r: 75, fill: "light-pool" },
  floor_lamp: { r: 55, fill: "light-pool" },
  table_lamp: { r: 35, fill: "light-pool" },
  garden_lamp: { r: 45, fill: "light-pool" },
};
// lamps seen from above: a shade round the bulb (r, units), a garden lamp's post (a square)
const SHADES = { pendant: 10, floor_lamp: 9, table_lamp: 7 };
const NIGHT_BULB_SCALE = 0.65;
// Covers: band pushed outwards from the window line so a closed cover does
// not hide the glass; the icon sits inside; slats every ~12 units.
const COVER_OUT = 4.5;
const COVER_ICON_IN = 15;
const COVER_SLAT = 12;
const CAMERA_HIT_R = 22;
// Inward normal of each facade (towards the inside of the house).
const INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };

// Name table of the current generateSvg() call (synchronous, so a module
// variable is enough).
let N;

// Numbers: at most 2 decimals, no trailing zeros, no "-0".
export function n(v) {
  const r = Number(v.toFixed(2)); // toFixed rounds the exact binary value, like Python
  return String(Object.is(r, -0) ? 0 : r);
}
const p = (pt) => n(pt[0]) + "," + n(pt[1]);
const pts = (list) => list.map(p).join(" ");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// Power of a light circuit in W (all its bulbs together), for the energy and cost in the card.
const watts = (w) => (w !== null && w !== undefined && w !== "" && Number.isFinite(Number(w)) && Number(w) >= 0 ? String(Number(w)) : undefined);
const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => ` ${k}="${esc(v)}"`).join("");
const rectPath = ([x, y, w, h]) => `M${n(x)} ${n(y)} h${n(w)} v${n(h)} h${n(-w)} z`;
// a wall piece: a rectangle [x, y, w, h] (model v1) or a polygon [[x, y], ...] (v2)
const piecePath = (r) => (Array.isArray(r[0]) ? "M" + r.map((q) => n(q[0]) + " " + n(q[1])).join(" L") + " z" : rectPath(r));

export function generateSvg(model, { furniture = "", names = null, floor = null } = {}) {
  N = resolveNames(names);
  // a house with floors: every floor's SVG lists them all (a card shows a switcher; the floor
  // with id X is the ground floor's file with -X before .svg)
  let floorsAttr = "";
  if (model.version === 2 && model.floors && model.floors.length) {
    const list = [{ id: null, name: model.floor_name || "" }, ...model.floors.map((f) => ({ id: f.id, name: f.name || f.id }))];
    floorsAttr = ` data-floors="${esc(JSON.stringify(list))}"${floor ? ` data-floor="${esc(floor)}"` : ""}`;
  }
  if (model.version === 2) {
    // one floor of the house (null: the ground floor); stairs from the floor below show as voids
    const i = floorIndex(model, floor);
    if (floor !== null && i < 0) throw new Error("no floor " + floor);
    const below = i >= 0 ? floorModel(model, i - 1) : null;
    const fm = floorModel(model, i);
    const voids = stairVoids(below);
    model = lowerV2(voids.length ? { ...fm, furniture: [...(fm.furniture || []), ...voids] } : fm);
  }
  model = { rooms: [], windows: [], doors: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [], ...model };
  model.walls = { exterior: [], interior: [], ...(model.walls || {}) };
  const c = model.canvas;
  const textRot = -c.rotate; // text and icons rotated back to stay upright
  const rooms = new Map(model.rooms.map((r) => [r.id, r]));
  const windows = new Map(model.windows.map((w) => [w.id, w]));
  const clipOf = (roomId) => {
    if (!roomId) return null;
    const r = rooms.get(roomId);
    if (!r) return null; // a room that is not enclosed (yet) - no clipping
    return "clip-" + (r.zone || r.id);
  };
  const out = [];
  const w = (s) => out.push(s);

  w(`<svg xmlns="http://www.w3.org/2000/svg"\n     viewBox="${c.viewBox.map(n).join(" ")}" width="${n(c.viewBox[2])}" height="${n(c.viewBox[3])}"\n     role="img" ${N.attrContract}="${c.contract}" data-generator="${GENERATOR_VERSION}"${floorsAttr}${c.start ? ` data-start="${c.start.map(n).join(" ")}"` : ""}>`);
  w(`  <!-- GENERATED from the house model by generator/floorplan-model.js - do not edit by hand -->`);
  if (c.description) w(`  <desc id="desc">${esc(c.description)}</desc>`);
  w(`  <g id="${N.rotation}" transform="rotate(${n(c.rotate)})">`);
  w(`  <rect id="sheet" x="${n(c.sheet[0])}" y="${n(c.sheet[1])}" width="${n(c.sheet[2])}" height="${n(c.sheet[3])}" fill="#1b2433"/>`);

  // --- the garden round the house (under it) ---------------------------------
  const kcm = 1 / ((model.canvas && model.canvas.cm_per_svg) || 1);
  const garden = gardenLayer(model.garden, kcm);
  if (garden) w(`  <defs>\n${gardenDefs(model.garden, kcm)}\n  </defs>\n` + garden);

  // --- rooms ---------------------------------------------------------------
  // the floor slab and the doorways' floor (under the rooms, the same colour)
  if ((model.slab || []).length || (model.thresholds || []).length) {
    w(`  <g id="slab" fill="#1e2836" stroke="none" pointer-events="none">`);
    for (const t of model.slab || []) w(`    <polygon points="${pts(t)}"/>`);
    for (const t of model.thresholds || []) w(`    <polygon class="threshold" points="${pts(t)}"/>`);
    w(`  </g>`);
  }
  w(`  <g id="rooms" fill="#1e2836" stroke="none" pointer-events="all">`);
  for (const r of model.rooms) {
    const tint = r.tint && r.tint.entity ? attrs({ [N.attrTintEntity]: r.tint.entity, [N.attrTintKind]: r.tint.kind || "state" }) : "";
    // an unused space (under the roof slopes, a void): darker, the card's tints do not apply
    const unused = r.unused ? ' class="unused" fill="#161d28"' : "";
    // a floor of its own: a pattern in its colour (floors.js)
    const fl = !r.unused && floorId(r.floor);
    w(`    <polygon id="room-${r.id}" data-room="${esc(r.name)}" points="${pts(r.points)}"${tint}${unused}${fl ? ` fill="url(#${fl})"` : ""}/>`);
  }
  w(`  </g>`);

  // --- defs: clip paths from rooms and zones, then the theme ----------------
  w(`  <defs>`);
  for (const k of model.clips || []) {
    if (k.points) { w(`    <clipPath id="clip-${k.id}"><polygon points="${pts(k.points)}"/></clipPath>`); continue; }
    const [x, y, cw, ch] = k.rect;
    w(`    <clipPath id="clip-${k.id}"><rect x="${n(x)}" y="${n(y)}" width="${n(cw)}" height="${n(ch)}"/></clipPath>`);
  }
  for (const r of model.rooms) if (!r.zone) w(`    <clipPath id="clip-${r.id}"><polygon points="${pts(r.points)}"/></clipPath>`);
  for (const z of model.zones || []) w(`    <clipPath id="clip-${z.id}"><polygon points="${pts(z.points)}"/></clipPath>`);
  const icons = iconDefs((model.devices || []).filter((d) => d.type === "icon").map((d) => d.kind));
  const floors = floorDefs(model.rooms.filter((r) => !r.unused && r.floor).map((r) => r.floor), 1 / ((model.canvas && model.canvas.cm_per_svg) || 1));
  w(defs(N) + (icons ? icons + "\n" : "") + (floors ? floors + "\n" : "") + `  </defs>`);
  w("");
  w(style(N));
  w("");

  // --- dividers shown on the plan (dashed): e.g. where the usable attic ends -------
  const shown = (model.dividers || []).filter((d) => d.show);
  if (shown.length) {
    w(`  <g id="dividers" fill="none" stroke="#3a4861" stroke-width="1" stroke-dasharray="6 4" pointer-events="none">`);
    for (const d of shown) w(`    <line x1="${n(d.a[0])}" y1="${n(d.a[1])}" x2="${n(d.b[0])}" y2="${n(d.b[1])}"/>`);
    w(`  </g>`);
  }

  // --- furniture: pieces of the model, or a ready SVG fragment ------------------
  if (Array.isArray(model.furniture) && model.furniture.length) w(furnitureLayer(model.furniture));
  else if (furniture) w(furniture.replace(/\s+$/, ""));

  // --- lights and devices ------------------------------------------------------
  w(`  <g id="lights" fill="#5b6a80" stroke="#5b6a80" stroke-width="0.8">`);
  // Ambient glows (TV, A/C) go UNDER the lamps, state signals (presence,
  // appliances) OVER them - a signal must stay visible.
  const ambient = (d) => d.type === "tv" || d.type === "climate_unit";
  for (const d of (model.devices || []).filter(ambient)) w(device(d, clipOf, textRot));
  for (const l of model.lights) w(l.type === "fixture" ? fixture(l, clipOf, textRot) : light(l, clipOf, textRot));
  for (const d of (model.devices || []).filter((d) => !ambient(d))) w(device(d, clipOf, textRot));
  w(`  </g>`);

  // --- room labels (hidden; the card can show them) ----------------------------
  w(`  <g id="room-labels" display="none" fill="#8ea1ba" font-family="system-ui, sans-serif"\n     font-size="13" text-anchor="middle" dominant-baseline="middle"\n     pointer-events="none">`);
  for (const r of model.rooms) {
    if (!r.label) continue;
    const [x, y] = r.label;
    w(`    <text id="label-${r.id}" x="${n(x)}" y="${n(y)}" transform="rotate(${n(textRot)} ${n(x)} ${n(y)})">${esc(r.name)}</text>`);
  }
  w(`  </g>`);

  // --- appliance labels -----------------------------------------------------------
  const labelled = (model.devices || []).filter((d) => d.labels);
  if (labelled.length) {
    w(`  <g id="${N.deviceLabels}" font-family="system-ui, sans-serif" text-anchor="middle"\n     dominant-baseline="middle">`);
    for (const d of labelled) {
      const [x, y] = d.labels.at;
      const spans = d.labels.machines.map((m, i) =>
        `      <tspan class="${N.deviceLabel}"${attrs({ [N.attrName]: m.name, [N.attrShort]: m.short, [N.attrState]: m.state,
          "data-job": m.job, [N.attrEnd]: m.end, x: n(x), dy: i ? 12 : undefined })}></tspan>`);
      w(`    <text id="${d.labels.id}" x="${n(x)}" y="${n(y)}" transform="rotate(${n(textRot)} ${n(x)} ${n(y)})">\n${spans.join("\n")}\n    </text>`);
    }
    w(`  </g>`);
  }

  // --- climate readings ------------------------------------------------------------
  w(`  <g id="room-climate" font-family="system-ui, sans-serif" text-anchor="middle"\n     dominant-baseline="middle">`);
  for (const k of model.climate || []) {
    const [x, y] = k.at;
    const X = n(x);
    // a sensor drawn as itself (a thermometer and a drop), or - display: "values" / none set, as before - its
    // readings written on the plan
    const icon = (alt) => `    <g id="climate-${k.id}${alt ? "-icon" : ""}" class="climate-icon${alt ? " alt" : ""}" transform="translate(${X} ${n(y)}) rotate(${n(textRot)})"` +
      `${attrs({ "data-temp": alt ? undefined : k.temperature, "data-hum": alt ? undefined : k.humidity })}>` +
      `<circle r="7" fill="#1b2433" stroke="#8ea1ba" stroke-width="0.8"/>` +
      `<path d="M-2.2 1.6 V-3.6 A1.2 1.2 0 0 1 0.2 -3.6 V1.6 A2.2 2.2 0 1 1 -2.2 1.6 Z" fill="none" stroke="#c3cfdf" stroke-width="0.7"/>` +
      `<circle cx="-1" cy="3.2" r="1.1" fill="#e57373"/>` +
      `<path d="M3.6 -2.6 C2.6 -1.2 2.2 -0.4 2.2 0.4 A1.4 1.4 0 0 0 5 0.4 C5 -0.4 4.6 -1.2 3.6 -2.6 Z" fill="#6fc9ef"/></g>`;
    // readings on the plan: the symbol too, hidden - the editor shows it instead of the empty readings
    if (k.display !== "icon") w(icon(true));
    if (k.display === "icon") {
      w(icon(false));
      continue;
    }
    const name = k.name ? `<tspan class="climate-name" x="${X}">${esc(k.name)}</tspan>` : "";
    w(`    <text id="climate-${k.id}" x="${X}" y="${n(y)}" transform="rotate(${n(textRot)} ${X} ${n(y)})"` +
      `${attrs({ "data-temp": k.temperature, "data-hum": k.humidity })}>${name}` +
      `<tspan class="climate-temp" x="${X}"${k.name ? ' dy="15"' : ""}>—</tspan><tspan class="climate-hum" x="${X}" dy="13">—</tspan></text>`);
  }
  w(`  </g>`);

  // --- walls ---------------------------------------------------------------------------
  const wallPath = (id, list) => `<path id="${id}" fill="#000000" fill-rule="nonzero" stroke="none" d="\n` +
    list.map((r) => "      " + piecePath(r)).join("\n") + `\n    "/>`;
  w(`  <g id="walls-exterior">\n    ${wallPath("wall-ext", model.walls.exterior)}\n  </g>`);
  w(`  <g id="walls-interior">\n    ${wallPath("wall-int", model.walls.interior)}\n  </g>`);

  // --- interior doors (symbols hidden by class, the openings stay in the walls) ---
  const doors = model.doors || [];
  // door leaves and swings can be hidden (canvas.door_symbols: false) - the
  // openings in the walls stay
  const hide = c.door_symbols === false;
  w(`  <g id="doors-interior"${hide ? ` class="${N.noSymbol}"` : ""} fill="none" stroke="#384354" stroke-width="1">`);
  for (const d of doors.filter((d) => !d.exterior)) {
    w(`    <g id="${d.id}" data-width="${n(doorWidth(d))}"${contactAttr(d.contact)}>\n` + doorShape(d, false) + `\n    </g>`);
  }
  w(`  </g>`);
  if (model.walls.fireplace && model.walls.fireplace.length) {
    w(`  <g id="fireplace-nook">\n    ${wallPath("nook-walls", model.walls.fireplace)}\n  </g>`);
  }

  // --- openings ---------------------------------------------------------------------------
  w(`  <g id="openings-exterior">`);
  for (const win of model.windows) {
    if (win.type === "hst") {
      w(`    <g id="${win.id}" data-facade="${win.facade}" data-type="hst" data-width="${n(win.width)}"${contactAttr((win.contacts || [])[0])}>`);
      if (win.line) {
        // like a window (29.10): the frame from jamb to jamb round both tracks, a block at each end, the reveals;
        // each sash a slim profile on its own track round its glass, overlapping the other in the middle
        const H = win.tick || 4, [a, b] = win.line, L0 = len(win.line);
        const ux = (b[0] - a[0]) / (L0 || 1), uy = (b[1] - a[1]) / (L0 || 1), mx = -uy, my = ux;
        const dist = (q) => Math.abs((q[0] - a[0]) * mx + (q[1] - a[1]) * my);
        const t = Math.max(...Object.values(win.sashes).map((l) => dist(l[0]))), ds = t * 0.55, F = t + ds;
        const B = Math.min(0.8 * F, L0 / 6);
        const ln = (p, q, cls, sw, extra = "") => `      <line class="${cls}"${extra} x1="${n(p[0])}" y1="${n(p[1])}" x2="${n(q[0])}" y2="${n(q[1])}" stroke="#6fc9ef" stroke-width="${sw}"/>`;
        // (no reveal or sill lines along the wall faces: removed 31.10, owner)
        const box = (p, q, d, cls) => {
          const c = [[p[0] + mx * d, p[1] + my * d], [q[0] + mx * d, q[1] + my * d], [q[0] - mx * d, q[1] - my * d], [p[0] - mx * d, p[1] - my * d]];
          return `      <polygon class="${cls}" points="${c.map((v) => `${n(v[0])},${n(v[1])}`).join(" ")}" fill="none" stroke="#6fc9ef" stroke-width="0.6"/>`;
        };
        w(box(a, b, F, "frame"));
        for (const e of [[a, B], [b, -B]]) { const q = [e[0][0] + ux * e[1], e[0][1] + uy * e[1]]; w(ln([q[0] + mx * F, q[1] + my * F], [q[0] - mx * F, q[1] - my * F], "frame-cross", 0.6)); }
        for (const [sash, line] of Object.entries(win.sashes)) {
          // a sash at a jamb starts after the block there
          const along = (q) => (q[0] - a[0]) * ux + (q[1] - a[1]) * uy;
          const cut = (q) => { const s = along(q), s2 = Math.min(Math.max(s, B), L0 - B); return [q[0] + ux * (s2 - s), q[1] + uy * (s2 - s)]; };
          const p = cut(line[0]), q = cut(line[1]);
          w(box(p, q, ds, "sash"));
          w(`      <line id="${win.id}-${sash}" ${lineXY([p, q])} stroke="#6fc9ef" stroke-width="0.6"/>`);
        }
      } else {
        for (const [sash, line] of Object.entries(win.sashes)) {
          w(`      <line id="${win.id}-${sash}" ${lineXY(line)} stroke="#6fc9ef" stroke-width="1.4"/>`);
        }
      }
      w(`    </g>`);
    } else {
      const panes = win.panes || 1, cts = win.contacts || [];
      const one = cts.length === 1 ? cts[0] : null; // one contact for the whole window
      // as drawn by the owner (29.10): one frame from jamb to jamb, a square block at each end and one between
      // the sashes, the glass a single line along the middle of each sash
      const H = win.tick || 4, F = H * 0.18;
      const [a, b] = win.line, L0 = len(win.line), k2 = Math.max(panes, cts.length);
      const ux = (b[0] - a[0]) / (L0 || 1), uy = (b[1] - a[1]) / (L0 || 1), mx = -uy, my = ux;
      const at0 = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      // pane i's start as a fraction: even, or at the window's own division points (panes of their own widths)
      const div = (i) => (i <= 0 ? 0 : i >= k2 ? 1 : win.splits && win.splits.length === k2 - 1 ? win.splits[i - 1] : i / k2);
      const at = (f) => at0(f);
      const off = (q, t) => [q[0] + ux * t, q[1] + uy * t];
      const B = Math.min(0.8 * F, L0 / (3 * k2));          // a block's length along the window (about 0.4 of its width)
      const across = (q, cls = "frame-cross") =>
        `      <line class="${cls}" x1="${n(q[0] + mx * F)}" y1="${n(q[1] + my * F)}" x2="${n(q[0] - mx * F)}" y2="${n(q[1] - my * F)}" stroke="#6fc9ef" stroke-width="0.6"/>`;
      const parts = [];
      // (no reveal or sill lines along the wall faces across the opening: removed 31.10, owner)
      const c = [[a[0] + mx * F, a[1] + my * F], [b[0] + mx * F, b[1] + my * F], [b[0] - mx * F, b[1] - my * F], [a[0] - mx * F, a[1] - my * F]];
      parts.push(`      <polygon class="frame" points="${c.map((v) => `${n(v[0])},${n(v[1])}`).join(" ")}" fill="none" stroke="#6fc9ef" stroke-width="0.6"/>`);
      parts.push(across(off(a, B)), across(off(b, -B)));
      for (let i = 0; i < k2; i++) {
        const p0 = off(at(div(i)), i ? B / 2 : B), p1 = off(at(div(i + 1)), i + 1 < k2 ? -B / 2 : -B);
        parts.push(`      <line class="${N.pane}" ${lineXY([p0, p1])} stroke="#6fc9ef" stroke-width="0.6"` +
          `${cts.length > 1 ? contactAttr(cts[i]) : ""}/>`);
        if (i) {
          // between two sashes: a block (and the old tick, hidden, for what reads the pane division)
          const q = at(div(i));
          parts.push(across(off(q, -B / 2)), across(off(q, B / 2)));
          parts.push(`      <line class="${N.paneTick}" ${lineXY([[q[0] - mx * H, q[1] - my * H], [q[0] + mx * H, q[1] + my * H]])} stroke-opacity="0"/>`);
        }
      }
      w(`    <g id="${win.id}" data-facade="${win.facade}" data-width="${n(win.width || L0)}"${contactAttr(one)}>\n${parts.join("\n")}\n    </g>`);
    }
  }
  for (const d of doors.filter((d) => d.exterior)) {
    w(`    <g id="${d.id}"${hide ? ` class="${N.noSymbol}"` : ""} data-facade="${d.facade}" data-width="${n(doorWidth(d))}"${contactAttr(d.contact)}\n       fill="none" stroke="#384354" stroke-width="1">\n` +
      doorShape(d, true) + `\n    </g>`);
  }
  w(`  </g>`);

  // --- covers -------------------------------------------------------------------------------
  w(`  <g id="covers">`);
  for (const cv of model.covers || []) w(cover(cv, windows.get(cv.window), textRot));
  w(`  </g>`);

  // --- cameras ----------------------------------------------------------------------------------
  w(`  <g id="cameras">`);
  for (const cam of model.cameras || []) w(camera(cam));
  w(`  </g>`);

  // --- notes: text, markers, arrows -----------------------------------------------------------
  const notes = notesLayer(model.notes, textRot, 1 / ((model.canvas && model.canvas.cm_per_svg) || 1));
  if (notes) w(notes);

  // --- controls (on top: nothing covers them) -----------------------------------------------
  w(`  <g id="controls">`);
  for (const lk of model.locks || []) w(lock(lk, textRot));
  w(`  </g>`);
  w(`  </g>`);
  w(`</svg>`);
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------------------------

const len = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lineXY = ([a, b]) => `x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"`;
const doorWidth = (d) => d.width || len([d.hinge, d.leaf]);
const contactAttr = (e) => (e ? ` ${N.attrContact}="${esc(e)}"` : "");
// A fan of `fov` degrees around `dir`, radius r (cameras, detection ranges).
function fanPath(x, y, dir, fov, r) {
  const a0 = (dir - fov / 2) * Math.PI / 180, a1 = (dir + fov / 2) * Math.PI / 180;
  return `M${x.toFixed(2)} ${y.toFixed(2)} L${(x + r * Math.cos(a0)).toFixed(2)} ${(y + r * Math.sin(a0)).toFixed(2)} ` +
    `A${r.toFixed(1)} ${r.toFixed(1)} 0 ${fov > 180 ? 1 : 0} 1 ${(x + r * Math.cos(a1)).toFixed(2)} ${(y + r * Math.sin(a1)).toFixed(2)} Z`;
}
// A door: leaf + swing arc, or plain lines (sliding, garage). Exterior doors
// name their parts (<id>-leaf, <id>-swing).
function doorShape(d, named) {
  if (d.lines) {
    // a garage door stands out from the dark door symbols: the door brighter and thicker, its run lighter
    const look = d.garage === "door" ? ' stroke="#8ea1ba" stroke-width="2.4"' : d.garage === "track" ? ' stroke="#6b7a90" stroke-width="1"' : "";
    const dash = (d.dashed ? ' stroke-dasharray="4 3"' : "") + look;
    return d.lines.map((l) => `      <line ${lineXY(l)}${dash}/>`).join("\n");
  }
  return named
    ? `      <line id="${d.id}-leaf" x1="${n(d.hinge[0])}" y1="${n(d.hinge[1])}" x2="${n(d.leaf[0])}" y2="${n(d.leaf[1])}"/>\n` +
      `      <path id="${d.id}-swing" stroke-width="0.6"\n            d="${doorArc(d)}"/>`
    : `      <line x1="${n(d.hinge[0])}" y1="${n(d.hinge[1])}" x2="${n(d.leaf[0])}" y2="${n(d.leaf[1])}"/>\n` +
      `      <path stroke-width="0.6" d="${doorArc(d)}"/>`;
}
function doorArc(d) {
  const r = n(doorWidth(d));
  return `M${n(d.closed[0])} ${n(d.closed[1])} A${r} ${r} 0 0 ${d.sweep} ${n(d.leaf[0])} ${n(d.leaf[1])}`;
}

function glowCircle(at, r, fill, cls = "glow") {
  return `<circle class="${cls}" cx="${n(at[0])}" cy="${n(at[1])}" r="${n(r)}" fill="url(#${fill})" stroke="none" opacity="0"/>`;
}

function bulbUse(b, kind, upright, cls = "bulb") {
  const rot = b.length > 2 ? b[2] : upright;
  const scale = kind === "night" ? ` scale(${NIGHT_BULB_SCALE})` : "";
  return `<use class="${cls}" href="#bulb" transform="translate(${n(b[0])} ${n(b[1])}) rotate(${n(rot)})${scale}"/>`;
}

function light(l, clipOf, upright) {
  const g = GLOW[l.kind] || GLOW.ceiling;
  const clip = l.outdoor ? null : clipOf(l.room);
  const bulbs = l.bulbs || [];
  const head = `    <g${attrs({ id: l.id, "data-entity": l.entity, class: "light", "data-kind": l.kind, "data-outdoor": l.outdoor ? "true" : undefined, "data-watts": watts(l.watts) })}>`;
  const lines = [head];
  // default glows: one per bulb; an LED strip without bulbs glows from its middle
  const R = l.glow_r || g.r; // glow_r: this light's own radius instead of its kind's
  const glows = l.glows || (bulbs.length ? bulbs.map((b) => ({ at: b, r: R }))
    : l.strip ? [{ at: [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2], r: R }] : []);
  // a glow with its own clip too: the light's beam (e.g. a wall light lights only its side)
  lines.push(`      <g class="glows"${clipAttr2(clip)}>`);
  for (const gl of glows) {
    if (gl.clip) lines.push(`        <g clip-path="url(#clip-${gl.clip})">`, "          " + glowCircle(gl.at, gl.r || R, g.fill), `        </g>`);
    else lines.push("        " + glowCircle(gl.at, gl.r || R, g.fill));
  }
  lines.push(`      </g>`);
  if (l.rail) lines.push(`      <polyline class="rail" points="${pts(l.rail)}" fill="none"/>`);
  if (l.strip) {
    const [x, y, sw, sh] = l.strip;
    lines.push(`      <rect class="led" x="${n(x)}" y="${n(y)}" width="${n(sw)}" height="${n(sh)}" rx="0.3"/>`);
  }
  for (const b of bulbs) {
    if (SHADES[l.kind]) lines.push(`      <circle class="shade" cx="${n(b[0])}" cy="${n(b[1])}" r="${SHADES[l.kind]}" fill="none" stroke-width="0.7"${l.kind === "pendant" ? ' stroke-dasharray="1.6 1.1"' : ""}/>`);
    if (l.kind === "garden_lamp") lines.push(`      <rect class="shade" x="${n(b[0] - 7.5)}" y="${n(b[1] - 7.5)}" width="15" height="15" rx="2" fill="none" stroke-width="0.7"/>`);
    lines.push("      " + bulbUse(b, l.kind, upright));
  }
  lines.push(`    </g>`);
  return lines.join("\n");
}
const clipAttr2 = (id) => (id ? ` clip-path="url(#${id})"` : "");

// A fixture with several circuits sharing one bulb icon (e.g. 1 + 3 bulbs):
// each circuit is its own .light group with a glow; the shared icon lights up
// through `.light.on ~ .bulb-shared`, so it must come AFTER the circuits.
// Two circuits (e.g. 2 + 3 bulbs): a chandelier, each circuit lighting its own bulbs (.circuit-small / .circuit-large).
function fixture(f, clipOf, upright) {
  const clip = clipOf(f.room);
  const lines = [`    <g id="${f.id}">`];
  const two = f.circuits.length === 2;
  const smallAt = two ? (f.circuits.findIndex((c) => c.dim) + 1 || 2) - 1 : -1;
  f.circuits.forEach((c, i) => {
    const cls = two ? `light circuit-${i === smallAt ? "small" : "large"}` : "light";
    lines.push(`      <g${attrs({ id: c.id, "data-entity": c.entity, class: cls, "data-kind": f.kind || "main", "data-watts": watts(c.watts) })}>`);
    lines.push(`        <g class="glows"${clipAttr2(clip)}>`);
    lines.push(`        ` + glowCircle(f.at, c.r, (GLOW[f.kind] || GLOW.main).fill, c.dim ? "glow glow-dim" : "glow"));
    lines.push(`        </g>`, `      </g>`);
  });
  const rot = f.at.length > 2 ? f.at[2] : upright;
  lines.push("      " + (two ? chandelier(f, smallAt, rot)
    : bulbUse(f.at, f.kind, upright, "bulb-shared")));
  lines.push(`    </g>`);
  return lines.join("\n");
}

// A chandelier seen from above: a hub, an arm per bulb, as many bulbs as its circuits have (`bulbs` of each circuit,
// 1 + 3 when not given); the small circuit's bulbs spread evenly among the large one's
function chandelier(f, smallAt, rot) {
  const count = (i) => Math.max(1, Math.min(12, Math.round(Number(f.circuits[i].bulbs) || (i === smallAt ? 1 : 3))));
  const S = count(smallAt), N = S + count(1 - smallAt);
  const R = N <= 6 ? 7.6 : 7.6 + (N - 6) * 0.6, rb = Math.min(2, R * Math.sin(Math.PI / N) * 0.75);
  let arms = "", bulbs = "";
  for (let i = 0; i < N; i++) {
    const a = -Math.PI * 3 / 4 + (2 * Math.PI * i) / N, c = Math.cos(a), s = Math.sin(a);
    const small = Math.floor(((i + 1) * S) / N) > Math.floor((i * S) / N);
    arms += `M${n(c * 1.8)} ${n(s * 1.8)}L${n(c * (R - rb))} ${n(s * (R - rb))}`;
    bulbs += `<circle class="ch-b ch-${small ? 1 : 3}" cx="${n(c * R)}" cy="${n(s * R)}" r="${n(rb)}"/>`;
  }
  // (drawn inline, not as a <use>: the circuits' styles reach its single bulbs only so)
  return `<g class="bulb-shared chandelier" transform="translate(${n(f.at[0])} ${n(f.at[1])}) rotate(${n(rot)})">` +
    `<circle class="ch-hub" r="1.6"/><path class="ch-arm" d="${arms}"/>${bulbs}</g>`;
}

function hitRect([x, y, w, h]) {
  return `<rect class="${N.hitArea}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/>`;
}

function device(d, clipOf, upright = 0) {
  const cls = { presence: N.presence, appliance: N.appliance, climate_unit: N.ac, tv: "tv", motion: N.motion, icon: N.iconDevice, skylight: "skylight" }[d.type];
  if (!cls) throw new Error("unknown device type " + d.type);
  const clip = clipOf(d.room);
  // a reading under an icon: its own entity for kinds that are a reading (a bin's date, the weather...)
  const valueEntity = d.type === "icon" ? d.value_entity || (VALUE_KINDS.includes(d.kind) ? d.entity : undefined) : undefined;
  const extra = d.type === "icon" ? attrs({ "data-kind": d.kind, [N.attrValue]: valueEntity })
    : d.type === "skylight" ? attrs({ [N.attrContact]: d.contact }) : "";
  const L = [`    <g id="${d.id}" data-entity="${esc(d.entity)}" class="${cls}"${extra}>`];
  let topGroup = "", rackRows = null;
  if (d.hit) L.push("      " + hitRect(d.hit));
  // a TV / an A/C drawn from above as the thing itself, facing its front (beam_dir: 0 up, clockwise; 180 by
  // default): a TV a slim panel with its screen towards the room and its mount behind, an A/C a rounded
  // wall unit with the louvres of its air outlet along the front
  const shaped = d.type === "tv" || d.type === "climate_unit" || (d.type === "appliance" && d.kind) || (d.type === "icon" && d.hit);
  if (d.hit && shaped) {
    const [x, y, w, h] = d.hit, a = (((Math.round((d.beam_dir ?? 180) / 90) * 90) % 360) + 360) % 360;
    const side = a % 180 === 0, W = side ? w : h, D = side ? h : w;          // along the wall, from the wall out
    const tf = `translate(${n(x + w / 2)} ${n(y + h / 2)}) rotate(${a - 180})`; // drawn front down (+y), turned
    const X0 = -W / 2, Y0 = -D / 2, g = [];
    if (d.type === "tv") {
      const t = Math.max(1.6, D * 0.35), y1 = Y0 + D * 0.45;              // the panel, a little off the wall
      g.push(`<rect class="tv-mount" x="${n(-W * 0.18)}" y="${n(Y0)}" width="${n(W * 0.36)}" height="${n(y1 - Y0)}" rx="0.6"/>`);
      g.push(`<rect class="tv-body" x="${n(X0)}" y="${n(y1)}" width="${n(W)}" height="${n(t)}" rx="${n(Math.min(1.2, t / 2))}"/>`);
      g.push(`<line class="tv-screen" x1="${n(X0 + 1)}" y1="${n(y1 + t)}" x2="${n(-X0 - 1)}" y2="${n(y1 + t)}"/>`);
    } else if (d.type === "climate_unit") {
      const r = Math.min(D * 0.45, W * 0.12);
      g.push(`<path class="ac-body" d="M${n(X0)} ${n(Y0)} H${n(-X0)} V${n(-Y0 - r)} Q${n(-X0)} ${n(-Y0)} ${n(-X0 - r)} ${n(-Y0)} H${n(X0 + r)} Q${n(X0)} ${n(-Y0)} ${n(X0)} ${n(-Y0 - r)} Z"/>`);
      for (const f of [0.55, 0.7, 0.85]) {
        const yy = Y0 + D * f, inset = W * 0.08;
        g.push(`<line class="ac-louvre" x1="${n(X0 + inset)}" y1="${n(yy)}" x2="${n(-X0 - inset)}" y2="${n(yy)}"/>`);
      }
      g.push(`<circle class="ac-led" cx="${n(-X0 - W * 0.1)}" cy="${n(Y0 + D * 0.3)}" r="${n(Math.max(0.6, D * 0.06))}"/>`);
    } else {
      // appliances and units: the body, and what tells them apart, front down (+y)
      const k = d.kind, m0 = Math.min(W, D), rr = (x0, y0, w0, h0, r0, cls) => `<rect class="${cls}" x="${n(x0)}" y="${n(y0)}" width="${n(w0)}" height="${n(h0)}" rx="${n(r0)}"/>`;
      g.push(rr(X0, Y0, W, D, Math.min(3, m0 * 0.08), "unit-body"));
      const cs = (cx, cy, r, cls) => `<circle class="${cls}" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"/>`;
      const ln = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
      if ((k === "washer" || k === "dryer") && d.top) {
        // a stack, seen from above: split corner to corner, the machine below in the front left half, the one
        // on top in the back right; each half lights up with its own machine (the top's half in its own group)
        g.push(`<polygon class="unit-half" points="${n(X0)},${n(Y0)} ${n(X0)},${n(-Y0)} ${n(-X0)},${n(-Y0)}"/>`);
        g.push(ln(X0, Y0, -X0, -Y0, "unit-line"));
        const half = (kk, cx, cy) => {
          const r = m0 * 0.15, out = [cs(cx, cy, r, "unit-door"), cs(cx, cy, r * 0.62, "unit-glass")];
          if (kk === "dryer") for (const f of [-0.35, 0, 0.35]) out.push(ln(cx - r * 0.45, cy + r * f, cx + r * 0.45, cy + r * f, "unit-line"));
          return out;
        };
        g.push(...half(k, X0 + W * 0.3, -Y0 - D * 0.3), ...half(d.top.kind, -X0 - W * 0.3, Y0 + D * 0.3));
      } else if (k === "washer" || k === "dryer") {
        g.push(ln(X0, Y0 + D * 0.2, -X0, Y0 + D * 0.2, "unit-line"), cs(X0 + W * 0.22, Y0 + D * 0.1, m0 * 0.05, "unit-knob"));
        g.push(cs(0, D * 0.1, m0 * 0.3, "unit-door"), cs(0, D * 0.1, m0 * 0.2, "unit-glass"));
        if (k === "dryer") for (const f of [-0.06, 0.04, 0.14]) g.push(ln(-m0 * 0.12, D * f + D * 0.04, m0 * 0.12, D * f + D * 0.04, "unit-line"));
      } else if (k === "dishwasher") {
        g.push(ln(X0, -Y0 - D * 0.14, -X0, -Y0 - D * 0.14, "unit-line"));
        for (const f of [-0.25, -0.05, 0.15]) g.push(ln(X0 + W * 0.12, D * f, -X0 - W * 0.12, D * f, "unit-rack"));
      } else if (k === "fridge") {
        // one door along the front, its handle on one side
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"));
        g.push(ln(-X0 - W * 0.12, -Y0 - D * 0.04, -X0 - W * 0.12, -Y0 - D * 0.24, "unit-handle"));
      } else if (k === "fridge_sbs") {
        // side by side: two doors, split down the middle, the handles next to each other
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"), ln(0, Y0 + D * 0.08, 0, -Y0, "unit-line"));
        g.push(ln(-W * 0.06, -Y0 - D * 0.04, -W * 0.06, -Y0 - D * 0.24, "unit-handle"), ln(W * 0.06, -Y0 - D * 0.04, W * 0.06, -Y0 - D * 0.24, "unit-handle"));
      } else if (k === "freezer") {
        // one door, and a frost star on it
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"), ln(-X0 - W * 0.12, -Y0 - D * 0.04, -X0 - W * 0.12, -Y0 - D * 0.24, "unit-handle"));
        for (const a of [0, 60, 120]) {
          const r = m0 * 0.16, c = Math.cos((a * Math.PI) / 180) * r, s2 = Math.sin((a * Math.PI) / 180) * r;
          g.push(ln(-c, -D * 0.05 - s2, c, -D * 0.05 + s2, "unit-cold"));
        }
      } else if (k === "oven") {
        // the door along the front with its window, the knobs over it
        g.push(rr(X0 + W * 0.12, -Y0 - D * 0.28, W * 0.76, D * 0.18, 1, "unit-glass"), ln(X0 + W * 0.15, -Y0 - D * 0.04, -X0 - W * 0.15, -Y0 - D * 0.04, "unit-handle"));
        for (const f of [-0.3, -0.1, 0.1, 0.3]) g.push(cs(W * f, -Y0 - D * 0.42, m0 * 0.04, "unit-knob"));
      } else if (k === "cooktop") {
        // four cooking zones, the touch strip at the front
        g.push(cs(-W * 0.22, -D * 0.18, m0 * 0.17, "unit-zone"), cs(W * 0.22, -D * 0.18, m0 * 0.13, "unit-zone"));
        g.push(cs(-W * 0.22, D * 0.18, m0 * 0.13, "unit-zone"), cs(W * 0.22, D * 0.18, m0 * 0.17, "unit-zone"));
        g.push(ln(X0 + W * 0.25, -Y0 - D * 0.07, -X0 - W * 0.25, -Y0 - D * 0.07, "unit-line"));
      } else if (k === "microwave") {
        // the door with its window on the left, the control panel on the right
        g.push(rr(X0 + W * 0.08, -Y0 - D * 0.3, W * 0.6, D * 0.22, 1, "unit-glass"), ln(X0 + W * 0.76, Y0, X0 + W * 0.76, -Y0, "unit-line"));
        g.push(cs(X0 + W * 0.88, -Y0 - D * 0.2, m0 * 0.06, "unit-knob"));
      } else if (k === "hood") {
        // above the cooktop: drawn dashed, its filters
        g.length = 0;
        g.push(rr(X0, Y0, W, D, Math.min(3, m0 * 0.08), "unit-body unit-above"));
        for (const f of [-0.25, 0, 0.25]) g.push(ln(W * f, Y0 + D * 0.2, W * f, -Y0 - D * 0.25, "unit-rack"));
      } else if (k === "coffee") {
        // the water tank at the back, the spout and a cup at the front
        g.push(rr(X0 + W * 0.15, Y0 + D * 0.08, W * 0.7, D * 0.3, 1, "unit-glass"));
        g.push(cs(0, -Y0 - D * 0.2, m0 * 0.22, "unit-door"), cs(0, -Y0 - D * 0.2, m0 * 0.1, "unit-cup"));
      } else if (k === "soundbar") {
        // a slim bar, the grille along its front
        g.length = 0;
        g.push(rr(X0, Y0, W, D, Math.min(1.5, D / 2), "unit-body"));
        for (let i = 1; i < 10; i++) g.push(cs(X0 + (W * i) / 10, D * 0.15, Math.min(0.9, D * 0.12), "unit-knob"));
      } else if (k === "projector") {
        // the lens at the front, its light thrown forward (faint)
        g.push(cs(-W * 0.2, -Y0 - D * 0.18, m0 * 0.16, "unit-door"), cs(-W * 0.2, -Y0 - D * 0.18, m0 * 0.08, "unit-glass"));
        g.push(`<path class="unit-throw" d="M${n(-W * 0.2 - m0 * 0.1)} ${n(-Y0)} L${n(-W * 0.2 - W * 0.6)} ${n(-Y0 + D * 1.6)} H${n(-W * 0.2 + W * 0.6)} L${n(-W * 0.2 + m0 * 0.1)} ${n(-Y0)} Z"/>`);
        g.push(ln(W * 0.1, Y0 + D * 0.3, -X0 - W * 0.1, Y0 + D * 0.3, "unit-rack"));
      } else if (k === "console") {
        // a disc slot and its light along the front
        g.push(ln(X0 + W * 0.15, -Y0 - D * 0.25, -X0 - W * 0.35, -Y0 - D * 0.25, "unit-line"), cs(-X0 - W * 0.15, -Y0 - D * 0.25, m0 * 0.07, "unit-led"));
      } else if (k === "washdry") {
        // one machine that washes and dries: the washer's door, the dryer's heat lines on it
        g.push(ln(X0, Y0 + D * 0.2, -X0, Y0 + D * 0.2, "unit-line"), cs(X0 + W * 0.22, Y0 + D * 0.1, m0 * 0.05, "unit-knob"));
        g.push(cs(0, D * 0.1, m0 * 0.3, "unit-door"), cs(0, D * 0.1, m0 * 0.2, "unit-glass"));
        for (const f of [-0.06, 0.1]) g.push(`<path class="unit-heat" d="M${n(-m0 * 0.12)} ${n(D * f + D * 0.04)} q${n(m0 * 0.06)} ${n(-m0 * 0.04)} ${n(m0 * 0.12)} 0 t${n(m0 * 0.12)} 0" fill="none"/>`);
      } else if (k === "wine_fridge") {
        // a glass door, bottles lying inside
        g.push(rr(X0 + W * 0.08, Y0 + D * 0.12, W * 0.84, D * 0.74, 1, "unit-glass"));
        for (const f of [-0.25, 0, 0.25]) g.push(cs(W * f, -D * 0.02, m0 * 0.08, "unit-knob"));
        g.push(ln(-X0 - W * 0.12, -Y0 - D * 0.04, -X0 - W * 0.12, -Y0 - D * 0.22, "unit-handle"));
      } else if (k === "mower") {
        // a robot mower: rounded front, big wheels at the back
        g.length = 0;
        g.push(`<path class="unit-body" d="M${n(X0)} ${n(Y0)} H${n(-X0)} V${n(-Y0 - W * 0.4)} Q${n(-X0)} ${n(-Y0)} 0 ${n(-Y0)} Q${n(X0)} ${n(-Y0)} ${n(X0)} ${n(-Y0 - W * 0.4)} Z"/>`);
        g.push(rr(X0 - 2, Y0 + D * 0.05, 4, D * 0.35, 1, "unit-handle"), rr(-X0 - 2, Y0 + D * 0.05, 4, D * 0.35, 1, "unit-handle"));
        g.push(cs(0, D * 0.05, m0 * 0.12, "unit-door"));
      } else if (k === "radiator") {
        // panel fins along the wall
        const nf = Math.max(3, Math.round(W / 8));
        for (let i = 1; i < nf; i++) g.push(ln(X0 + (W * i) / nf, Y0 + D * 0.2, X0 + (W * i) / nf, -Y0 - D * 0.2, "unit-line"));
      } else if (k === "heat_pump") {
        // an outdoor unit: the fan grille, the fins beside it
        g.push(cs(-W * 0.15, 0, Math.min(D, W) * 0.38, "unit-door"), cs(-W * 0.15, 0, Math.min(D, W) * 0.12, "unit-knob"));
        for (const f of [0.2, 0.28, 0.36, 0.44]) g.push(ln(W * f, Y0 + D * 0.15, W * f, -Y0 - D * 0.15, "unit-line"));
      } else if (k === "water_tank") {
        // a round tank: its lid, hot and cold pipes at the back
        g.length = 0;
        g.push(cs(0, 0, m0 / 2, "unit-body"), cs(0, 0, m0 * 0.32, "unit-line"));
        g.push(`<circle class="ia-red" cx="${n(-m0 * 0.15)}" cy="${n(Y0 + D * 0.12)}" r="${n(m0 * 0.05)}"/>`, `<circle class="ia-blue" cx="${n(m0 * 0.15)}" cy="${n(Y0 + D * 0.12)}" r="${n(m0 * 0.05)}"/>`);
      } else if (k === "rack") {
        // a rack seen as its front: one row per piece of equipment in it (each lit by its own entity, in its own
        // group after this one), empty rows when there is nothing in it yet
        const items = d.items || [], rows = Math.max(items.length, 3), top = Y0 + D * 0.12, h = (D * 0.8) / rows;
        for (let i = 0; i < rows; i++) g.push(rr(X0 + W * 0.1, top + i * h + h * 0.12, W * 0.8, h * 0.76, 0.6, items[i] ? "rack-unit" : "rack-empty"));
        rackRows = { tf, items, x: X0 + W * 0.1, w: W * 0.8, top, h };
      } else if (k === "recuperator") {
        for (const f of [-0.33, -0.11, 0.11, 0.33]) g.push(cs(W * f, Y0 + D * 0.18, m0 * 0.09, "unit-duct"));
        g.push(`<path class="unit-arrow ia-blue" d="M${n(X0 + W * 0.15)} ${n(D * 0.05)} H${n(-X0 - W * 0.2)}" fill="none"/>`);
        g.push(`<path class="unit-arrow ia-red" d="M${n(-X0 - W * 0.15)} ${n(D * 0.25)} H${n(X0 + W * 0.2)}" fill="none" stroke="#e57373"/>`);
      } else if (k === "boiler") {
        g.push(rr(-W * 0.2, -D * 0.05, W * 0.4, D * 0.35, 1, "unit-line"));
        g.push(`<path class="ia-red" d="M0 ${n(D * 0.0)} C${n(W * 0.08)} ${n(D * 0.1)} ${n(W * 0.08)} ${n(D * 0.18)} 0 ${n(D * 0.24)} C${n(-W * 0.08)} ${n(D * 0.18)} ${n(-W * 0.08)} ${n(D * 0.1)} 0 ${n(D * 0.0)} Z"/>`);
        g.push(ln(X0 + W * 0.25, Y0 + D * 0.2, -X0 - W * 0.25, Y0 + D * 0.2, "unit-line"));
      } else if (k === "media") {
        g.push(cs(0, D * 0.12, m0 * 0.28, "unit-door"), cs(0, D * 0.12, m0 * 0.1, "unit-glass"), cs(0, Y0 + D * 0.2, m0 * 0.08, "unit-knob"));
      } else {
        g.push(cs(0, 0, m0 * 0.25, "unit-door"));
      }
    }
    L.push(`      <g class="dev-shape" transform="${tf}" pointer-events="none">${g.join("")}</g>`);
    if (rackRows) {
      // each piece of equipment: its own entity and click area, its LED on while it is on
      const R = rackRows;
      topGroup = R.items.map((it, i) => {
        const y = R.top + i * R.h + R.h * 0.12, hh = R.h * 0.76;
        return `    <g id="${it.id}" data-entity="${esc(it.entity || "")}" class="${N.appliance} rack-item"${attrs({ "data-kind": it.kind })}>\n` +
          `      <g transform="${R.tf}"><rect class="${N.hitArea}" x="${n(R.x)}" y="${n(y)}" width="${n(R.w)}" height="${n(hh)}"/>` +
          `<circle class="rack-led" cx="${n(R.x + R.w - hh * 0.5)}" cy="${n(y + hh / 2)}" r="${n(Math.min(1.4, hh * 0.22))}" pointer-events="none"/></g>\n    </g>`;
      }).join("\n");
    }
    if (d.type === "appliance" && d.top) {
      // the machine on top: its own entity, click area and half (closed after this device's group)
      const tri = `${n(X0)},${n(Y0)} ${n(-X0)},${n(Y0)} ${n(-X0)},${n(-Y0)}`;
      topGroup = `    <g id="${d.id}-top" data-entity="${esc(d.top.entity || "")}" class="${N.appliance} stack-top"${attrs({ "data-kind": d.top.kind })}>\n` +
        `      <g transform="${tf}"><polygon class="${N.hitArea}" points="${tri}"/><polygon class="unit-half" points="${tri}" pointer-events="none"/></g>\n    </g>`;
    }
  }
  // detection range: what the sensor sees, stopped by the walls (from the model), or else cut to the room
  const fan = () => {
    if (!d.range) return;
    if (d.view && d.view.length > 2) {
      L.push(`      <polygon class="${N.sensorFan}" points="${d.view.map((p) => `${n(p[0])},${n(p[1])}`).join(" ")}"/>`);
      return;
    }
    const path = `<path class="${N.sensorFan}" d="${fanPath(d.at[0], d.at[1], d.direction ?? 90, d.fov ?? 100, d.range)}"/>`;
    L.push(clip ? `      <g${clipAttr2(clip)}>${path}</g>` : `      ${path}`);
  };
  if (d.type === "motion") {
    const [x, y] = d.at;
    fan();
    L.push(`      <circle class="${N.sensorBody}" cx="${n(x)}" cy="${n(y)}" r="3.4" fill="none"/>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n(x)}" cy="${n(y)}" r="1.2"/>`);
  } else if (d.type === "skylight") {
    // a roof window: the glass from above, its cover drawn over it as it closes
    const [x, y, w, h] = d.hit;
    L.push(`      <rect class="sky-cover" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="2"/>`);
    L.push(`      <rect class="${N.pane} sky-glass" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="2"/>`);
    const v = h >= w;
    L.push(`      <line class="sky-bar" x1="${n(v ? x : x + w / 2)}" y1="${n(v ? y + h / 2 : y)}" x2="${n(v ? x + w : x + w / 2)}" y2="${n(v ? y + h / 2 : y + h)}"/>`);
  } else if (d.type === "icon") {
    // a badge with the kind's glyph, a glow while working (red for alarms),
    // optionally a reading under it - all kept upright
    const [x, y] = d.at;
    const pool = ALARM_KINDS.includes(d.kind) ? "alarm-pool" : N.appliancePool;
    L.push(`      <g class="glows"${clipAttr2(clip)}>`);
    L.push(`        <circle class="glow ${N.deviceGlow}" cx="${n(x)}" cy="${n(y)}" r="${n(d.glow_r || 40)}" fill="url(#${pool})" stroke="none"/>`);
    L.push(`      </g>`);
    if (!d.hit) {
      L.push(`      <circle class="${N.iconBadge}" cx="${n(x)}" cy="${n(y)}" r="7.5"/>`);
      L.push(`      <g transform="translate(${n(x)} ${n(y)}) rotate(${n(upright)}) scale(0.95)"><use class="${N.iconGlyph}" href="#icon-${d.kind}"/></g>`);
    }
    if (valueEntity) L.push(`      <text class="${N.deviceValue}" x="${n(x)}" y="${n(y + 12)}" transform="rotate(${n(upright)} ${n(x)} ${n(y)})">—</text>`);
  } else if (d.type === "presence") {
    const [x, y] = d.at;
    fan();
    L.push(`      <g${clipAttr2(clip)}>`);
    for (const f of [N.wave, N.wave + " f2", N.wave + " f3"]) L.push(`        <circle class="${f}" cx="${n(x)}" cy="${n(y)}" r="26"/>`);
    L.push(`      </g>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n(x)}" cy="${n(y)}" r="3.4" fill="none"/>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n(x)}" cy="${n(y)}" r="1.2"/>`);
  } else {
    const gl = d.glow;
    const [x, y] = gl.at;
    const shape = (cls2, fill) => (gl.r
      ? `<circle class="${cls2}" cx="${n(x)}" cy="${n(y)}" r="${n(gl.r)}" fill="url(#${fill})" stroke="none"/>`
      : `<ellipse class="${cls2}" cx="${n(x)}" cy="${n(y)}" rx="${n(gl.rx)}" ry="${n(gl.ry)}" fill="url(#${fill})" stroke="none"/>`);
    const inner = [];
    if (d.type === "appliance") inner.push(shape("glow " + N.applianceGlow, d.alert ? "alarm-pool" : N.appliancePool));
    if (d.type === "tv") inner.push(shape("glow tv-glow", "tv-pool"));
    if (d.type === "climate_unit") {
      inner.push(shape(`glow ${N.acGlow} ${N.acCool}`, N.acCoolPool), shape(`glow ${N.acGlow} ${N.acHeat}`, N.acHeatPool));
    }
    L.push(`      <g class="glows"${clipAttr2(clip)}>`);
    if (d.clip) L.push(`        <g clip-path="url(#clip-${d.clip})">`);
    for (const s of inner) L.push((d.clip ? "          " : "        ") + s);
    if (d.clip) L.push(`        </g>`);
    L.push(`      </g>`);
    if (d.icon === "snowflake") L.push(`      <path class="${N.snowflake}" d="${snowflake(x, y)}"/>`);
  }
  L.push(`    </g>`);
  if (topGroup) L.push(topGroup);
  return L.join("\n");
}

// Six arms of 8 units (from the top, counter-clockwise), each with two barbs
// (2.6 long) 4.8 from the centre.
function snowflake(cx, cy) {
  const d = [];
  for (let k = 0; k < 6; k++) {
    const a = (-90 - 60 * k) * Math.PI / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    d.push(`M${n(cx)} ${n(cy)} L${n(cx + 8 * ux)} ${n(cy + 8 * uy)}`);
    const bx = cx + 4.8 * ux, by = cy + 4.8 * uy;
    for (const s of [1, -1]) {
      const b = a + s * Math.PI / 4;
      d.push(`M${n(bx)} ${n(by)} L${n(bx + 2.6 * Math.cos(b))} ${n(by + 2.6 * Math.sin(b))}`);
    }
  }
  return d.join(" ");
}

// A cover on a window (or on one sash of a sliding window). Covers of both
// sashes run in one guide - the OUTER sash line - so the band and the hit line
// sit there; data-x1..y2 keep the window's own glass line.
function cover(cv, win, upright = 0) {
  if (!win) throw new Error("cover " + cv.entity + ": unknown window " + cv.window);
  const glass = cv.sash ? win.sashes[cv.sash] : win.line;
  const inward = win.inward || INWARD[win.facade];
  let track = glass;
  if (cv.sash) {
    // outer sash = the one farthest against the inward normal
    const depth = (l) => l[0][0] * inward[0] + l[0][1] * inward[1];
    const outer = Object.values(win.sashes).reduce((a, b) => (depth(b) < depth(a) ? b : a));
    const off = depth(outer) - depth(glass);
    track = glass.map(([x, y]) => [x + off * inward[0], y + off * inward[1]]);
  }
  const [a, b] = track;
  const width = len(track);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ang = Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI);
  const band = [mid[0] - COVER_OUT * inward[0], mid[1] - COVER_OUT * inward[1]];
  const icon = [mid[0] + COVER_ICON_IN * inward[0], mid[1] + COVER_ICON_IN * inward[1]];
  const segs = Math.max(1, Math.round(width / COVER_SLAT));
  const slats = [];
  for (let k = 1; k < segs; k++) {
    const x = -width / 2 + k * width / segs;
    slats.push(`          <line class="${N.coverSlat}" x1="${n(x)}" y1="-3" x2="${n(x)}" y2="3"/>`);
  }
  const id = "cover-" + win.id + (cv.sash ? "-" + cv.sash : "");
  const [g0, g1] = glass;
  return [
    `    <g id="${id}" data-entity="${esc(cv.entity)}" class="cover"`,
    `       data-x1="${n(g0[0])}" data-y1="${n(g0[1])}" data-x2="${n(g1[0])}" data-y2="${n(g1[1])}">`,
    `      <line class="cover-hit"   ${lineXY(track)}/>`,
    `      <g class="${N.coverBand}" transform="translate(${n(band[0])} ${n(band[1])}) rotate(${n(ang)})">`,
    `        <g class="${N.coverBandScale}" transform="scale(1 1)">`,
    `          <rect class="${N.coverFabric}" x="${n(-width / 2)}" y="-3" width="${n(width)}" height="6" rx="1"/>`,
    ...slats,
    `        </g>`,
    `      </g>`,
    `      <use class="${N.coverIcon} ${N.coverIconClosed}" href="#${N.coverClosedIcon}" transform="translate(${n(icon[0])} ${n(icon[1])}) rotate(${n(ang)})"/>`,
    `      <use class="${N.coverIcon} ${N.coverIconOpen}" href="#${N.coverOpenIcon}" transform="translate(${n(icon[0])} ${n(icon[1])}) rotate(${n(ang)})"/>`,
    // while it moves: an arrow instead of the icon, up (opening) or down (closing), upright on the screen
    `      <g class="cover-move" transform="translate(${n(icon[0])} ${n(icon[1])}) rotate(${n(upright)})">` +
      `<path class="cover-move-up" d="M0 -4.2 L4 2.4 H-4 Z"/><path class="cover-move-down" d="M0 4.2 L4 -2.4 H-4 Z"/></g>`,
    `    </g>`,
  ].join("\n");
}

// Camera: a fan of `fov` degrees around `direction`, radius `range` (the fan
// shows the angle of view, not the real reach). Only the marker takes clicks.
function camera(cam) {
  const [x, y] = cam.at;
  const r = cam.range;
  const a0 = (cam.direction - cam.fov / 2) * Math.PI / 180;
  const a1 = (cam.direction + cam.fov / 2) * Math.PI / 180;
  const large = cam.fov > 180 ? 1 : 0;
  const fan = `M${x.toFixed(2)} ${y.toFixed(2)} L${(x + r * Math.cos(a0)).toFixed(2)} ${(y + r * Math.sin(a0)).toFixed(2)} ` +
    `A${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} 1 ${(x + r * Math.cos(a1)).toFixed(2)} ${(y + r * Math.sin(a1)).toFixed(2)} Z`;
  return [
    `    <g${attrs({ id: cam.id, class: N.camera, "data-entity-camera": cam.entity, "data-off-plan": cam.off_plan ? "true" : undefined,
      [N.attrName]: cam.name, "data-entity-camera-2": cam.entity_2, "data-entity-camera-hq": cam.entity_hq, "data-entity-detect": cam.detect,
      "data-entity-camera-2-hq": cam.entity_2_hq })}>`,
    // the fan fades with distance and the camera itself is drawn at its tip - so it does not read as a door swing
    `      <radialGradient id="${esc(cam.id)}-fade" gradientUnits="userSpaceOnUse" cx="${n(x)}" cy="${n(y)}" r="${n(r)}">` +
      `<stop offset="0" stop-color="#a99be0" stop-opacity="0.32"/><stop offset="1" stop-color="#a99be0" stop-opacity="0"/></radialGradient>`,
    `      <path class="${N.cameraFan}" d="${fan}" style="fill:url(#${esc(cam.id)}-fade)"/>`,
    `      <circle class="${N.cameraMark}" cx="${n(x)}" cy="${n(y)}" r="5.5"/>`,
    `      <g class="camera-icon" transform="translate(${n(x)} ${n(y)}) rotate(${n(cam.direction)})" pointer-events="none">` +
      `<rect x="-3.6" y="-2.2" width="5" height="4.4" rx="0.8"/><path d="M1.4 -1.2 L3.8 -2.4 V2.4 L1.4 1.2 Z"/></g>`,
    `      <circle class="${N.cameraHit}" cx="${n(x)}" cy="${n(y)}" r="${n(cam.hit_r || CAMERA_HIT_R)}"/>`,
    `    </g>`,
  ].join("\n");
}

// Door lock: padlock icon (closed / open shackle), opened by press-and-hold.
function lock(lk, upright) {
  const [x, y] = lk.at;
  return [
    `    <g id="${lk.id}" class="${N.lock}"`,
    `       data-entity="${esc(lk.entity)}"`,
    `       transform="rotate(${n(upright)} ${n(x)} ${n(y)})">`,
    `      <rect class="${N.lockHit}" x="${n(x - 11)}" y="${n(y - 11)}" width="22" height="22"/>`,
    `      <path class="${N.lockClosed}" d="M${n(x - 3.3)} ${n(y - 2.5)} v-3.4 a3.3 3.3 0 0 1 6.6 0 v3.4"/>`,
    `      <path class="${N.lockOpen}" d="M${n(x - 3.3)} ${n(y - 4.3)} v-3.4 a3.3 3.3 0 0 1 6.6 0 v1.1"/>`,
    `      <rect x="${n(x - 6)}" y="${n(y - 2.5)}" width="12" height="9.6" rx="1.6"/>`,
    `      <circle class="${N.lockKeyhole}" cx="${n(x)}" cy="${n(y + 2.3)}" r="1.4"/>`,
    `    </g>`,
  ].join("\n");
}
