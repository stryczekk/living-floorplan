// Icons of the editor's tiles (tools, wall types, shapes, openings, devices):
// 24 x 24, stroked with currentColor. Device glyphs reuse the plan's own icons.

import { ICON_KINDS } from "../generator/icons.js";

const I = {
  // tools
  select: '<path d="M6 3 L18 13 L12.5 13.6 L15.5 20 L13 21 L10 14.6 L6 18 Z"/>',
  wall: '<rect x="3" y="9" width="18" height="6" fill="currentColor" stroke="none"/><path d="M3 9 V15 M21 9 V15"/>',
  shape: '<path d="M4 4 H14 V10 H20 V20 H4 Z"/>',
  opening: '<path d="M2 9 H7 M17 9 H22 M2 15 H7 M17 15 H22 M7 9 V15 M17 9 V15"/><path d="M7 12 H17" stroke-dasharray="2 1.5"/>',
  rooms: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4 V11 M3 13 H12"/>',
  divide: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4 V20" stroke-dasharray="2.5 2"/>',
  devices: '<circle cx="12" cy="10" r="4.5"/><path d="M10 15.5 H14 M10.5 18 H13.5 M12 2.5 V3.8 M5 5 L6 6 M19 5 L18 6"/>',
  furniture: '<path d="M4 11 V18 H20 V11 M4 11 H7 V15 H17 V11 H20 M7 11 V8 A1.5 1.5 0 0 1 8.5 6.5 H15.5 A1.5 1.5 0 0 1 17 8 V11 M6 18 V20 M18 18 V20"/>',
  garden: '<circle cx="12" cy="9" r="6"/><path d="M12 15 V21 M7 21 H17"/>',
  calibrate: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 15 L9 10 L13 14 L16 11 L21 15"/><circle cx="16.5" cy="8.5" r="1.3"/>',
  // wall types: thick to thin
  exterior: '<rect x="2" y="7" width="20" height="10" fill="currentColor" stroke="none"/>',
  load_bearing: '<rect x="2" y="8.5" width="20" height="7" fill="currentColor" stroke="none"/>',
  partition: '<rect x="2" y="10.5" width="20" height="3" fill="currentColor" stroke="none"/>',
  chimney: '<rect x="5" y="5" width="14" height="14" fill="none"/><rect x="8" y="8" width="8" height="8" fill="currentColor" stroke="none"/>',
  // shapes
  rect: '<rect x="3" y="5" width="18" height="14"/>',
  L: '<path d="M3 4 H12 V11 H21 V20 H3 Z"/>',
  T: '<path d="M3 4 H21 V11 H15 V20 H9 V11 H3 Z"/>',
  nw: '<path d="M10 4 H21 V20 H3 V11 H10 Z"/>',
  ne: '<path d="M3 4 H14 V11 H21 V20 H3 Z"/>',
  se: '<path d="M3 4 H21 V13 H14 V20 H3 Z"/>',
  sw: '<path d="M3 4 H21 V20 H10 V13 H3 Z"/>',
  // openings (a wall with the opening's symbol)
  window: '<path d="M2 10 H6 M18 10 H22 M2 14 H6 M18 14 H22"/><path d="M6 12 H18" stroke-width="1.6"/>',
  window_2: '<path d="M2 10 H6 M18 10 H22 M2 14 H6 M18 14 H22"/><path d="M6 12 H18" stroke-width="1.6"/><path d="M12 9 V15" stroke-width="1.4"/>',
  hst: '<path d="M2 10 H4 M20 10 H22 M2 14 H4 M20 14 H22"/><path d="M4 11 H14 M10 13 H20" stroke-width="1.6"/>',
  balcony_door: '<path d="M2 6 H6 M18 6 H22"/><path d="M6 6 H18" stroke-width="1.6"/><path d="M6 6 V18 M6 18 A12 12 0 0 0 18 6" stroke-dasharray="2 1.5"/>',
  door: '<path d="M2 6 H6 M18 6 H22 M6 6 V18 M6 18 A12 12 0 0 0 18 6"/>',
  double_door: '<path d="M1 6 H4 M20 6 H23 M4 6 V14 M4 14 A8 8 0 0 0 12 6 M20 6 V14 M20 14 A8 8 0 0 1 12 6"/>',
  sliding_door: '<path d="M2 8 H6 M18 8 H22"/><path d="M6 11 H18" stroke-width="1.6"/><path d="M9 15 H17 M15 13 L17 15 L15 17"/>',
  garage_door: '<path d="M1 8 H4 M20 8 H23 M1 12 H4 M20 12 H23"/><path d="M4 10 H20" stroke-dasharray="2.5 1.8" stroke-width="1.6"/><path d="M4 14 H20 V20 H4 Z"/>',
  corner_window: '<path d="M4 20 V4 H20" stroke-width="2.4"/><path d="M4 20 V12 M12 4 H20" stroke-width="1.2"/><path d="M8 20 V8 H20" stroke-width="1.6"/>',
  pocket_door: '<path d="M2 10 H8 M2 14 H8 M16 10 H22 M16 14 H22"/><path d="M8 12 H16" stroke-width="1.6"/><path d="M16 12 H22" stroke-dasharray="1.5 1.5"/>',
  double_gate: '<path d="M1 6 H3 M21 6 H23 M3 6 V16 M3 16 A9 9 0 0 0 12 6 M21 6 V16 M21 16 A9 9 0 0 1 12 6"/><path d="M3 11 H6 M18 11 H21"/>',
  text: '<path d="M5 6 V4.5 H19 V6 M12 4.5 V19.5 M9 19.5 H15"/>',
  marker: '<path d="M12 21 C8 16 6 13 6 9.5 A6 6 0 0 1 18 9.5 C18 13 16 16 12 21 Z"/><circle cx="12" cy="9.5" r="2.2"/>',
  arrow: '<path d="M4 19 L18 5 M10 5 H18 V13"/>',
    skylight: '<path d="M4 7 L20 4 V17 L4 20 Z"/><path d="M4 13.5 L20 10.5" stroke-dasharray="2 1.5"/>',
  passage: '<path d="M2 10 H7 M17 10 H22 M2 14 H7 M17 14 H22 M7 10 V14 M17 10 V14"/>',
  // lights and devices that are not icon devices
  ceiling: '<circle cx="12" cy="10" r="4.5"/><path d="M10 15.5 H14 M10.5 18 H13.5 M12 2.5 V3.8 M5 5 L6 6 M19 5 L18 6 M3 10 H4.5 M19.5 10 H21"/>',
  wall_light: '<path d="M3 4 V20" stroke-width="2.4"/><circle cx="12" cy="12" r="4"/><path d="M4.5 12 H8 M17.5 12 H20 M16 7 L17.5 5.5 M16 17 L17.5 18.5"/>',
  night: '<circle cx="12" cy="13" r="3"/><path d="M10.5 17 H13.5 M4 20 H20"/><path d="M8 6 A5 5 0 1 0 15 3 A4 4 0 0 1 8 6 Z"/>',
  rail: '<path d="M3 8 H21"/><circle cx="6" cy="13" r="2.6"/><circle cx="18" cy="13" r="2.6"/><path d="M6 8 V10.4 M18 8 V10.4"/>',
  strip: '<rect x="2" y="10" width="20" height="4" rx="1"/><path d="M5 12 H6 M9 12 H10 M13 12 H14 M17 12 H18"/>',
  fixture: '<circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/><path d="M12 7 V3"/>',
  presence: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 2"/>',
  motion: '<circle cx="5" cy="12" r="2"/><path d="M5 12 L20 5 A14 14 0 0 1 20 19 Z"/>',
  climate: '<path d="M10 4 A2 2 0 0 1 14 4 V13.5 A4 4 0 1 1 10 13.5 Z"/><circle cx="12" cy="16.5" r="1.6" fill="currentColor"/>',
  camera: '<circle cx="5" cy="12" r="2.2"/><path d="M6.5 10.5 L21 5 V19 L6.5 13.5" stroke-dasharray="2 1.5"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="1"/><path d="M8 20 H16 M12 17 V20"/>',
  ac: '<rect x="2" y="5" width="20" height="8" rx="2"/><path d="M5 10 H19 M6 16 C7 17.5 7 18.5 6 20 M12 16 C13 17.5 13 18.5 12 20 M18 16 C19 17.5 19 18.5 18 20"/>',
  appliance: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6 H10"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="1.5"/><path d="M8.5 11 V8 A3.5 3.5 0 0 1 15.5 8 V11"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor"/>',
};

// the plan's own device glyphs (box +-5.5) scaled into 24 x 24
async function glyphs() {
  const { iconDefs } = await import("../generator/icons.js");
  const out = {};
  for (const k of ICON_KINDS) {
    const g = iconDefs([k]).replace(/^\s*<g id="[^"]+">/, "").replace(/<\/g>\s*$/, "");
    out[k] = `<g transform="translate(12 12) scale(1.75)" stroke-width="0.7">${g}</g>`;
  }
  return out;
}
const G = await glyphs();

export function icon(key) {
  const body = I[key] || G[key] || I.devices;
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// A row of tiles: [{value, label, icon?, svg? (its own icon markup)}] - data-pick="<group>", data-value.
export function tiles(group, options, selected, cls = "") {
  return `<div class="tiles ${cls}">${options.map((o) =>
    `<button type="button" class="tile${o.value === selected ? " on" : ""}" data-pick="${group}" data-value="${o.value}" title="${o.label}">` +
    `${o.svg || icon(o.icon || o.value)}<span>${o.label}</span></button>`).join("")}</div>`;
}
