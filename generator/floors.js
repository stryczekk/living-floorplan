// Floors and colours: a room's floor as a pattern (boards, herringbone, tiles,
// concrete, carpet) in a colour of the owner's choosing, and a colour for a piece
// of furniture. Both are toned down into the plan's dark palette - a bright oak
// would shout over the light the lamps throw - and the card's light theme turns
// them light again like every other colour of the plan.
//
//   room.floor = { pattern: "wood", color: "#c9a273" }     piece.color = "#a07850"

export const FLOOR_PATTERNS = ["wood", "herringbone", "tiles", "large_tiles", "concrete", "carpet"];
// colours offered in the editor (any #rrggbb works)
export const COLORS = {
  oak_light: "#c9a273", oak: "#a07850", walnut: "#6b4a32", beige: "#d6c7a8", white: "#e8e6e0",
  grey: "#8d8c88", anthracite: "#3c3f44", terracotta: "#b0674a", navy: "#2a3961", green: "#5f7a5a",
};
const DEFAULT_COLOR = { wood: "#a07850", herringbone: "#c9a273", tiles: "#8d8c88", large_tiles: "#d6c7a8", concrete: "#8d8c88", carpet: "#5f7a5a" };
const ROOM = "#1e2836", PIECE = "#243040"; // the plan's own fills (theme)

const hexOk = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
export function mix(a, b, t) {
  const p = (h, i) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("");
}

// The fill of a piece of furniture in its colour (toned into the plan), or null for the default.
export function pieceFill(color) {
  return hexOk(color) ? mix(PIECE, color.toLowerCase(), 0.45) : null;
}

// The pattern id of a room's floor, or null (no floor set, unknown pattern).
export function floorId(floor) {
  if (!floor || !FLOOR_PATTERNS.includes(floor.pattern)) return null;
  const c = hexOk(floor.color) ? floor.color.toLowerCase() : DEFAULT_COLOR[floor.pattern];
  return `fl-${floor.pattern}-${c.slice(1)}`;
}

// <pattern> definitions for the floors used; k = SVG units per cm.
export function floorDefs(floors, k) {
  const n = (v) => Number((v * k).toFixed(2)).toString();
  const out = new Map();
  for (const f of floors) {
    const id = floorId(f);
    if (!id || out.has(id)) continue;
    const c = "#" + id.split("-").pop();
    const bg = mix(ROOM, c, 0.3), ln = mix(ROOM, c, 0.5);
    const line = (d) => `<path d="${d}" fill="none" stroke="${ln}" stroke-width="0.7"/>`;
    let w, h, body;
    switch (f.pattern) {
      case "wood": // boards 20 cm wide, 150 cm long, joints staggered by half
        w = 150; h = 40;
        body = line(`M0 0H${n(150)}M0 ${n(20)}H${n(150)}M0 0V${n(20)}M${n(75)} ${n(20)}V${n(40)}`);
        break;
      case "herringbone": // 10 cm planks laid in a zigzag
        w = 40; h = 20;
        body = line(`M0 0L${n(20)} ${n(10)}L${n(40)} 0M0 ${n(10)}L${n(20)} ${n(20)}L${n(40)} ${n(10)}M${n(20)} ${n(10)}V${n(20)}`);
        break;
      case "tiles": w = 60; h = 60; body = line(`M0 0H${n(60)}M0 0V${n(60)}`); break;
      case "large_tiles": w = 120; h = 60; body = line(`M0 0H${n(120)}M0 0V${n(60)}`); break;
      case "concrete": // a few specks
        w = 50; h = 50;
        body = [[7, 11], [31, 6], [44, 29], [18, 38], [36, 45], [9, 27]].map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="0.6" fill="${ln}"/>`).join("");
        break;
      case "carpet": w = 4; h = 4; body = `<circle cx="${n(2)}" cy="${n(2)}" r="0.45" fill="${ln}"/>`; break;
    }
    out.set(id, `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${n(w)}" height="${n(h)}"><rect width="${n(w)}" height="${n(h)}" fill="${bg}"/>${body}</pattern>`);
  }
  return [...out.values()].map((p) => "    " + p).join("\n");
}
