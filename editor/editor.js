// Floor plan editor: walls, ready-made shapes, openings, rooms, devices.
//
// The model is house model v2 (generator/model-v2.js): centimetres, walls as
// centre lines a -> b with a type and thickness, openings on walls. The plan
// is drawn by the same generator the card uses; this file only adds the
// editing layer (an SVG overlay in cm) and the panel.
//
// Exposed for tests and the console as window.floorplanEditor.

import { generateSvg } from "../generator/floorplan-model.js";
import { FLOOR_PATTERNS, COLORS } from "../generator/floors.js";
import { wallThickness, wallPolygons, wallEnds, CM_PER_SVG_DEFAULT, beamWedge, FRAME_MARGIN, floorModel } from "../generator/model-v2.js";
import { t, LOCALE, translatePage } from "./i18n.js";
import { SHAPES, CORNERS, shapeWalls } from "./shapes.js";
import { OPENING_TYPES, WINDOW_KINDS, DOOR_KINDS, kindType, DEFAULT_WIDTH, DOOR_TYPES, GLAZED, frame, innerRange, fitOpening, makeOpening, retype, outsideOf, setCorner, cornerPair, cornerPartner, cornerRange, outerCornerAt, setCornerWidth, addCornerPair,
  shiftOpening, openingAt, sashes } from "./openings.js";
import { faceAt, inset, area as polyArea, perimeter, pointInPolygon } from "../generator/rooms.js";
import { DEVICE_GROUPS, TWO_POINT, makeDevice, anchor, handles, moveTo, resizeHit, onPolyline, stackTarget, rackTarget, uniqueId, RACK_KINDS, SHADE_KINDS, backDeviceToWall, wallSize, setWallSize, tvWidth, tvInches, hitHandles, dragHit } from "./devices.js";
import { MARKER_ICONS } from "../generator/notes.js";
import { pickScale, barLength, pdfWithImage, EXPORT_CSS } from "./export.js";
import { buildHouse } from "./wizard.js";
import { lightSvg } from "../generator/light.js";
import { GARDEN_AREAS, GARDEN_LINES, GARDEN_PLANTS, PLANT_R, HEDGE_W } from "../generator/garden.js";
import { ICON_KINDS, VALUE_KINDS } from "../generator/icons.js";
import { HaConnection } from "./ha.js";
import { applyStates, clearStates } from "./live.js";
import { icon, tiles } from "./ui-icons.js";
import { prettyJson } from "./json-pretty.js";
import { mergeWalls } from "./walls-merge.js";
import { FURNITURE_GROUPS, FURNITURE_SIZE as FURN_SIZES, pieceShape, drawnShape, stairVoids } from "../generator/furniture.js";
import { uniquePieceId, makePiece, placePiece, pieceAt, pieceCorners, backToWall, pieceHandles, resizeTo, clusters, splitPieces, turnPieces, reorder } from "./furniture-edit.js";

const SVGNS = "http://www.w3.org/2000/svg";
const STORE = "floorplan-editor.model";
const NODE_PX = 10;   // snap / grab radius of a corner, screen px
const WALL_PX = 8;    // snap radius to a wall's centre line
const MIN_LEN = 1;    // cm - shorter walls are not created
const DEFAULT_TYPES = { exterior: { thickness: 40 }, load_bearing: { thickness: 25 }, partition: { thickness: 12 } };

const $ = (id) => document.getElementById(id);
const stage = $("stage"), overlay = $("overlay"), gridSvg = $("grid"), planHost = $("plan");

// --- small vector helpers (cm) ----------------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const same = (a, b, e = 0.05) => Math.abs(a[0] - b[0]) <= e && Math.abs(a[1] - b[1]) <= e;
const r2 = (v) => Math.round(v * 100) / 100;
const rp = (p) => [r2(p[0]), r2(p[1])];
const fmt = (v) => (Math.round(v * 10) / 10).toLocaleString(LOCALE);
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const typeName = (k) => { const s = t("t_" + k); return s === "t_" + k ? k : s; };

// distance from p to segment a-b and the parameter t (0..1) of the closest point
function toSegment(p, a, b) {
  const d = sub(b, a), L2 = dot(d, d);
  const t = L2 ? Math.max(0, Math.min(1, dot(sub(p, a), d) / L2)) : 0;
  const q = add(a, mul(d, t));
  return { dist: len(sub(p, q)), t, q };
}

// --- state ---------------------------------------------------------------------------------
const emptyModel = () => ({
  version: 2,
  canvas: { cm_per_svg: CM_PER_SVG_DEFAULT, rotate: 0, contract: 2 },
  wall_types: JSON.parse(JSON.stringify(DEFAULT_TYPES)),
  walls: [], rooms: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [],
});

const S = {
  model: emptyModel(),
  furniture: "",
  history: [], future: [],
  view: { cx: 400, cy: 300, s: 0.8 },     // centre (cm) and scale (px per cm)
  tool: "select",
  gard: { kind: "lawn", mode: "rect", pts: [] }, // the garden tool: what it draws, the points so far
  selGarden: null,
  wallType: "exterior",
  thickness: null,                        // null = the type's default
  grid: "auto",                           // snapping step in cm, or "auto" (from the zoom)
  showDims: true,
  sel: null,                              // index of the selected wall
  hover: null,                            // {kind: "wall"|"node", ...}
  draw: null,                             // {start, chainStart, last}
  typed: "",
  cursor: null, snap: null,
  drag: null,
  shape: { kind: "rect", params: { ...SHAPES.rect.params }, outside: true },
  opening: { type: "window", width: null, hinge: "from" }, // the openings tool
  selOp: null,                            // selected opening: {w: wall index, o: opening index}
  opCand: null,                           // where the openings tool would place one
  selRoom: null,                          // index of the selected room
  selDiv: null,                           // index of the selected divider
  roomHover: null,                        // the area under the cursor in the rooms tool
  dev: { type: "ceiling", start: null },  // the devices tool (start: first click of a rail / strip)
  selDev: null,                           // selected device: {list, i, bulb}
  live: false,                            // Home Assistant states on the plan
  underlay: null,                         // {src, x, y, scale (cm per image px), opacity, w, h}
  cal: null,                              // calibration: first point picked
  ghost: null,                            // walls not placed yet (drawing, shapes): [[a, b], ...]
  div: { start: null, blocks: false },    // the divide tool: first point, "light stops here" for new lines
  furn: { kind: "bed" },                  // the furniture tool: the piece to place ("_draw" = draw one, "lib:<id>" = one of mine)
  sketch: { shape: "rect", start: null, pts: [], parts: [], detail: false }, // a piece being drawn (cm, on the plan)
  selFurn: null,                          // index of the selected piece of furniture (the one clicked)
  selMore: new Set(),                     // more pieces selected with Shift (their groups come along)
  // floors: S.model is the floor being edited (as a model of its own); S.house the whole house, whose
  // lists of THAT floor are stale until house() puts S.model back in; S.floor: -1 = the ground floor
  house: null, floor: -1, hists: {},
};
const ha = new HaConnection();
const clearSel = () => { S.sel = null; S.selOp = null; S.selRoom = null; S.selDiv = null; S.selDev = null; S.selFurn = null; S.selMore = new Set(); S.selGarden = null; S.selLights = new Set(); };

const cmPerSvg = () => S.model.canvas.cm_per_svg || CM_PER_SVG_DEFAULT;

// --- history -------------------------------------------------------------------------------
function snapshot() { return JSON.stringify(S.model); }
function commit(before) {
  S.history.push(before);
  if (S.history.length > 200) S.history.shift();
  S.future = [];
  changed();
}
function undo() {
  if (!S.history.length) return;
  S.hover = null;
  S.future.push(snapshot());
  S.model = JSON.parse(S.history.pop());
  clearSel(); S.draw = null;
  changed();
}
function redo() {
  if (!S.future.length) return;
  S.hover = null;
  S.history.push(snapshot());
  S.model = JSON.parse(S.future.pop());
  clearSel();
  changed();
}
// The whole house: the floor being edited put back into its place.
function house() {
  const h = S.house || {};
  const { floors: _f, ...flat } = S.model;
  if (S.floor < 0) return h.floors && h.floors.length ? { ...flat, floors: h.floors } : flat;
  const { version, canvas, wall_types, ...lists } = flat;
  return { ...h, canvas, wall_types, floors: h.floors.map((f, i) => (i === S.floor ? { id: f.id, name: f.name, ...lists } : f)) };
}
const floorName = (i) => (i < 0 ? (S.house && S.house.floor_name) || t("ground_floor") : S.house.floors[i].name || S.house.floors[i].id);
function renderFloors() {
  const sel = $("floor");
  if (!sel) return;
  const n = (S.house && S.house.floors || []).length;
  sel.innerHTML = [-1, ...Array.from({ length: n }, (_, i) => i)].map((i) =>
    `<option value="${i}"${i === S.floor ? " selected" : ""}>${esc(floorName(i))}</option>`).join("");
  // the floor below, faint under an upper floor: on / off (only on an upper floor)
  const b = $("b-floor-below");
  if (b) { b.hidden = S.floor < 0; b.classList.toggle("on", !!S.showBelow); }
}
// Edit another floor: the current one goes back into the house, each floor keeps its own undo history.
function switchFloor(i) {
  if (i === S.floor) return;
  const h = house();
  S.hists[S.floor] = { history: S.history, future: S.future };
  S.house = h;
  S.floor = i;
  S.model = JSON.parse(JSON.stringify(floorModel(h, i)));
  ({ history: S.history, future: S.future } = S.hists[i] || { history: [], future: [] });
  clearSel(); S.draw = null; S.ghost = null;
  S.loading = true; changed(); S.loading = false;
  renderFloors();
}
function addFloor() {
  const name = prompt(t("floor_name_q"), t("floor_default", { n: (S.house.floors || []).length + 1 }));
  if (name === null) return;
  const h = house(), top = (h.floors || []).length - 1;
  const used = new Set((h.floors || []).map((f) => f.id));
  let k = 1; while (used.has("floor-" + k)) k++;
  const fl = { id: "floor-" + k, name: name.trim() || "floor-" + k, walls: [], rooms: [] };
  // the outline of the floor below (its exterior walls) to start from
  if (confirm(t("floor_copy_q"))) fl.walls = JSON.parse(JSON.stringify(floorModel(h, top).walls.filter((w) => w.type === "exterior").map(({ openings, ...w }) => w)));
  h.floors = [...(h.floors || []), fl];
  S.house = h;
  if (S.floor < 0) S.model = floorModel(h, -1); // the ground floor now knows about the new floor
  switchFloor(h.floors.length - 1);
  S.dirty = true; storeServerState(); showVersion();
  try { localStorage.setItem(STORE, JSON.stringify(house())); } catch { /* private mode */ }
}
function editFloor() {
  const name = prompt(S.floor < 0 ? t("floor_rename_q") : t("floor_rename_del_q"), floorName(S.floor));
  if (name === null) return;
  const h = house();
  if (S.floor < 0) {
    if (name.trim()) h.floor_name = name.trim(); else delete h.floor_name;
    S.house = h;
  } else if (!name.trim()) {
    if (!confirm(t("floor_delete_q", { name: floorName(S.floor) }))) return;
    h.floors.splice(S.floor, 1);
    if (!h.floors.length) delete h.floors;
    delete S.hists[S.floor];
    S.house = h; S.floor = -1;
    S.model = JSON.parse(JSON.stringify(floorModel(h, -1)));
    S.history = []; S.future = [];
    clearSel();
  } else {
    h.floors[S.floor].name = name.trim();
    S.house = h;
  }
  S.dirty = true; storeServerState(); showVersion();
  changed(); renderFloors();
}
function changed() {
  try { localStorage.setItem(STORE, JSON.stringify(house())); } catch { /* private mode */ }
  if (!S.loading) { S.dirty = true; storeServerState(); }
  showVersion();
  renderPlan();
  renderOverlay();
  renderPanel();
  $("b-undo").disabled = !S.history.length;
  $("b-redo").disabled = !S.future.length;
}

// --- view ----------------------------------------------------------------------------------
function stageSize() { const r = stage.getBoundingClientRect(); return [r.width, r.height]; }
function viewBoxCm() {
  const [W, H] = stageSize(), { cx, cy, s } = S.view;
  return [cx - W / 2 / s, cy - H / 2 / s, W / s, H / s];
}
function toModel(ev) {
  const r = stage.getBoundingClientRect(), { cx, cy, s } = S.view;
  return [cx + (ev.clientX - r.left - r.width / 2) / s, cy + (ev.clientY - r.top - r.height / 2) / s];
}
function fit() {
  const pts = S.model.walls.flatMap((w) => [w.a, w.b]);
  if (!pts.length) { S.view = { cx: 400, cy: 300, s: S.view.s }; return draw(); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const [W0, H] = stageSize();
  // the plan fits the area left beside the right panel even while the panel is closed, so selecting something
  // never covers it (the panel's width when it is not there; none on a phone, where it goes under the plan)
  const main = document.querySelector("main");
  const reserve = getComputedStyle($("panel")).display === "none" && getComputedStyle(main).gridTemplateColumns.split(" ").length > 1 ? PANEL_W : 0;
  const W = W0 - reserve;
  const w = Math.max(...xs) - Math.min(...xs) + 200, h = Math.max(...ys) - Math.min(...ys) + 200;
  const s2 = Math.min(W / w, H / h);
  S.view = { cx: (Math.max(...xs) + Math.min(...xs)) / 2 + reserve / 2 / s2, cy: (Math.max(...ys) + Math.min(...ys)) / 2, s: s2 };
  draw();
}
function zoomAt(ev, factor) {
  const p = toModel(ev);
  const s = Math.max(0.05, Math.min(20, S.view.s * factor));
  const k = S.view.s / s;
  S.view = { cx: p[0] + (S.view.cx - p[0]) * k, cy: p[1] + (S.view.cy - p[1]) * k, s };
  draw();
}
function draw() { applyView(); renderOverlay(); }
// The right panel comes and goes with the selection; the plan area narrows / widens by its width, so the view
// moves by half of it and the plan stays where it was on the screen (not on a phone: the panel goes under it)
const PANEL_W = 280; // px, as in editor.css (main.has-sel)
function panelOpen(open) {
  const main = document.querySelector("main");
  if (main.classList.contains("has-sel") === open) return;
  const w0 = stage.getBoundingClientRect().width;
  main.classList.toggle("has-sel", open);
  const dw = stage.getBoundingClientRect().width - w0;
  if (dw) { S.view.cx += dw / 2 / S.view.s; draw(); }
}

// --- plan (generator output) -----------------------------------------------------------------
let planSvg = null;
let planQueued = false;
let planTimer = null, lastPlan = 0;
function renderPlan() {
  // while dragging: the overlay (outline, dimensions) follows every frame, the
  // whole plan at most every 40 ms - re-inserting ~100 kB of SVG is the costly part
  if ((S.drag || S.ghost || S.devGhost) && performance.now() - lastPlan < 40) {
    if (!planTimer) planTimer = setTimeout(() => { planTimer = null; renderPlan(); }, 40);
    return;
  }
  if (planQueued) return;
  planQueued = true;
  requestAnimationFrame(() => {
    planQueued = false;
    lastPlan = performance.now();
    // the editor shows the plan as drawn (north up), without the card's rotation
    const m = { ...S.model, canvas: { ...S.model.canvas, rotate: 0, viewBox: undefined, sheet: undefined } };
    // walls being drawn / a shape under the cursor are drawn as if placed, so
    // their corners join the existing walls exactly as they will
    if (S.ghost && S.ghost.length) m.walls = [...m.walls, ...ghostWalls(S.ghost)];
    // the device in hand, drawn where it will stand
    let dg = S.tool === "devices" && !S.drag && S.devGhost;
    const under = dg && dg.stack !== undefined && S.model.devices[dg.stack];
    const rk = dg && dg.rack !== undefined && S.model.devices[dg.rack];
    if (rk) { dg = { ...dg, item: { ...rk, id: rk.id, items: [...(rk.items || []), { id: "rack-new", kind: dg.kind, entity: "" }] } }; m.devices = m.devices.map((x) => (x === rk ? dg.item : x)); }
    else if (under && !under.top) { dg = { ...dg, item: { ...under, top: { kind: dg.kind, entity: "" } } }; m.devices = m.devices.map((x) => (x === under ? dg.item : x)); }
    else if (dg && dg.item) m[dg.list] = [...(m[dg.list] || []), dg.item];
    else dg = null;
    // an upper floor: the stairs coming up from the floor below are a void in it
    if (S.floor >= 0) {
      const voids = stairVoids(floorModel(S.house, S.floor - 1));
      if (voids.length) m.furniture = [...(m.furniture || []), ...voids];
    }
    try {
      planHost.innerHTML = generateSvg(m, { furniture: S.floor < 0 ? S.furniture : "" });
      planSvg = planHost.querySelector("svg");
      planSvg.removeAttribute("width"); planSvg.removeAttribute("height");
      planSvg.setAttribute("preserveAspectRatio", "none");
      $("st-msg").textContent = "";
      if (S.live && ha.connected) applyStates(planSvg, ha.states, LOCALE);
      if (dg) for (const id of dg.rack !== undefined ? ["rack-new"] : [dg.item.id, dg.item.id + "-top"]) { const g = planSvg.getElementById(id); if (g) g.classList.add("ghost"); }
    } catch (e) {
      $("st-msg").textContent = t("draw_error") + e.message;
    }
    applyView();
  });
}
function applyView() {
  const vb = viewBoxCm();
  overlay.setAttribute("viewBox", vb.join(" "));
  overlay.setAttribute("preserveAspectRatio", "none");
  gridSvg.setAttribute("viewBox", vb.join(" "));
  gridSvg.setAttribute("preserveAspectRatio", "none");
  if (planSvg) planSvg.setAttribute("viewBox", vb.map((v) => v / cmPerSvg()).join(" "));
  renderGrid();
  placeUnderlay();
}

function renderGrid() {
  const [x, y, w, h] = viewBoxCm();
  const s = S.view.s;
  const base = S.grid === "auto" ? 10 : S.grid;
  let step = base;
  while (step * s < 8) step *= step === base && base < 10 ? 10 / base : 10;
  const lines = [];
  const major = 100;
  for (let gx = Math.ceil(x / step) * step; gx < x + w; gx += step) {
    const m = Math.abs(gx % major) < 1e-6;
    lines.push(`<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + h}" stroke="${m ? "#2a3547" : "#1c2534"}"/>`);
  }
  for (let gy = Math.ceil(y / step) * step; gy < y + h; gy += step) {
    const m = Math.abs(gy % major) < 1e-6;
    lines.push(`<line x1="${x}" y1="${gy}" x2="${x + w}" y2="${gy}" stroke="${m ? "#2a3547" : "#1c2534"}"/>`);
  }
  gridSvg.innerHTML = lines.join("");
}

// --- geometry queries ------------------------------------------------------------------------
function nodes() {
  const out = [];
  for (const w of [...S.model.walls, ...(S.model.dividers || [])]) for (const p of [w.a, w.b]) if (!out.some((q) => same(q, p))) out.push(p);
  return out;
}
function nodeAt(p, except = null) {
  const r = NODE_PX / S.view.s;
  let best = null, bd = r;
  for (const q of nodes()) {
    if (except && same(q, except)) continue;
    const d = len(sub(p, q));
    if (d <= bd) { best = q; bd = d; }
  }
  return best;
}
function wallAt(p, exceptNode = null) {
  let best = null, bd = Infinity;
  S.model.walls.forEach((w, i) => {
    // a dragged corner must not snap to the walls that move with it
    if (exceptNode && (same(w.a, exceptNode) || same(w.b, exceptNode))) return;
    const { dist } = toSegment(p, w.a, w.b);
    const reach = Math.max(wallThickness(S.model, w) / 2, WALL_PX / S.view.s);
    if (dist <= reach && dist < bd) { best = i; bd = dist; }
  });
  return best;
}
const snapLabel = (k) => (k ? t({ node: "snap_node", axis: "snap_axis", 90: "snap_90", 45: "snap_45", grid: "snap_grid" }[k]) : "");
// Snapping step (cm): the grid picked in the toolbar, or with "auto" the
// largest of 1 / 2 / 5 / 10 / 20 / 50 cm that is at most ~6 px on screen - so
// dragging feels smooth at any zoom and gets finer when zoomed in.
function snapStep() {
  if (S.grid !== "auto") return S.grid;
  let best = 1;
  for (const st of [1, 2, 5, 10, 20, 50]) if (st * S.view.s <= 6) best = st;
  return best;
}
const snapGrid = (p) => { const g = snapStep(); return [Math.round(p[0] / g) * g, Math.round(p[1] / g) * g]; };

// Snap a raw pointer position. `from`: start of the wall being drawn (angle
// snapping); `exceptNode`: the node being dragged.
function snapPoint(raw, { from = null, free = false, exceptNode = null } = {}) {
  const node = nodeAt(raw, exceptNode);
  if (node) return { p: node, kind: "node" };
  if (from && !free) {
    const v = sub(raw, from), L = len(v);
    if (L > 0) {
      const a = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * (Math.PI / 4);
      const dir = [Math.cos(a), Math.sin(a)];
      // along the axes: length in whole grid steps; diagonals: end on a grid
      // node (equal steps across and down), so the corner stays on the grid
      const diag = Math.abs(dir[0]) > 1e-6 && Math.abs(dir[1]) > 1e-6;
      const l = diag
        ? Math.max(snapStep(), Math.round((dot(v, dir) * Math.abs(dir[0])) / snapStep()) * snapStep()) / Math.abs(dir[0])
        : Math.max(snapStep(), Math.round(dot(v, dir) / snapStep()) * snapStep());
      // on that ray, prefer crossing a wall's centre line when close to it
      const p = add(from, mul(dir, l));
      const onWall = wallSnap(raw, from, dir);
      if (onWall) return onWall;
      return { p: rp(p), kind: Math.round((a * 180) / Math.PI) % 90 === 0 ? "90" : "45", dir };
    }
  }
  const w = wallAt(raw, exceptNode);
  if (w !== null && !free) {
    const wall = S.model.walls[w];
    const { dist } = toSegment(raw, wall.a, wall.b);
    if (dist <= WALL_PX / S.view.s) {
      // on the axis, at a grid step along it
      const q = free ? toSegment(raw, wall.a, wall.b).q : toSegment(snapGrid(raw), wall.a, wall.b).q;
      return { p: rp(q), kind: "axis" };
    }
  }
  return { p: free ? rp(raw) : snapGrid(raw), kind: free ? "" : "grid" };
}
// While drawing along a snapped direction: the crossing with a nearby wall axis.
function wallSnap(raw, from, dir) {
  const r = WALL_PX / S.view.s;
  for (const w of S.model.walls) {
    const d = sub(w.b, w.a);
    const c = dir[0] * d[1] - dir[1] * d[0];
    if (Math.abs(c) < 1e-9) continue;
    const t = ((w.a[0] - from[0]) * d[1] - (w.a[1] - from[1]) * d[0]) / c;   // along dir
    const u = ((w.a[0] - from[0]) * dir[1] - (w.a[1] - from[1]) * dir[0]) / c; // along wall
    if (t <= MIN_LEN || u < 0 || u > 1) continue;
    const p = add(from, mul(dir, t));
    if (len(sub(p, raw)) <= r) return { p: rp(p), kind: "axis", dir };
  }
  return null;
}

// --- editing operations -------------------------------------------------------------------------
function addWall(a, b) {
  if (len(sub(b, a)) < MIN_LEN) return false;
  S.ghost = null;
  const before = snapshot();
  const w = { type: S.wallType, a: rp(a), b: rp(b) };
  if (S.thickness) w.thickness = S.thickness;
  S.model.walls.push(w);
  merged();
  commit(before);
  return true;
}
// Walls drawn over existing ones become one with them (shapes side by side share a wall).
function merged() {
  const n = mergeWalls(S.model);
  if (n) { S.sel = null; S.hover = null; $("st-msg").textContent = t("walls_merged", { n }); }
  return n;
}
// Move every wall end at `from` to `to`.
function moveNode(from, to) {
  for (const w of [...S.model.walls, ...(S.model.dividers || [])]) for (const e of ["a", "b"]) if (same(w[e], from)) w[e] = rp(to);
}
// Move wall i by `delta` across its own direction; walls ending at its ends or
// on its centre line (T-joints) move with it.
function moveWall(i, delta, base) {
  const w0 = base.walls[i];
  const u = sub(w0.b, w0.a), L = len(u);
  const n = [-u[1] / L, u[0] / L];
  const k = dot(delta, n);
  const shift = mul(n, k);
  S.model = JSON.parse(JSON.stringify(base));
  const ends = [w0.a, w0.b], half = wallThickness(base, w0) / 2 + 0.5;
  // ends of walls and boundaries at its corners or on it (T-joints) go along - also a wall across it that
  // ends at its face rather than its axis (drawn up to the wall, 28.10)
  const follow = (list, baseList, self) => list.forEach((w, j) => {
    const v = sub(baseList[j].b, baseList[j].a), lv = len(v) || 1;
    const across = Math.abs(dot(v, u)) / (lv * L) < 0.5;
    for (const e of ["a", "b"]) {
      const p = baseList[j][e], dist = toSegment(p, w0.a, w0.b).dist;
      const onIt = j === self || ends.some((q) => same(q, p)) || dist < 0.05 || (across && dist <= half);
      if (onIt) w[e] = rp(add(p, shift));
    }
  });
  follow(S.model.walls, base.walls, i);
  follow(S.model.dividers || [], base.dividers || [], -1);
}
function deleteWall(i) {
  const before = snapshot();
  dropCovers((S.model.walls[i].openings || []).map((o) => o.id));
  S.model.walls.splice(i, 1);
  clearSel();
  S.hover = null; // its index would point at another wall now
  commit(before);
}
function setWallLength(i, L) {
  const w = S.model.walls[i];
  const u = sub(w.b, w.a), l0 = len(u);
  if (!(L >= MIN_LEN) || !l0) return;
  const before = snapshot();
  const nb = rp(add(w.a, mul(u, L / l0)));
  moveNode(w.b, nb);
  commit(before);
}
function setWallProp(i, key, value) {
  const before = snapshot();
  const w = S.model.walls[i];
  if (value === null || value === "" || Number.isNaN(value)) delete w[key]; else w[key] = value;
  commit(before);
}

// --- drawing walls ---------------------------------------------------------------------------------
function placePoint(p) {
  if (!S.draw) { S.draw = { start: p, chainStart: p }; return; }
  const closing = same(p, S.draw.chainStart) && S.draw.start !== S.draw.chainStart;
  if (addWall(S.draw.start, p)) {
    S.draw.last = sub(p, S.draw.start);
    S.draw.start = p;
  }
  if (closing) endChain();
}
function endChain() { S.draw = null; S.typed = ""; showTyped(); setGhost(null); renderOverlay(); }
function typedCommit() {
  const L = parseFloat(S.typed.replace(",", "."));
  if (!S.draw || !(L > 0)) return;
  let dir = S.snap && S.snap.dir;
  if (!dir && S.cursor) {
    const v = sub(S.cursor, S.draw.start);
    if (len(v) > 0) dir = mul(v, 1 / len(v));
  }
  if (!dir && S.draw.last) dir = mul(S.draw.last, 1 / len(S.draw.last));
  if (!dir) dir = [1, 0];
  S.typed = "";
  showTyped();
  placePoint(rp(add(S.draw.start, mul(dir, L))));
}
function showTyped() {
  $("len-box").hidden = !S.typed;
  $("len-val").textContent = S.typed;
}

// --- overlay ----------------------------------------------------------------------------------------------
function el(tag, attrs, text) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}
// A wall's outline as if it had no openings. The copy must REPLACE the wall in
// the model it is computed with: joints are found by comparing walls by
// identity, and a separate copy would meet itself at both ends.
function solidWall(w) {
  const solid = { ...w, openings: [] };
  return wallPolygons({ ...S.model, walls: S.model.walls.map((x) => (x === w ? solid : x)) }, solid)[0];
}
function wallOutline(i, cls) {
  // a rectangle with square ends reaching as far as the wall does: at a corner
  // to the outer corner, at a T-joint to the face it meets
  const w = S.model.walls[i];
  const A = wallEnds(S.model, w, "a"), B = wallEnds(S.model, w, "b");
  const s0 = Math.min(A.left, A.right), s1 = Math.max(B.left, B.right);
  const u = sub(w.b, w.a), L = len(u) || 1, d = [u[0] / L, u[1] / L], n = [-d[1], d[0]], h = wallThickness(S.model, w) / 2;
  const at = (t, o) => add(add(w.a, mul(d, t)), mul(n, o));
  const pts = [at(s0, h), at(s1, h), at(s1, -h), at(s0, -h)];
  return el("polygon", { class: cls, points: pts.map((p) => p.join(",")).join(" ") });
}
function dimLabel(a, b, offset, cls, text) {
  const u = sub(b, a), L = len(u);
  if (!L) return null;
  const n = [-u[1] / L, u[0] / L];
  const m = add(mul(add(a, b), 0.5), mul(n, offset));
  let ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
  if (ang > 90) ang -= 180;
  if (ang < -90) ang += 180;
  const fs = 12 / S.view.s;
  return el("text", { class: "ov-dim " + cls, x: m[0], y: m[1], "font-size": fs,
    transform: `rotate(${ang} ${m[0]} ${m[1]})` }, text);
}
function renderOverlay() {
  overlay.replaceChildren();
  const px = 1 / S.view.s;
  // an upper floor: the walls of the floor below, faint (walls above walls)
  if (S.floor >= 0 && S.showBelow) {
    const below = floorModel(S.house, S.floor - 1);
    for (const w of below.walls || []) for (const pg of wallPolygons(below, w)) {
      overlay.append(el("polygon", { class: "ov-below", points: pg.map((q) => q.join(",")).join(" ") }));
    }
  }
  // rooms: the selected / hovered outline, names and areas
  const poly = (pts, cls) => el("polygon", { class: cls, points: pts.map((q) => q.join(",")).join(" ") });
  if (S.tool === "rooms" && S.roomHover) overlay.append(poly(S.roomHover, "ov-room-hover"));
  const selRoom = S.selRoom !== null && S.model.rooms[S.selRoom];
  if (selRoom) { const pts = roomPoly(selRoom); if (pts) overlay.append(poly(pts, "ov-room-sel")); }
  if (S.view.s > 0.12) {
    S.model.rooms.forEach((r, i) => {
      const a = roomAnchor(r), pts = roomPoly(r);
      if (!a) return;
      const fs = 12 * px;
      overlay.append(el("text", { class: "ov-room" + (i === S.selRoom ? " sel" : ""), x: a[0], y: a[1], "font-size": fs }, r.name || r.id));
      if (pts) overlay.append(el("text", { class: "ov-room area", x: a[0], y: a[1] + fs * 1.2, "font-size": fs * 0.85 }, m2(polyArea(pts)) + " m²"));
      const box = pts && rectSize(pts); // a rectangular room: its inner width x depth
      if (box && S.showDims) overlay.append(el("text", { class: "ov-room area", x: a[0], y: a[1] + fs * 2.25, "font-size": fs * 0.85 }, `${fmt(box[0])} × ${fmt(box[1])}`));
      if (i === S.selRoom) overlay.append(el("circle", { class: "ov-node sel", cx: a[0], cy: a[1] - fs * 1.1, r: 4 * px }));
    });
  }
  // devices with only a click area (TV, A/C, appliances) are invisible while
  // off - outline them in the editor
  for (const d of S.model.devices || []) {
    if (!d.hit || d.type === "presence") continue;
    // drawn as the thing itself (a TV, an A/C, a washer, a boiler...): no outline or name needed
    if (d.type === "tv" || d.type === "climate_unit" || d.kind) continue;
    overlay.append(el("rect", { class: "ov-device", x: d.hit[0], y: d.hit[1], width: d.hit[2], height: d.hit[3] }));
    overlay.append(el("text", { class: "ov-device-name", x: d.hit[0] + d.hit[2] / 2, y: d.hit[1] + d.hit[3] / 2, "font-size": 10 * px },
      t({ appliance: "d_appliance", tv: "d_tv", climate_unit: "d_ac" }[d.type] || d.type)));
  }
  // the selected pieces of furniture (turned outlines; a group or several also their common frame);
  // one piece: its resize handles, and while dragged its distances to the walls
  const fsel = selPieces();
  for (const i of fsel) overlay.append(el("polygon", { class: "ov-sel", points: pieceCorners(S.model.furniture[i]).map((q) => q.join(",")).join(" ") }));
  if (fsel.length > 1 && S.drag && S.drag.kind === "furniture" && S.drag.moved) pieceRays(fsel);
  if (fsel.length > 1) {
    const pts = fsel.flatMap((i) => pieceCorners(S.model.furniture[i])), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], g = 6 * px;
    overlay.append(el("rect", { class: "ov-hover", x: b[0] - g, y: b[1] - g, width: b[2] - b[0] + 2 * g, height: b[3] - b[1] + 2 * g }));
  }
  const sf = fsel.length === 1 && S.model.furniture[fsel[0]];
  if (sf) {
    if (S.drag && S.drag.kind === "furniture" && S.drag.moved) pieceRays(fsel);
    if (sf.kind !== "custom") for (const h of pieceHandles(sf)) {
      const r = (h.sx && h.sy ? 4 : 3.2) * px;
      overlay.append(el("rect", { class: "ov-node sel", x: h.p[0] - r, y: h.p[1] - r, width: 2 * r, height: 2 * r }));
    }
    // while resized: its size in the middle
    if (S.drag && S.drag.kind === "furnSize" && S.drag.moved) {
      overlay.append(el("text", { class: "ov-dim", x: sf.at[0], y: sf.at[1], "font-size": 12 * px, "text-anchor": "middle" },
        `${fmt(sf.size[0])} × ${fmt(sf.size[1])}`));
    }
  }
  // devices: the selected one (and a camera's handles), the devices tool's cursor
  const sd = selDevice();
  if (sd) {
    const a = anchor(sd.list, sd.x, sd.bulb);
    overlay.append(el("circle", { class: "ov-sel", cx: a[0], cy: a[1], r: 9 * px }));
    // a rail: its corners, dragged to change its shape
    if (sd.list === "lights" && sd.x.rail) {
      overlay.append(el("polyline", { class: "ov-sel", fill: "none", points: sd.x.rail.map((q) => q.join(",")).join(" ") }));
      for (const q of sd.x.rail) overlay.append(el("rect", { class: "ov-node sel", x: q[0] - 4 * px, y: q[1] - 4 * px, width: 8 * px, height: 8 * px }));
    }
    // one circuit: all its bulbs marked and joined by a thin line
    if (sd.list === "lights" && sd.x.bulbs && sd.x.bulbs.length > 1) {
      // (on a rail the rail itself shows the circuit)
      if (!sd.x.rail) overlay.append(el("polyline", { class: "ov-guide", fill: "none", points: sd.x.bulbs.map((q) => q[0] + "," + q[1]).join(" ") }));
      sd.x.bulbs.forEach((q, k) => { if (k !== sd.bulb) overlay.append(el("circle", { class: "ov-sel", cx: q[0], cy: q[1], r: 6 * px })); });
    }
    for (const j of S.selLights || []) {
      const l = S.model.lights[j];
      for (const q of (l && l.bulbs) || []) overlay.append(el("circle", { class: "ov-sel", cx: q[0], cy: q[1], r: 9 * px }));
    }
    if (sd.x.hit) {
      overlay.append(el("rect", { class: "ov-sel", x: sd.x.hit[0], y: sd.x.hit[1], width: sd.x.hit[2], height: sd.x.hit[3] }));
      // its size handles (corners and sides; the opposite side stays), and the size while dragged
      if (devResizable(sd)) for (const h of hitHandles(sd.x.hit)) {
        const r = (h.sx && h.sy ? 4 : 3.2) * px;
        overlay.append(el("rect", { class: "ov-node sel", x: h.p[0] - r, y: h.p[1] - r, width: 2 * r, height: 2 * r }));
      }
      if (S.drag && S.drag.kind === "devSize" && S.drag.moved) {
        const [W, D] = wallSize(sd.x), h = sd.x.hit;
        overlay.append(el("text", { class: "ov-dim", x: h[0] + h[2] / 2, y: h[1] + h[3] / 2, "font-size": 12 * px, "text-anchor": "middle" },
          `${fmt(W)} × ${fmt(D)}` + (sd.x.type === "tv" ? ` · ${Math.round(tvInches(W))}″` : "")));
      }
    }
    const x = sd.x;
    // the selected bulb's own beam (its 4th value) or the light's; the bulb's position only (x, y)
    const b = x.bulbs && x.bulbs[sd.bulb];
    const angle = (b && b[3]) || x.beam;
    if (angle > 0 && angle < 360 && x.type !== "tv" && x.type !== "climate_unit") {
      const c = b ? b.slice(0, 2) : x.strip ? [x.strip[0] + x.strip[2] / 2, x.strip[1] + x.strip[3] / 2] : x.glow && x.glow.at;
      const wd = c && beamWedge(c, b ? b[2] : x.beam_dir, angle, 60 * px);
      if (wd && wd.length) overlay.append(el("polygon", { class: "ov-beam", points: wd.map((q) => q.join(",")).join(" ") }));
    }
    if (sd.list === "cameras" || sd.x.range) for (const h of cameraHandles(sd.x)) {
      overlay.append(el("line", { class: "ov-guide", x1: sd.x.at[0], y1: sd.x.at[1], x2: h.p[0], y2: h.p[1] }));
      overlay.append(el("circle", { class: "ov-node sel", cx: h.p[0], cy: h.p[1], r: 5 * px }));
    }
  }
  if (S.tool === "devices" && S.snap) {
    const p = S.snap.p;
    if (S.dev.pts && S.dev.pts.length > 1) overlay.append(el("polyline", { class: "ov-preview", fill: "none", points: S.dev.pts.map((q) => q.join(",")).join(" ") }));
    if (S.dev.start) overlay.append(el("line", { class: "ov-guide", x1: S.dev.start[0], y1: S.dev.start[1], x2: p[0], y2: p[1] }));
    overlay.append(el("circle", { class: "ov-snap", cx: p[0], cy: p[1], r: 5 * px }));
  }
  // while dragging a device: its distances to the walls; a wall: the room on
  // either side of it (wall lengths and the distances around an opening update
  // by themselves)
  const dr = S.drag;
  // a moved wall: the rooms it bounds measured inside; without rooms yet, the
  // free space from its faces to the next walls
  if (dr && dr.kind === "divider" && dr.moved && S.model.dividers[dr.i]) roomDimensions([S.model.dividers[dr.i]]);
  if (dr && dr.kind === "wall" && dr.moved && S.model.walls[dr.i]) {
    if (!roomDimensions([S.model.walls[dr.i]])) wallClearances(S.model.walls[dr.i]);
  }
  if (dr && dr.kind === "node" && dr.cur && !same(dr.cur, dr.from)) {
    roomDimensions(S.model.walls.filter((w) => same(w.a, dr.cur) || same(w.b, dr.cur)));
  }
  if (dr && dr.kind === "device" && dr.moved) {
    const sd = selDevice();
    if (sd) wallRays(anchor(sd.list, sd.x, sd.bulb));
  }
  // a piece being drawn: its shapes, and the one in progress up to the cursor
  if (S.tool === "furniture" && S.furn.kind === "_draw") {
    const k = S.sketch, cur = S.cursor;
    const shapeEl = (t, a, b, cls) => {
      const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
      return t === "ellipse" ? el("ellipse", { class: cls, cx: x + w / 2, cy: y + h / 2, rx: w / 2, ry: h / 2 }) : el("rect", { class: cls, x, y, width: w, height: h });
    };
    for (const q of k.parts) overlay.append(q.t === "poly" ? el("polygon", { class: "ov-sketch" + (q.detail ? " detail" : ""), points: q.pts.map((v) => v.join(",")).join(" ") })
      : shapeEl(q.t, q.a, q.b, "ov-sketch" + (q.detail ? " detail" : "")));
    if (k.start && cur) overlay.append(shapeEl(k.shape, k.start, cur, "ov-sketch live"));
    if (k.pts.length) overlay.append(el("polyline", { class: "ov-sketch live", points: [...k.pts, ...(cur ? [cur] : [])].map((v) => v.join(",")).join(" ") }));
    for (const v of k.pts) overlay.append(el("circle", { class: "ov-node sel", cx: v[0], cy: v[1], r: 4 * px }));
  }
  // calibration points of the underlay
  const showGuides = (S.drag && S.drag.kind === "furniture" && S.drag.moved) || (S.tool === "furniture" && S.furnGhost);
  if (showGuides) for (const [a, b] of S.guides || []) overlay.append(el("line", { class: "ov-guide", x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
  if (S.tool === "furniture" && S.furnGhost) {
    const g = S.furnGhost, [w, d] = g.size;
    const shape = g.kind === "drawn" ? drawnShape(g.parts, w, d) : pieceShape(g.kind, w, d);
    const ge = el("g", { class: "ov-ghost", transform: `translate(${g.at[0]} ${g.at[1]}) rotate(${g.rot || 0})` });
    ge.innerHTML = shape;
    overlay.append(ge);
    overlay.append(el("polygon", { class: "ov-sel", points: pieceCorners(g).map((q) => q.join(",")).join(" ") }));
    boxRays(boxOf([g]));
  }
  if (S.tool === "garden" && S.snap) {
    const q = S.snap.p, a = S.gard.pts, kind = S.gard.kind;
    const pl = (pts, closed) => overlay.append(el(closed ? "polygon" : "polyline", { class: "ov-preview", points: pts.map((x) => x.join(",")).join(" ") }));
    if (GARDEN_PLANTS.includes(kind)) overlay.append(el("circle", { class: "ov-preview", cx: q[0], cy: q[1], r: PLANT_R[kind] }));
    else if (GARDEN_AREAS.includes(kind) && S.gard.mode === "rect" && a.length) pl([a[0], [q[0], a[0][1]], q, [a[0][0], q[1]]], true);
    else if (a.length) pl([...a, q], false);
    for (const x of a) overlay.append(el("circle", { class: "ov-node", cx: x[0], cy: x[1], r: 4 / S.view.s }));
  }
  const sgd = S.selGarden !== null && (S.model.garden || [])[S.selGarden];
  if (sgd) {
    const list = sgd.points || sgd.line;
    if (list) {
      const o = el(sgd.points ? "polygon" : "polyline", { class: "ov-room-sel", points: list.map((x) => x.join(",")).join(" ") });
      if (!sgd.points) o.style.fill = "none";
      overlay.append(o);
      for (const x of list) overlay.append(el("circle", { class: "ov-node sel", cx: x[0], cy: x[1], r: 5 / S.view.s }));
    } else overlay.append(el("circle", { class: "ov-room-sel", cx: sgd.at[0], cy: sgd.at[1], r: sgd.r || PLANT_R[sgd.kind] }));
  }
  if (S.tool === "calibrate" && S.cal) {
    for (const q of [S.cal.a, S.cal.b].filter(Boolean)) overlay.append(el("circle", { class: "ov-node sel", cx: q[0], cy: q[1], r: 5 * px }));
    if (S.cal.a && S.cal.b) overlay.append(el("line", { class: "ov-guide", x1: S.cal.a[0], y1: S.cal.a[1], x2: S.cal.b[0], y2: S.cal.b[1] }));
  }
  // the divide tool: the line being drawn
  if (S.tool === "divide" && S.snap) {
    const q = S.snap.p;
    if (S.div.start) {
      overlay.append(el("line", { class: "ov-divider sel", x1: S.div.start[0], y1: S.div.start[1], x2: q[0], y2: q[1] }));
      if (len(sub(q, S.div.start))) overlay.append(dimLabel(S.div.start, q, -12 * px, "live", fmt(len(sub(q, S.div.start)))));
    }
    overlay.append(el("circle", { class: "ov-snap", cx: q[0], cy: q[1], r: 5 * px }));
    if (S.snap.kind === "node" || S.snap.kind === "axis") overlay.append(el("rect", { class: "ov-snap", x: q[0] - 7 * px, y: q[1] - 7 * px, width: 14 * px, height: 14 * px }));
  }
  // dividers (not drawn on the plan)
  (S.model.dividers || []).forEach((d, i) => overlay.append(el("line", { class: "ov-divider" + (i === S.selDiv ? " sel" : ""),
    x1: d.a[0], y1: d.a[1], x2: d.b[0], y2: d.b[1] })));
  // dimensions: inner walls - their length on the axis; exterior walls -
  // chains outside the building like on an architect's drawing
  if (S.showDims && S.view.s > 0.15) {
    S.model.walls.forEach((w, i) => {
      if (w.type === "exterior") { exteriorChains(w, i === S.sel); return; }
      if (w.type === "chimney") return; // a chimney is measured as a whole (when selected)
      const t = dimLabel(w.a, w.b, -(wallThickness(S.model, w) / 2 + 9 * px), i === S.sel ? "sel" : "", fmt(len(sub(w.b, w.a))));
      if (t) overlay.append(t);
    });
  }
  if (S.hover && S.hover.kind === "wall" && S.hover.i !== S.sel && S.model.walls[S.hover.i]) overlay.append(wallOutline(S.hover.i, "ov-hover"));
  if (S.sel !== null && S.model.walls[S.sel] && S.model.walls[S.sel].type === "chimney") {
    // a chimney: the whole block, its outer width x depth
    const b = chimneyBox(S.sel);
    overlay.append(el("rect", { class: "ov-sel", x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1] }));
    const off = 14 * px;
    measureLine([b[0], b[1] - off], [1, 0], b[2] - b[0]);
    measureLine([b[0] - off, b[1]], [0, 1], b[3] - b[1]);
  } else if (S.sel !== null && S.model.walls[S.sel]) {
    overlay.append(wallOutline(S.sel, "ov-sel"));
    const w = S.model.walls[S.sel];
    for (const p of [w.a, w.b]) overlay.append(el("circle", { class: "ov-node sel", cx: p[0], cy: p[1], r: 5 * px }));
  }
  if (S.tool === "select" && S.hover && S.hover.kind === "node") {
    overlay.append(el("circle", { class: "ov-node", cx: S.hover.p[0], cy: S.hover.p[1], r: 6 * px }));
  }
  // openings: the selected one, and the one the tool would place
  const so = selOpening();
  if (so && S.tool === "select") {
    const sp = so.o.type === "corner_window" && cornerPair(S.model, so.o);
    overlay.append(quadEl(sp ? cornerShape(so.w, so.o.from, so.o.to, sp.w, sp.o.from, sp.o.to, 2 * px)
      : openingQuad(so.w, so.o.from, so.o.to, 2 * px), "ov-sel"));
    if (S.showDims) for (const d of openingDims(so.w, so.o.from, so.o.to)) overlay.append(d);
  }
  if (S.tool === "opening" && S.opCand) {
    const c = S.opCand;
    if (c.fit) {
      // a corner window: one L round the corner, its other half on the wall there
      const pt = S.opening.type === "corner_window" && cornerPartner(S.model, c.w, (c.fit.from + c.fit.to) / 2 < frame(c.w).L / 2 ? "a" : "b");
      if (pt) {
        const L2 = frame(pt.wall).L, w2 = Math.min(S.opening.width2 || c.width, L2);
        const [f2, t2] = cornerRange(S.model, pt.wall, pt.end, w2);
        overlay.append(quadEl(cornerShape(c.w, c.fit.from, c.fit.to, pt.wall, f2, t2, 2 * px), "ov-preview"));
        if (S.showDims) for (const d of openingDims(pt.wall, f2, t2)) overlay.append(d);
      } else overlay.append(quadEl(openingQuad(c.w, c.fit.from, c.fit.to, 2 * px), "ov-preview"));
      if (DOOR_TYPES.includes(S.opening.type)) for (const l of leafLines(c.w, c.fit.from, c.fit.to, c.side)) overlay.append(l);
      if (S.showDims) for (const d of openingDims(c.w, c.fit.from, c.fit.to)) overlay.append(d);
    } else {
      const { u } = frame(c.w), s0 = dot(sub(S.cursor, c.w.a), u);
      overlay.append(quadEl(openingQuad(c.w, s0 - c.width / 2, s0 + c.width / 2, 2 * px), "ov-preview bad"));
    }
  }
  // shape preview: the outline under the cursor, joined like real walls
  if (S.tool === "shape" && S.snap) {
    const segs = shapeAt(S.snap.p);
    const h = currentThickness() / 2;
    if (segs) overlay.append(previewWalls(segs));
    for (const [a, b] of segs || []) {
      if (S.showDims && len(sub(b, a))) overlay.append(dimLabel(a, b, -(h + 12 / S.view.s), "live", fmt(len(sub(b, a)))));
    }
    overlay.append(el("circle", { class: "ov-snap", cx: S.snap.p[0], cy: S.snap.p[1], r: 5 / S.view.s }));
  }
  // drawing preview
  if (S.tool === "wall" && S.snap) {
    const p = S.snap.p;
    if (S.draw) {
      const a = S.draw.start;
      const t = (S.thickness || S.model.wall_types?.[S.wallType]?.thickness || 12) / 2;
      const u = sub(p, a), L = len(u);
      if (L > 0) {
        overlay.append(previewWalls([[a, p]])); // joined to the walls it starts / ends on
        const deg = Math.round((Math.atan2(-u[1], u[0]) * 180) / Math.PI);
        overlay.append(dimLabel(a, p, -(t + 12 * px), "live", `${fmt(L)} cm · ${deg}°`));
      }
      overlay.append(el("circle", { class: "ov-node", cx: a[0], cy: a[1], r: 4 * px }));
    }
    overlay.append(el("circle", { class: "ov-snap", cx: p[0], cy: p[1], r: 5 * px }));
    if (S.snap.kind === "node" || S.snap.kind === "axis") {
      overlay.append(el("rect", { class: "ov-snap", x: p[0] - 7 * px, y: p[1] - 7 * px, width: 14 * px, height: 14 * px }));
    }
  }
  // the turn handle last: on top of everything
  if (S.tool === "select") drawRotHandle(1 / S.view.s);
}

// Walls not placed yet (a shape, the wall being drawn), drawn with the same
// joints as real ones: mitred corners, T-joints with the walls already there.
// One path, so the see-through fill does not darken where pieces meet.
function ghostWalls(segs) {
  return segs.map(([a, b]) => ({ type: S.wallType, a, b, ...(S.thickness ? { thickness: S.thickness } : {}) }));
}
function setGhost(segs) {
  const key = JSON.stringify(segs || null);
  if (key === JSON.stringify(S.ghost)) return;
  S.ghost = segs && segs.length ? segs : null;
  renderPlan();
}
function previewWalls(segs) {
  const extra = ghostWalls(segs);
  const tmp = { ...S.model, walls: [...S.model.walls, ...extra] };
  const d = extra.flatMap((w) => wallPolygons(tmp, w)).map((poly) => "M" + poly.map((q) => q.join(" ")).join(" L") + " Z").join(" ");
  return el("path", { class: "ov-preview walls", d, "fill-rule": "nonzero" });
}

// The chimney a chimney wall belongs to: all chimney walls connected to it
// (sharing an end or ending on one another) -> wall indexes.
function chimneyGroup(i) {
  const walls = S.model.walls, seen = new Set([i]), todo = [i];
  const touches = (x, y) => [x.a, x.b].some((p) => toSegment(p, y.a, y.b).dist < 0.1) || [y.a, y.b].some((p) => toSegment(p, x.a, x.b).dist < 0.1);
  while (todo.length) {
    const k = todo.pop();
    walls.forEach((w, j) => {
      if (!seen.has(j) && w.type === "chimney" && touches(walls[k], w)) { seen.add(j); todo.push(j); }
    });
  }
  return [...seen];
}
// Its outer box: [x0, y0, x1, y1] over the faces of all its walls.
function chimneyBox(i) {
  const pts = chimneyGroup(i).flatMap((j) => solidWall(S.model.walls[j]));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// Width x depth of an axis-aligned rectangle (a room), or null.
function rectSize(pts) {
  if (pts.length !== 4) return null;
  const xs = [...new Set(pts.map((p) => Math.round(p[0] * 100)))], ys = [...new Set(pts.map((p) => Math.round(p[1] * 100)))];
  if (xs.length !== 2 || ys.length !== 2) return null;
  return [Math.abs(xs[1] - xs[0]) / 100, Math.abs(ys[1] - ys[0]) / 100];
}
// Faces of all walls (openings ignored) as edges - for measuring distances.
function wallEdges(except = null, dividers = false) {
  const edges = [];
  for (const w of S.model.walls) {
    if (w === except) continue;
    const poly = solidWall(w);
    for (let i = 0; i < poly.length; i++) { const e = [poly[i], poly[(i + 1) % poly.length]]; e.wall = w; edges.push(e); }
  }
  // virtual lines bound rooms too (a line, no thickness)
  if (dividers) for (const d of S.model.dividers || []) { if (d === except) continue; const e = [d.a, d.b]; e.wall = d; edges.push(e); }
  return edges;
}
// Nearest hit of a ray from p along d with the edges -> distance (Infinity
// when nothing); `out.wall` gets the wall that was hit.
function rayHit(p, d, edges, out = null) {
  let best = Infinity;
  for (const e of edges) {
    const [a, b] = e;
    const v = sub(b, a), den = d[0] * v[1] - d[1] * v[0];
    if (Math.abs(den) < 1e-9) continue;
    const q = sub(a, p);
    const tt = (q[0] * v[1] - q[1] * v[0]) / den, uu = (q[0] * d[1] - q[1] * d[0]) / den;
    if (tt > 0.01 && uu >= 0 && uu <= 1 && tt < best) { best = tt; if (out) out.wall = e.wall; }
  }
  return best;
}
// A dimension line from p along d for `dist`, its end tick and the number.
function measureLine(p, d, dist) {
  const px = 1 / S.view.s;
  const h = add(p, mul(d, dist)), m = add(p, mul(d, dist / 2)), side = [-d[1], d[0]];
  overlay.append(el("line", { class: "ov-measure", x1: p[0], y1: p[1], x2: h[0], y2: h[1] }));
  for (const q of [p, h]) overlay.append(el("line", { class: "ov-measure end",
    x1: q[0] - side[0] * 5 * px, y1: q[1] - side[1] * 5 * px, x2: q[0] + side[0] * 5 * px, y2: q[1] + side[1] * 5 * px }));
  if (dist * S.view.s > 28) {
    overlay.append(el("text", { class: "ov-dim live", x: m[0] + side[0] * 9 * px, y: m[1] + side[1] * 9 * px, "font-size": 11 * px,
      transform: `rotate(${Math.abs(d[0]) > Math.abs(d[1]) ? 0 : -90} ${m[0] + side[0] * 9 * px} ${m[1] + side[1] * 9 * px})` }, fmt(dist)));
  }
}
// The room on both sides of a wall being moved: from its faces to the next wall.
function wallClearances(w) {
  const u = sub(w.b, w.a), L = len(u);
  if (!L) return;
  const d = [u[0] / L, u[1] / L], n = [-d[1], d[0]], h = wallThickness(S.model, w) / 2;
  const edges = wallEdges(w), mid = mul(add(w.a, w.b), 0.5);
  for (const dir of [n, mul(n, -1)]) {
    const start = add(mid, mul(dir, h));
    const dist = rayHit(start, dir, edges);
    if (isFinite(dist) && dist < 3000) measureLine(start, dir, dist);
  }
}
// Inside every room, while walls move: its width and depth, face to face,
// through the room's label point.
// Only the rooms the moving walls bound - the rest of the plan stays quiet.
function roomDimensions(moving) {
  const edges = wallEdges(null, true), px = 1 / S.view.s;
  let shown = 0;
  for (const r of S.model.rooms || []) {
    const a = roomAnchor(r);
    if (!a) continue;
    // the width under the name and area, the depth beside the name
    const lines = [{ p: [a[0], a[1] + 34 * px], d: [1, 0] }, { p: [a[0] + 70 * px, a[1]], d: [0, 1] }];
    const hits = lines.map(({ p, d }) => {
      const hf = {}, hb = {};
      const f = rayHit(p, d, edges, hf), b = rayHit(p, mul(d, -1), edges, hb);
      return { p, d, f, b, walls: [hf.wall, hb.wall] };
    });
    if (!hits.some((h) => h.walls.some((w) => moving.includes(w)))) continue;
    shown++;
    for (const { p, d, f, b } of hits) {
      if (isFinite(f) && isFinite(b) && f + b < 3000) measureLine(add(p, mul(d, -b)), d, f + b);
    }
  }
  return shown;
}
// Exterior wall: on its outside, a chain corner - opening - ... - corner, and
// further out the overall length - both on the outer face.
function exteriorChains(w, sel) {
  const px = 1 / S.view.s;
  const { outside } = outsideOf(S.model, w);
  const sg = outside === "left" ? 1 : -1;
  const A = wallEnds(S.model, w, "a"), B = wallEnds(S.model, w, "b");
  let s0 = outside === "left" ? A.left : A.right, s1 = outside === "left" ? B.left : B.right;
  // from the building's outer corners, also where a wall stops at the other's centre line (28.10)
  const oa = outerCornerAt(S.model, w, "a"), ob = outerCornerAt(S.model, w, "b");
  if (oa !== null && Math.abs(oa - s0) < 2 * wallThickness(S.model, w) + 5) s0 = oa;
  if (ob !== null && Math.abs(ob - s1) < 2 * wallThickness(S.model, w) + 5) s1 = ob;
  const u = sub(w.b, w.a), L = len(u);
  if (!L || s1 - s0 < 1) return;
  const d = [u[0] / L, u[1] / L], n = [-d[1] * sg, d[0] * sg], h = wallThickness(S.model, w) / 2;
  const at = (t, off) => add(add(w.a, mul(d, t)), mul(n, off));
  const cuts = [s0, ...(w.openings || []).flatMap((o) => [o.from, o.to]).filter((t) => t > s0 + 0.5 && t < s1 - 0.5), s1]
    .sort((x, y) => x - y).filter((t, i, a) => !i || t - a[i - 1] > 0.5);
  const cls = "ov-chain" + (sel ? " sel" : "");
  const line = (off, ts) => {
    overlay.append(el("line", { class: cls, x1: at(ts[0], off)[0], y1: at(ts[0], off)[1], x2: at(ts[ts.length - 1], off)[0], y2: at(ts[ts.length - 1], off)[1] }));
    for (const t of ts) {
      const f = at(t, h + 4 * px), e = at(t, off + 4 * px);  // extension line from the wall
      overlay.append(el("line", { class: cls + " ext", x1: f[0], y1: f[1], x2: e[0], y2: e[1] }));
      const c = at(t, off), k = 4 * px;                       // a 45 degree tick
      overlay.append(el("line", { class: cls, x1: c[0] - (d[0] + n[0]) * k, y1: c[1] - (d[1] + n[1]) * k, x2: c[0] + (d[0] + n[0]) * k, y2: c[1] + (d[1] + n[1]) * k }));
    }
    for (let i = 0; i + 1 < ts.length; i++) {
      const lenSeg = ts[i + 1] - ts[i];
      if (lenSeg * S.view.s < 22) continue;
      const t2 = dimLabel(at(ts[i], off), at(ts[i + 1], off), (sg > 0 ? 1 : -1) * 0, "chain" + (sel ? " sel" : ""), fmt(lenSeg));
      if (t2) {
        const m = at((ts[i] + ts[i + 1]) / 2, off + 8 * px);
        t2.setAttribute("x", m[0]); t2.setAttribute("y", m[1]);
        const rot = t2.getAttribute("transform").replace(/rotate\(([-\d.]+) [^)]*\)/, `rotate($1 ${m[0]} ${m[1]})`);
        t2.setAttribute("transform", rot);
        overlay.append(t2);
      }
    }
  };
  const off1 = h + 26 * px, off2 = h + 50 * px;
  line(off1, cuts);
  if (cuts.length > 2) line(off2, [s0, s1]);
}

// Distances from p to the nearest wall face left, right, up and down, drawn
// as dimension lines (where to put a lamp so it is centred, how far from a wall).
function wallRays(p) {
  const px = 1 / S.view.s;
  const edges = [];
  // whole walls, openings included - the distance to a window counts too
  edges.push(...wallEdges());
  for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let best = Infinity;
    for (const [a, b] of edges) {
      const e = sub(b, a), den = d[0] * e[1] - d[1] * e[0];
      if (Math.abs(den) < 1e-9) continue;
      const q = sub(a, p);
      const tt = (q[0] * e[1] - q[1] * e[0]) / den, uu = (q[0] * d[1] - q[1] * d[0]) / den;
      if (tt > 0.01 && uu >= 0 && uu <= 1 && tt < best) best = tt;
    }
    if (!isFinite(best) || best > 3000) continue;
    const h = add(p, mul(d, best)), m = add(p, mul(d, best / 2));
    overlay.append(el("line", { class: "ov-measure", x1: p[0], y1: p[1], x2: h[0], y2: h[1] }));
    overlay.append(el("line", { class: "ov-measure end", x1: h[0] - d[1] * 5 * px, y1: h[1] - d[0] * 5 * px, x2: h[0] + d[1] * 5 * px, y2: h[1] + d[0] * 5 * px }));
    if (best * S.view.s > 28) {
      overlay.append(el("text", { class: "ov-dim live", x: m[0] + (d[0] ? 0 : 6 * px), y: m[1] - (d[0] ? 6 * px : 0), "font-size": 11 * px,
        "text-anchor": d[0] ? "middle" : "start" }, fmt(best)));
    }
  }
}

// Furniture against the walls: the selected pieces' box (axis-aligned, cm) and how far each of its
// sides is from the nearest wall face (negative: into the wall). Measured along three lines across
// the box, the closest counts (a wall that ends halfway still stops it).
function piecesBox(idx) { return boxOf(idx.map((i) => S.model.furniture[i])); }
function boxOf(pieces) {
  const pts = pieces.flatMap((f) => pieceCorners(f)), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
// The sides of the other pieces near a box (not the moving ones, nor a piece it lies on or under - a rug)
function pieceEdges(b, exclude) {
  const out = [];
  for (const f of S.model.furniture || []) {
    if (exclude.has(f) || !f.size) continue;
    const o = boxOf([f]);
    if (o[0] < b[2] - 0.5 && o[2] > b[0] + 0.5 && o[1] < b[3] - 0.5 && o[3] > b[1] + 0.5) continue; // overlapping
    const poly = pieceCorners(f);
    for (let i = 0; i < 4; i++) out.push([poly[i], poly[(i + 1) % 4]]);
  }
  return out;
}
function boxGaps(b, exclude = new Set()) {
  const edges = [...wallEdges(), ...pieceEdges(b, exclude)], out = {};
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, hw = (b[2] - b[0]) / 2, hh = (b[3] - b[1]) / 2;
  for (const [k, d] of [["r", [1, 0]], ["l", [-1, 0]], ["d", [0, 1]], ["u", [0, -1]]]) {
    const horiz = d[0] !== 0, half = horiz ? hw : hh, across = horiz ? hh : hw;
    let gap = Infinity, line = null;
    for (const f of [0, -0.8, 0.8]) {
      const p = horiz ? [cx, cy + f * across] : [cx + f * across, cy];
      const g = rayHit(p, d, edges) - half;
      if (g < gap) { gap = g; line = p; }
    }
    out[k] = { gap, d, from: horiz ? [cx + d[0] * hw, line[1]] : [line[0], cy + d[1] * hh] };
  }
  return out;
}
// Snap a moved selection flush to a wall it nearly touches (within 12 px on screen): -> [dx, dy]
function piecesWallSnap(idx) { return boxWallSnap(piecesBox(idx), new Set(idx.map((i) => S.model.furniture[i]))); }
// how close (screen px) something has to come to a wall to stand against it
const FLUSH_PX = 12;
function boxWallSnap(box, exclude = new Set()) {
  const g = boxGaps(box, exclude), T = FLUSH_PX / S.view.s;
  const axis = (a, b, sa, sb) => (Math.abs(a.gap) < T && Math.abs(a.gap) <= Math.abs(b.gap) ? sa * a.gap : Math.abs(b.gap) < T ? sb * b.gap : 0);
  return [axis(g.l, g.r, -1, 1), axis(g.u, g.d, -1, 1)];
}
// Lining up with a piece nearby (within 2 m): its left / right or top / bottom edge, when ours is within
// 12 px of it -> [dx, dy, guides]; an axis already flush against something (fixed) is left alone.
function alignSnap(b, exclude, fixed = [false, false]) {
  const T = 12 / S.view.s, near = 200;
  let bx = null, by = null;
  for (const f of S.model.furniture || []) {
    if (exclude.has(f) || !f.size) continue;
    const o = boxOf([f]);
    const gapX = Math.max(o[0] - b[2], b[0] - o[2], 0), gapY = Math.max(o[1] - b[3], b[1] - o[3], 0);
    if (gapX > near || gapY > near) continue;
    if (!fixed[0]) for (const [d, x] of [[o[0] - b[0], o[0]], [o[2] - b[2], o[2]]]) if (Math.abs(d) < T && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d, x, o };
    if (!fixed[1]) for (const [d, y] of [[o[1] - b[1], o[1]], [o[3] - b[3], o[3]]]) if (Math.abs(d) < T && (!by || Math.abs(d) < Math.abs(by.d))) by = { d, y, o };
  }
  const guides = [];
  if (bx) guides.push([[bx.x, Math.min(b[1], bx.o[1])], [bx.x, Math.max(b[3], bx.o[3])]]);
  if (by) guides.push([[Math.min(b[0], by.o[0]), by.y], [Math.max(b[2], by.o[2]), by.y]]);
  return [bx ? bx.d : 0, by ? by.d : 0, guides];
}
// Snap a box: flush against a wall or a piece it nearly touches, then lined up with a piece nearby -> [dx, dy, guides]
function snapBox(box, exclude) {
  const [sx, sy] = boxWallSnap(box, exclude);
  const moved = [box[0] + sx, box[1] + sy, box[2] + sx, box[3] + sy];
  const [ax, ay, guides] = alignSnap(moved, exclude, [sx !== 0, sy !== 0]);
  return [sx + ax, sy + ay, guides];
}

// The piece "in hand" in the Furniture tool: what a click would place there - its back to a wall it is
// near (turned), flush with a wall it nearly touches; Shift: just where the cursor is.
function furnitureGhost(p, shift) {
  S.furn.lastP = p; S.furn.lastShift = shift;
  if (S.furn.copy) {
    // a copy of a piece (Ctrl / Cmd + click on it): turned the same way, only snapped
    const piece = JSON.parse(JSON.stringify(S.furn.copy));
    piece.at = rp(shift ? p : [p[0] - S.furn.copyGrab[0], p[1] - S.furn.copyGrab[1]]);
    if (shift) return piece;
    const [sx, sy, guides] = snapBox(boxOf([piece]), new Set());
    piece.at = rp([piece.at[0] + sx, piece.at[1] + sy]);
    S.guides = guides;
    return piece;
  }
  const kind = S.furn.kind;
  if (!kind || kind === "_draw") return null;
  let piece;
  if (kind.startsWith("lib:")) {
    const x = (S.model.furniture_library || []).find((y) => y.id === kind.slice(4));
    if (!x) return null;
    piece = { kind: "drawn", at: rp(p), size: [...x.size], rot: 0, parts: JSON.parse(JSON.stringify(x.parts)),
      ...(x.color ? { color: x.color } : {}), ...(x.name ? { name: x.name } : {}) };
  } else piece = { kind, at: rp(p), size: [...(FURN_SIZES[kind] || [60, 60])], rot: 0 };
  // turned by hand (R in hand): that way, no turning its back to the wall
  if (S.furn.turn !== undefined && S.furn.turn !== null) piece.rot = S.furn.turn;
  if (shift) return piece;
  // near a wall: its back to it; against its face only from close by (as when moved)
  if (piece.kind !== "drawn" && (S.furn.turn === undefined || S.furn.turn === null)) backToWall(S.model, piece, p, 80, FLUSH_PX / S.view.s);
  const [sx, sy, guides] = snapBox(boxOf([piece]), new Set());
  piece.at = rp([piece.at[0] + sx, piece.at[1] + sy]);
  S.guides = guides;
  return piece;
}

// While a piece moves: its distances to the walls, from its sides (a flush side is marked)
function pieceRays(idx) { boxRays(piecesBox(idx), new Set(idx.map((i) => S.model.furniture[i]))); }
function boxRays(b, exclude = new Set()) {
  const g = boxGaps(b, exclude);
  for (const k of ["l", "r", "u", "d"]) {
    const { gap, d, from } = g[k];
    if (!isFinite(gap) || gap > 3000) continue;
    if (Math.abs(gap) < 0.5) {
      // flush: the side drawn along the wall
      const horiz = d[0] !== 0;
      const a = horiz ? [from[0], b[1]] : [b[0], from[1]], c = horiz ? [from[0], b[3]] : [b[2], from[1]];
      overlay.append(el("line", { class: "ov-flush", x1: a[0], y1: a[1], x2: c[0], y2: c[1] }));
      continue;
    }
    if (gap > 0) measureLine(from, d, gap);
  }
}

// --- panel ------------------------------------------------------------------------------------------------
// wall types as tiles (data-pick=<group>)
function wallTypeTiles(group, sel) {
  const types = { ...DEFAULT_TYPES, ...(S.model.wall_types || {}) };
  return tiles(group, Object.keys(types).map((k) => ({ value: k, label: typeName(k) })), sel);
}
const devIcon = (k) => (k === "wall" ? "wall_light" : k);
function typeOptions(sel) {
  const types = { ...DEFAULT_TYPES, ...(S.model.wall_types || {}) };
  return Object.keys(types).map((k) => `<option value="${k}"${k === sel ? " selected" : ""}>${typeName(k)}</option>`).join("");
}
// Tab in the side panel: a field's change re-draws the panel, and the browser then lost its place and
// started from the top. The next field is found first, the change made, then that field focused (28.10).
$("panel").addEventListener("keydown", (ev) => {
  if (ev.key !== "Tab" || ev.ctrlKey || ev.altKey || ev.metaKey) return;
  const sel = "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea, button:not([disabled])";
  const list = () => [...$("panel").querySelectorAll(sel)].filter((x) => x.offsetParent !== null);
  const now = list(), i = now.indexOf(ev.target);
  if (i < 0) return;
  const j = i + (ev.shiftKey ? -1 : 1);
  if (j < 0 || j >= now.length) return;
  const next = now[j], nextId = next.id;
  ev.preventDefault();
  ev.target.blur();                               // the change, if any (may re-draw the panel)
  const after = list();
  const to = (nextId && document.getElementById(nextId)) || after[j];
  if (to) { to.focus(); if (to.select && to.type !== "checkbox" && to.type !== "radio") to.select(); }
});
function renderPanel() {
  renderPanelInner();
  // entity fields: suggestions from Home Assistant, unknown ids marked
  for (const inp of $("panel").querySelectorAll("input[placeholder*='.'], input[data-df=entity], input[data-cover], input[data-contact]")) {
    const lid = entityListFor(inp);
    inp.setAttribute("list", document.getElementById(lid) ? lid : "ha-entities");
    inp.classList.toggle("bad", ha.connected && !!inp.value && !ha.states.has(inp.value));
    inp.title = ha.connected && inp.value && !ha.states.has(inp.value) ? t("ha_unknown") : (ha.states.get(inp.value)?.attributes?.friendly_name || "");
  }
}
// The options of the open tool, under its name on the left.
function renderSideLists() {
  const rl = $("rooms-list");
  if (S.tool === "rooms") {
    rl.innerHTML = roomList();
    rl.querySelectorAll("[data-room]").forEach((r) => {
      r.onclick = () => { clearSel(); S.selRoom = Number(r.dataset.room); renderPanel(); renderOverlay(); };
    });
  } else if (rl.innerHTML) rl.innerHTML = "";
  const pl = $("tb-plan");
  if (pl.closest(".tool").classList.contains("on")) {
    const nw = S.model.walls.length;
    pl.innerHTML = `<div class="empty">${nw ? t("walls_n", { n: nw }) : t("empty")}</div>` + framePanel();
    frameWire(pl);
  } else if (pl.innerHTML) pl.innerHTML = "";
}
function renderToolBody() {
  const box = document.getElementById("tb-" + S.tool + (S.tool === "opening" ? "-" + opTab() : ""));
  // only one of the two opening tools holds the options (their fields share ids)
  for (const x of document.querySelectorAll("[id^=tb-opening-]")) if (x !== box) x.innerHTML = "";
  if (!box) return;
  if (S.tool === "shape") shapePanel(box);
  else if (S.tool === "opening") openingToolPanel(box);
  else if (S.tool === "devices") devicePalette(box);
  else if (S.tool === "furniture") furniturePalette(box);
  else if (S.tool === "calibrate") underlayPanel(box);
  else if (S.tool === "garden") gardenToolPanel(box);
  else if (S.tool === "divide") {
    box.innerHTML = `<div class="empty">${t("divide_hint")}</div>
      <div class="row"><span></span><label><input id="dt-block" type="checkbox"${S.div.blocks ? " checked" : ""}> ${t("blocks_light")}</label></div>`;
    $("dt-block").onchange = (e) => { S.div.blocks = e.target.checked; };
  }
}
function renderPanelInner() {
  $("wall-types").innerHTML = wallTypeTiles("walltype", S.wallType);
  $("i-thick").placeholder = String(S.model.wall_types?.[S.wallType]?.thickness ?? "");
  $("i-thick").value = S.thickness ?? "";
  const types = { ...DEFAULT_TYPES, ...(S.model.wall_types || {}) };
  $("types").innerHTML = Object.entries(types).map(([k, v]) =>
    `<div class="row"><span>${typeName(k)}</span><label><input type="number" min="1" max="200" data-wt="${k}" value="${v.thickness}"> cm</label></div>`).join("");
  renderToolBody();
  // the rooms with their areas (in the Rooms tool) and the plan's settings (the Plan section on the left) -
  // only while they are open: finding every room from the walls is not for each move of a drag
  renderSideLists();
  // the right panel: what is selected (it slides in only then)
  const box = $("p-sel");
  panelOpen(true);
  if (selDevice()) { devicePanel(box); return; }
  if (S.selGarden !== null && (S.model.garden || [])[S.selGarden]) { gardenPanel(box, S.model.garden[S.selGarden]); return; }
  if (S.selFurn !== null && (S.model.furniture || [])[S.selFurn]) {
    const idx = selPieces();
    if (idx.length > 1) furnitureGroupPanel(box, idx); else furniturePanel(box, S.model.furniture[idx[0]]);
    return;
  }
  if (S.selRoom !== null && S.model.rooms[S.selRoom]) { roomPanel(box, S.model.rooms[S.selRoom]); return; }
  if (S.selDiv !== null && (S.model.dividers || [])[S.selDiv]) {
    const dv = S.model.dividers[S.selDiv];
    box.innerHTML = `<h3>${t("divider")}</h3><div class="empty">${t("divider_hint")}</div>
      <div class="row"><span></span><label><input id="dv-block" type="checkbox"${dv.blocks_light ? " checked" : ""}> ${t("blocks_light")}</label></div>
      <div class="row"><span></span><label><input id="dv-show" type="checkbox"${dv.show ? " checked" : ""}> ${t("divider_show")}</label></div>
      <button id="dv-del" class="danger">${t("delete_divider")}</button>`;
    $("dv-del").onclick = deleteDivider;
    $("dv-show").onchange = (e) => {
      const before = snapshot();
      if (e.target.checked) dv.show = true; else delete dv.show;
      commit(before);
    };
    $("dv-block").onchange = (e) => {
      const before = snapshot();
      if (e.target.checked) dv.blocks_light = true; else delete dv.blocks_light;
      commit(before);
    };
    return;
  }
  const so = selOpening();
  if (so) { openingPanel(box, so.w, so.o); return; }
  if (S.sel === null || !S.model.walls[S.sel]) {
    // nothing selected: the right panel is only for what is selected - it goes away
    box.innerHTML = `<div class="empty">${t("panel_hint")}</div>`;
    panelOpen(false);
    return;
  }
  const w = S.model.walls[S.sel];
  const L = len(sub(w.b, w.a));
  const deg = Math.round((Math.atan2(-(w.b[1] - w.a[1]), w.b[0] - w.a[0]) * 180) / Math.PI);
  const nOpen = (w.openings || []).length;
  if (w.type === "chimney") {
    // a chimney: the block as a whole - outer size, how many walls, delete all
    const box2 = chimneyBox(S.sel), group = chimneyGroup(S.sel);
    box.innerHTML = `<h3>${t("chimney_h")}</h3>
      <div class="row"><span>${t("chimney_size")}</span><b>${fmt(box2[2] - box2[0])} × ${fmt(box2[3] - box2[1])} cm</b></div>
      <div class="row"><span>${t("chimney_walls")}</span><b>${group.length}</b></div>
      ${wallTypeTiles("w-type", w.type)}
      <button id="w-del" class="danger">${t("delete_chimney")}</button>`;
    $("w-del").onclick = () => {
      const before = snapshot();
      for (const j of group.sort((x, y) => y - x)) S.model.walls.splice(j, 1);
      clearSel();
      commit(before);
    };
    return;
  }
  box.innerHTML = `<h3>${t("wall_h")}</h3>
    ${wallTypeTiles("w-type", w.type)}
    <div class="row"><span>${t("thickness")}</span><label><input id="w-thick" type="number" min="1" max="200" step="1"
      placeholder="${S.model.wall_types?.[w.type]?.thickness ?? ""}" value="${w.thickness ?? ""}"> cm</label></div>
    <div class="row"><span>${t("length").replace(":", "")}</span><label><input id="w-len" type="number" min="1" step="1" value="${r2(L)}"> cm</label></div>
    <div class="row"><span>${t("angle")}</span><b>${deg}°</b></div>
    <div class="row"><span>${t("from")}</span><b>${fmt(w.a[0])}; ${fmt(w.a[1])}</b></div>
    <div class="row"><span>${t("to")}</span><b>${fmt(w.b[0])}; ${fmt(w.b[1])}</b></div>
    ${nOpen ? `<div class="row"><span>${t("openings")}</span><b>${nOpen}</b></div>` : ""}
    <button id="w-del" class="danger">${t("delete_wall")}</button>`;
  $("w-thick").onchange = (e) => setWallProp(S.sel, "thickness", e.target.value === "" ? null : Number(e.target.value));
  $("w-len").onchange = (e) => setWallLength(S.sel, Number(e.target.value));
  $("w-del").onclick = () => deleteWall(S.sel);
}

// --- tools -------------------------------------------------------------------------------------------------
// Windows and doors are two tools on the toolbar, one "opening" tool inside (S.opening.tab)
const opTab = () => S.opening.tab || (DOOR_KINDS.includes(S.opening.type) ? "doors" : "windows");
function setTool(tool, tab) {
  if (tool === "opening" && tab && tab !== opTab()) {
    S.opening.tab = tab;
    if (!(tab === "doors" ? DOOR_KINDS : WINDOW_KINDS).includes(S.opening.type)) { S.opening.type = tab === "doors" ? "door" : "window"; S.opening.width = null; }
  }
  S.tool = tool;
  S.draw = null; S.typed = ""; showTyped();
  const isOn = (x) => x.dataset.tool === tool && (tool !== "opening" || !x.dataset.optab || x.dataset.optab === opTab());
  for (const b of document.querySelectorAll("[data-tool]")) b.classList.toggle("on", isOn(b));
  S.folded = false;
  for (const sec of document.querySelectorAll("#tools .tool[data-section]")) {
    sec.classList.toggle("on", sec.dataset.section === tool && (tool !== "opening" || !sec.dataset.optab || sec.dataset.optab === opTab()));
    sec.classList.remove("folded");
  }
  stage.classList.toggle("tool-wall", ["wall", "shape", "opening", "divide"].includes(tool));
  stage.classList.toggle("tool-calibrate", tool === "calibrate");
  S.opCand = null; S.roomHover = null; S.dev.start = null; S.div.start = null; S.furnGhost = null; if (S.devGhost) { S.devGhost = null; renderPlan(); } S.furn.copy = null; S.furn.turn = null; S.addBulb = null; if (S.dev) S.dev.pts = null;
  setGhost(null);
  renderPanel();
  renderOverlay();
}

// --- ready-made shapes ---------------------------------------------------------------------------------------------
function currentThickness() {
  return S.thickness || S.model.wall_types?.[S.wallType]?.thickness || DEFAULT_TYPES[S.wallType]?.thickness || 12;
}
// Wall segments of the chosen shape with its top-left outside corner at `at`, or null when the sizes don't fit.
function shapeAt(at) {
  try {
    return shapeWalls(S.shape.kind, S.shape.params, { at, thickness: currentThickness(), outside: S.shape.outside });
  } catch { return null; }
}
function placeShape(at) {
  const segs = shapeAt(at);
  if (!segs) return false;
  S.ghost = null;
  const before = snapshot();
  for (const [a, b] of segs) {
    const w = { type: S.wallType, a, b };
    if (S.thickness) w.thickness = S.thickness;
    S.model.walls.push(w);
  }
  merged();
  commit(before); // one undo step for the whole outline
  return true;
}
const PARAM_LABEL = { width: "p_width", depth: "p_depth", cutWidth: "p_cut_width", cutDepth: "p_cut_depth",
  barDepth: "p_bar_depth", stemWidth: "p_stem_width" };
function shapePanel(box) {
  const sh = S.shape;
  const rows = Object.entries(sh.params).map(([k, v]) => k === "corner"
    ? `<div class="sub-h">${t("p_corner")}</div>` + tiles("corner", CORNERS.map((c) => ({ value: c, label: t("c_" + c) })), v, "small")
    : `<div class="row"><span>${t(PARAM_LABEL[k])}</span><label><input type="number" min="1" step="1" data-sp="${k}" value="${v}"> cm</label></div>`);
  const ok = shapeAt([0, 0]) !== null;
  box.innerHTML = `
    ${tiles("shape", Object.keys(SHAPES).map((k) => ({ value: k, label: t("shape_" + k) })), sh.kind)}
    ${rows.join("")}
    <div class="row"><span></span><label><input id="sh-out" type="checkbox"${sh.outside ? " checked" : ""}> ${t("p_outside")}</label></div>
    <div class="sub-h">${t("wall")}</div>${wallTypeTiles("walltype", S.wallType)}
    <div class="empty">${ok ? t("shape_walls", { type: typeName(S.wallType), t: currentThickness() }) + "<br>" + t("shape_hint")
      : `<span style="color: var(--warn)">${t("shape_invalid")}</span>`}</div>`;
  $("sh-out").onchange = (e) => { sh.outside = e.target.checked; renderPanel(); renderOverlay(); };
  box.querySelectorAll("[data-sp]").forEach((el) => {
    el.onchange = (e) => {
      const k = e.target.dataset.sp;
      sh.params[k] = k === "corner" ? e.target.value : Number(e.target.value);
      renderPanel(); renderOverlay();
    };
  });
}

// --- openings ------------------------------------------------------------------------------------------------------
function selOpening() {
  const r = S.selOp;
  const w = r && S.model.walls[r.w];
  const o = w && (w.openings || [])[r.o];
  return o ? { w, o } : null;
}
function openingQuad(w, from, to, grow = 0) {
  const { u, n } = frame(w), h = wallThickness(S.model, w) / 2 + grow;
  const at = (s, off) => add(add(w.a, mul(u, s)), mul(n, off));
  return [at(from, h), at(to, h), at(to, -h), at(from, -h)];
}
// A corner window as one L: wall A's glass [fa, ta] and wall B's [fb, tb], each from its end at the corner,
// joined at the corner by the outer and inner faces' meeting points.
function cornerShape(wa, fa, ta, wb, fb, tb, grow = 0) {
  const side = (w, from, to) => {
    const { u, n, L } = frame(w), h = wallThickness(S.model, w) / 2 + grow;
    const atStart = (from + to) / 2 < L / 2;
    return { w, u, n, h, d: atStart ? u : mul(u, -1), far: atStart ? to : from, at: (s2, off) => add(add(w.a, mul(u, s2)), mul(n, off)) };
  };
  const A = side(wa, fa, ta), B = side(wb, fb, tb);
  const sA = dot(A.n, B.d) > 0 ? -1 : 1, sB = dot(B.n, A.d) > 0 ? -1 : 1;   // the outer face: away from the other wall
  const meet = (p, d, q, e) => {
    const c = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(c) < 1e-9) return p;
    const t2 = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / c;
    return add(p, mul(d, t2));
  };
  const O = meet(A.at(0, sA * A.h), A.u, B.at(0, sB * B.h), B.u);
  const I = meet(A.at(0, -sA * A.h), A.u, B.at(0, -sB * B.h), B.u);
  return [O, A.at(A.far, sA * A.h), A.at(A.far, -sA * A.h), I, B.at(B.far, -sB * B.h), B.at(B.far, sB * B.h)];
}
const quadEl = (q, cls) => el("polygon", { class: cls, points: q.map((p) => p.join(",")).join(" ") });
// preview of a door leaf: from the hinge jamb, across the opening's width, on the cursor's side
function leafLines(w, from, to, side) {
  const { u, n } = frame(w), h = wallThickness(S.model, w) / 2, sg = side === "left" ? 1 : -1;
  const at = (s, off) => add(add(w.a, mul(u, s)), mul(n, off));
  const jambs = ["double_door", "double_gate"].includes(S.opening.type) ? [[from, (to - from) / 2], [to, (to - from) / 2]]
    : [[S.opening.hinge === "to" ? to : from, to - from]];
  return jambs.map(([s, width]) => {
    const a = at(s, h * sg), b = add(a, mul(n, width * sg));
    return el("line", { class: "ov-guide", x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
  });
}
// distances to the nearest neighbour on each side (another opening or the
// inner face of the corner) and the width, outside the wall
function openingDims(w, from, to) {
  let [s0, s1] = innerRange(S.model, w);
  for (const o of w.openings || []) {
    if (o.to <= from + 1e-6) s0 = Math.max(s0, o.to);
    if (o.from >= to - 1e-6) s1 = Math.min(s1, o.from);
  }
  const { u } = frame(w);
  const off = wallThickness(S.model, w) / 2 + 20 / S.view.s;
  const at = (s) => add(w.a, mul(u, s));
  return [[s0, from], [from, to], [to, s1]].filter(([a, b]) => b - a > 0.5)
    .map(([a, b]) => dimLabel(at(a), at(b), off, "live", fmt(b - a))).filter(Boolean);
}
function openingCandidate(p) {
  const wi = wallAt(p);
  if (wi === null) return null;
  const w = S.model.walls[wi];
  const { u, n } = frame(w);
  const v = sub(p, w.a);
  const width = S.opening.width || DEFAULT_WIDTH[S.opening.type];
  let side = dot(v, n) >= 0 ? "left" : "right";
  // a balcony door opens inwards: shown that way whichever side the cursor is on
  if (S.opening.type === "balcony_door" && w.type === "exterior") side = outsideOf(S.model, w).outside === "left" ? "right" : "left";
  return { wi, w, width, fit: fitOpening(S.model, w, dot(v, u), width, snapStep(), null, kindType(S.opening.type)), side };
}
function placeOpening(c) {
  if (!c || !c.fit) return false;
  const before = snapshot();
  const w = S.model.walls[c.wi];
  const o = makeOpening(S.model, w, S.opening.type, c.fit.from, c.fit.to, { hinge: S.opening.hinge, side: c.side });
  (w.openings = w.openings || []).push(o);
  w.openings.sort((a, b) => a.from - b.from);
  // a corner window: its other half on the wall round the corner, as long
  if (o.type === "corner_window" && !addCornerPair(S.model, w, o, S.opening.width2)) $("st-msg").textContent = t("no_corner_pair");
  commit(before);
  return true;
}
const coverMatch = (id, sash) => (c) => c.window === id && (c.sash || "") === (sash || "");
function coverEntity(id, sash) { return ((S.model.covers || []).find(coverMatch(id, sash)) || {}).entity || ""; }
function dropCovers(ids) { S.model.covers = (S.model.covers || []).filter((c) => !ids.includes(c.window)); }
// Edit the selected opening: `f(w, o)` changes it; false = refused (message shown)
function editOpening(f) {
  const so = selOpening();
  if (!so) return;
  const before = snapshot();
  const msg = f(so.w, so.o);
  if (typeof msg === "string") { S.model = JSON.parse(before); $("st-msg").textContent = msg; renderPanel(); return; }
  $("st-msg").textContent = "";
  commit(before);
}
function resize(w, o, from, width) {
  const f = fitOpening(S.model, w, from + width / 2, width, 0, o, o.type);
  if (!f) return t("no_fit");
  o.from = f.from; o.to = f.to;
  setCorner(o, frame(w).L);
  if (o.sashes) o.sashes = sashes(o, o.outside || "left");
}
function openingToolPanel(box) {
  const o = S.opening;
  const tab = opTab();
  box.innerHTML = `
    ${tiles("optype", (tab === "doors" ? DOOR_KINDS : WINDOW_KINDS).map((k) => ({ value: k, label: t("o_" + k) })), o.type)}
    <div class="row"><span>${t(o.type === "corner_window" ? "cw_here" : "op_width")}</span><label><input id="ot-width" type="number" min="10" step="1"
      value="${o.width || DEFAULT_WIDTH[o.type]}"> cm</label></div>
    ${o.type === "corner_window" ? `<div class="row"><span>${t("cw_round")}</span><label><input id="ot-width2" type="number" min="10" step="1"
      value="${o.width2 || o.width || DEFAULT_WIDTH[o.type]}"> cm</label></div>` : ""}
    <div class="empty">${t("opening_hint")}</div>`;
  $("ot-width").onchange = (e) => { o.width = Number(e.target.value) || null; };
  if ($("ot-width2")) $("ot-width2").onchange = (e) => { o.width2 = Number(e.target.value) || null; };
}
function openingPanel(box, w, o) {
  const [s0] = innerRange(S.model, w);
  const row = (label, html) => `<div class="row"><span>${label}</span>${html}</div>`;
  const glazed = GLAZED.includes(o.type);
  const covers = !glazed ? "" : o.type === "hst"
    ? Object.keys(o.sashes || {}).map((sa) => row(`${t("cover")} · ${esc(sa)}`,
        `<input data-cover="${esc(sa)}" value="${esc(coverEntity(o.id, sa))}" placeholder="cover.…">`)).join("")
    : row(t("cover"), `<input data-cover="" value="${esc(coverEntity(o.id))}" placeholder="cover.…">`);
  box.innerHTML = `<h3>${t("o_" + o.type)}</h3>
    ${tiles("op-type", (WINDOW_KINDS.includes(o.type) ? WINDOW_KINDS : DOOR_KINDS).map((k) => ({ value: k, label: t("o_" + k) })),
      o.type === "window" && o.panes === 2 ? "window_2" : o.type === "balcony_door" && o.panes === 2 ? "balcony_door_2"
        : o.type === "balcony_door" && o.panes === 3 ? "balcony_door_3" : o.type, "small")}
    ${o.id !== undefined ? row("ID", `<input id="op-id" value="${esc(o.id)}">`) : ""}
    ${o.type === "corner_window" ? cornerRows(o, row) : `${row(t("op_width"), `<label><input id="op-width" type="number" min="10" step="1" value="${r2(o.to - o.from)}"> cm</label>`)}
    ${row(t("op_from"), `<label><input id="op-from" type="number" min="0" step="1" value="${r2(o.from - s0)}"> cm</label>`)}`}
    ${DOOR_TYPES.includes(o.type) && !["double_door", "double_gate"].includes(o.type) && !(o.type === "balcony_door" && (o.panes || 1) > 1) ? `<button id="op-hinge">${t("flip_hinge")} (R)</button>` : ""}
    ${DOOR_TYPES.includes(o.type) ? `<button id="op-side">${t("flip_side")}</button>` : ""}
    ${covers}
    ${contactRows(o, row)}
    ${o.facade ? row(t("facade"), `<b>${t("f_" + o.facade)}</b>`) : ""}
    <button id="op-del" class="danger">${t("delete_opening")}</button>`;
  if ($("op-id")) $("op-id").onchange = (e) => editOpening((w2, o2) => {
    const id = e.target.value.trim();
    if (!id) return t("id_taken");
    if (id !== o2.id && S.model.walls.some((x) => (x.openings || []).some((y) => y.id === id))) return t("id_taken");
    for (const c of S.model.covers || []) if (c.window === o2.id) c.window = id;
    o2.id = id;
  });
  if ($("op-width")) $("op-width").onchange = (e) => editOpening((w2, o2) => {
    const W = Number(e.target.value), mid = (o2.from + o2.to) / 2;
    return W > 0 ? resize(w2, o2, mid - W / 2, W) : t("no_fit");
  });
  if ($("op-from")) $("op-from").onchange = (e) => editOpening((w2, o2) => resize(w2, o2, s0 + Number(e.target.value), o2.to - o2.from));
  // a corner window: its two lengths, one on each wall (kept at the corner)
  if ($("op-cw-a")) $("op-cw-a").onchange = (e) => editOpening((w2, o2) => (setCornerWidth(S.model, w2, o2, Number(e.target.value)) ? undefined : t("no_fit")));
  if ($("op-cw-b")) $("op-cw-b").onchange = (e) => editOpening((w2, o2) => {
    const p = cornerPair(S.model, o2);
    if (p) return setCornerWidth(S.model, p.w, p.o, Number(e.target.value)) ? undefined : t("no_fit");
    // no other half yet: add it round the corner
    const x = addCornerPair(S.model, w2, o2);
    if (!x) return t("no_corner");
    const q = cornerPair(S.model, o2);
    return setCornerWidth(S.model, q.w, q.o, Number(e.target.value)) ? undefined : t("no_fit");
  });
  if ($("op-hinge")) $("op-hinge").onclick = () => editOpening((w2, o2) => { o2.hinge = o2.hinge === "to" ? "from" : "to"; });
  if ($("op-side")) $("op-side").onclick = () => editOpening((w2, o2) => { o2.swing = o2.swing === "left" ? "right" : "left"; });
  box.querySelectorAll("[data-cover]").forEach((inp) => {
    inp.onchange = (e) => editOpening((w2, o2) => {
      const sash = e.target.dataset.cover, entity = e.target.value.trim();
      S.model.covers = (S.model.covers || []).filter((c) => !coverMatch(o2.id, sash)(c));
      if (entity) S.model.covers.push(sash ? { entity, window: o2.id, sash } : { entity, window: o2.id });
    });
  });
  box.querySelectorAll("[data-pane-open]").forEach((sl) => {
    sl.onchange = (e) => editOpening((w2, o2) => {
      const k = o2.panes || 1;
      const op = [...paneOpen(o2, k)], i = Number(e.target.dataset.paneOpen);
      op[i] = e.target.value;
      o2.pane_open = op;
      // a pane made fixed has no contact any more
      if (op[i] === "fixed" && o2.contacts && o2.contacts[i]) { o2.contacts[i] = ""; if (!o2.contacts.some(Boolean)) delete o2.contacts; }
    });
  });
  box.querySelectorAll("[data-pane]").forEach((inp) => {
    inp.onchange = (e) => editOpening((w2, o2) => {
      const k = o2.panes || 1, W = o2.to - o2.from;
      const ps = Array.isArray(o2.pane_sizes) && o2.pane_sizes.length === k - 1 ? [...o2.pane_sizes] : Array(k - 1).fill(r2(W / k));
      ps[Number(e.target.dataset.pane)] = Number(e.target.value);
      if (ps.some((v) => !(v >= 10)) || W - ps.reduce((x, y) => x + y, 0) < 10) return t("no_fit");
      o2.pane_sizes = ps;
    });
  });
  if ($("op-panes")) $("op-panes").onchange = (e) => editOpening((w2, o2) => {
    const k = Math.max(1, Math.min(8, Math.round(Number(e.target.value)) || 1));
    if (k > 1) o2.panes = k; else delete o2.panes;
    delete o2.pane_sizes; delete o2.pane_open; // a new number of panes: even again
    if (o2.contacts && o2.contacts.length > 1) o2.contacts = Array.from({ length: k }, (_, i) => o2.contacts[i] || "");
  });
  if ($("op-per-pane")) $("op-per-pane").onchange = (e) => editOpening((w2, o2) => {
    const k = o2.panes || 1, first = (o2.contacts || [])[0] || "";
    o2.contacts = e.target.checked ? Array.from({ length: k }, (_, i) => (o2.contacts || [])[i] || (i ? "" : first)) : [first];
    if (!o2.contacts.some(Boolean) && !e.target.checked) delete o2.contacts;
  });
  box.querySelectorAll("[data-contact]").forEach((inp) => {
    inp.onchange = (e) => editOpening((w2, o2) => {
      const i = Number(e.target.dataset.contact), v = e.target.value.trim(), k = o2.panes || 1;
      // several panes: one contact slot per pane (empty for a pane without one)
      const c = k > 1 ? Array.from({ length: k }, (_, j) => (o2.contacts || [])[j] || "") : o2.contacts ? [...o2.contacts] : [""];
      c[i] = v;
      if (c.some(Boolean)) o2.contacts = c; else delete o2.contacts;
    });
  });
  $("op-del").onclick = deleteOpening;
}
// a corner window: the glass on this wall and round the corner
function cornerRows(o, row) {
  const p = cornerPair(S.model, o);
  return row(t("cw_here"), `<label><input id="op-cw-a" type="number" min="10" step="1" value="${r2(o.to - o.from)}"> cm</label>`) +
    row(t("cw_round"), `<label><input id="op-cw-b" type="number" min="10" step="1" value="${p ? r2(p.o.to - p.o.from) : ""}" placeholder="—"> cm</label>`);
}
// panes (windows) and contact sensors: one for the opening or one per pane
function contactRows(o, row) {
  if (o.type === "passage") return "";
  const paned = o.type === "window" || o.type === "balcony_door";
  const k = o.panes || 1, c = o.contacts || [];
  const per = c.length > 1;
  let html = paned ? row(t("panes"), `<label><input id="op-panes" type="number" min="1" max="8" step="1" value="${k}"></label>`) : "";
  // several panes: a contact sensor on each pane that opens, in its row of the panes list below
  if (paned && k > 1) return html + paneRows(o, k);

  if (per) html += c.map((e, i) => row(`${t("contact")} · ${i + 1}`, `<input data-contact="${i}" value="${esc(e)}" placeholder="binary_sensor.…">`)).join("");
  else html += row(t("contact"), `<input data-contact="0" value="${esc(c[0] || "")}" placeholder="binary_sensor.…">`);
  if (paned && k > 1) html += `<div class="row"><span></span><label><input id="op-per-pane" type="checkbox"${per ? " checked" : ""}> ${t("contact_per_pane")}</label></div>`;
  return html;
}
// The panes, one row each (like a circuit's bulbs): its width (the last takes the rest), whether it opens and on
// which side its hinge is (a balcony door draws a leaf for each one that opens), and - when it opens - its contact
function paneRows(o, k) {
  const W = o.to - o.from, ps = Array.isArray(o.pane_sizes) && o.pane_sizes.length === k - 1 ? o.pane_sizes : Array(k - 1).fill(r2(W / k));
  const rest = r2(W - ps.reduce((x, y) => x + Number(y), 0));
  const op = paneOpen(o, k), c = o.contacts || [];
  const sel = (i) => `<select data-pane-open="${i}" title="${t("pane_open")}">${["fixed", "from", "to"].map((v) =>
    `<option value="${v}"${op[i] === v ? " selected" : ""}>${t("po_" + v)}</option>`).join("")}</select>`;
  return `<div class="sub-h">${t("panes")} · ${k}</div><div class="pane-list">` + Array.from({ length: k }, (_, i) =>
    `<div class="pane-row"><div class="bulb-row"><b class="pane-n">${i + 1}</b>` +
    (i < k - 1 ? `<label title="${t("op_width")}"><input data-pane="${i}" type="number" min="10" step="1" value="${ps[i]}"></label>` : `<span class="pane-rest">${rest}</span>`) +
    `<small>cm</small>${sel(i)}</div>` +
    (op[i] !== "fixed" ? `<input data-contact="${i}" value="${esc(c[i] || "")}" placeholder="binary_sensor.… (${t("contact")})">` : "") +
    `</div>`).join("") + `</div>`;
}
// which panes open: as set, or by default every pane of a window, the leaves of a balcony door
function paneOpen(o, k) {
  return Array.isArray(o.pane_open) && o.pane_open.length === k ? o.pane_open : Array(k).fill("from");
}
function deleteOpening() {
  editOpening((w, o) => {
    // a corner window goes with its other half
    const p = cornerPair(S.model, o);
    for (const [ww, oo] of [[w, o], ...(p ? [[p.w, p.o]] : [])]) {
      if (oo.id) dropCovers([oo.id]);
      ww.openings.splice(ww.openings.indexOf(oo), 1);
      if (!ww.openings.length) delete ww.openings;
    }
  });
  S.selOp = null;
  renderPanel(); renderOverlay();
}

// --- rooms ----------------------------------------------------------------------------------------------------------
const m2 = (cm2) => (cm2 / 1e4).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// a room's outline in cm: drawn by hand (points) or found from the walls around `at`
function roomPoly(r) {
  if (r.points) return r.points;
  const f = r.at && faceAt(S.model, r.at);
  return f ? inset(f) : null;
}
function roomIndexAt(p) {
  let best = null, bestA = Infinity;
  S.model.rooms.forEach((r, i) => {
    const poly = roomPoly(r);
    if (poly && pointInPolygon(p, poly)) { const a = polyArea(poly); if (a < bestA) { best = i; bestA = a; } }
  });
  return best;
}
// A room's id from its name: "Pokój Łucji" -> "pokoj-lucji" (unique among the rooms)
function roomSlug(name) {
  return String(name || "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
// the id was made by the editor (room-N) or from the name: it follows the name
const autoRoomId = (r) => /^room-\d+$/.test(r.id) || r.id === roomSlug(r.name);
function freeRoomId(base, self) {
  const used = new Set(S.model.rooms.filter((r) => r !== self).map((r) => r.id));
  if (!base) return null;
  let id = base, i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  return id;
}
function renameRoomId(x, id) {
  for (const it of [...(S.model.lights || []), ...(S.model.devices || [])]) if (it.room === x.id) it.room = id;
  x.id = id;
}
function uniqueRoomId() {
  const used = new Set(S.model.rooms.map((r) => r.id));
  let i = 1;
  while (used.has(`room-${i}`)) i++;
  return `room-${i}`;
}
function addRoomAt(p) {
  const f = faceAt(S.model, p);
  if (!f) { $("st-msg").textContent = t("not_enclosed"); return; }
  const taken = S.model.rooms.findIndex((r) => !r.points && r.at && faceAt(S.model, r.at)?.area === f.area &&
    pointInPolygon(r.at, f.pts));
  if (taken >= 0) { clearSel(); S.selRoom = taken; renderPanel(); renderOverlay(); return; }
  const before = snapshot();
  const id = uniqueRoomId();
  S.model.rooms.push({ id, name: t("room_n", { n: id.slice(5) }), at: rp(p) });
  clearSel(); S.selRoom = S.model.rooms.length - 1;
  $("st-msg").textContent = "";
  commit(before);
}
// How the plan is shown (in the card and Preview; the editor always draws it north up): its rotation and
// the frame - the walls plus a margin on each side (cm), or a fixed viewBox when the model has one.
function framePanel() {
  const c = S.model.canvas || {};
  const mg = c.margin ?? FRAME_MARGIN, m4 = Array.isArray(mg) ? mg : [mg, mg, mg, mg];
  const side = (i, key) => `<label title="${t(key)}"><input type="number" min="0" step="1" data-margin="${i}" value="${m4[i]}"></label>`;
  return `<h3>${t("frame_h")}</h3>
    <div class="row"><span>${t("plan_rotate")}</span><select id="pl-rot">${[0, 90, -90, 180].map((v) =>
      `<option value="${v}"${(c.rotate || 0) === v ? " selected" : ""}>${v}°</option>`).join("")}</select></div>
    ${c.viewBox ? `<div class="empty">${t("frame_fixed")}</div><button id="pl-auto">${t("frame_auto")}</button>`
      : `<div class="row"><span>${t("margin")}</span><span class="margins">${side(0, "m_top")}${side(1, "m_right")}${side(2, "m_bottom")}${side(3, "m_left")}</span></div>
         <div class="empty">${t("frame_hint")}</div>`}
    <div class="row"><span>${t("start_view")}</span><b>${c.start ? t("start_set_yes") : t("start_whole")}</b></div>
    <div class="row"><button id="pl-start">${t("start_set")}</button>${c.start ? `<button id="pl-start-show">${t("start_show")}</button><button id="pl-start-del">${t("start_del")}</button>` : ""}</div>
    <div class="empty">${t("start_hint")}</div>`;
}
function frameWire(box) {
  const edit = (f) => { const before = snapshot(); f(S.model.canvas = S.model.canvas || {}); commit(before); };
  $("pl-rot").onchange = (e) => edit((c) => { c.rotate = Number(e.target.value); });
  if ($("pl-auto")) $("pl-auto").onclick = () => edit((c) => { delete c.viewBox; delete c.sheet; });
  // the start view: what the editor shows now (the card opens there)
  $("pl-start").onclick = () => edit((c) => { c.start = viewBoxCm().map((v) => Math.round(v)); });
  if ($("pl-start-show")) $("pl-start-show").onclick = () => {
    const [x, y, w, h] = S.model.canvas.start, [W, H] = stageSize();
    S.view = { cx: x + w / 2, cy: y + h / 2, s: Math.min(W / w, H / h) };
    draw();
  };
  if ($("pl-start-del")) $("pl-start-del").onclick = () => edit((c) => { delete c.start; });
  box.querySelectorAll("[data-margin]").forEach((inp) => {
    inp.onchange = () => edit((c) => {
      const v = [...box.querySelectorAll("[data-margin]")].map((x) => Math.max(0, Number(x.value) || 0));
      c.margin = v.every((x) => x === v[0]) ? v[0] : v;
    });
  });
}
function roomList() {
  const rows = S.model.rooms.map((r, i) => {
    const poly = roomPoly(r);
    return { i, name: r.name || r.id, a: poly ? polyArea(poly) : 0, key: poly ? poly.map((q) => q.join(",")).sort().join(";") : "" };
  });
  if (!rows.length) return "";
  // two rooms in one area (e.g. after deleting the wall or boundary between them)
  const count = {};
  for (const r of rows) if (r.key) count[r.key] = (count[r.key] || 0) + 1;
  const seen = new Set();
  let total = 0;
  for (const r of rows) if (r.key && !seen.has(r.key)) { seen.add(r.key); total += r.a; }
  return `<h3>${t("rooms_h")}</h3>` + rows.map((r) =>
    `<div class="row room-row" data-room="${r.i}"${count[r.key] > 1 ? ` title="${esc(t("shared_area"))}"` : ""}><span>${esc(r.name)}` +
    `${count[r.key] > 1 ? ' <b style="color: var(--warn)">⚠</b>' : ""}</span><b>${r.a ? m2(r.a) + " m²" : "—"}</b></div>`).join("") +
    `<div class="row"><span>${t("total")}</span><b>${m2(total)} m²</b></div>` +
    (Object.values(count).some((c) => c > 1) ? `<div class="empty" style="color: var(--warn)">⚠ ${t("shared_area")}</div>` : "");
}
function editRoom(f) {
  const r = S.model.rooms[S.selRoom];
  if (!r) return;
  const before = snapshot();
  const msg = f(r);
  if (typeof msg === "string") { S.model = JSON.parse(before); $("st-msg").textContent = msg; renderPanel(); return; }
  $("st-msg").textContent = "";
  commit(before);
}
// colour swatches (the generator's palette) and a picker for any colour; "" = the default
function swatches(key, cur, withDefault = false) {
  const b = (c, label, cls = "") => `<button type="button" class="sw${cls}${(cur || "") === c ? " sel" : ""}" data-sw="${key}" data-c="${c}" aria-label="${esc(label)}" title="${esc(label)}"${c ? ` style="background:${c}"` : ""}></button>`;
  return `<span class="swatches">${withDefault ? b("", t("col_default"), " none") : ""}${Object.entries(COLORS).map(([k, c]) => b(c, t("col_" + k))).join("")}` +
    `<input type="color" data-sw="${key}" value="${/^#[0-9a-f]{6}$/i.test(cur || "") ? cur : "#a07850"}" aria-label="${esc(t("col_any"))}" title="${esc(t("col_any"))}"></span>`;
}
// wire the swatches of a panel: f(key, colour or "")
function wireSwatches(box, f) {
  box.querySelectorAll("button[data-sw]").forEach((b) => { b.onclick = () => f(b.dataset.sw, b.dataset.c); });
  box.querySelectorAll("input[data-sw]").forEach((i) => { i.onchange = () => f(i.dataset.sw, i.value); });
}

function roomPanel(box, r) {
  const poly = roomPoly(r);
  const row = (label, html) => `<div class="row"><span>${label}</span>${html}</div>`;
  box.innerHTML = `<h3>${t("room_h")}</h3>
    ${row(t("name"), `<input id="rm-name" value="${esc(r.name || "")}">`)}
    ${row("ID", `<input id="rm-id" value="${esc(r.id)}">`)}
    ${row(t("area"), `<b>${poly ? m2(polyArea(poly)) + " m²" : "—"}</b>`)}
    ${row(t("perimeter"), `<b>${poly ? fmt(perimeter(poly) / 100) + " m" : "—"}</b>`)}
    ${row(t("outline"), `<b>${r.points ? t("outline_manual") : poly ? t("outline_auto") : t("not_enclosed")}</b>`)}
    ${row(t("tint"), `<select id="rm-tint-kind"><option value="">—</option>${TINT_KINDS.map((k) =>
      `<option value="${k}"${r.tint && r.tint.kind === k ? " selected" : ""}>${t("tint_" + k)}</option>`).join("")}</select>`)}
    ${r.tint ? row(t("entity"), `<input id="rm-tint" value="${esc(r.tint.entity || "")}" placeholder="${TINT_HINT[r.tint.kind] || "sensor.…"}">`) : ""}
    ${row(t("floor"), `<select id="rm-floor"><option value="">${t("fl_none")}</option>${FLOOR_PATTERNS.map((k) =>
      `<option value="${k}"${r.floor && r.floor.pattern === k ? " selected" : ""}>${t("fl_" + k)}</option>`).join("")}</select>`)}
    ${r.floor ? row(t("colour"), swatches("floor", r.floor.color || "")) : ""}
    ${row("", `<label><input id="rm-unused" type="checkbox"${r.unused ? " checked" : ""}> ${t("room_unused")}</label>`)}
    ${r.points ? `<button id="rm-auto">${t("to_auto")}</button>` : ""}
    <div id="rm-area"></div>
    <button id="rm-del" class="danger">${t("delete_room")}</button>`;
  areaPanel(r);
  $("rm-unused").onchange = (e) => editRoom((x) => { if (e.target.checked) x.unused = true; else delete x.unused; });
  $("rm-floor").onchange = (e) => editRoom((x) => {
    if (e.target.value) x.floor = { ...(x.floor || {}), pattern: e.target.value }; else delete x.floor;
  });
  wireSwatches(box, (key, c) => editRoom((x) => { if (x.floor) { if (c) x.floor.color = c; else delete x.floor.color; } }));
  // while the id follows the name, it is shown changing as the name is typed
  const auto = autoRoomId(r);
  $("rm-name").oninput = (e) => { if (auto) $("rm-id").value = freeRoomId(roomSlug(e.target.value), r) || r.id; };
  $("rm-name").onchange = (e) => editRoom((x) => {
    x.name = e.target.value.trim();
    if (auto) { const id = freeRoomId(roomSlug(x.name), x); if (id && id !== x.id) renameRoomId(x, id); }
  });
  $("rm-id").onchange = (e) => editRoom((x) => {
    const id = e.target.value.trim();
    if (!id || (id !== x.id && S.model.rooms.some((y) => y.id === id))) return t("id_taken");
    renameRoomId(x, id);
  });
  $("rm-tint-kind").onchange = (e) => editRoom((x) => {
    if (e.target.value) x.tint = { entity: (x.tint && x.tint.entity) || "", kind: e.target.value }; else delete x.tint;
  });
  if ($("rm-tint")) $("rm-tint").onchange = (e) => editRoom((x) => { x.tint.entity = e.target.value.trim(); });
  if ($("rm-auto")) $("rm-auto").onclick = () => editRoom((x) => {
    // a hand-drawn room -> found from the walls around its label (or middle)
    const p = x.label || centroid(x.points);
    if (!faceAt(S.model, p)) return t("not_enclosed");
    x.at = rp(p);
    delete x.points; delete x.zone;
  });
  $("rm-del").onclick = () => { editRoom(() => { S.model.rooms.splice(S.selRoom, 1); }); S.selRoom = null; renderPanel(); renderOverlay(); };
}
// --- a room from a Home Assistant area: its lamps, readings and sensors placed in one go ---------------------
let AREAS = null; // { areas, entityArea } from HA, asked once per connection
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
function usedEntities(m) {
  const out = new Set();
  const walk = (o) => {
    if (typeof o === "string") { if (/^[a-z_]+\.[a-z0-9_]+$/.test(o)) out.add(o); return; }
    if (o && typeof o === "object") for (const v of Object.values(o)) walk(v);
  };
  walk(m);
  return out;
}
// What an area brings: [{ entity, as }] - as: light | temperature | humidity | presence | motion | manual
export function areaEntities(areaId, entityArea, states, used) {
  const out = [];
  for (const [id, a] of entityArea) {
    if (a !== areaId || used.has(id)) continue;
    const s = states.get(id), dc = s && s.attributes && s.attributes.device_class, domain = id.split(".")[0];
    if (domain === "light") out.push({ entity: id, as: "light" });
    else if (domain === "sensor" && (dc === "temperature" || dc === "humidity")) out.push({ entity: id, as: dc });
    else if (domain === "binary_sensor" && ["occupancy", "presence"].includes(dc)) out.push({ entity: id, as: "presence" });
    else if (domain === "binary_sensor" && dc === "motion") out.push({ entity: id, as: "motion" });
    else if (domain === "cover" || (domain === "binary_sensor" && ["door", "window", "opening"].includes(dc))) out.push({ entity: id, as: "manual" });
  }
  return out;
}
async function areaPanel(r) {
  const box = $("rm-area");
  if (!box || !ha.connected) return;
  try { AREAS = AREAS || (await ha.areas()); } catch (e) { box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  if (S.model.rooms[S.selRoom] !== r) return;
  const guess = r.area || (AREAS.areas.find((a) => norm(a.name) === norm(r.name)) || {}).id || "";
  const list = guess ? areaEntities(guess, AREAS.entityArea, ha.states, usedEntities(S.model)) : [];
  const auto = list.filter((x) => x.as !== "manual"), manual = list.filter((x) => x.as === "manual");
  box.innerHTML = `<div class="row"><span>${t("ha_area")}</span><select id="rm-area-sel"><option value="">—</option>${AREAS.areas.map((a) =>
    `<option value="${esc(a.id)}"${a.id === guess ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>` +
    (guess ? (auto.length ? `<button id="rm-area-add">${t("area_add", { n: auto.length })}</button>` : `<div class="empty">${t("area_none")}</div>`) +
      (manual.length ? `<div class="empty">${t("area_manual")}: ${manual.map((x) => esc(x.entity)).join(", ")}</div>` : "") : "");
  $("rm-area-sel").onchange = (e) => editRoom((x) => { if (e.target.value) x.area = e.target.value; else delete x.area; });
  if ($("rm-area-add")) $("rm-area-add").onclick = () => editRoom((x) => {
    x.area = guess;
    const poly = roomPoly(x);
    const c = x.label || x.at || (poly && centroid(poly));
    if (!c) return t("not_enclosed");
    // lamps in a row through the middle, the rest beside them
    const lights = auto.filter((a) => a.as === "light"), temp = auto.find((a) => a.as === "temperature"), hum = auto.find((a) => a.as === "humidity");
    lights.forEach((a, i) => {
      const p = [c[0] + (i - (lights.length - 1) / 2) * 60, c[1] - 40];
      const d = makeDevice(S.model, "ceiling", p);
      d.item.entity = a.entity; d.item.room = x.id;
      (S.model[d.list] = S.model[d.list] || []).push(d.item);
    });
    if (temp || hum) {
      const d = makeDevice(S.model, "climate", [c[0], c[1] + 30]);
      if (temp) d.item.temperature = temp.entity;
      if (hum) d.item.humidity = hum.entity;
      (S.model[d.list] = S.model[d.list] || []).push(d.item);
    }
    auto.filter((a) => a.as === "presence" || a.as === "motion").forEach((a, i) => {
      const d = makeDevice(S.model, a.as, [c[0] + 70 + i * 40, c[1] + 30]);
      d.item.entity = a.entity; d.item.room = x.id;
      (S.model[d.list] = S.model[d.list] || []).push(d.item);
    });
  });
}

// room colouring: what the entity means (heating = a floor-heating zone)
const TINT_KINDS = ["heating", "temperature", "humidity", "co2", "presence", "state"];
const TINT_HINT = { heating: "climate.…", temperature: "sensor.…", humidity: "sensor.…", co2: "sensor.…", presence: "binary_sensor.…", state: "…" };
const centroid = (pts) => pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
// where a room's label sits (and its drag handle)
const roomAnchor = (r) => r.label || r.at || (r.points && centroid(r.points));
function deleteDivider() {
  const before = snapshot();
  S.model.dividers.splice(S.selDiv, 1);
  S.selDiv = null;
  commit(before);
}
function dividerAt(p) {
  const r = 6 / S.view.s;
  let best = null, bd = r;
  (S.model.dividers || []).forEach((d, i) => { const x = toSegment(p, d.a, d.b).dist; if (x <= bd) { best = i; bd = x; } });
  return best;
}

// --- devices --------------------------------------------------------------------------------------------------------
function selDevice() {
  const d = S.selDev;
  const x = d && (S.model[d.list] || [])[d.i];
  return x ? { ...d, x } : null;
}
function deviceAt(p) {
  const r = 10 / S.view.s;
  let best = null, bd = r;
  for (const h of handles(S.model)) { const d = len(sub(p, h.p)); if (d <= bd) { best = h; bd = d; } }
  if (best) return best;
  // anywhere on a device's outline (a TV, an A/C, an appliance): that device, not the room under it
  const list = S.model.devices || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i].hit;
    if (h && p[0] >= h[0] && p[0] <= h[0] + h[2] && p[1] >= h[1] && p[1] <= h[1] + h[3]) return { list: "devices", i, bulb: 0, p: anchor("devices", list[i]) };
  }
  return null;
}
const camRad = (deg) => (deg * Math.PI) / 180;
function cameraHandles(c) {
  const at = (deg) => add(c.at, [Math.cos(camRad(deg)) * c.range, Math.sin(camRad(deg)) * c.range]);
  return [{ kind: "dir", p: at(c.direction) }, { kind: "fovA", p: at(c.direction - c.fov / 2) }, { kind: "fovB", p: at(c.direction + c.fov / 2) }];
}
// Lights of these kinds can be joined into one circuit (one entity, all their bulbs)
const MERGE_KINDS = ["ceiling", "wall", "night", "spot", ...SHADE_KINDS];
function mergeLights() {
  const sd = selDevice();
  if (!sd || sd.list !== "lights" || !S.selLights || !S.selLights.size) return;
  const before = snapshot();
  const target = S.model.lights[sd.i];
  const others = [...S.selLights].map((j) => S.model.lights[j]).filter(Boolean);
  for (const l of others) {
    target.bulbs.push(...l.bulbs.map((q) => [...q]));
    if (!target.entity && l.entity) target.entity = l.entity;
    if (l.watts) target.watts = (target.watts || 0) + l.watts;
  }
  S.model.lights = S.model.lights.filter((l) => !others.includes(l));
  S.selLights = new Set();
  S.selDev = { list: "lights", i: S.model.lights.indexOf(target), bulb: 0 };
  $("st-msg").textContent = t("merged", { n: others.length + 1 });
  commit(before);
}
function placeDevice(p, shift) {
  const type = S.dev.type;
  const sd = selDevice();
  // "+ bulb" (or Shift + click on the selected light of the same kind): one more bulb on that circuit
  const adding = S.addBulb !== null && S.addBulb !== undefined && S.model.lights[S.addBulb];
  if (adding && !sd) S.selDev = { list: "lights", i: S.addBulb, bulb: 0 };
  if (adding || (shift && sd && sd.list === "lights" && sd.x.kind === type && sd.x.bulbs && MERGE_KINDS.includes(type))) {
    const li = adding ? S.addBulb : sd.i;
    const before = snapshot();
    const l = S.model.lights[li];
    l.bulbs.push(l.rail && l.rail.length > 1 ? onPolyline(l.rail, p) : p);
    moveTo(S.model, "lights", l, p, l.bulbs.length - 1); // rotation of a wall bulb, room
    S.selDev = { list: "lights", i: li, bulb: l.bulbs.length - 1 };
    commit(before);
    return;
  }
  // a rail: clicked corner by corner (L, U...); a click on the last corner, Enter or Esc finishes it
  if (type === "rail") {
    const pts = S.dev.pts || [];
    if (pts.length && len(sub(p, pts[pts.length - 1])) < MIN_LEN) { finishRail(); return; }
    pts.push(p); S.dev.pts = pts; S.dev.start = p;
    renderOverlay();
    return;
  }
  if (TWO_POINT.includes(type) && !S.dev.start) { S.dev.start = p; renderOverlay(); return; }
  const q = S.dev.start;
  S.dev.start = null;
  if (q && len(sub(p, q)) < MIN_LEN) { renderOverlay(); return; }
  const before = snapshot();
  // a washer / a dryer put on the other one: it stands on it (one place, two machines)
  // a router, a switch, a UPS... put on a rack: it goes into it
  const rack = !q && !shift && rackTarget(S.model, p, type);
  if (rack) {
    (rack.items = rack.items || []).push({ id: uniqueId(S.model, type), kind: type, entity: "" });
    clearSel();
    S.selDev = { list: "devices", i: S.model.devices.indexOf(rack), bulb: 0 };
    S.devGhost = null;
    $("st-msg").textContent = t("into_rack", { what: t("d_" + type) });
    commit(before);
    return;
  }
  const under = !q && !shift && stackTarget(S.model, p, type);
  if (under) {
    under.top = { kind: type, entity: "" };
    S.devGhost = null;
    clearSel();
    S.selDev = { list: "devices", i: S.model.devices.indexOf(under), bulb: 0 };
    $("st-msg").textContent = t("stacked", { what: t("d_" + type), on: t("d_" + under.kind) });
    commit(before);
    return;
  }
  const { list, item } = makeDevice(S.model, type, q || p, q ? p : null, { free: (shift || S.dev.turn != null) && !q, flush: FLUSH_PX / S.view.s });
  if (S.dev.turn && !q) turnItem(item, { list, bulb: 0 }, S.dev.turn);
  (S.model[list] = S.model[list] || []).push(item);
  S.devGhost = null;
  clearSel();
  S.selDev = { list, i: S.model[list].length - 1, bulb: 0 };
  commit(before);
}
// The rail drawn so far becomes a light (no bulbs yet): then its bulbs are clicked onto it, Esc when done
function finishRail() {
  const pts = S.dev.pts || [];
  S.dev.pts = null; S.dev.start = null;
  if (pts.length < 2) { renderOverlay(); return; }
  const before = snapshot();
  const { item } = makeDevice(S.model, "rail", pts[0], pts[1]);
  item.rail = pts.map((q) => rp(q)); item.bulbs = [];
  S.model.lights.push(item);
  commit(before);
  const i = S.model.lights.length - 1;
  S.addBulb = i; S.selDev = { list: "lights", i, bulb: 0 };
  $("st-msg").textContent = t("rail_bulbs");
  renderPanel(); renderOverlay();
}
function editDevice(f) {
  const sd = selDevice();
  if (!sd) return;
  const before = snapshot();
  const msg = f(sd.x, sd);
  if (typeof msg === "string") { S.model = JSON.parse(before); $("st-msg").textContent = msg; renderPanel(); return; }
  $("st-msg").textContent = "";
  commit(before);
}
// Turn the selected device by deg (clockwise on screen): a bulb's icon, a sensor's or
// camera's view, a TV's / A/C's / appliance's outline (by 90°). false when it does not turn.
// a device drawn at its size (an appliance, a TV, an A/C, a roof window, a boiler...): resized by handles
function devResizable(sd) {
  return !!(sd && sd.list === "devices" && sd.x.hit && sd.x.type !== "presence" && (sd.x.type !== "icon" || sd.x.kind));
}
function rotatable(sd) {
  if (!sd) return false;
  const x = sd.x;
  if (sd.list === "lights") return x.type === "fixture" ? !!x.at
    : x.kind === "strip" ? !!x.beam : !!(x.bulbs && x.bulbs.length);
  if (sd.list === "cameras") return true;
  if (sd.list === "notes") return x.type === "text";
  if (sd.list === "devices") return !!x.hit || typeof x.direction === "number";
  return false;
}
function rotateSelected(deg) {
  const sd = selDevice();
  if (!rotatable(sd)) return false;
  editDevice((y, d) => turnItem(y, d, deg));
  return true;
}
// Turn one device by deg (d: its list and bulb)
function turnItem(y, d, deg) {
  const turn = (a) => ((Math.round((a ?? 0) + deg) % 360) + 360) % 360;
  {
    if (d.list === "lights" && y.type === "fixture") y.at = [y.at[0], y.at[1], turn(y.at[2])];
    else if (d.list === "lights" && !(y.bulbs && y.bulbs.length)) { if (y.beam) y.beam_dir = turn(y.beam_dir); }
    else if (d.list === "lights") { const b = y.bulbs[d.bulb]; y.bulbs[d.bulb] = [b[0], b[1], turn(b[2]), ...b.slice(3)]; }
    else if (d.list === "notes") { const r = turn(y.rot); if (r) y.rot = r; else delete y.rot; }
    else if (typeof y.direction === "number") y.direction = turn(y.direction);
    else if (y.hit && deg % 90 === 0 && deg % 360) {
      // a TV / an A/C faces where its front is (180 = down the plan unless set)
      if (y.beam || y.type === "tv" || y.type === "climate_unit" || y.kind) y.beam_dir = turn(y.beam_dir ?? 180);
      if (Math.abs(deg) % 180 !== 90) return;
      resizeHit(y, y.hit[3], y.hit[2]);
      if (y.glow && y.glow.rx) y.glow = { ...y.glow, rx: y.glow.ry, ry: y.glow.rx };
    }
  }
}
// The device in hand (Devices tool): drawn on the plan under the cursor as it will be placed (turned by R),
// or - a washer / a dryer over the other one - that one with it on top. null when a click would not place one.
function deviceGhost(p, shift = false) {
  const type = S.dev.type;
  if (S.dev.start || TWO_POINT.includes(type) || type === "rail" || (S.addBulb !== null && S.addBulb !== undefined)) return null;
  const rack = !shift && rackTarget(S.model, p, type);
  if (rack) return { rack: S.model.devices.indexOf(rack), kind: type };
  const under = !shift && stackTarget(S.model, p, type);
  if (under) return { stack: S.model.devices.indexOf(under), kind: type };
  if (deviceAt(p)) return null; // a click there grabs that one
  try {
    // near a wall it turns its back to it, unless turned by hand (R)
    // Shift: exactly at the cursor, no turning, no snapping
    const { list, item } = makeDevice(S.model, type, p, null, { free: shift || S.dev.turn != null, flush: FLUSH_PX / S.view.s });
    if (S.dev.turn) turnItem(item, { list, bulb: 0 }, S.dev.turn);
    return { list, item };
  } catch (e) { return null; }
}
// A piece of equipment taken out of a rack: it stands next to it, keeping its entity
function rackOut(k) {
  const sd = selDevice();
  if (!sd || !sd.x.items || !sd.x.items[k]) return;
  const before = snapshot();
  const it = sd.x.items.splice(k, 1)[0], h = sd.x.hit;
  const { item } = makeDevice(S.model, it.kind, [h[0] + h[2] + 20, h[1] + h[3] / 2], null, { free: true });
  Object.assign(item, { id: it.id, entity: it.entity || "" });
  S.model.devices.push(item);
  S.selDev = { list: "devices", i: S.model.devices.length - 1, bulb: 0 };
  commit(before);
}
// A stack taken apart: the machine on top stands next to the one below, along its wall
function unstack() {
  const sd = selDevice();
  if (!sd || !sd.x.top) return;
  const before = snapshot();
  const x = sd.x, top = x.top, a = (((Math.round((x.beam_dir ?? 180) / 90) * 90) % 360) + 360) % 360;
  delete x.top;
  const side = a % 180 === 0, c = [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2];
  const p = side ? [c[0] + x.hit[2] + 2, c[1]] : [c[0], c[1] + x.hit[3] + 2];
  const { item } = makeDevice(S.model, top.kind, p);
  item.entity = top.entity || "";
  item.hit = side ? [r2(x.hit[0] + x.hit[2] + 2), x.hit[1], x.hit[2], x.hit[3]] : [x.hit[0], r2(x.hit[1] + x.hit[3] + 2), x.hit[2], x.hit[3]];
  item.glow = { ...item.glow, at: rp([item.hit[0] + item.hit[2] / 2, item.hit[1] + item.hit[3] / 2]) };
  item.beam_dir = x.beam_dir ?? 180;
  S.model.devices.push(item);
  S.selDev = { list: "devices", i: S.model.devices.length - 1, bulb: 0 };
  commit(before);
}
function deleteDevice() {
  const sd = selDevice();
  if (!sd) return;
  editDevice(() => { S.model[sd.list].splice(sd.i, 1); });
  S.selDev = null;
  renderPanel(); renderOverlay();
}
// one form row; `kind`: "text" | "number" | "check"; set(x, value) changes the element
function field(label, key, value, kind = "text", extra = "") {
  if (kind === "check") return `<div class="row"><span></span><label><input data-df="${key}" type="checkbox"${value ? " checked" : ""}> ${label}</label></div>`;
  return `<div class="row"><span>${label}</span><input data-df="${key}" type="${kind}" value="${esc(value ?? "")}" ${extra}></div>`;
}
// the devices tool: what to place, in groups
// --- furniture ------------------------------------------------------------------------------------------------
// a piece's own drawing as the tile's icon
function pieceIcon(kind) {
  const [w, d] = FURN_SIZES[kind] || [60, 60];
  const m = Math.max(w, d) * 0.56;
  return `<svg class="ico" viewBox="${-m} ${-m} ${2 * m} ${2 * m}" fill="#243040" stroke="#8ea1ba" stroke-width="${(m / 10).toFixed(1)}"
    stroke-linejoin="round" aria-hidden="true">${pieceShape(kind, w, d)}</svg>`;
}
// a drawn piece as a tile's icon
function drawnIcon(parts, size) {
  const [w, d] = size, m = Math.max(w, d) * 0.56;
  return `<svg class="ico" viewBox="${-m} ${-m} ${2 * m} ${2 * m}" fill="#243040" stroke="#8ea1ba" stroke-width="${(m / 10).toFixed(1)}"
    stroke-linejoin="round" aria-hidden="true">${drawnShape(parts, w, d)}</svg>`;
}
const DRAW_ICON = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4 11-11 3 3-11 11z M14 7l3 3"/></svg>';
function furniturePalette(box) {
  if (!S.palOpenF) S.palOpenF = new Set(S.furn.kind === "_draw" || S.furn.kind.startsWith("lib:") ? ["f_mine"]
    : Object.keys(FURNITURE_GROUPS).filter((g) => FURNITURE_GROUPS[g].includes(S.furn.kind)));
  const mine = S.model.furniture_library || [];
  const openMine = S.palOpenF.has("f_mine");
  box.innerHTML = `<button type="button" class="pal-h fold${openMine ? " open" : ""}" data-fgroup="f_mine">${t("f_mine")}<span>${mine.length}</span></button>` +
    (openMine ? tiles("furn", [{ value: "_draw", label: t("fu__draw"), svg: DRAW_ICON },
      ...mine.map((x) => ({ value: "lib:" + esc(x.id), label: esc(x.name || x.id), svg: drawnIcon(x.parts, x.size) }))], S.furn.kind) : "") +
    (S.furn.kind === "_draw" ? sketchPanel() : "") +
    Object.entries(FURNITURE_GROUPS).map(([g, list]) => {
    const open = S.palOpenF.has(g);
    return `<button type="button" class="pal-h fold${open ? " open" : ""}" data-fgroup="${g}">${t(g)}<span>${list.length}</span></button>` +
      (open ? tiles("furn", list.map((k) => ({ value: k, label: t("fu_" + k), svg: pieceIcon(k) })), S.furn.kind) : "");
  }).join("") + `<div class="empty">${t("furn_hint")}</div>`;
  box.querySelectorAll("[data-fgroup]").forEach((h) => {
    h.onclick = () => { const g = h.dataset.fgroup; S.palOpenF.has(g) ? S.palOpenF.delete(g) : S.palOpenF.add(g); furniturePalette(box); };
  });
  if (S.furn.kind === "_draw") wireSketch(box);
}

// --- drawing a piece of furniture: rectangles, ellipses and polygons, then one piece of them ---------------------
function sketchPanel() {
  const k = S.sketch;
  return `<div class="sketch">` + tiles("sk-shape", ["rect", "ellipse", "poly"].map((v) => ({ value: v, label: t("sk_" + v) })), k.shape, "small") +
    `<label><input type="checkbox" id="sk-detail"${k.detail ? " checked" : ""}> ${t("sk_detail")}</label>
    <div class="empty">${t("sk_hint")}</div>
    <div class="row"><span>${t("sk_count", { n: k.parts.length })}</span><span class="turn"><button id="sk-undo"${k.parts.length ? "" : " disabled"}>${t("sk_undo")}</button><button id="sk-clear"${k.parts.length ? "" : " disabled"}>${t("sk_clear")}</button></span></div>
    <button id="sk-done" class="primary"${k.parts.length ? "" : " disabled"}>${t("sk_done")}</button></div>`;
}
function wireSketch(box) {
  const d = box.querySelector("#sk-detail");
  if (d) d.onchange = () => { S.sketch.detail = d.checked; };
  const on = (id, f) => { const b = box.querySelector("#" + id); if (b) b.onclick = f; };
  on("sk-undo", () => { S.sketch.parts.pop(); renderToolBody(); renderOverlay(); });
  on("sk-clear", () => { S.sketch.parts = []; S.sketch.start = null; S.sketch.pts = []; renderToolBody(); renderOverlay(); });
  on("sk-done", sketchDone);
}
// a click while drawing: rectangle / ellipse = two opposite corners, polygon = its corners (back to the first closes it)
function sketchClick(p) {
  const k = S.sketch;
  if (k.shape === "poly") {
    if (k.pts.length >= 3 && len(sub(p, k.pts[0])) < 12 / S.view.s) { sketchClosePoly(); return; }
    k.pts.push(p);
  } else if (!k.start) k.start = p;
  else {
    if (Math.abs(p[0] - k.start[0]) > 1 && Math.abs(p[1] - k.start[1]) > 1) k.parts.push({ t: k.shape, a: k.start, b: p, detail: k.detail });
    k.start = null;
  }
  renderToolBody(); renderOverlay();
}
function sketchClosePoly() {
  const k = S.sketch;
  if (k.pts.length >= 3) k.parts.push({ t: "poly", pts: k.pts, detail: k.detail });
  k.pts = [];
  renderToolBody(); renderOverlay();
}
// the drawn shapes -> one piece: its box is the size, the shapes in fractions of it (it resizes and turns as one)
function sketchDone() {
  const k = S.sketch;
  if (!k.parts.length) return;
  const all = k.parts.flatMap((q) => (q.t === "poly" ? q.pts : [q.a, q.b]));
  const x0 = Math.min(...all.map((q) => q[0])), x1 = Math.max(...all.map((q) => q[0]));
  const y0 = Math.min(...all.map((q) => q[1])), y1 = Math.max(...all.map((q) => q[1]));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), c = [(x0 + x1) / 2, (y0 + y1) / 2];
  const fx = (x) => r4((x - c[0]) / w), fy = (y) => r4((y - c[1]) / h);
  const parts = k.parts.map((q) => {
    const extra = q.detail ? { detail: true } : {};
    if (q.t === "poly") return { t: "poly", pts: q.pts.map((v) => [fx(v[0]), fy(v[1])]), ...extra };
    const ax = Math.min(q.a[0], q.b[0]), bx = Math.max(q.a[0], q.b[0]), ay = Math.min(q.a[1], q.b[1]), by = Math.max(q.a[1], q.b[1]);
    if (q.t === "ellipse") return { t: "ellipse", cx: fx((ax + bx) / 2), cy: fy((ay + by) / 2), rx: r4((bx - ax) / 2 / w), ry: r4((by - ay) / 2 / h), ...extra };
    return { t: "rect", x: fx(ax), y: fy(ay), w: r4((bx - ax) / w), h: r4((by - ay) / h), ...extra };
  });
  const before = snapshot();
  const piece = { id: uniquePieceId(S.model, "drawn"), kind: "drawn", at: [r2(c[0]), r2(c[1])], size: [r2(w), r2(h)], rot: 0, parts };
  placePiece(S.model, piece);
  (S.model.furniture = S.model.furniture || []).push(piece);
  S.sketch = { ...k, start: null, pts: [], parts: [] };
  clearSel(); S.selFurn = S.model.furniture.length - 1;
  commit(before);
  renderToolBody();
}
const r4 = (v) => Math.round(v * 10000) / 10000;
// one of my pieces placed again
function placeMine(id, p) {
  const x = (S.model.furniture_library || []).find((y) => y.id === id);
  if (!x) return null;
  const piece = { id: uniquePieceId(S.model, "drawn"), kind: "drawn", at: [r2(p[0]), r2(p[1])], size: [...x.size], rot: 0,
    parts: JSON.parse(JSON.stringify(x.parts)), ...(x.color ? { color: x.color } : {}), ...(x.name ? { name: x.name } : {}) };
  placePiece(S.model, piece);
  return piece;
}
// The selected pieces (indices, drawing order): the clicked one, the Shift-added ones and their whole groups.
function selPieces() {
  const list = S.model.furniture || [];
  if (S.selFurn === null || !list[S.selFurn]) return [];
  const pick = new Set([S.selFurn, ...S.selMore].filter((i) => list[i]));
  const groups = new Set([...pick].map((i) => list[i].group).filter(Boolean));
  list.forEach((f, i) => { if (f.group && groups.has(f.group)) pick.add(i); });
  return [...pick].sort((a, b) => a - b);
}
// select pieces by index (the first one is "the clicked one")
function selectPieces(idx) {
  clearSel();
  if (!idx.length) return;
  S.selFurn = idx[0];
  S.selMore = new Set(idx.slice(1));
}
function editPiece(f) {
  const p = S.model.furniture[S.selFurn];
  if (!p) return;
  const before = snapshot();
  f(p);
  placePiece(S.model, p);
  commit(before);
}
// What the round "turn" handle turns: the selected bulb / spotlight / chandelier / strip beam / motion sensor /
// text / piece of furniture. Angles as on a compass: 0 = up the plan, clockwise. -> { c, get, set, r } or null
function rotTarget() {
  const px = 1 / S.view.s;
  const fi = selPieces();
  if (fi.length === 1) {
    const f = S.model.furniture[fi[0]];
    if (f && !f.group && f.kind !== "custom" && f.size)
      return { c: f.at, get: () => f.rot || 0, set: (a) => { if (a) f.rot = a; else delete f.rot; }, r: Math.max(...f.size) / 2 + 22 * px };
    return null;
  }
  const sd = selDevice();
  if (!sd) return null;
  const x = sd.x, r = 30 * px;
  if (sd.list === "lights") {
    if (x.type === "fixture" && x.at) return { c: x.at, get: () => x.at[2] || 0, set: (a) => { x.at = [x.at[0], x.at[1], a]; }, r: r * 2 };
    if (x.bulbs && x.bulbs[sd.bulb]) {
      const i = sd.bulb;
      return { c: x.bulbs[i].slice(0, 2), get: () => x.bulbs[i][2] || 0,
        set: (a) => { const q = x.bulbs[i]; x.bulbs[i] = [q[0], q[1], a, ...q.slice(3)]; }, r };
    }
    if (x.strip && x.beam) return { c: [x.strip[0] + x.strip[2] / 2, x.strip[1] + x.strip[3] / 2], get: () => x.beam_dir || 0, set: (a) => { x.beam_dir = a; }, r };
    return null;
  }
  if ((sd.list === "devices" || sd.list === "cameras") && typeof x.direction === "number" && x.at)
    return { c: x.at, get: () => x.direction + 90, set: (a) => { x.direction = ((a - 90) % 360 + 360) % 360; }, r };
  if (sd.list === "notes" && x.type === "text" && x.at) return { c: x.at, get: () => x.rot || 0, set: (a) => { if (a) x.rot = a; else delete x.rot; }, r: r * 1.5 };
  return null;
}
function drawRotHandle(px) {
  const rt = rotTarget();
  if (!rt) return;
  const q = rotPos(rt);
  overlay.append(el("line", { class: "ov-rot-line", x1: rt.c[0], y1: rt.c[1], x2: q[0], y2: q[1] }));
  // a round button with a "turn" arrow (↻), the same size whatever the zoom
  const g = el("g", { class: "ov-rot", "data-x": q[0], "data-y": q[1], transform: `translate(${q[0]} ${q[1]}) scale(${px})` });
  g.append(el("circle", { class: "ov-rot-bg", r: 9 }));
  g.append(el("path", { class: "ov-rot-arrow", d: "M4.6 -2.2 A5 5 0 1 0 4.4 2.6" }));
  g.append(el("path", { class: "ov-rot-head", d: "M5.6 -5.2 L4.8 -1.6 L1.4 -2.8 Z" }));
  overlay.append(g);
}
const rotPos = (rt) => { const a = (rt.get() * Math.PI) / 180; return [rt.c[0] + Math.sin(a) * rt.r, rt.c[1] - Math.cos(a) * rt.r]; };
function turnPiece(deg) {
  const idx = selPieces();
  if (!idx.length) return;
  const before = snapshot();
  turnPieces(S.model, idx, deg);
  commit(before);
}
function deletePiece() {
  const idx = selPieces();
  const before = snapshot();
  for (const i of [...idx].reverse()) S.model.furniture.splice(i, 1);
  if (!S.model.furniture.length) delete S.model.furniture;
  clearSel();
  commit(before);
}
function orderPieces(how) {
  const idx = selPieces();
  if (!idx.length) return;
  const before = snapshot();
  selectPieces(reorder(S.model, idx, how));
  commit(before);
}
function groupPieces() {
  const idx = selPieces();
  if (idx.length < 2) return;
  const before = snapshot();
  const used = new Set(S.model.furniture.map((f) => f.group).filter(Boolean));
  let k = 1; while (used.has("group-" + k)) k++;
  for (const i of idx) S.model.furniture[i].group = "group-" + k;
  commit(before);
}
function ungroupPieces() {
  const idx = selPieces();
  const before = snapshot();
  for (const i of idx) delete S.model.furniture[i].group;
  selectPieces(idx);
  commit(before);
}
// Split a carried-over piece into its separate parts (children that overlap or touch stay together).
function splitPiece() {
  const i = S.selFurn, p = S.model.furniture[i];
  if (!p || p.kind !== "custom") return;
  const parts = customParts(p);
  if (parts.length < 2) { $("st-msg").textContent = t("split_one"); return; }
  const before = snapshot();
  const pieces = splitPieces(p, parts, cmPerSvg());
  for (const q of pieces) placePiece(S.model, q);
  S.model.furniture.splice(i, 1, ...pieces);
  selectPieces(pieces.map((_, j) => i + j));
  commit(before);
}
// The parts of a custom piece, measured as drawn (in a hidden SVG): [{svg, box}]
function customParts(p) {
  const host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  host.setAttribute("style", "position:absolute; left:0; top:0; width:1px; height:1px; overflow:visible; visibility:hidden");
  host.innerHTML = `<g id="furniture" fill="#243040" stroke="#3a4861" stroke-width="1.2">${p.svg}</g>`;
  document.body.append(host);
  try {
    const outer = host.querySelector("#furniture > g");
    const o = host.getBoundingClientRect();
    const kids = [...outer.children].filter((c) => !["style", "title", "desc"].includes(c.tagName.toLowerCase()));
    const styles = [...outer.children].filter((c) => c.tagName.toLowerCase() === "style").map((c) => c.outerHTML);
    const boxes = kids.map((c) => { const r = c.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.right - o.left, r.bottom - o.top]; });
    const head = p.svg.match(/^\s*<g\b[^>]*>/)[0].trim();
    return clusters(boxes).map((cl, j) => {
      const inner = cl.map((ci) => kids[ci].outerHTML).join("\n      ");
      const css = styles.filter(() => /class="/.test(inner)).join("\n      ");
      const id = `${p.id}-${j + 1}`;
      return { svg: head.replace(/\bid="[^"]*"/, `id="${id}"`) + "\n      " + (css ? css + "\n      " : "") + inner + "\n    </g>",
        box: [Math.min(...cl.map((ci) => boxes[ci][0])), Math.min(...cl.map((ci) => boxes[ci][1])),
          Math.max(...cl.map((ci) => boxes[ci][2])), Math.max(...cl.map((ci) => boxes[ci][3]))] };
    });
  } finally { host.remove(); }
}
// the drawing order and grouping buttons (one piece or several)
function orderRow(grouped, many) {
  return `<div class="row"><span>${t("order")}</span><span class="turn">
      <button id="fo-back" title="Shift+[">⤓</button><button id="fo-down" title="[">↓</button>
      <button id="fo-up" title="]">↑</button><button id="fo-front" title="Shift+]">⤒</button></span></div>
    ${many && !grouped ? `<button id="fg-group" title="Ctrl+G">${t("group")}</button>` : ""}
    ${grouped ? `<button id="fg-ungroup" title="Ctrl+Shift+G">${t("ungroup")}</button>` : ""}`;
}
function wireOrder() {
  for (const [id, how] of [["fo-back", "back"], ["fo-down", "down"], ["fo-up", "up"], ["fo-front", "front"]]) $(id).onclick = () => orderPieces(how);
  if ($("fg-group")) $("fg-group").onclick = groupPieces;
  if ($("fg-ungroup")) $("fg-ungroup").onclick = ungroupPieces;
}
function furnitureGroupPanel(box, idx) {
  const list = idx.map((i) => S.model.furniture[i]);
  const grouped = list.every((f) => f.group && f.group === list[0].group);
  box.innerHTML = `<h3>${grouped ? t("group_h", { n: list.length }) : t("pieces_n", { n: list.length })}</h3>
    <div class="empty">${list.map((f) => esc(f.kind === "custom" ? f.id : t("fu_" + f.kind))).join(", ")}</div>
    <div class="row"><span>${t("turn")}</span><span class="turn"><button id="fu-ccw" title="Shift+R">↺ 90°</button><button id="fu-cw" title="R">↻ 90°</button></span></div>
    ${orderRow(grouped, true)}
    <div class="empty">${t("group_hint")}</div>
    <button id="fu-del" class="danger">${t("delete_pieces", { n: list.length })}</button>`;
  $("fu-cw").onclick = () => turnPiece(90);
  $("fu-ccw").onclick = () => turnPiece(-90);
  $("fu-del").onclick = deletePiece;
  wireOrder();
}
function furniturePanel(box, p) {
  const room = p.room ? esc((S.model.rooms.find((r) => r.id === p.room) || {}).name || p.room) : "—";
  const custom = p.kind === "custom", drawn = p.kind === "drawn";
  const saved = drawn && (S.model.furniture_library || []).some((x) => x.id === p.lib);
  box.innerHTML = `<h3>${custom ? esc(p.id) : drawn ? esc(p.name || t("fu_drawn")) : t("fu_" + p.kind)}</h3>
    ${drawn ? `<div class="row"><span>${t("lib_name")}</span><input id="fu-name" value="${esc(p.name || "")}" placeholder="${esc(t("fu_drawn"))}"></div>
      <button id="fu-lib"${saved ? " disabled" : ""}>${saved ? t("lib_saved") : t("lib_save")}</button>` : ""}
    ${custom ? `<div class="empty">${t("fu_custom")}</div>` : ""}
    <div class="row"><span>${t("room_h")}</span><b>${room}</b></div>
    ${custom ? `<div class="row"><span>${t("size")}</span><b>${fmt(p.size[0])} × ${fmt(p.size[1])} cm</b></div>`
      : `<div class="row"><span>${t("op_width")}</span><label><input id="fu-w" type="number" min="5" step="1" value="${r2(p.size[0])}"> cm</label></div>
         <div class="row"><span>${t("p_depth")}</span><label><input id="fu-d" type="number" min="5" step="1" value="${r2(p.size[1])}"> cm</label></div>`}
    <div class="row"><span>${t("rotation")}</span><label><input id="fu-rot" type="number" step="15" value="${p.rot || 0}"></label></div>
    <div class="row"><span>${t("turn")}</span><span class="turn"><button id="fu-ccw" title="Shift+R">↺ 90°</button><button id="fu-cw" title="R">↻ 90°</button></span></div>
    <div class="row"><span>${t("colour")}</span>${swatches("piece", p.color || "", true)}</div>
    ${orderRow(!!p.group, false)}
    ${custom ? `<button id="fu-split">${t("split")}</button>` : ""}
    <div class="sub-h">${t("note")}</div><textarea id="fu-note" rows="${p.note ? 6 : 2}">${esc(p.note || "")}</textarea>
    <button id="fu-del" class="danger">${t("delete_piece")}</button>`;
  wireOrder();
  wireSwatches(box, (key, c) => editPiece((q) => { if (c) q.color = c; else delete q.color; }));
  if ($("fu-name")) $("fu-name").onchange = (e) => editPiece((q) => { const v = e.target.value.trim(); if (v) q.name = v; else delete q.name; });
  if ($("fu-lib")) $("fu-lib").onclick = () => editPiece((q) => {
    // my furniture: the shape, its size and colour, to place again from the palette
    const lib = (S.model.furniture_library = S.model.furniture_library || []);
    let id = (q.name || "drawn").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "drawn";
    for (let i = 2; lib.some((x) => x.id === id); i++) id = id.replace(/-\d+$/, "") + "-" + i;
    lib.push({ id, name: q.name || t("fu_drawn"), size: [...q.size], parts: JSON.parse(JSON.stringify(q.parts)), ...(q.color ? { color: q.color } : {}) });
    q.lib = id;
  });
  if ($("fu-lib")) $("fu-lib").addEventListener("click", () => setTimeout(() => S.tool === "furniture" && renderToolBody(), 0));
  if ($("fu-split")) $("fu-split").onclick = splitPiece;
  if ($("fu-w")) $("fu-w").onchange = (e) => editPiece((q) => { q.size = [Math.max(5, Number(e.target.value)), q.size[1]]; });
  if ($("fu-d")) $("fu-d").onchange = (e) => editPiece((q) => { q.size = [q.size[0], Math.max(5, Number(e.target.value))]; });
  $("fu-rot").onchange = (e) => editPiece((q) => { q.rot = ((Number(e.target.value) % 360) + 360) % 360; });
  $("fu-cw").onclick = () => turnPiece(90);
  $("fu-ccw").onclick = () => turnPiece(-90);
  $("fu-note").onchange = (e) => editPiece((q) => { const v = e.target.value.trim(); if (v) q.note = v; else delete q.note; });
  $("fu-del").onclick = deletePiece;
}

// palette groups, each folds on a click on its name; at first only the chosen device's group is open
function devicePalette(box) {
  if (!S.palOpen) S.palOpen = new Set(Object.keys(DEVICE_GROUPS).filter((g) => DEVICE_GROUPS[g].includes(S.dev.type)));
  box.innerHTML = Object.entries(DEVICE_GROUPS).map(([g, list]) => {
    const open = S.palOpen.has(g);
    return `<button type="button" class="pal-h fold${open ? " open" : ""}" data-group="${g}">${t(g)}<span>${list.length}</span></button>` +
      (open ? tiles("dev", list.map((k) => ({ value: k, label: t("d_" + k), icon: devIcon(k) })), S.dev.type) : "");
  }).join("") + `<div class="empty">${t(S.dev.type === "rail" ? "dev_hint_rail" : TWO_POINT.includes(S.dev.type) ? "dev_hint2" : "dev_hint")}</div>`;
  box.querySelectorAll("[data-group]").forEach((h) => {
    h.onclick = () => { const g = h.dataset.group; S.palOpen.has(g) ? S.palOpen.delete(g) : S.palOpen.add(g); devicePalette(box); };
  });
}
// the selected device's properties (right panel)
// the beam angle: empty or 360 = all around (the field goes)
// a reading under the symbol makes no sense for these (an alarm is its state). A device's kind never changes
// in its panel: another kind is another device (delete it, place the other one)
const NO_VALUE_KINDS = ["smoke", "co", "leak", "gate"];
function setBeam(y, v) {
  const a = Number(v);
  if (v === "" || !(a > 0 && a < 360)) { delete y.beam; delete y.beam_dir; return; }
  y.beam = a;
  if (y.beam_dir === undefined && !(y.bulbs && y.bulbs.length)) y.beam_dir = 0;
}
function devicePanel(box) {
  const sd = selDevice();
  let form = "";
  const sets = {}; // data-df key -> (x, value) => void | message
  if (sd) {
    const x = sd.x, L = sd.list;
    const row = (label, html) => `<div class="row"><span>${label}</span>${html}</div>`;
    const id = (prefix = "") => { sets.id = (y, v) => renameDevice(L, y, v); return field("ID", "id", x.id); };
    const ent = (key = "entity", label = t("entity")) => { sets[key] = (y, v) => { y[key] = v; }; return field(label, key, x[key], "text", 'placeholder="domain.object"'); };
    const where = () => row(t("room_h"), `<b>${x.room ? esc((S.model.rooms.find((r) => r.id === x.room) || {}).name || x.room) : x.outdoor ? t("outdoor") : "—"}</b>`);
    const size = () => {
      // along its wall and out from it (whichever way it faces); a TV also by its diagonal (16:9)
      const [W, D] = wallSize(x);
      const ok = (v) => Number(v) >= 5 || t("size_min");
      sets.w = (y, v) => { const r = ok(v); if (r !== true) return r; setWallSize(y, Number(v), wallSize(y)[1]); };
      sets.h = (y, v) => { const r = ok(v); if (r !== true) return r; setWallSize(y, wallSize(y)[0], Number(v)); };
      sets.inch = (y, v) => { if (!(Number(v) >= 10)) return t("size_min"); setWallSize(y, r2(tvWidth(Number(v))), wallSize(y)[1]); };
      // (turning it is the turn row / handle below - no separate "turn 90°" button)
      return (x.type === "tv" ? field(t("tv_inches"), "inch", Math.round(tvInches(W) * 10) / 10, "number", 'min="10" step="1"') : "") +
        field(t("op_width"), "w", r2(W), "number", 'min="5"') + field(t("p_depth"), "h", r2(D), "number", 'min="5"');
    };
    if (L === "lights" && x.type === "fixture") {
      sets.e1 = (y, v) => { y.circuits[0].entity = v; };
      sets.e2 = (y, v) => { y.circuits[1].entity = v; };
      // power of each circuit (all its bulbs), for energy and cost in a card
      const watt = (k) => (y, v) => { if (v === "") delete y.circuits[k].watts; else y.circuits[k].watts = Number(v); };
      sets.w1 = watt(0); sets.w2 = watt(1);
      // how many bulbs each circuit has: the chandelier is drawn with that many (empty: 3 large, 1 small)
      const nb = (k) => (y, v) => { if (v === "") { delete y.circuits[k].bulbs; return; } const b = Math.round(Number(v));
        if (!(b >= 1 && b <= 12)) return t("bulbs_1_12"); y.circuits[k].bulbs = b; };
      sets.n1 = nb(0); sets.n2 = nb(1);
      const nbf = (k, dflt) => field(t("bulbs"), "n" + (k + 1), x.circuits[k].bulbs ?? "", "number", `min="1" max="12" step="1" placeholder="${dflt}"`);
      // its title in a card's dialog (empty: the common part of the circuits' names)
      sets.name = (y, v) => { if (v) y.name = v; else delete y.name; };
      form = `<h3>${t("d_fixture")}</h3>${id()}${field(t("name"), "name", x.name ?? "", "text", `placeholder="${t("fixture_name_auto")}"`)}` +
        `${field(t("circuit_large"), "e1", x.circuits[0].entity)}` +
        `${nbf(0, 3)}${field(t("watts"), "w1", x.circuits[0].watts ?? "", "number", 'min="0" step="0.5" placeholder="W"')}` +
        `${field(t("circuit_small"), "e2", x.circuits[1].entity)}` +
        `${nbf(1, 1)}${field(t("watts"), "w2", x.circuits[1].watts ?? "", "number", 'min="0" step="0.5" placeholder="W"')}${where()}`;
    } else if (L === "lights") {
      sets.kind = (y, v) => { y.kind = v; };
      sets.glow_r = (y, v) => { if (v === "") delete y.glow_r; else y.glow_r = Number(v); };
      sets.watts = (y, v) => { if (v === "") delete y.watts; else y.watts = Number(v); };
      sets.beam = setBeam; sets.beam_dir = (y, v) => { y.beam_dir = Number(v); };
      const n = (x.bulbs || []).length;
      const b = x.bulbs && x.bulbs[sd.bulb];
      const turns = x.kind !== "strip";
      if (b && turns) sets.rot = (y, v) => { y.bulbs[sd.bulb] = [b[0], b[1], Number(v), ...y.bulbs[sd.bulb].slice(3)]; };
      // a circuit of several bulbs: each one listed with its own direction and beam angle
      for (let i = 0; i < n; i++) {
        sets["brot" + i] = (y, v) => { const q = y.bulbs[i]; y.bulbs[i] = [q[0], q[1], Number(v) || 0, ...q.slice(3)]; };
        sets["bbeam" + i] = (y, v) => {
          const q = y.bulbs[i], a = Number(v);
          y.bulbs[i] = v === "" || !(a > 0 && a < 360) ? [q[0], q[1], q[2] ?? 0] : [q[0], q[1], q[2] ?? 0, a];
        };
      }
      const bulbList = n > 1 ? `<div class="sub-h">${t("bulbs")} · ${n}</div><div class="bulb-list">${x.bulbs.map((q, i) =>
        `<div class="bulb-row${i === sd.bulb ? " on" : ""}"><button data-bsel="${i}" title="${t("bulb_show")}">${i + 1}</button>` +
        (turns ? `<label title="${t("rotation")}">↻<input data-df="brot${i}" type="number" step="15" value="${q[2] ?? 0}"></label>` : "") +
        `<label title="${t("beam_one")}">∢<input data-df="bbeam${i}" type="number" min="10" max="360" step="15" value="${q[3] ?? ""}" placeholder="${x.beam || 360}"></label>` +
        `<button data-bsplit="${i}" title="${t("split_bulb")}">⇱</button><button data-bdel="${i}" class="danger" title="${t("remove_bulb")}">✕</button></div>`).join("")}</div>` : "";
      form = `<h3>${t("d_" + x.kind)}</h3>${id()}${ent()}
        ${field(t("glow_r"), "glow_r", x.glow_r ?? "", "number", 'min="5" placeholder="auto"')}
        ${n === 1 ? row(t("bulbs"), `<b>1</b>`) : ""}
        ${field(t("watts_all"), "watts", x.watts ?? "", "number", 'min="0" step="0.5" placeholder="W"')}
        ${field(t("beam"), "beam", x.beam ?? "", "number", 'min="10" max="360" step="15" placeholder="360"')}
        ${x.kind === "strip" && x.beam ? field(t("beam_dir"), "beam_dir", x.beam_dir ?? 0, "number", 'step="15"') : ""}
        ${b && turns && n === 1 ? field(t("rotation"), "rot", b[2] ?? 0, "number", 'step="15"') : ""}
        ${bulbList}
        ${x.kind === "rail" ? `<button id="dv-addbulb">${t("add_bulb")}</button><div class="empty">${t("rail_hint")}</div>` : ""}
        ${MERGE_KINDS.includes(x.kind) ? `<button id="dv-addbulb">${t("add_bulb")}</button><div class="empty">${t("add_bulb_hint")}</div>` : ""}
        ${S.selLights && S.selLights.size ? `<div class="sub-h">${t("lights_sel", { n: S.selLights.size + 1 })}</div><button id="dv-merge">${t("merge_lights")}</button>` : ""}${where()}`;
    } else if (L === "devices" && (x.type === "icon" || x.type === "motion")) {
      sets.kind = (y, v) => { y.kind = v; };
      sets.value_entity = (y, v) => { if (v) y.value_entity = v; else delete y.value_entity; };
      sets.through_partitions = (y, v) => { if (v) y.through_partitions = true; else delete y.through_partitions; };
      for (const k of ["direction", "fov", "range"]) sets[k] = (y, v) => { y[k] = Number(v); };
      // a rack: what is in it, each with its own entity
      const items = x.kind === "rack" ? x.items || [] : null;
      if (items) items.forEach((it, k) => { sets["ri" + k] = (y, v) => { y.items[k].entity = v; }; });
      const rackList = items ? `<div class="sub-h">${t("rack_items")} · ${items.length}</div>` + (items.length ? `<div class="bulb-list">${items.map((it, k) =>
        `<div class="bulb-row rack-row"><span title="${esc(t("d_" + it.kind))}">${icon(devIcon(it.kind))}</span>` +
        `<input data-df="ri${k}" type="text" value="${esc(it.entity || "")}" placeholder="domain.object" title="${esc(t("d_" + it.kind))}">` +
        `<button data-rout="${k}" title="${t("rack_out")}">⇱</button><button data-rdel="${k}" class="danger" title="${t("rack_del")}">✕</button></div>`).join("")}</div>` : "") +
        `<div class="empty">${t("rack_hint")}</div>` : "";
      form = `<h3>${t(x.type === "motion" ? "d_motion" : "d_" + x.kind)}</h3>${id()}${ent()}
        ${x.type === "icon" && x.hit ? size() : ""}${rackList}
        ${x.type === "icon" ? (!NO_VALUE_KINDS.includes(x.kind) ? field(t("value_entity"), "value_entity", x.value_entity ?? "", "text", 'placeholder="sensor.…"') : "") : ""}
        ${x.type === "motion" ? field(t("direction"), "direction", x.direction, "number", 'step="5"') +
          field(t("fov"), "fov", x.fov, "number", 'min="10" max="360" step="5"') + field(t("range"), "range", x.range, "number", 'min="10"') +
          field(t("through_partitions"), "through_partitions", !!x.through_partitions, "check") +
          `<div class="empty">${t("cam_hint")}</div>` : ""}${where()}`;
    } else if (L === "devices") {
      if (x.type === "presence") {
        sets.through_partitions = (y, v) => { if (v) y.through_partitions = true; else delete y.through_partitions; };
        sets.has_range = (y, v) => { if (v) Object.assign(y, { direction: 90, fov: 120, range: 300 }); else { delete y.direction; delete y.fov; delete y.range; } };
        for (const k of ["direction", "fov", "range"]) sets[k] = (y, v) => { y[k] = Number(v); };
      }
      sets.beam = setBeam; sets.beam_dir = (y, v) => { y.beam_dir = Number(v); };
      if (x.type === "appliance") {
        sets.alert = (y, v) => { y.alert = v; };
        sets.snow = (y, v) => { if (v) y.icon = "snowflake"; else delete y.icon; };
        if (x.top) sets.top_entity = (y, v) => { y.top.entity = v; };
      }
      // a stack: the machine below (the device's own entity) and the one on top
      const stack = x.type === "appliance" && x.top;
      const ttl = x.type === "appliance" && x.kind ? (stack ? t("stack_of", { a: t("d_" + x.kind), b: t("d_" + x.top.kind) }) : t("d_" + x.kind)) : null;
      if (x.type === "skylight") sets.contact = (y, v) => { if (v) y.contact = v; else delete y.contact; };
      form = `<h3>${ttl || t({ presence: "d_presence", appliance: "d_appliance", tv: "d_tv", climate_unit: "d_ac", skylight: "d_skylight" }[x.type])}</h3>${id()}
        ${stack ? `<div class="sub-h">${t("stack_below", { what: t("d_" + x.kind) })}</div>${ent()}<div class="sub-h">${t("stack_on_top", { what: t("d_" + x.top.kind) })}</div>` +
          field(t("entity"), "top_entity", x.top.entity, "text", 'placeholder="domain.object"') + `<button id="dv-unstack">${t("unstack")}</button>` : ent()}
        ${x.type === "skylight" ? field(t("contact"), "contact", x.contact ?? "", "text", 'placeholder="binary_sensor.…"') : ""}
        ${x.type !== "presence" ? size() : ""}
        ${x.glow && x.type !== "tv" && x.type !== "climate_unit" ? field(t("beam"), "beam", x.beam ?? "", "number", 'min="10" max="360" step="15" placeholder="360"') : ""}
        ${x.type === "presence" ? field(t("has_range"), "has_range", !!x.range, "check") + (x.range ? field(t("direction"), "direction", x.direction, "number", 'step="5"') +
          field(t("fov"), "fov", x.fov, "number", 'min="10" max="360" step="5"') + field(t("range"), "range", x.range, "number", 'min="10"') +
          field(t("through_partitions"), "through_partitions", !!x.through_partitions, "check") : "") : ""}
        ${x.type === "appliance" ? field(t("alert"), "alert", x.alert, "check") + field(t("snowflake"), "snow", x.icon === "snowflake", "check") : ""}${where()}`;
    } else if (L === "climate") {
      sets.name = (y, v) => { if (v) y.name = v; else delete y.name; };
      sets.show_values = (y, v) => { if (v) delete y.display; else y.display = "icon"; };
      form = `<h3>${t("d_climate")}</h3>${id()}${ent("temperature", t("temperature"))}${ent("humidity", t("humidity"))}${field(t("label"), "name", x.name ?? "")}` +
        field(t("show_values"), "show_values", x.display !== "icon", "check");
    } else if (L === "cameras") {
      for (const k of ["direction", "fov", "range"]) sets[k] = (y, v) => { y[k] = Number(v); };
      sets.name = (y, v) => { y.name = v; };
      sets.off_plan = (y, v) => { if (v) y.off_plan = true; else delete y.off_plan; };
      form = `<h3>${t("d_camera")}</h3>${id()}${field(t("name"), "name", x.name)}${ent("entity", t("cam_low"))}${ent("entity_hq", t("cam_hq"))}
        ${ent("entity_2", t("cam_2"))}${ent("entity_2_hq", t("cam_2_hq"))}${ent("detect", t("cam_detect"))}
        ${field(t("direction"), "direction", x.direction, "number", 'step="5"')}${field(t("fov"), "fov", x.fov, "number", 'min="10" max="350" step="5"')}
        ${field(t("range"), "range", x.range, "number", 'min="10"')}${field(t("off_plan"), "off_plan", x.off_plan, "check")}
        <div class="empty">${t("cam_hint")}</div>`;
    } else if (L === "locks") {
      form = `<h3>${t("d_lock")}</h3>${id()}${ent()}`;
    } else if (L === "notes") {
      // text, a marker pin, an arrow (generator/notes.js)
      const opt = (k) => (y, v) => { if (v === "" || v === false) delete y[k]; else y[k] = v; };
      sets.size = (y, v) => { y.size = Math.max(4, Number(v) || 24); };
      sets.bold = opt("bold"); sets.note = opt("note"); sets.entity = opt("entity");
      sets.mtext = opt("text");
      sets.width = (y, v) => { if (v === "") delete y.width; else y.width = Number(v); };
      const area = (key, val, rows = 2) => `<div class="row"><span>${t(key === "note" ? "note_more" : "note_text")}</span><textarea data-nt="${key}" rows="${rows}">${esc(val ?? "")}</textarea></div>`;
      const color = () => `<div class="row"><span>${t("colour")}</span>${swatches("note", x.color, true)}</div>`;
      if (x.type === "text") {
        form = `<h3>${t("d_text")}</h3>${area("text", x.text, 2)}
          ${field(t("text_size"), "size", x.size ?? 24, "number", 'min="4" step="2"')}${field(t("bold"), "bold", x.bold, "check")}
          ${color()}${field(t("rotation"), "rot", x.rot ?? 0, "number", 'step="15"')}`;
        sets.rot = (y, v) => { if (Number(v)) y.rot = Number(v) % 360; else delete y.rot; };
      } else if (x.type === "marker") {
        form = `<h3>${t("d_marker")}</h3>
          <div class="tiles small">${Object.entries(MARKER_ICONS).map(([k, g]) =>
            `<button type="button" class="tile emo${x.icon === k ? " on" : ""}" data-pick="nt-icon" data-value="${k}" title="${esc(t("mk_" + k))}"><span class="ico">${g}</span><span>${t("mk_" + k)}</span></button>`).join("")}</div>
          ${field(t("note_caption"), "mtext", x.text ?? "")}${area("note", x.note, 3)}
          ${field(t("note_entity"), "entity", x.entity ?? "", "text", 'placeholder="domain.object"')}${color()}`;
      } else {
        form = `<h3>${t("d_arrow")}</h3>${color()}${field(t("line_width"), "width", x.width ?? "", "number", 'min="0.5" step="0.5" placeholder="1.6"')}`;
      }
      form += id();
    }
    if (rotatable(sd)) form += `<div class="row"><span>${t("turn")}</span><span class="turn">` +
      `<button id="dv-ccw" title="Shift+R">↺ 90°</button><button id="dv-cw" title="R">↻ 90°</button></span></div>`;
    form += `<button id="dv-del" class="danger">${t("delete_device")}</button>`;
  }
  box.innerHTML = form;
  box.querySelectorAll("textarea[data-nt]").forEach((ta) => {
    ta.onchange = () => editDevice((y) => { const v = ta.value.replace(/\s+$/, ""); if (v) y[ta.dataset.nt] = v; else if (ta.dataset.nt === "text" && y.type === "text") return t("note_empty"); else delete y[ta.dataset.nt]; });
  });
  if (sd && sd.list === "notes") wireSwatches(box, (k, c) => editDevice((y) => { if (c) y.color = c; else delete y.color; }));
  box.querySelectorAll("[data-df]").forEach((inp) => {
    inp.onchange = (e) => {
      const k = e.target.dataset.df, v = e.target.type === "checkbox" ? e.target.checked : e.target.value.trim();
      editDevice((y) => sets[k](y, v));
    };
  });
  if ($("dv-del")) $("dv-del").onclick = deleteDevice;
  if ($("dv-unstack")) $("dv-unstack").onclick = unstack;
  box.querySelectorAll("[data-rdel]").forEach((bt) => { bt.onclick = () => editDevice((y) => { y.items.splice(Number(bt.dataset.rdel), 1); }); });
  box.querySelectorAll("[data-rout]").forEach((bt) => { bt.onclick = () => rackOut(Number(bt.dataset.rout)); });
  if ($("dv-cw")) $("dv-cw").onclick = () => rotateSelected(90);
  if ($("dv-ccw")) $("dv-ccw").onclick = () => rotateSelected(-90);
  if ($("dv-addbulb")) $("dv-addbulb").onclick = () => {
    const i = S.selDev.i, kind = S.model.lights[i].kind;
    setTool("devices");
    S.dev = { type: kind, start: null }; S.addBulb = i; S.selDev = { list: "lights", i, bulb: 0 };
    $("st-msg").textContent = t("add_bulb_on");
    renderPanel(); renderOverlay();
  };
  if ($("dv-merge")) $("dv-merge").onclick = mergeLights;
  box.querySelectorAll("[data-bsel]").forEach((bt) => { bt.onclick = () => { S.selDev.bulb = Number(bt.dataset.bsel); renderPanel(); renderOverlay(); }; });
  box.querySelectorAll("[data-bdel]").forEach((bt) => { bt.onclick = () => {
    const k = Number(bt.dataset.bdel);
    editDevice((y) => { y.bulbs.splice(k, 1); });
    if (S.selDev) S.selDev.bulb = 0;
    renderPanel(); renderOverlay();
  }; });
  box.querySelectorAll("[data-bsplit]").forEach((bt) => { bt.onclick = () => splitBulb(Number(bt.dataset.bsplit)); });
  // a bulb out of the circuit: a light of its own (same kind, no entity yet)
  function splitBulb(k) {
    const before = snapshot(), d = S.selDev, l = S.model.lights[d.i];
    const [b] = l.bulbs.splice(k, 1);
    const nl = makeDevice(S.model, l.kind, [b[0], b[1]]).item;
    nl.bulbs = [[...b]];
    if (l.glow_r) nl.glow_r = l.glow_r;
    S.model.lights.push(nl);
    S.selDev = { list: "lights", i: S.model.lights.length - 1, bulb: 0 };
    $("st-msg").textContent = t("split_done");
    commit(before);
  }
  if ($("dv-bulb")) $("dv-bulb").onclick = () => { editDevice((y, d) => { y.bulbs.splice(d.bulb, 1); }); if (S.selDev) S.selDev.bulb = 0; renderPanel(); };
  if ($("dv-swap")) $("dv-swap").onclick = () => editDevice((y) => {
    resizeHit(y, y.hit[3], y.hit[2]);
    if (y.glow && y.glow.rx) y.glow = { ...y.glow, rx: y.glow.ry, ry: y.glow.rx };
  });
}
function renameDevice(list, x, v) {
  const id = v.trim();
  if (!id) return t("id_taken");
  if (id === x.id) return;
  const taken = [...(S.model.lights || []).flatMap((l) => [l.id, ...(l.circuits || []).map((c) => c.id)]),
    ...[...(S.model.devices || []), ...(S.model.cameras || []), ...(S.model.locks || [])].map((d) => d.id),
    ...(S.model.climate || []).map((c) => c.id), ...(S.model.notes || []).map((x) => x.id)];
  if (taken.includes(id)) return t("id_taken");
  if (list === "lights" && x.circuits) x.circuits.forEach((c, k) => { c.id = id + (k ? "-small" : "-large"); });
  if (list === "devices" && x.labels) x.labels.id = id + "-labels";
  x.id = id;
}

// --- underlay (an image to draw over) ---------------------------------------------------------------------------
const UNDER_STORE = "floorplan-editor.underlay";
const BELOW_STORE = "floorplan-editor.show-below";
function placeUnderlay() {
  const img = $("underlay"), u = S.underlay;
  stage.classList.toggle("has-underlay", !!u);
  if (!u) { img.hidden = true; return; }
  if (img.getAttribute("src") !== u.src) img.src = u.src;
  img.hidden = false;
  const vb = viewBoxCm(), s = S.view.s;
  img.style.opacity = u.opacity;
  img.style.transform = `translate(${(u.x - vb[0]) * s}px, ${(u.y - vb[1]) * s}px) scale(${u.scale * s})`;
}
function saveUnderlay() {
  try { if (S.underlay) localStorage.setItem(UNDER_STORE, JSON.stringify(S.underlay)); else localStorage.removeItem(UNDER_STORE); }
  catch { $("st-msg").textContent = t("underlay_big"); }
}
function setUnderlay(src) {
  const img = new Image();
  img.onload = () => {
    // first guess: the image as wide as the current view
    const vb = viewBoxCm();
    S.underlay = { src, x: vb[0] + vb[2] * 0.1, y: vb[1] + vb[3] * 0.1, scale: (vb[2] * 0.8) / img.naturalWidth, opacity: 0.6,
      w: img.naturalWidth, h: img.naturalHeight };
    saveUnderlay();
    setTool("calibrate");
    draw();
  };
  img.src = src;
}
function underlayPanel(box) {
  const u = S.underlay;
  box.innerHTML = `<button id="b-under">${t(u ? "underlay_replace" : "underlay_load")}</button>
    ${u ? `<div class="row"><span>${t("opacity")}</span><input id="ul-op" type="range" min="0.1" max="1" step="0.05" value="${u.opacity}"></div>
      <div class="row"><span>${t("cal_dist")}</span><label><input id="ul-dist" type="number" min="1" step="1" value="${S.cal && S.cal.dist || 500}"> cm</label></div>
      <div class="empty">${S.cal && S.cal.b ? t("cal_apply") : S.cal ? t("cal_second") : t("cal_hint")}</div>
      ${S.cal && S.cal.b ? `<button id="ul-apply">${t("cal_do")}</button>` : ""}
      <button id="ul-del" class="danger">${t("underlay_del")}</button>` : `<div class="empty">${t("underlay_none")}</div>`}`;
  $("b-under").onclick = () => $("f-under").click();
  if (!u) return;
  $("ul-op").oninput = (e) => { u.opacity = Number(e.target.value); placeUnderlay(); saveUnderlay(); };
  $("ul-dist").onchange = (e) => { S.cal = { ...(S.cal || {}), dist: Number(e.target.value) }; };
  if ($("ul-apply")) $("ul-apply").onclick = () => {
    // the two picked points must be `dist` cm apart: scale the image around the first one
    const { a, b } = S.cal, d = Number($("ul-dist").value);
    const L = len(sub(b, a));
    if (!(d > 0) || !L) return;
    const k = d / L;
    u.x = a[0] + (u.x - a[0]) * k; u.y = a[1] + (u.y - a[1]) * k; u.scale *= k;
    S.cal = { dist: d };
    saveUnderlay(); renderPanel(); draw();
  };
  $("ul-del").onclick = () => { S.underlay = null; S.cal = null; saveUnderlay(); setTool("select"); draw(); };
}

// --- Home Assistant ----------------------------------------------------------------------------------------------
function haStatus(text) { $("ha-status").textContent = text; }
// Suggestions from Home Assistant for entity fields: all entities, and lists of the kind a field takes
// (a cover field only covers, a contact only door / window sensors), by friendly name too (28.10)
const CONTACT_CLASSES = ["door", "window", "opening", "garage_door"];
const ENTITY_LISTS = {
  "ha-entities": () => true,
  "ha-ent-contact": (s) => s.entity_id.startsWith("binary_sensor.") && (CONTACT_CLASSES.includes(s.attributes?.device_class) || !s.attributes?.device_class),
};
function entityListFor(inp) {
  if (inp.dataset.contact !== undefined) return "ha-ent-contact";
  const m = /^([a-z_]+)\./.exec(inp.placeholder || "");
  return m ? "ha-ent-" + m[1] : "ha-entities";
}
function fillEntityList() {
  const all = [...ha.states.values()].sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  const lists = { ...ENTITY_LISTS };
  for (const s of all) { const d = s.entity_id.split(".")[0]; lists["ha-ent-" + d] ||= (x) => x.entity_id.startsWith(d + "."); }
  for (const [id, keep] of Object.entries(lists)) {
    let dl = document.getElementById(id);
    if (!dl) { dl = document.createElement("datalist"); dl.id = id; document.body.append(dl); }
    dl.replaceChildren(...all.filter(keep).map((s) => {
      const o = document.createElement("option");
      o.value = s.entity_id;
      o.label = s.attributes?.friendly_name || "";
      return o;
    }));
  }
}
ha.onChange = (id) => {
  if (id === null) { fillEntityList(); renderPanel(); }
  if (S.live && planSvg) applyStates(planSvg, ha.states, LOCALE);
};
ha.onStatus = (st) => {
  $("b-ha").classList.toggle("on", st === "connected");
  $("c-live").disabled = st !== "connected";
  if (st !== "connected" && planSvg) { clearStates(planSvg); }
};
async function haConnect(cfg) {
  haStatus(t("ha_connecting"));
  try {
    await ha.connect(cfg);
    AREAS = null; // another Home Assistant: its own areas
    haStatus(t("ha_ok", { n: ha.states.size }));
    $("st-msg").textContent = t("ha_ok", { n: ha.states.size });
    return true;
  } catch (e) { haStatus(t("ha_fail") + e.message); return false; }
}
$("b-ha").onclick = () => {
  const c = HaConnection.saved() || {};
  $("ha-url").value = c.url || (location.port === "" || location.pathname.startsWith("/local/") ? location.origin : "");
  $("ha-token").value = c.token || "";
  $("ha-dialog").showModal();
};
$("ha-connect").onclick = async (e) => {
  e.preventDefault();
  const cfg = { url: $("ha-url").value.trim(), token: $("ha-token").value.trim() };
  if (await haConnect(cfg)) { HaConnection.save(cfg); $("ha-dialog").close(); }
};
$("ha-forget").onclick = () => { HaConnection.save(null); ha.close(); haStatus(""); $("c-live").checked = false; S.live = false; };
$("c-live").onchange = (e) => {
  S.live = e.target.checked;
  if (!planSvg) return;
  if (S.live) applyStates(planSvg, ha.states, LOCALE); else clearStates(planSvg);
};
// A PDF (an architect's drawing): one page drawn into a picture by pdf.js, loaded from the CDN the first time
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
async function pdfToImage(file) {
  const lib = await import(/* @vite-ignore */ PDFJS + "pdf.min.mjs");
  lib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs";
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let no = 1;
  if (pdf.numPages > 1) {
    const a = Number(window.prompt(t("pdf_page", { n: pdf.numPages }), "1"));
    if (!a) return null;
    no = Math.min(pdf.numPages, Math.max(1, Math.round(a)));
  }
  const page = await pdf.getPage(no);
  const v1 = page.getViewport({ scale: 1 });
  // about 3500 px on the longer side: lines sharp when zoomed in, the picture still fits the browser's storage
  const view = page.getViewport({ scale: 3500 / Math.max(v1.width, v1.height) });
  const c = document.createElement("canvas");
  c.width = Math.round(view.width); c.height = Math.round(view.height);
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: g, viewport: view }).promise;
  return c.toDataURL("image/jpeg", 0.85);
}
$("f-under").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
    e.target.value = "";
    $("st-msg").textContent = t("pdf_loading");
    try {
      const src = await pdfToImage(f);
      $("st-msg").textContent = "";
      if (src) setUnderlay(src);
    } catch (err) { $("st-msg").textContent = t("pdf_error") + (err && err.message || err); }
    return;
  }
  const r = new FileReader();
  r.onload = () => setUnderlay(r.result);
  r.readAsDataURL(f);
  e.target.value = "";
};

// --- pointer ---------------------------------------------------------------------------------------------------
let lastClick = 0;
// A click of a drawing tool (wall, shape, opening, divide, devices, rooms) at p.
function toolClick(p, shift) {
  if (S.tool === "furniture" && S.furn.kind === "_draw" && !S.furn.copy) { sketchClick(shift ? p : snapGrid(p)); return; }
  if (S.tool === "furniture") {
    // the piece in hand stands where it was shown; then Select, with it selected (the next one: picked again in the palette)
    const before = snapshot();
    const piece = furnitureGhost(shift ? p : snapGrid(p), shift);
    if (!piece) return;
    const old = piece.id;
    piece.id = uniquePieceId(S.model, piece.kind);
    if (piece.svg && old) piece.svg = piece.svg.split(`id="${old}"`).join(`id="${piece.id}"`);
    placePiece(S.model, piece);
    (S.model.furniture = S.model.furniture || []).push(piece);
    const i = S.model.furniture.length - 1;
    setTool("select");
    clearSel(); S.selFurn = i;
    commit(before);
    return;
  }
  if (S.tool === "shape") {
    if (placeShape(snapPoint(p, { free: shift }).p)) setTool("select");
    return;
  }
  if (S.tool === "garden") { gardenClick(snapPoint(p, { free: shift }).p); return; }
  if (S.tool === "devices") {
    const q = S.dev.start && S.snap ? S.snap.p : snapPoint(p, { free: shift && !selDevice() }).p;
    placeDevice(q, shift);
    return;
  }
  if (S.tool === "divide") {
    const q = snapPoint(p, { from: S.div.start, free: shift }).p;
    if (!S.div.start) { S.div.start = q; renderOverlay(); return; }
    if (len(sub(q, S.div.start)) >= MIN_LEN) {
      const before = snapshot();
      const line = { a: rp(S.div.start), b: rp(q) };
      if (S.div.blocks) line.blocks_light = true;
      (S.model.dividers = S.model.dividers || []).push(line);
      S.div.start = null;
      commit(before);
    }
    return;
  }
  if (S.tool === "rooms") {
    const i = roomIndexAt(p);
    if (i !== null) { clearSel(); S.selRoom = i; renderPanel(); renderOverlay(); }
    else addRoomAt(snapGrid(p));
    return;
  }
  if (S.tool === "opening") {
    placeOpening(openingCandidate(p));
    S.opCand = openingCandidate(p);
    renderOverlay();
    return;
  }
  if (S.tool === "wall") {
    const now = Date.now();
    if (now - lastClick < 300 && S.draw) { lastClick = 0; endChain(); return; }
    lastClick = now;
    const sn = snapPoint(p, { from: S.draw && S.draw.start, free: shift });
    placePoint(sn.p);
    S.snap = snapPoint(p, { from: S.draw && S.draw.start, free: shift });
    renderOverlay();
    return;
  }
}
// --- touch: two fingers pinch to zoom and move the view; a second finger cancels what the first one began
const touches = new Map(); // pointerId -> [clientX, clientY]
let pinch = null;          // {dist, mid, view} at the moment the second finger came down
function twoFingers() {
  const [a, b] = [...touches.values()];
  return { dist: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
}
function startPinch() {
  const d = S.drag;
  S.drag = null;
  // the first finger may already have moved something: put the model back as it was
  if (d && d.before) { S.model = JSON.parse(d.before); renderPlan(); }
  // ... and whatever it selected
  if (selAtFirstFinger) { Object.assign(S, selAtFirstFinger); renderPanel(); }
  stage.classList.add("panning");
  pinch = { ...twoFingers(), view: { ...S.view } };
  renderOverlay();
}
function movePinch() {
  const { dist, mid } = twoFingers(), v = pinch.view, r = stage.getBoundingClientRect();
  // the model point under the fingers' first middle stays under their middle now
  const m0 = [v.cx + (pinch.mid[0] - r.left - r.width / 2) / v.s, v.cy + (pinch.mid[1] - r.top - r.height / 2) / v.s];
  const s = Math.max(0.05, Math.min(20, (v.s * dist) / pinch.dist));
  S.view = { cx: m0[0] - (mid[0] - r.left - r.width / 2) / s, cy: m0[1] - (mid[1] - r.top - r.height / 2) / s, s };
  draw();
}
function pointerEnd(ev) {
  // a busy frame can hold back the last moves of a drag (moves are coalesced per frame): the release's own
  // position is where the drag ends
  if (S.drag && S.drag.moved && !pinch && ev.type === "pointerup" && Number.isFinite(ev.clientX)) pointerMove(ev);
  if (ev.pointerType === "touch") touches.delete(ev.pointerId);
  if (pinch) {
    if (touches.size >= 2) return;
    pinch = null;
    stage.classList.remove("panning");
    // the finger left on the screen carries on moving the view (no click when it lifts)
    const rest = [...touches.values()][0];
    S.drag = rest ? { kind: "pan", x: rest[0], y: rest[1], view: { ...S.view } } : null;
    return;
  }
  endDrag();
}

overlay.addEventListener("pointerdown", (ev) => {
  if (ev.pointerType === "touch") {
    touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
    overlay.setPointerCapture(ev.pointerId);
    if (touches.size === 2) { startPinch(); return; }
    if (touches.size > 2) return;
  }
  if (pinch) return;
  const p = toModel(ev);
  overlay.setPointerCapture(ev.pointerId);
  if (ev.button === 1 || (ev.button === 0 && spaceDown)) {
    S.drag = { kind: "pan", x: ev.clientX, y: ev.clientY, view: { ...S.view } };
    stage.classList.add("panning");
    return;
  }
  if (ev.button === 2) { if (S.draw) endChain(); return; }
  // the round turn handle of what is selected
  const rt = S.tool === "select" && rotTarget();
  if (rt && len(sub(p, rotPos(rt))) <= 9 / S.view.s) {
    S.drag = { kind: "rot", before: snapshot(), moved: false };
    return;
  }
  if (S.tool === "calibrate" && S.underlay) {
    S.drag = { kind: "underlay", x: ev.clientX, y: ev.clientY, at: p, from: [S.underlay.x, S.underlay.y], click: true };
    return;
  }
  // the selected device's size handles (Select and Devices tools)
  const sdh = (S.tool === "select" || S.tool === "devices") && !S.dev.start && selDevice();
  if (devResizable(sdh)) {
    const h = hitHandles(sdh.x.hit).find((q) => len(sub(p, q.p)) <= 8 / S.view.s);
    if (h) { S.drag = { kind: "devSize", sx: h.sx, sy: h.sy, base: [...sdh.x.hit], before: snapshot(), moved: false }; return; }
  }
  // Devices: a press on one already placed grabs it - no switching to Select to move what was just put down
  // (a click on empty floor still places a new one; Shift keeps its meaning there)
  if (S.tool === "devices" && !S.dev.start && !ev.shiftKey) {
    const dv = deviceAt(p);
    // (a washer / a dryer on the other one is put on top of it instead)
    if (dv && !stackTarget(S.model, p, S.dev.type) && !rackTarget(S.model, p, S.dev.type)) {
      clearSel();
      S.selDev = { list: dv.list, i: dv.i, bulb: dv.bulb };
      S.drag = { kind: "device", before: snapshot(), moved: false, x: ev.clientX, y: ev.clientY };
      renderPanel(); renderOverlay();
      return;
    }
  }
  // drawing tools act on a click; a drag pans the view, as on empty space with Select
  if (S.tool !== "select" && S.tool !== "calibrate") {
    S.drag = { kind: "pan", x: ev.clientX, y: ev.clientY, view: { ...S.view }, at: p, click: true, tool: { p, shift: ev.shiftKey } };
    return;
  }
  // select tool: the selected piece's resize handles
  const sp = S.selFurn !== null && selPieces().length === 1 && (S.model.furniture || [])[S.selFurn];
  if (sp && sp.kind !== "custom") {
    const h = pieceHandles(sp).find((q) => len(sub(p, q.p)) <= 8 / S.view.s);
    if (h) { S.drag = { kind: "furnSize", sx: h.sx, sy: h.sy, base: JSON.parse(JSON.stringify(sp)), before: snapshot(), moved: false }; return; }
  }
  // a selected camera's handles, then devices (small, on top)
  const sdv = selDevice();
  if (sdv && (sdv.list === "cameras" || sdv.x.range)) {
    const h = cameraHandles(sdv.x).find((q) => len(sub(p, q.p)) <= 10 / S.view.s);
    if (h) { S.drag = { kind: "camera", handle: h.kind, before: snapshot(), moved: false }; return; }
  }
  // the selected rail: a corner changes its shape; the rail itself (not a bulb) moves it whole
  if (sdv && sdv.list === "lights" && sdv.x.rail) {
    const r = 8 / S.view.s, rail = sdv.x.rail;
    const k = rail.findIndex((q) => len(sub(q, p)) <= r);
    if (k >= 0) { S.drag = { kind: "railPt", k, before: snapshot(), moved: false }; return; }
    if (!deviceAt(p) && len(sub(onPolyline(rail, p), p)) <= r) {
      S.drag = { kind: "railMove", start: p, base: JSON.parse(JSON.stringify(sdv.x)), before: snapshot(), moved: false };
      return;
    }
  }
  const dv0 = deviceAt(p);
  // Shift + click on another light while one is selected: both selected (to merge them into one circuit)
  if (dv0 && ev.shiftKey && dv0.list === "lights" && sdv && sdv.list === "lights" && dv0.i !== sdv.i && MERGE_KINDS.includes(S.model.lights[dv0.i].kind)) {
    S.selLights = S.selLights || new Set();
    if (S.selLights.has(dv0.i)) S.selLights.delete(dv0.i); else S.selLights.add(dv0.i);
    renderPanel(); renderOverlay();
    return;
  }
  if (dv0) {
    clearSel();
    S.selDev = { list: dv0.list, i: dv0.i, bulb: dv0.bulb };
    S.drag = { kind: "device", before: snapshot(), moved: false, x: ev.clientX, y: ev.clientY,
    };
    renderPanel(); renderOverlay();
    return;
  }
  // the selected room's label handle
  const sr = S.selRoom !== null && S.model.rooms[S.selRoom];
  if (sr) {
    const a = roomAnchor(sr), fs = 12 / S.view.s;
    if (a && len(sub(p, [a[0], a[1] - fs * 1.1])) <= 10 / S.view.s) {
      S.drag = { kind: "roomLabel", before: snapshot(), moved: false, area: roomPoly(sr) && polyArea(roomPoly(sr)) };
      return;
    }
  }
  const node = nodeAt(p);
  if (node) {
    S.drag = { kind: "node", from: node, cur: node, before: snapshot(), base: JSON.parse(snapshot()) };
    return;
  }
  const hit = openingAt(S.model, p, 3 / S.view.s);
  if (hit) {
    const wi = S.model.walls.indexOf(hit.wall);
    clearSel();
    S.selOp = { w: wi, o: hit.wall.openings.indexOf(hit.opening) };
    const { u } = frame(hit.wall);
    S.drag = { kind: "opening", wi, oi: S.selOp.o, grab: dot(sub(p, hit.wall.a), u) - hit.opening.from,
      before: snapshot(), moved: false, x: ev.clientX, y: ev.clientY };
    renderPanel(); renderOverlay();
    return;
  }
  const dv = dividerAt(p);
  if (dv !== null) {
    clearSel(); S.selDiv = dv;
    S.drag = { kind: "divider", i: dv, start: p, before: snapshot(), base: JSON.parse(snapshot()), moved: false };
    renderPanel(); renderOverlay();
    return;
  }
  const w = wallAt(p);
  if (w !== null) {
    clearSel();
    S.sel = w;
    S.drag = { kind: "wall", i: w, start: p, before: snapshot(), base: JSON.parse(snapshot()), moved: false };
    renderPanel(); renderOverlay();
    return;
  }
  const fi = pieceAt(S.model, p);
  if (fi >= 0 && (ev.ctrlKey || ev.metaKey)) {
    // Ctrl / Cmd + click: a copy of the piece in hand, put down with a click (as one from the palette)
    const src = S.model.furniture[fi], copy = JSON.parse(JSON.stringify(src));
    delete copy.group;
    setTool("furniture");
    S.furn.copy = copy; S.furn.copyGrab = sub(p, src.at);
    S.furnGhost = furnitureGhost(p, false);
    renderOverlay();
    return;
  }
  if (fi >= 0) {
    const cur = selPieces();
    if (ev.shiftKey && cur.length) {
      // Shift + click: add the piece (and its group) to the selection, or take it out
      if (cur.includes(fi)) {
        const g = S.model.furniture[fi].group;
        const keep = cur.filter((i) => i !== fi && !(g && S.model.furniture[i].group === g));
        selectPieces(keep);
      } else { S.selMore.add(fi); }
      renderPanel(); renderOverlay();
      return;
    }
    if (!cur.includes(fi)) { clearSel(); S.selFurn = fi; }
    const f = S.model.furniture[S.selFurn];
    S.drag = { kind: "furniture", grab: sub(p, f.at), before: snapshot(), moved: false, x: ev.clientX, y: ev.clientY,
      from: selPieces().map((i) => [i, [...S.model.furniture[i].at]]) };
    renderPanel(); renderOverlay();
    return;
  }
  // the selected garden item: drag a corner, or the whole item
  const sg = S.selGarden !== null && (S.model.garden || [])[S.selGarden];
  if (sg) {
    const list = sg.points || sg.line;
    const k = list ? list.findIndex((q) => len(sub(p, q)) <= 8 / S.view.s) : -1;
    if (k >= 0 || gardenAt(p) === S.selGarden) {
      S.drag = { kind: "garden", corner: k, start: p, base: JSON.parse(JSON.stringify(sg)), before: snapshot(), moved: false };
      return;
    }
  }
  // empty space: a drag pans, a click (no movement) selects the room there
  S.drag = { kind: "pan", x: ev.clientX, y: ev.clientY, view: { ...S.view }, at: p, click: true };
  stage.classList.add("panning");
});
// A finger is not a mouse: on a phone most of the plan is covered by things, so one finger moves the view
// and a tap selects; only something already selected moves under the finger (a wall end: when its wall is).
let selBeforeTouch = null;
const selKey = () => JSON.stringify([S.sel, S.selFurn, [...(S.selMore || [])], S.selDev, S.selOp, S.selDiv, S.selRoom]);
let selAtFirstFinger = null; // the selection before the first finger, back when it turns out to be a pinch
stage.addEventListener("pointerdown", (ev) => {
  selBeforeTouch = ev.pointerType === "touch" ? selKey() : null;
  if (ev.pointerType === "touch" && !touches.size)
    selAtFirstFinger = { sel: S.sel, selFurn: S.selFurn, selMore: new Set(S.selMore || []), selDev: S.selDev, selOp: S.selOp, selDiv: S.selDiv, selRoom: S.selRoom };
}, true);
overlay.addEventListener("pointerdown", (ev) => {
  const d = S.drag;
  if (ev.pointerType !== "touch" || pinch || !d || selBeforeTouch === null) return;
  const moving = ["device", "opening", "divider", "wall", "furniture", "node"].includes(d.kind);
  if (!moving) return;
  const w = S.sel !== null && S.model.walls[S.sel];
  const allowed = d.kind === "node" ? !!w && (same(w.a, d.from) || same(w.b, d.from)) : selKey() === selBeforeTouch;
  if (!allowed) S.drag = { kind: "pan", x: ev.clientX, y: ev.clientY, view: { ...S.view } };
});
overlay.addEventListener("pointermove", (ev) => pointerMove(ev));
function pointerMove(ev) {
  if (ev.pointerType === "touch" && touches.has(ev.pointerId)) touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
  if (pinch) { movePinch(); return; }
  const p = toModel(ev);
  S.cursor = p;
  $("st-pos").textContent = `x ${fmt(p[0])} cm · y ${fmt(p[1])} cm`;
  const d = S.drag;
  if (d && d.kind === "underlay") {
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4) { d.click = false; stage.classList.add("panning"); }
    if (d.click && d.tool) return; // a drawing tool's click until it moves
    if (!d.click) { S.underlay.x = d.from[0] + (p[0] - d.at[0]); S.underlay.y = d.from[1] + (p[1] - d.at[1]); placeUnderlay(); }
    return;
  }
  if (d && d.kind === "devSize") {
    const x = selDevice().x;
    dragHit(x, d.base, d.sx, d.sy, p, ev.shiftKey ? (v) => v : (v) => Math.round(v));
    d.moved = true;
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "furnSize") {
    const f = S.model.furniture[S.selFurn], step = snapStep();
    resizeTo(f, d.base, d.sx, d.sy, p, ev.shiftKey ? (v) => v : (v) => Math.round(v / step) * step);
    placePiece(S.model, f);
    d.moved = true;
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "furniture") {
    if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 4) return;
    d.moved = true;
    const f = S.model.furniture[S.selFurn], q = sub(p, d.grab);
    // Alt: back against the nearest wall (one piece); Shift: no snapping. The others move along.
    const start = d.from.find(([i]) => i === S.selFurn)[1];
    if (ev.altKey && f.kind !== "custom" && d.from.length === 1) backToWall(S.model, f, q);
    else f.at = ev.shiftKey ? rp(q) : snapGrid(q);
    const dv = sub(f.at, start);
    for (const [i, a0] of d.from) {
      const g = S.model.furniture[i];
      if (i !== S.selFurn) g.at = rp([a0[0] + dv[0], a0[1] + dv[1]]);
    }
    // flush against a wall it nearly touches (Shift: free, Alt: back to the wall already)
    S.guides = [];
    if (!ev.shiftKey && !ev.altKey) {
      const idx = d.from.map(([i]) => i);
      const [sx, sy, guides] = snapBox(piecesBox(idx), new Set(idx.map((i) => S.model.furniture[i])));
      if (sx || sy) for (const [i] of d.from) { const g = S.model.furniture[i]; g.at = rp([g.at[0] + sx, g.at[1] + sy]); }
      S.guides = guides;
    }
    for (const [i] of d.from) placePiece(S.model, S.model.furniture[i]);
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "garden") {
    const g = S.model.garden[S.selGarden], b = d.base, q = ev.shiftKey ? rp(p) : snapGrid(p);
    if (!d.moved && len(sub(p, d.start)) * S.view.s < 4) return;
    d.moved = true;
    if (d.corner >= 0) (g.points || g.line)[d.corner] = q;
    else {
      const dv = sub(q, snapGrid(d.start));
      const mv = (a) => rp(add(a, dv));
      if (b.points) g.points = b.points.map(mv);
      if (b.line) g.line = b.line.map(mv);
      if (b.at) g.at = mv(b.at);
    }
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "rot") {
    const rt = rotTarget();
    if (!rt) return;
    let a = (Math.atan2(p[0] - rt.c[0], -(p[1] - rt.c[1])) * 180) / Math.PI;
    if (!ev.shiftKey) a = Math.round(a / 15) * 15;
    rt.set(Math.round(((a % 360) + 360) % 360));
    d.moved = true;
    renderPlan(); renderOverlay(); renderPanel();
    return;
  }
  if (d && (d.kind === "railPt" || d.kind === "railMove")) {
    const l = selDevice().x;
    if (d.kind === "railPt") {
      l.rail[d.k] = ev.shiftKey ? rp(p) : snapGrid(p);
    } else {
      const dl = sub(ev.shiftKey ? p : snapGrid(p), snapGrid(d.start));
      l.rail = d.base.rail.map((q) => rp(add(q, dl)));
      l.bulbs = d.base.bulbs.map((b) => [...rp(add(b, dl)), ...b.slice(2)]);
    }
    // its bulbs stay on it
    if (d.kind === "railPt") l.bulbs = l.bulbs.map((b) => onPolyline(l.rail, b));
    d.moved = true;
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "device") {
    if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 4) return;
    d.moved = true;
    const sd = selDevice();
    const x = sd.x;
    if (ev.altKey && x.hit && sd.list === "devices" && devResizable(sd)) {
      // Alt: its back to the nearest wall, against its face
      backDeviceToWall(S.model, x, p);
    } else {
      moveTo(S.model, sd.list, x, ev.shiftKey ? rp(p) : snapGrid(p), sd.bulb);
      // flush with a wall it nearly touches (Shift: free)
      if (!ev.shiftKey && x.hit && sd.list === "devices") {
        const h = x.hit, [sx, sy] = boxWallSnap([h[0], h[1], h[0] + h[2], h[1] + h[3]]);
        if (sx || sy) moveTo(S.model, sd.list, x, add(anchor(sd.list, x), [sx, sy]), sd.bulb);
      }
    }
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "camera") {
    const c = selDevice().x, v = sub(p, c.at);
    const ang = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    if (d.handle === "dir") { c.direction = Math.round(ang); c.range = Math.max(10, Math.round(len(v))); }
    else { let diff = Math.abs(((ang - c.direction + 540) % 360) - 180); c.fov = Math.max(10, Math.min(350, Math.round(diff * 2))); }
    d.moved = true;
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "roomLabel") {
    const r = S.model.rooms[S.selRoom], fs = 12 / S.view.s;
    const q = rp(snapGrid([p[0], p[1] + fs * 1.1]));
    // the label may move only inside its own room
    if (r.points) { if (pointInPolygon(q, r.points)) { r.label = q; d.moved = true; } }
    else { const f = faceAt(S.model, q); if (f && Math.abs(f.area - (faceAt(S.model, r.at)?.area ?? -1)) < 1 && pointInPolygon(q, f.pts)) { r.at = q; d.moved = true; } }
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "pan") {
    if (Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 4) { d.click = false; stage.classList.add("panning"); }
    if (d.click && d.tool) return; // a drawing tool's click until it moves
    S.view = { ...d.view, cx: d.view.cx - (ev.clientX - d.x) / d.view.s, cy: d.view.cy - (ev.clientY - d.y) / d.view.s };
    draw();
    return;
  }
  if (d && d.kind === "node") {
    S.model = JSON.parse(JSON.stringify(d.base)); // snap against the walls as they were, not the last frame
    const sn = snapPoint(p, { free: ev.shiftKey, exceptNode: d.from });
    moveNode(d.from, sn.p);
    d.cur = sn.p;
    $("st-snap").textContent = snapLabel(sn.kind);
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "opening") {
    if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 4) return;
    d.moved = true;
    const w = S.model.walls[d.wi], o = w.openings[d.oi];
    const width = o.to - o.from;
    const f = fitOpening(S.model, w, dot(sub(p, w.a), frame(w).u) - d.grab + width / 2, width, ev.shiftKey ? 0 : snapStep(), o, o.type);
    if (f && f.from !== o.from) { shiftOpening(o, f.from); renderPlan(); renderOverlay(); }
    return;
  }
  if (d && d.kind === "divider") {
    let delta = sub(p, d.start);
    if (!d.moved && len(delta) * S.view.s < 4) return;
    d.moved = true;
    if (!ev.shiftKey) delta = snapGrid(delta);
    // across itself only - its ends slide along the walls it rests on
    const b0 = d.base.dividers[d.i], u0 = sub(b0.b, b0.a), L0 = len(u0) || 1, n0 = [-u0[1] / L0, u0[0] / L0];
    const shift = mul(n0, dot(delta, n0));
    S.model = JSON.parse(JSON.stringify(d.base));
    S.model.dividers[d.i] = { ...b0, a: rp(add(b0.a, shift)), b: rp(add(b0.b, shift)) };
    renderPlan(); renderOverlay();
    return;
  }
  if (d && d.kind === "wall") {
    let delta = sub(p, d.start);
    if (!d.moved && len(delta) * S.view.s < 4) return;
    d.moved = true;
    if (!ev.shiftKey) delta = snapGrid(delta);
    moveWall(d.i, delta, d.base);
    renderPlan(); renderOverlay();
    return;
  }
  if (S.tool === "opening") {
    S.opCand = openingCandidate(p);
    $("st-snap").textContent = S.opCand && !S.opCand.fit ? t("no_fit") : "";
  } else if (S.tool === "devices") {
    // Shift: free (but Shift + click by a selected light adds a bulb to it)
    const sdl = selDevice();
    S.snap = snapPoint(p, { free: ev.shiftKey && !(sdl && sdl.list === "lights") });
    const gh = deviceGhost(S.snap.p, ev.shiftKey);
    if (JSON.stringify(gh) !== JSON.stringify(S.devGhost)) { S.devGhost = gh; renderPlan(); }
    if (TWO_POINT.includes(S.dev.type) && S.dev.start) {
      // rails and strips run straight: snap the end to the start's row or column (strips) / 45 degrees (rails)
      S.snap = snapPoint(p, { from: S.dev.start, free: false });
      if (S.dev.type === "strip") {
        const q = S.snap.p, a = S.dev.start;
        S.snap.p = Math.abs(q[0] - a[0]) >= Math.abs(q[1] - a[1]) ? [q[0], a[1]] : [a[0], q[1]];
      }
    }
    $("st-snap").textContent = snapLabel(S.snap.kind);
  } else if (S.tool === "furniture" && (S.furn.kind !== "_draw" || S.furn.copy)) {
    S.furnGhost = furnitureGhost(ev.shiftKey ? p : snapGrid(p), ev.shiftKey);
  } else if (S.tool === "garden") {
    S.snap = snapPoint(p, { free: ev.shiftKey });
    $("st-snap").textContent = snapLabel(S.snap.kind);
  } else if (S.tool === "divide") {
    S.snap = snapPoint(p, { from: S.div.start, free: ev.shiftKey });
    $("st-snap").textContent = snapLabel(S.snap.kind);
  } else if (S.tool === "rooms") {
    const f = roomIndexAt(p) === null ? faceAt(S.model, p) : null;
    S.roomHover = f ? inset(f) : null;
    $("st-snap").textContent = f ? m2(polyArea(S.roomHover)) + " m²" : roomIndexAt(p) === null ? t("not_enclosed") : "";
  } else if (S.tool === "shape") {
    S.snap = snapPoint(p, { free: ev.shiftKey });
    $("st-snap").textContent = snapLabel(S.snap.kind);
    setGhost(shapeAt(S.snap.p));
  } else if (S.tool === "wall") {
    S.snap = snapPoint(p, { from: S.draw && S.draw.start, free: ev.shiftKey });
    $("st-snap").textContent = snapLabel(S.snap.kind);
    setGhost(S.draw && len(sub(S.snap.p, S.draw.start)) >= MIN_LEN ? [[S.draw.start, S.snap.p]] : null);
  } else {
    const node = nodeAt(p);
    const w = node ? null : wallAt(p);
    S.hover = node ? { kind: "node", p: node } : w !== null ? { kind: "wall", i: w } : null;
  }
  renderOverlay();
}
function endDrag() {
  const d = S.drag;
  S.drag = null;
  stage.classList.remove("panning");
  if (!d) return;
  if (d.kind === "underlay") {
    if (d.click) {
      // a click picks a calibration point (two: a known distance apart)
      const q = rp(d.at);
      if (!S.cal || !S.cal.a || S.cal.b) S.cal = { dist: S.cal && S.cal.dist, a: q }; else S.cal.b = q;
      renderPanel(); renderOverlay();
    } else saveUnderlay();
    return;
  }
  if (d.kind === "pan" && d.click && d.tool) { toolClick(d.tool.p, d.tool.shift); return; }
  if (d.kind === "pan" && d.click) {
    clearSel();
    S.selRoom = roomIndexAt(d.at);
    if (S.selRoom === null) S.selGarden = gardenAt(d.at); // outside the house: the garden
    renderPanel(); renderOverlay();
    return;
  }
  if ((d.kind === "node" && !same(d.cur, d.from)) || (d.kind === "wall" && d.moved)) merged();
  if ((d.kind === "node" && !same(d.cur, d.from)) || ((d.kind === "wall" || d.kind === "divider" || d.kind === "opening" || d.kind === "roomLabel" || d.kind === "device" || d.kind === "camera" || d.kind === "furniture" || d.kind === "furnSize" || d.kind === "devSize" || d.kind === "garden" || d.kind === "railPt" || d.kind === "railMove" || d.kind === "rot") && d.moved)) commit(d.before);
  else if (d.kind === "node" || d.kind === "wall") { S.model = JSON.parse(d.before); renderPlan(); renderOverlay(); }
}
overlay.addEventListener("pointerup", pointerEnd);
overlay.addEventListener("pointercancel", pointerEnd);
// the device in hand leaves with the cursor
overlay.addEventListener("pointerleave", () => { if (S.devGhost) { S.devGhost = null; renderPlan(); } });
overlay.addEventListener("contextmenu", (ev) => ev.preventDefault());
overlay.addEventListener("wheel", (ev) => { ev.preventDefault(); zoomAt(ev, Math.exp(-ev.deltaY * 0.0015)); }, { passive: false });

// --- keyboard ---------------------------------------------------------------------------------------------------------
let spaceDown = false;
window.addEventListener("keydown", (ev) => {
  if (ev.target.closest && ev.target.closest("input, select")) return;
  const k = ev.key;
  if ((ev.ctrlKey || ev.metaKey) && k.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
  if ((ev.ctrlKey || ev.metaKey) && k.toLowerCase() === "y") { ev.preventDefault(); redo(); return; }
  if (k === " ") { spaceDown = true; return; }
  if (S.tool === "wall" && S.draw && /^[0-9.,]$/.test(k)) { S.typed += k; showTyped(); return; }
  if (S.tool === "wall" && S.typed && k === "Backspace") { S.typed = S.typed.slice(0, -1); showTyped(); return; }
  if (k === "Enter" && S.typed) { typedCommit(); renderOverlay(); return; }
  if (S.tool === "furniture" && S.furn.kind === "_draw") {
    if (k === "Enter" && S.sketch.pts.length >= 3) { sketchClosePoly(); return; }
    if (k === "Escape" && (S.sketch.start || S.sketch.pts.length)) { S.sketch.start = null; S.sketch.pts = []; renderOverlay(); return; }
  }
  if (k === "Escape" && S.tool === "furniture" && S.furnGhost) { setTool("select"); return; }
  if (k === "Escape" && S.tool === "devices" && S.addBulb !== null && S.addBulb !== undefined) { const i = S.addBulb; setTool("select"); S.selDev = { list: "lights", i, bulb: 0 }; $("st-msg").textContent = ""; renderPanel(); renderOverlay(); return; }
  if ((k === "Enter" || k === "Escape") && S.tool === "devices" && S.dev.pts && S.dev.pts.length) { finishRail(); return; }
  if (k === "Escape" && S.tool === "devices" && S.dev.start) { S.dev.start = null; renderOverlay(); return; }
  if (k === "Escape" && S.tool === "divide" && S.div.start) { S.div.start = null; renderOverlay(); return; }
  if (k === "Escape" && ["shape", "opening", "rooms", "devices", "calibrate", "divide", "furniture"].includes(S.tool)) { setTool("select"); return; }
  if (k === "r" || k === "R") {
    if (S.tool === "furniture" && S.furnGhost) {
      // the piece in hand: R / Shift+R turns it by 90 degrees
      const d = ev.shiftKey ? -90 : 90;
      if (S.furn.copy) S.furn.copy.rot = ((S.furn.copy.rot || 0) + d + 360) % 360;
      else S.furn.turn = ((S.furnGhost.rot || 0) + d + 360) % 360;
      S.furnGhost = furnitureGhost(S.furn.lastP, S.furn.lastShift);
      renderOverlay();
      return;
    }
    if (S.tool === "devices" && S.devGhost && S.devGhost.stack === undefined && S.devGhost.rack === undefined) {
      // the device in hand: R / Shift+R turns it (it stays turned for the next ones)
      // (the first R starts from how it stands now - its back to a wall, if any)
      const now = S.dev.turn ?? (((S.devGhost.item.beam_dir ?? 180) - 180 + 360) % 360);
      S.dev.turn = (now + (ev.shiftKey ? -90 : 90) + 360) % 360;
      S.devGhost = deviceGhost(S.snap.p, ev.shiftKey);
      renderPlan(); renderOverlay();
      return;
    }
    if (S.tool === "opening") { S.opening.hinge = S.opening.hinge === "to" ? "from" : "to"; renderOverlay(); return; }
    const so = selOpening();
    if (so && DOOR_TYPES.includes(so.o.type)) { editOpening((w, o) => { o.hinge = o.hinge === "to" ? "from" : "to"; }); return; }
    if (rotateSelected(ev.shiftKey ? -90 : 90)) return;
    if (S.selFurn !== null && S.model.furniture[S.selFurn]) { turnPiece(ev.shiftKey ? -90 : 90); return; }
  }
  if ((k === "Delete" || k === "Backspace") && selOpening()) { deleteOpening(); return; }
  if ((k === "Delete" || k === "Backspace") && S.selDiv !== null) { deleteDivider(); return; }
  if ((k === "Delete" || k === "Backspace") && selDevice()) { deleteDevice(); return; }
  if ((k === "Delete" || k === "Backspace") && S.selFurn !== null) { deletePiece(); return; }
  if (S.selFurn !== null && (ev.ctrlKey || ev.metaKey) && k.toLowerCase() === "g") { ev.preventDefault(); ev.shiftKey ? ungroupPieces() : groupPieces(); return; }
  if (S.selFurn !== null && (k === "]" || k === "}")) { orderPieces(ev.shiftKey || k === "}" ? "front" : "up"); return; }
  if (S.selFurn !== null && (k === "[" || k === "{")) { orderPieces(ev.shiftKey || k === "{" ? "back" : "down"); return; }
  if ((k === "Delete" || k === "Backspace") && S.selRoom !== null) { $("rm-del")?.click(); return; }
  if ((k === "Delete" || k === "Backspace") && S.selGarden !== null) { $("gd-del")?.click(); return; }
  if (S.tool === "garden" && S.gard.pts.length) {
    if (k === "Enter") { gardenFinish(); return; }
    if (k === "Escape") { S.gard.pts = []; renderOverlay(); return; }
  }
  if (k === "Escape") { if (S.typed) { S.typed = ""; showTyped(); } else if (S.draw) endChain(); else { clearSel(); renderPanel(); renderOverlay(); } return; }
  if ((k === "Delete" || k === "Backspace") && S.sel !== null) { deleteWall(S.sel); return; }
  if (k === "v" || k === "V") setTool("select");
  if (k === "w" || k === "W") setTool("wall");
  if (k === "s" || k === "S") setTool("shape");
  if (k === "o" || k === "O") setTool("opening", "windows");
  if (k === "b" || k === "B") setTool("opening", "doors");
  if (k === "p" || k === "P") setTool("rooms");
  if (k === "l" || k === "L") setTool("divide");
  if (k === "d" || k === "D") setTool("devices");
  if (k === "f" || k === "F") setTool("furniture");
  if ((k === "g" || k === "G") && !ev.ctrlKey && !ev.metaKey) setTool("garden");
});
window.addEventListener("keyup", (ev) => { if (ev.key === " ") spaceDown = false; });

// --- toolbar ----------------------------------------------------------------------------------------------------------
// a click on the open tool's name folds its options (the tool stays on); another click unfolds them
for (const b of document.querySelectorAll("[data-tool]")) b.onclick = () => {
  if (b.dataset.tool !== S.tool || (b.dataset.optab && b.dataset.optab !== opTab())) { setTool(b.dataset.tool, b.dataset.optab); return; }
  S.folded = !S.folded;
  b.closest(".tool")?.classList.toggle("folded", S.folded);
};
// the Plan and Help sections on the left open and close on their own; the tool stays
for (const b of document.querySelectorAll("[data-open]")) b.onclick = () => { b.closest(".tool").classList.toggle("on"); renderSideLists(); };
$("b-undo").onclick = undo;
$("b-redo").onclick = redo;
$("b-fit").onclick = fit;
// one handler for every tile (data-pick = what it chooses)
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest("[data-pick]");
  if (!b) return;
  const v = b.dataset.value;
  switch (b.dataset.pick) {
    case "walltype": S.wallType = v; S.thickness = null; break;
    case "shape": S.shape.kind = v; S.shape.params = { ...SHAPES[v].params }; break;
    case "corner": S.shape.params.corner = v; break;
    case "optype": S.opening.type = v; S.opening.width = null; S.opening.width2 = null; break;
    case "dev": S.dev = { type: v, start: null }; S.addBulb = null; break;
    case "furn": S.furn.kind = v; S.furn.copy = null; S.furn.turn = null; break;
    case "sk-shape": S.sketch.shape = v; S.sketch.start = null; S.sketch.pts = []; break;
    case "w-type": setWallProp(S.sel, "type", v); return;
    case "op-type": editOpening((w2, o2) => {
      const was = o2.type;
      // no longer a corner window: the other half stays, on its own
      if (was === "corner_window" && v !== "corner_window") { const p = cornerPair(S.model, o2); if (p) delete p.o.pair; }
      const contacts = o2.contacts;
      retype(S.model, w2, o2, kindType(v));
      // a window of one pane / two panes: the same type, its panes; a glazed one keeps its contact sensors
      if (v === "window_2") o2.panes = 2; else if (v === "window") delete o2.panes;
      if (v === "balcony_door_2") { o2.panes = 2; o2.pane_open = ["from", "to"]; }
      else if (v === "balcony_door_3") { o2.panes = 3; o2.pane_open = ["from", "fixed", "to"]; }
      else if (v === "balcony_door") { delete o2.panes; delete o2.pane_open; }
      if (contacts && GLAZED.includes(o2.type)) o2.contacts = o2.panes ? contacts.slice(0, Math.max(1, contacts.length > 1 ? o2.panes : 1)) : contacts.slice(0, 1);
      if (!GLAZED.includes(o2.type) || (was === "hst") !== (o2.type === "hst")) dropCovers([o2.id]);
    }); return;
    case "df-kind": editDevice((y) => { y.kind = v; if (v === "spot" && y.bulbs && !y.beam) y.beam = 60; }); return;
    case "nt-icon": editDevice((y) => { y.icon = v; }); return;
    case "gd-kind": S.gard.kind = v; S.gard.pts = []; break;
    case "gd-mode": S.gard.mode = v; S.gard.pts = []; break;
    case "gd-retype": editGarden((g) => { g.kind = v; }); return;
  }
  renderPanel(); renderOverlay();
});
// icons in the tool headers
for (const h of document.querySelectorAll(".tool-h")) h.insertAdjacentHTML("afterbegin", icon(h.dataset.optab === "windows" ? "window" : h.dataset.optab === "doors" ? "door" : h.dataset.tool));
$("i-thick").onchange = (e) => { S.thickness = e.target.value ? Number(e.target.value) : null; renderPanel(); renderOverlay(); };
$("s-grid").onchange = (e) => { S.grid = e.target.value === "auto" ? "auto" : Number(e.target.value); renderGrid(); };
$("c-dims").onchange = (e) => { S.showDims = e.target.checked; renderOverlay(); };
$("types").addEventListener("change", (e) => {
  const k = e.target.dataset.wt;
  if (!k || !(Number(e.target.value) > 0)) return;
  const before = snapshot();
  S.model.wall_types = { ...DEFAULT_TYPES, ...(S.model.wall_types || {}) };
  S.model.wall_types[k] = { ...S.model.wall_types[k], thickness: Number(e.target.value) };
  commit(before);
});
$("b-new").onclick = () => {
  if (S.model.walls.length && !confirm(t("confirm_new"))) return;
  load(emptyModel(), "");
};
$("b-open").onclick = () => $("f-open").click();
$("f-open").onchange = async (e) => {
  const f = e.target.files[0];
  if (f) openText(await f.text(), f.name);
  e.target.value = "";
};
// --- saving: on the server (tools/serve.mjs) with versions, or as a download -----------------------------------------
// S.server: {version, versions, names} when the page is served by tools/serve.mjs; S.base: the version the
// plan in the editor started from; S.dirty: changed since.
const SRV_STORE = "floorplan-editor.server";
function storeServerState() {
  try { localStorage.setItem(SRV_STORE, JSON.stringify({ base: S.base, dirty: S.dirty })); } catch { /* private mode */ }
}
const when = (iso) => (iso ? new Date(iso).toLocaleString(LOCALE, { dateStyle: "short", timeStyle: "short" }) : "");
function showVersion() {
  const v = $("ver");
  if (!v) return;
  v.textContent = S.server ? (S.base || "—") + (S.dirty ? " •" : "") : "";
  v.classList.toggle("dirty", !!(S.server && S.dirty));
  v.title = S.dirty ? t("unsaved_kept", { v: S.base || "—" }) : "";
}
function download() {
  const blob = new Blob([prettyJson(house()) + "\n"], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "house.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// Where the plan is kept: the editor's own server (tools/serve.mjs), or Home Assistant (the floor plan
// integration - the editor is then a panel of HA and talks to it over its WebSocket).
const IN_HA = new URLSearchParams(location.search).has("ha") || location.pathname.startsWith("/living_floorplan/");
const httpBackend = {
  async plan() {
    const r = await fetch("/api/plan");
    if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return null;
    return r.json();
  },
  async save(body) {
    const r = await fetch("/api/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const res = await r.json();
    if (!r.ok) throw new Error(res.error || "HTTP " + r.status);
    return res;
  },
  async version(id) {
    const r = await fetch("/api/versions/" + id);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  },
};
const haBackend = {
  plan: () => ha.call({ type: "living_floorplan/plan" }),
  save: (body) => ha.call({ type: "living_floorplan/save", ...body }),
  version: async (id) => (await ha.call({ type: "living_floorplan/version", version: id })).model,
};
let backend = httpBackend;
async function serverSave(mode, note) {
  const res = await backend.save({ model: house(), mode, note, base: S.base || null });
  S.server.version = res.version; S.server.versions = res.versions;
  S.base = res.version.id; S.dirty = false;
  storeServerState(); showVersion();
  $("st-msg").textContent = t("saved_as", { v: res.version.id });
  return res;
}
function saveDialog() {
  const dlg = $("save-dialog"), cur = S.server.version, latest = cur && S.base === cur.id;
  $("sv-cur").textContent = !cur ? t("sv_none") : latest ? t("sv_cur", { v: cur.id, at: when(cur.saved) }) : t("sv_old", { v: S.base || "—" });
  $("sv-over").textContent = t("sv_over", { v: cur ? cur.id : "v1" });
  $("sv-over").disabled = !!cur && !latest;
  $("sv-note").value = "";
  $("sv-msg").textContent = "";
  $("sv-list").innerHTML = [...(S.server.versions || [])].reverse().map((v) =>
    `<div class="vrow${cur && v.id === cur.id ? " cur" : ""}"><b>${v.id}</b><span>${esc(when(v.saved))}</span>` +
    `<span title="${esc(v.note || "")}">${esc(v.note || "")}${cur && v.id === cur.id ? ` (${t("sv_current")})` : ""}</span>` +
    `<button type="button" data-ver="${v.id}">${t("sv_open")}</button></div>`).join("");
  dlg.querySelectorAll("[data-ver]").forEach((b) => { b.onclick = () => { dlg.close("open"); openVersion(b.dataset.ver); }; });
  dlg.returnValue = ""; // Escape keeps the last value: it must not repeat the last save
  dlg.showModal();
}
$("save-dialog").addEventListener("close", async () => {
  const how = $("save-dialog").returnValue;
  if (how === "dl") return download();
  if (how !== "over" && how !== "new") return;
  try { await serverSave(how, $("sv-note").value.trim()); }
  catch (e) { $("st-msg").textContent = t("save_error") + e.message; }
});
async function openVersion(id) {
  try {
    load(await backend.version(id), S.furniture);
    S.base = id; S.dirty = false; storeServerState(); showVersion();
    $("st-msg").textContent = t("opened_ver", { v: id });
  } catch (e) { $("st-msg").textContent = t("load_error", { name: id }) + e.message; }
}
$("b-save").onclick = () => (S.server ? saveDialog() : download());
// "Send to HA": the server leaves a request, something with access to Home Assistant answers (tools/serve.mjs --publish)
async function publishSetup() {
  try {
    const r = await fetch("/api/publish");
    if (r.ok && (await r.json()).available) $("b-publish").hidden = false;
  } catch (e) { /* not served by serve.mjs */ }
}
$("b-publish").onclick = async () => {
  const msg = $("st-msg");
  if (S.dirty) { msg.textContent = t("publish_dirty"); return; }
  try {
    const r = await fetch("/api/publish", { method: "POST" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const { at } = await r.json();
    msg.textContent = t("publish_wait");
    for (let i = 0; i < 60; i++) {
      await new Promise((ok) => setTimeout(ok, 1000));
      const st = await (await fetch("/api/publish")).json();
      if (st.last && st.last.at >= at) {
        msg.textContent = st.last.ok ? t("publish_ok", { v: st.last.version || "" }) : t("publish_err", { msg: st.last.message || "?" });
        return;
      }
    }
    msg.textContent = t("publish_err", { msg: "no answer in 60 s" });
  } catch (e) { msg.textContent = t("publish_err", { msg: e.message }); }
};
$("floor").onchange = (e) => switchFloor(Number(e.target.value));
$("b-floor-add").onclick = addFloor;
$("b-floor-edit").onclick = editFloor;
$("b-floor-below").onclick = () => {
  S.showBelow = !S.showBelow;
  try { localStorage.setItem(BELOW_STORE, S.showBelow ? "1" : "0"); } catch { /* private mode */ }
  renderFloors(); renderOverlay();
};
// the SVG as the card gets it: the plan's own rotation and frame, the server's name table
$("b-preview").onclick = () => {
  try {
    const h = house(), id = S.floor < 0 ? null : h.floors[S.floor].id;
    const svg = generateSvg(h, { furniture: id ? "" : S.furniture, names: S.server && S.server.names, floor: id });
    window.open(URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), "_blank");
  } catch (e) { $("st-msg").textContent = t("draw_error") + e.message; }
};
// --- "a house in 5 minutes": a whole plan from a few answers (editor/wizard.js) -----------------------------------
const WZ_NAMES = () => Object.fromEntries(["bedroom", "kids", "office", "bathroom", "wc", "utility", "wardrobe", "kitchen", "living", "living_kitchen", "hall"]
  .map((k) => [k, t("wzr_" + k)]));
function wizardAnswers() {
  const v = (k) => $("wz-" + k), num = (k) => Number(v(k).value);
  return { width: num("width") * 100, depth: num("depth") * 100, bedrooms: num("bedrooms"), kids: num("kids"), bathrooms: num("bathrooms"),
    office: v("office").checked, wc: v("wc").checked, utility: v("utility").checked, wardrobe: v("wardrobe").checked,
    kitchen_open: v("kitchen_open").checked, furniture: v("furniture").checked };
}
function wizardPreview() {
  const r = buildHouse(wizardAnswers(), WZ_NAMES());
  $("wz-out").innerHTML = r.error ? `<b class="warn">${t("wz_" + r.error)}</b>`
    : r.rooms.map((x) => `${esc(x.name)} ${x.area.toLocaleString(LOCALE)} m²`).join(" · ");
  $("wz-go").disabled = !!r.error;
  return r;
}
$("b-wizard").onclick = () => { wizardPreview(); $("wizard").showModal(); };
$("wz-form").addEventListener("input", wizardPreview);
$("wz-cancel").onclick = (e) => { e.preventDefault(); $("wizard").close(); };
$("wz-go").onclick = (e) => {
  e.preventDefault();
  const r = wizardPreview();
  if (r.error) return;
  // a plan already drawn is replaced only on a yes (undo still brings it back)
  if (S.model.walls.length && !window.confirm(t("wz_replace"))) return;
  const before = snapshot();
  const { floors, ...g } = r.model;
  S.model = g;
  clearSel();
  commit(before);
  $("wizard").close();
  setTool("select");
  fit();
};

// --- the garden: areas, lines and plants round the house (generator/garden.js) ----------------------------------
const gardenGroup = (k) => (GARDEN_AREAS.includes(k) ? GARDEN_AREAS : GARDEN_LINES.includes(k) ? GARDEN_LINES : GARDEN_PLANTS);
const GARDEN_SWATCH = { lawn: "#3f7a4f", terrace: "#8a6c55", driveway: "#6b7280", path: "#8792a3", flowerbed: "#7a5a3a", pool: "#3a8cc4",
  gravel: "#9a9a96", plot: "#5a6b86", fence: "#8ea1ba", hedge: "#3d6b48", tree: "#4f8a5b", bush: "#5f9a6a" };
function gardenTile(k) {
  const c = GARDEN_SWATCH[k];
  const body = GARDEN_PLANTS.includes(k) ? `<circle cx="12" cy="12" r="${k === "tree" ? 8 : 5}" fill="${c}" stroke="currentColor"/>`
    : GARDEN_LINES.includes(k) ? `<path d="M3 17 L10 8 L21 12" fill="none" stroke="${c}" stroke-width="${k === "hedge" ? 4 : 2}" stroke-dasharray="${k === "fence" ? "3 1.5" : ""}"/>`
    : k === "plot" ? `<rect x="3" y="5" width="18" height="14" fill="none" stroke="${c}" stroke-dasharray="4 2 1 2"/>`
    : `<rect x="3" y="5" width="18" height="14" rx="1.5" fill="${c}" stroke="none"/>`;
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}
function gardenToolPanel(box) {
  const g = S.gard;
  const group = (key, list) => `<div class="pal-h">${t(key)}</div>` + tiles("gd-kind", list.map((k) => ({ value: k, label: t("gd_" + k), svg: gardenTile(k) })), g.kind, "small");
  const area = GARDEN_AREAS.includes(g.kind);
  box.innerHTML = group("gd_areas", GARDEN_AREAS) + group("gd_lines", GARDEN_LINES) + group("gd_plants", GARDEN_PLANTS) +
    (area ? tiles("gd-mode", [{ value: "rect", label: t("gd_rect"), icon: "shape" }, { value: "poly", label: t("gd_poly"), icon: "rooms" }], g.mode, "small") : "") +
    `<div class="empty">${t(GARDEN_PLANTS.includes(g.kind) ? "gd_hint_plant" : !area ? "gd_hint_line" : g.mode === "rect" ? "gd_hint_rect" : "gd_hint_poly")}</div>`;
}
function gardenClick(p) {
  const g = S.gard, kind = g.kind;
  if (GARDEN_PLANTS.includes(kind)) { gardenAdd({ kind, at: rp(p), r: PLANT_R[kind] }); return; }
  if (GARDEN_AREAS.includes(kind) && g.mode === "rect") {
    if (!g.pts.length) { g.pts = [rp(p)]; renderOverlay(); return; }
    const a = g.pts[0];
    g.pts = [];
    if (Math.abs(p[0] - a[0]) < MIN_LEN || Math.abs(p[1] - a[1]) < MIN_LEN) { renderOverlay(); return; }
    gardenAdd({ kind, points: [a, rp([p[0], a[1]]), rp(p), rp([a[0], p[1]])] });
    return;
  }
  // a polygon closes on its first point, a line ends on its last one (or Enter)
  const near = (q) => q && len(sub(p, q)) <= 10 / S.view.s;
  if (GARDEN_AREAS.includes(kind) && g.pts.length >= 3 && near(g.pts[0])) { gardenFinish(); return; }
  if (GARDEN_LINES.includes(kind) && g.pts.length >= 2 && near(g.pts[g.pts.length - 1])) { gardenFinish(); return; }
  g.pts.push(rp(p));
  renderOverlay();
}
function gardenFinish() {
  const g = S.gard, pts = g.pts;
  g.pts = [];
  if (GARDEN_AREAS.includes(g.kind) && pts.length >= 3) gardenAdd({ kind: g.kind, points: pts });
  else if (GARDEN_LINES.includes(g.kind) && pts.length >= 2) gardenAdd({ kind: g.kind, line: pts });
  else renderOverlay();
}
function gardenAdd(item) {
  const before = snapshot();
  const list = (S.model.garden = S.model.garden || []);
  let i = 1;
  while (list.some((x) => x.id === `${item.kind}-${i}`)) i++;
  list.push({ id: `${item.kind}-${i}`, ...item });
  clearSel(); S.selGarden = list.length - 1;
  commit(before);
}
function editGarden(f) {
  const g = S.selGarden !== null && (S.model.garden || [])[S.selGarden];
  if (!g) return;
  const before = snapshot();
  f(g);
  commit(before);
}
// the garden item under a point: plants first, then lines, then areas (the smallest)
function gardenAt(p) {
  const list = S.model.garden || [];
  let best = null, bestA = Infinity;
  list.forEach((g, i) => {
    let a = Infinity;
    if (g.at) { if (len(sub(p, g.at)) <= (g.r || PLANT_R[g.kind] || 60)) a = 0; }
    else if (g.line) { for (let k = 1; k < g.line.length; k++) if (toSegment(p, g.line[k - 1], g.line[k]).dist <= Math.max(8 / S.view.s, (g.width || HEDGE_W) / 2)) a = 1; }
    else if (g.points && pointInPolygon(p, g.points)) a = 2 + polyArea(g.points);
    if (a < bestA) { best = i; bestA = a; }
  });
  return best;
}
function gardenPanel(box, g) {
  const row = (label, html) => `<div class="row"><span>${label}</span>${html}</div>`;
  const kinds = gardenGroup(g.kind);
  box.innerHTML = `<h3>${t("gd_" + g.kind)}</h3>` + tiles("gd-retype", kinds.map((k) => ({ value: k, label: t("gd_" + k), svg: gardenTile(k) })), g.kind, "small") +
    (g.points ? row(t("area"), `<b>${m2(polyArea(g.points))} m²</b>`) : "") +
    (g.line ? row(t("gd_length"), `<b>${fmt(g.line.slice(1).reduce((a, q, k) => a + len(sub(q, g.line[k])), 0) / 100)} m</b>`) : "") +
    (g.at ? row(t("gd_diameter"), `<input id="gd-d" type="number" min="20" step="10" value="${2 * (g.r || PLANT_R[g.kind])}"> cm`) : "") +
    (g.kind === "hedge" ? row(t("gd_width"), `<input id="gd-w" type="number" min="10" step="10" value="${g.width || HEDGE_W}"> cm`) : "") +
    `<div class="empty">${t("gd_edit_hint")}</div><button id="gd-del" class="danger">${t("delete_device")}</button>`;
  if ($("gd-d")) $("gd-d").onchange = (e) => editGarden((x) => { x.r = Math.max(10, Number(e.target.value) / 2 || PLANT_R[x.kind]); });
  if ($("gd-w")) $("gd-w").onchange = (e) => editGarden((x) => { x.width = Math.max(10, Number(e.target.value) || HEDGE_W); });
  $("gd-del").onclick = () => { const before = snapshot(); S.model.garden.splice(S.selGarden, 1); S.selGarden = null; commit(before); };
}

// --- export: the plan with its dimensions as PNG, or PDF at a true scale (editor/export.js) -------------------------
// The overlay's dimensions and room names drawn for a sheet: the same overlay the editor shows,
// rendered at the sheet's scale with nothing selected.
function overlayFor(s) {
  const keep = { view: S.view, tool: S.tool, hover: S.hover, showDims: S.showDims, sel: S.sel, selOp: S.selOp, selRoom: S.selRoom,
    selDiv: S.selDiv, selDev: S.selDev, selFurn: S.selFurn, selMore: S.selMore, ghost: S.ghost, draw: S.draw };
  try {
    clearSel(); S.hover = null; S.tool = "select"; S.showDims = true; S.ghost = null; S.draw = null;
    S.view = { ...S.view, s };
    renderOverlay();
    return [...overlay.querySelectorAll(".ov-room, .ov-dim, .ov-chain")].map((e) => e.outerHTML).join("");
  } finally {
    Object.assign(S, keep);
    renderOverlay();
  }
}
// what the sheet shows: the walls and everything placed, plus room for the dimension chains (cm)
function exportBox(s) {
  const pts = [...S.model.walls.flatMap((w) => [w.a, w.b]), ...(S.model.notes || []).flatMap((x) => [x.at, x.from, x.to].filter(Boolean))];
  if (!pts.length) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = 75 / s + 40;
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad];
}
async function exportPlan(kind) {
  const pdf = kind.startsWith("pdf"), light = pdf || kind === "png-light";
  // layout px per cm: on paper 1 px = 0.2 mm (12 px text = 2.4 mm)
  const probe = exportBox(0.6);
  if (!probe) return;
  const fit = pdf ? pickScale(probe[2], probe[3], kind.slice(4)) : null;
  const s = pdf ? 50 / fit.scale : 0.6;
  const box = exportBox(s);
  const W = Math.round(box[2] * s), Hd = Math.round(box[3] * s), TH = 80;
  $("st-msg").textContent = t("ex_busy");
  // the plan as the editor draws it (north up), framed to the box
  const m = { ...S.model, canvas: { ...S.model.canvas, rotate: 0, viewBox: undefined, sheet: undefined } };
  if (S.floor >= 0) { const v = stairVoids(floorModel(S.house, S.floor - 1)); if (v.length) m.furniture = [...(m.furniture || []), ...v]; }
  const doc = new DOMParser().parseFromString(generateSvg(m, { furniture: S.floor < 0 ? S.furniture : "" }), "image/svg+xml").documentElement;
  for (const [k, v] of Object.entries({ x: 0, y: 0, width: W, height: Hd, viewBox: box.map((v) => v / cmPerSvg()).join(" "), preserveAspectRatio: "none" })) doc.setAttribute(k, v);
  const plan = new XMLSerializer().serializeToString(doc);
  const ov = overlayFor(s);
  // title block: name, floor, area, date, scale and a scale bar
  const area = S.model.rooms.reduce((a, r) => { const p = !r.unused && roomPoly(r); return a + (p ? polyArea(p) : 0); }, 0);
  const name = (S.house && S.house.name) || t("plan");
  const fg = light ? "#1d2633" : "#e9eef5", fg2 = light ? "#5b6a80" : "#9aa9bd", bg = light ? "#ffffff" : "#131a24";
  const bar = barLength(Math.min(box[2] * 0.3, 1000)), barPx = bar * s;
  const info = [floorName(S.floor), t("ex_area", { a: m2(area) }), new Date().toLocaleDateString(LOCALE)].join(" · ");
  const tx = (x, y, size, fill, text, anchor = "start", weight = 400) =>
    `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(text)}</text>`;
  // the scale bar: two halves, dark and light
  const ticks = [0, 1].map((i) => `<rect x="${W - 20 - barPx + (i * barPx) / 2}" y="${Hd + 46}" width="${barPx / 2}" height="7" fill="${i ? bg : fg}" stroke="${fg}" stroke-width="1"/>`).join("");
  const title = `<rect x="0" y="${Hd}" width="${W}" height="${TH}" fill="${bg}"/><line x1="20" y1="${Hd + 12}" x2="${W - 20}" y2="${Hd + 12}" stroke="${fg2}" stroke-width="1"/>` +
    tx(20, Hd + 38, 18, fg, name, "start", 600) + tx(20, Hd + 60, 12, fg2, info) +
    (pdf ? tx(W - 20, Hd + 34, 14, fg, t("ex_scale", { s: fit.scale }), "end", 600) : "") + ticks +
    tx(W - 20 - barPx, Hd + 70, 11, fg2, "0", "middle") + tx(W - 20, Hd + 70, 11, fg2, bar >= 100 ? bar / 100 + " m" : bar + " cm", "middle");
  const drawing = `<rect width="${W}" height="${Hd}" fill="#1b2433"/>${plan}` +
    `<svg x="0" y="0" width="${W}" height="${Hd}" viewBox="${box.join(" ")}" preserveAspectRatio="none"><style>${EXPORT_CSS}</style>${ov}</svg>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hd + TH}" viewBox="0 0 ${W} ${Hd + TH}">` +
    `${light ? lightSvg(drawing) : drawing}${title}</svg>`;
  // raster: 2x for a PNG, about 200 dpi on paper
  const k = pdf ? 1.575 : 2;
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = () => bad(new Error("SVG")); img.src = url; });
    const cv = document.createElement("canvas");
    cv.width = Math.round(W * k); cv.height = Math.round((Hd + TH) * k);
    const g = cv.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const base = (name + "-" + floorName(S.floor)).replace(/[^\p{L}\p{N}._-]+/gu, "-");
    let blob, file;
    if (pdf) {
      const jpeg = new Uint8Array(await (await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.92))).arrayBuffer());
      const [x, y, w, h] = fit.area;
      blob = new Blob([pdfWithImage(jpeg, cv.width, cv.height, fit.page, [x, y, w, h + (TH * 0.2)])], { type: "application/pdf" });
      file = `${base}-1-${fit.scale}.pdf`;
    } else {
      blob = await new Promise((r) => cv.toBlob(r, "image/png"));
      file = base + ".png";
    }
    S.lastExport = { file, blob, w: cv.width, h: cv.height, scale: fit && fit.scale, svg };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    $("st-msg").textContent = t("ex_done", { name: file });
  } catch (e) {
    $("st-msg").textContent = t("draw_error") + e.message;
  } finally { URL.revokeObjectURL(url); }
}
// which editor this is (set by the build that packs it, e.g. into the Home Assistant integration)
$("st-build").textContent = globalThis.FLOORPLAN_BUILD || "dev";
$("s-export").onchange = (e) => { const v = e.target.value; e.target.value = ""; if (v) exportPlan(v); };

// A model from a URL, with furniture.svg from the same directory when there.
async function loadUrl(url) {
  try {
    const base = new URL(url, location.href);
    const [m, f] = await Promise.all([fetch(base).then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }),
      fetch(new URL("furniture.svg", base)).then((r) => (r.ok ? r.text() : "")).catch(() => "")]);
    load(m, f);
  } catch (e) { $("st-msg").textContent = t("load_error", { name: url }) + e.message; }
}
// a single-file build (the floor plan card's bundled editor) carries the example inside the page
$("b-example").onclick = () => (globalThis.FLOORPLAN_EXAMPLE ? load(globalThis.FLOORPLAN_EXAMPLE, "") : loadUrl("../examples/house.json"));
stage.addEventListener("dragover", (e) => e.preventDefault());
stage.addEventListener("drop", async (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (f) openText(await f.text(), f.name);
});
function openText(text, name) {
  try {
    const m = JSON.parse(text);
    if (m.version !== 2) throw new Error(t("not_v2"));
    load(m, "");
    $("st-msg").textContent = t("loaded", { name });
  } catch (e) { $("st-msg").textContent = t("load_error", { name }) + e.message; }
}
function load(m, furniture) {
  S.house = m; S.floor = -1; S.hists = {};
  S.model = floorModel(m, -1);
  S.furniture = furniture;
  S.history = []; S.future = [];
  clearSel(); S.draw = null;
  S.loading = true;
  changed();
  S.loading = false;
  S.dirty = false; storeServerState(); showVersion();
  renderFloors();
  fit();
}
new ResizeObserver(() => draw()).observe(stage);

translatePage();

// --- start ------------------------------------------------------------------------------------------------------------
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || "null"); } catch { /* ignore */ }
if (saved && saved.version === 2) { S.house = saved; S.model = floorModel(saved, -1); }
else S.house = S.model;
// what this browser knew about the server's plan (the startup draw is not a change)
try { Object.assign(S, (({ base, dirty }) => ({ base: base ?? null, dirty: !!dirty }))(JSON.parse(localStorage.getItem(SRV_STORE) || "{}"))); } catch { /* ignore */ }
S.loading = true;
setTool("select");
changed();
S.loading = false;
renderFloors();
requestAnimationFrame(fit);
// the underlay and Home Assistant from the last session
try { S.underlay = JSON.parse(localStorage.getItem(UNDER_STORE) || "null"); } catch { /* ignore */ }
S.showBelow = true;
try { S.showBelow = localStorage.getItem(BELOW_STORE) !== "0"; } catch { /* ignore */ }
const haReady = (async () => {
  // in a Home Assistant panel: its login, and the plan kept by the floor plan integration
  const cfg = IN_HA ? (await HaConnection.parentToken()) || (await HaConnection.frontendToken())
    : HaConnection.saved() || (await HaConnection.frontendToken());
  if (cfg && (await haConnect(cfg)) && IN_HA) backend = haBackend;
})();
// ?model=<url of a house.json> opens that model (furniture.svg next to it too)
const startUrl = new URLSearchParams(location.search).get("model");
if (startUrl) loadUrl(startUrl);
else (async () => {
  // served by tools/serve.mjs (or a panel of HA): the plan from there - unless this browser has unsaved changes of the same plan
  if (IN_HA) await haReady;
  let plan;
  try {
    plan = await backend.plan();
    if (!plan) return;
  } catch (e) { if (IN_HA) $("st-msg").textContent = t("load_error", { name: "Home Assistant" }) + e.message; return; }
  S.server = { version: plan.version, versions: plan.versions || [], names: plan.names };
  if (!IN_HA) publishSetup();
  let st = null;
  try { st = JSON.parse(localStorage.getItem(SRV_STORE) || "null"); } catch { /* ignore */ }
  const ids = (plan.versions || []).map((v) => v.id);
  if (st && st.dirty && saved && (!st.base || ids.includes(st.base))) {
    S.furniture = plan.furniture || "";
    S.base = st.base; S.dirty = true;
    renderPlan(); showVersion();
    $("st-msg").textContent = t("unsaved_kept", { v: st.base || "—" });
  } else if (plan.model) {
    load(plan.model, plan.furniture || "");
    S.base = plan.version && plan.version.id; storeServerState(); showVersion();
  } else showVersion();
})();

window.floorplanEditor = {
  areaPanel: (r) => areaPanel(r),
  get state() { return S; },
  get model() { return S.model; },
  get house() { return house(); }, switchFloor,
  ha, applyLive(on) { $("c-live").checked = on; $("c-live").dispatchEvent(new Event("change")); }, setUnderlay,
  snapStep,
  roomArea(r) { const p = roomPoly(r); return p ? Math.round(polyArea(p)) : null; },
  setTool, undo, redo, fit, load, loadUrl, emptyModel, renderPanel() { renderPanel(); renderPlan(); renderOverlay(); }, toScreen(p) {
    const r = stage.getBoundingClientRect(), { cx, cy, s } = S.view;
    return [r.left + r.width / 2 + (p[0] - cx) * s, r.top + r.height / 2 + (p[1] - cy) * s];
  },
};
