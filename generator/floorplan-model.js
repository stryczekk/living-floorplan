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
  strip: { r: 50, fill: "light-pool" },
};
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

  w(`<svg xmlns="http://www.w3.org/2000/svg"\n     viewBox="${c.viewBox.map(n).join(" ")}" width="${n(c.viewBox[2])}" height="${n(c.viewBox[3])}"\n     role="img" ${N.attrContract}="${c.contract}" data-generator="${GENERATOR_VERSION}"${floorsAttr}>`);
  w(`  <!-- GENERATED from the house model by generator/floorplan-model.js - do not edit by hand -->`);
  if (c.description) w(`  <desc id="desc">${esc(c.description)}</desc>`);
  w(`  <g id="${N.rotation}" transform="rotate(${n(c.rotate)})">`);
  w(`  <rect id="sheet" x="${n(c.sheet[0])}" y="${n(c.sheet[1])}" width="${n(c.sheet[2])}" height="${n(c.sheet[3])}" fill="#1b2433"/>`);

  // --- the garden round the house (under it) ---------------------------------
  const kcm = 1 / ((model.canvas && model.canvas.cm_per_svg) || 1);
  const garden = gardenLayer(model.garden, kcm);
  if (garden) w(`  <defs>\n${gardenDefs(model.garden, kcm)}\n  </defs>\n` + garden);

  // --- rooms ---------------------------------------------------------------
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
      for (const [sash, line] of Object.entries(win.sashes)) {
        w(`      <line id="${win.id}-${sash}" ${lineXY(line)} stroke="#6fc9ef" stroke-width="1.4"/>`);
      }
      w(`    </g>`);
    } else {
      const panes = win.panes || 1, cts = win.contacts || [];
      const one = cts.length === 1 ? cts[0] : null; // one contact for the whole window
      if (panes <= 1 && cts.length <= 1) {
        w(`    <g id="${win.id}" data-facade="${win.facade}" data-width="${n(win.width || len(win.line))}"${contactAttr(one)}>\n` +
          `      <line ${lineXY(win.line)} stroke="#6fc9ef" stroke-width="1.4"/>\n    </g>`);
      } else {
        // divided into panes: a line per pane (each with its own contact when
        // there is one per pane) and short ticks between them
        const [a, b] = win.line, k2 = Math.max(panes, cts.length);
        const at = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        const L0 = len(win.line), nx = -(b[1] - a[1]) / L0, ny = (b[0] - a[0]) / L0, tk = win.tick || 4;
        const parts = [];
        for (let i = 0; i < k2; i++) {
          parts.push(`      <line class="${N.pane}" ${lineXY([at(i / k2), at((i + 1) / k2)])} stroke="#6fc9ef" stroke-width="1.4"` +
            `${cts.length > 1 ? contactAttr(cts[i]) : ""}/>`);
          if (i) { const q = at(i / k2); parts.push(`      <line class="${N.paneTick}" ${lineXY([[q[0] - nx * tk, q[1] - ny * tk], [q[0] + nx * tk, q[1] + ny * tk]])}/>`); }
        }
        w(`    <g id="${win.id}" data-facade="${win.facade}" data-width="${n(win.width || L0)}"${contactAttr(one)}>\n${parts.join("\n")}\n    </g>`);
      }
    }
  }
  for (const d of doors.filter((d) => d.exterior)) {
    w(`    <g id="${d.id}"${hide ? ` class="${N.noSymbol}"` : ""} data-facade="${d.facade}" data-width="${n(doorWidth(d))}"${contactAttr(d.contact)}\n       fill="none" stroke="#384354" stroke-width="1">\n` +
      doorShape(d, true) + `\n    </g>`);
  }
  w(`  </g>`);

  // --- covers -------------------------------------------------------------------------------
  w(`  <g id="covers">`);
  for (const cv of model.covers || []) w(cover(cv, windows.get(cv.window)));
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
    const dash = d.dashed ? ' stroke-dasharray="4 3"' : "";
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
  for (const b of bulbs) lines.push("      " + bulbUse(b, l.kind, upright));
  lines.push(`    </g>`);
  return lines.join("\n");
}
const clipAttr2 = (id) => (id ? ` clip-path="url(#${id})"` : "");

// A fixture with several circuits sharing one bulb icon (e.g. 1 + 3 bulbs):
// each circuit is its own .light group with a glow; the shared icon lights up
// through `.light.on ~ .bulb-shared`, so it must come AFTER the circuits.
function fixture(f, clipOf, upright) {
  const clip = clipOf(f.room);
  const lines = [`    <g id="${f.id}">`];
  for (const c of f.circuits) {
    lines.push(`      <g${attrs({ id: c.id, "data-entity": c.entity, class: "light", "data-kind": f.kind || "main", "data-watts": watts(c.watts) })}>`);
    lines.push(`        <g class="glows"${clipAttr2(clip)}>`);
    lines.push(`        ` + glowCircle(f.at, c.r, (GLOW[f.kind] || GLOW.main).fill, c.dim ? "glow glow-dim" : "glow"));
    lines.push(`        </g>`, `      </g>`);
  }
  lines.push("      " + bulbUse(f.at, f.kind, upright, "bulb-shared"));
  lines.push(`    </g>`);
  return lines.join("\n");
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
  if (d.hit) L.push("      " + hitRect(d.hit));
  // detection range, cut to the room (a sensor does not see through walls)
  const fan = () => {
    if (!d.range) return;
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
    L.push(`      <circle class="${N.iconBadge}" cx="${n(x)}" cy="${n(y)}" r="7.5"/>`);
    L.push(`      <g transform="translate(${n(x)} ${n(y)}) rotate(${n(upright)}) scale(0.95)"><use class="${N.iconGlyph}" href="#icon-${d.kind}"/></g>`);
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
function cover(cv, win) {
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
    `      <path class="${N.cameraFan}" d="${fan}"/>`,
    `      <circle class="${N.cameraMark}" cx="${n(x)}" cy="${n(y)}" r="3.4"/>`,
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
