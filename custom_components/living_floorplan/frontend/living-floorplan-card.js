// Living Floor Plan - card (MIT)

// generator/floors.js
var FLOOR_PATTERNS = ["wood", "herringbone", "tiles", "large_tiles", "concrete", "carpet"];
var DEFAULT_COLOR = { wood: "#a07850", herringbone: "#c9a273", tiles: "#8d8c88", large_tiles: "#d6c7a8", concrete: "#8d8c88", carpet: "#5f7a5a" };
var ROOM = "#1e2836";
var PIECE = "#243040";
var hexOk = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
function mix(a, b, t) {
  const p2 = (h, i) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p2(a, i) + (p2(b, i) - p2(a, i)) * t).toString(16).padStart(2, "0")).join("");
}
function pieceFill(color) {
  return hexOk(color) ? mix(PIECE, color.toLowerCase(), 0.45) : null;
}
function floorId(floor) {
  if (!floor || !FLOOR_PATTERNS.includes(floor.pattern)) return null;
  const c = hexOk(floor.color) ? floor.color.toLowerCase() : DEFAULT_COLOR[floor.pattern];
  return `fl-${floor.pattern}-${c.slice(1)}`;
}
function floorDefs(floors, k) {
  const n5 = (v) => Number((v * k).toFixed(2)).toString();
  const out = /* @__PURE__ */ new Map();
  for (const f of floors) {
    const id = floorId(f);
    if (!id || out.has(id)) continue;
    const c = "#" + id.split("-").pop();
    const bg = mix(ROOM, c, 0.3), ln = mix(ROOM, c, 0.5);
    const line2 = (d) => `<path d="${d}" fill="none" stroke="${ln}" stroke-width="0.7"/>`;
    let w, h, body;
    switch (f.pattern) {
      case "wood":
        w = 150;
        h = 40;
        body = line2(`M0 0H${n5(150)}M0 ${n5(20)}H${n5(150)}M0 0V${n5(20)}M${n5(75)} ${n5(20)}V${n5(40)}`);
        break;
      case "herringbone":
        w = 40;
        h = 20;
        body = line2(`M0 0L${n5(20)} ${n5(10)}L${n5(40)} 0M0 ${n5(10)}L${n5(20)} ${n5(20)}L${n5(40)} ${n5(10)}M${n5(20)} ${n5(10)}V${n5(20)}`);
        break;
      case "tiles":
        w = 60;
        h = 60;
        body = line2(`M0 0H${n5(60)}M0 0V${n5(60)}`);
        break;
      case "large_tiles":
        w = 120;
        h = 60;
        body = line2(`M0 0H${n5(120)}M0 0V${n5(60)}`);
        break;
      case "concrete":
        w = 50;
        h = 50;
        body = [[7, 11], [31, 6], [44, 29], [18, 38], [36, 45], [9, 27]].map(([x, y]) => `<circle cx="${n5(x)}" cy="${n5(y)}" r="0.6" fill="${ln}"/>`).join("");
        break;
      case "carpet":
        w = 4;
        h = 4;
        body = `<circle cx="${n5(2)}" cy="${n5(2)}" r="0.45" fill="${ln}"/>`;
        break;
    }
    out.set(id, `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${n5(w)}" height="${n5(h)}"><rect width="${n5(w)}" height="${n5(h)}" fill="${bg}"/>${body}</pattern>`);
  }
  return [...out.values()].map((p2) => "    " + p2).join("\n");
}

// generator/furniture.js
var FURNITURE_GROUPS = {
  f_bedroom: ["bed", "bed_single", "nightstand", "wardrobe", "sliding_wardrobe", "dresser", "vanity", "bench"],
  f_kids: ["crib", "changing_table", "bunk_bed", "toy_box", "play_mat", "kids_table", "high_chair"],
  f_bathroom: ["bathtub", "corner_bath", "shower", "wc", "bidet", "sink", "double_sink", "washer", "towel_rail"],
  f_kitchen: [
    "counter",
    "corner_counter",
    "kitchen_sink",
    "cooktop",
    "fridge",
    "tall_unit",
    "dishwasher",
    "island",
    "upper_cabinets",
    "bar_stool"
  ],
  f_living: [
    "sofa",
    "corner_sofa",
    "armchair",
    "ottoman",
    "coffee_table",
    "tv_unit",
    "sideboard",
    "fireplace",
    "rug",
    "plant",
    "piano"
  ],
  f_dining: ["table", "oval_table", "round_table", "chair", "dining_bench"],
  f_office: ["desk", "corner_desk", "office_chair", "bookcase", "filing_cabinet", "printer"],
  f_hall: ["shoe_cabinet", "coat_rack", "hall_bench", "mirror"],
  f_utility: ["boiler", "tank", "heat_pump", "rack", "electrical_panel", "shelf", "cabinet", "ironing_board", "box"],
  f_outdoor: ["car", "bike", "grill", "sunbed", "garden_set", "hot_tub", "trampoline"],
  f_stairs: ["stairs_straight", "stairs_l", "stairs_u", "stairs_spiral", "attic_ladder"]
};
var STAIR_KINDS = FURNITURE_GROUPS.f_stairs;
var FURNITURE_KINDS = Object.values(FURNITURE_GROUPS).flat();
var n = (v) => Number(v.toFixed(2)).toString();
var DETAIL = ' fill="#2c3a4d" stroke="#44546f"';
var rect = (x, y, w, h, rx = 0, extra = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ""}${extra}/>`;
var circle = (x, y, r, extra = "") => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"${extra}/>`;
var ellipse = (x, y, rx, ry, extra = "") => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"${extra}/>`;
var line = (x1, y1, x2, y2, extra = "") => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${extra}/>`;
var STAIR = ' fill="#1f2a3b" stroke="#6b7f9c"';
var STAIR_LINE = ' stroke="#6b7f9c" stroke-width="0.8"';
var ARROW = ' stroke="#8ea1ba" stroke-width="1.1" stroke-linecap="round"';
var treads = (xa, xb, ya, yb, k) => Array.from({ length: k - 1 }, (_, i) => line(xa, ya + (yb - ya) * (i + 1) / k, xb, ya + (yb - ya) * (i + 1) / k, STAIR_LINE)).join("");
var treadsX = (xa, xb, ya, yb, k) => Array.from({ length: k - 1 }, (_, i) => line(xa + (xb - xa) * (i + 1) / k, ya, xa + (xb - xa) * (i + 1) / k, yb, STAIR_LINE)).join("");
function head(x, y, deg, m) {
  const s = Math.max(2.5, m * 0.09);
  return `<path d="M${n(-s)} ${n(s * 1.3)} L0 0 L${n(s)} ${n(s * 1.3)}" fill="none"${ARROW} transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"/>`;
}
var upArrow = (xa, ya, xb, yb, m) => line(xa, ya, xb, yb, ARROW) + head(xb, yb, Math.round(Math.atan2(xb - xa, -(yb - ya)) * 180 / Math.PI), m);
function stairVoids(below) {
  return (below && below.furniture || []).filter((p2) => STAIR_KINDS.includes(p2.kind)).map((p2) => ({ id: p2.id + "-void", kind: "stair_void", at: p2.at, size: p2.size, rot: p2.rot || 0 }));
}
function pieceShape(kind, w, d) {
  const x0 = -w / 2, y0 = -d / 2, m = Math.min(w, d);
  switch (kind) {
    case "bed":
    case "bed_single": {
      const pw = kind === "bed" ? (w - 3 * m * 0.06) / 2 : w - 2 * m * 0.1, ph = d * 0.11, pad = kind === "bed" ? m * 0.06 : m * 0.1;
      const pillows = kind === "bed" ? [x0 + pad, x0 + 2 * pad + pw] : [x0 + pad];
      return rect(x0, y0, w, d, 4) + pillows.map((px) => rect(px, y0 + d * 0.03, pw, ph, 5, DETAIL)).join("") + line(x0, y0 + d * 0.22, x0 + w, y0 + d * 0.22);
    }
    case "nightstand":
    case "cabinet":
    case "dresser":
      return rect(x0, y0, w, d, 2);
    case "wardrobe":
      return rect(x0, y0, w, d, 1) + line(0, y0, 0, y0 + d) + line(x0, y0 + d * 0.9, x0 + w, y0 + d * 0.9);
    case "bathtub":
      return rect(x0, y0, w, d, m * 0.2) + rect(x0 + m * 0.1, y0 + m * 0.1, w - m * 0.2, d - m * 0.2, m * 0.3, DETAIL) + circle(x0 + w - m * 0.3, 0, m * 0.04);
    case "shower":
      return rect(x0, y0, w, d, 1) + line(x0, y0, x0 + w, y0 + d) + line(x0 + w, y0, x0, y0 + d) + circle(0, 0, m * 0.05, DETAIL);
    case "wc":
      return rect(x0, y0, w, d * 0.3, 2) + ellipse(0, y0 + d * 0.62, w * 0.45, d * 0.36, DETAIL);
    case "sink":
      return rect(x0, y0, w, d, 2) + ellipse(0, y0 + d * 0.55, w * 0.33, d * 0.3, DETAIL);
    case "washer":
      return rect(x0, y0, w, d, 2) + circle(0, y0 + d * 0.55, m * 0.3, DETAIL);
    case "counter":
      return rect(x0, y0, w, d, 1);
    case "fridge":
      return rect(x0, y0, w, d, 2) + line(x0, y0 + d * 0.85, x0 + w, y0 + d * 0.85);
    case "island":
      return rect(x0, y0, w, d, 2);
    case "cooktop": {
      const r = m * 0.16;
      return rect(x0, y0, w, d, 1) + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => circle(sx * w / 4, sy * d / 4, r, DETAIL)).join("");
    }
    case "sofa": {
      const back = d * 0.25, arm = Math.min(w * 0.1, d * 0.25);
      return rect(x0, y0, w, d, 4) + rect(x0 + arm, y0 + back, w - 2 * arm, d - back, 3, DETAIL);
    }
    case "corner_sofa": {
      const b = Math.min(w, d) * 0.5, s = b * 0.28;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d)} H${n(x0)} Z"/><path d="M${n(x0 + s)} ${n(y0 + s)} H${n(x0 + w - s)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d - s * 0.3)} H${n(x0 + s)} Z"${DETAIL}/>`;
    }
    case "armchair": {
      const back = d * 0.25, arm = w * 0.18;
      return rect(x0, y0, w, d, 5) + rect(x0 + arm, y0 + back, w - 2 * arm, d - back - 2, 4, DETAIL);
    }
    case "coffee_table":
    case "table":
    case "desk":
      return rect(x0, y0, w, d, kind === "desk" ? 1 : 2);
    case "tv_unit":
      return rect(x0, y0, w, d, 1) + line(x0 + w / 3, y0, x0 + w / 3, y0 + d) + line(x0 + 2 * w / 3, y0, x0 + 2 * w / 3, y0 + d);
    case "round_table":
      return ellipse(0, 0, w / 2, d / 2);
    case "chair":
      return rect(x0, y0, w, d * 0.18, 2, DETAIL) + rect(x0 + w * 0.06, y0 + d * 0.2, w * 0.88, d * 0.8, 3);
    case "office_chair":
      return circle(0, d * 0.06, m * 0.4, DETAIL) + `<path d="M${n(-m * 0.4)} ${n(y0 + d * 0.2)} A${n(m * 0.5)} ${n(m * 0.5)} 0 0 1 ${n(m * 0.4)} ${n(y0 + d * 0.2)}" fill="none" stroke="#5a6b86" stroke-width="3" stroke-linecap="round"/>`;
    case "bookcase":
    case "shelf": {
      const k = Math.max(2, Math.round(w / (kind === "shelf" ? 25 : 30)));
      return rect(x0, y0, w, d, 1) + Array.from({ length: k - 1 }, (_, i) => line(x0 + w * (i + 1) / k, y0, x0 + w * (i + 1) / k, y0 + d)).join("");
    }
    // --- bedroom, kids
    case "sliding_wardrobe":
      return rect(x0, y0, w, d, 1) + line(x0 + 2, y0 + d * 0.62, 2, y0 + d * 0.62) + line(-2, y0 + d * 0.78, x0 + w - 2, y0 + d * 0.78);
    case "vanity":
      return rect(x0, y0, w, d, 2) + ellipse(0, y0 + 1.5, w * 0.3, 1.5, DETAIL);
    case "bench":
    case "hall_bench":
    case "dining_bench":
    case "ottoman":
    case "toy_box":
      return rect(x0, y0, w, d, m * 0.15);
    case "crib": {
      const k = Math.max(3, Math.round(w / 4));
      return rect(x0, y0, w, d, 2) + rect(x0 + m * 0.08, y0 + m * 0.08, w - m * 0.16, d - m * 0.16, 2, DETAIL) + Array.from({ length: k - 1 }, (_, i) => line(x0 + w * (i + 1) / k, y0, x0 + w * (i + 1) / k, y0 + m * 0.08)).join("");
    }
    case "changing_table":
      return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.08, y0 + d * 0.12, w * 0.84, d * 0.76, m * 0.2, DETAIL);
    case "bunk_bed":
      return rect(x0, y0, w, d, 3) + rect(x0 + w * 0.12, y0 + d * 0.03, w * 0.76, d * 0.11, 4, DETAIL) + line(x0, y0 + d * 0.22, x0 + w, y0 + d * 0.22) + line(x0 + w * 0.15, y0 + d, x0 + w * 0.15, y0 + d * 0.6) + line(x0 + w * 0.3, y0 + d, x0 + w * 0.3, y0 + d * 0.6);
    case "play_mat":
      return rect(x0, y0, w, d, m * 0.1, ' fill="none" stroke-dasharray="4 3"');
    case "kids_table":
      return rect(x0, y0, w, d, m * 0.25);
    case "high_chair":
      return rect(x0, y0, w, d, m * 0.2) + rect(x0 + w * 0.2, y0 + d * 0.25, w * 0.6, d * 0.5, 3, DETAIL);
    // --- bathroom
    case "corner_bath":
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + d * 0.45)} A${n(w * 0.55)} ${n(d * 0.55)} 0 0 1 ${n(x0 + w * 0.45)} ${n(y0 + d)} H${n(x0)} Z"/><path d="M${n(x0 + m * 0.1)} ${n(y0 + m * 0.1)} H${n(x0 + w - m * 0.1)} V${n(y0 + d * 0.45)} A${n(w * 0.45)} ${n(d * 0.45)} 0 0 1 ${n(x0 + w * 0.45)} ${n(y0 + d - m * 0.1)} H${n(x0 + m * 0.1)} Z"${DETAIL}/>`;
    case "bidet":
      return rect(x0, y0, w, d * 0.25, 2) + ellipse(0, y0 + d * 0.6, w * 0.45, d * 0.36, DETAIL) + circle(0, y0 + d * 0.42, m * 0.06);
    case "double_sink":
      return rect(x0, y0, w, d, 2) + ellipse(-w / 4, y0 + d * 0.55, w * 0.16, d * 0.3, DETAIL) + ellipse(w / 4, y0 + d * 0.55, w * 0.16, d * 0.3, DETAIL);
    case "towel_rail":
      return rect(x0, y0, w, d, 1) + line(x0 + w * 0.25, y0, x0 + w * 0.25, y0 + d) + line(x0 + w * 0.5, y0, x0 + w * 0.5, y0 + d) + line(x0 + w * 0.75, y0, x0 + w * 0.75, y0 + d);
    // --- kitchen
    case "corner_counter": {
      const t = Math.min(d, w) * 0.33;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + t)} H${n(x0 + t)} V${n(y0 + d)} H${n(x0)} Z"/>`;
    }
    case "kitchen_sink":
      return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.1, y0 + d * 0.15, w * 0.48, d * 0.7, 3, DETAIL) + rect(x0 + w * 0.64, y0 + d * 0.15, w * 0.26, d * 0.7, 2) + circle(x0 + w * 0.34, y0 + d * 0.08, m * 0.04);
    case "tall_unit":
      return rect(x0, y0, w, d, 1) + line(x0, y0, x0 + w, y0 + d) + line(x0 + w, y0, x0, y0 + d);
    case "dishwasher":
      return rect(x0, y0, w, d, 1) + line(x0 + w * 0.15, y0 + d * 0.88, x0 + w * 0.85, y0 + d * 0.88);
    case "upper_cabinets":
      return rect(x0, y0, w, d, 1, ' fill="none" stroke-dasharray="4 3"');
    case "bar_stool":
      return circle(0, 0, m * 0.45, DETAIL);
    // --- living
    case "sideboard":
    case "shoe_cabinet":
    case "filing_cabinet": {
      const k = Math.max(2, Math.round(w / (kind === "filing_cabinet" ? 100 : 30)));
      return rect(x0, y0, w, d, 1) + Array.from({ length: k - 1 }, (_, i) => line(x0 + w * (i + 1) / k, y0, x0 + w * (i + 1) / k, y0 + d)).join("") + (kind === "filing_cabinet" ? line(x0, y0 + d * 0.5, x0 + w, y0 + d * 0.5) : "");
    }
    case "fireplace":
      return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.2, y0, w * 0.6, d * 0.65, 1, DETAIL);
    case "rug":
      return rect(x0, y0, w, d, 1, ' fill="none" stroke-dasharray="6 4"') + rect(x0 + m * 0.06, y0 + m * 0.06, w - m * 0.12, d - m * 0.12, 1, ' fill="none"');
    case "plant":
      return circle(0, 0, m * 0.25, DETAIL) + [0, 60, 120, 180, 240, 300].map((a) => {
        const r = a * Math.PI / 180;
        return ellipse(Math.cos(r) * m * 0.3, Math.sin(r) * m * 0.3, m * 0.18, m * 0.09, ` transform="rotate(${a} ${n(Math.cos(r) * m * 0.3)} ${n(Math.sin(r) * m * 0.3)})"`);
      }).join("");
    case "piano":
      return rect(x0, y0, w, d * 0.55, 1) + rect(x0, y0 + d * 0.55, w, d * 0.2, 1, DETAIL) + rect(-w * 0.15, y0 + d * 0.78, w * 0.3, d * 0.22, 2);
    // --- dining, office
    case "oval_table":
      return ellipse(0, 0, w / 2, d / 2);
    case "corner_desk": {
      const t = Math.min(w, d) * 0.45;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + t)} H${n(x0 + t)} V${n(y0 + d)} H${n(x0)} Z"/>`;
    }
    case "printer":
      return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.15, y0 + d * 0.6, w * 0.7, d * 0.3, 1, DETAIL);
    // --- hall
    case "coat_rack": {
      const k = Math.max(3, Math.round(w / 12));
      return line(x0, 0, x0 + w, 0) + Array.from({ length: k }, (_, i) => circle(x0 + w * (i + 0.5) / k, 0, m * 0.15, DETAIL)).join("");
    }
    case "mirror":
      return rect(x0, y0, w, Math.max(d, 1), 0.5, DETAIL);
    // --- utility
    case "heat_pump":
      return rect(x0, y0, w, d, 2) + circle(w * 0.15, 0, m * 0.38, DETAIL) + line(x0 + w * 0.08, y0 + d * 0.3, x0 + w * 0.35, y0 + d * 0.3);
    case "rack":
      return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.1, y0 + d * 0.1, w * 0.8, d * 0.8, 1, DETAIL) + line(x0 + w * 0.1, y0 + d * 0.3, x0 + w * 0.9, y0 + d * 0.3) + line(x0 + w * 0.1, y0 + d * 0.5, x0 + w * 0.9, y0 + d * 0.5);
    case "electrical_panel":
      return rect(x0, y0, w, d, 1) + line(x0 + w * 0.1, y0 + d * 0.5, x0 + w * 0.9, y0 + d * 0.5, ' stroke-dasharray="2 2"');
    case "ironing_board":
      return `<path d="M${n(x0)} ${n(y0 + d * 0.15)} H${n(x0 + w * 0.7)} Q${n(x0 + w)} ${n(0)} ${n(x0 + w * 0.7)} ${n(y0 + d * 0.85)} H${n(x0)} Z"/>`;
    // --- outdoor
    case "car":
      return rect(x0, y0, w, d, m * 0.25) + rect(x0 + w * 0.1, y0 + d * 0.22, w * 0.8, d * 0.2, m * 0.08, DETAIL) + rect(x0 + w * 0.12, y0 + d * 0.66, w * 0.76, d * 0.14, m * 0.06, DETAIL) + [[-1, 0.2], [1, 0.2], [-1, 0.8], [1, 0.8]].map(([sx, fy]) => rect(sx < 0 ? x0 - 2 : x0 + w - 2, y0 + d * fy - d * 0.06, 4, d * 0.12, 1)).join("");
    case "bike":
      return ellipse(0, y0 + d * 0.18, w * 0.12, d * 0.17) + ellipse(0, y0 + d * 0.82, w * 0.12, d * 0.17) + line(0, y0 + d * 0.18, 0, y0 + d * 0.82) + line(-w * 0.4, y0 + d * 0.15, w * 0.4, y0 + d * 0.15);
    case "grill":
      return rect(x0, y0, w, d, 3) + ellipse(0, 0, w * 0.3, d * 0.35, DETAIL);
    case "sunbed":
      return rect(x0, y0, w, d, m * 0.12) + rect(x0 + w * 0.08, y0 + d * 0.04, w * 0.84, d * 0.28, m * 0.1, DETAIL);
    case "garden_set": {
      const r = m * 0.25;
      return circle(0, 0, r) + [0, 90, 180, 270].map((a) => {
        const t = a * Math.PI / 180, cx = Math.sin(t) * (r + m * 0.13), cy = -Math.cos(t) * (r + m * 0.13);
        return rect(cx - m * 0.1, cy - m * 0.1, m * 0.2, m * 0.2, 2, DETAIL);
      }).join("");
    }
    case "hot_tub":
      return rect(x0, y0, w, d, m * 0.12) + circle(0, 0, m * 0.38, DETAIL);
    case "trampoline":
      return ellipse(0, 0, w / 2, d / 2) + ellipse(0, 0, w * 0.42, d * 0.42, DETAIL);
    case "boiler":
      return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.85, y0, w * 0.15, d, 1, DETAIL);
    // --- stairs: treads and an arrow up (from the start, +y, to the top, -y)
    case "stairs_straight": {
      const k = Math.max(3, Math.round(d / 15));
      return rect(x0, y0, w, d, 0, STAIR) + treads(x0, x0 + w, y0, y0 + d, k) + upArrow(0, y0 + d - m * 0.15, 0, y0 + m * 0.15, m);
    }
    case "stairs_l": {
      const b = Math.min(w, d) * 0.45, k1 = Math.max(3, Math.round((d - b) / 15)), k2 = Math.max(3, Math.round((w - b) / 15));
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d)} H${n(x0)} Z"${STAIR}/>` + treads(x0, x0 + b, y0 + b, y0 + d, k1) + treadsX(x0 + b, x0 + w, y0, y0 + b, k2) + `<path d="M${n(x0 + b / 2)} ${n(y0 + d - m * 0.1)} V${n(y0 + b / 2)} H${n(x0 + w - m * 0.12)}" fill="none"${ARROW}/>` + head(x0 + w - m * 0.12, y0 + b / 2, 90, m);
    }
    case "stairs_u": {
      const b = w * 0.46, land = Math.min(d * 0.3, w * 0.45), k = Math.max(3, Math.round((d - land) / 15));
      return rect(x0, y0, w, d, 0, STAIR) + line(x0 + b, y0 + land, x0 + b, y0 + d) + line(x0 + w - b, y0 + land, x0 + w - b, y0 + d) + treads(x0, x0 + b, y0 + land, y0 + d, k) + treads(x0 + w - b, x0 + w, y0 + land, y0 + d, k) + `<path d="M${n(x0 + b / 2)} ${n(y0 + d - m * 0.08)} V${n(y0 + land / 2)} H${n(x0 + w - b / 2)} V${n(y0 + d - m * 0.15)}" fill="none"${ARROW}/>` + head(x0 + w - b / 2, y0 + d - m * 0.15, 180, m);
    }
    case "stairs_spiral": {
      const R = m / 2, k = 12;
      return circle(0, 0, R, STAIR) + circle(0, 0, R * 0.14, DETAIL) + Array.from({ length: k }, (_, i) => {
        const a = i * 2 * Math.PI / k;
        return line(Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14, Math.cos(a) * R, Math.sin(a) * R, ' stroke-width="0.7"');
      }).join("") + // three quarters round, clockwise from the bottom
      `<path d="M0 ${n(R * 0.6)} A${n(R * 0.6)} ${n(R * 0.6)} 0 1 1 ${n(R * 0.6)} 0" fill="none"${ARROW}/>` + head(R * 0.6, 0, 180, m * 0.6);
    }
    case "attic_ladder": {
      const k = Math.max(4, Math.round(d / 9));
      return rect(x0, y0, w, d, 0, ' fill="none" stroke-dasharray="4 3"') + line(x0 + w * 0.2, y0 + d * 0.06, x0 + w * 0.2, y0 + d * 0.94, STAIR_LINE) + line(x0 + w * 0.8, y0 + d * 0.06, x0 + w * 0.8, y0 + d * 0.94, STAIR_LINE) + Array.from({ length: k }, (_, i) => line(x0 + w * 0.2, y0 + d * (i + 0.5) / k, x0 + w * 0.8, y0 + d * (i + 0.5) / k, STAIR_LINE)).join("") + upArrow(0, y0 + d * 0.85, 0, y0 + d * 0.15, m * 1.4);
    }
    // the floor above: the opening the stairs come up through, an arrow down
    case "stair_void":
      return rect(x0, y0, w, d, 0, ' fill="#131a24" stroke-dasharray="5 3"') + line(x0, y0 + d, x0 + w, y0, ' stroke-width="0.7"') + upArrow(0, y0 + m * 0.2, 0, y0 + d - m * 0.2, m);
    case "tank":
      return rect(x0, y0, w, d, 2) + circle(0, 0, m * 0.42, DETAIL);
    default:
      return rect(x0, y0, w, d, 2);
  }
}
function drawnShape(parts, w, d) {
  return (parts || []).map((q) => {
    const extra = q.detail ? DETAIL : "";
    if (q.t === "rect") return rect(q.x * w, q.y * d, q.w * w, q.h * d, (q.r || 0) * Math.min(w, d), extra);
    if (q.t === "ellipse") return ellipse(q.cx * w, q.cy * d, Math.abs(q.rx * w), Math.abs(q.ry * d), extra);
    if (q.t === "poly" && Array.isArray(q.pts) && q.pts.length >= 3)
      return `<polygon points="${q.pts.map(([x, y]) => n(x * w) + "," + n(y * d)).join(" ")}"${extra}/>`;
    return "";
  }).join("");
}
function pieceSvg(p2) {
  const fill = pieceFill(p2.color);
  const svg = pieceSvgBare(p2);
  if (!fill) return svg;
  return svg.replace(/^(\s*<g\b)([^>]*)>/, (all, head2, attrs2) => /\sfill="[^"]*"/.test(attrs2) ? `${head2}${attrs2.replace(/\sfill="[^"]*"/, ` fill="${fill}"`)}>` : `${head2} fill="${fill}"${attrs2}>`);
}
function pieceSvgBare(p2) {
  const rot = p2.rot || 0;
  if (p2.kind === "custom" && p2.svg) {
    const o = p2.origin || p2.at;
    const dx = p2.at[0] - o[0], dy = p2.at[1] - o[1];
    if (Math.abs(dx) < 5e-3 && Math.abs(dy) < 5e-3 && !rot) return p2.svg;
    const tf = (Math.abs(dx) >= 5e-3 || Math.abs(dy) >= 5e-3 ? `translate(${n(dx)} ${n(dy)})` : "") + (rot ? `${dx || dy ? " " : ""}rotate(${n(rot)} ${n(o[0])} ${n(o[1])})` : "");
    return p2.svg.replace(
      /^(\s*<g\b[^>]*?)(\s+transform="([^"]*)")?(\s*\/?>)/,
      (all, head2, _t, own, end) => `${head2} transform="${tf}${own ? " " + own : ""}"${end}`
    );
  }
  const [w, d] = p2.size;
  const shape = p2.kind === "drawn" ? drawnShape(p2.parts, w, d) : pieceShape(p2.kind, w, d);
  return `<g id="${p2.id}" transform="translate(${n(p2.at[0])} ${n(p2.at[1])})${rot ? ` rotate(${n(rot)})` : ""}">${shape}</g>`;
}
function furnitureLayer(pieces) {
  if (!pieces || !pieces.length) return "";
  return `  <g id="furniture" pointer-events="none" fill="#243040" stroke="#3a4861"
     stroke-width="1.2" stroke-linejoin="round">
` + pieces.map((p2) => "    " + pieceSvg(p2).trim()).join("\n") + "\n  </g>";
}

// generator/theme.js
function style(N3) {
  return `  <style>
    /* Doors drawn as openings only: the class hides leaves and swings, the
       geometry stays in the file - removing the class brings them back. */
    .${N3.noSymbol} line,
    .${N3.noSymbol} path { display: none; }
    /* Door lock: locked (cool grey), amber while held, open (red). */
    .${N3.lock} { fill: #8ea1ba; stroke: #8ea1ba; stroke-width: 1.4; cursor: pointer; }
    .${N3.lock} path { fill: none; stroke-linecap: round; }
    .${N3.lock} .${N3.lockHit} { fill: transparent; stroke: none; }
    .${N3.lock} .${N3.lockKeyhole} { fill: #131a24; stroke: none; }
    .${N3.lock} .${N3.lockOpen} { display: none; }
    .${N3.lock}.${N3.isOpen} .${N3.lockClosed} { display: none; }
    .${N3.lock}.${N3.isOpen} .${N3.lockOpen} { display: inline; }
    .${N3.lock}.${N3.isOpen} { fill: #e57373; stroke: #e57373; }
    .${N3.lock}.${N3.isArmed} { fill: #ffab40; stroke: #ffab40; }
    .light.on { fill: #ffc300; stroke: #ffc300; }
    .light.on .glow { opacity: 1; }
    .light.on .glow-dim { opacity: 0.55; }
    .light.on .bulb { filter: url(#bulb-glow); }
    .light.on ~ .bulb-shared:not(.chandelier) { fill: #ffc300; stroke: #ffc300; filter: url(#bulb-glow); }
    /* a chandelier: its arms light with either circuit, each bulb with its own circuit (the hub stays dark) */
    .chandelier .ch-arm { fill: none; stroke-width: 0.7; stroke-linecap: round; }
    .chandelier .ch-hub { stroke: none; }
    .chandelier .ch-b { stroke: none; }
    .light.on ~ .chandelier { stroke: #ffc300; }
    .light.circuit-small.on ~ .chandelier .ch-1, .light.circuit-large.on ~ .chandelier .ch-3 { fill: #ffc300; filter: url(#bulb-glow); }
    .light[data-kind="night"].on { fill: #ffab40; stroke: #ffab40; }
    /* room names are hidden; a class on the layer shows them */
    #room-labels.${N3.isShown} { display: inline; }
    .glow { pointer-events: none; }

    /* Climate readings are clickable: bounding-box, or only the glyphs
       themselves would take the click. */
    #room-climate text { pointer-events: bounding-box; cursor: pointer; }

    /* Appliances: class "on" while running; the labels are filled by the
       card and emptied when there is nothing to say. */
    .${N3.applianceGlow} { opacity: 0; transition: opacity 0.6s ease; }
    .${N3.appliance}.on .${N3.applianceGlow} { opacity: 1; }
    .${N3.snowflake} { fill: none; stroke: #6f8fb0; stroke-width: 1.2;
                    stroke-linecap: round; transition: stroke 0.4s ease; }
    .${N3.appliance}.on .${N3.snowflake} { stroke: #e57373; }
    /* A label sits on the drawing of the machine: an outline in the
       background colour (paint-order: stroke) keeps the digits readable. */
    .${N3.deviceLabel} { fill: #c3cfdf; font-size: 10px; font-weight: 500;
                  font-variant-numeric: tabular-nums; cursor: pointer;
                  paint-order: stroke; stroke: #1b2433; stroke-width: 3px;
                  stroke-linejoin: round; }
    .${N3.deviceLabel}.${N3.isDone} { fill: #7ddba0; }

    .${N3.sensorBody} { fill: #5b6a80; stroke: #5b6a80; stroke-width: 0.8; }
    .${N3.presence}.${N3.isDetected} .${N3.sensorBody} { fill: #7ddba0; stroke: #7ddba0; }
    .${N3.presence}.${N3.isUnknown} .${N3.sensorBody}    { opacity: 0.35; }

    /* Presence shows as spreading rings, not just a colour - movement is
       seen from the corner of the eye. transform-box: fill-box scales each
       ring around itself; without it the origin is the corner of the plan. */
    .${N3.wave} {
      fill: none; stroke: #7ddba0; stroke-width: 1.1; opacity: 0;
      transform-box: fill-box; transform-origin: center;
    }
    .${N3.presence}.${N3.isDetected} .${N3.wave} { animation: ${N3.waveKeyframes} 2.6s ease-out infinite; }
    .${N3.presence}.${N3.isDetected} .${N3.wave}.f2 { animation-delay: 0.87s; }
    .${N3.presence}.${N3.isDetected} .${N3.wave}.f3 { animation-delay: 1.74s; }
    /* movement pulses faster than still presence */
    .${N3.presence}.${N3.isDetected}.${N3.isMoving} .${N3.wave} { animation-duration: 1.5s; }
    .${N3.presence}.${N3.isDetected}.${N3.isMoving} .${N3.wave}.f2 { animation-delay: 0.5s; }
    .${N3.presence}.${N3.isDetected}.${N3.isMoving} .${N3.wave}.f3 { animation-delay: 1.0s; }

    @keyframes ${N3.waveKeyframes} {
      0%   { transform: scale(0.26); opacity: 0.7; }
      70%  { opacity: 0.22; }
      100% { transform: scale(1); opacity: 0; }
    }

    /* reduced motion: one still ring instead of the animation */
    @media (prefers-reduced-motion: reduce) {
      .${N3.presence}.${N3.isDetected} .${N3.wave} { animation: none; opacity: 0.35; }
      .${N3.presence}.${N3.isDetected} .${N3.wave}.f2, .${N3.presence}.${N3.isDetected} .${N3.wave}.f3 { opacity: 0; }
    }

    .${N3.hitArea} { fill: transparent; stroke: none; cursor: pointer; }
    /* Cameras: the fan is see-through so walls and outdoor lights show
       through it, and it takes no clicks (it covers the plan margin) - only
       the marker does. */
    #cameras { pointer-events: none; }
    .${N3.cameraHit} { fill: transparent; stroke: none; pointer-events: all; cursor: pointer; }
    /* the fan's fill is its own gradient (fading with distance); only a faint edge */
    .${N3.cameraFan} { fill: #a99be0; fill-opacity: 1; stroke: #a99be0;
                   stroke-opacity: 0.25; stroke-width: 0.6; stroke-linejoin: round; }
    .${N3.cameraMark} { fill: #a99be0; stroke: #131a24; stroke-width: 1.2; }
    .camera-icon { fill: #131a24; }
    .${N3.camera}[data-off-plan] .${N3.cameraFan} { stroke-dasharray: 3 2; }

    .${N3.acGlow} { opacity: 0; transition: opacity 0.8s ease; }
    .${N3.ac}.${N3.isCooling} .${N3.acCool} { opacity: 1; }
    .${N3.ac}.${N3.isHeating}  .${N3.acHeat} { opacity: 1; }

    .tv-glow { opacity: 0; transition: opacity 0.6s ease; }
    .tv.on .tv-glow { opacity: 1; }

    .cover-hit { stroke: transparent; stroke-width: 16; fill: none; cursor: pointer; }

    /* A cover is a slatted band along the WHOLE window that gets THINNER as
       it opens: the card sets scale(1 u) on the band, u = the covered part
       (a cover hides the full width on part of the height, so shortening the
       band along the window would lie). The band is centred on the opening,
       so it scales around its own (0,0) - set as an ATTRIBUTE, because in
       CSS transform-box: view-box would put the origin at the plan's corner. */
    .${N3.coverBand} { pointer-events: none; }
    .${N3.coverBandScale} { transition: transform 0.4s ease; }
    .${N3.coverFabric} { fill: #8fa3bd; stroke: none; }
    .${N3.coverSlat} { stroke: #131a24; stroke-width: 0.8; }

    .${N3.coverIcon} { fill: #5b6a80; stroke: #5b6a80; stroke-width: 0.7;
                   cursor: pointer; }
    .${N3.coverIconClosed} { display: none; }
    .cover.${N3.isCovered} .${N3.coverIconClosed} { display: inline; fill: #8fa3bd; stroke: #8fa3bd; }
    .cover.${N3.isCovered} .${N3.coverIconOpen} { display: none; }
    .cover.${N3.isUnknown} .${N3.coverIcon} { opacity: 0.3; }
    /* amber while held: the hold gesture was recognised */
    .cover.${N3.isArmed} .${N3.coverIcon} { fill: #ffab40; stroke: #ffab40; }
    /* a moving cover: a blinking arrow (up / down) instead of its icon */
    .cover-move { display: none; pointer-events: none; }
    .cover-move path { fill: #8fa3bd; stroke: none; display: none; }
    .cover.moving-up .cover-move, .cover.moving-down .cover-move { display: inline; animation: cover-blink 1s steps(2, start) infinite; }
    .cover.moving-up .cover-move-up, .cover.moving-down .cover-move-down { display: inline; }
    .cover.moving-up .${N3.coverIcon}, .cover.moving-down .${N3.coverIcon} { display: none; }
    @keyframes cover-blink { to { visibility: hidden; } }

    /* A roof window: glass seen from above; its cover darkens it as it closes (the card sets --sky). */
    .skylight .sky-glass { fill: none; stroke: #6fc9ef; stroke-width: 1.2; cursor: pointer; }
    .skylight .sky-bar { stroke: #6fc9ef; stroke-width: 0.7; stroke-opacity: 0.6; pointer-events: none; }
    .skylight .sky-cover { fill: #8fa3bd; fill-opacity: 0; transition: fill-opacity 0.4s; }
    .skylight.${N3.isCovered} .sky-cover { fill-opacity: var(--sky, 0.55); }
    .skylight.${N3.isOpen} .sky-glass { stroke: #e57373; }

    /* Window / door contacts: an open (or tilted) sash or door turns red. */
    .${N3.paneTick} { stroke: #6fc9ef; stroke-width: 0.8; }
    .${N3.isOpen} > .${N3.pane}, .${N3.isOpen} > line, .${N3.pane}.${N3.isOpen} { stroke: #e57373; }
    .${N3.isTilted} > .${N3.pane}, .${N3.pane}.${N3.isTilted} { stroke: #e57373; stroke-dasharray: 2 1.5; }

    /* Rooms coloured by an entity: classes for on/off states; continuous
       values (temperature, CO2) get their fill from the card. */
    #rooms polygon.${N3.isHeating} { fill: #33282b; }
    #rooms polygon.${N3.isOccupied} { fill: #22302a; }

    /* Detection range of a motion / presence sensor. */
    .climate-icon.alt { display: none; }
    .tv-mount { fill: #2a3547; stroke: #5b6a80; stroke-width: 0.4; }
    .tv-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .tv-screen { stroke: #6fc9ef; stroke-width: 1.2; stroke-linecap: round; opacity: 0.55; }
    .tv.on .tv-screen { opacity: 1; }
    .ac-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .ac-louvre { stroke: #5b6a80; stroke-width: 0.5; }
    .ac-led { fill: #5b6a80; }
    .unit-body { fill: #1b2433; stroke: #8ea1ba; stroke-width: 0.6; }
    .unit-line, .unit-rack { stroke: #5b6a80; stroke-width: 0.5; fill: none; }
    .unit-rack { stroke-dasharray: 1.2 0.8; }
    .unit-door { fill: none; stroke: #8ea1ba; stroke-width: 0.6; }
    .unit-glass { fill: #24324a; stroke: #5b6a80; stroke-width: 0.4; }
    .unit-knob, .unit-duct { fill: none; stroke: #8ea1ba; stroke-width: 0.5; }
    .unit-handle { stroke: #8ea1ba; stroke-width: 1; stroke-linecap: round; }
    .unit-arrow { stroke-width: 0.8; }
    .unit-heat { stroke: #e57373; stroke-width: 0.5; }
    .rack-unit { fill: #24324a; stroke: #8ea1ba; stroke-width: 0.4; }
    .rack-empty { fill: none; stroke: #5b6a80; stroke-width: 0.4; stroke-dasharray: 1 0.8; }
    .rack-led { fill: #5b6a80; }
    .${N3.appliance}.on .rack-led { fill: #7ccf8a; }
    .unit-cold { stroke: #6fc9ef; stroke-width: 0.6; stroke-linecap: round; }
    .unit-zone { fill: none; stroke: #8ea1ba; stroke-width: 0.5; }
    .${N3.appliance}.on .unit-zone { stroke: #e57373; }
    .unit-above { fill: none; stroke-dasharray: 2 1.4; }
    .unit-cup { fill: #8ea1ba; stroke: none; }
    .unit-led { fill: #5b6a80; stroke: none; }
    .${N3.appliance}.on .unit-led { fill: #6fc9ef; }
    .unit-throw { fill: #c3cfdf; fill-opacity: 0; stroke: none; transition: fill-opacity 0.6s ease; }
    .${N3.appliance}.on .unit-throw { fill-opacity: 0.12; }
    /* a washer-dryer stack: each half lit while its own machine runs */
    .unit-half { fill: #ffab40; fill-opacity: 0; stroke: none; transition: fill-opacity 0.6s ease; }
    .${N3.appliance}.on > .dev-shape .unit-half, .${N3.appliance}.on > g > .unit-half { fill-opacity: 0.22; }
    .${N3.sensorFan} { fill: #7ddba0; fill-opacity: 0.05; stroke: #7ddba0; stroke-opacity: 0.35;
                      stroke-width: 0.6; stroke-linejoin: round; pointer-events: none; }
    .${N3.presence}.${N3.isDetected} .${N3.sensorFan} { fill-opacity: 0.16; }
    .${N3.motion} .${N3.sensorFan} { fill: #e57373; stroke: #e57373; }
    .${N3.motion}.on .${N3.sensorFan} { fill-opacity: 0.22; }
    .${N3.motion}.on .${N3.sensorBody} { fill: #e57373; stroke: #e57373; }

    /* Devices drawn as an icon in a badge. */
    .ia-red { fill: #e57373; } .ia-yellow { fill: #ffc300; } .ia-blue { fill: #6fc9ef; stroke: #6fc9ef; } .ia-green { fill: #7ddba0; }
    .ia-blue[fill="none"], .ia-red[fill="none"] { fill: none; }
    .${N3.iconBadge} { fill: #1b2433; stroke: #5b6a80; stroke-width: 0.8; cursor: pointer; }
    .${N3.iconGlyph} { fill: none; stroke: #8ea1ba; stroke-width: 0.9; stroke-linejoin: round;
                      stroke-linecap: round; color: #8ea1ba; pointer-events: none; }
    .${N3.deviceGlow} { opacity: 0; transition: opacity 0.6s ease; }
    .${N3.iconDevice}.on .${N3.deviceGlow}, .${N3.iconDevice}.${N3.isAlarm} .${N3.deviceGlow} { opacity: 1; }
    .${N3.iconDevice}.on .${N3.iconGlyph} { stroke: #ffab40; color: #ffab40; }
    .${N3.iconDevice}.${N3.isAlarm} .${N3.iconBadge} { stroke: #e57373; animation: ${N3.waveKeyframes}-alarm 1s ease-in-out infinite; }
    .${N3.iconDevice}.${N3.isAlarm} .${N3.iconGlyph} { stroke: #e57373; color: #e57373; }
    @keyframes ${N3.waveKeyframes}-alarm { 50% { stroke-width: 2.2; } }
    /* a fan turns while on; the card sets --fp-spin from its speed */
    .${N3.iconDevice}[data-kind="fan"].on .${N3.iconGlyph} { transform-box: fill-box; transform-origin: center;
      animation: ${N3.waveKeyframes}-spin var(--fp-spin, 1.6s) linear infinite; }
    @keyframes ${N3.waveKeyframes}-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .${N3.iconDevice}[data-kind="fan"].on .${N3.iconGlyph} { animation: none; } }
    /* a thermostat / TRV / A/C drawn as an icon: coral while heating, cyan while cooling */
    .${N3.iconDevice}.${N3.isHeating} .${N3.iconGlyph} { stroke: #ff9166; color: #ff9166; }
    .${N3.iconDevice}.${N3.isCooling} .${N3.iconGlyph} { stroke: #5fd6e8; color: #5fd6e8; }
    .${N3.iconDevice}.${N3.isHeating} .${N3.deviceGlow} { opacity: 1; fill: url(#${N3.acHeatPool}); }
    .${N3.iconDevice}.${N3.isCooling} .${N3.deviceGlow} { opacity: 1; fill: url(#${N3.acCoolPool}); }
    .${N3.deviceValue} { fill: #c3cfdf; font-size: 8px; font-family: system-ui, sans-serif; text-anchor: middle;
                        dominant-baseline: middle; paint-order: stroke; stroke: #1b2433; stroke-width: 2.5px;
                        stroke-linejoin: round; pointer-events: none; }
  </style>`;
}
function defs(N3) {
  return `    <radialGradient id="${N3.appliancePool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffab40" stop-opacity="0.22"/>
      <stop offset="45%"  stop-color="#ffab40" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffab40" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="alarm-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#e57373" stop-opacity="0.32"/>
      <stop offset="45%"  stop-color="#e57373" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#e57373" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${N3.acCoolPool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#5fd6e8" stop-opacity="0.30"/>
      <stop offset="40%"  stop-color="#5fd6e8" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#5fd6e8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${N3.acHeatPool}" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ff9166" stop-opacity="0.30"/>
      <stop offset="40%"  stop-color="#ff9166" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#ff9166" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tv-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#8fd3ff" stop-opacity="0.30"/>
      <stop offset="35%"  stop-color="#8fd3ff" stop-opacity="0.17"/>
      <stop offset="70%"  stop-color="#8fd3ff" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#8fd3ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="light-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffc300" stop-opacity="0.34"/>
      <stop offset="35%"  stop-color="#ffc300" stop-opacity="0.20"/>
      <stop offset="70%"  stop-color="#ffc300" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffc300" stop-opacity="0"/>
    </radialGradient>
    <!-- night lights near the floor: warmer and much weaker -->
    <radialGradient id="night-pool" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="#ffab40" stop-opacity="0.26"/>
      <stop offset="40%"  stop-color="#ffab40" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="#ffab40" stop-opacity="0"/>
    </radialGradient>
    <filter id="bulb-glow" x="-400%" y="-400%" width="900%" height="900%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <g id="bulb">
      <circle cx="0" cy="-1.8" r="3.2" stroke="none"/>
      <path d="M-1.9 0.5C-1.5 1.4 -1.35 1.7 -1.35 2.5L1.35 2.5C1.35 1.7 1.5 1.4 1.9 0.5" stroke="none"/>
      <g fill="none" stroke-width="0.75" stroke-linecap="round">
        <line x1="0" y1="-6.6" x2="0" y2="-5.2"/>
        <line x1="-5.1" y1="-4.7" x2="-4" y2="-3.7"/>
        <line x1="5.1" y1="-4.7" x2="4" y2="-3.7"/>
        <line x1="-5.5" y1="-0.8" x2="-4.2" y2="-0.8"/>
        <line x1="5.5" y1="-0.8" x2="4.2" y2="-0.8"/>
        <line x1="-1.3" y1="3.2" x2="1.3" y2="3.2"/>
        <line x1="-1" y1="3.9" x2="1" y2="3.9"/>
      </g>
      <circle r="12" fill="transparent" stroke="none" pointer-events="all"/>
    </g>
    <!-- Cover state icons (as mdi:window-shutter / -shutter-open): a box with
         three slats = down, with one = rolled up. They must live in <defs>:
         as plain groups they would also draw themselves at (0,0). -->
    <g id="${N3.coverClosedIcon}">
      <rect x="-6" y="-5.6" width="12" height="3.2" rx="1.1"/>
      <line x1="-4.6" y1="-1.1" x2="4.6" y2="-1.1"/>
      <line x1="-4.6" y1="1.3" x2="4.6" y2="1.3"/>
      <line x1="-4.6" y1="3.7" x2="4.6" y2="3.7"/>
    </g>
    <g id="${N3.coverOpenIcon}">
      <rect x="-6" y="-5.6" width="12" height="3.2" rx="1.1"/>
      <line x1="-4.6" y1="-1.1" x2="4.6" y2="-1.1"/>
    </g>
`;
}

// generator/names.js
var NAMES = {
  // groups and shared definitions
  rotation: "plan",
  // the group rotated by canvas.rotate
  deviceLabels: "device-labels",
  // layer with appliance labels
  coverClosedIcon: "cover-closed",
  // <defs> icon of a closed cover
  coverOpenIcon: "cover-open",
  // <defs> icon of an open cover
  appliancePool: "appliance-pool",
  // gradients
  acCoolPool: "ac-cool-pool",
  acHeatPool: "ac-heat-pool",
  waveKeyframes: "presence-wave",
  // classes
  hitArea: "hit-area",
  // transparent click target of a device
  noSymbol: "no-symbol",
  // door leaves and swings hidden
  presence: "presence",
  wave: "wave",
  sensorBody: "sensor-body",
  appliance: "appliance",
  applianceGlow: "appliance-glow",
  snowflake: "icon-snowflake",
  deviceLabel: "device-label",
  ac: "ac",
  acGlow: "ac-glow",
  acCool: "ac-cool",
  acHeat: "ac-heat",
  camera: "camera",
  cameraFan: "camera-fan",
  cameraMark: "camera-mark",
  cameraHit: "camera-hit",
  lock: "lock",
  lockHit: "lock-hit",
  lockClosed: "lock-closed",
  lockOpen: "lock-open",
  lockKeyhole: "lock-keyhole",
  coverIcon: "cover-icon",
  coverIconClosed: "cover-icon-closed",
  coverIconOpen: "cover-icon-open",
  coverBand: "cover-band",
  coverBandScale: "cover-band-scale",
  coverFabric: "cover-fabric",
  coverSlat: "cover-slat",
  pane: "pane",
  // one sash of a window divided into panes
  paneTick: "pane-tick",
  motion: "motion",
  // alarm motion detector (PIR)
  sensorFan: "sensor-fan",
  // detection range of a motion / presence sensor
  iconDevice: "icon-device",
  // devices drawn as an icon (catalogue in icons.js)
  iconBadge: "icon-badge",
  iconGlyph: "icon",
  deviceGlow: "device-glow",
  deviceValue: "device-value",
  // state classes - set by the card, styled here
  isOpen: "open",
  isArmed: "armed",
  // press-and-hold in progress
  isCovered: "covered",
  isUnknown: "unknown",
  isDetected: "detected",
  isMoving: "moving",
  isCooling: "cooling",
  isHeating: "heating",
  isDone: "done",
  isShown: "shown",
  // room labels visible
  isAlarm: "alarm",
  // smoke, CO, leak... detected
  isTilted: "tilted",
  // a window tilted (contact sensors that know it)
  isOccupied: "occupied",
  // a room tinted by presence
  // data-* attributes
  attrContract: "data-contract",
  attrName: "data-name",
  attrShort: "data-short",
  attrState: "data-state",
  attrEnd: "data-end",
  attrContact: "data-entity-contact",
  // window / door contact sensor
  attrValue: "data-value-entity",
  // a reading shown next to a device
  attrTintEntity: "data-tint-entity",
  // room colouring
  attrTintKind: "data-tint-kind"
};
function resolveNames(overrides) {
  const n5 = { ...NAMES, ...overrides || {} };
  for (const k of Object.keys(overrides || {})) if (!(k in NAMES)) throw new Error("unknown name key: " + k);
  return n5;
}

// generator/icons.js
var VALUE_KINDS = ["info", "bin", "weather", "solar", "battery", "thermostat", "trv", "fan", "meter", "inverter", "ups", "lux", "rain", "water_tank"];
var ALARM_KINDS = ["smoke", "co", "leak", "gas", "siren"];
var G = {
  recuperator: '<rect x="-5" y="-4.2" width="10" height="8.4" rx="1.4"/><path class="ia-blue" d="M-4 -1.6 H2.6 M1.2 -2.8 L2.8 -1.6 L1.2 -0.4" fill="none" stroke-width="0.8"/><path class="ia-red" d="M4 1.6 H-2.6 M-1.2 0.4 L-2.8 1.6 L-1.2 2.8" fill="none" stroke="#e57373" stroke-width="0.8"/>',
  boiler: '<rect x="-4" y="-5" width="8" height="10" rx="1.2"/><rect x="-2.4" y="-0.6" width="4.8" height="3.8" rx="0.6" stroke-width="0.6"/><path class="ia-red" d="M0 -0.1 C1 1 1.2 2 0 2.8 C-1.2 2 -1 1 0 -0.1 Z" stroke="none"/><path d="M-2 -3 H2" stroke-width="0.6"/>',
  plug: '<rect x="-4.8" y="-4.8" width="9.6" height="9.6" rx="2.4"/><circle cx="0" cy="0" r="3.2" stroke-width="0.6"/><circle cx="-1.3" cy="0" r="0.55" fill="currentColor" stroke="none"/><circle cx="1.3" cy="0" r="0.55" fill="currentColor" stroke="none"/><path d="M0 -3.2 V-2.2" stroke-width="0.8"/>',
  media: '<rect x="-3.6" y="-5" width="7.2" height="10" rx="1.2"/><circle cx="0" cy="1.5" r="2.2"/><circle class="ia-blue" cx="0" cy="1.5" r="0.8" stroke="none"/><circle cx="0" cy="-2.7" r="0.8"/>',
  gate: '<path d="M-5 -3.6 H5 M-5 2.6 H5 M-3.6 -3.6 V2.6 M-1.2 -3.6 V2.6 M1.2 -3.6 V2.6 M3.6 -3.6 V2.6" stroke-width="0.7"/><circle cx="-3" cy="4" r="0.9"/><circle cx="3" cy="4" r="0.9"/>',
  smoke: '<circle cx="0" cy="0" r="4.8"/><circle cx="0" cy="0" r="2.8" stroke-width="0.5" stroke-dasharray="1 0.8"/><circle class="ia-red" cx="0" cy="0" r="0.9" stroke="none"/>',
  co: '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="2"/><text x="0" y="1.2" text-anchor="middle" font-size="3.6" font-weight="600" font-family="system-ui, sans-serif" stroke="none" fill="currentColor">CO</text><circle class="ia-yellow" cx="2.6" cy="-2.6" r="0.7" stroke="none"/>',
  leak: '<path class="ia-blue" d="M0 -5 C1.8 -2.4 3.2 -0.6 3.2 1 A3.2 3.2 0 0 1 -3.2 1 C-3.2 -0.6 -1.8 -2.4 0 -5 Z" stroke="none"/><path d="M-5 4.8 Q-2.5 3.6 0 4.8 T5 4.8" stroke-width="0.6"/>',
  air: '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="2.2"/><circle class="ia-green" cx="-1.8" cy="-1.6" r="1.1" stroke="none"/><circle class="ia-green" cx="0.8" cy="0.4" r="1.5" stroke="none"/><circle class="ia-green" cx="2.4" cy="-2.4" r="0.7" stroke="none"/><path d="M-2.8 3 H2.8" stroke-width="0.6"/>',
  thermostat: '<circle cx="0" cy="0" r="4.8"/><path d="M-3.2 2.6 A4 4 0 1 1 3.2 2.6" stroke-width="0.5" stroke-dasharray="0.6 0.9"/><path class="ia-red" d="M0 0 L2.4 -2.4 L2.9 -1.9 Z" stroke="none"/><circle cx="0" cy="0" r="0.9" fill="currentColor" stroke="none"/>',
  trv: '<path d="M-5 4.6 H5 M-4 4.6 V1 M-1.4 4.6 V1 M1.2 4.6 V1 M3.8 4.6 V1" stroke-width="0.6"/><rect x="-2" y="-5" width="4" height="5" rx="1.4"/><path d="M-2 -3.4 H2 M-2 -1.8 H2" stroke-width="0.5"/><circle class="ia-red" cx="0" cy="0.6" r="0.6" stroke="none"/>',
  fan: '<circle cx="0" cy="0" r="5.2" stroke-width="0.5"/><path d="M0 0 C1 -4.3 4.4 -3 3 -0.8 Z M0 0 C3.4 2.2 1.2 5.2 -1 4.1 Z M0 0 C-4.4 1 -4.3 -3 -2.2 -3.3 Z"/><circle cx="0" cy="0" r="0.8" fill="currentColor"/>',
  purifier: '<rect x="-3.6" y="-5" width="7.2" height="10" rx="2.6"/><path d="M-1.8 -1.6 H1.8 M-1.8 0 H1.8 M-1.8 1.6 H1.8 M-1.8 3.2 H1.8" stroke-width="0.5"/><path class="ia-blue" d="M-2 -5.6 Q0 -7 2 -5.6" stroke-width="0.7" fill="none"/>',
  vacuum: '<circle cx="0" cy="0" r="5"/><path d="M-4.2 -2.6 A5 5 0 0 1 4.2 -2.6" stroke-width="1.4"/><circle cx="0" cy="1" r="1.8" stroke-width="0.6"/><circle class="ia-green" cx="0" cy="1" r="0.6" stroke="none"/>',
  ev: '<rect x="-4.4" y="-5" width="6" height="10" rx="1.2"/><path class="ia-yellow" d="M-1 -3.2 L-2.6 0 H-1.2 L-1.8 2.8 L0 -0.4 H-1.4 Z" stroke="none"/><path d="M1.6 -1 H3.2 Q4.8 -1 4.8 1 V4.6" stroke-width="0.7"/>',
  valve: '<path d="M-5.4 1 H-2.4 M2.4 1 H5.4 M-5.4 -1 H-2.4 M2.4 -1 H5.4" stroke-width="0.6"/><path d="M-2.4 -2.6 L2.4 2.6 V-2.6 L-2.4 2.6 Z"/><path d="M0 0 V-4.4" stroke-width="0.7"/><rect class="ia-red" x="-2.4" y="-5.4" width="4.8" height="1.4" rx="0.5" stroke="none"/>',
  info: '<circle cx="0" cy="0" r="4.8"/><path d="M0 -0.6 V3"/><circle cx="0" cy="-2.6" r="0.6" fill="currentColor"/>',
  bin: '<path d="M-3.6 -3 L-2.8 4 H2.8 L3.6 -3 Z"/><path d="M-4.4 -3 H4.4 M-1.4 -3 V-4.4 H1.4 V-3" stroke-width="0.7"/><circle cx="-2.2" cy="4.6" r="0.8"/><circle cx="2.2" cy="4.6" r="0.8"/><path d="M-0.9 -1 V2.4 M0.9 -1 V2.4" stroke-width="0.5"/>',
  mailbox: '<path d="M-5 4 V-0.6 A3 3 0 0 1 1 -0.6 V4 Z M1 -3.6 H3 A2 2 0 0 1 5 -1.6 V4 H-5"/><path d="M-0.6 0 V-5.2" stroke-width="0.6"/><rect class="ia-red" x="-0.6" y="-5.4" width="2.8" height="1.6" stroke="none"/>',
  irrigation: '<path d="M0 5 V0.6 M-2 5 H2" stroke-width="0.8"/><path class="ia-blue" d="M0 0.6 Q-3 -2 -5 -1 M0 0.6 Q-1.4 -3.4 -2.6 -4.6 M0 0.6 Q1.4 -3.4 2.6 -4.6 M0 0.6 Q3 -2 5 -1" fill="none" stroke-width="0.6" stroke-dasharray="1 0.6"/>',
  weather: '<circle class="ia-yellow" cx="-1.6" cy="-1.6" r="2.4" stroke="none"/><path d="M-1 4.4 H3.4 A2.2 2.2 0 0 0 3.4 0 A3 3 0 0 0 -2.2 1 A1.8 1.8 0 0 0 -1 4.4 Z" fill="#1b2433"/>',
  solar: '<path d="M-5 4 L-3.4 -2 H5 L3.4 4 Z"/><path d="M-4.2 1 H4.2 M-0.6 -2 L-1.4 4 M2.2 -2 L1.4 4" stroke-width="0.5"/><circle class="ia-yellow" cx="-3.6" cy="-4.2" r="1.3" stroke="none"/>',
  doorbell: '<rect x="-3.2" y="-5.2" width="6.4" height="10.4" rx="1.6"/><circle cx="0" cy="-2.4" r="1.3" stroke-width="0.6"/><circle class="ia-blue" cx="0" cy="-2.4" r="0.5" stroke="none"/><circle cx="0" cy="2.2" r="1.6"/>',
  power_strip: '<rect x="-5.4" y="-1.9" width="10.8" height="3.8" rx="1"/><circle cx="-3" cy="0" r="0.7"/><circle cx="0" cy="0" r="0.7"/><circle cx="3" cy="0" r="0.7"/><path d="M-5.4 0 H-6 Q-6.6 0 -6.6 1.6 V4" stroke-width="0.6"/><circle class="ia-green" cx="4.6" cy="-1" r="0.35" stroke="none"/>',
  router: '<rect x="-5" y="0" width="10" height="3.8" rx="1"/><path d="M-3.4 0 V-4.6 M3.4 0 V-4.6" stroke-width="0.7"/><circle class="ia-green" cx="-2.6" cy="1.9" r="0.45" stroke="none"/><circle class="ia-green" cx="-1" cy="1.9" r="0.45" stroke="none"/><circle cx="0.6" cy="1.9" r="0.45" stroke="none" fill="currentColor"/>',
  ap: '<circle cx="0" cy="1.6" r="3.6"/><circle class="ia-blue" cx="0" cy="1.6" r="0.6" stroke="none"/><path d="M-3.4 -2.6 A5 5 0 0 1 3.4 -2.6 M-1.8 -1.2 A2.6 2.6 0 0 1 1.8 -1.2" stroke-width="0.6"/>',
  net_switch: '<rect x="-5.4" y="-2.6" width="10.8" height="5.2" rx="0.8"/><path d="M-4 -0.6 H-2.8 V0.8 H-4 Z M-1.6 -0.6 H-0.4 V0.8 H-1.6 Z M0.8 -0.6 H2 V0.8 H0.8 Z M3.2 -0.6 H4.4 V0.8 H3.2 Z" stroke-width="0.4"/><circle class="ia-green" cx="-3.4" cy="-1.6" r="0.3" stroke="none"/><circle class="ia-green" cx="-1" cy="-1.6" r="0.3" stroke="none"/>',
  button: '<rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="1.6"/><circle cx="0" cy="0" r="2.2"/>',
  gas: '<circle cx="0" cy="0" r="4.9"/><path class="ia-blue" d="M0 -3.2 C1.6 -1.4 2.4 -0.2 2.4 1 A2.4 2.4 0 0 1 -2.4 1 C-2.4 -0.2 -1.4 -0.8 -1 -2 C-0.6 -1 0 -0.8 0 -3.2 Z" stroke="none"/>',
  lux: '<circle cx="0" cy="0" r="2.2"/><path d="M0 -5.2 V-3.6 M0 3.6 V5.2 M-5.2 0 H-3.6 M3.6 0 H5.2 M-3.7 -3.7 L-2.6 -2.6 M2.6 2.6 L3.7 3.7 M-3.7 3.7 L-2.6 2.6 M2.6 -2.6 L3.7 -3.7" stroke-width="0.7"/><circle class="ia-yellow" cx="0" cy="0" r="1.2" stroke="none"/>',
  vibration: '<rect x="-2.4" y="-3.8" width="4.8" height="7.6" rx="1"/><path d="M-3.8 -3 L-5 -1.5 L-3.8 0 L-5 1.5 L-3.8 3 M3.8 -3 L5 -1.5 L3.8 0 L5 1.5 L3.8 3" stroke-width="0.6"/>',
  alarm_panel: '<rect x="-4.6" y="-5" width="9.2" height="10" rx="0.8"/><path class="ia-red" d="M0 -3.2 L2.6 -2.2 V0.2 C2.6 1.9 1.4 3 0 3.6 C-1.4 3 -2.6 1.9 -2.6 0.2 V-2.2 Z" stroke="none"/>',
  keypad: '<rect x="-4.4" y="-5" width="8.8" height="10" rx="1.2"/><rect x="-3" y="-3.8" width="6" height="2" rx="0.3" stroke-width="0.5"/><path d="M-2.2 0.4 h0.01 M0 0.4 h0.01 M2.2 0.4 h0.01 M-2.2 2.1 h0.01 M0 2.1 h0.01 M2.2 2.1 h0.01 M-2.2 3.8 h0.01 M0 3.8 h0.01 M2.2 3.8 h0.01" stroke-width="1.1" stroke-linecap="round"/>',
  siren: '<path d="M-3.8 2.8 V0 A3.8 3.8 0 0 1 3.8 0 V2.8 Z"/><path d="M-5 2.8 H5 V4.6 H-5 Z"/><path class="ia-red" d="M-1.5 0 A1.5 1.5 0 0 1 1.5 0 V2.8 H-1.5 Z" stroke="none"/><path d="M-5.4 -3.8 L-4.2 -2.6 M5.4 -3.8 L4.2 -2.6 M0 -5.6 V-4.6" stroke-width="0.6"/>',
  nvr: '<rect x="-5.4" y="-3" width="10.8" height="6" rx="0.8"/><path d="M-3.8 -1 H1 M-3.8 1 H1" stroke-width="0.5"/><circle class="ia-red" cx="3.2" cy="0" r="0.8" stroke="none"/>',
  fireplace: '<path d="M-4.6 5 V-2 H4.6 V5"/><path d="M-5.6 -2 H5.6 V-4.2 H-5.6 Z"/><path class="ia-red" d="M0 4.4 C-2.2 4.4 -2.6 2.4 -1.6 1 C-1.2 2 -0.6 2 -0.4 1.2 C-0.4 0 0.4 -0.6 0.6 -1 C1.2 0.4 2.4 1.4 2.2 2.8 C2 3.8 1.2 4.4 0 4.4 Z" stroke="none"/>',
  floor_heating: '<path d="M-5 -3.6 H5 M-5 -1 H5" stroke-width="1"/><path d="M-3.6 -1 V4.8 M-1.2 -1 V4.8 M1.2 -1 V4.8 M3.6 -1 V4.8" stroke-width="0.6"/><circle class="ia-red" cx="-3.6" cy="-3.6" r="0.6" stroke="none"/><circle class="ia-blue" cx="3.6" cy="-1" r="0.6" stroke="none"/>',
  water_tank: '<rect x="-3.6" y="-5.2" width="7.2" height="10.4" rx="3"/><path d="M-3.6 -0.6 H3.6" stroke-width="0.5"/><circle class="ia-red" cx="0" cy="2.2" r="1" stroke="none"/><circle class="ia-blue" cx="0" cy="-2.8" r="0.8" stroke="none"/>',
  heat_pump: '<rect x="-5.4" y="-4" width="10.8" height="8" rx="1"/><circle cx="-1" cy="0" r="2.8"/><path d="M-1 -2.8 V2.8 M-3.8 0 H1.8" stroke-width="0.4"/><path d="M3 -2 H4.4 M3 0 H4.4 M3 2 H4.4" stroke-width="0.5"/>',
  dehumidifier: '<rect x="-3.8" y="-5" width="7.6" height="10" rx="1.6"/><path class="ia-blue" d="M0 -3.2 C1.2 -1.6 1.8 -0.6 1.8 0.4 A1.8 1.8 0 0 1 -1.8 0.4 C-1.8 -0.6 -1.2 -1.6 0 -3.2 Z" stroke="none"/><path d="M-1.6 3.2 H1.6" stroke-width="0.6"/>',
  humidifier: '<path d="M-3.4 5 V0.4 A3.4 3.4 0 0 1 3.4 0.4 V5 Z"/><path d="M-1.2 -1.6 C-2 -2.6 -0.4 -3.4 -1.2 -4.8 M1.2 -1.6 C0.4 -2.6 2 -3.4 1.2 -4.8" stroke-width="0.6"/><circle class="ia-blue" cx="0" cy="2.4" r="1" stroke="none"/>',
  radiator: '<path d="M-4.8 -4 V4 M-2.4 -4 V4 M0 -4 V4 M2.4 -4 V4 M4.8 -4 V4 M-5.4 -2.6 H5.4 M-5.4 2.6 H5.4" stroke-width="0.8"/>',
  amplifier: '<rect x="-5.4" y="-3" width="10.8" height="6" rx="0.8"/><circle cx="2.8" cy="0" r="1.7"/><path d="M-4 -0.8 H-0.6 M-4 1 H-1.6" stroke-width="0.5"/>',
  set_top: '<rect x="-5.2" y="-2.2" width="10.4" height="4.4" rx="0.8"/><path d="M-3.8 0 H-0.6" stroke-width="0.5"/><circle class="ia-green" cx="3.4" cy="0" r="0.6" stroke="none"/>',
  printer: '<path d="M-3.4 -1.4 V-5 H3.4 V-1.4"/><rect x="-5.2" y="-1.4" width="10.4" height="5" rx="1"/><path d="M-3 2.4 V5 H3 V2.4"/><circle class="ia-green" cx="3.6" cy="0.2" r="0.5" stroke="none"/>',
  pool_pump: '<circle cx="-0.8" cy="0.4" r="3.8"/><path d="M-0.8 0.4 C0.6 -1 1.4 -2 1 -3.2 M-0.8 0.4 C-2.6 0.2 -3.6 1 -3.6 2 M-0.8 0.4 C0 2.2 0.6 3.2 1.8 3.4" stroke-width="0.6"/><path d="M3 -1.6 H5.6 M3 1.4 H5.6" stroke-width="0.8"/>',
  rain: '<path d="M-4.2 -2 H4.2 L1.4 1.6 V5 H-1.4 V1.6 Z"/><circle class="ia-blue" cx="-2.4" cy="-4.4" r="0.7" stroke="none"/><circle class="ia-blue" cx="0" cy="-5" r="0.7" stroke="none"/><circle class="ia-blue" cx="2.4" cy="-4.4" r="0.7" stroke="none"/>',
  intercom: '<rect x="-3.4" y="-5.2" width="6.8" height="10.4" rx="1"/><path d="M-1.8 -3.4 H1.8 M-1.8 -2.2 H1.8 M-1.8 -1 H1.8" stroke-width="0.4"/><circle cx="0" cy="2.6" r="1.3"/>',
  meter: '<rect x="-4.4" y="-5" width="8.8" height="10" rx="1"/><rect x="-3" y="-3.6" width="6" height="2.4" rx="0.3" stroke-width="0.5"/><path class="ia-yellow" d="M0.4 0.4 L-1.2 2.8 H0 L-0.4 4.4 L1.2 2 H0 Z" stroke="none"/>',
  fuse_box: '<rect x="-5" y="-5" width="10" height="10" rx="0.8"/><path d="M-2.6 -3.4 V-0.8 M-0.8 -3.4 V-0.8 M1 -3.4 V-0.8 M2.8 -3.4 V-0.8 M-2.6 0.8 V3.4 M-0.8 0.8 V3.4 M1 0.8 V3.4" stroke-width="1"/>',
  inverter: '<rect x="-4.4" y="-5" width="8.8" height="10" rx="1"/><path d="M-2.4 -2.8 H2.4 M-2.4 -1.6 H2.4" stroke-width="0.5"/><path d="M-2.6 2 C-1.8 0.8 -1 0.8 -0.2 2 C0.6 3.2 1.4 3.2 2.2 2" stroke-width="0.6"/>',
  ups: '<rect x="-3.8" y="-5" width="7.6" height="10" rx="1"/><path d="M-2.2 -3.4 H2.2" stroke-width="0.5"/><path class="ia-yellow" d="M0.6 -1.4 L-1.6 1.8 H-0.1 L-0.6 4 L1.6 0.8 H0.1 Z" stroke="none"/>',
  nas: '<rect x="-4" y="-5" width="8" height="10" rx="1"/><path d="M-2.6 -3 H2.6 M-2.6 -1 H2.6 M-2.6 1 H2.6" stroke-width="0.5"/><circle class="ia-green" cx="2" cy="3.4" r="0.5" stroke="none"/><circle class="ia-blue" cx="0.4" cy="3.4" r="0.5" stroke="none"/>',
  zigbee: '<rect x="-2" y="-2.4" width="4" height="7.4" rx="0.8"/><path d="M-1.2 -2.4 V-4.4 H1.2 V-2.4"/><path d="M-4.4 -3 A6 6 0 0 0 -4.4 3 M4.4 -3 A6 6 0 0 1 4.4 3" stroke-width="0.5"/>',
  rack: '<rect x="-4" y="-5.2" width="8" height="10.4" rx="0.6"/><path d="M-2.8 -3.2 H2.8 M-2.8 -1 H2.8 M-2.8 1.2 H2.8 M-2.8 3.4 H2.8" stroke-width="0.5"/><circle class="ia-green" cx="2" cy="-2.1" r="0.4" stroke="none"/><circle class="ia-green" cx="2" cy="0.1" r="0.4" stroke="none"/>',
  battery: '<rect x="-3.4" y="-4" width="6.8" height="9" rx="1.1"/><path d="M-1.4 -5 H1.4" stroke-width="1.2"/><rect class="ia-green" x="-2.2" y="0" width="4.4" height="3.8" rx="0.5" stroke="none"/>'
};
function iconDefs(kinds) {
  return [...new Set(kinds)].filter((k) => G[k]).map((k) => `    <g id="icon-${k}">${G[k]}</g>`).join("\n");
}

// generator/garden.js
var GARDEN_AREAS = ["lawn", "terrace", "driveway", "path", "flowerbed", "pool", "gravel", "plot"];
var GARDEN_LINES = ["fence", "hedge"];
var GARDEN_PLANTS = ["tree", "bush"];
var GARDEN_KINDS = [...GARDEN_AREAS, ...GARDEN_LINES, ...GARDEN_PLANTS];
var PLANT_R = { tree: 250, bush: 60 };
var HEDGE_W = 60;
var ORDER = ["plot", "lawn", "gravel", "driveway", "path", "terrace", "flowerbed", "pool", "hedge", "fence", "bush", "tree"];
var FILL = {
  lawn: "url(#gd-lawn)",
  terrace: "url(#gd-terrace)",
  driveway: "url(#gd-driveway)",
  path: "url(#gd-path)",
  flowerbed: "url(#gd-flowerbed)",
  pool: "#1d4a6b",
  gravel: "url(#gd-gravel)"
};
var n2 = (v) => Number(Number(v).toFixed(2)).toString();
var esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
var pts = (p2) => p2.map((q) => `${n2(q[0])},${n2(q[1])}`).join(" ");
function gardenPoints(items) {
  const out = [];
  for (const g of items || []) {
    if (g.points) out.push(...g.points);
    if (g.line) out.push(...g.line);
    if (g.at) {
      const r = g.r || 0;
      out.push([g.at[0] - r, g.at[1] - r], [g.at[0] + r, g.at[1] + r]);
    }
  }
  return out;
}
function gardenDefs(items, k) {
  if (!items || !items.length) return "";
  const used = new Set(items.map((g) => g.kind));
  const s = (v) => n2(v * k);
  const P = (id, w, h, body) => `    <pattern id="gd-${id}" patternUnits="userSpaceOnUse" width="${s(w)}" height="${s(h)}">${body}</pattern>`;
  const out = [];
  if (used.has("lawn")) out.push(P("lawn", 40, 40, `<rect width="${s(40)}" height="${s(40)}" fill="#1f3326"/>` + [[6, 9, 1], [22, 4, -1], [33, 18, 1], [14, 27, -1], [29, 34, 1], [3, 36, -1], [17, 13, 1], [37, 7, -1], [10, 19, -1], [25, 24, 1], [35, 29, -1], [20, 38, 1]].map(([x, y, d], i) => `<path d="M${s(x)} ${s(y)} l${s(d)} ${s(-4)}" stroke="${i % 2 ? "#264030" : "#2b4634"}" stroke-width="${s(1)}" stroke-linecap="round"/>`).join("")));
  if (used.has("terrace")) out.push(P("terrace", 200, 14, `<rect width="${s(200)}" height="${s(14)}" fill="#332c27"/><path d="M0 0H${s(200)}" stroke="#463c35" stroke-width="${s(1.2)}"/>`));
  if (used.has("driveway")) out.push(P("driveway", 20, 20, `<rect width="${s(20)}" height="${s(20)}" fill="#2a2f37"/><path d="M0 0H${s(20)}M0 ${s(10)}H${s(20)}M0 0V${s(10)}M${s(10)} ${s(10)}V${s(20)}" stroke="#363c46" stroke-width="${s(1)}"/>`));
  if (used.has("path")) out.push(P("path", 50, 50, `<rect width="${s(50)}" height="${s(50)}" fill="#2e3541"/><path d="M0 0H${s(50)}M0 0V${s(50)}" stroke="#3b4352" stroke-width="${s(1.2)}"/>`));
  if (used.has("flowerbed")) out.push(P("flowerbed", 30, 30, `<rect width="${s(30)}" height="${s(30)}" fill="#2f271f"/>` + [[7, 8], [21, 13], [12, 23], [26, 27]].map(([x, y]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${s(2.4)}" fill="#3d5838"/>`).join("")));
  if (used.has("gravel")) out.push(P("gravel", 24, 24, `<rect width="${s(24)}" height="${s(24)}" fill="#323437"/>` + [[4, 5], [15, 3], [20, 13], [9, 16], [3, 21], [17, 21]].map(([x, y]) => `<circle cx="${s(x)}" cy="${s(y)}" r="${s(1.3)}" fill="#46494d"/>`).join("")));
  if (used.has("tree") || used.has("bush")) out.push(`    <radialGradient id="gd-crown"><stop offset="0" stop-color="#2f4f36"/><stop offset="1" stop-color="#21382a"/></radialGradient>`);
  return out.join("\n");
}
function gardenLayer(items, k) {
  if (!items || !items.length) return "";
  const L = [`  <g id="garden" pointer-events="none">`];
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  for (const g of sorted) {
    const id = esc(g.id);
    if (g.points && g.points.length >= 3) {
      if (g.kind === "plot") {
        L.push(`    <polygon id="${id}" class="gd-plot" points="${pts(g.points)}" fill="none" stroke="#5a6b86" stroke-width="1.4" stroke-dasharray="10 4 2 4"/>`);
      } else if (g.kind === "pool") {
        L.push(`    <polygon id="${id}" class="gd-pool" points="${pts(g.points)}" fill="#1d4a6b" stroke="#6f8fb0" stroke-width="${n2(Math.max(1, 15 * k))}" stroke-linejoin="round"/>`);
      } else {
        L.push(`    <polygon id="${id}" class="gd-${g.kind}" points="${pts(g.points)}" fill="${FILL[g.kind] || "#22302a"}" stroke="none"/>`);
      }
    } else if (g.line && g.line.length >= 2) {
      if (g.kind === "hedge") {
        L.push(`    <polyline id="${id}" class="gd-hedge" points="${pts(g.line)}" fill="none" stroke="#284531" stroke-width="${n2((g.width || HEDGE_W) * k)}" stroke-linecap="round" stroke-linejoin="round"/>`);
      } else {
        L.push(`    <g id="${id}" class="gd-fence"><polyline points="${pts(g.line)}" fill="none" stroke="#6b7f9c" stroke-width="1.2" stroke-dasharray="7 2"/>` + g.line.map((p2) => `<rect x="${n2(p2[0] - 2)}" y="${n2(p2[1] - 2)}" width="4" height="4" fill="#6b7f9c"/>`).join("") + `</g>`);
      }
    } else if (g.at) {
      const r = (g.r || PLANT_R[g.kind] || 60) * k;
      const [x, y] = g.at;
      if (g.kind === "tree") {
        L.push(`    <g id="${id}" class="gd-tree"><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="url(#gd-crown)" stroke="#3b5f42" stroke-width="1"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.55)}" fill="none" stroke="#2a4632" stroke-width="0.8" stroke-dasharray="3 3"/><circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(Math.max(1.5, r * 0.08))}" fill="#3a3027"/></g>`);
      } else {
        L.push(`    <circle id="${id}" class="gd-bush" cx="${n2(x)}" cy="${n2(y)}" r="${n2(r)}" fill="url(#gd-crown)" stroke="#3b5f42" stroke-width="0.8"/>`);
      }
    }
  }
  L.push(`  </g>`);
  return L.join("\n");
}

// generator/rooms.js
var EPS = 0.01;
var sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
var add = (a, b) => [a[0] + b[0], a[1] + b[1]];
var mul = (a, k) => [a[0] * k, a[1] * k];
var cross = (a, b) => a[0] * b[1] - a[1] * b[0];
var key = (p2) => `${Math.round(p2[0] / EPS)}:${Math.round(p2[1] / EPS)}`;
function segments(model, withDividers) {
  const segs = (model.walls || []).map((w) => ({ a: w.a, b: w.b, h: wallThickness(model, w) / 2 }));
  if (withDividers) for (const d of model.dividers || []) {
    if (withDividers === "light" && !d.blocks_light) continue;
    segs.push({ a: d.a, b: d.b, h: 0 });
  }
  return reach(segs.filter((s) => Math.hypot(...sub(s.b, s.a)) > EPS));
}
var SHORT = 5;
function meets(s, o) {
  const pts3 = [];
  const on = (p2, a, b) => {
    const d2 = sub(b, a), L2 = d2[0] * d2[0] + d2[1] * d2[1];
    const t = ((p2[0] - a[0]) * d2[0] + (p2[1] - a[1]) * d2[1]) / L2;
    return t >= -1e-9 && t <= 1 + 1e-9 && Math.hypot(...sub(add(a, mul(d2, t)), p2)) <= EPS * 5;
  };
  for (const p2 of [o.a, o.b]) if (on(p2, s.a, s.b)) pts3.push(p2);
  for (const p2 of [s.a, s.b]) if (on(p2, o.a, o.b)) pts3.push(p2);
  const d = sub(s.b, s.a), e = sub(o.b, o.a), c = cross(d, e);
  if (Math.abs(c) > 1e-9) {
    const t = cross(sub(o.a, s.a), e) / c, u = cross(sub(o.a, s.a), d) / c;
    if (t > -1e-9 && t < 1 + 1e-9 && u > -1e-9 && u < 1 + 1e-9) pts3.push(add(s.a, mul(d, t)));
  }
  return pts3;
}
function reach(segs) {
  const out = segs.map((s) => ({ ...s }));
  for (const s of out) {
    for (const end of ["a", "b"]) {
      const p2 = s[end], q = end === "a" ? s.b : s.a;
      const joined = out.some((o) => o !== s && meets(s, o).some((m) => Math.hypot(...sub(m, p2)) <= s.h + o.h + SHORT));
      if (joined) continue;
      const dir = sub(p2, q), Ld = Math.hypot(...dir);
      if (!Ld) continue;
      const u = mul(dir, 1 / Ld);
      let best = null;
      for (const o of out) {
        if (o === s || !o.h) continue;
        const e = sub(o.b, o.a), Le = Math.hypot(...e), c = cross(u, e);
        if (!Le || Math.abs(c) / Le < 0.2) continue;
        const tt = cross(sub(o.a, p2), e) / c;
        const v = cross(sub(o.a, p2), u) / c;
        if (tt <= EPS || tt > (o.h + SHORT) / (Math.abs(c) / Le)) continue;
        if (v < -1e-6 || v > 1 + 1e-6) continue;
        if (best === null || tt < best) best = tt;
      }
      if (best !== null) {
        s[end] = add(p2, mul(u, best));
        continue;
      }
      let node = null, nd = Infinity;
      for (const o of out) {
        if (o === s || !o.h) continue;
        for (const n5 of [o.a, o.b]) {
          const dd = Math.hypot(...sub(n5, p2));
          if (dd > EPS && dd <= o.h * Math.SQRT2 + SHORT && dd < nd) {
            nd = dd;
            node = n5;
          }
        }
      }
      if (node) s[end] = [...node];
    }
  }
  return out;
}
function split(segs) {
  const out = [];
  for (const s of segs) {
    const d = sub(s.b, s.a), L2 = d[0] * d[0] + d[1] * d[1];
    const ts = [0, 1];
    for (const o of segs) {
      if (o === s) continue;
      for (const p2 of [o.a, o.b]) {
        const t2 = ((p2[0] - s.a[0]) * d[0] + (p2[1] - s.a[1]) * d[1]) / L2;
        if (t2 <= 0 || t2 >= 1) continue;
        const q = add(s.a, mul(d, t2));
        if (Math.hypot(...sub(q, p2)) <= EPS * 5) ts.push(t2);
      }
      const e = sub(o.b, o.a), c = cross(d, e);
      if (Math.abs(c) < 1e-9) continue;
      const t = cross(sub(o.a, s.a), e) / c, u = cross(sub(o.a, s.a), d) / c;
      if (t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    for (let i = 0; i + 1 < ts.length; i++) {
      if (ts[i + 1] - ts[i] < 1e-9) continue;
      out.push({ a: add(s.a, mul(d, ts[i])), b: add(s.a, mul(d, ts[i + 1])), h: s.h });
    }
  }
  return out;
}
function faces(model, { withDividers = true } = {}) {
  const segs = split(segments(model, withDividers));
  const nodes = /* @__PURE__ */ new Map();
  const node = (p2) => {
    const k = key(p2);
    if (!nodes.has(k)) nodes.set(k, { p: p2, out: [] });
    return nodes.get(k);
  };
  const edges = [];
  const seen = /* @__PURE__ */ new Set();
  for (const s of segs) {
    const A = node(s.a), B = node(s.b);
    if (A === B) continue;
    const k = [key(s.a), key(s.b)].sort().join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    const e1 = { from: A, to: B, h: s.h }, e2 = { from: B, to: A, h: s.h };
    e1.twin = e2;
    e2.twin = e1;
    A.out.push(e1);
    B.out.push(e2);
    edges.push(e1, e2);
  }
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const n5 of nodes.values()) {
      const live = n5.out.filter((e) => !e.dead);
      if (live.length === 1) {
        live[0].dead = live[0].twin.dead = true;
        pruned = true;
      }
    }
  }
  const ang = (e) => Math.atan2(e.to.p[1] - e.from.p[1], e.to.p[0] - e.from.p[0]);
  for (const n5 of nodes.values()) n5.out = n5.out.filter((e) => !e.dead).sort((x, y) => ang(x) - ang(y));
  const used = /* @__PURE__ */ new Set();
  const out = [];
  for (const e0 of edges) {
    if (e0.dead || used.has(e0)) continue;
    const ring = [];
    let e = e0, guard = 0;
    while (!used.has(e) && guard++ < 1e5) {
      used.add(e);
      ring.push(e);
      const v = e.to, list = v.out, i = list.indexOf(e.twin);
      e = list[(i - 1 + list.length) % list.length];
    }
    const pts3 = ring.map((x) => x.from.p);
    const area = signedArea(pts3);
    if (area > EPS) out.push({ edges: ring.map((x) => ({ a: x.from.p, b: x.to.p, h: x.h })), area, pts: pts3 });
  }
  return out;
}
function signedArea(pts3) {
  let s = 0;
  for (let i = 0; i < pts3.length; i++) s += cross(pts3[i], pts3[(i + 1) % pts3.length]);
  return s / 2;
}
function pointInPolygon(p2, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p2[1] !== yj > p2[1] && p2[0] < (xj - xi) * (p2[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function faceAt(model, p2, opts) {
  let best = null;
  for (const f of faces(model, opts)) if (pointInPolygon(p2, f.pts) && (!best || f.area < best.area)) best = f;
  return best;
}
function inset(face) {
  const E = face.edges;
  const n5 = E.length;
  const lines = E.map((e) => {
    const d = sub(e.b, e.a), L = Math.hypot(...d), u = mul(d, 1 / L), nrm = [-u[1], u[0]];
    return { p: add(e.a, mul(nrm, e.h)), u, h: e.h, end: add(e.b, mul(nrm, e.h)) };
  });
  const pts3 = [];
  for (let i = 0; i < n5; i++) {
    const A = lines[i], B = lines[(i + 1) % n5];
    const c = cross(A.u, B.u);
    if (Math.abs(c) < 1e-9) {
      if (Math.abs(A.h - B.h) > 1e-9) pts3.push(A.end, B.p);
      continue;
    }
    const t = cross(sub(B.p, A.p), B.u) / c;
    const q = add(A.p, mul(A.u, t));
    if (Math.hypot(...sub(q, E[i].b)) > 3 * Math.max(A.h, B.h) + 1) {
      pts3.push(A.end, B.p);
      continue;
    }
    pts3.push(q);
  }
  return pts3.map((q) => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]);
}

// generator/model-v2.js
var CM_PER_SVG_DEFAULT = 30 / 17;
var EPS2 = 0.05;
var WALL_GROUP = { exterior: "exterior", load_bearing: "interior", partition: "interior", chimney: "fireplace" };
var sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
var add2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
var mul2 = (a, k) => [a[0] * k, a[1] * k];
var dot = (a, b) => a[0] * b[0] + a[1] * b[1];
var len = (a) => Math.hypot(a[0], a[1]);
var unit = (a) => mul2(a, 1 / len(a));
var near = (a, b, e = EPS2) => len(sub2(a, b)) <= e;
function wallThickness(model, w) {
  return w.thickness ?? model.wall_types?.[w.type]?.thickness ?? 12;
}
var cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
function spokes(model, p2, self) {
  const out = [];
  for (const o of model.walls) {
    if (o === self) continue;
    const v = sub2(o.b, o.a), L = len(v);
    if (L < EPS2) continue;
    const u = mul2(v, 1 / L), h = wallThickness(model, o) / 2, group = WALL_GROUP[o.type] || "interior";
    if (near(o.a, p2)) out.push({ d: u, h, group });
    else if (near(o.b, p2)) out.push({ d: mul2(u, -1), h, group });
    else {
      const t = dot(sub2(p2, o.a), u);
      if (t > EPS2 && t < L - EPS2 && len(sub2(sub2(p2, o.a), mul2(u, t))) <= EPS2) out.push({ d: u, h, group, through: true }, { d: mul2(u, -1), h, group, through: true });
    }
  }
  return out;
}
function meet(p2, d, q, e) {
  const c = cross2(d, e);
  if (Math.abs(c) < 1e-9) return null;
  return cross2(sub2(q, p2), e) / c;
}
function wallEnds(model, w, end) {
  const P = w[end];
  const L = len(sub2(w.b, w.a));
  const u = unit(sub2(w.b, w.a));
  const h = wallThickness(model, w) / 2;
  const d = end === "a" ? u : mul2(u, -1);
  const base = end === "a" ? 0 : L;
  const flat = { left: base, right: base };
  const others = spokes(model, P, w);
  if (!others.length) return endInside(model, w, end, P, d, h, base, L) || flat;
  const ang = (x) => Math.atan2(x[1], x[0]);
  const all = [{ d, h, own: true }, ...others].sort((x, y) => ang(x.d) - ang(y.d));
  const i = all.findIndex((x) => x.own);
  const next = all[(i + 1) % all.length], prev = all[(i - 1 + all.length) % all.length];
  const Ln = (x) => [-x[1], x[0]];
  const own = Ln(d);
  const group = WALL_GROUP[w.type] || "interior";
  const face = (off, nb, sign) => {
    const at = (k) => meet(add2(P, mul2(own, off)), d, add2(P, mul2(Ln(nb.d), k * nb.h)), nb.d);
    if (nb.through || nb.group === group) return at(sign);
    const x = at(1), y = at(-1);
    return x === null || y === null ? null : Math.min(x, y);
  };
  const sPlus = face(h, next, -1);
  const sMinus = face(-h, prev, 1);
  const lim = 4 * Math.max(h, next.h, prev.h);
  const ok = (s) => s !== null && Math.abs(s) <= lim;
  const toU = (s) => end === "a" ? s : L - s;
  const plus = ok(sPlus) ? toU(sPlus) : base, minus = ok(sMinus) ? toU(sMinus) : base;
  return end === "a" ? { left: plus, right: minus } : { left: minus, right: plus };
}
function endInside(model, w, end, P, d, h, base, L) {
  const Ln = (x) => [-x[1], x[0]], own = Ln(d);
  let best = null;
  for (const o of model.walls) {
    if (o === w) continue;
    const v = sub2(o.b, o.a), Lo = len(v);
    if (Lo < EPS2) continue;
    const uo = mul2(v, 1 / Lo), ho = wallThickness(model, o) / 2, no = Ln(uo);
    const rel = sub2(P, o.a), along = dot(rel, uo), across = dot(rel, no);
    if (along < -EPS2 || along > Lo + EPS2 || Math.abs(across) > ho + EPS2) continue;
    if (Math.abs(cross2(d, uo)) < 0.2) continue;
    const far = (off) => {
      const ss = [1, -1].map((k) => meet(add2(P, mul2(own, off)), d, add2(o.a, mul2(no, k * ho)), uo)).filter((x) => x !== null);
      return ss.length ? Math.min(...ss) : null;
    };
    const sp = far(h), sm = far(-h);
    if (sp === null || sm === null || Math.min(sp, sm) < -4 * Math.max(h, ho)) continue;
    if (!best || Math.min(sp, sm) < Math.min(best.sp, best.sm)) best = { sp, sm };
  }
  if (!best) return null;
  const toU = (x) => end === "a" ? x : L - x;
  return end === "a" ? { left: toU(best.sp), right: toU(best.sm) } : { left: toU(best.sm), right: toU(best.sp) };
}
function wallPolygons(model, w) {
  const u = unit(sub2(w.b, w.a)), n5 = [-u[1], u[0]];
  const h = wallThickness(model, w) / 2;
  const A = wallEnds(model, w, "a"), B = wallEnds(model, w, "b");
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const cuts = (w.openings || []).map((o) => [o.from, o.to, o.type === "corner_window" ? o.corner : null]).sort((x, y) => x[0] - y[0]);
  const ranges = [];
  let cur = [A.left, A.right];
  for (const [f, t, c] of cuts) {
    if (!(c === "from" && f <= 2 * h + 0.5)) ranges.push([[cur[0], f], [cur[1], f]]);
    cur = [t, t];
  }
  const last = cuts[cuts.length - 1];
  if (!(last && last[2] === "to" && last[1] >= L - 2 * h - 0.5)) ranges.push([[cur[0], B.left], [cur[1], B.right]]);
  const Lp = (s) => add2(add2(w.a, mul2(u, s)), mul2(n5, h));
  const Rp = (s) => add2(add2(w.a, mul2(u, s)), mul2(n5, -h));
  return ranges.filter(([l, r]) => l[1] - l[0] > 1e-6 || r[1] - r[0] > 1e-6).map(([l, r]) => [Lp(l[0]), Lp(l[1]), Rp(r[1]), Rp(r[0])]);
}
var BEAM_REACH = 5e3;
function beamWedge(c, rot, angle, R = BEAM_REACH) {
  if (!(angle > 0 && angle < 360)) return [];
  const mid = (rot ?? 0) - 90, n5 = Math.max(2, Math.ceil(angle / 5));
  const pts3 = [c];
  for (let i = 0; i <= n5; i++) {
    const a = (mid - angle / 2 + angle * i / n5) * Math.PI / 180;
    pts3.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]);
  }
  return pts3;
}
var FRAME_MARGIN = 100;
function frame(m) {
  const k = 1 / (m.canvas.cm_per_svg || CM_PER_SVG_DEFAULT);
  let pts3 = [...(m.walls || []).flatMap((w) => wallPolygons(m, w).flat()), ...gardenPoints(m.garden)];
  if (!pts3.length) pts3 = [[0, 0], [1e3, 1e3]];
  const a = (m.canvas.rotate || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const turn = (p2, s = 1) => [p2[0] * cos - s * p2[1] * sin, s * p2[0] * sin + p2[1] * cos];
  const box = (q) => {
    const xs = q.map((p2) => p2[0]), ys = q.map((p2) => p2[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const [x0, y0, x1, y1] = box(pts3.map((p2) => turn([p2[0] * k, p2[1] * k])));
  const mg = m.canvas.margin ?? FRAME_MARGIN;
  const [t, r, b, l] = (Array.isArray(mg) ? mg : [mg, mg, mg, mg]).map((v) => v * k);
  const r2 = (v) => Math.round(v * 100) / 100;
  const viewBox = [x0 - l, y0 - t, x1 - x0 + l + r, y1 - y0 + t + b].map(r2);
  const [vx, vy, vw, vh] = viewBox;
  const [sx0, sy0, sx1, sy1] = box([[vx, vy], [vx + vw, vy], [vx, vy + vh], [vx + vw, vy + vh]].map((p2) => turn(p2, -1)));
  return { viewBox, sheet: [sx0 - 1, sy0 - 1, sx1 - sx0 + 2, sy1 - sy0 + 2].map(r2) };
}
function floorModel(m, i) {
  if (i === void 0 || i < 0 || !m.floors || !m.floors[i]) {
    const { floors, ...g } = m;
    return g;
  }
  const { id, name, ...lists } = m.floors[i];
  return { version: m.version, canvas: m.canvas, wall_types: m.wall_types, ...lists };
}
var floorIndex = (m, id) => id === void 0 || id === null ? -1 : (m.floors || []).findIndex((f) => f.id === id);
function lowerV2(m) {
  const k = 1 / (m.canvas.cm_per_svg || CM_PER_SVG_DEFAULT);
  const P = (p2) => [p2[0] * k, p2[1] * k];
  const S = (v) => v === void 0 ? void 0 : v * k;
  const v1 = { version: 1, canvas: { contract: 2, rotate: 0, ...m.canvas } };
  m = { rooms: [], walls: [], lights: [], covers: [], ...m };
  const zones = (m.zones || []).map((z) => ({ ...z }));
  const rooms = [];
  for (const r of m.rooms) {
    if (r.points) {
      rooms.push(r);
      continue;
    }
    if (!r.at) continue;
    const f = faceAt(m, r.at);
    if (!f) continue;
    const room = { ...r, points: inset(f), label: r.label || r.at };
    const whole = faceAt(m, r.at, { withDividers: "light" });
    if (whole && Math.abs(whole.area - f.area) > 1) {
      const zkey = whole.pts.map((q) => q.join(",")).sort().join(";");
      let z = zones.find((x) => x._key === zkey);
      if (!z) zones.push(z = { id: "zone-" + r.id, points: inset(whole), _key: zkey });
      room.zone = z.id;
    }
    rooms.push(room);
  }
  v1.rooms = rooms.map((r) => ({ ...r, points: r.points.map(P), label: r.label && P(r.label) }));
  v1.dividers = (m.dividers || []).filter((d) => d.show).map((d) => ({ ...d, a: P(d.a), b: P(d.b) }));
  v1.zones = zones.map(({ _key, ...z }) => ({ ...z, points: z.points.map(P) }));
  v1.clips = (m.clips || []).map((c) => c.rect ? { ...c, rect: c.rect.map((v) => v * k) } : { ...c, points: c.points.map(P) });
  v1.walls = { exterior: [], interior: [], fireplace: [] };
  v1.windows = [];
  v1.doors = [];
  for (const w of m.walls) {
    const group = WALL_GROUP[w.type] || "interior";
    const u = unit(sub2(w.b, w.a));
    const nrm = [-u[1], u[0]];
    for (const poly of wallPolygons(m, w)) v1.walls[group].push(poly.map(P));
    const at = (s, off = 0) => add2(add2(w.a, mul2(u, s)), mul2(nrm, off));
    const exterior = w.type === "exterior";
    const inward = (o_) => o_.outside ? mul2(nrm, o_.outside === "left" ? -1 : 1) : void 0;
    const ext = (o_) => exterior ? { exterior: true, facade: o_.facade } : {};
    const leafAt = (id, hs, cs, width, side) => {
      const face = wallThickness(m, w) / 2 * side;
      const hinge = at(hs, face), closed = at(cs, face);
      const leaf = add2(hinge, mul2(nrm, width * side));
      const cr = sub2(closed, hinge), lf = sub2(leaf, hinge);
      return { id, hinge: P(hinge), leaf: P(leaf), closed: P(closed), sweep: cr[0] * lf[1] - cr[1] * lf[0] > 0 ? 1 : 0 };
    };
    for (const o of w.openings || []) {
      const width = o.to - o.from;
      const side = o.swing === "left" ? 1 : -1;
      if (["door", "pocket_door", "sliding_door", "passage", "balcony_door", "hst", "garage_door", "window", "corner_window"].includes(o.type)) {
        const th = wallThickness(m, w) / 2 + 0.5;
        (v1.thresholds = v1.thresholds || []).push([at(o.from, -th), at(o.to, -th), at(o.to, th), at(o.from, th)].map(P));
      }
      const hs = o.hinge === "to" ? o.to : o.from, cs = o.hinge === "to" ? o.from : o.to;
      const splits = (() => {
        const n22 = o.panes || 1, ps = o.pane_sizes;
        if (n22 < 2 || !Array.isArray(ps) || ps.length !== n22 - 1) return void 0;
        let acc = 0;
        const out = [];
        for (const v of ps) {
          acc += Number(v) || 0;
          out.push(acc / width);
        }
        return out.every((f, i) => f > (out[i - 1] || 0) && f < 1) ? out : void 0;
      })();
      const panes = { panes: o.panes, contacts: o.contacts, tick: wallThickness(m, w) / 2 * k, splits };
      const contact = (o.contacts || [])[0];
      if (o.type === "window" || o.type === "corner_window") {
        let g0 = o.from, g1 = o.to;
        const pw = o.type === "corner_window" && o.pair && m.walls.find((x) => x !== w && (x.openings || []).some((y) => y.id === o.pair));
        if (pw) {
          const e = sub2(pw.b, pw.a), c = u[0] * e[1] - u[1] * e[0];
          if (Math.abs(c) > 1e-9) {
            const sc = ((pw.a[0] - w.a[0]) * e[1] - (pw.a[1] - w.a[1]) * e[0]) / c;
            if (o.corner === "to") g1 = sc;
            else g0 = sc;
          }
        }
        v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), line: [P(at(g0)), P(at(g1))], ...panes });
      } else if (o.type === "hst") {
        const sashes = {};
        for (const [name, sa] of Object.entries(o.sashes)) sashes[name] = [P(at(sa.from, sa.offset)), P(at(sa.to, sa.offset))];
        v1.windows.push({
          id: o.id,
          facade: o.facade,
          inward: inward(o),
          type: "hst",
          width: width * k,
          sashes,
          contacts: o.contacts,
          line: [P(at(o.from)), P(at(o.to))],
          tick: wallThickness(m, w) / 2 * k
        });
      } else if (o.type === "door") {
        v1.doors.push({ ...leafAt(o.id, hs, cs, width, side), ...ext(o), contact });
      } else if (o.type === "double_door" || o.type === "double_gate") {
        const mid = (o.from + o.to) / 2;
        v1.doors.push({ ...leafAt(o.id + "-1", o.from, mid, width / 2, side), ...ext(o), contact });
        v1.doors.push({ ...leafAt(o.id + "-2", o.to, mid, width / 2, side), ...ext(o), contact });
      } else if (o.type === "balcony_door") {
        const n22 = o.panes || 1;
        const opens = Array.isArray(o.pane_open) && o.pane_open.length === n22 ? o.pane_open : o.leaves === 2 && n22 === 2 ? ["from", "to"] : null;
        if (opens) {
          const edge = (i) => o.from + width * (i <= 0 ? 0 : i >= n22 ? 1 : splits ? splits[i - 1] : i / n22);
          v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), line: [P(at(o.from)), P(at(o.to))], ...panes });
          opens.forEach((op, i) => {
            if (op !== "from" && op !== "to") return;
            const s0 = edge(i), s1 = edge(i + 1), h2 = op === "to" ? s1 : s0, c2 = op === "to" ? s0 : s1;
            v1.doors.push({ ...leafAt(o.id + (i ? `-leaf-${i + 1}` : "-leaf"), h2, c2, s1 - s0, side), ...ext(o), contact });
          });
        } else {
          v1.windows.push({ id: o.id, facade: o.facade, inward: inward(o), line: [P(at(o.from)), P(at(o.to))], ...panes });
          v1.doors.push({ ...leafAt(o.id + "-leaf", hs, cs, width, side), ...ext(o), contact });
        }
      } else if (o.type === "sliding_door") {
        const face = wallThickness(m, w) / 2 * side, track = face + 4 * side;
        const dir = o.hinge === "to" ? 1 : -1;
        v1.doors.push({ id: o.id, lines: [
          [P(at(o.from, face)), P(at(o.to, face))],
          [P(at(o.from + dir * width / 2, track)), P(at(o.to + dir * width / 2, track))]
        ], width: width * k, ...ext(o), contact });
      } else if (o.type === "pocket_door") {
        const dir = o.hinge === "to" ? 1 : -1, end = o.hinge === "to" ? o.to : o.from;
        v1.doors.push({ id: o.id, lines: [[P(at(o.from)), P(at(o.to))]], width: width * k, ...ext(o), contact });
        v1.doors.push({ id: o.id + "-pocket", lines: [[P(at(end)), P(at(end + dir * width))]], dashed: true, width: width * k, pocket: true });
      } else if (o.type === "garage_door") {
        const inSide = o.outside ? o.outside === "left" ? -1 : 1 : side;
        const face = wallThickness(m, w) / 2 * inSide, run = face + (o.depth || 240) * inSide;
        v1.doors.push({ id: o.id, lines: [[P(at(o.from)), P(at(o.to))]], width: width * k, ...ext(o), contact, garage: "door" });
        v1.doors.push({ id: o.id + "-track", garage: "track", lines: [
          [P(at(o.from, face)), P(at(o.from, run))],
          [P(at(o.from, run)), P(at(o.to, run))],
          [P(at(o.to, run)), P(at(o.to, face))]
        ], dashed: true, width: width * k, pocket: true });
      }
    }
  }
  try {
    v1.slab = faces(m, { withDividers: false }).map((f) => f.pts.map(P));
  } catch (e) {
    v1.slab = [];
  }
  v1.covers = m.covers;
  if (!v1.canvas.viewBox) {
    const f = frame(m);
    v1.canvas.viewBox = f.viewBox;
    v1.canvas.sheet = f.sheet;
  }
  if (Array.isArray(m.canvas.start) && m.canvas.start.length === 4 && m.canvas.start.every(Number.isFinite)) {
    const [x, y, w2, h2] = m.canvas.start, a = (m.canvas.rotate || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    const q = [[x, y], [x + w2, y], [x, y + h2], [x + w2, y + h2]].map(([px, py]) => [(px * cos - py * sin) * k, (px * sin + py * cos) * k]);
    const xs = q.map((p2) => p2[0]), ys = q.map((p2) => p2[1]);
    v1.canvas.start = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)].map((v) => Math.round(v * 100) / 100);
  } else delete v1.canvas.start;
  delete v1.canvas.margin;
  const bulb = (b) => [b[0] * k, b[1] * k, ...b.slice(2)];
  const beamClip = (id, c, rot, angle) => {
    const w = beamWedge(c, rot, angle);
    if (!w.length) return void 0;
    v1.clips.push({ id, points: w.map(P) });
    return id;
  };
  const beamGlows = (l) => {
    const narrow = (a) => a > 0 && a < 360;
    if (!(narrow(l.beam) || (l.bulbs || []).some((b) => narrow(b[3]))) || l.glows) return l.glows && l.glows.map((g) => ({ ...g, at: P(g.at), r: S(g.r) }));
    const r = S(l.glow_r);
    if (l.bulbs && l.bulbs.length) return l.bulbs.map((b, i) => ({ at: P(b), r, clip: beamClip(`beam-${l.id}${l.bulbs.length > 1 ? "-" + (i + 1) : ""}`, b, b[2], b[3] ?? l.beam) }));
    if (l.strip) {
      const c = [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2];
      return [{ at: P(c), r, clip: beamClip(`beam-${l.id}`, c, l.beam_dir, l.beam) }];
    }
    return void 0;
  };
  v1.lights = m.lights.map((l) => l.type === "fixture" ? { ...l, at: P(l.at), circuits: l.circuits.map((c) => ({ ...c, r: S(c.r) })) } : {
    ...l,
    bulbs: l.bulbs && l.bulbs.map(bulb),
    rail: l.rail && l.rail.map(P),
    strip: l.strip && l.strip.map((v) => v * k),
    glow_r: S(l.glow_r),
    glows: beamGlows(l)
  });
  const sensorView = (d) => {
    if (!(d.range > 0) || !d.at) return void 0;
    const edges = [];
    for (const w of m.walls) {
      if (d.through_partitions && w.type === "partition") continue;
      for (const poly of wallPolygons(m, w)) for (let i = 0; i < poly.length; i++) edges.push([poly[i], poly[(i + 1) % poly.length]]);
      const u0 = unit(sub2(w.b, w.a)), on = (s0) => add2(w.a, mul2(u0, s0));
      for (const o of w.openings || []) if (o.type !== "passage") edges.push([on(o.from), on(o.to)]);
    }
    const fov = Math.min(360, d.fov ?? 100), dir = d.direction ?? 90, full = fov >= 359.5;
    const n5 = Math.max(24, Math.ceil(fov / 2)), pts3 = [];
    for (let i = 0; i <= n5; i++) {
      if (full && i === n5) break;
      const a = (dir - fov / 2 + fov * i / n5) * Math.PI / 180, u = [Math.cos(a), Math.sin(a)];
      let t = d.range;
      for (const [p2, q] of edges) {
        const e = sub2(q, p2), c = u[0] * e[1] - u[1] * e[0];
        if (Math.abs(c) < 1e-9) continue;
        const v = sub2(p2, d.at), tt = (v[0] * e[1] - v[1] * e[0]) / c, s2 = (v[0] * u[1] - v[1] * u[0]) / c;
        if (tt > 0.5 && tt < t && s2 >= 0 && s2 <= 1) t = tt;
      }
      pts3.push(add2(d.at, mul2(u, t)));
    }
    return full ? pts3 : [d.at, ...pts3];
  };
  v1.devices = (m.devices || []).map((d) => ({
    ...d,
    view: (() => {
      const v = sensorView(d);
      return v && v.map(P);
    })(),
    clip: d.clip || d.glow && beamClip(`beam-${d.id}`, d.glow.at, d.beam_dir, d.beam),
    at: d.at && P(d.at),
    hit: d.hit && d.hit.map((v) => v * k),
    glow: d.glow && { at: P(d.glow.at), r: S(d.glow.r), rx: S(d.glow.rx), ry: S(d.glow.ry) },
    range: S(d.range),
    labels: d.labels && { ...d.labels, at: P(d.labels.at) }
  }));
  v1.climate = (m.climate || []).map((c) => ({ ...c, at: P(c.at) }));
  v1.cameras = (m.cameras || []).map((c) => ({ ...c, at: P(c.at), range: S(c.range) }));
  v1.locks = (m.locks || []).map((l) => ({ ...l, at: P(l.at) }));
  if (m.garden) v1.garden = m.garden.map((g) => ({ ...g, points: g.points && g.points.map(P), line: g.line && g.line.map(P), at: g.at && P(g.at) }));
  if (m.notes) v1.notes = m.notes.map((x) => ({
    ...x,
    at: x.at && P(x.at),
    from: x.from && P(x.from),
    to: x.to && P(x.to),
    size: x.type === "text" ? S(x.size || 24) : void 0
  }));
  if (m.furniture) v1.furniture = m.furniture.map((p2) => ({
    ...p2,
    at: P(p2.at),
    origin: p2.origin && P(p2.origin),
    size: p2.size && p2.size.map((v) => v * k)
  }));
  return v1;
}

// generator/notes.js
var MARKER_ICONS = {
  pin: "\u{1F4CD}",
  valve: "\u{1F6B0}",
  water: "\u{1F4A7}",
  fuse: "\u26A1",
  gas: "\u{1F525}",
  heat: "\u2668\uFE0F",
  key: "\u{1F511}",
  warning: "\u26A0\uFE0F",
  extinguisher: "\u{1F9EF}",
  tools: "\u{1F527}",
  wifi: "\u{1F4F6}",
  box: "\u{1F4E6}",
  bed: "\u{1F6CF}\uFE0F",
  plant: "\u{1FAB4}",
  star: "\u2B50",
  info: "\u2139\uFE0F"
};
var DEFAULT_COLOR2 = "#c3cfdf";
var n3 = (v) => Number(Number(v).toFixed(2)).toString();
var esc2 = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var hexOk2 = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
function notesLayer(notes, upright = 0, k = 1) {
  if (!notes || !notes.length) return "";
  const L = [`  <g id="notes" font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="middle" pointer-events="none">`];
  for (const x of notes) {
    const color = hexOk2(x.color) ? x.color : DEFAULT_COLOR2;
    if (x.type === "text" && x.at && x.text) {
      const [px, py] = x.at;
      const size = x.size || 24 * k;
      const rot = upright + (Number(x.rot) || 0);
      const lines = String(x.text).split("\n");
      const spans = lines.map((t, i) => `<tspan x="${n3(px)}" dy="${n3(i ? size * 1.15 : -((lines.length - 1) * size * 1.15) / 2)}">${esc2(t)}</tspan>`).join("");
      L.push(`    <text id="${esc2(x.id)}" class="note-text" x="${n3(px)}" y="${n3(py)}" font-size="${n3(size)}" fill="${color}"${x.bold ? ' font-weight="600"' : ""} transform="rotate(${n3(rot)} ${n3(px)} ${n3(py)})">${spans}</text>`);
    } else if (x.type === "marker" && x.at) {
      const [px, py] = x.at;
      const r = 9;
      const glyph = MARKER_ICONS[x.icon] || x.icon || MARKER_ICONS.pin;
      L.push(`    <g id="${esc2(x.id)}" class="note-marker"${x.note ? ` data-note="${esc2(x.note)}"` : ""}${x.text ? ` data-title="${esc2(x.text)}"` : ""}${x.entity ? ` data-entity="${esc2(x.entity)}"` : ""} pointer-events="all">`);
      L.push(`      <circle class="note-pin" cx="${n3(px)}" cy="${n3(py)}" r="${n3(r)}" fill="#243040" stroke="${color}" stroke-width="1"/>`);
      L.push(`      <text class="note-glyph" x="${n3(px)}" y="${n3(py + 0.5)}" font-size="10" transform="rotate(${n3(upright)} ${n3(px)} ${n3(py)})">${esc2(glyph)}</text>`);
      if (x.text) L.push(`      <text class="note-caption" x="${n3(px)}" y="${n3(py + r + 7)}" font-size="9" fill="${color}" transform="rotate(${n3(upright)} ${n3(px)} ${n3(py)})">${esc2(x.text)}</text>`);
      L.push(`    </g>`);
    } else if (x.type === "arrow" && x.from && x.to) {
      const [a, b] = [x.from, x.to];
      const len3 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len3 < 1) continue;
      const w = x.width || 1.6;
      const ux = (b[0] - a[0]) / len3, uy = (b[1] - a[1]) / len3, h = Math.min(8 + w * 2, len3 / 2);
      const head2 = [[b[0] - ux * h - uy * h * 0.5, b[1] - uy * h + ux * h * 0.5], [b[0] - ux * h + uy * h * 0.5, b[1] - uy * h - ux * h * 0.5]];
      L.push(`    <g id="${esc2(x.id)}" class="note-arrow" stroke="${color}" fill="${color}">`);
      L.push(`      <line x1="${n3(a[0])}" y1="${n3(a[1])}" x2="${n3(b[0] - ux * h * 0.8)}" y2="${n3(b[1] - uy * h * 0.8)}" stroke-width="${n3(w)}" stroke-linecap="round"/>`);
      L.push(`      <path d="M${n3(b[0])} ${n3(b[1])} L${n3(head2[0][0])} ${n3(head2[0][1])} L${n3(head2[1][0])} ${n3(head2[1][1])} Z" stroke="none"/>`);
      L.push(`    </g>`);
    }
  }
  L.push(`  </g>`);
  return L.join("\n");
}

// generator/floorplan-model.js
var GENERATOR_VERSION = 1;
var GLOW = {
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
  garden_lamp: { r: 45, fill: "light-pool" }
};
var SHADES = { pendant: 10, floor_lamp: 9, table_lamp: 7 };
var NIGHT_BULB_SCALE = 0.65;
var COVER_OUT = 4.5;
var COVER_ICON_IN = 15;
var COVER_SLAT = 12;
var CAMERA_HIT_R = 22;
var INWARD = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] };
var N;
function n4(v) {
  const r = Number(v.toFixed(2));
  return String(Object.is(r, -0) ? 0 : r);
}
var p = (pt) => n4(pt[0]) + "," + n4(pt[1]);
var pts2 = (list) => list.map(p).join(" ");
var esc3 = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
var watts = (w) => w !== null && w !== void 0 && w !== "" && Number.isFinite(Number(w)) && Number(w) >= 0 ? String(Number(w)) : void 0;
var attrs = (o) => Object.entries(o).filter(([, v]) => v !== void 0 && v !== null && v !== false).map(([k, v]) => ` ${k}="${esc3(v)}"`).join("");
var rectPath = ([x, y, w, h]) => `M${n4(x)} ${n4(y)} h${n4(w)} v${n4(h)} h${n4(-w)} z`;
var piecePath = (r) => Array.isArray(r[0]) ? "M" + r.map((q) => n4(q[0]) + " " + n4(q[1])).join(" L") + " z" : rectPath(r);
function generateSvg(model, { furniture = "", names = null, floor = null } = {}) {
  N = resolveNames(names);
  let floorsAttr = "";
  if (model.version === 2 && model.floors && model.floors.length) {
    const list = [{ id: null, name: model.floor_name || "" }, ...model.floors.map((f) => ({ id: f.id, name: f.name || f.id }))];
    floorsAttr = ` data-floors="${esc3(JSON.stringify(list))}"${floor ? ` data-floor="${esc3(floor)}"` : ""}`;
  }
  if (model.version === 2) {
    const i = floorIndex(model, floor);
    if (floor !== null && i < 0) throw new Error("no floor " + floor);
    const below = i >= 0 ? floorModel(model, i - 1) : null;
    const fm = floorModel(model, i);
    const voids = stairVoids(below);
    model = lowerV2(voids.length ? { ...fm, furniture: [...fm.furniture || [], ...voids] } : fm);
  }
  model = { rooms: [], windows: [], doors: [], lights: [], devices: [], covers: [], climate: [], cameras: [], locks: [], ...model };
  model.walls = { exterior: [], interior: [], ...model.walls || {} };
  const c = model.canvas;
  const textRot = -c.rotate;
  const rooms = new Map(model.rooms.map((r) => [r.id, r]));
  const windows = new Map(model.windows.map((w2) => [w2.id, w2]));
  const clipOf = (roomId) => {
    if (!roomId) return null;
    const r = rooms.get(roomId);
    if (!r) return null;
    return "clip-" + (r.zone || r.id);
  };
  const out = [];
  const w = (s) => out.push(s);
  w(`<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="${c.viewBox.map(n4).join(" ")}" width="${n4(c.viewBox[2])}" height="${n4(c.viewBox[3])}"
     role="img" ${N.attrContract}="${c.contract}" data-generator="${GENERATOR_VERSION}"${floorsAttr}${c.start ? ` data-start="${c.start.map(n4).join(" ")}"` : ""}>`);
  w(`  <!-- GENERATED from the house model by generator/floorplan-model.js - do not edit by hand -->`);
  if (c.description) w(`  <desc id="desc">${esc3(c.description)}</desc>`);
  w(`  <g id="${N.rotation}" transform="rotate(${n4(c.rotate)})">`);
  w(`  <rect id="sheet" x="${n4(c.sheet[0])}" y="${n4(c.sheet[1])}" width="${n4(c.sheet[2])}" height="${n4(c.sheet[3])}" fill="#1b2433"/>`);
  const kcm = 1 / (model.canvas && model.canvas.cm_per_svg || 1);
  const garden = gardenLayer(model.garden, kcm);
  if (garden) w(`  <defs>
${gardenDefs(model.garden, kcm)}
  </defs>
` + garden);
  if ((model.slab || []).length || (model.thresholds || []).length) {
    w(`  <g id="slab" fill="#1e2836" stroke="none" pointer-events="none">`);
    for (const t of model.slab || []) w(`    <polygon points="${pts2(t)}"/>`);
    for (const t of model.thresholds || []) w(`    <polygon class="threshold" points="${pts2(t)}"/>`);
    w(`  </g>`);
  }
  w(`  <g id="rooms" fill="#1e2836" stroke="none" pointer-events="all">`);
  for (const r of model.rooms) {
    const tint = r.tint && r.tint.entity ? attrs({ [N.attrTintEntity]: r.tint.entity, [N.attrTintKind]: r.tint.kind || "state" }) : "";
    const unused = r.unused ? ' class="unused" fill="#161d28"' : "";
    const fl = !r.unused && floorId(r.floor);
    w(`    <polygon id="room-${r.id}" data-room="${esc3(r.name)}" points="${pts2(r.points)}"${tint}${unused}${fl ? ` fill="url(#${fl})"` : ""}/>`);
  }
  w(`  </g>`);
  w(`  <defs>`);
  for (const k of model.clips || []) {
    if (k.points) {
      w(`    <clipPath id="clip-${k.id}"><polygon points="${pts2(k.points)}"/></clipPath>`);
      continue;
    }
    const [x, y, cw, ch] = k.rect;
    w(`    <clipPath id="clip-${k.id}"><rect x="${n4(x)}" y="${n4(y)}" width="${n4(cw)}" height="${n4(ch)}"/></clipPath>`);
  }
  for (const r of model.rooms) if (!r.zone) w(`    <clipPath id="clip-${r.id}"><polygon points="${pts2(r.points)}"/></clipPath>`);
  for (const z of model.zones || []) w(`    <clipPath id="clip-${z.id}"><polygon points="${pts2(z.points)}"/></clipPath>`);
  const icons = iconDefs((model.devices || []).filter((d) => d.type === "icon").map((d) => d.kind));
  const floors = floorDefs(model.rooms.filter((r) => !r.unused && r.floor).map((r) => r.floor), 1 / (model.canvas && model.canvas.cm_per_svg || 1));
  w(defs(N) + (icons ? icons + "\n" : "") + (floors ? floors + "\n" : "") + `  </defs>`);
  w("");
  w(style(N));
  w("");
  const shown = (model.dividers || []).filter((d) => d.show);
  if (shown.length) {
    w(`  <g id="dividers" fill="none" stroke="#3a4861" stroke-width="1" stroke-dasharray="6 4" pointer-events="none">`);
    for (const d of shown) w(`    <line x1="${n4(d.a[0])}" y1="${n4(d.a[1])}" x2="${n4(d.b[0])}" y2="${n4(d.b[1])}"/>`);
    w(`  </g>`);
  }
  if (Array.isArray(model.furniture) && model.furniture.length) w(furnitureLayer(model.furniture));
  else if (furniture) w(furniture.replace(/\s+$/, ""));
  w(`  <g id="lights" fill="#5b6a80" stroke="#5b6a80" stroke-width="0.8">`);
  const ambient = (d) => d.type === "tv" || d.type === "climate_unit";
  for (const d of (model.devices || []).filter(ambient)) w(device(d, clipOf, textRot));
  for (const l of model.lights) w(l.type === "fixture" ? fixture(l, clipOf, textRot) : light(l, clipOf, textRot));
  for (const d of (model.devices || []).filter((d2) => !ambient(d2))) w(device(d, clipOf, textRot));
  w(`  </g>`);
  w(`  <g id="room-labels" display="none" fill="#8ea1ba" font-family="system-ui, sans-serif"
     font-size="13" text-anchor="middle" dominant-baseline="middle"
     pointer-events="none">`);
  for (const r of model.rooms) {
    if (!r.label) continue;
    const [x, y] = r.label;
    w(`    <text id="label-${r.id}" x="${n4(x)}" y="${n4(y)}" transform="rotate(${n4(textRot)} ${n4(x)} ${n4(y)})">${esc3(r.name)}</text>`);
  }
  w(`  </g>`);
  const labelled = (model.devices || []).filter((d) => d.labels);
  if (labelled.length) {
    w(`  <g id="${N.deviceLabels}" font-family="system-ui, sans-serif" text-anchor="middle"
     dominant-baseline="middle">`);
    for (const d of labelled) {
      const [x, y] = d.labels.at;
      const spans = d.labels.machines.map((m, i) => `      <tspan class="${N.deviceLabel}"${attrs({
        [N.attrName]: m.name,
        [N.attrShort]: m.short,
        [N.attrState]: m.state,
        "data-job": m.job,
        [N.attrEnd]: m.end,
        x: n4(x),
        dy: i ? 12 : void 0
      })}></tspan>`);
      w(`    <text id="${d.labels.id}" x="${n4(x)}" y="${n4(y)}" transform="rotate(${n4(textRot)} ${n4(x)} ${n4(y)})">
${spans.join("\n")}
    </text>`);
    }
    w(`  </g>`);
  }
  w(`  <g id="room-climate" font-family="system-ui, sans-serif" text-anchor="middle"
     dominant-baseline="middle">`);
  for (const k of model.climate || []) {
    const [x, y] = k.at;
    const X = n4(x);
    const icon = (alt) => `    <g id="climate-${k.id}${alt ? "-icon" : ""}" class="climate-icon${alt ? " alt" : ""}" transform="translate(${X} ${n4(y)}) rotate(${n4(textRot)})"${attrs({ "data-temp": alt ? void 0 : k.temperature, "data-hum": alt ? void 0 : k.humidity })}><circle r="7" fill="#1b2433" stroke="#8ea1ba" stroke-width="0.8"/><path d="M-2.2 1.6 V-3.6 A1.2 1.2 0 0 1 0.2 -3.6 V1.6 A2.2 2.2 0 1 1 -2.2 1.6 Z" fill="none" stroke="#c3cfdf" stroke-width="0.7"/><circle cx="-1" cy="3.2" r="1.1" fill="#e57373"/><path d="M3.6 -2.6 C2.6 -1.2 2.2 -0.4 2.2 0.4 A1.4 1.4 0 0 0 5 0.4 C5 -0.4 4.6 -1.2 3.6 -2.6 Z" fill="#6fc9ef"/></g>`;
    if (k.display !== "icon") w(icon(true));
    if (k.display === "icon") {
      w(icon(false));
      continue;
    }
    const name = k.name ? `<tspan class="climate-name" x="${X}">${esc3(k.name)}</tspan>` : "";
    w(`    <text id="climate-${k.id}" x="${X}" y="${n4(y)}" transform="rotate(${n4(textRot)} ${X} ${n4(y)})"${attrs({ "data-temp": k.temperature, "data-hum": k.humidity })}>${name}<tspan class="climate-temp" x="${X}"${k.name ? ' dy="15"' : ""}>\u2014</tspan><tspan class="climate-hum" x="${X}" dy="13">\u2014</tspan></text>`);
  }
  w(`  </g>`);
  const wallPath = (id, list) => `<path id="${id}" fill="#000000" fill-rule="nonzero" stroke="none" d="
` + list.map((r) => "      " + piecePath(r)).join("\n") + `
    "/>`;
  w(`  <g id="walls-exterior">
    ${wallPath("wall-ext", model.walls.exterior)}
  </g>`);
  w(`  <g id="walls-interior">
    ${wallPath("wall-int", model.walls.interior)}
  </g>`);
  const doors = model.doors || [];
  const hide = c.door_symbols === false;
  w(`  <g id="doors-interior"${hide ? ` class="${N.noSymbol}"` : ""} fill="none" stroke="#384354" stroke-width="1">`);
  for (const d of doors.filter((d2) => !d2.exterior)) {
    w(`    <g id="${d.id}" data-width="${n4(doorWidth(d))}"${contactAttr(d.contact)}>
` + doorShape(d, false) + `
    </g>`);
  }
  w(`  </g>`);
  if (model.walls.fireplace && model.walls.fireplace.length) {
    w(`  <g id="fireplace-nook">
    ${wallPath("nook-walls", model.walls.fireplace)}
  </g>`);
  }
  w(`  <g id="openings-exterior">`);
  for (const win of model.windows) {
    if (win.type === "hst") {
      w(`    <g id="${win.id}" data-facade="${win.facade}" data-type="hst" data-width="${n4(win.width)}"${contactAttr((win.contacts || [])[0])}>`);
      if (win.line) {
        const H = win.tick || 4, [a, b] = win.line, L0 = len2(win.line);
        const ux = (b[0] - a[0]) / (L0 || 1), uy = (b[1] - a[1]) / (L0 || 1), mx = -uy, my = ux;
        const dist = (q) => Math.abs((q[0] - a[0]) * mx + (q[1] - a[1]) * my);
        const t = Math.max(...Object.values(win.sashes).map((l) => dist(l[0]))), ds = t * 0.55, F = t + ds;
        const B = Math.min(0.8 * F, L0 / 6);
        const ln = (p2, q, cls, sw, extra = "") => `      <line class="${cls}"${extra} x1="${n4(p2[0])}" y1="${n4(p2[1])}" x2="${n4(q[0])}" y2="${n4(q[1])}" stroke="#6fc9ef" stroke-width="${sw}"/>`;
        const box = (p2, q, d, cls) => {
          const c2 = [[p2[0] + mx * d, p2[1] + my * d], [q[0] + mx * d, q[1] + my * d], [q[0] - mx * d, q[1] - my * d], [p2[0] - mx * d, p2[1] - my * d]];
          return `      <polygon class="${cls}" points="${c2.map((v) => `${n4(v[0])},${n4(v[1])}`).join(" ")}" fill="none" stroke="#6fc9ef" stroke-width="0.6"/>`;
        };
        w(box(a, b, F, "frame"));
        for (const e of [[a, B], [b, -B]]) {
          const q = [e[0][0] + ux * e[1], e[0][1] + uy * e[1]];
          w(ln([q[0] + mx * F, q[1] + my * F], [q[0] - mx * F, q[1] - my * F], "frame-cross", 0.6));
        }
        for (const [sash, line2] of Object.entries(win.sashes)) {
          const along = (q2) => (q2[0] - a[0]) * ux + (q2[1] - a[1]) * uy;
          const cut2 = (q2) => {
            const s = along(q2), s2 = Math.min(Math.max(s, B), L0 - B);
            return [q2[0] + ux * (s2 - s), q2[1] + uy * (s2 - s)];
          };
          const p2 = cut2(line2[0]), q = cut2(line2[1]);
          w(box(p2, q, ds, "sash"));
          w(`      <line id="${win.id}-${sash}" ${lineXY([p2, q])} stroke="#6fc9ef" stroke-width="0.6"/>`);
        }
      } else {
        for (const [sash, line2] of Object.entries(win.sashes)) {
          w(`      <line id="${win.id}-${sash}" ${lineXY(line2)} stroke="#6fc9ef" stroke-width="1.4"/>`);
        }
      }
      w(`    </g>`);
    } else {
      const panes = win.panes || 1, cts = win.contacts || [];
      const one = cts.length === 1 ? cts[0] : null;
      const H = win.tick || 4, F = H * 0.18;
      const [a, b] = win.line, L0 = len2(win.line), k2 = Math.max(panes, cts.length);
      const ux = (b[0] - a[0]) / (L0 || 1), uy = (b[1] - a[1]) / (L0 || 1), mx = -uy, my = ux;
      const at0 = (f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const div = (i) => i <= 0 ? 0 : i >= k2 ? 1 : win.splits && win.splits.length === k2 - 1 ? win.splits[i - 1] : i / k2;
      const at = (f) => at0(f);
      const off = (q, t) => [q[0] + ux * t, q[1] + uy * t];
      const B = Math.min(0.8 * F, L0 / (3 * k2));
      const across = (q, cls = "frame-cross") => `      <line class="${cls}" x1="${n4(q[0] + mx * F)}" y1="${n4(q[1] + my * F)}" x2="${n4(q[0] - mx * F)}" y2="${n4(q[1] - my * F)}" stroke="#6fc9ef" stroke-width="0.6"/>`;
      const parts = [];
      const c2 = [[a[0] + mx * F, a[1] + my * F], [b[0] + mx * F, b[1] + my * F], [b[0] - mx * F, b[1] - my * F], [a[0] - mx * F, a[1] - my * F]];
      parts.push(`      <polygon class="frame" points="${c2.map((v) => `${n4(v[0])},${n4(v[1])}`).join(" ")}" fill="none" stroke="#6fc9ef" stroke-width="0.6"/>`);
      parts.push(across(off(a, B)), across(off(b, -B)));
      for (let i = 0; i < k2; i++) {
        const p0 = off(at(div(i)), i ? B / 2 : B), p1 = off(at(div(i + 1)), i + 1 < k2 ? -B / 2 : -B);
        parts.push(`      <line class="${N.pane}" ${lineXY([p0, p1])} stroke="#6fc9ef" stroke-width="0.6"${cts.length > 1 ? contactAttr(cts[i]) : ""}/>`);
        if (i) {
          const q = at(div(i));
          parts.push(across(off(q, -B / 2)), across(off(q, B / 2)));
          parts.push(`      <line class="${N.paneTick}" ${lineXY([[q[0] - mx * H, q[1] - my * H], [q[0] + mx * H, q[1] + my * H]])} stroke-opacity="0"/>`);
        }
      }
      w(`    <g id="${win.id}" data-facade="${win.facade}" data-width="${n4(win.width || L0)}"${contactAttr(one)}>
${parts.join("\n")}
    </g>`);
    }
  }
  for (const d of doors.filter((d2) => d2.exterior)) {
    w(`    <g id="${d.id}"${hide ? ` class="${N.noSymbol}"` : ""} data-facade="${d.facade}" data-width="${n4(doorWidth(d))}"${contactAttr(d.contact)}
       fill="none" stroke="#384354" stroke-width="1">
` + doorShape(d, true) + `
    </g>`);
  }
  w(`  </g>`);
  w(`  <g id="covers">`);
  for (const cv of model.covers || []) w(cover(cv, windows.get(cv.window), textRot));
  w(`  </g>`);
  w(`  <g id="cameras">`);
  for (const cam of model.cameras || []) w(camera(cam));
  w(`  </g>`);
  const notes = notesLayer(model.notes, textRot, 1 / (model.canvas && model.canvas.cm_per_svg || 1));
  if (notes) w(notes);
  w(`  <g id="controls">`);
  for (const lk of model.locks || []) w(lock(lk, textRot));
  w(`  </g>`);
  w(`  </g>`);
  w(`</svg>`);
  return out.join("\n") + "\n";
}
var len2 = ([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]);
var lineXY = ([a, b]) => `x1="${n4(a[0])}" y1="${n4(a[1])}" x2="${n4(b[0])}" y2="${n4(b[1])}"`;
var doorWidth = (d) => d.width || len2([d.hinge, d.leaf]);
var contactAttr = (e) => e ? ` ${N.attrContact}="${esc3(e)}"` : "";
function fanPath(x, y, dir, fov, r) {
  const a0 = (dir - fov / 2) * Math.PI / 180, a1 = (dir + fov / 2) * Math.PI / 180;
  return `M${x.toFixed(2)} ${y.toFixed(2)} L${(x + r * Math.cos(a0)).toFixed(2)} ${(y + r * Math.sin(a0)).toFixed(2)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${fov > 180 ? 1 : 0} 1 ${(x + r * Math.cos(a1)).toFixed(2)} ${(y + r * Math.sin(a1)).toFixed(2)} Z`;
}
function doorShape(d, named) {
  if (d.lines) {
    const look = d.garage === "door" ? ' stroke="#8ea1ba" stroke-width="2.4"' : d.garage === "track" ? ' stroke="#6b7a90" stroke-width="1"' : "";
    const dash = (d.dashed ? ' stroke-dasharray="4 3"' : "") + look;
    return d.lines.map((l) => `      <line ${lineXY(l)}${dash}/>`).join("\n");
  }
  return named ? `      <line id="${d.id}-leaf" x1="${n4(d.hinge[0])}" y1="${n4(d.hinge[1])}" x2="${n4(d.leaf[0])}" y2="${n4(d.leaf[1])}"/>
      <path id="${d.id}-swing" stroke-width="0.6"
            d="${doorArc(d)}"/>` : `      <line x1="${n4(d.hinge[0])}" y1="${n4(d.hinge[1])}" x2="${n4(d.leaf[0])}" y2="${n4(d.leaf[1])}"/>
      <path stroke-width="0.6" d="${doorArc(d)}"/>`;
}
function doorArc(d) {
  const r = n4(doorWidth(d));
  return `M${n4(d.closed[0])} ${n4(d.closed[1])} A${r} ${r} 0 0 ${d.sweep} ${n4(d.leaf[0])} ${n4(d.leaf[1])}`;
}
function glowCircle(at, r, fill, cls = "glow") {
  return `<circle class="${cls}" cx="${n4(at[0])}" cy="${n4(at[1])}" r="${n4(r)}" fill="url(#${fill})" stroke="none" opacity="0"/>`;
}
function bulbUse(b, kind, upright, cls = "bulb") {
  const rot = b.length > 2 ? b[2] : upright;
  const scale2 = kind === "night" ? ` scale(${NIGHT_BULB_SCALE})` : "";
  return `<use class="${cls}" href="#bulb" transform="translate(${n4(b[0])} ${n4(b[1])}) rotate(${n4(rot)})${scale2}"/>`;
}
function light(l, clipOf, upright) {
  const g = GLOW[l.kind] || GLOW.ceiling;
  const clip = l.outdoor ? null : clipOf(l.room);
  const bulbs = l.bulbs || [];
  const head2 = `    <g${attrs({ id: l.id, "data-entity": l.entity, class: "light", "data-kind": l.kind, "data-outdoor": l.outdoor ? "true" : void 0, "data-watts": watts(l.watts) })}>`;
  const lines = [head2];
  const R = l.glow_r || g.r;
  const glows = l.glows || (bulbs.length ? bulbs.map((b) => ({ at: b, r: R })) : l.strip ? [{ at: [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2], r: R }] : []);
  lines.push(`      <g class="glows"${clipAttr2(clip)}>`);
  for (const gl of glows) {
    if (gl.clip) lines.push(`        <g clip-path="url(#clip-${gl.clip})">`, "          " + glowCircle(gl.at, gl.r || R, g.fill), `        </g>`);
    else lines.push("        " + glowCircle(gl.at, gl.r || R, g.fill));
  }
  lines.push(`      </g>`);
  if (l.rail) lines.push(`      <polyline class="rail" points="${pts2(l.rail)}" fill="none"/>`);
  if (l.strip) {
    const [x, y, sw, sh] = l.strip;
    lines.push(`      <rect class="led" x="${n4(x)}" y="${n4(y)}" width="${n4(sw)}" height="${n4(sh)}" rx="0.3"/>`);
  }
  for (const b of bulbs) {
    if (SHADES[l.kind]) lines.push(`      <circle class="shade" cx="${n4(b[0])}" cy="${n4(b[1])}" r="${SHADES[l.kind]}" fill="none" stroke-width="0.7"${l.kind === "pendant" ? ' stroke-dasharray="1.6 1.1"' : ""}/>`);
    if (l.kind === "garden_lamp") lines.push(`      <rect class="shade" x="${n4(b[0] - 7.5)}" y="${n4(b[1] - 7.5)}" width="15" height="15" rx="2" fill="none" stroke-width="0.7"/>`);
    lines.push("      " + bulbUse(b, l.kind, upright));
  }
  lines.push(`    </g>`);
  return lines.join("\n");
}
var clipAttr2 = (id) => id ? ` clip-path="url(#${id})"` : "";
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
  lines.push("      " + (two ? chandelier(f, smallAt, rot) : bulbUse(f.at, f.kind, upright, "bulb-shared")));
  lines.push(`    </g>`);
  return lines.join("\n");
}
function chandelier(f, smallAt, rot) {
  const count = (i) => Math.max(1, Math.min(12, Math.round(Number(f.circuits[i].bulbs) || (i === smallAt ? 1 : 3))));
  const S = count(smallAt), N3 = S + count(1 - smallAt);
  const R = N3 <= 6 ? 7.6 : 7.6 + (N3 - 6) * 0.6, rb = Math.min(2, R * Math.sin(Math.PI / N3) * 0.75);
  let arms = "", bulbs = "";
  for (let i = 0; i < N3; i++) {
    const a = -Math.PI * 3 / 4 + 2 * Math.PI * i / N3, c = Math.cos(a), s = Math.sin(a);
    const small = Math.floor((i + 1) * S / N3) > Math.floor(i * S / N3);
    arms += `M${n4(c * 1.8)} ${n4(s * 1.8)}L${n4(c * (R - rb))} ${n4(s * (R - rb))}`;
    bulbs += `<circle class="ch-b ch-${small ? 1 : 3}" cx="${n4(c * R)}" cy="${n4(s * R)}" r="${n4(rb)}"/>`;
  }
  return `<g class="bulb-shared chandelier" transform="translate(${n4(f.at[0])} ${n4(f.at[1])}) rotate(${n4(rot)})"><circle class="ch-hub" r="1.6"/><path class="ch-arm" d="${arms}"/>${bulbs}</g>`;
}
function hitRect([x, y, w, h]) {
  return `<rect class="${N.hitArea}" x="${n4(x)}" y="${n4(y)}" width="${n4(w)}" height="${n4(h)}"/>`;
}
function device(d, clipOf, upright = 0) {
  const cls = { presence: N.presence, appliance: N.appliance, climate_unit: N.ac, tv: "tv", motion: N.motion, icon: N.iconDevice, skylight: "skylight" }[d.type];
  if (!cls) throw new Error("unknown device type " + d.type);
  const clip = clipOf(d.room);
  const valueEntity = d.type === "icon" ? d.value_entity || (VALUE_KINDS.includes(d.kind) ? d.entity : void 0) : void 0;
  const extra = d.type === "icon" ? attrs({ "data-kind": d.kind, [N.attrValue]: valueEntity }) : d.type === "skylight" ? attrs({ [N.attrContact]: d.contact }) : "";
  const L = [`    <g id="${d.id}" data-entity="${esc3(d.entity)}" class="${cls}"${extra}>`];
  let topGroup = "", rackRows = null;
  if (d.hit) L.push("      " + hitRect(d.hit));
  const shaped = d.type === "tv" || d.type === "climate_unit" || d.type === "appliance" && d.kind || d.type === "icon" && d.hit;
  if (d.hit && shaped) {
    const [x, y, w, h] = d.hit, a = (Math.round((d.beam_dir ?? 180) / 90) * 90 % 360 + 360) % 360;
    const side = a % 180 === 0, W2 = side ? w : h, D = side ? h : w;
    const tf = `translate(${n4(x + w / 2)} ${n4(y + h / 2)}) rotate(${a - 180})`;
    const X0 = -W2 / 2, Y0 = -D / 2, g = [];
    if (d.type === "tv") {
      const t = Math.max(1.6, D * 0.35), y1 = Y0 + D * 0.45;
      g.push(`<rect class="tv-mount" x="${n4(-W2 * 0.18)}" y="${n4(Y0)}" width="${n4(W2 * 0.36)}" height="${n4(y1 - Y0)}" rx="0.6"/>`);
      g.push(`<rect class="tv-body" x="${n4(X0)}" y="${n4(y1)}" width="${n4(W2)}" height="${n4(t)}" rx="${n4(Math.min(1.2, t / 2))}"/>`);
      g.push(`<line class="tv-screen" x1="${n4(X0 + 1)}" y1="${n4(y1 + t)}" x2="${n4(-X0 - 1)}" y2="${n4(y1 + t)}"/>`);
    } else if (d.type === "climate_unit") {
      const r = Math.min(D * 0.45, W2 * 0.12);
      g.push(`<path class="ac-body" d="M${n4(X0)} ${n4(Y0)} H${n4(-X0)} V${n4(-Y0 - r)} Q${n4(-X0)} ${n4(-Y0)} ${n4(-X0 - r)} ${n4(-Y0)} H${n4(X0 + r)} Q${n4(X0)} ${n4(-Y0)} ${n4(X0)} ${n4(-Y0 - r)} Z"/>`);
      for (const f of [0.55, 0.7, 0.85]) {
        const yy = Y0 + D * f, inset2 = W2 * 0.08;
        g.push(`<line class="ac-louvre" x1="${n4(X0 + inset2)}" y1="${n4(yy)}" x2="${n4(-X0 - inset2)}" y2="${n4(yy)}"/>`);
      }
      g.push(`<circle class="ac-led" cx="${n4(-X0 - W2 * 0.1)}" cy="${n4(Y0 + D * 0.3)}" r="${n4(Math.max(0.6, D * 0.06))}"/>`);
    } else {
      const k = d.kind, m0 = Math.min(W2, D), rr = (x0, y0, w0, h0, r0, cls2) => `<rect class="${cls2}" x="${n4(x0)}" y="${n4(y0)}" width="${n4(w0)}" height="${n4(h0)}" rx="${n4(r0)}"/>`;
      g.push(rr(X0, Y0, W2, D, Math.min(3, m0 * 0.08), "unit-body"));
      const cs = (cx, cy, r, cls2) => `<circle class="${cls2}" cx="${n4(cx)}" cy="${n4(cy)}" r="${n4(r)}"/>`;
      const ln = (x1, y1, x2, y2, cls2) => `<line class="${cls2}" x1="${n4(x1)}" y1="${n4(y1)}" x2="${n4(x2)}" y2="${n4(y2)}"/>`;
      if ((k === "washer" || k === "dryer") && d.top) {
        g.push(`<polygon class="unit-half" points="${n4(X0)},${n4(Y0)} ${n4(X0)},${n4(-Y0)} ${n4(-X0)},${n4(-Y0)}"/>`);
        g.push(ln(X0, Y0, -X0, -Y0, "unit-line"));
        const half = (kk, cx, cy) => {
          const r = m0 * 0.15, out = [cs(cx, cy, r, "unit-door"), cs(cx, cy, r * 0.62, "unit-glass")];
          if (kk === "dryer") for (const f of [-0.35, 0, 0.35]) out.push(ln(cx - r * 0.45, cy + r * f, cx + r * 0.45, cy + r * f, "unit-line"));
          return out;
        };
        g.push(...half(k, X0 + W2 * 0.3, -Y0 - D * 0.3), ...half(d.top.kind, -X0 - W2 * 0.3, Y0 + D * 0.3));
      } else if (k === "washer" || k === "dryer") {
        g.push(ln(X0, Y0 + D * 0.2, -X0, Y0 + D * 0.2, "unit-line"), cs(X0 + W2 * 0.22, Y0 + D * 0.1, m0 * 0.05, "unit-knob"));
        g.push(cs(0, D * 0.1, m0 * 0.3, "unit-door"), cs(0, D * 0.1, m0 * 0.2, "unit-glass"));
        if (k === "dryer") for (const f of [-0.06, 0.04, 0.14]) g.push(ln(-m0 * 0.12, D * f + D * 0.04, m0 * 0.12, D * f + D * 0.04, "unit-line"));
      } else if (k === "dishwasher") {
        g.push(ln(X0, -Y0 - D * 0.14, -X0, -Y0 - D * 0.14, "unit-line"));
        for (const f of [-0.25, -0.05, 0.15]) g.push(ln(X0 + W2 * 0.12, D * f, -X0 - W2 * 0.12, D * f, "unit-rack"));
      } else if (k === "fridge") {
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"));
        g.push(ln(-X0 - W2 * 0.12, -Y0 - D * 0.04, -X0 - W2 * 0.12, -Y0 - D * 0.24, "unit-handle"));
      } else if (k === "fridge_sbs") {
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"), ln(0, Y0 + D * 0.08, 0, -Y0, "unit-line"));
        g.push(ln(-W2 * 0.06, -Y0 - D * 0.04, -W2 * 0.06, -Y0 - D * 0.24, "unit-handle"), ln(W2 * 0.06, -Y0 - D * 0.04, W2 * 0.06, -Y0 - D * 0.24, "unit-handle"));
      } else if (k === "freezer") {
        g.push(ln(X0, -Y0 - D * 0.1, -X0, -Y0 - D * 0.1, "unit-line"), ln(-X0 - W2 * 0.12, -Y0 - D * 0.04, -X0 - W2 * 0.12, -Y0 - D * 0.24, "unit-handle"));
        for (const a2 of [0, 60, 120]) {
          const r = m0 * 0.16, c = Math.cos(a2 * Math.PI / 180) * r, s2 = Math.sin(a2 * Math.PI / 180) * r;
          g.push(ln(-c, -D * 0.05 - s2, c, -D * 0.05 + s2, "unit-cold"));
        }
      } else if (k === "oven") {
        g.push(rr(X0 + W2 * 0.12, -Y0 - D * 0.28, W2 * 0.76, D * 0.18, 1, "unit-glass"), ln(X0 + W2 * 0.15, -Y0 - D * 0.04, -X0 - W2 * 0.15, -Y0 - D * 0.04, "unit-handle"));
        for (const f of [-0.3, -0.1, 0.1, 0.3]) g.push(cs(W2 * f, -Y0 - D * 0.42, m0 * 0.04, "unit-knob"));
      } else if (k === "cooktop") {
        g.push(cs(-W2 * 0.22, -D * 0.18, m0 * 0.17, "unit-zone"), cs(W2 * 0.22, -D * 0.18, m0 * 0.13, "unit-zone"));
        g.push(cs(-W2 * 0.22, D * 0.18, m0 * 0.13, "unit-zone"), cs(W2 * 0.22, D * 0.18, m0 * 0.17, "unit-zone"));
        g.push(ln(X0 + W2 * 0.25, -Y0 - D * 0.07, -X0 - W2 * 0.25, -Y0 - D * 0.07, "unit-line"));
      } else if (k === "microwave") {
        g.push(rr(X0 + W2 * 0.08, -Y0 - D * 0.3, W2 * 0.6, D * 0.22, 1, "unit-glass"), ln(X0 + W2 * 0.76, Y0, X0 + W2 * 0.76, -Y0, "unit-line"));
        g.push(cs(X0 + W2 * 0.88, -Y0 - D * 0.2, m0 * 0.06, "unit-knob"));
      } else if (k === "hood") {
        g.length = 0;
        g.push(rr(X0, Y0, W2, D, Math.min(3, m0 * 0.08), "unit-body unit-above"));
        for (const f of [-0.25, 0, 0.25]) g.push(ln(W2 * f, Y0 + D * 0.2, W2 * f, -Y0 - D * 0.25, "unit-rack"));
      } else if (k === "coffee") {
        g.push(rr(X0 + W2 * 0.15, Y0 + D * 0.08, W2 * 0.7, D * 0.3, 1, "unit-glass"));
        g.push(cs(0, -Y0 - D * 0.2, m0 * 0.22, "unit-door"), cs(0, -Y0 - D * 0.2, m0 * 0.1, "unit-cup"));
      } else if (k === "soundbar") {
        g.length = 0;
        g.push(rr(X0, Y0, W2, D, Math.min(1.5, D / 2), "unit-body"));
        for (let i = 1; i < 10; i++) g.push(cs(X0 + W2 * i / 10, D * 0.15, Math.min(0.9, D * 0.12), "unit-knob"));
      } else if (k === "projector") {
        g.push(cs(-W2 * 0.2, -Y0 - D * 0.18, m0 * 0.16, "unit-door"), cs(-W2 * 0.2, -Y0 - D * 0.18, m0 * 0.08, "unit-glass"));
        g.push(`<path class="unit-throw" d="M${n4(-W2 * 0.2 - m0 * 0.1)} ${n4(-Y0)} L${n4(-W2 * 0.2 - W2 * 0.6)} ${n4(-Y0 + D * 1.6)} H${n4(-W2 * 0.2 + W2 * 0.6)} L${n4(-W2 * 0.2 + m0 * 0.1)} ${n4(-Y0)} Z"/>`);
        g.push(ln(W2 * 0.1, Y0 + D * 0.3, -X0 - W2 * 0.1, Y0 + D * 0.3, "unit-rack"));
      } else if (k === "console") {
        g.push(ln(X0 + W2 * 0.15, -Y0 - D * 0.25, -X0 - W2 * 0.35, -Y0 - D * 0.25, "unit-line"), cs(-X0 - W2 * 0.15, -Y0 - D * 0.25, m0 * 0.07, "unit-led"));
      } else if (k === "washdry") {
        g.push(ln(X0, Y0 + D * 0.2, -X0, Y0 + D * 0.2, "unit-line"), cs(X0 + W2 * 0.22, Y0 + D * 0.1, m0 * 0.05, "unit-knob"));
        g.push(cs(0, D * 0.1, m0 * 0.3, "unit-door"), cs(0, D * 0.1, m0 * 0.2, "unit-glass"));
        for (const f of [-0.06, 0.1]) g.push(`<path class="unit-heat" d="M${n4(-m0 * 0.12)} ${n4(D * f + D * 0.04)} q${n4(m0 * 0.06)} ${n4(-m0 * 0.04)} ${n4(m0 * 0.12)} 0 t${n4(m0 * 0.12)} 0" fill="none"/>`);
      } else if (k === "wine_fridge") {
        g.push(rr(X0 + W2 * 0.08, Y0 + D * 0.12, W2 * 0.84, D * 0.74, 1, "unit-glass"));
        for (const f of [-0.25, 0, 0.25]) g.push(cs(W2 * f, -D * 0.02, m0 * 0.08, "unit-knob"));
        g.push(ln(-X0 - W2 * 0.12, -Y0 - D * 0.04, -X0 - W2 * 0.12, -Y0 - D * 0.22, "unit-handle"));
      } else if (k === "mower") {
        g.length = 0;
        g.push(`<path class="unit-body" d="M${n4(X0)} ${n4(Y0)} H${n4(-X0)} V${n4(-Y0 - W2 * 0.4)} Q${n4(-X0)} ${n4(-Y0)} 0 ${n4(-Y0)} Q${n4(X0)} ${n4(-Y0)} ${n4(X0)} ${n4(-Y0 - W2 * 0.4)} Z"/>`);
        g.push(rr(X0 - 2, Y0 + D * 0.05, 4, D * 0.35, 1, "unit-handle"), rr(-X0 - 2, Y0 + D * 0.05, 4, D * 0.35, 1, "unit-handle"));
        g.push(cs(0, D * 0.05, m0 * 0.12, "unit-door"));
      } else if (k === "radiator") {
        const nf = Math.max(3, Math.round(W2 / 8));
        for (let i = 1; i < nf; i++) g.push(ln(X0 + W2 * i / nf, Y0 + D * 0.2, X0 + W2 * i / nf, -Y0 - D * 0.2, "unit-line"));
      } else if (k === "heat_pump") {
        g.push(cs(-W2 * 0.15, 0, Math.min(D, W2) * 0.38, "unit-door"), cs(-W2 * 0.15, 0, Math.min(D, W2) * 0.12, "unit-knob"));
        for (const f of [0.2, 0.28, 0.36, 0.44]) g.push(ln(W2 * f, Y0 + D * 0.15, W2 * f, -Y0 - D * 0.15, "unit-line"));
      } else if (k === "water_tank") {
        g.length = 0;
        g.push(cs(0, 0, m0 / 2, "unit-body"), cs(0, 0, m0 * 0.32, "unit-line"));
        g.push(`<circle class="ia-red" cx="${n4(-m0 * 0.15)}" cy="${n4(Y0 + D * 0.12)}" r="${n4(m0 * 0.05)}"/>`, `<circle class="ia-blue" cx="${n4(m0 * 0.15)}" cy="${n4(Y0 + D * 0.12)}" r="${n4(m0 * 0.05)}"/>`);
      } else if (k === "rack") {
        const items = d.items || [], rows = Math.max(items.length, 3), top = Y0 + D * 0.12, h2 = D * 0.8 / rows;
        for (let i = 0; i < rows; i++) g.push(rr(X0 + W2 * 0.1, top + i * h2 + h2 * 0.12, W2 * 0.8, h2 * 0.76, 0.6, items[i] ? "rack-unit" : "rack-empty"));
        rackRows = { tf, items, x: X0 + W2 * 0.1, w: W2 * 0.8, top, h: h2 };
      } else if (k === "recuperator") {
        for (const f of [-0.33, -0.11, 0.11, 0.33]) g.push(cs(W2 * f, Y0 + D * 0.18, m0 * 0.09, "unit-duct"));
        g.push(`<path class="unit-arrow ia-blue" d="M${n4(X0 + W2 * 0.15)} ${n4(D * 0.05)} H${n4(-X0 - W2 * 0.2)}" fill="none"/>`);
        g.push(`<path class="unit-arrow ia-red" d="M${n4(-X0 - W2 * 0.15)} ${n4(D * 0.25)} H${n4(X0 + W2 * 0.2)}" fill="none" stroke="#e57373"/>`);
      } else if (k === "boiler") {
        g.push(rr(-W2 * 0.2, -D * 0.05, W2 * 0.4, D * 0.35, 1, "unit-line"));
        g.push(`<path class="ia-red" d="M0 ${n4(D * 0)} C${n4(W2 * 0.08)} ${n4(D * 0.1)} ${n4(W2 * 0.08)} ${n4(D * 0.18)} 0 ${n4(D * 0.24)} C${n4(-W2 * 0.08)} ${n4(D * 0.18)} ${n4(-W2 * 0.08)} ${n4(D * 0.1)} 0 ${n4(D * 0)} Z"/>`);
        g.push(ln(X0 + W2 * 0.25, Y0 + D * 0.2, -X0 - W2 * 0.25, Y0 + D * 0.2, "unit-line"));
      } else if (k === "media") {
        g.push(cs(0, D * 0.12, m0 * 0.28, "unit-door"), cs(0, D * 0.12, m0 * 0.1, "unit-glass"), cs(0, Y0 + D * 0.2, m0 * 0.08, "unit-knob"));
      } else {
        g.push(cs(0, 0, m0 * 0.25, "unit-door"));
      }
    }
    L.push(`      <g class="dev-shape" transform="${tf}" pointer-events="none">${g.join("")}</g>`);
    if (rackRows) {
      const R = rackRows;
      topGroup = R.items.map((it, i) => {
        const y2 = R.top + i * R.h + R.h * 0.12, hh = R.h * 0.76;
        return `    <g id="${it.id}" data-entity="${esc3(it.entity || "")}" class="${N.appliance} rack-item"${attrs({ "data-kind": it.kind })}>
      <g transform="${R.tf}"><rect class="${N.hitArea}" x="${n4(R.x)}" y="${n4(y2)}" width="${n4(R.w)}" height="${n4(hh)}"/><circle class="rack-led" cx="${n4(R.x + R.w - hh * 0.5)}" cy="${n4(y2 + hh / 2)}" r="${n4(Math.min(1.4, hh * 0.22))}" pointer-events="none"/></g>
    </g>`;
      }).join("\n");
    }
    if (d.type === "appliance" && d.top) {
      const tri = `${n4(X0)},${n4(Y0)} ${n4(-X0)},${n4(Y0)} ${n4(-X0)},${n4(-Y0)}`;
      topGroup = `    <g id="${d.id}-top" data-entity="${esc3(d.top.entity || "")}" class="${N.appliance} stack-top"${attrs({ "data-kind": d.top.kind })}>
      <g transform="${tf}"><polygon class="${N.hitArea}" points="${tri}"/><polygon class="unit-half" points="${tri}" pointer-events="none"/></g>
    </g>`;
    }
  }
  const fan = () => {
    if (!d.range) return;
    if (d.view && d.view.length > 2) {
      L.push(`      <polygon class="${N.sensorFan}" points="${d.view.map((p2) => `${n4(p2[0])},${n4(p2[1])}`).join(" ")}"/>`);
      return;
    }
    const path = `<path class="${N.sensorFan}" d="${fanPath(d.at[0], d.at[1], d.direction ?? 90, d.fov ?? 100, d.range)}"/>`;
    L.push(clip ? `      <g${clipAttr2(clip)}>${path}</g>` : `      ${path}`);
  };
  if (d.type === "motion") {
    const [x, y] = d.at;
    fan();
    L.push(`      <circle class="${N.sensorBody}" cx="${n4(x)}" cy="${n4(y)}" r="3.4" fill="none"/>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n4(x)}" cy="${n4(y)}" r="1.2"/>`);
  } else if (d.type === "skylight") {
    const [x, y, w, h] = d.hit;
    L.push(`      <rect class="sky-cover" x="${n4(x)}" y="${n4(y)}" width="${n4(w)}" height="${n4(h)}" rx="2"/>`);
    L.push(`      <rect class="${N.pane} sky-glass" x="${n4(x)}" y="${n4(y)}" width="${n4(w)}" height="${n4(h)}" rx="2"/>`);
    const v = h >= w;
    L.push(`      <line class="sky-bar" x1="${n4(v ? x : x + w / 2)}" y1="${n4(v ? y + h / 2 : y)}" x2="${n4(v ? x + w : x + w / 2)}" y2="${n4(v ? y + h / 2 : y + h)}"/>`);
  } else if (d.type === "icon") {
    const [x, y] = d.at;
    const pool = ALARM_KINDS.includes(d.kind) ? "alarm-pool" : N.appliancePool;
    L.push(`      <g class="glows"${clipAttr2(clip)}>`);
    L.push(`        <circle class="glow ${N.deviceGlow}" cx="${n4(x)}" cy="${n4(y)}" r="${n4(d.glow_r || 40)}" fill="url(#${pool})" stroke="none"/>`);
    L.push(`      </g>`);
    if (!d.hit) {
      L.push(`      <circle class="${N.iconBadge}" cx="${n4(x)}" cy="${n4(y)}" r="7.5"/>`);
      L.push(`      <g transform="translate(${n4(x)} ${n4(y)}) rotate(${n4(upright)}) scale(0.95)"><use class="${N.iconGlyph}" href="#icon-${d.kind}"/></g>`);
    }
    if (valueEntity) L.push(`      <text class="${N.deviceValue}" x="${n4(x)}" y="${n4(y + 12)}" transform="rotate(${n4(upright)} ${n4(x)} ${n4(y)})">\u2014</text>`);
  } else if (d.type === "presence") {
    const [x, y] = d.at;
    fan();
    L.push(`      <g${clipAttr2(clip)}>`);
    for (const f of [N.wave, N.wave + " f2", N.wave + " f3"]) L.push(`        <circle class="${f}" cx="${n4(x)}" cy="${n4(y)}" r="26"/>`);
    L.push(`      </g>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n4(x)}" cy="${n4(y)}" r="3.4" fill="none"/>`);
    L.push(`      <circle class="${N.sensorBody}" cx="${n4(x)}" cy="${n4(y)}" r="1.2"/>`);
  } else {
    const gl = d.glow;
    const [x, y] = gl.at;
    const shape = (cls2, fill) => gl.r ? `<circle class="${cls2}" cx="${n4(x)}" cy="${n4(y)}" r="${n4(gl.r)}" fill="url(#${fill})" stroke="none"/>` : `<ellipse class="${cls2}" cx="${n4(x)}" cy="${n4(y)}" rx="${n4(gl.rx)}" ry="${n4(gl.ry)}" fill="url(#${fill})" stroke="none"/>`;
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
function snowflake(cx, cy) {
  const d = [];
  for (let k = 0; k < 6; k++) {
    const a = (-90 - 60 * k) * Math.PI / 180;
    const ux = Math.cos(a), uy = Math.sin(a);
    d.push(`M${n4(cx)} ${n4(cy)} L${n4(cx + 8 * ux)} ${n4(cy + 8 * uy)}`);
    const bx = cx + 4.8 * ux, by = cy + 4.8 * uy;
    for (const s of [1, -1]) {
      const b = a + s * Math.PI / 4;
      d.push(`M${n4(bx)} ${n4(by)} L${n4(bx + 2.6 * Math.cos(b))} ${n4(by + 2.6 * Math.sin(b))}`);
    }
  }
  return d.join(" ");
}
function cover(cv, win, upright = 0) {
  if (!win) throw new Error("cover " + cv.entity + ": unknown window " + cv.window);
  const glass = cv.sash ? win.sashes[cv.sash] : win.line;
  const inward = win.inward || INWARD[win.facade];
  let track = glass;
  if (cv.sash) {
    const depth = (l) => l[0][0] * inward[0] + l[0][1] * inward[1];
    const outer = Object.values(win.sashes).reduce((a2, b2) => depth(b2) < depth(a2) ? b2 : a2);
    const off = depth(outer) - depth(glass);
    track = glass.map(([x, y]) => [x + off * inward[0], y + off * inward[1]]);
  }
  const [a, b] = track;
  const width = len2(track);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ang = Math.round(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI);
  const band = [mid[0] - COVER_OUT * inward[0], mid[1] - COVER_OUT * inward[1]];
  const icon = [mid[0] + COVER_ICON_IN * inward[0], mid[1] + COVER_ICON_IN * inward[1]];
  const segs = Math.max(1, Math.round(width / COVER_SLAT));
  const slats = [];
  for (let k = 1; k < segs; k++) {
    const x = -width / 2 + k * width / segs;
    slats.push(`          <line class="${N.coverSlat}" x1="${n4(x)}" y1="-3" x2="${n4(x)}" y2="3"/>`);
  }
  const id = "cover-" + win.id + (cv.sash ? "-" + cv.sash : "");
  const [g0, g1] = glass;
  return [
    `    <g id="${id}" data-entity="${esc3(cv.entity)}" class="cover"`,
    `       data-x1="${n4(g0[0])}" data-y1="${n4(g0[1])}" data-x2="${n4(g1[0])}" data-y2="${n4(g1[1])}">`,
    `      <line class="cover-hit"   ${lineXY(track)}/>`,
    `      <g class="${N.coverBand}" transform="translate(${n4(band[0])} ${n4(band[1])}) rotate(${n4(ang)})">`,
    `        <g class="${N.coverBandScale}" transform="scale(1 1)">`,
    `          <rect class="${N.coverFabric}" x="${n4(-width / 2)}" y="-3" width="${n4(width)}" height="6" rx="1"/>`,
    ...slats,
    `        </g>`,
    `      </g>`,
    `      <use class="${N.coverIcon} ${N.coverIconClosed}" href="#${N.coverClosedIcon}" transform="translate(${n4(icon[0])} ${n4(icon[1])}) rotate(${n4(ang)})"/>`,
    `      <use class="${N.coverIcon} ${N.coverIconOpen}" href="#${N.coverOpenIcon}" transform="translate(${n4(icon[0])} ${n4(icon[1])}) rotate(${n4(ang)})"/>`,
    // while it moves: an arrow instead of the icon, up (opening) or down (closing), upright on the screen
    `      <g class="cover-move" transform="translate(${n4(icon[0])} ${n4(icon[1])}) rotate(${n4(upright)})"><path class="cover-move-up" d="M0 -4.2 L4 2.4 H-4 Z"/><path class="cover-move-down" d="M0 4.2 L4 -2.4 H-4 Z"/></g>`,
    `    </g>`
  ].join("\n");
}
function camera(cam) {
  const [x, y] = cam.at;
  const r = cam.range;
  const a0 = (cam.direction - cam.fov / 2) * Math.PI / 180;
  const a1 = (cam.direction + cam.fov / 2) * Math.PI / 180;
  const large = cam.fov > 180 ? 1 : 0;
  const fan = `M${x.toFixed(2)} ${y.toFixed(2)} L${(x + r * Math.cos(a0)).toFixed(2)} ${(y + r * Math.sin(a0)).toFixed(2)} A${r.toFixed(1)} ${r.toFixed(1)} 0 ${large} 1 ${(x + r * Math.cos(a1)).toFixed(2)} ${(y + r * Math.sin(a1)).toFixed(2)} Z`;
  return [
    `    <g${attrs({
      id: cam.id,
      class: N.camera,
      "data-entity-camera": cam.entity,
      "data-off-plan": cam.off_plan ? "true" : void 0,
      [N.attrName]: cam.name,
      "data-entity-camera-2": cam.entity_2,
      "data-entity-camera-hq": cam.entity_hq,
      "data-entity-detect": cam.detect,
      "data-entity-camera-2-hq": cam.entity_2_hq
    })}>`,
    // the fan fades with distance and the camera itself is drawn at its tip - so it does not read as a door swing
    `      <radialGradient id="${esc3(cam.id)}-fade" gradientUnits="userSpaceOnUse" cx="${n4(x)}" cy="${n4(y)}" r="${n4(r)}"><stop offset="0" stop-color="#a99be0" stop-opacity="0.32"/><stop offset="1" stop-color="#a99be0" stop-opacity="0"/></radialGradient>`,
    `      <path class="${N.cameraFan}" d="${fan}" style="fill:url(#${esc3(cam.id)}-fade)"/>`,
    `      <circle class="${N.cameraMark}" cx="${n4(x)}" cy="${n4(y)}" r="5.5"/>`,
    `      <g class="camera-icon" transform="translate(${n4(x)} ${n4(y)}) rotate(${n4(cam.direction)})" pointer-events="none"><rect x="-3.6" y="-2.2" width="5" height="4.4" rx="0.8"/><path d="M1.4 -1.2 L3.8 -2.4 V2.4 L1.4 1.2 Z"/></g>`,
    `      <circle class="${N.cameraHit}" cx="${n4(x)}" cy="${n4(y)}" r="${n4(cam.hit_r || CAMERA_HIT_R)}"/>`,
    `    </g>`
  ].join("\n");
}
function lock(lk, upright) {
  const [x, y] = lk.at;
  return [
    `    <g id="${lk.id}" class="${N.lock}"`,
    `       data-entity="${esc3(lk.entity)}"`,
    `       transform="rotate(${n4(upright)} ${n4(x)} ${n4(y)})">`,
    `      <rect class="${N.lockHit}" x="${n4(x - 11)}" y="${n4(y - 11)}" width="22" height="22"/>`,
    `      <path class="${N.lockClosed}" d="M${n4(x - 3.3)} ${n4(y - 2.5)} v-3.4 a3.3 3.3 0 0 1 6.6 0 v3.4"/>`,
    `      <path class="${N.lockOpen}" d="M${n4(x - 3.3)} ${n4(y - 4.3)} v-3.4 a3.3 3.3 0 0 1 6.6 0 v1.1"/>`,
    `      <rect x="${n4(x - 6)}" y="${n4(y - 2.5)}" width="12" height="9.6" rx="1.6"/>`,
    `      <circle class="${N.lockKeyhole}" cx="${n4(x)}" cy="${n4(y + 2.3)}" r="1.4"/>`,
    `    </g>`
  ].join("\n");
}

// card/lighting.js
var EPS3 = 1e-4;
var REACH_CM = {
  ceiling: 330,
  rail: 300,
  wall: 230,
  night: 90,
  strip: 200,
  main: 380,
  spot: 420,
  pendant: 300,
  floor_lamp: 250,
  table_lamp: 150,
  garden_lamp: 250
};
function wallPolygons2(model) {
  const out = [];
  for (const list of Object.values(model.walls || {})) {
    for (const r of list || []) {
      if (Array.isArray(r[0])) out.push(r);
      else {
        const [x, y, w, h] = r;
        out.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
      }
    }
  }
  return out;
}
function obstacles(model, closedDoors = /* @__PURE__ */ new Set()) {
  const segs = [];
  const poly = (pts3) => {
    for (let i = 0; i < pts3.length; i++) {
      const a = pts3[i], b = pts3[(i + 1) % pts3.length];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > EPS3) segs.push([a[0], a[1], b[0], b[1]]);
    }
  };
  const walls = model.walls || {};
  for (const list of Object.values(walls)) {
    for (const r of list || []) {
      if (Array.isArray(r[0])) poly(r);
      else {
        const [x, y, w, h] = r;
        poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
      }
    }
  }
  for (const w of model.windows || []) {
    const lines = w.line ? [w.line] : [];
    for (const s of Object.values(w.sashes || {})) {
      const l = Array.isArray(s) ? s : s && s.line;
      if (l) lines.push(l);
    }
    for (const [a, b] of lines) segs.push([a[0], a[1], b[0], b[1]]);
  }
  for (const d of model.doors || []) {
    if (d.lines && !d.pocket) {
      if (d.exterior || closedDoors.has(d.id)) for (const [a, b] of d.lines) segs.push([a[0], a[1], b[0], b[1]]);
      continue;
    }
    if (!d.hinge || !d.closed) continue;
    if (d.exterior || closedDoors.has(d.id)) segs.push([d.hinge[0], d.hinge[1], d.closed[0], d.closed[1]]);
  }
  return segs;
}
function nearest(px, py, s) {
  const dx = s[2] - s[0], dy = s[3] - s[1];
  const len22 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - s[0]) * dx + (py - s[1]) * dy) / len22));
  const x = s[0] + t * dx, y = s[1] + t * dy;
  return { d: Math.hypot(px - x, py - y), x, y };
}
function outOfWalls(px, py, polys, gap = 2.5) {
  for (const pts3 of polys) {
    if (!inside(px, py, pts3)) continue;
    let best = null;
    for (let i = 0; i < pts3.length; i++) {
      const a = pts3[i], b = pts3[(i + 1) % pts3.length];
      const n5 = nearest(px, py, [a[0], a[1], b[0], b[1]]);
      if (!best || n5.d < best.d) best = n5;
    }
    if (!best) continue;
    const dx = best.x - px, dy = best.y - py, l = Math.hypot(dx, dy) || 1;
    return [best.x + dx / l * gap, best.y + dy / l * gap];
  }
  return [px, py];
}
function nudge(px, py, segs, gap = 2.5) {
  let best = null;
  for (const s of segs) {
    const n5 = nearest(px, py, s);
    if (!best || n5.d < best.d) best = n5;
  }
  if (!best || best.d >= gap) return [px, py];
  let nx = px - best.x, ny = py - best.y, l = Math.hypot(nx, ny);
  if (l < EPS3) return [px, py];
  return [best.x + nx / l * gap, best.y + ny / l * gap];
}
function inside(px, py, pts3) {
  let c = false;
  for (let i = 0, j = pts3.length - 1; i < pts3.length; j = i++) {
    const [xi, yi] = pts3[i], [xj, yj] = pts3[j];
    if (yi > py !== yj > py && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function visibility(px, py, segs, R, steps = 72, beam = null) {
  const near2 = segs.filter((s) => nearest(px, py, s).d < R);
  let angles = [];
  for (let i = 0; i < steps; i++) angles.push(i / steps * Math.PI * 2 - Math.PI);
  const inBeam = (a) => {
    if (!beam) return true;
    let d = (a * 180 / Math.PI - beam.dir) % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return Math.abs(d) <= beam.angle / 2;
  };
  for (const s of near2) {
    for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) {
      if (Math.hypot(x - px, y - py) > R * 1.05) continue;
      const a = Math.atan2(y - py, x - px);
      angles.push(a - 2e-4, a, a + 2e-4);
    }
  }
  if (beam) {
    const e = beam.dir * Math.PI / 180, h = beam.angle * Math.PI / 360;
    for (const a of [e - h, e + h]) angles.push(Math.atan2(Math.sin(a), Math.cos(a)));
    angles = angles.filter(inBeam);
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
    for (const s of near2) {
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
function bulbsOf(model) {
  const k = model.canvas && model.canvas.cm_per_svg || 1;
  const out = [];
  const reach2 = (kind, watts2) => {
    let cm = REACH_CM[kind] || REACH_CM.ceiling;
    if (Number(watts2) > 0) cm *= Math.max(0.7, Math.min(1.3, Math.sqrt(Number(watts2) / 10)));
    return cm / k;
  };
  for (const l of model.lights || []) {
    if (l.type === "fixture") {
      for (const c of l.circuits || []) {
        if (!c.entity) continue;
        const at = c.at || l.at;
        if (at) out.push({ entity: c.entity, kind: "main", x: at[0], y: at[1], R: reach2("main", c.watts), watts: c.watts });
      }
      continue;
    }
    if (!l.entity) continue;
    let pts3 = (l.bulbs && l.bulbs.length ? l.bulbs : l.rail || []).filter((b) => Array.isArray(b));
    if (!pts3.length && Array.isArray(l.strip) && l.strip.length === 4) {
      const [x, y, w, h] = l.strip, along = w >= h;
      const len3 = along ? w : h, n5 = Math.max(1, Math.round(len3 * k / 40));
      pts3 = Array.from({ length: n5 }, (_, i) => along ? [x + (i + 0.5) * w / n5, y + h / 2] : [x + w / 2, y + (i + 0.5) * h / n5]);
    }
    const narrow = (a) => a > 0 && a < 360;
    const beamOf = (b) => {
      const angle = narrow(b[3]) ? b[3] : l.beam;
      if (!narrow(angle)) return null;
      const dir = l.bulbs && l.bulbs.length ? b[2] || 0 : l.beam_dir || 0;
      return { dir: dir - 90, angle };
    };
    const per = Number(l.watts) > 0 && pts3.length ? Number(l.watts) / pts3.length : null;
    for (const b of pts3) out.push({ entity: l.entity, kind: l.kind || "ceiling", x: b[0], y: b[1], R: reach2(l.kind, per), watts: per, beam: beamOf(b) });
  }
  return out;
}
var fmt = (v) => (Math.round(v * 10) / 10).toString();
function lightLayer(model, { closedDoors = /* @__PURE__ */ new Set(), idPrefix = "lf" } = {}) {
  const segs = obstacles(model, closedDoors);
  const polys = wallPolygons2(model);
  const bulbs = bulbsOf(model);
  const groups = /* @__PURE__ */ new Map();
  bulbs.forEach((b, i) => {
    const [x0, y0] = outOfWalls(b.x, b.y, polys);
    const [x, y] = b.beam ? [x0, y0] : nudge(x0, y0, segs);
    const poly = visibility(x, y, segs, b.R, 72, b.beam);
    if (poly.length < 3) return;
    const id = idPrefix + "-g" + i;
    const stop = (o, a) => `<stop offset="${o}" style="stop-color: var(--fc-light-color, #ffcf73)" stop-opacity="${a}"/>`;
    const grad = `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(b.R)}">` + stop(0, 0.72) + stop(0.35, 0.32) + stop(1, 0) + `</radialGradient>`;
    const d = "M" + poly.map((p2) => fmt(p2[0]) + " " + fmt(p2[1])).join(" L") + " Z";
    if (!groups.has(b.entity)) groups.set(b.entity, { defs: [], paths: [] });
    groups.get(b.entity).defs.push(grad);
    groups.get(b.entity).paths.push(`<path d="${d}" fill="url(#${id})"/>`);
  });
  const body = [...groups].map(([entity, g]) => `<g class="lf" data-lf="${entity.replace(/"/g, "&quot;")}"><defs>${g.defs.join("")}</defs>${g.paths.join("")}</g>`).join("");
  return `<g id="light-field" pointer-events="none">${body}</g>`;
}

// card/live.js
var N2 = NAMES;
var OFF = ["off", "standby", "unavailable", "unknown", "idle", "paused", "none", "closed", "locked", "clear", "0"];
var isOn = (s) => !!s && !OFF.includes(String(s.state).toLowerCase());
var num = (s) => s && s.state !== "" && !isNaN(Number(s.state)) ? Number(s.state) : null;
var fmt2 = (v, d, locale) => v.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
var SCALES = {
  temperature: [[16, "#26324a"], [20, "#1e2836"], [23, "#33302a"], [27, "#3d2626"]],
  humidity: [[30, "#36301f"], [45, "#1e2836"], [60, "#1f2f3d"], [75, "#1d3347"]],
  co2: [[600, "#1e2836"], [1e3, "#33302a"], [1500, "#3d2626"]]
};
function scale(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a);
      const c = (h, k) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
      return "#" + [0, 1, 2].map((k) => Math.round(c(ca, k) + (c(cb, k) - c(ca, k)) * f).toString(16).padStart(2, "0")).join("");
    }
  }
  return stops[stops.length - 1][1];
}
var WORDS = {
  en: {
    today: "today",
    tomorrow: "tomorrow",
    in: "in {n} d",
    sunny: "sun",
    clear: "clear",
    cloudy: "cloudy",
    partlycloudy: "clouds",
    rainy: "rain",
    pouring: "pouring",
    snowy: "snow",
    fog: "fog",
    windy: "wind",
    lightning: "storm",
    "lightning-rainy": "storm",
    "clear-night": "night"
  },
  pl: {
    today: "dzi\u015B",
    tomorrow: "jutro",
    in: "za {n} dni",
    sunny: "s\u0142o\u0144ce",
    clear: "pogodnie",
    cloudy: "pochmurno",
    partlycloudy: "chmury",
    rainy: "deszcz",
    pouring: "ulewa",
    snowy: "\u015Bnieg",
    fog: "mg\u0142a",
    windy: "wiatr",
    lightning: "burza",
    "lightning-rainy": "burza",
    "clear-night": "noc",
    on: "w\u0142.",
    off: "wy\u0142.",
    open: "otwarte",
    closed: "zamkni\u0119te"
  },
  de: {
    today: "heute",
    tomorrow: "morgen",
    in: "in {n} T.",
    sunny: "Sonne",
    clear: "klar",
    cloudy: "bew\xF6lkt",
    partlycloudy: "Wolken",
    rainy: "Regen",
    pouring: "Starkregen",
    snowy: "Schnee",
    fog: "Nebel",
    windy: "Wind",
    lightning: "Gewitter",
    "lightning-rainy": "Gewitter",
    "clear-night": "Nacht",
    on: "an",
    off: "aus",
    open: "offen",
    closed: "zu"
  }
};
var word = (locale, k) => (WORDS[String(locale).slice(0, 2)] || WORDS.en)[k] || (WORDS.en[k] ?? k);
function daysUntil(s, now = /* @__PURE__ */ new Date()) {
  if (!s || s.state === "unknown" || s.state === "unavailable" || s.state === "") return null;
  if (/^\d+(\.\d+)?$/.test(s.state) && !/date|timestamp/.test(s.attributes?.device_class || "")) return Math.round(Number(s.state));
  const t = Date.parse(s.state);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t), a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 864e5);
}
function climateText(c, sensor, locale = "en") {
  const f = (x) => typeof x === "number" ? x.toLocaleString(locale, { maximumFractionDigits: 1 }) + "\xB0" : null;
  const cur = num(sensor) ?? (typeof c?.attributes?.current_temperature === "number" ? c.attributes.current_temperature : null);
  const target = c && c.state !== "off" ? c.attributes?.temperature : null;
  const a = f(cur), b = f(target);
  return a && b ? a + " \u2192 " + b : a || b || (c ? c.state : "\u2014");
}
function climateAction(s) {
  if (!s) return null;
  const a = s.attributes?.hvac_action;
  if (a === "heating" || a === "preheating") return "heating";
  if (a === "cooling") return "cooling";
  if (a !== void 0) return null;
  return s.state === "heat" ? "heating" : s.state === "cool" ? "cooling" : null;
}
function fanSpin(s) {
  const p2 = Number(s?.attributes?.percentage);
  return p2 > 0 ? Math.round(Math.max(0.35, 2.4 - 0.02 * p2) * 100) / 100 : 1.6;
}
function readingText(kind, v, locale = "en") {
  if (!v) return "\u2014";
  if (v.entity_id && v.entity_id.startsWith("climate.")) return climateText(v, null, locale);
  if (kind === "fan" && v.entity_id && v.entity_id.startsWith("fan.")) {
    const p2 = Number(v.attributes?.percentage);
    return v.state === "on" && p2 > 0 ? Math.round(p2) + "%" : "";
  }
  if (kind === "bin") {
    const n6 = daysUntil(v);
    if (n6 === null) return v.state;
    return n6 <= 0 ? word(locale, "today") : n6 === 1 ? word(locale, "tomorrow") : word(locale, "in").replace("{n}", n6);
  }
  if (kind === "weather" && v.entity_id && v.entity_id.startsWith("weather.")) {
    const t = v.attributes?.temperature;
    return (typeof t === "number" ? Math.round(t) + "\xB0 " : "") + word(locale, v.state);
  }
  const unit2 = v.attributes?.unit_of_measurement ? " " + v.attributes.unit_of_measurement : "";
  const n5 = String(v.state).trim() === "" ? NaN : Number(v.state);
  if (Number.isFinite(n5)) return n5.toLocaleString(locale, { maximumFractionDigits: Math.abs(n5) >= 100 ? 0 : 1, useGrouping: false }) + unit2;
  return word(locale, v.state) + unit2;
}
var DONE = ["finished", "finish", "complete", "completed", "end", "done"];
var NOT_RUNNING = [...OFF, "stop", "stopped", "ready", "pause", "pausing", "finished", "finish", "end", "done", "complete", "completed", "error"];
function minutesLeft(s, now = Date.now()) {
  if (!s || ["unknown", "unavailable", "", "none"].includes(s.state)) return null;
  const v = String(s.state).trim();
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const u = String(s.attributes?.unit_of_measurement || "min").toLowerCase();
    const x = Number(v);
    return Math.round(u.startsWith("h") ? x * 60 : u === "s" ? x / 60 : x);
  }
  const hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(v);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.round((t - now) / 6e4) : null;
}
function machineLabel(state, job, end, short, now = Date.now()) {
  const st = state ? String(state.state).toLowerCase() : "";
  if (state && !NOT_RUNNING.includes(st)) {
    const min = minutesLeft(end, now);
    return { text: short + (min > 0 ? " " + Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0") : ""), done: false };
  }
  if (job && DONE.includes(String(job.state).toLowerCase()) || DONE.includes(st)) return { text: short + " \u2713", done: true };
  return { text: "", done: false };
}
function lightColor(a) {
  const rgb = a.rgb_color;
  if (Array.isArray(rgb) && rgb.length === 3 && rgb.every((v) => Number.isFinite(v))) {
    const [r, g, b] = rgb.map((v) => Math.round(255 - (255 - v) * 0.75));
    return `rgb(${r}, ${g}, ${b})`;
  }
  let k = Number(a.color_temp_kelvin);
  if (!(k > 0) && Number(a.color_temp) > 0) k = 1e6 / Number(a.color_temp);
  if (!(k > 0)) return null;
  const stops = [[2200, [255, 190, 110]], [2700, [255, 207, 115]], [4e3, [255, 228, 190]], [6500, [236, 242, 255]]];
  if (k <= stops[0][0]) return "rgb(" + stops[0][1].join(", ") + ")";
  for (let i = 1; i < stops.length; i++) {
    if (k <= stops[i][0]) {
      const [ka, ca] = stops[i - 1], [kb, cb] = stops[i], f = (k - ka) / (kb - ka);
      return "rgb(" + ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(", ") + ")";
    }
  }
  return "rgb(" + stops[stops.length - 1][1].join(", ") + ")";
}
function applyStates(svg, states, locale = "en", paint = (c) => c) {
  const st = (id) => id ? states.get(id) : void 0;
  const each = (sel, f) => svg.querySelectorAll(sel).forEach(f);
  const set = (el, cls, on) => el.classList.toggle(cls, !!on);
  const level = (s) => {
    const b = s && s.attributes && s.attributes.brightness;
    return typeof b === "number" ? 0.25 + 0.75 * b / 255 : 1;
  };
  each(".light[data-entity]", (el) => {
    const s = st(el.dataset.entity), on = s?.state === "on";
    set(el, "on", on);
    el.querySelectorAll(".glow, .glow-dim").forEach((g) => {
      g.style.opacity = on && level(s) < 1 ? String(level(s)) : "";
    });
  });
  each("[data-lf]", (g) => {
    const s = st(g.dataset.lf);
    g.style.opacity = s?.state === "on" ? String(level(s)) : "0";
    const c = s?.state === "on" ? lightColor(s.attributes || {}) : null;
    if (c) g.style.setProperty("--fc-light-color", c);
    else g.style.removeProperty("--fc-light-color");
  });
  each(".cover[data-entity]", (el) => {
    const s = st(el.dataset.entity);
    const pos = s && s.attributes && s.attributes.current_position;
    const covered = s ? typeof pos === "number" ? pos < 100 : s.state === "closed" : true;
    set(el, N2.isCovered, covered);
    set(el, N2.isUnknown, !s || s.state === "unavailable");
    const band = el.querySelector("." + N2.coverBandScale);
    if (band) band.setAttribute("transform", `scale(1 ${typeof pos === "number" ? (100 - pos) / 100 : covered ? 1 : 0})`);
    const op = s && s.state === "opening" ? "up" : s && s.state === "closing" ? "down" : null;
    const tapped = el.dataset.move && Date.now() - Number(el.dataset.moveAt || 0) < 6e3 ? el.dataset.move : null;
    if (op || s && el.dataset.moveFrom && s.state !== el.dataset.moveFrom) {
      delete el.dataset.move;
      delete el.dataset.moveFrom;
    }
    const mv = op || (el.dataset.move ? tapped : null);
    set(el, "moving-up", mv === "up");
    set(el, "moving-down", mv === "down");
  });
  each(".skylight[data-entity]", (el) => {
    const s = st(el.dataset.entity);
    const pos = s && s.attributes && s.attributes.current_position;
    const part = s ? typeof pos === "number" ? (100 - pos) / 100 : s.state === "closed" ? 1 : 0 : 0;
    set(el, N2.isCovered, part > 0);
    el.style.setProperty("--sky", String(Math.round(part * 75) / 100));
  });
  each(`.${N2.presence}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    set(el, N2.isDetected, isOn(s));
    set(el, N2.isMoving, s && /move|motion/i.test(s.state));
    set(el, N2.isUnknown, !s || s.state === "unavailable");
  });
  each(`.${N2.motion}[data-entity], .${N2.appliance}[data-entity]`, (el) => set(el, "on", isOn(st(el.dataset.entity))));
  each(".tv[data-entity]", (el) => set(el, "on", isOn(st(el.dataset.entity))));
  each(`.${N2.ac}[data-entity]`, (el) => {
    const a = climateAction(st(el.dataset.entity));
    set(el, N2.isCooling, a === "cooling");
    set(el, N2.isHeating, a === "heating");
  });
  each(`.${N2.deviceLabel}`, (el) => {
    const short = el.getAttribute(N2.attrShort) || el.getAttribute(N2.attrName) || "";
    const { text, done } = machineLabel(st(el.getAttribute(N2.attrState)), st(el.getAttribute("data-job")), st(el.getAttribute(N2.attrEnd)), short);
    if (el.textContent !== text) el.textContent = text;
    set(el, N2.isDone, done);
  });
  each("[data-entity-detect]", (el) => set(el, N2.isDetected, isOn(st(el.getAttribute("data-entity-detect")))));
  each(`.${N2.lock}[data-entity]`, (el) => {
    const s = st(el.dataset.entity);
    set(el, N2.isOpen, s && ["open", "unlocked", "opening"].includes(s.state));
  });
  each(`.${N2.iconDevice}[data-entity]`, (el) => {
    const id = el.dataset.entity, s = st(id), kind = el.dataset.kind;
    const alarmKind = ["smoke", "co", "leak", "gas", "siren"].includes(kind);
    const climate = id.startsWith("climate.");
    const due = kind === "bin" ? daysUntil(s) : null;
    const act = climate ? climateAction(s) : null;
    set(el, N2.isHeating, act === "heating");
    set(el, N2.isCooling, act === "cooling");
    const readingOnly = ["weather", "info", "solar", "battery", "meter", "inverter", "ups", "lux", "rain", "water_tank"].includes(kind);
    set(el, alarmKind ? N2.isAlarm : "on", kind === "bin" ? due !== null && due <= 1 : readingOnly || climate ? false : isOn(s));
    if (kind === "fan") el.style.setProperty("--fp-spin", fanSpin(s) + "s");
    const txt = el.querySelector("." + N2.deviceValue);
    if (!txt) return;
    const vid = el.getAttribute(N2.attrValue), v = st(vid);
    txt.textContent = climate && vid !== id ? climateText(s, v, locale) : readingText(kind, v, locale);
  });
  each(`[${N2.attrContact}]`, (el) => {
    const s = st(el.getAttribute(N2.attrContact));
    set(el, N2.isOpen, s && (s.state === "on" || s.state === "open"));
    set(el, N2.isTilted, s && s.state === "tilted");
  });
  each("[data-temp]", (el) => {
    const t = num(st(el.dataset.temp)), h = num(st(el.dataset.hum));
    const tt = el.querySelector(".climate-temp"), hh = el.querySelector(".climate-hum");
    if (tt) tt.textContent = t === null ? "\u2014" : fmt2(t, 1, locale) + "\xB0";
    if (hh) hh.textContent = h === null ? "\u2014" : fmt2(h, 0, locale) + "%";
  });
  each(`#rooms polygon[${N2.attrTintEntity}]`, (el) => {
    const s = st(el.getAttribute(N2.attrTintEntity)), kind = el.getAttribute(N2.attrTintKind);
    el.classList.remove(N2.isHeating, N2.isOccupied);
    el.style.fill = "";
    if (!s) return;
    if (kind === "heating") set(el, N2.isHeating, climateAction(s) === "heating" || s.state === "on" && !s.attributes?.hvac_action);
    else if (kind === "presence" || kind === "state") set(el, N2.isOccupied, isOn(s));
    else if (SCALES[kind] && num(s) !== null) el.style.fill = scale(SCALES[kind].map(([v, c]) => [v, paint(c)]), num(s));
  });
}

// generator/light.js
var LIGHT = {
  "#000000": "#4a5263",
  // walls
  "#131a24": "#f6f8fa",
  // outlines, halos, keyholes
  "#161d28": "#eceff3",
  // unused rooms
  "#1b2433": "#e6ebf0",
  // sheet, zero of a map
  "#1e2836": "#fdfdfe",
  // rooms
  "#1f2a3b": "#e7ecf2",
  // stairs
  "#22302a": "#dcf2e4",
  // occupied room
  "#22394a": "#cfe7f5",
  // map: a little presence
  "#243040": "#e4e9ef",
  // furniture
  "#26324a": "#d6e3f5",
  // room tint: cold
  "#2c3a4d": "#d5dce5",
  // furniture details
  "#2f3a22": "#dcebc9",
  // map: a little light energy
  "#33282b": "#f9e1da",
  // heating room
  "#33302a": "#f7ead0",
  // room tint: warm
  "#36301f": "#f6e7c4",
  // room tint: dry
  "#384354": "#a3aebc",
  // doors
  "#3a4861": "#b6c0cc",
  // dividers, furniture outlines
  "#3d2626": "#f6d5d2",
  // room tint: hot
  "#44546f": "#9ba8b9",
  // furniture detail lines
  "#4a3f22": "#f3e3b5",
  // map: a little light
  "#5a6b86": "#98a5b7",
  "#5b6a80": "#8693a6",
  // icons and lamps that are off
  "#6b7f9c": "#8f9cb1",
  // stair lines
  "#6f8fb0": "#5f7fa0",
  "#6fc9ef": "#2a9ccc",
  // glass
  "#7c8ca3": "#66758a",
  "#8ea1ba": "#5b6b80",
  // labels, lock
  "#8fa3bd": "#7d91ab",
  // cover fabric
  "#c3cfdf": "#2b3442",
  // texts
  "#1d3347": "#cfe1f2",
  "#1f2f3d": "#d9e7f2",
  // room tint: humid
  // the garden in its own light colours (the automatic lightening washed them out to white)
  "#1f3326": "#cfe5c0",
  "#2b4634": "#a9cf92",
  "#264030": "#b9daa5",
  // lawn, its blades
  "#332c27": "#e6d4bd",
  "#463c35": "#c9b08f",
  // terrace boards
  "#2a2f37": "#dde0e5",
  "#363c46": "#c2c7cf",
  // driveway setts
  "#2e3541": "#e9e6df",
  "#3b4352": "#d0ccc2",
  // path slabs
  "#2f271f": "#dccaaf",
  "#3d5838": "#8db777",
  // flowerbed soil, plants
  "#323437": "#e0ddd6",
  "#46494d": "#bdb9b0",
  // gravel
  "#2f4f36": "#b4d89f",
  "#21382a": "#93c07d",
  "#3b5f42": "#6f9e5a",
  "#2a4632": "#80ad69",
  "#3a3027": "#8a6e55",
  // trees, bushes
  "#284531": "#8fbd7b",
  // hedge
  "#1d4a6b": "#a8d5f0"
  // pool
};
function lightOf(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(...v), mn = Math.min(...v), l = (mx + mn) / 2;
  if (l >= 0.42) return hex;
  const d = mx - mn;
  let h = 0;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === v[0] ? (v[1] - v[2]) / d % 6 : mx === v[1] ? (v[2] - v[0]) / d + 2 : (v[0] - v[1]) / d + 4;
  const L = 1 - l * 0.55, S = sat * 0.5;
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs((h % 6 + 6) % 6 % 2 - 1)), m = L - c / 2;
  const k = Math.floor((h % 6 + 6) % 6);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
  return "#" + [r, g, b].map((u) => Math.round((u + m) * 255).toString(16).padStart(2, "0")).join("");
}
var paintLight = (c) => LIGHT[String(c).toLowerCase()] || (/^#[0-9a-fA-F]{6}$/.test(c) ? lightOf(c) : c);
function lightSvg(text) {
  return text.replace(/#[0-9a-fA-F]{6}\b/g, (c) => LIGHT[c.toLowerCase()] || lightOf(c));
}

// card/theme.js
var PALETTES = {
  dark: {
    bg: "#131a24",
    panel: "rgba(27, 36, 51, 0.92)",
    solid: "#1b2433",
    line: "#2a3547",
    lineHi: "#3d4b63",
    text: "#c3cfdf",
    text2: "#8a99ae",
    halo: "#131a24",
    accent: "#ffc300",
    ink: "#131a24",
    blend: "screen"
  },
  light: {
    bg: "#f6f8fa",
    panel: "rgba(255, 255, 255, 0.94)",
    solid: "#e6ebf0",
    line: "#cdd5df",
    lineHi: "#9fadbd",
    text: "#2b3442",
    text2: "#5f6d80",
    halo: "#ffffff",
    accent: "#b07a00",
    ink: "#ffffff",
    blend: "multiply"
  }
};
function paletteCss(name, accent) {
  const p2 = PALETTES[name] || PALETTES.dark;
  return `--fc-bg: ${p2.bg}; --fc-panel: ${p2.panel}; --fc-solid: ${p2.solid}; --fc-line: ${p2.line}; --fc-line-hi: ${p2.lineHi}; --fc-text: ${p2.text}; --fc-text2: ${p2.text2}; --fc-halo: ${p2.halo}; --fc-accent: ${accent || p2.accent}; --fc-ink: ${p2.ink}; --fc-blend: ${p2.blend};`;
}

// card/alerts.js
var ALARM_KINDS2 = ["smoke", "co", "leak", "gas", "siren"];
var ON = /* @__PURE__ */ new Set(["on", "detected", "open", "true", "problem", "wet", "alarm", "triggered"]);
var isOn2 = (s) => !!s && ON.has(String(s.state).toLowerCase());
var num2 = (s) => s && s.state !== "" && !isNaN(Number(s.state)) ? Number(s.state) : null;
function normalizeAlerts(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((a) => a && typeof a.entity === "string").map((a) => ({
    entity: a.entity,
    states: a.state === void 0 ? null : [].concat(a.state).map(String),
    above: a.above === void 0 ? null : Number(a.above),
    below: a.below === void 0 ? null : Number(a.below),
    room: a.room || null,
    color: /^#[0-9a-fA-F]{3,8}$/.test(a.color || "") ? a.color : "#e53935",
    name: a.name || null
  }));
}
function ruleActive(rule, s) {
  if (!s) return false;
  if (rule.above !== null || rule.below !== null) {
    const v = num2(s);
    return v !== null && (rule.above === null || v > rule.above) && (rule.below === null || v < rule.below);
  }
  return rule.states ? rule.states.includes(String(s.state)) : isOn2(s);
}
function windowRoom(w, roomAt) {
  const line2 = w.line || Object.values(w.sashes || {}).map((x) => Array.isArray(x) ? x : x && x.line).find(Boolean);
  if (!line2) return null;
  const [a, b] = line2;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const len3 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const normal = [-(b[1] - a[1]) / len3, (b[0] - a[0]) / len3];
  const tries = w.inward ? [w.inward] : [normal, [-normal[0], -normal[1]]];
  for (const n5 of tries) {
    for (const step of [20, 35, 55]) {
      const r = roomAt(mx + n5[0] * step, my + n5[1] * step);
      if (r) return r;
    }
  }
  return null;
}
function activeAlerts(model, states, { roomAt, rules = [], cold = null, entityRoom = () => null }) {
  const out = [];
  for (const d of model.devices || []) {
    if (d.type !== "icon" || !ALARM_KINDS2.includes(d.kind) || !d.entity) continue;
    if (isOn2(states[d.entity])) out.push({ entity: d.entity, room: d.room || (d.at ? roomAt(d.at[0], d.at[1]) : null), color: "#e53935", kind: d.kind });
  }
  if (cold && cold.outside) {
    const t = num2(states[cold.outside]);
    if (t !== null && t < cold.below) {
      for (const w of model.windows || []) {
        for (const c of w.contacts || []) {
          if (!c || !isOn2(states[c])) continue;
          out.push({ entity: c, room: windowRoom(w, roomAt), color: "#29b6f6", kind: "cold", value: t });
        }
      }
    }
  }
  for (const r of rules || []) {
    if (ruleActive(r, states[r.entity])) out.push({ entity: r.entity, room: r.room || entityRoom(r.entity), color: r.color, kind: "rule", name: r.name });
  }
  return out;
}

// card/events.js
function normalizeEvents(list) {
  return normalizeAlerts((Array.isArray(list) ? list : []).map((e) => ({ color: "#ffab40", ...e })));
}
function eventMarks(rules, hist, start, end) {
  const out = [];
  for (const rule of rules) {
    const rows = hist[rule.entity] || [];
    let was = null;
    for (const r of rows) {
      const now = ruleActive(rule, { state: r.state });
      if (now && was === false && r.t >= start && r.t <= end) out.push({ t: r.t, rule });
      was = now;
    }
  }
  return out.sort((a, b) => a.t - b.t);
}
function clusterMarks(marks, start, end, step = 6e-3) {
  const out = [];
  const span = end - start || 1;
  for (const m of marks) {
    const pos = (m.t - start) / span;
    const last = out.find((o) => o.rule === m.rule && Math.abs(o.pos - pos) < step);
    if (last) last.n++;
    else out.push({ ...m, pos, n: 1 });
  }
  return out;
}

// card/trail.js
var ACTIVE = /* @__PURE__ */ new Set(["on", "detected", "presence", "move", "moving", "motion", "occupied", "home", "true"]);
var isMotion = (s) => ACTIVE.has(String(s).toLowerCase());
function activations(rows, t, windowMs) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.t > t) break;
    const was = i > 0 && isMotion(rows[i - 1].state);
    if (isMotion(r.state) && !was && r.t >= t - windowMs) out.push(r.t);
  }
  const last = rows.filter((r) => r.t <= t).pop();
  if (last && isMotion(last.state) && !out.length && last.t < t - windowMs) out.push(t - windowMs);
  return out;
}
var f1 = (v) => Math.round(v * 10) / 10;
function trailLayer(devices, rowsOf, t, windowMs = 30 * 6e4) {
  const events = [];
  for (const d of devices) {
    if (!d.at || !d.entity) continue;
    for (const at of activations(rowsOf(d.entity) || [], t, windowMs)) events.push({ t: at, x: d.at[0], y: d.at[1] });
  }
  events.sort((a, b) => a.t - b.t);
  const op = (tt) => Math.max(0.1, 1 - (t - tt) / windowMs).toFixed(2);
  const parts = [];
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1], b = events[i];
    if (a.x === b.x && a.y === b.y) continue;
    parts.push(`<line x1="${f1(a.x)}" y1="${f1(a.y)}" x2="${f1(b.x)}" y2="${f1(b.y)}" stroke-opacity="${op(b.t)}"/>`);
  }
  for (const e of events) parts.push(`<circle cx="${f1(e.x)}" cy="${f1(e.y)}" r="5" fill-opacity="${op(e.t)}"/>`);
  return `<g id="fc-trail" pointer-events="none" fill="#4fc3f7" stroke="#4fc3f7" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 6">${parts.join("")}</g>`;
}

// card/forgotten.js
var since = (s) => Date.parse(s.last_changed || s.last_updated);
function forgottenLights(sources, states, now, minutes) {
  const ms = minutes * 6e4;
  const out = [];
  for (const [room, src] of Object.entries(sources || {})) {
    if (!src.presence.length || !src.lights.length) continue;
    const empty = src.presence.every((id) => {
      const s = states[id];
      return s && !["unavailable", "unknown"].includes(s.state) && !isMotion(s.state) && now - since(s) >= ms;
    });
    if (!empty) continue;
    const lamps = src.lights.filter((id) => {
      const s = states[id];
      return s && s.state === "on" && now - since(s) >= ms;
    });
    if (lamps.length) out.push({ room, lights: lamps, since: Math.min(...lamps.map((id) => since(states[id]))) });
  }
  return out;
}

// card/widgets.js
var WIDGET_TYPES = ["clock", "calendar", "state", "button"];
function normalizeWidgets(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((w) => w && WIDGET_TYPES.includes(w.type)).map((w, i) => ({
    type: w.type,
    // on the plan at this point; without it, in the bar under the plan
    at: Array.isArray(w.at) && w.at.length === 2 && w.at.every((v) => Number.isFinite(Number(v))) ? w.at.map(Number) : null,
    entity: typeof w.entity === "string" ? w.entity : null,
    // a state widget can show one attribute instead of the state (e.g. a text the entity keeps there)
    attribute: typeof w.attribute === "string" ? w.attribute : null,
    name: typeof w.name === "string" ? w.name : null,
    icon: typeof w.icon === "string" ? w.icon : null,
    tap: w.tap_action || null,
    hold: w.hold_action || null
  }));
}
var W = {
  en: { now: "now", tomorrow: "tomorrow", none: "nothing planned" },
  pl: { now: "teraz", tomorrow: "jutro", none: "nic w planie" },
  de: { now: "jetzt", tomorrow: "morgen", none: "nichts geplant" }
};
var word2 = (lang, k) => (W[String(lang).slice(0, 2)] || W.en)[k];
var cut = (s, n5) => s.length > n5 ? s.slice(0, n5 - 1) + "\u2026" : s;
function calendarLine(s, lang = "en", now = /* @__PURE__ */ new Date()) {
  if (!s || s.state === "unavailable" || s.state === "unknown") return "\u2014";
  const a = s.attributes || {};
  if (!a.message) return word2(lang, "none");
  const msg = cut(String(a.message), 30);
  if (s.state === "on") return word2(lang, "now") + ": " + msg;
  const t = new Date(String(a.start_time || "").replace(" ", "T"));
  if (isNaN(t)) return msg;
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dd = Math.round((day(t) - day(now)) / 864e5);
  const hm = a.all_day ? "" : t.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }) + " ";
  const when = dd === 0 ? "" : dd === 1 ? word2(lang, "tomorrow") + " " : t.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "numeric" }) + " ";
  return when + hm + msg;
}
function widgetText(w, states, lang = "en", now = /* @__PURE__ */ new Date()) {
  const s = w.entity ? states[w.entity] : null;
  const fname = s && s.attributes && s.attributes.friendly_name || w.entity || "";
  if (w.type === "clock") {
    return [now.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }), now.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })];
  }
  if (w.type === "calendar") return [calendarLine(s, lang, now), w.name || fname];
  if (w.type === "state" && w.attribute) {
    const a = s && s.attributes ? s.attributes[w.attribute] : void 0;
    return [a === void 0 || a === null ? "\u2014" : Array.isArray(a) ? a.join(", ") : String(a), w.name || fname];
  }
  if (w.type === "state") {
    const kind = w.entity && w.entity.startsWith("weather.") ? "weather" : /date|timestamp/.test(s && s.attributes && s.attributes.device_class || "") ? "bin" : "info";
    return [readingText(kind, s, lang), w.name || fname];
  }
  return [(w.icon ? w.icon + " " : "") + (w.name || fname), ""];
}

// card/maps.js
var MAP_KINDS = ["live", "temperature", "humidity", "light_hours", "presence_hours", "light_energy", "energy", "signal"];
var AVERAGE_KINDS = ["temperature", "humidity"];
function periodRange(p2, now = Date.now(), { before = false, south = false } = {}) {
  if (typeof p2 === "number") {
    const end = before ? now - p2 * 864e5 : now;
    return [end - p2 * 864e5, end];
  }
  const d = new Date(now);
  const startMonth = p2 === "winter" !== south ? 11 : 5;
  let y = d.getFullYear();
  let a = new Date(y, startMonth, 1);
  if (a.getTime() > now) a = new Date(y - 1, startMonth, 1);
  if (before) a = new Date(a.getFullYear() - 1, startMonth, 1);
  const b = new Date(a.getFullYear(), startMonth + 3, 1);
  return [a.getTime(), Math.min(b.getTime(), before ? b.getTime() : now)];
}
function statsValue(rows, type) {
  const v = (rows || []).map((r) => r[type]).filter((x) => typeof x === "number" && Number.isFinite(x));
  if (!v.length) return null;
  return type === "change" ? v.filter((x) => x >= 0).reduce((a, b) => a + b, 0) : v.reduce((a, b) => a + b, 0) / v.length;
}
function roomAverages(sources, kind, valueOf) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const vals = (src[kind] || []).map(valueOf).filter((v) => v !== null && v !== void 0);
    if (vals.length) out[room] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}
function diffValues(cur, prev) {
  const out = {};
  for (const [room, v] of Object.entries(cur || {})) if (prev && prev[room] !== void 0) out[room] = v - prev[room];
  return out;
}
function signalLevel(s) {
  if (!s || s.state === "unavailable" || s.state === "unknown" || s.state === "" || isNaN(Number(s.state))) return null;
  const v = Number(s.state);
  const unit2 = String(s.attributes && s.attributes.unit_of_measurement || "");
  const rssi = /dbm/i.test(unit2) || v < 0;
  const q = rssi ? (v + 90) / 45 : (v - 20) / 160;
  return Math.max(0, Math.min(1, q));
}
var EPS4 = 1e-9;
function pointInPolygon2(x, y, pts3) {
  let c = false;
  for (let i = 0, j = pts3.length - 1; i < pts3.length; j = i++) {
    const [xi, yi] = pts3[i], [xj, yj] = pts3[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi + EPS4) + xi) c = !c;
  }
  return c;
}
function centroid(pts3) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = pts3.length - 1; i < pts3.length; j = i++) {
    const f = pts3[j][0] * pts3[i][1] - pts3[i][0] * pts3[j][1];
    a += f;
    cx += (pts3[j][0] + pts3[i][0]) * f;
    cy += (pts3[j][1] + pts3[i][1]) * f;
  }
  if (Math.abs(a) < EPS4) return pts3[0];
  return [cx / (3 * a), cy / (3 * a)];
}
function roomIndex(model) {
  const rooms = (model.rooms || []).filter((r) => r.points && r.points.length >= 3 && !r.unused).map((r) => {
    const c = r.label || r.at || centroid(r.points);
    return { id: r.id, name: r.name || r.id, points: r.points, at: pointInPolygon2(c[0], c[1], r.points) ? c : centroid(r.points) };
  });
  const roomAt = (x, y) => (rooms.find((r) => pointInPolygon2(x, y, r.points)) || {}).id || null;
  return { rooms, roomAt };
}
function roomSources(model, roomAt) {
  const by = {};
  const get = (id) => by[id] || (by[id] = { temperature: [], humidity: [], lights: [], presence: [] });
  for (const k of model.climate || []) {
    const id = k.at ? roomAt(k.at[0], k.at[1]) : null;
    if (!id) continue;
    if (k.temperature) get(id).temperature.push(k.temperature);
    if (k.humidity) get(id).humidity.push(k.humidity);
  }
  for (const l of model.lights || []) {
    const at = l.at || l.bulbs && l.bulbs[0];
    const id = l.room || (at ? roomAt(at[0], at[1]) : null);
    if (!id) continue;
    if (l.type === "fixture") for (const c of l.circuits || []) {
      if (c.entity) get(id).lights.push(c.entity);
    }
    else if (l.entity) get(id).lights.push(l.entity);
  }
  for (const d of model.devices || []) {
    if (!["presence", "motion"].includes(d.type) || !d.entity) continue;
    const at = d.at || d.position;
    const id = d.room || (at ? roomAt(at[0], at[1]) : null);
    if (id) get(id).presence.push(d.entity);
  }
  return by;
}
var SCALES2 = {
  temperature: [[17, "#3b78c9"], [20.5, "#43a047"], [23, "#fb8c00"], [25.5, "#e53935"]],
  humidity: [[30, "#fb8c00"], [45, "#43a047"], [60, "#3b78c9"], [75, "#5e35b1"]],
  light_hours: [[0, "#1b2433"], [1, "#4a3f22"], [1e3, "#ffc300"]],
  presence_hours: [[0, "#1b2433"], [1, "#22394a"], [1e3, "#29b6f6"]],
  light_energy: [[0, "#1b2433"], [0.01, "#2f3a22"], [1e3, "#9ccc65"]],
  energy: [[0, "#1b2433"], [0.01, "#2f3a22"], [1e3, "#9ccc65"]],
  // a change against the period before: less (blue), the same, more (red)
  delta: [[-1, "#3b78c9"], [0, "#2a3547"], [1, "#e53935"]],
  signal: [[0, "#e53935"], [0.5, "#fb8c00"], [1, "#43a047"]]
};
function colorAt(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i], f = (v - a) / (b - a || 1);
      const ch = (h, k) => parseInt(h.slice(1 + 2 * k, 3 + 2 * k), 16);
      return "#" + [0, 1, 2].map((k) => Math.round(ch(ca, k) + (ch(cb, k) - ch(ca, k)) * f).toString(16).padStart(2, "0")).join("");
    }
  }
  return stops[stops.length - 1][1];
}
function scaleFor(kind, max) {
  const s = SCALES2[kind];
  if (kind === "light_hours" || kind === "presence_hours") return [s[0], s[1], [Math.max(2, max), s[2][1]]];
  if (kind === "light_energy" || kind === "energy") return [s[0], s[1], [Math.max(0.05, max), s[2][1]]];
  return s;
}
var numeric = (s) => s && s.state !== "" && s.state !== "unavailable" && s.state !== "unknown" && !isNaN(Number(s.state)) ? Number(s.state) : null;
function liveValues(kind, sources, states) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const vals = (src[kind] || []).map((id) => numeric(states[id])).filter((v) => v !== null);
    if (vals.length) out[room] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return out;
}
var ON2 = /* @__PURE__ */ new Set(["on", "home", "detected", "occupied", "open", "moving", "presence", "true"]);
var isActiveState = (s) => ON2.has(String(s).toLowerCase());
function onPeriods(rows, start, end) {
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const a = Math.max(start, rows[i].lu * 1e3);
    const b = Math.min(end, i + 1 < rows.length ? rows[i + 1].lu * 1e3 : end);
    if (b > a && isActiveState(rows[i].s)) out.push([a, b]);
  }
  return out;
}
function unionMs(periods) {
  const p2 = periods.slice().sort((x, y) => x[0] - y[0]);
  let ms = 0, a = null, b = null;
  for (const [s, e] of p2) {
    if (b === null || s > b) {
      if (b !== null) ms += b - a;
      a = s;
      b = e;
    } else if (e > b) b = e;
  }
  return b === null ? 0 : ms + b - a;
}
function hoursValues(kind, sources, history2, start, end) {
  const key2 = kind === "light_hours" ? "lights" : "presence";
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    const ids = src[key2] || [];
    if (!ids.length) continue;
    out[room] = unionMs(ids.flatMap((id) => onPeriods(history2[id] || [], start, end))) / 36e5;
  }
  return out;
}
function lightWatts(model) {
  const out = {};
  for (const l of model.lights || []) {
    if (l.type === "fixture") {
      for (const c of l.circuits || []) if (c.entity && Number(c.watts) > 0) out[c.entity] = Number(c.watts);
    } else if (l.entity && Number(l.watts) > 0) out[l.entity] = Number(l.watts);
  }
  return out;
}
function energyValues(sources, history2, start, end, watts2, levels = {}) {
  const out = {};
  for (const [room, src] of Object.entries(sources)) {
    let kwh = 0, any = false;
    for (const id of src.lights || []) {
      if (!watts2[id]) continue;
      any = true;
      const rows = history2[id] || [];
      let level = levels[id] !== void 0 ? levels[id] : 1;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const b = r.attributes && r.attributes.brightness;
        if (typeof b === "number") level = b / 255;
        const a = Math.max(start, r.t), z = Math.min(end, i + 1 < rows.length ? rows[i + 1].t : end);
        if (z > a && isActiveState(r.state)) kwh += (z - a) * watts2[id] * level / 36e8;
      }
    }
    if (any) out[room] = kwh;
  }
  return out;
}
var esc4 = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
var f12 = (v) => Math.round(v * 10) / 10;
function mapLayers(rooms, values, kind, { format, angle = 0, paint = (c) => c, delta = false }) {
  const vals = Object.values(values);
  const spread = Math.max(1e-6, ...vals.map((v) => Math.abs(v)));
  const base = delta ? SCALES2.delta.map(([v, c]) => [v * spread, c]) : scaleFor(kind, vals.length ? Math.max(...vals) : 0);
  const stops = base.map(([v, c]) => [v, paint(c)]);
  const fills = [], texts = [];
  for (const r of rooms) {
    const v = values[r.id];
    if (v === void 0) continue;
    const pts3 = r.points.map((p2) => f12(p2[0]) + "," + f12(p2[1])).join(" ");
    fills.push(`<polygon points="${pts3}" fill="${colorAt(stops, v)}" fill-opacity="0.55"/>`);
    const [x, y] = r.at;
    texts.push(`<text x="${f12(x)}" y="${f12(y)}" transform="rotate(${angle} ${f12(x)} ${f12(y)})">${esc4(format(v))}</text>`);
  }
  return {
    fill: `<g id="fc-map" pointer-events="none">${fills.join("")}</g>`,
    text: `<g id="fc-map-text" pointer-events="none" font-family="system-ui, sans-serif" font-size="15" font-weight="600" text-anchor="middle" dominant-baseline="middle">${texts.join("")}</g>`,
    stops
  };
}
function signalLayers(points, { angle = 0, paint = (c) => c, r = 46 } = {}) {
  const stops = SCALES2.signal.map(([v, c]) => [v, paint(c)]);
  const defs2 = [], spots = [], texts = [];
  points.forEach((p2, i) => {
    const c = p2.level === null ? paint("#5b6a80") : colorAt(stops, p2.level);
    defs2.push(`<radialGradient id="fc-sig-${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
    spots.push(`<circle cx="${f12(p2.x)}" cy="${f12(p2.y)}" r="${r}" fill="url(#fc-sig-${i})"/>`);
    texts.push(`<text x="${f12(p2.x)}" y="${f12(p2.y)}" transform="rotate(${angle} ${f12(p2.x)} ${f12(p2.y)})" font-size="10">${esc4(p2.text)}</text>`);
  });
  return {
    fill: `<g id="fc-map" pointer-events="none"><defs>${defs2.join("")}</defs>${spots.join("")}</g>`,
    text: `<g id="fc-map-text" pointer-events="none" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">${texts.join("")}</g>`,
    stops
  };
}

// card/rules.js
var NAMED = {
  red: "#e53935",
  orange: "#ff9800",
  amber: "#ffc107",
  yellow: "#ffeb3b",
  green: "#43a047",
  teal: "#26a69a",
  blue: "#1e88e5",
  cyan: "#00bcd4",
  purple: "#8e24aa",
  pink: "#ec407a",
  white: "#ffffff",
  grey: "#9e9e9e",
  gray: "#9e9e9e"
};
function ruleColor(c) {
  if (typeof c !== "string") return null;
  if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c)) return c;
  return NAMED[c.toLowerCase()] || null;
}
function normalizeRules(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && typeof r.entity === "string").map((r) => ({
    entity: r.entity,
    states: r.state === void 0 ? null : [].concat(r.state).map(String),
    above: r.above === void 0 ? null : Number(r.above),
    below: r.below === void 0 ? null : Number(r.below),
    attribute: typeof r.attribute === "string" ? r.attribute : null,
    for: Number(r.for) > 0 ? Number(r.for) : 0,
    // minutes
    color: ruleColor(r.color),
    blink: r.blink === true,
    room: typeof r.room === "string" ? r.room : null,
    target: typeof r.target === "string" ? r.target : null
  }));
}
var ON3 = /* @__PURE__ */ new Set(["on", "open", "detected", "true", "home", "playing", "heat", "cool", "heating", "cooling", "unlocked", "wet", "problem"]);
function ruleHolds(rule, s, now = Date.now()) {
  if (!s || s.state === "unavailable" || s.state === "unknown") return false;
  const raw = rule.attribute ? s.attributes && s.attributes[rule.attribute] : s.state;
  let ok;
  if (rule.above !== null || rule.below !== null) {
    const v = Number(raw);
    ok = raw !== "" && raw !== null && raw !== void 0 && Number.isFinite(v) && (rule.above === null || v > rule.above) && (rule.below === null || v < rule.below);
  } else if (rule.states) ok = rule.states.includes(String(raw));
  else ok = ON3.has(String(raw).toLowerCase());
  if (!ok || !rule.for) return ok;
  const since2 = Date.parse((rule.attribute ? s.last_updated : s.last_changed) || s.last_changed || "");
  return Number.isFinite(since2) && now - since2 >= rule.for * 6e4;
}
function ruleEffects(rules, states, { roomOf, drawn, isRoom, now = Date.now() }) {
  const rooms = /* @__PURE__ */ new Map(), marks = /* @__PURE__ */ new Map();
  for (const r of rules) {
    if (!ruleHolds(r, states[r.entity], now)) continue;
    const target = r.target || r.entity;
    const room = r.room || (isRoom(target) ? target : !drawn(target) ? roomOf(target) : null);
    if (room && isRoom(room)) {
      if (r.color && !rooms.has(room)) rooms.set(room, r.color);
      if (!r.blink) continue;
    }
    if (drawn(target)) {
      const m = marks.get(target) || { color: null, blink: false };
      if (r.color && !m.color) m.color = r.color;
      if (r.blink) m.blink = true;
      marks.set(target, m);
    }
  }
  return { rooms, marks };
}
function powerText(w, lang = "en") {
  if (!Number.isFinite(w)) return "";
  return Math.abs(w) >= 1e3 ? (w / 1e3).toLocaleString(lang, { maximumFractionDigits: 1 }) + " kW" : Math.round(w).toLocaleString(lang) + " W";
}
function powerWatts(s) {
  if (!s) return null;
  const v = Number(s.state);
  if (s.state === "" || !Number.isFinite(v)) return null;
  const u = String(s.attributes && s.attributes.unit_of_measurement || "").trim();
  if (u === "W") return v;
  if (u === "kW") return v * 1e3;
  if (u === "mW") return v / 1e3;
  return s.attributes && s.attributes.device_class === "power" ? v : null;
}

// card/gif.js
function makePalette(frames, step = 3) {
  const count = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (const f of frames) {
    for (let i = 0; i < f.length; i += 4 * step) {
      const k = f[i] >> 3 << 10 | f[i + 1] >> 3 << 5 | f[i + 2] >> 3;
      count[k]++;
      sr[k] += f[i];
      sg[k] += f[i + 1];
      sb[k] += f[i + 2];
    }
  }
  const bins = [];
  for (let k = 0; k < 32768; k++) if (count[k]) bins.push(k);
  bins.sort((a, b) => count[b] - count[a]);
  const pal = [];
  for (const k of bins.slice(0, 256)) pal.push([Math.round(sr[k] / count[k]), Math.round(sg[k] / count[k]), Math.round(sb[k] / count[k])]);
  while (pal.length < 2) pal.push([0, 0, 0]);
  return pal;
}
function indexer(pal) {
  const cache = new Int16Array(32768).fill(-1);
  return (f) => {
    const out = new Uint8Array(f.length / 4);
    for (let i = 0, j = 0; i < f.length; i += 4, j++) {
      const k = f[i] >> 3 << 10 | f[i + 1] >> 3 << 5 | f[i + 2] >> 3;
      let c = cache[k];
      if (c < 0) {
        const r = (k >> 10 << 3) + 4, g = ((k >> 5 & 31) << 3) + 4, b = ((k & 31) << 3) + 4;
        let best = 0, bd = Infinity;
        for (let p2 = 0; p2 < pal.length; p2++) {
          const dr = pal[p2][0] - r, dg = pal[p2][1] - g, db = pal[p2][2] - b, d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
          if (d < bd) {
            bd = d;
            best = p2;
          }
        }
        c = cache[k] = best;
      }
      out[j] = c;
    }
    return out;
  };
}
function lzw(indexes) {
  const MIN = 8, CLEAR = 1 << MIN, EOI = CLEAR + 1, MAX = 4096;
  const out = [];
  let cur = 0, bits = 0, size = MIN + 1, next = EOI + 1, dict = /* @__PURE__ */ new Map();
  const emit = (code, clear = false) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) {
      out.push(cur & 255);
      cur >>>= 8;
      bits -= 8;
    }
    if (clear) {
      size = MIN + 1;
      next = EOI + 1;
      dict = /* @__PURE__ */ new Map();
    } else if (next > (size === 12 ? MAX : (1 << size) - 1) && size < 12) size++;
  };
  emit(CLEAR, true);
  let prefix = indexes[0];
  for (let i = 1; i < indexes.length; i++) {
    const c = indexes[i], key2 = prefix * 256 + c, hit = dict.get(key2);
    if (hit !== void 0) {
      prefix = hit;
      continue;
    }
    emit(prefix);
    if (next < MAX) dict.set(key2, next++);
    else emit(CLEAR, true);
    prefix = c;
  }
  emit(prefix);
  emit(EOI);
  if (bits > 0) out.push(cur & 255);
  return out;
}
function encodeGif(w, h, frames, pal, delay = 40) {
  const bytes = [];
  const u16 = (v) => bytes.push(v & 255, v >> 8 & 255);
  const str = (s) => {
    for (const ch of s) bytes.push(ch.charCodeAt(0));
  };
  str("GIF89a");
  u16(w);
  u16(h);
  bytes.push(247, 0, 0);
  for (let i = 0; i < 256; i++) {
    const c = pal[i] || [0, 0, 0];
    bytes.push(c[0], c[1], c[2]);
  }
  bytes.push(33, 255, 11);
  str("NETSCAPE2.0");
  bytes.push(3, 1, 0, 0, 0);
  for (const f of frames) {
    bytes.push(33, 249, 4, 0, delay & 255, delay >> 8 & 255, 0, 0);
    bytes.push(44);
    u16(0);
    u16(0);
    u16(w);
    u16(h);
    bytes.push(0);
    bytes.push(8);
    const data = lzw(f);
    for (let i = 0; i < data.length; i += 255) {
      const n5 = Math.min(255, data.length - i);
      bytes.push(n5);
      for (let k = 0; k < n5; k++) bytes.push(data[i + k]);
    }
    bytes.push(0);
  }
  bytes.push(59);
  return new Uint8Array(bytes);
}

// card/timeline.js
function normalizeHistory(history2) {
  const out = {};
  for (const [id, rows] of Object.entries(history2 || {})) {
    let attrs2 = {};
    out[id] = (rows || []).map((r) => {
      if (r.a) attrs2 = r.a;
      return { t: ((r.lu !== void 0 ? r.lu : r.lc) || 0) * 1e3, state: String(r.s), attributes: attrs2 };
    }).sort((a, b) => a.t - b.t);
  }
  return out;
}
function rowAt(rows, t) {
  let lo = 0, hi = rows.length - 1, best = -1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    if (rows[mid].t <= t) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return best >= 0 ? rows[best] : null;
}
function statesAt(hist, live, t) {
  return (id) => {
    const rows = hist[id];
    if (!rows || !rows.length) return live[id];
    const r = rowAt(rows, t) || rows[0];
    return { entity_id: id, state: r.state, attributes: { ...live[id] && live[id].attributes || {}, ...r.attributes }, last_updated: String(r.t) };
  };
}

// card/sun.js
var RAD = Math.PI / 180;
function sunPosition(date, lat, lon) {
  const d = date.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 3e-4 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const e = RAD * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = RAD * -lon, phi = RAD * lat;
  const H = RAD * (280.16 + 360.9856235 * d) - lw - ra;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { azimuth: ((az / RAD + 180) % 360 + 360) % 360, elevation: alt / RAD };
}
var FACADES = { n: 0, north: 0, ne: 45, e: 90, east: 90, se: 135, s: 180, south: 180, sw: 225, w: 270, west: 270, nw: 315 };
function facadeAngle(f) {
  const k = String(f || "").toLowerCase().replace(/[^a-z]/g, "");
  return k in FACADES ? FACADES[k] : null;
}
function inwardOf(w, line2, roomAt) {
  if (w.inward) return w.inward;
  const [a, b] = line2;
  const len3 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const n5 = [-(b[1] - a[1]) / len3, (b[0] - a[0]) / len3];
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  for (const s of [1, -1]) for (const step of [20, 35, 55]) if (roomAt(mx + s * n5[0] * step, my + s * n5[1] * step)) return [s * n5[0], s * n5[1]];
  return null;
}
function sunPatches(model, sun, { roomAt, offset = 0, cmPerSvg = 1 }) {
  if (!sun || sun.elevation < 2) return [];
  const out = [];
  const tanE = Math.tan(sun.elevation * RAD);
  for (const w of model.windows || []) {
    const face = facadeAngle(w.facade);
    if (face === null) continue;
    const delta = (sun.azimuth - (face + offset) + 540) % 360 - 180;
    if (Math.abs(delta) >= 85) continue;
    const lines = w.line ? [w.line] : Object.values(w.sashes || {}).map((s) => Array.isArray(s) ? s : s && s.line).filter(Boolean);
    if (!lines.length) continue;
    const pts3 = lines.flat();
    let line2 = [pts3[0], pts3[1]], best = -1;
    for (const a of pts3) for (const b of pts3) {
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (d > best) {
        best = d;
        line2 = [a, b];
      }
    }
    const n5 = inwardOf(w, line2, roomAt);
    if (!n5) continue;
    const room = roomAt((line2[0][0] + line2[1][0]) / 2 + n5[0] * 35, (line2[0][1] + line2[1][1]) / 2 + n5[1] * 35);
    if (!room) continue;
    const door = w.type === "hst" || /door|balcony|terrace|hst/i.test(w.id || "");
    const head2 = door ? 220 : 210, sill = door ? 0 : 85;
    const near2 = Math.min(1500, sill / tanE) / cmPerSvg, far = Math.min(1500, head2 / tanE) / cmPerSvg;
    if (far - near2 < 5) continue;
    const t = delta * RAD, v = [n5[0] * Math.cos(t) - n5[1] * Math.sin(t), n5[0] * Math.sin(t) + n5[1] * Math.cos(t)];
    const inner = (w.tick || 12) * 1;
    const [p1, p2] = line2.map((p3) => [p3[0] + n5[0] * inner, p3[1] + n5[1] * inner]);
    const at = (p3, d) => [p3[0] + v[0] * d, p3[1] + v[1] * d];
    out.push({ id: w.id, room, points: [at(p1, near2), at(p2, near2), at(p2, far), at(p1, far)], from: [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2], dir: v, length: far });
  }
  return out;
}
var f13 = (v) => Math.round(v * 10) / 10;
function sunLayer(patches, rooms) {
  if (!patches.length) return `<g id="fc-sun" pointer-events="none"></g>`;
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const defs2 = [`<filter id="fc-sun-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.5"/></filter>`], paths = [];
  patches.forEach((p2, i) => {
    const r = byId.get(p2.room);
    if (!r) return;
    defs2.push(`<clipPath id="fc-sun-c${i}"><polygon points="${r.points.map((q) => f13(q[0]) + "," + f13(q[1])).join(" ")}"/></clipPath>`);
    paths.push(`<g clip-path="url(#fc-sun-c${i})"><polygon filter="url(#fc-sun-soft)" fill="#ffd98a" fill-opacity="0.3" points="${p2.points.map((q) => f13(q[0]) + "," + f13(q[1])).join(" ")}"/></g>`);
  });
  return `<g id="fc-sun" pointer-events="none"><defs>${defs2.join("")}</defs><g>${paths.join("")}</g></g>`;
}

// card/influx.js
var STATE_BATCH = 40;
var SERIES_BATCH = 12;
async function hasProxy(hass) {
  try {
    await hass.callApi("GET", "influx_proxy/states?entities=sun.sun&days=0.01");
    return true;
  } catch (e) {
    return false;
  }
}
var chunks = (list, n5) => Array.from({ length: Math.ceil(list.length / n5) }, (_, i) => list.slice(i * n5, i * n5 + n5));
function isNumericSensor(id, state) {
  if (!id.startsWith("sensor.")) return false;
  return !!(state && (state.attributes && state.attributes.unit_of_measurement || state.state !== "" && !isNaN(Number(state.state))));
}
function fromStates(rows, attrNames) {
  return (rows || []).map((r) => {
    const attributes = {};
    attrNames.forEach((a, i) => {
      if (r[2 + i] !== null && r[2 + i] !== void 0) attributes[a] = r[2 + i];
    });
    return { t: r[0], state: String(r[1]), attributes };
  });
}
function fromSeries(points) {
  return (points || []).filter((p2) => p2.mean !== null && p2.mean !== void 0).map((p2) => ({ t: p2.start, state: String(Math.round(p2.mean * 10) / 10), attributes: {} }));
}
async function proxyHistory(hass, ids, start, end) {
  const numeric2 = ids.filter((id) => isNumericSensor(id, hass.states[id]));
  const other = ids.filter((id) => !numeric2.includes(id));
  const attrs2 = ["brightness", "current_position"];
  const out = {};
  const q = (path, list, extra = "") => hass.callApi("GET", `influx_proxy/${path}?entities=${list.map(encodeURIComponent).join(",")}&start=${Math.round(start)}&end=${Math.round(end)}${extra}`);
  const jobs = [
    ...chunks(other, STATE_BATCH).map((list) => q("states", list, "&attributes=" + attrs2.join(",")).then((r) => {
      for (const [id, rows] of Object.entries(r || {})) out[id] = fromStates(rows, attrs2);
    })),
    ...chunks(numeric2, SERIES_BATCH).map((list) => q("series", list).then((r) => {
      for (const [id, pts3] of Object.entries(r || {})) out[id] = fromSeries(pts3);
    }))
  ];
  const res = await Promise.allSettled(jobs);
  if (res.every((r) => r.status === "rejected") && jobs.length) throw res[0].reason;
  for (const rows of Object.values(out)) rows.sort((a, b) => a.t - b.t);
  return out;
}

// card/card.js
var CARD_NAME = "living-floorplan-card";
var OLD_CARD_NAME = "house-floorplan-card";
var VERSION = "0.1.0";
var LOADED_FROM = (() => {
  try {
    return new URL(import.meta.url);
  } catch (e) {
    return null;
  }
})();
function versionLabel(url = LOADED_FROM) {
  const v = url && url.searchParams.get("v");
  return VERSION + (v ? " \xB7 v" + v : "");
}
var STRINGS = {
  en: {
    card_name: "Living Floor Plan",
    card_description: "Your house from the floor plan editor, live: light that fills the rooms, covers, readings, presence.",
    model_required: "Set 'model' to the house.json from the floor plan editor, e.g. /local/house.json.",
    loading: "Loading the plan\u2026",
    g_click: "Click",
    g_hold: "hold",
    g_on: "turn on",
    g_off: "turn off",
    g_open: "open",
    g_close: "close",
    g_stop: "stop",
    g_info: "details",
    g_stats: "statistics",
    g_door: "open the door",
    undo: "Undo",
    u_on: "on",
    u_off: "off",
    u_opening: "opening",
    u_closing: "closing",
    u_stopped: "stopped",
    door_opening: "Opening the door\u2026",
    door_open: "Door opened",
    load_error: "Could not load {url}: {msg}",
    onb_title: "Draw your house",
    onb_text: "Open the floor plan editor (Floor plan in the sidebar): draw the walls or trace a photo or PDF of your plan, place lights, covers and sensors and pick their entities. Save - this card shows the plan at once.",
    onb_button: "Open the editor",
    ground_floor: "Ground floor",
    zoom_in: "Zoom in",
    zoom_out: "Zoom out",
    fit: "Whole plan",
    map_live: "Live",
    map_temperature: "Temperature",
    map_humidity: "Humidity",
    map_light_hours: "Hours of light",
    map_presence_hours: "Hours of presence",
    map_light_energy: "Light energy",
    hours: "{n} h",
    loading_history: "Loading history\u2026",
    alert_smoke: "Smoke",
    alert_co: "Carbon monoxide",
    alert_leak: "Leak",
    alert_gas: "Gas",
    alert_siren: "Alarm",
    alert_cold: "Window open, {t}\xB0 outside",
    time_travel: "Go back in time",
    live: "Live",
    range_24h: "24 h",
    range_7d: "7 days",
    range_30d: "30 days",
    range_90d: "3 months",
    play: "Play",
    pause: "Pause",
    settings: "Settings",
    s_light: "Light",
    s_realistic: "Realistic",
    s_glow: "Glows",
    s_sun: "Sun through the windows",
    s_trail: "Trail of movement",
    s_labels: "Room names",
    s_readings: "Temperatures",
    s_heating: "Heating rooms tinted",
    s_reset: "Defaults",
    s_layers: "Show on the plan",
    s_idle_lights: "Lamps that are off",
    s_sensors: "Motion and presence sensors",
    s_devices: "Devices and appliances",
    s_cameras: "Cameras",
    s_furniture: "Furniture",
    s_strength: "Light strength",
    s_note: "Only on this device.",
    s_theme: "Theme",
    th_auto: "Like Home Assistant",
    th_dark: "Dark",
    th_light: "Light",
    forgotten: "\u{1F4A1} {room}: on, nobody there for {min} min \xB7 turn off",
    cam_seen: "someone there",
    ev_open: "{name} open",
    ev_detect: "{name}: detection",
    close: "Close",
    confirm: "Are you sure?",
    map_energy: "Energy in the rooms",
    map_signal: "Signal (Zigbee, Wi-Fi)",
    p_now: "Now",
    p_days: "{n} days",
    p_year: "Year",
    p_winter: "Winter",
    p_summer: "Summer",
    compare: "\xB1 before",
    vs_before: "against the period before",
    sig_weak: "weak",
    sig_good: "strong",
    none_found: "no signal sensors found",
    r_lights: "Lights",
    r_covers: "Covers",
    r_climate: "Climate",
    r_devices: "Devices",
    r_all_off: "All off",
    r_all_up: "All up",
    r_all_down: "All down",
    r_someone: "someone there",
    r_empty: "nobody",
    r_empty_for: "nobody for {t}",
    r_nothing: "Nothing of this room is on the plan.",
    r_24h: "24 h",
    lasso_hint: "Select an area: draw round it (Shift + drag with a mouse)",
    lasso_count: "{l} lights \xB7 {c} covers",
    lasso_none: "Nothing to switch here",
    lasso_on: "Turn on",
    lasso_off: "Turn off",
    power_house: "House now {w}",
    power_devices: "Devices now {w}",
    rec_t: "Save the range as an animated GIF (about 30 seconds)",
    edit_plan: "Edit the plan"
  },
  pl: {
    card_name: "Living Floor Plan",
    card_description: "Tw\xF3j dom z edytora rzutu, na \u017Cywo: \u015Bwiat\u0142o wype\u0142niaj\u0105ce pokoje, rolety, odczyty, obecno\u015B\u0107.",
    model_required: "Ustaw 'model' na house.json z edytora rzutu, np. /local/house.json.",
    g_click: "Klik",
    g_hold: "przytrzymaj",
    g_on: "zapal",
    g_off: "zga\u015B",
    g_open: "otw\xF3rz",
    g_close: "zamknij",
    g_stop: "zatrzymaj",
    g_info: "szczeg\xF3\u0142y",
    g_stats: "statystyki",
    g_door: "otw\xF3rz drzwi",
    undo: "Cofnij",
    u_on: "zapalone",
    u_off: "zgaszone",
    u_opening: "otwiera si\u0119",
    u_closing: "zamyka si\u0119",
    u_stopped: "zatrzymana",
    door_opening: "Otwieram drzwi\u2026",
    door_open: "Drzwi otwarte",
    loading: "Wczytuj\u0119 rzut\u2026",
    load_error: "Nie uda\u0142o si\u0119 wczyta\u0107 {url}: {msg}",
    onb_title: "Narysuj sw\xF3j dom",
    onb_text: "Otw\xF3rz edytor rzutu (Floor plan w menu bocznym): narysuj \u015Bciany albo odrysuj zdj\u0119cie lub PDF planu, postaw lampy, rolety i czujniki i wybierz ich encje. Zapisz \u2014 karta od razu poka\u017Ce plan.",
    onb_button: "Otw\xF3rz edytor",
    ground_floor: "Parter",
    zoom_in: "Przybli\u017C",
    zoom_out: "Oddal",
    fit: "Ca\u0142y rzut",
    map_live: "Na \u017Cywo",
    map_temperature: "Temperatura",
    map_humidity: "Wilgotno\u015B\u0107",
    map_light_hours: "Godziny \u015Bwiat\u0142a",
    map_presence_hours: "Godziny obecno\u015Bci",
    map_light_energy: "Pr\u0105d na \u015Bwiat\u0142o",
    hours: "{n} h",
    loading_history: "Wczytuj\u0119 histori\u0119\u2026",
    alert_smoke: "Dym",
    alert_co: "Czad",
    alert_leak: "Zalanie",
    alert_gas: "Gaz",
    alert_siren: "Alarm",
    alert_cold: "Okno otwarte, na dworze {t}\xB0",
    time_travel: "Cofnij si\u0119 w czasie",
    live: "Na \u017Cywo",
    range_24h: "24 h",
    range_7d: "7 dni",
    range_30d: "30 dni",
    range_90d: "3 mies.",
    play: "Odtw\xF3rz",
    pause: "Pauza",
    settings: "Ustawienia",
    s_light: "\u015Awiat\u0142o",
    s_realistic: "Realistyczne",
    s_glow: "Po\u015Bwiaty",
    s_sun: "S\u0142o\u0144ce w oknach",
    s_trail: "\u015Alad ruchu",
    s_labels: "Nazwy pokoi",
    s_readings: "Temperatury",
    s_heating: "Grzej\u0105ce pokoje na czerwono",
    s_reset: "Domy\u015Blne",
    s_layers: "Pokazuj na rzucie",
    s_idle_lights: "Zgaszone lampy",
    s_sensors: "Czujniki ruchu i obecno\u015Bci",
    s_devices: "Urz\u0105dzenia i AGD",
    s_cameras: "Kamery",
    s_furniture: "Meble",
    s_strength: "Si\u0142a \u015Bwiat\u0142a",
    s_note: "Tylko na tym urz\u0105dzeniu.",
    s_theme: "Wygl\u0105d",
    th_auto: "Jak Home Assistant",
    th_dark: "Ciemny",
    th_light: "Jasny",
    forgotten: "\u{1F4A1} {room}: \u015Bwieci, nikogo od {min} min \xB7 zga\u015B",
    cam_seen: "kto\u015B jest",
    ev_open: "{name} otwarte",
    ev_detect: "{name}: wykrycie",
    close: "Zamknij",
    confirm: "Na pewno?",
    map_energy: "Pr\u0105d w pokojach",
    map_signal: "Zasi\u0119g (Zigbee, Wi-Fi)",
    p_now: "Teraz",
    p_days: "{n} dni",
    p_year: "Rok",
    p_winter: "Zima",
    p_summer: "Lato",
    compare: "\xB1 poprzedni",
    vs_before: "wobec poprzedniego",
    sig_weak: "s\u0142aby",
    sig_good: "dobry",
    none_found: "brak czujnik\xF3w zasi\u0119gu",
    r_lights: "\u015Awiat\u0142o",
    r_covers: "Rolety",
    r_climate: "Klimat",
    r_devices: "Urz\u0105dzenia",
    r_all_off: "Zga\u015B wszystko",
    r_all_up: "Wszystkie w g\xF3r\u0119",
    r_all_down: "Wszystkie w d\xF3\u0142",
    r_someone: "kto\u015B jest",
    r_empty: "pusto",
    r_empty_for: "pusto od {t}",
    r_nothing: "Z tego pokoju nic nie ma na rzucie.",
    r_24h: "24 h",
    lasso_hint: "Zaznacz obszar: obrysuj go (mysz\u0105: Shift + przeci\u0105gni\u0119cie)",
    lasso_count: "lampy: {l} \xB7 rolety: {c}",
    lasso_none: "Nic tu nie ma do prze\u0142\u0105czenia",
    lasso_on: "Zapal",
    lasso_off: "Zga\u015B",
    power_house: "Dom teraz {w}",
    power_devices: "Urz\u0105dzenia teraz {w}",
    rec_t: "Zapisz zakres jako animowany GIF (oko\u0142o 30 sekund)",
    edit_plan: "Edytuj rzut"
  },
  de: {
    card_name: "Living Floor Plan",
    card_description: "Dein Haus aus dem Grundriss-Editor, live: Licht, das die R\xE4ume f\xFCllt, Rolll\xE4den, Messwerte, Pr\xE4senz.",
    model_required: "Setze 'model' auf die house.json aus dem Grundriss-Editor, z. B. /local/house.json.",
    loading: "Grundriss wird geladen\u2026",
    g_click: "Klick",
    g_hold: "halten",
    g_on: "einschalten",
    g_off: "ausschalten",
    g_open: "\xF6ffnen",
    g_close: "schlie\xDFen",
    g_stop: "stoppen",
    g_info: "Details",
    g_stats: "Statistik",
    g_door: "T\xFCr \xF6ffnen",
    undo: "R\xFCckg\xE4ngig",
    u_on: "an",
    u_off: "aus",
    u_opening: "\xF6ffnet",
    u_closing: "schlie\xDFt",
    u_stopped: "gestoppt",
    door_opening: "T\xFCr wird ge\xF6ffnet\u2026",
    door_open: "T\xFCr ge\xF6ffnet",
    load_error: "{url} konnte nicht geladen werden: {msg}",
    onb_title: "Zeichne dein Haus",
    onb_text: "\xD6ffne den Grundriss-Editor (Grundriss in der Seitenleiste): zeichne die W\xE4nde oder zeichne ein Foto oder PDF deines Plans nach, platziere Lichter, Rolll\xE4den und Sensoren und w\xE4hle ihre Entit\xE4ten. Speichern - diese Karte zeigt den Plan sofort.",
    onb_button: "Editor \xF6ffnen",
    ground_floor: "Erdgeschoss",
    zoom_in: "Vergr\xF6\xDFern",
    zoom_out: "Verkleinern",
    fit: "Ganzer Plan",
    map_live: "Live",
    map_temperature: "Temperatur",
    map_humidity: "Luftfeuchtigkeit",
    map_light_hours: "Stunden Licht",
    map_presence_hours: "Stunden Pr\xE4senz",
    map_light_energy: "Energie f\xFCr Licht",
    hours: "{n} h",
    loading_history: "Verlauf wird geladen\u2026",
    alert_smoke: "Rauch",
    alert_co: "Kohlenmonoxid",
    alert_leak: "Wasserleck",
    alert_gas: "Gas",
    alert_siren: "Alarm",
    alert_cold: "Fenster offen, drau\xDFen {t}\xB0",
    time_travel: "Zur\xFCck in der Zeit",
    live: "Live",
    range_24h: "24 h",
    range_7d: "7 Tage",
    range_30d: "30 Tage",
    range_90d: "3 Monate",
    play: "Abspielen",
    pause: "Pause",
    settings: "Einstellungen",
    s_light: "Licht",
    s_realistic: "Realistisch",
    s_glow: "Lichtkreise",
    s_sun: "Sonne durch die Fenster",
    s_trail: "Bewegungsspur",
    s_labels: "Raumnamen",
    s_readings: "Temperaturen",
    s_heating: "Heizende R\xE4ume einf\xE4rben",
    s_reset: "Standard",
    s_layers: "Auf dem Plan zeigen",
    s_idle_lights: "Ausgeschaltete Lampen",
    s_sensors: "Bewegungs- und Pr\xE4senzsensoren",
    s_devices: "Ger\xE4te und Haushaltsger\xE4te",
    s_cameras: "Kameras",
    s_furniture: "M\xF6bel",
    s_strength: "Lichtst\xE4rke",
    s_note: "Nur auf diesem Ger\xE4t.",
    s_theme: "Design",
    th_auto: "Wie Home Assistant",
    th_dark: "Dunkel",
    th_light: "Hell",
    forgotten: "\u{1F4A1} {room}: an, seit {min} min niemand da \xB7 ausschalten",
    cam_seen: "jemand da",
    ev_open: "{name} offen",
    ev_detect: "{name}: Erkennung",
    close: "Schlie\xDFen",
    confirm: "Bist du sicher?",
    map_energy: "Energie in den R\xE4umen",
    map_signal: "Signal (Zigbee, WLAN)",
    p_now: "Jetzt",
    p_days: "{n} Tage",
    p_year: "Jahr",
    p_winter: "Winter",
    p_summer: "Sommer",
    compare: "\xB1 vorher",
    vs_before: "im Vergleich zum Zeitraum davor",
    sig_weak: "schwach",
    sig_good: "stark",
    none_found: "keine Signalsensoren gefunden",
    r_lights: "Lichter",
    r_covers: "Rolll\xE4den",
    r_climate: "Klima",
    r_devices: "Ger\xE4te",
    r_all_off: "Alle aus",
    r_all_up: "Alle hoch",
    r_all_down: "Alle runter",
    r_someone: "jemand da",
    r_empty: "niemand",
    r_empty_for: "seit {t} niemand",
    r_nothing: "Von diesem Raum ist nichts auf dem Plan.",
    r_24h: "24 h",
    lasso_hint: "Bereich w\xE4hlen: umrande ihn (mit der Maus: Shift + Ziehen)",
    lasso_count: "{l} Lichter \xB7 {c} Rolll\xE4den",
    lasso_none: "Hier gibt es nichts zu schalten",
    lasso_on: "Einschalten",
    lasso_off: "Ausschalten",
    power_house: "Haus jetzt {w}",
    power_devices: "Ger\xE4te jetzt {w}",
    rec_t: "Zeitraum als animiertes GIF speichern (etwa 30 Sekunden)",
    edit_plan: "Plan bearbeiten"
  }
};
function translate(lang, key2, vars = {}) {
  const code = String(lang || "en").slice(0, 2).toLowerCase();
  const t = STRINGS[code] || STRINGS.en;
  const text = t[key2] !== void 0 ? t[key2] : STRINGS.en[key2] !== void 0 ? STRINGS.en[key2] : key2;
  return text.replace(/\{(\w+)\}/g, (m, k) => vars[k] !== void 0 ? vars[k] : m);
}
var TOGGLE_DOMAINS = /* @__PURE__ */ new Set(["light", "switch", "fan", "input_boolean", "cover", "media_player", "humidifier"]);
var TAP_TOGGLE = /* @__PURE__ */ new Set(["light", "cover"]);
function coverTapWord(st) {
  if (st.state === "opening" || st.state === "closing") return "u_stopped";
  const p2 = st.attributes && st.attributes.current_position;
  return (typeof p2 === "number" ? p2 > 0 : st.state === "open") ? "u_closing" : "u_opening";
}
var HIT_PX = 24;
var DRAG_PX = 10;
var HOLD_MS = 500;
var MAX_ZOOM = 8;
var MIN_ZOOM = 0.5;
var RECORDER_DAYS = 10;
function turnedViewBox([x, y, w, h]) {
  return [-(y + h), x, h, w];
}
function shouldTurn(boxW, boxH, vbW, vbH) {
  if (!(boxW > 0 && boxH > 0)) return false;
  const flat = Math.min(boxW / vbW, boxH / vbH);
  const turned = Math.min(boxW / vbH, boxH / vbW);
  return turned > flat * 1.15;
}
function entitiesOf(svg) {
  const ids = /* @__PURE__ */ new Set();
  const attrs2 = [
    "data-entity",
    "data-lf",
    "data-temp",
    "data-hum",
    "data-entity-detect",
    "data-job",
    NAMES.attrState,
    NAMES.attrEnd,
    NAMES.attrContact,
    NAMES.attrValue,
    NAMES.attrTintEntity
  ];
  for (const a of attrs2) {
    svg.querySelectorAll("[" + a + "]").forEach((el) => {
      for (const id of String(el.getAttribute(a)).split(",")) if (/^[a-z0-9_]+\.[a-z0-9_]+$/.test(id.trim())) ids.add(id.trim());
    });
  }
  return ids;
}
function kioskConfig(k) {
  if (!k) return null;
  const c = typeof k === "object" ? k : {};
  const night = c.night_dim === void 0 ? null : String(c.night_dim);
  return {
    idle: Number(c.idle) > 0 ? Number(c.idle) : 60,
    night: night === "sun" ? "sun" : night && /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/.test(night) ? night : null,
    dim: Number(c.dim) > 0 && Number(c.dim) < 1 ? Number(c.dim) : 0.4
  };
}
function inWindow(range, now) {
  const [a, b] = range.split("-").map((t) => {
    const [h, m2] = t.split(":").map(Number);
    return h * 60 + m2;
  });
  const m = now.getHours() * 60 + now.getMinutes();
  return a <= b ? m >= a && m < b : m >= a || m < b;
}
var RESERVED_IDS = /* @__PURE__ */ new Set([
  "wrap",
  "stage",
  "floors",
  "zoom",
  "zoom-in",
  "zoom-out",
  "zoom-fit",
  "lasso-btn",
  "layers",
  "set-btn",
  "tt-btn",
  "layer-btn",
  "layer-menu",
  "settings",
  "timeline",
  "tt-play",
  "tt-rec",
  "tt-when",
  "tt-ranges",
  "tt-live",
  "tt-marks",
  "tt-slider",
  "campop",
  "campop-x",
  "legend",
  "dim",
  "alerts",
  "info",
  "palette",
  "plan",
  "sheet",
  "rooms",
  "dividers",
  "lights",
  "covers",
  "cameras",
  "controls",
  "furniture",
  "devices",
  "locks",
  "climate",
  "labels",
  "desc",
  "light-field",
  "room-labels",
  "room-climate",
  "walls-exterior",
  "walls-interior",
  "doors-interior",
  "device-labels"
]);
function safeIds(model) {
  const walk = (o) => {
    if (Array.isArray(o)) return o.map(walk);
    if (!o || typeof o !== "object") return o;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (k === "id" && typeof v === "string") {
        const id = v.replace(/[^\w.:-]/g, "_");
        out[k] = RESERVED_IDS.has(id) || id.startsWith("fc-") ? id + "-1" : id;
      } else out[k] = walk(v);
    }
    return out;
  };
  return walk(model);
}
function detectSensorFor(camId, entities, states) {
  const dev = entities && entities[camId] && entities[camId].device_id;
  if (!dev) return null;
  let best = null, bestScore = 0;
  for (const e of Object.values(entities)) {
    if (e.device_id !== dev || !e.entity_id || !e.entity_id.startsWith("binary_sensor.")) continue;
    const dc = states && states[e.entity_id] && states[e.entity_id].attributes && states[e.entity_id].attributes.device_class || "";
    const score = /person|osoba|people|human|face|twarz/.test(e.entity_id) ? 3 : dc === "occupancy" || dc === "presence" ? 2 : dc === "motion" || /motion|ruch/.test(e.entity_id) ? 1 : 0;
    if (score > bestScore) {
      best = e.entity_id;
      bestScore = score;
    }
  }
  return best;
}
var NOT_CORE = ".glows, .glow, .glow-dim, .sensor-fan, .wave, .camera-fan";
function coreRect(el) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const c of el.querySelectorAll("circle, ellipse, rect, path, line, polygon, polyline, use, text")) {
    if (c.closest(NOT_CORE)) continue;
    const q = c.getBoundingClientRect();
    if (!q.width && !q.height) continue;
    l = Math.min(l, q.left);
    t = Math.min(t, q.top);
    r = Math.max(r, q.right);
    b = Math.max(b, q.bottom);
  }
  if (l === Infinity) return el.getBoundingClientRect();
  return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
}
function normalizeEntityActions(e) {
  const out = {};
  const put = (id, v) => {
    if (typeof id === "string" && v && typeof v === "object") out[id] = { tap: v.tap_action || null, hold: v.hold_action || null };
  };
  if (Array.isArray(e)) for (const x of e) put(x && x.entity, x);
  else if (e && typeof e === "object") for (const [k, v] of Object.entries(e)) put(k, v);
  return out;
}
function isEnergyMeter(s) {
  const a = s && s.attributes || {};
  return !!s && (a.device_class === "energy" || /^[kM]?Wh$/.test(a.unit_of_measurement || "")) && /^total/.test(a.state_class || "");
}
function kwhFactor(s) {
  const u = s && s.attributes && s.attributes.unit_of_measurement || "kWh";
  return u === "Wh" ? 1e-3 : u === "MWh" ? 1e3 : 1;
}
var LAYERS = ["idle_lights", "sensors", "devices", "cameras", "furniture"];
var DEFAULT_EDITOR_URL = "/living-floorplan";
var LivingFloorplanCard = class extends HTMLElement {
  setConfig(config) {
    const lang = navigator.language;
    if (!config) throw new Error(translate(lang, "model_required"));
    const hasModel = typeof config.model === "string" && config.model.trim() || config.model && typeof config.model === "object";
    this._config = {
      // no model yet: the card shows how to get one (the editor that comes with the card)
      model: hasModel ? config.model : null,
      editorUrl: typeof config.editor_url === "string" && config.editor_url ? config.editor_url : DEFAULT_EDITOR_URL,
      light: config.light === "glow" ? "glow" : "realistic",
      rotate: config.rotate === 0 || config.rotate === "0" ? 0 : config.rotate === 90 || config.rotate === "90" ? 90 : "auto",
      floor: config.floor || null,
      height: Number(config.height) > 0 ? Number(config.height) : null,
      showFloors: config.show_floors !== false,
      showZoom: config.show_zoom !== false,
      hold: config.hold_action === "more-info" ? "more-info" : "insights",
      maps: config.maps !== false,
      mapDays: Number(config.map_days) > 0 ? Math.min(365, Number(config.map_days)) : 7,
      kiosk: kioskConfig(config.kiosk),
      alerts: normalizeAlerts(config.alerts),
      timeTravel: config.time_travel !== false,
      // use InfluxDB Proxy for history beyond the recorder, when installed
      influx: config.influx !== false,
      // per kWh, for the light energy map
      price: Number(config.price) > 0 ? Number(config.price) : null,
      // a lock / door strike: "more-info" (default) or "hold" - opened by holding it 0.8 s
      lockAction: config.lock_action === "hold" ? "hold" : "more-info",
      // a tap on a chandelier of two circuits: "toggle" (off -> the smaller one, on -> off) or "cycle"
      // (off -> the smaller -> both -> off)
      fixtureTap: config.fixture_tap === "cycle" ? "cycle" : "toggle",
      // doors without a contact sensor: "closed" (default) - they stop the light, "open" - light goes through
      doors: config.doors === "open" ? "open" : "closed",
      labels: config.show_room_names === true,
      trail: config.trail !== false,
      trailMs: (Number(config.trail_minutes) > 0 ? Math.min(240, Number(config.trail_minutes)) : 30) * 6e4,
      // sun through the windows; off by default. { offset: degrees the house is turned from its facades }
      sun: config.sun ? { offset: Number(config.sun && config.sun.offset || 0) || 0 } : null,
      cold: config.cold && typeof config.cold.outside === "string" ? { outside: config.cold.outside, below: Number(config.cold.below) > -50 ? Number(config.cold.below) : 12 } : null,
      // a camera that sees someone opens its picture: "kiosk" (default: in tablet mode), "always", "never"
      cameraPopup: config.camera_popup === true || config.camera_popup === "always" ? "always" : config.camera_popup === false || config.camera_popup === "never" ? "never" : "kiosk",
      popupSeconds: Number(config.camera_popup_seconds) > 0 ? Number(config.camera_popup_seconds) : 30,
      // { camera.x: binary_sensor.y } when the sensor is not on the camera's device
      cameraDetect: config.camera_detect && typeof config.camera_detect === "object" ? config.camera_detect : {},
      // marks on the time travel line: alarms, locks, camera detections + these; false = none
      events: config.events === false ? null : normalizeEvents(config.events),
      // a lamp on in a room with nobody for this long
      forgotten: config.forgotten === false ? null : { minutes: Number(config.forgotten && config.forgotten.minutes) > 0 ? Number(config.forgotten.minutes) : 30 },
      // rooms with a thermostat / TRV on the plan are tinted while it heats
      roomHeating: config.room_heating !== false,
      accent: /^#[0-9a-fA-F]{3,8}$/.test(config.accent || "") ? config.accent : null,
      // your own tap / hold actions per entity (navigate, perform-action, fire-dom-event...)
      actions: normalizeEntityActions(config.entities),
      // a small version label at the bottom (for testing which copy a browser runs)
      showVersion: config.show_version === true,
      // a tap on a room's empty floor: its window (lights, covers, climate, presence) or nothing
      roomTap: config.room_tap === "none" ? "none" : "dialog",
      // a lasso: draw round a part of the house, then switch everything in it
      lasso: config.lasso !== false,
      // rules: a room tinted, a mark glowing or blinking while something holds (rules.js)
      rules: normalizeRules(config.rules),
      // live power by the devices: found on their HA device, or `power: { <entity on the plan>: <power sensor> }`; false hides it
      power: config.power === false ? false : config.power && typeof config.power === "object" ? config.power : {},
      powerTotal: typeof config.power_total === "string" ? config.power_total : null,
      powerMin: Number.isFinite(Number(config.power_min)) ? Number(config.power_min) : 2,
      // a clock, a calendar, a reading, buttons - in free spots of the plan
      widgets: normalizeWidgets(config.widgets),
      // energy meters the plan does not show: [sensor.x] or [{ entity, room }]
      energy: (Array.isArray(config.energy) ? config.energy : []).map((e) => typeof e === "string" ? { entity: e } : e).filter((e) => e && typeof e.entity === "string")
    };
    this._map = MAP_KINDS.includes(config.map) ? config.map : "live";
    const hide = new Set(Array.isArray(config.hide) ? config.hide : []);
    this._defaults = {
      light: this._config.light,
      sun: !!this._config.sun,
      trail: this._config.trail,
      labels: this._config.labels,
      readings: true,
      heating: this._config.roomHeating,
      idle_lights: !hide.has("idle_lights"),
      sensors: !hide.has("sensors"),
      devices: !hide.has("devices"),
      cameras: !hide.has("cameras"),
      furniture: !hide.has("furniture"),
      strength: 0.36,
      // a quarter of the ⚙ slider (owner, 26.10)
      theme: ["dark", "light"].includes(config.theme) ? config.theme : "auto"
    };
    this._sunCfg = this._config.sun || { offset: 0 };
    this._prefs = this._loadPrefs();
    this._applyPrefs();
    if (this._playTimer) {
      clearInterval(this._playTimer);
      this._playTimer = null;
    }
    if (this._kioskTimer && !this._config.kiosk) {
      clearInterval(this._kioskTimer);
      this._kioskTimer = null;
    }
    this._travel = null;
    this._travelReq = (this._travelReq || 0) + 1;
    this._svg = this._entities = this._floorsLowered = this._alertEntities = null;
    this._alertKey = "";
    this._bannerKey = null;
    this._mapCache = null;
    this._trailRows = null;
    this._trailAt = 0;
    this._mapPeriod = null;
    this._compare = false;
    this._influx = void 0;
    this._detState = {};
    this._closePopup && this._closePopup();
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._floor = this._config.floor;
    this._model = null;
    this._sig = "";
    this._render();
    this._load();
    if (this.isConnected) this.connectedCallback();
  }
  _render() {
    this.shadowRoot.innerHTML = `
<style>
  ha-card { overflow: hidden; position: relative; background: var(--fc-solid); }
  #wrap { position: relative; width: 100%; touch-action: none; user-select: none; -webkit-user-select: none; }
  #stage { position: absolute; inset: 0; }
  #wrap { container-type: inline-size; }
  /* a narrow card (a phone): compact buttons, the map button as its icon only */
  @container (max-width: 520px) {
    button.fc { padding: 5px 8px; font-size: 12px; }
    #layer-btn .lbl { display: none; }
    #floors, #layers { top: 6px; }
    #floors { left: 6px; gap: 4px; } #layers { right: 6px; }
  }
  #stage svg { width: 100%; height: 100%; display: block; }
  #info.onb { display: grid; gap: 8px; padding: 20px; }
  #info .onb-h { font-size: 18px; font-weight: 600; color: var(--primary-text-color, #e1e7ef); }
  #info p { margin: 0; line-height: 1.5; max-width: 62ch; }
  #info .onb-err { color: #e57373; }
  #info .onb-btn { justify-self: start; margin-top: 4px; padding: 8px 14px; border-radius: 8px; background: var(--fc-accent); color: var(--fc-ink);
    font-weight: 600; text-decoration: none; }
  #info { padding: 16px; color: var(--secondary-text-color, #7c8ca3); font: 14px var(--paper-font-body1_-_font-family, sans-serif); }
  #floors { position: absolute; top: 8px; left: 8px; display: flex; gap: 6px; z-index: 2; }
  #zoom { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 6px; z-index: 2; }
  button.fc { font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text);
    background: var(--fc-panel); border: 1px solid var(--fc-line);
    border-radius: 8px; padding: 6px 12px; cursor: pointer; }
  button.fc:hover { border-color: var(--fc-line-hi); }
  button.fc.sel { border-color: var(--fc-accent); color: var(--fc-accent); }
  #zoom button.fc { width: 36px; height: 36px; padding: 0; font-size: 18px; line-height: 1; }
  /* realistic light: the generator's round glows give way to the light field */
  .fc-realistic .light .glow, .fc-realistic .light .glow-dim { display: none; } /* device glows (appliances, alarms) stay */
  #light-field { mix-blend-mode: var(--fc-blend); opacity: var(--fc-light-k, 0.36); }
  /* readings: theme text colour, with a halo so they stay readable in the light */
  #room-labels text { fill: var(--fc-text2); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  #room-climate text { fill: var(--fc-text); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  #room-climate .climate-hum, #room-climate .climate-name { fill: var(--fc-text2); }
  #light-field .lf { transition: opacity 0.35s; }
  #layers { position: absolute; top: 8px; right: 8px; z-index: 3; text-align: right; }
  #layer-menu { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; align-items: stretch; }
  #layer-menu[hidden] { display: none; }
  #settings { margin-top: 6px; margin-left: auto; width: 230px; text-align: left; background: var(--fc-panel);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 10px 12px; color: var(--fc-text);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); display: grid; gap: 8px; }
  #settings[hidden] { display: none; }
  #settings .ttl { font-weight: 600; }
  #settings label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
  #settings input { accent-color: var(--fc-accent); width: 16px; height: 16px; }
  #settings label.strength { flex-direction: column; align-items: stretch; gap: 4px; }
  #settings label.strength input { width: 100%; height: auto; }
  #settings .seg { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  #settings .seg span { flex: 1 0 100%; color: var(--fc-text2); }
  #settings button.edit { display: block; width: 100%; margin: 8px 0 6px; font-weight: 600; }
  #settings .foot { display: flex; align-items: center; gap: 8px; color: var(--fc-text2); font-size: 12px; }
  #settings .foot span { flex: 1; }
  .no-readings #room-climate { display: none; }
  #settings .sub { color: var(--fc-text2); margin-top: 2px; }
  /* hidden layers: invisible but still there to tap (a lamp that is off can be switched on) */
  .no-idle-lights .light:not(.on), .no-idle-lights .light:not(.on) ~ .bulb-shared { opacity: 0; }
  .no-sensors .presence, .no-sensors .motion { opacity: 0; }
  .no-devices .icon-device:not(.alarm), .no-devices .appliance, .no-devices .tv, .no-devices .ac { opacity: 0; }
  .no-cameras .camera { display: none; }
  .no-furniture #furniture { display: none; }
  #legend { position: absolute; left: 8px; bottom: 8px; z-index: 2; font: 12px var(--paper-font-body1_-_font-family, sans-serif);
    color: var(--fc-text); background: var(--fc-panel); border: 1px solid var(--fc-line); border-radius: 8px; padding: 6px 10px; }
  #alerts { position: absolute; top: 48px; left: 50%; transform: translateX(-50%); z-index: 5; display: flex; flex-direction: column; gap: 4px; align-items: center; }
  #alerts button.fc { border-color: currentColor; font-weight: 600; }
  #floors button.fc.alarm::after { content: ""; display: inline-block; width: 8px; height: 8px; margin-left: 6px; border-radius: 50%; background: #e53935; vertical-align: 1px; }
  #fc-alerts polygon { animation: fc-pulse 1.4s ease-in-out infinite; }
  @keyframes fc-pulse { 0%, 100% { fill-opacity: 0.12; } 50% { fill-opacity: 0.55; } }
  @media (prefers-reduced-motion: reduce) { #fc-alerts polygon { animation: none; fill-opacity: 0.4; } }
  #timeline { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 4; background: var(--fc-panel);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 8px 10px; font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #timeline[hidden] { display: none; }
  #timeline .row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  #timeline .sp { flex: 1; }
  #timeline button.fc { white-space: nowrap; padding: 6px 9px; }
  #tt-ranges { display: flex; gap: 6px; }
  #timeline #tt-when { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #timeline #tt-when { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--fc-accent); }
  #tt-slider { width: 100%; accent-color: var(--fc-accent); }
  .traveling #zoom, .traveling #legend { bottom: calc(var(--fc-timeline-h, 84px) + 16px); }
  .traveling #alerts { display: none; }
  #dim { position: absolute; inset: 0; z-index: 4; background: #000; pointer-events: none; transition: opacity 1.2s; }
  #legend .bar { width: 150px; height: 8px; border-radius: 4px; margin: 4px 0 2px; }
  #legend .ends { display: flex; justify-content: space-between; color: var(--fc-text2); }
  #legend { max-width: calc(100% - 150px); box-sizing: border-box; }
  #legend .periods { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
  @container (max-width: 520px) {
    #legend { padding: 4px 7px; font-size: 11px; }
    #legend .bar { width: 110px; }
    #legend .periods button.fc { padding: 2px 6px; font-size: 11px; flex: none; }
    #legend .periods { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  }
  /* a map's legend under the plan, not over it */
  .mapping #stage { bottom: var(--fc-legend-h, 0px); }
  #legend .periods button.fc { padding: 3px 8px; font-size: 12px; }
  .mapping #light-field, .mapping #room-climate, .mapping #fc-sun, .mapping #fc-trail { display: none; }
  #fc-sun { mix-blend-mode: var(--fc-blend); }
  #fc-map-text text { fill: var(--fc-text); paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round; }
  /* a camera that saw someone: its fan red */
  .camera.detected .camera-fan { fill: #e53935 !important; fill-opacity: 0.3; stroke: #e53935; stroke-opacity: 0.9; animation: fc-cam 1.2s ease-in-out infinite; }
  .camera.detected .camera-mark { fill: #e53935; }
  @keyframes fc-cam { 50% { fill-opacity: 0.12; } }
  /* a lamp on in an empty room */
  .light.fc-forgotten use, .light.fc-forgotten ~ .bulb-shared { animation: fc-forgot 1.6s ease-in-out infinite; }
  @keyframes fc-forgot { 50% { opacity: 0.3; } }
  @media (prefers-reduced-motion: reduce) { .camera.detected .camera-fan, .light.fc-forgotten use, .light.fc-forgotten ~ .bulb-shared { animation: none; } }
  #alerts button.nudge { font-weight: 500; }
  /* the picture of a camera that saw someone */
  #campop { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 6; width: min(92%, 640px);
    background: var(--fc-solid); border: 1px solid var(--fc-line); border-radius: 12px; padding: 8px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #campop[hidden] { display: none; }
  #campop .bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  #campop .bar .t { flex: 1; font-weight: 600; }
  #campop .bar .t .seen { color: #e57373; font-weight: 500; margin-left: 6px; }
  #campop .pic { aspect-ratio: 16 / 9; background: #000; border-radius: 8px; overflow: hidden; cursor: pointer; }
  #campop .pic > * { width: 100%; height: 100%; object-fit: contain; display: block; }
  #fc-version { position: absolute; left: 50%; bottom: 4px; transform: translateX(-50%); z-index: 2; pointer-events: none;
    font: 10px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text2); opacity: 0.7; white-space: nowrap; }
  #fc-version[hidden] { display: none; }
  /* rules and live power */
  #fc-rules polygon { fill-opacity: 0.26; stroke-opacity: 0.85; stroke-width: 1.5; }
  .fc-rc { filter: drop-shadow(0 0 1.5px var(--fc-rc)) drop-shadow(0 0 5px var(--fc-rc)); }
  .fc-blink { animation: fc-blink 1.2s ease-in-out infinite; }
  @keyframes fc-blink { 50% { opacity: 0.2; } }
  @media (prefers-reduced-motion: reduce) { .fc-blink { animation: none; } }
  #fc-power text { fill: var(--fc-text); font-weight: 600; paint-order: stroke; stroke: var(--fc-halo); stroke-width: 3px; stroke-linejoin: round;
    font-family: var(--paper-font-body1_-_font-family, sans-serif); text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
  #fc-power-total { position: absolute; left: 8px; bottom: 8px; z-index: 2; padding: 4px 9px; border-radius: 14px; background: var(--fc-panel);
    border: 1px solid var(--fc-line); color: var(--fc-text); font: 600 12px var(--paper-font-body1_-_font-family, sans-serif); pointer-events: none; }
  #fc-power-total[hidden], #legend:not([hidden]) + #fc-power-total { display: none; }
  .traveling #fc-rules, .traveling #fc-power, .traveling #fc-power-total { display: none; }
  .traveling .fc-rc { filter: none; }
  .traveling .fc-blink { animation: none; }
  /* the lasso */
  #fc-lasso { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 3; overflow: visible; }
  #fc-lasso[hidden] { display: none; }
  #fc-lasso .l { fill: color-mix(in srgb, var(--fc-accent) 12%, transparent); stroke: var(--fc-accent); stroke-width: 2; stroke-dasharray: 6 4; }
  #fc-lasso .dots circle { fill: var(--fc-accent); stroke: var(--fc-solid); stroke-width: 2; }
  #lasso-btn.on { border-color: var(--fc-accent); color: var(--fc-accent); }
  #fc-lasso-bar { position: absolute; left: 50%; transform: translateX(-50%); bottom: 54px; z-index: 4; display: flex; align-items: center; gap: 6px;
    flex-wrap: wrap; justify-content: center; max-width: calc(100% - 16px); box-sizing: border-box; padding: 6px 8px; border-radius: 12px;
    background: var(--fc-solid); border: 1px solid var(--fc-line); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #fc-lasso-bar[hidden] { display: none; }
  /* a finger held on a device: a ring fills until the hold acts (red: it opens a door) */
  #fc-press { position: absolute; z-index: 6; width: 52px; height: 52px; margin: -26px 0 0 -26px; pointer-events: none; }
  #fc-press[hidden] { display: none; }
  #fc-press svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
  #fc-press circle { fill: none; stroke-width: 4; }
  #fc-press .bg { stroke: rgba(0, 0, 0, 0.35); }
  #fc-press .fg { stroke: var(--fc-accent, #ffc300); stroke-linecap: round; stroke-dasharray: 100; stroke-dashoffset: 100; }
  #fc-press.run .fg { transition: stroke-dashoffset var(--fc-press-ms, 400ms) linear; stroke-dashoffset: 0; }
  #fc-press.door .fg { stroke: #e57373; }
  #fc-press span { position: absolute; left: 50%; top: -22px; transform: translateX(-50%); white-space: nowrap; font-size: 12px;
    background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 2px 7px; }
  #fc-press span:empty { display: none; }
  #fc-press.door span { border-color: #e57373; }
  /* what a tap just switched, with an undo */
  #fc-undo { position: absolute; left: 50%; transform: translateX(-50%); bottom: 54px; z-index: 5; display: flex; align-items: center; gap: 10px;
    background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 10px; padding: 6px 6px 6px 12px;
    font-size: 13px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35); max-width: calc(100% - 24px); }
  #fc-undo[hidden] { display: none; }
  #fc-undo .m { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #fc-undo button[hidden] { display: none; }
  /* a mouse over a device: what a click and a hold do */
  #fc-tip { position: absolute; z-index: 6; pointer-events: none; white-space: nowrap; font-size: 12px; background: var(--fc-panel);
    color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 3px 8px; transform: translate(12px, 14px); }
  #fc-tip[hidden] { display: none; }
  #fc-lasso-bar .n { color: var(--fc-text2); padding: 0 4px; }
  #fc-lasso-bar .b { display: contents; }
  /* a marker's note */
  #fc-note { position: absolute; z-index: 5; max-width: min(80%, 280px); background: var(--fc-solid); color: var(--fc-text);
    border: 1px solid var(--fc-line); border-radius: 10px; padding: 7px 10px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); pointer-events: none; white-space: pre-line; }
  #fc-note[hidden] { display: none; }
  #fc-note .t { font-weight: 600; }
  #fc-note .t:empty { display: none; }
  #fc-note .n { color: var(--fc-text2); margin-top: 2px; }
  #fc-note .n:empty { display: none; }
  /* a room's window */
  #fc-room { position: absolute; inset: 0; z-index: 6; background: rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; }
  #fc-room[hidden] { display: none; }
  #fc-room .dlg { width: min(94%, 460px); max-height: 92%; overflow: auto; box-sizing: border-box; background: var(--fc-solid);
    border: 1px solid var(--fc-line); border-radius: 12px; padding: 10px 12px 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); color: var(--fc-text); }
  #fc-room .bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  #fc-room .bar .t { flex: 1; font-size: 16px; font-weight: 600; }
  #fc-room .sec { margin-top: 10px; }
  #fc-room .sec h4 { margin: 0 0 5px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fc-text2); }
  #fc-room .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  #fc-room .chip { border: 1px solid var(--fc-line); background: var(--fc-panel); color: var(--fc-text); border-radius: 18px; padding: 6px 11px;
    font: inherit; cursor: pointer; }
  #fc-room .chip.on { border-color: var(--fc-accent); color: var(--fc-accent); }
  #fc-room .chip.act { font-weight: 600; }
  #fc-room .cov { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
  #fc-room .cov .n { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #fc-room .cov .p { color: var(--fc-text2); font-variant-numeric: tabular-nums; min-width: 38px; text-align: right; }
  #fc-room .cov button.fc { padding: 4px 9px; }
  #fc-room .clim { display: flex; align-items: center; gap: 12px; }
  #fc-room .clim .v { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
  #fc-room .clim .h { color: var(--fc-text2); }
  #fc-room .clim svg { flex: 1; height: 38px; min-width: 0; }
  #fc-room .clim svg polyline { fill: none; stroke: var(--fc-accent); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
  #fc-room .pres { color: var(--fc-text2); }
  #fc-room .empty { color: var(--fc-text2); }
  /* widgets in the bar under the plan */
  #fc-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-top: 1px solid var(--fc-line); background: var(--fc-solid);
    font: 13px var(--paper-font-body1_-_font-family, sans-serif); }
  #fc-bar[hidden] { display: none; }
  .fc-chip { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 1px; padding: 5px 10px;
    min-height: 40px; box-sizing: border-box; border: 1px solid var(--fc-line); border-radius: 10px; background: var(--fc-panel);
    color: var(--fc-text); font: inherit; text-align: left; max-width: 100%; min-width: 0; }
  button.fc-chip { cursor: pointer; }
  button.fc-chip:hover { border-color: var(--fc-line-hi); }
  .fc-chip.on { border-color: var(--fc-accent); }
  .fc-chip .big, .fc-chip .sub { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .fc-chip .big { font-size: 15px; font-weight: 600; white-space: nowrap; }
  .fc-chip .sub { font-size: 11px; color: var(--fc-text2); white-space: nowrap; }
  /* a long text (a calendar line) wraps in the bar instead of running off the screen */
  #fc-bar .fc-chip .big { white-space: normal; overflow-wrap: anywhere; }
  .fc-chip .sub:empty { display: none; }
  .fc-chip.sub-below { flex-direction: column-reverse; }
  .fc-chip-clock .big { font-size: 20px; font-variant-numeric: tabular-nums; }
  /* widgets on the plan */
  .fc-w rect.bg { fill: var(--fc-panel); stroke: var(--fc-line); stroke-width: 1px; vector-effect: non-scaling-stroke; }
  .fc-w text { fill: var(--fc-text); font-family: system-ui, sans-serif; dominant-baseline: middle; }
  .fc-w text.sub { fill: var(--fc-text2); }
  .fc-w.act { cursor: pointer; }
  .fc-w.on rect.bg { stroke: var(--fc-accent); }
  .fc-w.on text.big { fill: var(--fc-accent); }
  /* marks on the time travel line; the label shows at once on hover */
  #tt-marks { position: relative; height: 12px; margin: 0 8px; }
  #tt-marks button.mk { position: absolute; top: 2px; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; border: 0; padding: 0; cursor: pointer; }
  #tt-marks button.mk.many { width: 11px; height: 11px; margin-left: -5.5px; top: 1px; }
  #tt-marks button.mk:hover::after { content: attr(data-label); position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
    white-space: nowrap; background: var(--fc-panel); color: var(--fc-text); border: 1px solid var(--fc-line); border-radius: 6px; padding: 3px 7px; font-size: 12px; pointer-events: none; }
</style>
<style id="palette">:host { ${this._paletteStyle()} }</style>
<ha-card>
  <div id="wrap" class="fc-${this._config.light}${this._config.readings ? "" : " no-readings"}">
    <div id="stage"></div>
    <div id="floors"></div>
    <div id="zoom"></div>
    <div id="layers"><button class="fc" id="set-btn">\u2699</button> <button class="fc" id="tt-btn">\u23F1</button> <button class="fc" id="layer-btn"></button><div id="layer-menu" hidden></div><div id="settings" hidden></div></div>
    <div id="timeline" hidden>
      <div class="row"><button class="fc" id="tt-play">\u25B6</button><button class="fc" id="tt-rec">\u{1F3AC}</button><span id="tt-when"></span>
        <span class="sp"></span><span id="tt-ranges"></span><button class="fc" id="tt-live"></button></div>
      <div id="tt-marks"></div>
      <input id="tt-slider" type="range" min="0" max="1000" step="1" value="1000">
    </div>
    <div id="fc-version"${this._config.showVersion ? "" : " hidden"}>${versionLabel()}</div>
    <svg id="fc-lasso" hidden><path class="l"/><g class="dots"></g></svg>
    <div id="fc-lasso-bar" hidden><span class="n"></span><span class="b"></span><button class="fc" data-l="x">\u2715</button></div>
    <div id="fc-note" hidden><div class="t"></div><div class="n"></div></div>
    <div id="fc-press" hidden><svg viewBox="0 0 52 52"><circle class="bg" cx="26" cy="26" r="22"/><circle class="fg" cx="26" cy="26" r="22" pathLength="100"/></svg><span></span></div>
    <div id="fc-undo" hidden><span class="m"></span><button class="fc" data-undo></button></div>
    <div id="fc-tip" hidden></div>
    <div id="fc-room" hidden><div class="dlg"><div class="bar"><span class="t"></span><button class="fc" id="fc-room-x">\u2715</button></div><div class="body"></div></div></div>
    <div id="campop" hidden><div class="bar"><span class="t"></span><button class="fc" id="campop-x">\u2715</button></div><div class="pic"></div></div>
    <div id="legend" hidden></div>
    <div id="fc-power-total" hidden></div>
    <div id="dim" hidden></div>
    <div id="alerts"></div>
  </div>
  <div id="fc-bar" hidden></div>
  <div id="info">${translate(navigator.language, "loading")}</div>
</ha-card>`;
    const zoom = this.shadowRoot.getElementById("zoom");
    if (this._config.showZoom) {
      for (const [label, key2, f] of [["+", "zoom_in", () => this._zoomBy(1.5)], ["\u2212", "zoom_out", () => this._zoomBy(1 / 1.5)], ["\u25A1", "fit", () => this._fit()]]) {
        const b = document.createElement("button");
        b.className = "fc";
        b.id = "zoom-" + key2.replace("zoom_", "").replace("_", "-");
        b.textContent = label;
        b.title = translate(navigator.language, key2);
        b.addEventListener("click", f);
        zoom.appendChild(b);
      }
    }
    if (this._config.lasso) {
      const b = document.createElement("button");
      b.className = "fc";
      b.id = "lasso-btn";
      b.textContent = "\u25CC";
      b.title = translate(navigator.language, "lasso_hint");
      b.addEventListener("click", () => this._lassoMode(!this._lassoArmed));
      zoom.appendChild(b);
    }
    this._renderLayers();
    this._wireTimeline();
    this._renderSettings();
    this.shadowRoot.getElementById("wrap").style.setProperty("--fc-light-k", String(this._pref("strength")));
    for (const k of LAYERS) this.shadowRoot.getElementById("wrap").classList.toggle("no-" + k.replace("_", "-"), !this._pref(k));
    this.shadowRoot.getElementById("set-btn").onclick = () => {
      const p2 = this.shadowRoot.getElementById("settings");
      p2.hidden = !p2.hidden;
      this.shadowRoot.getElementById("layer-menu").hidden = true;
    };
    this._attachGestures();
    if (!this._resize) this._resize = new ResizeObserver(() => {
      cancelAnimationFrame(this._layoutFrame);
      this._layoutFrame = requestAnimationFrame(() => this._layout());
    });
    this._resize.disconnect();
    this._resize.observe(this.shadowRoot.getElementById("wrap"));
  }
  // No plan (yet): what to do, with a button to the editor.
  _onboarding(problem) {
    const info = this.shadowRoot.getElementById("info");
    const lang = this._lang();
    info.style.display = "";
    info.classList.add("onb");
    this.shadowRoot.getElementById("wrap").hidden = true;
    info.innerHTML = "";
    const h = document.createElement("div");
    h.className = "onb-h";
    h.textContent = translate(lang, "onb_title");
    const p2 = document.createElement("p");
    p2.textContent = translate(lang, "onb_text");
    info.append(h, p2);
    if (problem) {
      const w = document.createElement("p");
      w.className = "onb-err";
      w.textContent = problem;
      info.appendChild(w);
    }
    const a = document.createElement("a");
    a.href = this._integration ? "/living-floorplan" : this._config.editorUrl;
    if (this._integration) a.addEventListener("click", (e) => {
      e.preventDefault();
      this._openEditor();
    });
    else {
      a.target = "_blank";
      a.rel = "noopener";
    }
    a.className = "onb-btn";
    a.textContent = translate(lang, "onb_button");
    info.appendChild(a);
  }
  async _load() {
    const cfg = this._config;
    if (!cfg.model) {
      if (this._hass) this._loadFromHa();
      else this._waitHa = true;
      return;
    }
    try {
      let model = cfg.model;
      if (typeof model === "string") {
        const r = await fetch(model, { cache: "no-cache" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        model = await r.json();
      }
      if (cfg !== this._config) return;
      this._useModel(model);
    } catch (e) {
      if (cfg !== this._config) return;
      this._onboarding(translate(this._lang(), "load_error", { url: typeof cfg.model === "string" ? cfg.model : "model", msg: e.message || e }));
    }
  }
  // The plan from the integration (living_floorplan): drawn, and drawn again after every save in its editor.
  async _loadFromHa() {
    const cfg = this._config, h = this._hass;
    let res;
    try {
      res = await h.callWS({ type: "living_floorplan/plan" });
      if (!res || !Array.isArray(res.versions)) throw new Error("not the floor plan integration");
    } catch (e) {
      if (cfg !== this._config) return;
      this._integration = false;
      this._onboarding(null);
      return;
    }
    if (cfg !== this._config) return;
    this._integration = true;
    if (!this._savedSub && h.connection && h.connection.subscribeEvents) {
      this._savedSub = h.connection.subscribeEvents(() => {
        if (!this._config.model) this._loadFromHa();
      }, "living_floorplan_saved");
    }
    if (res && res.model) {
      try {
        this._useModel(res.model);
      } catch (e) {
        this._onboarding(translate(this._lang(), "load_error", { url: "Home Assistant", msg: e.message || e }));
      }
    } else this._onboarding(null);
  }
  _useModel(model) {
    const info = this.shadowRoot.getElementById("info");
    this._model = safeIds(model);
    this._lowerAll();
    info.style.display = "none";
    info.classList.remove("onb");
    this.shadowRoot.getElementById("wrap").hidden = false;
    this._buildFloor();
  }
  // Into the editor: the integration's panel, else the editor page (with the card's model when it is a file).
  _openEditor() {
    if (this._integration) {
      history.pushState(null, "", "/living-floorplan");
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return;
    }
    const m = this._config.model;
    window.open(this._config.editorUrl + (typeof m === "string" ? "?model=" + encodeURIComponent(m) : ""), "_blank", "noopener");
  }
  // Every floor lowered once: alerts are watched on all floors, not only the one shown.
  _lowerAll() {
    const m = this._model;
    this._floorsLowered = [];
    if (!m || m.version !== 2) return;
    const ids = [null, ...(m.floors || []).map((f) => f.id)];
    for (const id of ids) {
      const lowered = lowerV2(floorModel(m, floorIndex(m, id)));
      const roomAt = roomIndex(lowered).roomAt;
      this._floorsLowered.push({ id, lowered, roomAt, sources: roomSources(lowered, roomAt) });
    }
    const ae = /* @__PURE__ */ new Set();
    for (const f of this._floorsLowered) {
      for (const d of f.lowered.devices || []) if (d.type === "icon" && d.entity) ae.add(d.entity);
      for (const w of f.lowered.windows || []) for (const c of w.contacts || []) if (c) ae.add(c);
    }
    if (this._config.forgotten) for (const f of this._floorsLowered) for (const src of Object.values(f.sources)) for (const id of [...src.lights, ...src.presence]) ae.add(id);
    if (this._config.cold) ae.add(this._config.cold.outside);
    for (const r of this._config.alerts) ae.add(r.entity);
    this._alertEntities = ae;
  }
  _floorsList() {
    const m = this._model;
    if (!m || m.version !== 2 || !(m.floors && m.floors.length)) return [];
    return [{ id: null, name: m.floor_name || translate(this._lang(), "ground_floor") }, ...m.floors.map((f) => ({ id: f.id, name: f.name || f.id }))];
  }
  // Closed doors stop the light: doors with a contact sensor reporting closed.
  _closedDoors(lowered, get) {
    const closed = /* @__PURE__ */ new Set();
    const h = this._hass;
    get = get || ((id) => h && h.states[id]);
    for (const d of lowered.doors || []) {
      if (!d.contact) {
        if (this._config.doors === "closed" && d.id) closed.add(d.id);
        continue;
      }
      const s = get(d.contact);
      if (s && (s.state === "off" || s.state === "closed")) closed.add(d.id);
    }
    return closed;
  }
  // ---- theme ----------------------------------------------------------------
  // "dark" / "light": the viewer's choice, else the config, else Home Assistant's dark mode
  _themeNow() {
    const t = this._pref ? this._pref("theme") : "auto";
    if (t === "dark" || t === "light") return t;
    const th = this._hass && this._hass.themes;
    return th && th.darkMode === false ? "light" : "dark";
  }
  _paletteStyle() {
    return paletteCss(this._themeNow(), this._config && this._config.accent);
  }
  _paintFn() {
    return this._themeBuilt === "light" ? paintLight : (c) => c;
  }
  // The look follows the theme: colours of the card at once, the plan redrawn when it changed.
  _syncPalette() {
    const pal = this.shadowRoot && this.shadowRoot.getElementById("palette");
    const css = ":host { " + this._paletteStyle() + " }";
    if (pal && pal.textContent !== css) pal.textContent = css;
  }
  _applyTheme(force = false) {
    this._syncPalette();
    if (this._model && this._svg && (force || this._themeNow() !== this._themeBuilt)) {
      this._buildFloor();
      return true;
    }
    return false;
  }
  // ---- cameras, heating ------------------------------------------------------
  // Cameras without a detection sensor in the model: the config's, else one found on the camera's device.
  _wireCameras() {
    const svg = this._svg;
    if (!svg) return;
    this._autoDetect = this._autoDetect || {};
    for (const g of svg.querySelectorAll("[data-entity-camera]")) {
      const cam = g.getAttribute("data-entity-camera");
      let id = this._config.cameraDetect[cam] || g.getAttribute("data-entity-detect");
      if (!id && this._hass) {
        id = detectSensorFor(cam, this._hass.entities, this._hass.states) || detectSensorFor(g.getAttribute("data-entity-camera-hq"), this._hass.entities, this._hass.states);
        if (id) this._autoDetect[cam] = id;
      }
      if (id) g.setAttribute("data-entity-detect", id);
    }
  }
  // Readings under icons (a thermostat's "21° → 21°", a plug's watts) kept off the walls: under the icon when there is
  // room, else to its right, its left or above it - whichever touches no wall on the screen (the plan may be turned).
  // Done again only when the texts' lengths, the floor or the turn change.
  _placeLabels() {
    const svg = this._svg;
    if (!svg) return;
    const texts = [...svg.querySelectorAll("text." + NAMES.deviceValue)].filter((t) => t.textContent && t.textContent !== "\u2014");
    const key2 = (this._turned ? "t" : "f") + (this._floor || "") + ":" + texts.map((t) => t.textContent.length).join(",");
    if (key2 === this._labelKey) return;
    this._labelKey = key2;
    const walls = [...svg.querySelectorAll("#walls-exterior path, #walls-interior path")];
    if (!walls.length || !svg.getBoundingClientRect().width) {
      this._labelKey = null;
      return;
    }
    const hits = (t) => {
      const r = t.getBoundingClientRect();
      if (!r.width) return 0;
      let n5 = 0;
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 2; j++) {
        const x = r.left + r.width * i / 6, y = r.top + r.height * (0.2 + 0.3 * j);
        for (const w of walls) {
          const m = w.getScreenCTM();
          if (m && w.isPointInFill(new DOMPoint(x, y).matrixTransform(m.inverse()))) {
            n5++;
            break;
          }
        }
      }
      return n5;
    };
    for (const t of texts) {
      if (t.dataset.fcX === void 0) {
        t.dataset.fcX = t.getAttribute("x");
        t.dataset.fcY = t.getAttribute("y");
      }
      const x = Number(t.dataset.fcX), y = Number(t.dataset.fcY) - 12;
      const spots = [[x, y + 12, "middle"], [x + 9, y + 3.5, "start"], [x - 9, y + 3.5, "end"], [x, y - 9, "middle"]];
      let best = null;
      for (const [sx, sy, a] of spots) {
        t.setAttribute("x", sx);
        t.setAttribute("y", sy);
        t.style.textAnchor = a;
        const h = hits(t);
        if (!best || h < best.h) best = { sx, sy, a, h };
        if (!h) break;
      }
      t.setAttribute("x", best.sx);
      t.setAttribute("y", best.sy);
      t.style.textAnchor = best.a;
    }
  }
  // Rooms the plan itself tints by heating (tint: {kind: heating}) follow the ⚙ switch too: off - put aside, on - back.
  _heatingTints() {
    const svg = this._svg;
    if (!svg) return;
    if (!this._config.roomHeating) {
      svg.querySelectorAll(`#rooms polygon[${NAMES.attrTintKind}="heating"]:not([data-fc-heat])`).forEach((el) => {
        el.setAttribute("data-fc-heat-off", el.getAttribute(NAMES.attrTintEntity) || "");
        el.removeAttribute(NAMES.attrTintEntity);
        el.removeAttribute(NAMES.attrTintKind);
        el.classList.remove(NAMES.isHeating);
        el.style.removeProperty("fill");
      });
    } else {
      svg.querySelectorAll("#rooms polygon[data-fc-heat-off]").forEach((el) => {
        el.setAttribute(NAMES.attrTintEntity, el.getAttribute("data-fc-heat-off"));
        el.setAttribute(NAMES.attrTintKind, "heating");
        el.removeAttribute("data-fc-heat-off");
      });
    }
  }
  // A room with a thermostat or a TRV on the plan, and no colour of its own, is tinted while it heats.
  _heatRooms(roomAt) {
    if (!this._config.roomHeating || !this._svg) return;
    for (const d of this._lowered.devices || []) {
      if (d.type !== "icon" || !["thermostat", "trv"].includes(d.kind) || !/^climate\./.test(d.entity || "")) continue;
      const room = d.room || (d.at ? roomAt(d.at[0], d.at[1]) : null);
      const poly = room && this._svg.querySelector("#rooms #room-" + CSS.escape(room));
      if (!poly || poly.hasAttribute(NAMES.attrTintEntity) || poly.classList.contains("unused")) continue;
      poly.setAttribute(NAMES.attrTintEntity, d.entity);
      poly.setAttribute(NAMES.attrTintKind, "heating");
      poly.setAttribute("data-fc-heat", "");
    }
  }
  // A camera's sensor going on: its picture pops up (tablet mode by default).
  _checkDetections() {
    const svg = this._svg;
    if (!svg || !this._hass) return;
    for (const g of svg.querySelectorAll("[data-entity-detect]")) {
      const id = g.getAttribute("data-entity-detect");
      if (!id) continue;
      const s = this._hass.states[id];
      const on = !!s && isMotion(s.state);
      const was = this._detState[id];
      this._detState[id] = on;
      if (on && was === false) this._cameraSeen(g);
    }
  }
  _cameraSeen(g) {
    const mode = this._config.cameraPopup;
    if (mode === "never" || mode === "kiosk" && !this._config.kiosk || this._travel) return;
    if (this._config.kiosk) this._touched();
    this._openPopup(g.getAttribute("data-entity-camera"), g.getAttribute("data-entity-camera-hq"), g.getAttribute(NAMES.attrName), g.getAttribute("data-entity-detect"));
  }
  _openPopup(cam, hq, name, detect) {
    const sr = this.shadowRoot, box = sr && sr.getElementById("campop");
    if (!box || !this._hass) return;
    this._closePopup();
    const lang = this._lang();
    const s = this._hass.states[cam];
    const title = box.querySelector(".t");
    title.textContent = name || s && s.attributes && s.attributes.friendly_name || cam;
    const seen = document.createElement("span");
    seen.className = "seen";
    seen.textContent = translate(lang, "cam_seen");
    title.appendChild(seen);
    const pic = box.querySelector(".pic");
    pic.innerHTML = "";
    if (customElements.get("ha-camera-stream") && s) {
      const st = document.createElement("ha-camera-stream");
      st.hass = this._hass;
      st.stateObj = s;
      st.muted = true;
      st.controls = false;
      pic.appendChild(st);
    } else {
      const img = document.createElement("img");
      img.alt = "";
      const load = () => {
        const cs = this._hass && this._hass.states[cam];
        const tok = cs && cs.attributes && cs.attributes.access_token;
        if (tok) img.src = "/api/camera_proxy/" + cam + "?token=" + encodeURIComponent(tok) + "&_=" + Date.now();
      };
      load();
      this._popImg = setInterval(load, 1e3);
      pic.appendChild(img);
    }
    pic.onclick = () => {
      this._closePopup();
      this._moreInfo(hq || cam);
    };
    const x = sr.getElementById("campop-x");
    x.onclick = () => this._closePopup();
    x.title = translate(lang, "close");
    box.hidden = false;
    const keep = this._config.popupSeconds * 1e3;
    this._popup = { cam, detect, until: Date.now() + keep };
    this._popTimer = setInterval(() => {
      const p2 = this._popup;
      if (!p2) return;
      const d = this._hass && this._hass.states[p2.detect];
      if (d && isMotion(d.state)) p2.until = Math.max(p2.until, Date.now() + keep);
      if (Date.now() > p2.until) this._closePopup();
    }, 1e3);
  }
  _closePopup() {
    if (this._popTimer) {
      clearInterval(this._popTimer);
      this._popTimer = null;
    }
    if (this._popImg) {
      clearInterval(this._popImg);
      this._popImg = null;
    }
    this._popup = null;
    const box = this.shadowRoot && this.shadowRoot.getElementById("campop");
    if (box) {
      box.hidden = true;
      box.querySelector(".pic").innerHTML = "";
    }
  }
  _buildFloor() {
    const m = this._model;
    if (!m) return;
    let floor = this._floor;
    if (m.version === 2 && floor && floorIndex(m, floor) < 0) floor = this._floor = null;
    this._themeBuilt = this._themeNow();
    this._syncPalette();
    let svgText = generateSvg(m, { floor: m.version === 2 ? floor : null });
    if (this._themeBuilt === "light") svgText = lightSvg(svgText);
    this._lowered = m.version === 2 ? lowerV2(floorModel(m, floorIndex(m, floor))) : null;
    const stage = this.shadowRoot.getElementById("stage");
    stage.innerHTML = svgText;
    const svg = this._svg = stage.querySelector("svg");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this._baseVB = svg.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    const st = (svg.getAttribute("data-start") || "").split(/[\s,]+/).map(Number);
    this._startVB = st.length === 4 && st.every(Number.isFinite) && st[2] > 0 && st[3] > 0 ? st : null;
    this._doorsKey = null;
    this._placeLightField();
    if (this._config.labels) svg.querySelector("#room-labels")?.removeAttribute("display");
    this._turned = null;
    this._labelKey = null;
    if (this._lowered) {
      const idx = roomIndex(this._lowered);
      this._rooms = idx.rooms;
      this._sources = roomSources(this._lowered, idx.roomAt);
      this._roomAt = idx.roomAt;
      this._heatingTints();
      this._heatRooms(idx.roomAt);
    } else {
      this._rooms = [];
      this._sources = {};
    }
    this._wireCameras();
    this._entities = entitiesOf(svg);
    for (const w of this._config.widgets) if (w.entity) this._entities.add(w.entity);
    this._mapCache = null;
    this._renderFloors();
    this._layout(true);
    this._sig = "";
    if (this._travel) this._showAt(this._sliderTime());
    else this._update();
  }
  // ---- per-viewer settings (⚙) ---------------------------------------------------
  _prefKey() {
    return "living-floorplan-card:" + (typeof this._config.model === "string" ? this._config.model : "inline");
  }
  _loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(this._prefKey()) || "{}") || {};
    } catch (e) {
      return {};
    }
  }
  _savePrefs() {
    try {
      localStorage.setItem(this._prefKey(), JSON.stringify(this._prefs));
    } catch (e) {
    }
  }
  _pref(k) {
    return this._prefs[k] !== void 0 ? this._prefs[k] : this._defaults[k];
  }
  _applyPrefs() {
    const c = this._config;
    c.light = this._pref("light") === "glow" ? "glow" : "realistic";
    c.sun = this._pref("sun") ? this._sunCfg : null;
    c.trail = !!this._pref("trail");
    c.labels = !!this._pref("labels");
    c.readings = this._pref("readings") !== false;
    c.roomHeating = !!this._pref("heating");
  }
  _renderSettings() {
    const sr = this.shadowRoot;
    const panel = sr.getElementById("settings");
    const lang = this._lang();
    const t = (k) => translate(lang, k);
    sr.getElementById("set-btn").title = t("settings");
    const check = (k) => `<label><input type="checkbox" data-k="${k}"${this._pref(k) ? " checked" : ""}> ${t("s_" + k)}</label>`;
    panel.innerHTML = `<div class="ttl">${t("settings")}</div>
      ${this._hass && this._hass.user && this._hass.user.is_admin ? `<button class="fc edit" data-edit>\u270E ${t("edit_plan")}</button>` : ""}
      <div class="seg"><span>${t("s_light")}</span><button class="fc${this._pref("light") !== "glow" ? " sel" : ""}" data-light="realistic">${t("s_realistic")}</button><button class="fc${this._pref("light") === "glow" ? " sel" : ""}" data-light="glow">${t("s_glow")}</button></div>
      <div class="seg"><span>${t("s_theme")}</span>${["auto", "dark", "light"].map((v) => `<button class="fc${this._pref("theme") === v ? " sel" : ""}" data-theme="${v}">${t("th_" + v)}</button>`).join("")}</div>
      <label class="strength"><span>${t("s_strength")} <b data-pct>${Math.round(this._pref("strength") * 100)} %</b></span><input type="range" min="0.15" max="1" step="0.01" data-strength value="${this._pref("strength")}"></label>
      ${check("sun")}${check("trail")}${check("labels")}${check("readings")}${check("heating")}
      <div class="sub">${t("s_layers")}</div>${LAYERS.map(check).join("")}
      <div class="foot"><span>${t("s_note")}</span><button class="fc" data-reset>${t("s_reset")}</button></div>`;
    const ed = panel.querySelector("[data-edit]");
    if (ed) ed.addEventListener("click", () => {
      panel.hidden = true;
      this._openEditor();
    });
    panel.querySelectorAll("input[data-k]").forEach((i) => i.addEventListener("change", () => this._setPref(i.dataset.k, i.checked)));
    panel.querySelectorAll("[data-light]").forEach((b) => b.addEventListener("click", () => this._setPref("light", b.dataset.light)));
    panel.querySelectorAll("[data-theme]").forEach((b) => b.addEventListener("click", () => this._setPref("theme", b.dataset.theme)));
    const st = panel.querySelector("[data-strength]");
    st.addEventListener("input", () => {
      sr.getElementById("wrap").style.setProperty("--fc-light-k", st.value);
      panel.querySelector("[data-pct]").textContent = Math.round(st.value * 100) + " %";
    });
    st.addEventListener("change", () => this._setPref("strength", Number(st.value)));
    panel.querySelector("[data-reset]").addEventListener("click", () => {
      this._prefs = {};
      this._savePrefs();
      this._afterPrefs();
    });
  }
  _setPref(k, v) {
    if (v === this._defaults[k] || k === "light" && v === (this._defaults.light || "realistic")) delete this._prefs[k];
    else this._prefs[k] = v;
    this._savePrefs();
    this._afterPrefs();
  }
  // Redraw what the settings touch.
  _afterPrefs() {
    this._applyPrefs();
    const sr = this.shadowRoot, svg = this._svg;
    const wrap = sr.getElementById("wrap");
    wrap.classList.toggle("fc-realistic", this._config.light === "realistic");
    wrap.classList.toggle("fc-glow", this._config.light === "glow");
    wrap.classList.toggle("no-readings", !this._config.readings);
    for (const k of LAYERS) wrap.classList.toggle("no-" + k.replace("_", "-"), !this._pref(k));
    wrap.style.setProperty("--fc-light-k", String(this._pref("strength")));
    this._renderSettings();
    if (!svg) return;
    if (this._config.light !== "realistic") svg.querySelectorAll("#light-field").forEach((el) => el.remove());
    this._doorsKey = null;
    const labels = svg.querySelector("#room-labels");
    if (labels) {
      if (this._config.labels) labels.removeAttribute("display");
      else labels.setAttribute("display", "none");
    }
    if (!this._config.sun) svg.querySelectorAll("#fc-sun").forEach((el) => el.remove());
    if (!this._config.trail) svg.querySelectorAll("#fc-trail").forEach((el) => el.remove());
    svg.querySelectorAll("[data-fc-heat]").forEach((el) => {
      el.removeAttribute(NAMES.attrTintEntity);
      el.removeAttribute(NAMES.attrTintKind);
      el.removeAttribute("data-fc-heat");
      el.classList.remove(NAMES.isHeating);
      el.style.removeProperty("fill");
      el.style.removeProperty("fill-opacity");
    });
    this._heatingTints();
    if (this._config.roomHeating && this._roomAt) this._heatRooms(this._roomAt);
    if (this._applyTheme()) return;
    this._sig = "";
    if (this._travel) this._showAt(this._sliderTime());
    else this._update();
  }
  // ---- the trail of movement ---------------------------------------------------
  _motionDevices() {
    return (this._lowered && this._lowered.devices || []).filter((d) => ["presence", "motion"].includes(d.type) && d.entity && d.at);
  }
  // Recent history of the motion sensors (live), refreshed every minute.
  async _fetchTrail() {
    const ids = this._motionDevices().map((d) => d.entity);
    if (!this._config.trail || !ids.length || !this._hass || this._travel) return;
    if (this._trailAt && Date.now() - this._trailAt < 55e3) return;
    this._trailAt = Date.now();
    const end = Date.now(), start = end - this._config.trailMs;
    try {
      const raw = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: ids,
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });
      this._trailRows = normalizeHistory(raw);
    } catch (e) {
      this._trailRows = {};
    }
    this._drawTrail();
  }
  // t: a moment of time travel, or now; rowsOf: history rows of an entity.
  _drawTrail(t, rowsOf) {
    const svg = this._svg;
    if (!svg || !this._config.trail) return;
    svg.querySelectorAll("#fc-trail").forEach((el) => el.remove());
    const devices = this._motionDevices();
    if (!devices.length) return;
    if (!rowsOf) {
      rowsOf = (id) => {
        const rows = ((this._trailRows || {})[id] || []).slice();
        const s = this._hass && this._hass.states[id];
        if (s) {
          const lc = Date.parse(s.last_changed || s.last_updated) || Date.now();
          if (!rows.length || rows[rows.length - 1].t < lc) rows.push({ t: lc, state: s.state });
        }
        return rows;
      };
    }
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = trailLayer(devices, rowsOf, t || Date.now(), this._config.trailMs);
    const lights = svg.querySelector("#lights");
    if (lights) lights.after(g.firstElementChild);
  }
  // Patches of sunlight on the floor for the moment t (now when live).
  _drawSun(t) {
    const svg = this._svg;
    if (!svg || !this._config.sun || !this._lowered || !this._hass || !this._hass.config) return;
    const { latitude, longitude } = this._hass.config;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    const sun = sunPosition(new Date(t || Date.now()), latitude, longitude);
    const idx = roomIndex(this._lowered);
    const patches = sunPatches(this._lowered, sun, {
      roomAt: idx.roomAt,
      offset: this._config.sun.offset,
      cmPerSvg: this._lowered.canvas && this._lowered.canvas.cm_per_svg || 1
    });
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const zones = new Map((this._lowered.zones || []).map((z) => [z.id, z.points]));
    const zoneOf = new Map((this._lowered.rooms || []).filter((r) => r.zone && zones.has(r.zone)).map((r) => [r.id, zones.get(r.zone)]));
    g.innerHTML = sunLayer(patches, idx.rooms.map((r) => zoneOf.has(r.id) ? { ...r, points: zoneOf.get(r.id) } : r));
    const layer = g.firstElementChild;
    const old = svg.querySelector("#fc-sun");
    if (old) old.replaceWith(layer);
    else {
      const before = svg.querySelector("#furniture") || svg.querySelector("#light-field") || svg.querySelector("#lights");
      if (before) before.parentNode.insertBefore(layer, before);
    }
  }
  _placeLightField(get) {
    if (this._config.light !== "realistic" || !this._lowered || !this._svg) return;
    const closed = this._closedDoors(this._lowered, get);
    const key2 = [...closed].sort().join(",");
    if (key2 === this._doorsKey) return;
    this._doorsKey = key2;
    const svg = this._svg;
    const old = svg.querySelector("#light-field");
    const lights = svg.querySelector("#lights");
    if (!lights) return;
    const tmp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    tmp.innerHTML = lightLayer(this._lowered, { closedDoors: closed });
    const layer = tmp.firstElementChild;
    if (old) old.replaceWith(layer);
    else lights.parentNode.insertBefore(layer, lights);
    this._sig = "";
  }
  _renderFloors() {
    const box = this.shadowRoot.getElementById("floors");
    box.innerHTML = "";
    const list = this._floorsList();
    if (!this._config.showFloors || list.length < 2) return;
    for (const f of list) {
      const b = document.createElement("button");
      b.className = "fc" + ((f.id || null) === (this._floor || null) ? " sel" : "");
      b.textContent = f.name;
      b.addEventListener("click", () => {
        if ((f.id || null) === (this._floor || null)) return;
        this._floor = f.id;
        this._buildFloor();
      });
      box.appendChild(b);
    }
  }
  // ---- size, turning and the view box -------------------------------------
  _layout(force = false) {
    const svg = this._svg;
    if (!svg) return;
    const wrap = this.shadowRoot.getElementById("wrap");
    const W2 = wrap.clientWidth || this.clientWidth || 400;
    const vb = this._startVB || this._baseVB;
    let turn = this._config.rotate === 90;
    if (this._config.rotate === "auto") {
      const H = this._config.height || Math.max(240, (window.innerHeight || 800) - 140);
      turn = shouldTurn(W2, H, vb[2], vb[3]);
    }
    if (turn !== this._turned || force) {
      this._turned = turn;
      this._applyTurn(turn);
      this._fit();
      this._enterMap();
    }
    const v = this._fullVB;
    let h = this._config.height || Math.round(W2 * v[3] / v[2]);
    if (!this._config.height) {
      const top = Math.max(0, wrap.getBoundingClientRect().top + (window.scrollY || 0));
      const bar = this.shadowRoot.getElementById("fc-bar");
      const barH = bar && !bar.hidden ? bar.offsetHeight : 0;
      const room = Math.round((window.innerHeight || 800) - Math.min(top, (window.innerHeight || 800) * 0.4) - 8 - barH);
      h = Math.min(h, Math.max(240, room));
    }
    const px = h + "px";
    if (wrap.style.height !== px) wrap.style.height = px;
  }
  _applyTurn(turn) {
    const svg = this._svg;
    svg.querySelectorAll("#fc-widgets").forEach((el) => el.remove());
    let g = svg.querySelector("#fc-turn");
    if (turn && !g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.id = "fc-turn";
      g.setAttribute("transform", "rotate(90)");
      for (const c of [...svg.childNodes]) if (c.nodeName !== "style" && c.nodeName !== "desc") g.appendChild(c);
      svg.appendChild(g);
    } else if (!turn && g) {
      for (const c of [...g.childNodes]) svg.appendChild(c);
      g.remove();
    }
    const textRot = -(this._lowered && this._lowered.canvas && this._lowered.canvas.rotate || 0);
    svg.querySelectorAll("[transform]").forEach((el) => {
      if (el.id === "fc-turn") return;
      if (el.dataset.fcTr === void 0) el.dataset.fcTr = el.getAttribute("transform");
      const tr = el.dataset.fcTr;
      const m = /^rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)$/.exec(tr);
      if (m && Math.abs(Number(m[1]) - textRot) < 0.01) {
        el.setAttribute("transform", turn ? `rotate(${Number(m[1]) - 90} ${m[2]} ${m[3]})` : tr);
      }
      const mv = el.classList.contains("cover-move") && /^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)$/.exec(tr);
      if (mv) el.setAttribute("transform", turn ? `translate(${mv[1]} ${mv[2]}) rotate(${Number(mv[3]) - 90})` : tr);
    });
    this._fullVB = turn ? turnedViewBox(this._baseVB) : this._baseVB.slice();
    this._homeVB = this._startVB ? turn ? turnedViewBox(this._startVB) : this._startVB.slice() : null;
    this._drawWidgets();
    this._drawPower();
  }
  // Widgets: at their per cent of the plan (turned with it), always upright, sized to the plan.
  _drawWidgets() {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-widgets").forEach((el) => el.remove());
    const list = this._config.widgets;
    this._renderBar();
    if (!list.some((w) => w.at) || !this._baseVB) return;
    const vb = this._baseVB, F = this._fullVB || vb;
    const u = Math.min(F[2], F[3]) / 34;
    const states = this._hass && this._hass.states || {};
    const lang = this._lang();
    const NS = "http://www.w3.org/2000/svg";
    const root = document.createElementNS(NS, "g");
    root.id = "fc-widgets";
    svg.appendChild(root);
    list.forEach((w, i) => {
      if (!w.at) return;
      const bx = vb[0] + vb[2] * w.at[0] / 100, by = vb[1] + vb[3] * w.at[1] / 100;
      const [x, y] = this._turned ? [-by, bx] : [bx, by];
      const g = document.createElementNS(NS, "g");
      const s = w.entity ? states[w.entity] : null;
      const on = w.type === "button" && s && ["on", "open", "playing", "home"].includes(s.state);
      g.setAttribute("class", "fc-w fc-w-" + w.type + (w.type !== "clock" ? " act" : "") + (on ? " on" : ""));
      g.setAttribute("data-w", String(i));
      g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      const [big, small] = widgetText(w, states, lang);
      const bg = document.createElementNS(NS, "rect");
      bg.setAttribute("class", "bg");
      g.appendChild(bg);
      const t1 = document.createElementNS(NS, "text");
      t1.setAttribute("class", "big");
      t1.setAttribute("font-size", String((w.type === "clock" ? 1.9 : 1) * u));
      t1.textContent = big;
      g.appendChild(t1);
      let t2 = null;
      if (small) {
        t2 = document.createElementNS(NS, "text");
        t2.setAttribute("class", "sub");
        t2.setAttribute("font-size", String(0.7 * u));
        t2.textContent = small;
        g.appendChild(t2);
      }
      root.appendChild(g);
      const pad = 0.5 * u;
      const h1 = (w.type === "clock" ? 1.9 : 1) * u, h2 = t2 ? 0.7 * u : 0;
      const smallFirst = w.type === "calendar" || w.type === "state";
      let w1 = 0, w2 = 0;
      try {
        w1 = t1.getComputedTextLength();
        if (t2) w2 = t2.getComputedTextLength();
      } catch (e) {
        w1 = big.length * 0.55 * h1;
      }
      const width = Math.max(w1, w2) + 2 * pad, height = h1 + h2 + (t2 ? 0.35 * u : 0) + 2 * pad;
      const y1 = smallFirst && t2 ? pad + h2 + 0.35 * u + h1 / 2 : pad + h1 / 2;
      t1.setAttribute("x", String(pad));
      t1.setAttribute("y", String(y1));
      if (t2) {
        t2.setAttribute("x", String(pad));
        t2.setAttribute("y", String(smallFirst ? pad + h2 / 2 : y1 + h1 / 2 + 0.35 * u + h2 / 2));
      }
      bg.setAttribute("x", "0");
      bg.setAttribute("y", "0");
      bg.setAttribute("rx", String(0.4 * u));
      bg.setAttribute("width", String(width));
      bg.setAttribute("height", String(height));
      g.setAttribute("transform", `translate(${(x - width / 2).toFixed(1)} ${(y - height / 2).toFixed(1)})`);
    });
  }
  // The bar under the plan: widgets without `at`. Built once, then only its texts change
  // (a button must stay the same node under a finger).
  _renderBar() {
    const bar = this.shadowRoot && this.shadowRoot.getElementById("fc-bar");
    if (!bar) return;
    const list = this._config.widgets.filter((w) => !w.at);
    bar.hidden = !list.length;
    const states = this._hass && this._hass.states || {};
    const lang = this._lang();
    if (bar.children.length !== list.length) {
      bar.innerHTML = "";
      for (const w of list) {
        const el = document.createElement(w.type === "clock" ? "div" : "button");
        el.className = "fc-chip fc-chip-" + w.type;
        el.innerHTML = '<span class="sub"></span><span class="big"></span>';
        if (w.type !== "clock") {
          let held = false, timer = null;
          el.addEventListener("pointerdown", () => {
            held = false;
            timer = setTimeout(() => {
              held = true;
              this._widgetAction(w, true);
            }, HOLD_MS);
          });
          for (const t of ["pointerup", "pointerleave", "pointercancel"]) el.addEventListener(t, () => clearTimeout(timer));
          el.addEventListener("click", () => {
            if (!held) this._widgetAction(w, false);
          });
        }
        bar.appendChild(el);
      }
    }
    list.forEach((w, i) => {
      const el = bar.children[i];
      const [big, small] = widgetText(w, states, lang);
      const s = w.entity ? states[w.entity] : null;
      el.classList.toggle("on", w.type === "button" && !!s && ["on", "open", "playing", "home"].includes(s.state));
      const b = el.querySelector(".big"), sm = el.querySelector(".sub");
      const top = w.type === "clock" ? "" : small, bottom = w.type === "clock" ? small : "";
      if (b.textContent !== big) b.textContent = big;
      if (sm.textContent !== (top || bottom)) sm.textContent = top || bottom;
      el.classList.toggle("sub-below", w.type === "clock");
    });
  }
  _widgetAt(clientX, clientY) {
    if (!this._svg) return null;
    for (const g of this._svg.querySelectorAll("#fc-widgets [data-w]")) {
      const r = g.getBoundingClientRect();
      if (clientX >= r.left - 4 && clientX <= r.right + 4 && clientY >= r.top - 4 && clientY <= r.bottom + 4) return this._config.widgets[Number(g.getAttribute("data-w"))];
    }
    return null;
  }
  _widgetAction(w, hold) {
    const a = hold ? w.hold : w.tap;
    if (a) {
      this._runAction(a, w.entity);
      return;
    }
    if (!w.entity || w.type === "clock") return;
    const domain = w.entity.split(".")[0];
    if (hold || w.type !== "button") {
      this._moreInfo(w.entity);
      return;
    }
    if (["scene", "script"].includes(domain)) this._hass.callService(domain, "turn_on", { entity_id: w.entity });
    else if (TOGGLE_DOMAINS.has(domain)) this._hass.callService(domain === "cover" ? "cover" : "homeassistant", "toggle", { entity_id: w.entity });
    else if (domain === "button" || domain === "input_button") this._hass.callService(domain, "press", { entity_id: w.entity });
    else this._moreInfo(w.entity);
  }
  // back to the start view (the editor's), else the whole plan
  _fit() {
    this._vb = this._homeView();
    this._applyVB();
  }
  _homeView() {
    const F = this._fullVB, H = this._homeVB;
    if (!H) return F.slice();
    const s = Math.max(H[2] / F[2], H[3] / F[3]);
    const keep = this._vb;
    this._vb = [H[0] + H[2] / 2 - F[2] * s / 2, H[1] + H[3] / 2 - F[3] * s / 2, F[2] * s, F[3] * s];
    this._clampVB();
    const v = this._vb;
    this._vb = keep;
    return v;
  }
  _applyVB() {
    if (this._picked) this._clearLasso();
    if (!this._svg || !this._vb) return;
    this._svg.setAttribute("viewBox", this._vb.map((v) => Math.round(v * 100) / 100).join(" "));
  }
  // keep the view inside the plan, between MIN_ZOOM (the plan in the middle) and MAX_ZOOM
  _clampVB() {
    const F = this._fullVB, v = this._vb;
    const s = Math.min(1 / MIN_ZOOM, Math.max(1 / MAX_ZOOM, v[2] / F[2]));
    v[2] = F[2] * s;
    v[3] = F[3] * s;
    if (s > 1) {
      v[0] = F[0] - (v[2] - F[2]) / 2;
      v[1] = F[1] - (v[3] - F[3]) / 2;
      return;
    }
    v[0] = Math.min(F[0] + F[2] - v[2], Math.max(F[0], v[0]));
    v[1] = Math.min(F[1] + F[3] - v[3], Math.max(F[1], v[1]));
  }
  // A point on the screen -> plan coordinates of the current view.
  _toPlan(clientX, clientY) {
    const r = this._svg.getBoundingClientRect();
    const v = this._vb;
    const s = Math.min(r.width / v[2], r.height / v[3]);
    const ox = r.left + (r.width - v[2] * s) / 2, oy = r.top + (r.height - v[3] * s) / 2;
    return [v[0] + (clientX - ox) / s, v[1] + (clientY - oy) / s, s];
  }
  _zoomAt(clientX, clientY, factor) {
    if (!this._vb) return;
    const [px, py] = this._toPlan(clientX, clientY);
    const v = this._vb;
    const nw = v[2] / factor, nh = v[3] / factor;
    this._vb = [px - (px - v[0]) * nw / v[2], py - (py - v[1]) * nh / v[3], nw, nh];
    this._clampVB();
    this._applyVB();
  }
  _zoomBy(f) {
    const r = this._svg && this._svg.getBoundingClientRect();
    if (r) this._zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  }
  // ---- gestures: pan, pinch, wheel, tap, hold ------------------------------
  _attachGestures() {
    const wrap = this.shadowRoot.getElementById("wrap");
    const pts3 = /* @__PURE__ */ new Map();
    let start = null, pinch = null, holdTimer = null, moved = false, lasso = null;
    const cancelHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      this._pressRing(null);
    };
    for (const t of ["pointerdown", "wheel", "keydown"]) wrap.addEventListener(t, () => this._touched(), { capture: true, passive: true });
    const onPanel = (e) => !!(e.target.closest && e.target.closest("button, input, label, select, #layers, #settings, #layer-menu, #timeline, #legend, #alerts, #campop, #zoom, #floors, #fc-room, #fc-lasso-bar"));
    wrap.addEventListener("pointerdown", (e) => {
      if (onPanel(e)) return;
      pts3.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts3.size === 1 && this._config.lasso && (this._lassoArmed || e.shiftKey)) {
        cancelHold();
        start = null;
        lasso = [[e.clientX, e.clientY]];
        try {
          wrap.setPointerCapture(e.pointerId);
        } catch (err) {
        }
        this._drawLasso(lasso, []);
        return;
      }
      lasso = null;
      if (pts3.size === 1) {
        start = { x: e.clientX, y: e.clientY, vb: this._vb && this._vb.slice(), t: Date.now() };
        moved = false;
        cancelHold();
        const hitNow = this._hit(e.clientX, e.clientY);
        const wait = hitNow && this._isLock(hitNow) ? 800 : HOLD_MS;
        this._tipHide();
        if (hitNow && !this._actionFor(hitNow, "hold")) this._pressRing(e.clientX, e.clientY, wait, this._isLock(hitNow) && this._config.lockAction === "hold");
        holdTimer = setTimeout(() => {
          holdTimer = null;
          this._pressRing(null);
          if (!moved && start && this._activate(start.x, start.y, true)) start = null;
          else if (start) start.held = true;
        }, wait);
      } else if (pts3.size === 2) {
        cancelHold();
        if (!this._vb) return;
        const [a, b] = [...pts3.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), vb: this._vb.slice() };
        start = null;
      }
    });
    wrap.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" && !e.buttons && !pts3.size) {
        this._tipAt(e.clientX, e.clientY, onPanel(e));
        return;
      }
      if (!pts3.has(e.pointerId)) return;
      pts3.set(e.pointerId, [e.clientX, e.clientY]);
      if (lasso) {
        const last = lasso[lasso.length - 1];
        if (Math.hypot(e.clientX - last[0], e.clientY - last[1]) >= 3) {
          lasso.push([e.clientX, e.clientY]);
          this._drawLasso(lasso, []);
        }
        return;
      }
      if (pts3.size === 2 && pinch) {
        const [a, b] = [...pts3.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this._vb = pinch.vb.slice();
        this._zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch.d);
        moved = true;
        return;
      }
      if (!start || !start.vb) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < DRAG_PX) return;
      moved = true;
      cancelHold();
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (err) {
      }
      const [, , s] = this._toPlan(e.clientX, e.clientY);
      this._vb = [start.vb[0] - dx / s, start.vb[1] - dy / s, start.vb[2], start.vb[3]];
      this._clampVB();
      this._applyVB();
    });
    const end = (e) => {
      if (lasso) {
        pts3.delete(e.pointerId);
        const poly = lasso;
        lasso = null;
        if (e.type === "pointerup") this._finishLasso(poly);
        else this._clearLasso();
        return;
      }
      const wasTap = start && !moved && !start.held && pts3.size === 1;
      pts3.delete(e.pointerId);
      if (pinch && pts3.size === 1) {
        const [p2] = [...pts3.values()];
        start = { x: p2[0], y: p2[1], vb: this._vb && this._vb.slice(), held: true };
        moved = true;
      }
      if (pts3.size < 2) pinch = null;
      cancelHold();
      if (wasTap && e.type === "pointerup") this._activate(start.x, start.y, false);
      if (!pts3.size) start = null;
    };
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointerleave", () => this._tipHide());
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("wheel", (e) => {
      if (!this._vb || onPanel(e)) return;
      e.preventDefault();
      this._zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    }, { passive: false });
    wrap.addEventListener("dblclick", (e) => {
      if (!onPanel(e) && !this._hit(e.clientX, e.clientY) && !this._widgetAt(e.clientX, e.clientY)) this._fit();
    });
  }
  // The device under a finger: the nearest element with an entity within HIT_PX.
  _hit(clientX, clientY) {
    if (!this._svg) return null;
    let best = null;
    this._svg.querySelectorAll("[data-entity]").forEach((el) => {
      if (el.closest("#rooms")) return;
      const r = coreRect(el);
      if (!r.width && !r.height) return;
      const dx = Math.max(r.left - clientX, 0, clientX - r.right);
      const dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      const area = r.width * r.height;
      if (d <= HIT_PX && (!best || d < best.d - 0.5 || Math.abs(d - best.d) <= 0.5 && area < best.area)) best = { el, d, area };
    });
    this._svg.querySelectorAll(".bulb-shared").forEach((el) => {
      const circuit = el.parentNode && el.parentNode.querySelector("[data-entity]");
      if (!circuit) return;
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - clientX, 0, clientX - r.right), dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d <= HIT_PX && (!best || d < best.d - 0.5)) best = { el: circuit, d, area: r.width * r.height };
    });
    let camBest = null;
    for (const g of this._svg.querySelectorAll("[data-entity-camera]")) {
      const mark = g.querySelector("." + NAMES.cameraMark);
      if (!mark) continue;
      const r = mark.getBoundingClientRect();
      const d = Math.max(0, Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) - r.width / 2);
      if (d <= HIT_PX && (!camBest || d < camBest.d)) camBest = { g, d };
    }
    const camId = (g) => g.getAttribute("data-entity-camera-hq") || g.getAttribute("data-entity-camera");
    if (camBest && (!best || camBest.d < best.d)) return camId(camBest.g);
    if (best && best.d === 0) return best.el.getAttribute("data-entity");
    for (const el of this._svg.querySelectorAll("#room-climate [data-temp]")) {
      const r = el.getBoundingClientRect();
      if (r.width && clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return el.getAttribute("data-temp");
    }
    for (const g of this._svg.querySelectorAll("[data-entity-camera]")) {
      const fan = g.querySelector("." + NAMES.cameraFan);
      try {
        const m = fan && fan.getScreenCTM();
        if (m && fan.isPointInFill(new DOMPoint(clientX, clientY).matrixTransform(m.inverse()))) return camId(g);
      } catch (e) {
      }
    }
    if (best) return best.el.getAttribute("data-entity");
    for (const el of this._svg.querySelectorAll("#room-climate [data-temp]")) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const dx = Math.max(r.left - clientX, 0, clientX - r.right), dy = Math.max(r.top - clientY, 0, clientY - r.bottom);
      if (Math.hypot(dx, dy) <= 6) return el.getAttribute("data-temp");
    }
    return null;
  }
  // The chandelier a circuit belongs to: [small, large] entities (the editor's circuit_small / circuit_large).
  _fixtureOf(id) {
    for (const l of this._lowered && this._lowered.lights || []) {
      if (l.type !== "fixture" || !(l.circuits || []).some((c) => c.entity === id)) continue;
      const [large, small] = l.circuits.map((c) => c.entity);
      return small && large ? [small, large] : null;
    }
    return null;
  }
  // A chandelier's dialog title: its name from the editor, else the common start of its circuits' names
  // ("Salon lampa x1" + "Salon lampa x3" -> "Salon lampa", circuits "x1" / "x3"), else both names
  _fixtureTitle(id, ids) {
    const l = (this._lowered && this._lowered.lights || []).find((f) => f.type === "fixture" && (f.circuits || []).some((c) => c.entity === id));
    const names = ids.map((e) => {
      const st = this._hass.states[e];
      return st && st.attributes.friendly_name || e;
    });
    const words = names.map((n5) => n5.split(/\s+/));
    let k = 0;
    while (k < words[0].length && words.every((w) => k < w.length - 1 && w[k] === words[0][k])) k++;
    const labels = k ? words.map((w) => w.slice(k).join(" ")) : void 0;
    const name = l && l.name || (k ? words[0].slice(0, k).join(" ") : names.join(" / "));
    return { name, ...labels ? { labels } : {} };
  }
  // A cover just tapped: its arrow at once (a toggle opens a closed one, closes an open one, stops a moving one),
  // until the controller reports it moving or a few seconds pass
  _coverTapped(id) {
    const s = this._hass.states[id];
    if (!s || !this._svg) return;
    const moving = s.state === "opening" || s.state === "closing";
    const pos = s.attributes && s.attributes.current_position;
    const dir = moving ? null : (typeof pos === "number" ? pos > 0 : s.state === "open") ? "down" : "up";
    for (const el of this._svg.querySelectorAll(`.cover[data-entity="${CSS.escape(id)}"]`)) {
      if (dir) Object.assign(el.dataset, { move: dir, moveAt: String(Date.now()), moveFrom: s.state });
      else {
        delete el.dataset.move;
        delete el.dataset.moveFrom;
      }
      el.classList.toggle("moving-up", dir === "up");
      el.classList.toggle("moving-down", dir === "down");
    }
  }
  // A lock drawn on the plan (its element carries the lock class).
  _isLock(id) {
    return !!(this._svg && this._svg.querySelector(`.${NAMES.lock}[data-entity="${CSS.escape(id)}"]`));
  }
  _openLock(id) {
    const domain = id.split(".")[0];
    if (domain === "lock") this._hass.callService("lock", "open", { entity_id: id });
    else if (domain === "cover") this._hass.callService("cover", "open_cover", { entity_id: id });
    else this._moreInfo(id);
  }
  // ---- what a gesture will do: the ring of a hold, the hint of a mouse, the undo of a tap ----
  // x, y: the finger (null: hide); ms: the hold's time; door: the hold opens a door strike
  _pressRing(x, y, ms, door) {
    const el = this.shadowRoot && this.shadowRoot.getElementById("fc-press");
    if (!el) return;
    clearTimeout(this._pressT);
    if (x === null) {
      el.hidden = true;
      el.classList.remove("run");
      return;
    }
    this._pressT = setTimeout(() => {
      const r = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
      el.style.left = x - r.left + "px";
      el.style.top = y - r.top + "px";
      el.style.setProperty("--fc-press-ms", Math.max(80, ms - 120) + "ms");
      el.classList.toggle("door", !!door);
      el.querySelector("span").textContent = door ? translate(this._lang(), "door_opening") : "";
      el.classList.remove("run");
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add("run");
    }, 120);
  }
  // "Click: turn on · hold: statistics" next to the mouse, for what is under it
  _gestureHint(id) {
    const t = (k) => translate(this._lang(), k), st = this._hass && this._hass.states[id];
    if (!st) return "";
    const domain = id.split(".")[0];
    const own = this._actionFor(id, "tap");
    const holdWord = this._isLock(id) && this._config.lockAction === "hold" ? t("g_door") : this._config.hold === "insights" && window.entityInsights ? t("g_stats") : t("g_info");
    const inRack = this._svg && this._svg.querySelector(`.rack-item[data-entity="${CSS.escape(id)}"]`);
    let tap = t("g_info");
    if (own) tap = "\u2026";
    else if (this._isLock(id)) tap = t("g_info");
    else if (this._fixtureOf(id)) {
      const [s, l] = this._fixtureOf(id);
      tap = [s, l].some((e) => this._hass.states[e] && this._hass.states[e].state === "on") ? t("g_off") : t("g_on");
    } else if (TAP_TOGGLE.has(domain) && !inRack) tap = domain === "cover" ? t({ u_opening: "g_open", u_closing: "g_close", u_stopped: "g_stop" }[coverTapWord(st)]) : st.state === "on" ? t("g_off") : t("g_on");
    return `${t("g_click")}: ${tap} \xB7 ${t("g_hold")}: ${holdWord}`;
  }
  _tipAt(x, y, overPanel) {
    const now = Date.now();
    if (this._tipT && now - this._tipT < 60) return;
    this._tipT = now;
    const tip = this.shadowRoot.getElementById("fc-tip");
    const id = !overPanel && this._hass && !this._travel ? this._hit(x, y) : null;
    const text = id ? this._gestureHint(id) : "";
    if (!text) {
      tip.hidden = true;
      return;
    }
    const r = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    tip.textContent = text;
    tip.hidden = false;
    const left = Math.min(x - r.left, r.width - tip.offsetWidth - 16);
    tip.style.left = Math.max(0, left) + "px";
    tip.style.top = y - r.top + "px";
  }
  _tipHide() {
    const tip = this.shadowRoot && this.shadowRoot.getElementById("fc-tip");
    if (tip) tip.hidden = true;
  }
  // A message at the bottom for a few seconds; with undo: the states before the tap come back
  _toast(text, undo) {
    const box = this.shadowRoot.getElementById("fc-undo");
    box.querySelector(".m").textContent = text;
    const b = box.querySelector("[data-undo]");
    b.textContent = translate(this._lang(), "undo");
    b.hidden = !undo;
    b.onclick = () => {
      box.hidden = true;
      if (undo) undo();
    };
    box.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      box.hidden = true;
    }, undo ? 6e3 : 3e3);
  }
  _undoable(ids, name, word3) {
    const prev = ids.map((e) => this._hass.states[e]).filter(Boolean).map((s) => ({ id: s.entity_id, state: s.state, a: { ...s.attributes } }));
    this._toast(`${name} \u2014 ${translate(this._lang(), word3)}`, () => {
      for (const p2 of prev) {
        const domain = p2.id.split(".")[0];
        if (domain === "cover") {
          if (typeof p2.a.current_position === "number") this._hass.callService("cover", "set_cover_position", { entity_id: p2.id, position: p2.a.current_position });
          else this._hass.callService("cover", p2.state === "closed" ? "close_cover" : "open_cover", { entity_id: p2.id });
        } else if (p2.state === "on") this._hass.callService("light", "turn_on", { entity_id: p2.id, ...typeof p2.a.brightness === "number" ? { brightness: p2.a.brightness } : {} });
        else this._hass.callService(domain === "light" ? "light" : "homeassistant", "turn_off", { entity_id: p2.id });
      }
    });
  }
  // -> true when a device was hit
  _activate(clientX, clientY, hold) {
    const wd = this._hass && this._widgetAt(clientX, clientY);
    if (wd) {
      const now = Date.now();
      if (!hold && this._lastToggle && this._lastToggle.id === "w" + this._config.widgets.indexOf(wd) && now - this._lastToggle.t < 400) return true;
      if (!hold) this._lastToggle = { id: "w" + this._config.widgets.indexOf(wd), t: now };
      this._widgetAction(wd, hold);
      return true;
    }
    if (this._picked) {
      this._clearLasso();
      return true;
    }
    const mk = this._markerAt(clientX, clientY);
    if (mk) {
      this._showNote(mk, clientX, clientY);
      return true;
    }
    this._hideNote();
    const id = this._hit(clientX, clientY);
    if (!id && !hold && this._hass && this._config.roomTap === "dialog") {
      const room = this._roomAtPoint(clientX, clientY);
      if (room) {
        this._openRoom(room);
        return true;
      }
    }
    if (!id || !this._hass) return false;
    const domain = id.split(".")[0];
    const own = this._actionFor(id, hold ? "hold" : "tap");
    if (own) {
      const now = Date.now();
      if (!hold && this._lastToggle && this._lastToggle.id === id && now - this._lastToggle.t < 400) return true;
      if (!hold) this._lastToggle = { id, t: now };
      this._runAction(own, id);
      return true;
    }
    if (this._isLock(id)) {
      if (hold && this._config.lockAction === "hold") {
        this._openLock(id);
        this._toast(translate(this._lang(), "door_open"));
      } else this._moreInfo(id);
      return true;
    }
    const fx = !hold && this._fixtureOf(id);
    if (fx) {
      const now = Date.now();
      if (this._lastToggle && this._lastToggle.id === fx.join() && now - this._lastToggle.t < 400) return true;
      this._lastToggle = { id: fx.join(), t: now };
      const on = (e) => this._hass.states[e] && this._hass.states[e].state === "on";
      const [small, large] = fx;
      this._undoable(fx, this._fixtureTitle(id, fx).name, !on(small) && !on(large) ? "u_on" : this._config.fixtureTap === "cycle" && on(small) && !on(large) ? "u_on" : "u_off");
      if (!on(small) && !on(large)) this._hass.callService("light", "turn_on", { entity_id: small });
      else if (this._config.fixtureTap === "cycle" && on(small) && !on(large)) this._hass.callService("light", "turn_on", { entity_id: large });
      else this._hass.callService("light", "turn_off", { entity_id: [small, large] });
      return true;
    }
    if (hold) {
      if (this._config.hold === "insights" && window.entityInsights && typeof window.entityInsights.open === "function") {
        const fx2 = this._fixtureOf(id), ids = fx2 || [id];
        const watts2 = ids.map((e) => {
          const w = this._svg && this._svg.querySelector(`.light[data-entity="${CSS.escape(e)}"]`);
          return w && w.getAttribute("data-watts") !== null ? Number(w.getAttribute("data-watts")) : NaN;
        });
        const onPlan = this._svg ? [...new Set([...this._svg.querySelectorAll(`[data-entity^="${id.split(".")[0]}."]`)].map((e) => e.getAttribute("data-entity")))] : [];
        window.entityInsights.open({
          entities: ids,
          ...fx2 ? this._fixtureTitle(id, fx2) : {},
          rank_with: onPlan.length > 1 ? onPlan : void 0,
          watts: watts2.every(Number.isFinite) ? watts2 : void 0,
          price: this._config.price || void 0
        }, this._hass);
      } else this._moreInfo(id);
      return true;
    }
    const inRack = this._svg && this._svg.querySelector(`.rack-item[data-entity="${CSS.escape(id)}"]`);
    if (TAP_TOGGLE.has(domain) && this._hass.states[id] && !inRack) {
      const now = Date.now();
      if (this._lastToggle && this._lastToggle.id === id && now - this._lastToggle.t < 400) return true;
      this._lastToggle = { id, t: now };
      const st = this._hass.states[id];
      this._undoable([id], st.attributes.friendly_name || id, domain === "cover" ? coverTapWord(st) : st.state === "on" ? "u_off" : "u_on");
      this._hass.callService(domain === "cover" ? "cover" : "homeassistant", "toggle", { entity_id: id });
      if (domain === "cover") this._coverTapped(id);
    } else this._moreInfo(id);
    return true;
  }
  // ---- the lasso: switch everything in a drawn outline ---------------------------------
  _lassoMode(on) {
    this._lassoArmed = !!on;
    const b = this.shadowRoot.getElementById("lasso-btn");
    if (b) b.classList.toggle("on", this._lassoArmed);
    if (!on && !(this._picked && this._picked.length)) this._clearLasso();
  }
  // the outline (screen points) and the picked devices' dots, over the plan
  _drawLasso(poly, dots) {
    const svg = this.shadowRoot.getElementById("fc-lasso"), host = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    svg.hidden = false;
    const rel = (p2) => `${(p2[0] - host.left).toFixed(1)},${(p2[1] - host.top).toFixed(1)}`;
    svg.querySelector(".l").setAttribute("d", poly.length > 1 ? "M" + poly.map(rel).join(" L") + (dots.length ? " Z" : "") : "");
    svg.querySelector(".dots").innerHTML = dots.map((p2) => `<circle cx="${(p2[0] - host.left).toFixed(1)}" cy="${(p2[1] - host.top).toFixed(1)}" r="5"/>`).join("");
  }
  _clearLasso() {
    this._picked = null;
    const sr = this.shadowRoot;
    if (!sr || !sr.getElementById("fc-lasso")) return;
    sr.getElementById("fc-lasso").hidden = true;
    sr.getElementById("fc-lasso-bar").hidden = true;
  }
  // The lights and covers whose middle is inside the outline (screen points).
  _lassoPick(poly) {
    const inside2 = (x, y) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    const out = /* @__PURE__ */ new Map();
    for (const el of this._svg.querySelectorAll("[data-entity]")) {
      const id = el.getAttribute("data-entity");
      if (!id || out.has(id) || el.closest("#rooms, #controls, #notes") || el.classList.contains("rack-item")) continue;
      const domain = id.split(".")[0];
      const kind = el.classList.contains("light") || ["light", "switch"].includes(domain) ? "light" : domain === "cover" ? "cover" : null;
      if (!kind) continue;
      const r = coreRect(el);
      if (!r.width && !r.height) continue;
      const c = [r.left + r.width / 2, r.top + r.height / 2];
      if (inside2(c[0], c[1])) out.set(id, { id, kind, at: c });
    }
    return [...out.values()];
  }
  _finishLasso(poly) {
    let span = 0;
    for (let i = 1; i < poly.length; i++) span += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    if (span < 30 || !this._svg) {
      this._clearLasso();
      return;
    }
    const picked = this._lassoPick(poly);
    this._lassoMode(false);
    this._picked = picked;
    this._drawLasso(poly, picked.map((p2) => p2.at));
    const sr = this.shadowRoot, bar = sr.getElementById("fc-lasso-bar"), lang = this._lang();
    const lights = picked.filter((p2) => p2.kind === "light").map((p2) => p2.id), covers = picked.filter((p2) => p2.kind === "cover").map((p2) => p2.id);
    bar.querySelector(".n").textContent = picked.length ? translate(lang, "lasso_count", { l: lights.length, c: covers.length }) : translate(lang, "lasso_none");
    const btn = (key2, label) => `<button class="fc" data-l="${key2}">${label}</button>`;
    bar.querySelector(".b").innerHTML = (lights.length ? btn("on", translate(lang, "lasso_on")) + btn("off", translate(lang, "lasso_off")) : "") + (covers.length ? btn("up", "\u25B2") + btn("down", "\u25BC") : "");
    bar.hidden = false;
    bar.onclick = (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b) return;
      const call = (d, sv, ids) => ids.length && this._hass && this._hass.callService(d, sv, { entity_id: ids });
      switch (b.dataset.l) {
        case "on":
          call("homeassistant", "turn_on", lights);
          break;
        case "off":
          call("homeassistant", "turn_off", lights);
          break;
        case "up":
          call("cover", "open_cover", covers);
          return;
        // covers take a while: the selection stays for a stop or the other way
        case "down":
          call("cover", "close_cover", covers);
          return;
      }
      this._clearLasso();
    };
  }
  // ---- notes: a marker's bubble -------------------------------------------------------
  // The marker pin under a point (only markers without an entity: those are devices), or null.
  _markerAt(clientX, clientY) {
    if (!this._svg) return null;
    let best = null;
    for (const g of this._svg.querySelectorAll(".note-marker:not([data-entity])")) {
      const pin = g.querySelector(".note-pin");
      if (!pin) continue;
      const r = pin.getBoundingClientRect();
      const d = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2)) - r.width / 2;
      if (d <= 6 && (!best || d < best.d)) best = { g, d };
    }
    return best && best.g;
  }
  _showNote(g, clientX, clientY) {
    const box = this.shadowRoot.getElementById("fc-note"), host = this.shadowRoot.getElementById("wrap").getBoundingClientRect();
    const title = g.getAttribute("data-title") || "", note = g.getAttribute("data-note") || "";
    if (!title && !note) {
      this._hideNote();
      return;
    }
    box.querySelector(".t").textContent = title;
    box.querySelector(".n").textContent = note;
    box.hidden = false;
    const w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = Math.max(4, Math.min(host.width - w - 4, clientX - host.left - w / 2)) + "px";
    box.style.top = Math.max(4, clientY - host.top - h - 14 < 4 ? clientY - host.top + 16 : clientY - host.top - h - 14) + "px";
    clearTimeout(this._noteTimer);
    this._noteTimer = setTimeout(() => this._hideNote(), 8e3);
  }
  _hideNote() {
    const box = this.shadowRoot && this.shadowRoot.getElementById("fc-note");
    if (box) box.hidden = true;
    clearTimeout(this._noteTimer);
  }
  // ---- a room's window ----------------------------------------------------------
  // The room under a point of the screen (its floor polygon), or null.
  _roomAtPoint(clientX, clientY) {
    if (!this._svg) return null;
    for (const poly of this._svg.querySelectorAll("#rooms polygon[id^='room-']")) {
      if (poly.classList.contains("unused")) continue;
      try {
        const m = poly.getScreenCTM();
        if (m && poly.isPointInFill(new DOMPoint(clientX, clientY).matrixTransform(m.inverse()))) return poly.id.slice(5);
      } catch (e) {
      }
    }
    return null;
  }
  // What a room has on the plan: lights, covers, climate sensors, presence, other devices.
  _roomContents(roomId) {
    const L = this._lowered, idx = roomIndex(L), src = roomSources(L, idx.roomAt)[roomId] || { lights: [], presence: [], temperature: [], humidity: [] };
    const winRoom = new Map((L.windows || []).map((w) => [w.id, windowRoom(w, idx.roomAt)]));
    const covers = (L.covers || []).filter((c) => c.entity && winRoom.get(c.window) === roomId).map((c) => c.entity);
    const devices = (L.devices || []).filter((d) => {
      if (!d.entity || ["presence", "motion"].includes(d.type)) return false;
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      return (d.room || (at ? idx.roomAt(at[0], at[1]) : null)) === roomId;
    }).map((d) => d.entity);
    const room = (L.rooms || []).find((r) => r.id === roomId) || { id: roomId };
    return {
      name: room.name || roomId,
      lights: [...new Set(src.lights)],
      covers: [...new Set(covers)],
      temperature: src.temperature[0],
      humidity: src.humidity[0],
      presence: src.presence,
      devices: [...new Set(devices)]
    };
  }
  _openRoom(roomId) {
    this._roomOpen = { id: roomId, c: this._roomContents(roomId) };
    const box = this.shadowRoot.getElementById("fc-room");
    box.hidden = false;
    box.onclick = (e) => {
      if (e.target === box) this._closeRoom();
    };
    this.shadowRoot.getElementById("fc-room-x").onclick = () => this._closeRoom();
    this._renderRoom(true);
    this._roomSpark();
  }
  _closeRoom() {
    this._roomOpen = null;
    const box = this.shadowRoot && this.shadowRoot.getElementById("fc-room");
    if (box) {
      box.hidden = true;
      box.querySelector(".body").innerHTML = "";
    }
  }
  // build = true: the whole window; false: only the states (the buttons stay the same nodes under a finger)
  _renderRoom(build) {
    const r = this._roomOpen, sr = this.shadowRoot;
    if (!r || !this._hass) return;
    const st = this._hass.states, lang = this._lang(), t = (k, v) => translate(lang, k, v);
    const name = (id) => this._shortName(id);
    const c = r.c, body = sr.querySelector("#fc-room .body");
    sr.querySelector("#fc-room .t").textContent = c.name;
    const num3 = (id, d) => {
      const s = st[id];
      const v = s && Number(s.state);
      return s && s.state !== "" && Number.isFinite(v) ? v.toLocaleString(lang, { maximumFractionDigits: d }) : null;
    };
    if (build) {
      const esc5 = (v) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      let h = "";
      if (c.temperature || c.humidity) h += `<div class="sec"><h4>${t("r_climate")}</h4><div class="clim" data-more="${esc5(c.temperature || c.humidity)}"><span class="v"></span><span class="h"></span><svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points=""/></svg></div></div>`;
      if (c.presence.length) h += `<div class="sec pres"></div>`;
      if (c.lights.length) h += `<div class="sec"><h4>${t("r_lights")}</h4><div class="chips">${c.lights.map((id) => `<button class="chip" data-light="${esc5(id)}">${esc5(name(id))}</button>`).join("")}
        ${c.lights.length > 1 ? `<button class="chip act" data-all-off>${t("r_all_off")}</button>` : ""}</div></div>`;
      if (c.covers.length) h += `<div class="sec"><h4>${t("r_covers")}</h4>${c.covers.map((id) => `<div class="cov" data-cover="${esc5(id)}"><span class="n">${esc5(name(id))}</span><span class="p"></span><button class="fc" data-cmd="open_cover">\u25B2</button><button class="fc" data-cmd="stop_cover">\u25A0</button><button class="fc" data-cmd="close_cover">\u25BC</button></div>`).join("")}
        ${c.covers.length > 1 ? `<div class="chips"><button class="chip act" data-all="open_cover">\u25B2 ${t("r_all_up")}</button><button class="chip act" data-all="close_cover">\u25BC ${t("r_all_down")}</button></div>` : ""}</div>`;
      if (c.devices.length) h += `<div class="sec"><h4>${t("r_devices")}</h4><div class="chips">${c.devices.map((id) => `<button class="chip" data-more="${esc5(id)}">${esc5(name(id))}</button>`).join("")}</div></div>`;
      if (!h) h = `<div class="empty">${t("r_nothing")}</div>`;
      body.innerHTML = h;
      const call = (d, sv, ids) => this._hass.callService(d, sv, { entity_id: ids });
      body.querySelectorAll("[data-light]").forEach((b) => {
        b.onclick = () => call("homeassistant", "toggle", b.dataset.light);
      });
      const off = body.querySelector("[data-all-off]");
      if (off) off.onclick = () => call("homeassistant", "turn_off", c.lights);
      body.querySelectorAll(".cov button[data-cmd]").forEach((b) => {
        b.onclick = () => call("cover", b.dataset.cmd, b.closest(".cov").dataset.cover);
      });
      body.querySelectorAll("[data-all]").forEach((b) => {
        b.onclick = () => call("cover", b.dataset.all, c.covers);
      });
      body.querySelectorAll("[data-more]").forEach((b) => {
        b.onclick = () => this._moreInfo(b.dataset.more);
      });
    }
    body.querySelectorAll("[data-light]").forEach((b) => b.classList.toggle("on", !!st[b.dataset.light] && st[b.dataset.light].state === "on"));
    body.querySelectorAll(".cov").forEach((row) => {
      const s = st[row.dataset.cover], pos = s && s.attributes && s.attributes.current_position;
      row.querySelector(".p").textContent = typeof pos === "number" ? pos + "%" : s ? s.state : "\u2014";
    });
    const cl = body.querySelector(".clim");
    if (cl) {
      const tv = c.temperature && num3(c.temperature, 1), hv = c.humidity && num3(c.humidity, 0);
      cl.querySelector(".v").textContent = tv !== null && tv !== void 0 ? tv + "\xB0" : "\u2014";
      cl.querySelector(".h").textContent = hv !== null && hv !== void 0 ? hv + "%" : "";
    }
    const pr = body.querySelector(".pres");
    if (pr) {
      const on = c.presence.some((id) => st[id] && isMotion(st[id].state));
      let txt = on ? t("r_someone") : t("r_empty");
      if (!on) {
        const last = Math.max(...c.presence.map((id) => Date.parse(st[id] && (st[id].last_changed || st[id].last_updated) || "")).filter(Number.isFinite));
        if (Number.isFinite(last)) {
          const min = Math.round((Date.now() - last) / 6e4);
          txt = t("r_empty_for", { t: min < 60 ? min + " min" : Math.floor(min / 60) + " h " + min % 60 + " min" });
        }
      }
      pr.textContent = "\u25CF " + txt;
    }
  }
  // An entity's name as Home Assistant's own lists show it: the name it was given, else
  // the friendly name without its device's name in front ("BoneIO ESP … Light25-salon" -> "Light25-salon").
  _shortName(id) {
    const h = this._hass, s = h.states[id], reg = h.entities && h.entities[id];
    if (reg && reg.name) return reg.name;
    const full = s && s.attributes && s.attributes.friendly_name || id.split(".")[1].replace(/_/g, " ");
    const dev = reg && reg.device_id && h.devices && h.devices[reg.device_id];
    const dn = dev && (dev.name_by_user || dev.name);
    if (dn && full.length > dn.length + 1 && full.toLowerCase().startsWith(dn.toLowerCase() + " ")) return full.slice(dn.length + 1);
    return full;
  }
  // The temperature (or humidity) of the last 24 hours as a small line.
  async _roomSpark() {
    const r = this._roomOpen;
    const id = r && (r.c.temperature || r.c.humidity);
    if (!id || !this._hass) return;
    try {
      const end = Date.now(), start = end - 864e5;
      const raw = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: [id],
        minimal_response: true,
        no_attributes: true,
        significant_changes_only: false
      });
      if (this._roomOpen !== r) return;
      const rows = (normalizeHistory(raw)[id] || []).map((x) => [x.t, Number(x.state)]).filter((x) => Number.isFinite(x[1]));
      if (rows.length < 2) return;
      const lo = Math.min(...rows.map((x) => x[1])), hi = Math.max(...rows.map((x) => x[1])), span = hi - lo || 1;
      const pts3 = rows.map(([tt, v]) => `${((tt - start) / 864e5 * 100).toFixed(1)},${(28 - (v - lo) / span * 26).toFixed(1)}`).join(" ");
      const pl = this.shadowRoot.querySelector("#fc-room .clim polyline");
      if (pl) pl.setAttribute("points", pts3);
    } catch (e) {
    }
  }
  // The `entities:` action for a device: by its own id, a camera's other stream, a chandelier's other circuit.
  _actionFor(id, kind) {
    const acts = this._config.actions;
    if (!acts || !Object.keys(acts).length) return null;
    const own = this._ownActionFor(acts, id, kind);
    if (own) return own;
    if (this._isLock && this._isLock(id)) return null;
    const dom = id.split(".")[0] + ".*";
    for (const x of [dom, "*"]) if (acts[x] && acts[x][kind]) return acts[x][kind];
    return null;
  }
  _ownActionFor(acts, id, kind) {
    const ids = [id];
    const cam = this._svg && [...this._svg.querySelectorAll("[data-entity-camera]")].find((g) => [g.getAttribute("data-entity-camera"), g.getAttribute("data-entity-camera-hq")].includes(id));
    if (cam) ids.push(cam.getAttribute("data-entity-camera"), cam.getAttribute("data-entity-camera-hq"));
    const fx = this._fixtureOf(id);
    if (fx) ids.push(...fx);
    for (const x of ids) if (x && acts[x] && acts[x][kind]) return acts[x][kind];
    return null;
  }
  // Home Assistant's actions, as in its own cards.
  _runAction(a, id) {
    const entity = a.entity || id;
    if (a.confirmation) {
      const text = typeof a.confirmation === "object" && a.confirmation.text || translate(this._lang(), "confirm");
      if (!window.confirm(text)) return;
    }
    switch (a.action) {
      case "none":
        return;
      case "toggle":
        this._hass.callService("homeassistant", "toggle", { entity_id: entity });
        return;
      case "perform-action":
      case "call-service": {
        const [d, sv] = String(a.perform_action || a.service || "").split(".");
        if (d && sv) this._hass.callService(d, sv, { ...a.data || a.service_data || {} }, a.target);
        return;
      }
      case "navigate":
        if (!a.navigation_path) return;
        history.pushState(null, "", a.navigation_path);
        window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
        return;
      case "url":
        if (a.url_path) window.open(a.url_path, "_blank", "noopener");
        return;
      // for your own scripts (browser_mod and the like): the action with the entity it came from
      case "fire-dom-event":
        this.dispatchEvent(new CustomEvent("ll-custom", { detail: { ...a, entity_id: a.entity_id || entity }, bubbles: true, composed: true }));
        return;
      default:
        this._moreInfo(entity);
    }
  }
  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }
  // ---- tablet mode ---------------------------------------------------------
  connectedCallback() {
    const wrap = this.shadowRoot && this.shadowRoot.getElementById("wrap");
    if (this._resize && wrap) this._resize.observe(wrap);
    if (this._config && !this._sunTimer) this._sunTimer = setInterval(() => {
      if (!this._travel && this._config.sun) this._drawSun();
    }, 5 * 6e4);
    if (this._config && !this._trailTimer) this._trailTimer = setInterval(() => {
      if (!this._travel && this._config.trail) {
        this._drawTrail();
        this._fetchTrail();
      }
    }, 6e4);
    if (this._config && !this._clockTimer && this._config.widgets.some((w) => w.type === "clock" || w.type === "calendar"))
      this._clockTimer = setInterval(() => this._drawWidgets(), 2e4);
    if (this._config && !this._minuteTimer) this._minuteTimer = setInterval(() => {
      if (this._travel) return;
      if (this._svg && this._svg.querySelector("." + NAMES.deviceLabel)) {
        this._sig = "";
        this._update();
      } else if (this._config.forgotten) this._drawAlerts();
      if (this._config.rules.some((r) => r.for)) this._drawRules();
    }, 6e4);
    if (this._config && this._config.kiosk && !this._kioskTimer) {
      this._lastTouch = Date.now();
      this._kioskTimer = setInterval(() => this._kioskTick(), 5e3);
      this._kioskTick();
    }
  }
  disconnectedCallback() {
    if (this._savedSub) {
      this._savedSub.then((un) => un()).catch(() => {
      });
      this._savedSub = null;
    }
    if (this._kioskTimer) {
      clearInterval(this._kioskTimer);
      this._kioskTimer = null;
    }
    if (this._resize) this._resize.disconnect();
    if (this._sunTimer) {
      clearInterval(this._sunTimer);
      this._sunTimer = null;
    }
    if (this._trailTimer) {
      clearInterval(this._trailTimer);
      this._trailTimer = null;
    }
    if (this._minuteTimer) {
      clearInterval(this._minuteTimer);
      this._minuteTimer = null;
    }
    if (this._clockTimer) {
      clearInterval(this._clockTimer);
      this._clockTimer = null;
    }
    this._closePopup();
    this._closeRoom();
    this._clearLasso();
    this._lassoArmed = false;
    this._stopPlay();
  }
  _touched() {
    this._lastTouch = Date.now();
    if (this._config && this._config.kiosk) this._kioskTick();
  }
  _isNight() {
    const k = this._config.kiosk;
    if (!k || !k.night) return false;
    if (k.night === "sun") {
      const sun = this._hass && this._hass.states["sun.sun"];
      return !!sun && sun.state === "below_horizon";
    }
    return inWindow(k.night, /* @__PURE__ */ new Date());
  }
  _kioskTick() {
    const k = this._config && this._config.kiosk;
    if (!k) return;
    const idle = Date.now() - (this._lastTouch || 0) > k.idle * 1e3;
    if (idle) {
      const startFloor = this._config.floor || null;
      if ((this._floor || null) !== startFloor) {
        this._floor = startFloor;
        this._buildFloor();
      }
      if (this._map !== "live") {
        this._map = "live";
        this._renderLayers();
        this._enterMap();
      }
      if (this._travel && !this._playTimer) this._exitTravel();
      const menu = this.shadowRoot.getElementById("layer-menu");
      if (menu) menu.hidden = true;
      if (this._vb && this._fullVB && this._vb.join() !== this._homeView().join()) this._fit();
    }
    const dim = this.shadowRoot.getElementById("dim");
    const night = this._isNight() && idle;
    dim.hidden = false;
    dim.style.opacity = night ? String(1 - k.dim) : "0";
  }
  // ---- states --------------------------------------------------------------
  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._waitHa && this._config) {
      this._waitHa = false;
      this._loadFromHa();
    }
    if (first && this._config) {
      this._renderLayers();
      this._renderFloors();
      this._renderSettings();
    }
    if (this._config && this._svg && (first || this._themeNow() !== this._themeBuilt) && this._applyTheme(true)) return;
    if (this._config) this._syncPalette();
    this._update();
  }
  _update() {
    if (!this._hass || !this._svg || !this._entities) return;
    if (this._travel) return;
    let sig = "";
    for (const id of this._entities) {
      const s = this._hass.states[id];
      sig += id + (s ? s.last_updated : "-") + ";";
    }
    for (const id of this._alertEntities || []) {
      if (this._entities.has(id)) continue;
      const s = this._hass.states[id];
      sig += id + (s ? s.last_updated : "-") + ";";
    }
    if (sig === this._sig) return;
    this._placeLightField();
    this._sig = sig;
    const states = { get: (id) => this._hass.states[id] };
    applyStates(this._svg, states, this._lang(), this._paintFn());
    this._placeLabels();
    this._checkDetections();
    if (this._config.widgets.length) this._drawWidgets();
    if (this._roomOpen) this._renderRoom(false);
    this._drawSun();
    this._drawTrail();
    this._fetchTrail();
    if (this._map === "signal" || AVERAGE_KINDS.includes(this._map) && this._period() === "now") this._drawMap();
    this._drawAlerts();
    this._drawRules();
    this._drawPower();
  }
  // ---- alerts ----------------------------------------------------------------
  // The room an entity is drawn in on floor fl (a device, a lamp, a reading under an icon, a climate sensor), or null.
  _entityRoom(fl, id) {
    const L = fl.lowered;
    for (const x of [...L.devices || [], ...L.lights || []]) {
      if (x.entity === id || x.value_entity === id || (x.circuits || []).some((c) => c.entity === id)) {
        const at = x.at || x.bulbs && x.bulbs[0] || x.hit && [x.hit[0] + x.hit[2] / 2, x.hit[1] + x.hit[3] / 2];
        return x.room || (at ? fl.roomAt(at[0], at[1]) : null);
      }
    }
    for (const k of L.climate || []) if ((k.temperature === id || k.humidity === id) && k.at) return fl.roomAt(k.at[0], k.at[1]);
    return null;
  }
  _alertsOf(fl) {
    const L = fl.lowered;
    const entityRoom = (id) => this._entityRoom(fl, id);
    const rules = this._config.alerts.filter((r) => {
      if (r.room) return fl === (this._floorsLowered.find((f) => (f.lowered.rooms || []).some((x) => x.id === r.room)) || this._floorsLowered[0]);
      const home = this._floorsLowered.find((f) => [...f.lowered.devices || [], ...f.lowered.lights || []].some((x) => x.entity === r.entity || (x.circuits || []).some((c) => c.entity === r.entity)));
      return (home || this._floorsLowered[0]) === fl;
    });
    return activeAlerts(L, this._hass.states, { roomAt: fl.roomAt, rules, cold: this._config.cold, entityRoom });
  }
  // ---- rules: rooms tinted, marks glowing or blinking ---------------------------------------
  _drawRules() {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-rules").forEach((el) => el.remove());
    svg.querySelectorAll(".fc-rc, .fc-blink").forEach((el) => {
      el.classList.remove("fc-rc", "fc-blink");
      el.style.removeProperty("--fc-rc");
    });
    if (!this._config.rules.length || !this._hass || !this._floorsLowered) return;
    const fl = this._floorsLowered.find((f) => (f.id || null) === (this._floor || null));
    if (!fl) return;
    const roomById = new Map((this._rooms || []).map((r2) => [r2.id, r2]));
    const marksOf = (id) => svg.querySelectorAll(`[data-entity="${CSS.escape(id)}"]`);
    const { rooms, marks } = ruleEffects(this._config.rules, this._hass.states, {
      roomOf: (id) => this._entityRoom(fl, id),
      drawn: (id) => marksOf(id).length > 0,
      isRoom: (id) => roomById.has(id)
    });
    for (const [id, m] of marks) {
      for (const el of marksOf(id)) {
        if (m.color) {
          el.classList.add("fc-rc");
          el.style.setProperty("--fc-rc", m.color);
        }
        if (m.blink) el.classList.add("fc-blink");
      }
    }
    if (!rooms.size) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.id = "fc-rules";
    g.setAttribute("pointer-events", "none");
    g.innerHTML = [...rooms].map(([id, c]) => `<polygon points="${roomById.get(id).points.map((p2) => p2[0].toFixed(1) + "," + p2[1].toFixed(1)).join(" ")}" fill="${c}" stroke="${c}"/>`).join("");
    const r = svg.querySelector("#rooms");
    if (r) r.after(g);
  }
  // ---- live power by the devices -------------------------------------------------------------
  // [mark entity, power sensor] for the marks on the plan: from `power:`, else a power sensor of the
  // mark's own HA device - only when that device has one mark here (a 32-channel relay board's meter
  // is not every lamp's).
  _powerPairs() {
    const svg = this._svg, h = this._hass;
    if (!svg || !h) return [];
    const key2 = (this._floor || "") + "|" + Object.keys(h.entities || {}).length;
    if (this._powerCache && this._powerCache.key === key2 && this._powerCache.svg === svg) return this._powerCache.pairs;
    const marks = [...new Set([...svg.querySelectorAll("[data-entity]")].filter((el) => !el.closest("#rooms, #notes")).map((el) => el.getAttribute("data-entity")).filter(Boolean))];
    const ents = h.entities || {}, byDevice = {}, perDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    for (const id of marks) {
      const d = ents[id] && ents[id].device_id;
      if (d) perDevice[d] = (perDevice[d] || 0) + 1;
    }
    const isPower = (x) => {
      const s = h.states[x];
      return !!s && x.startsWith("sensor.") && powerWatts(s) !== null && (s.attributes && s.attributes.device_class === "power" || ["W", "kW"].includes(s.attributes && s.attributes.unit_of_measurement));
    };
    const pairs = [];
    for (const id of marks) {
      const own = this._config.power[id];
      if (typeof own === "string" || Array.isArray(own) && own.length) {
        pairs.push([id, [].concat(own)]);
        continue;
      }
      if (isPower(id)) continue;
      const d = ents[id] && ents[id].device_id;
      if (!d || perDevice[d] > 1) continue;
      const sensor = (byDevice[d] || []).find(isPower);
      if (sensor) pairs.push([id, [sensor]]);
    }
    this._powerCache = { key: key2, svg, pairs };
    return pairs;
  }
  _drawPower() {
    const svg = this._svg, sr = this.shadowRoot;
    if (!svg) return;
    svg.querySelectorAll("#fc-power").forEach((el) => el.remove());
    const chip = sr.getElementById("fc-power-total");
    if (this._config.power === false || !this._hass) {
      if (chip) chip.hidden = true;
      return;
    }
    const lang = this._lang(), pairs = this._powerPairs(), states = this._hass.states;
    let sum = 0, any = false;
    const NS = "http://www.w3.org/2000/svg";
    const root = document.createElementNS(NS, "g");
    root.id = "fc-power";
    const F = this._homeVB || this._fullVB || this._baseVB;
    const u = F ? Math.min(F[2], F[3]) / 52 : 10;
    const seen = /* @__PURE__ */ new Set();
    for (const [id, sensors] of pairs) {
      const ws = sensors.map((x) => [x, powerWatts(states[x])]).filter((x) => x[1] !== null);
      if (!ws.length) continue;
      const w = ws.reduce((a, x) => a + x[1], 0);
      for (const [x, v] of ws) if (!seen.has(x)) {
        sum += v;
        any = true;
        seen.add(x);
      }
      if (w < this._config.powerMin) continue;
      const el = svg.querySelector(`[data-entity="${CSS.escape(id)}"]`);
      let at = null;
      try {
        const core = el.querySelector("." + NAMES.hitArea + ", ." + NAMES.iconBadge + ", ." + NAMES.sensorBody) || el;
        const b = core.getBBox(), ms = core.getScreenCTM(), rs = svg.getScreenCTM();
        const m = ms && rs && rs.inverse().multiply(ms);
        if (m && (b.width || b.height)) {
          const p2 = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(m);
          at = [p2.x, p2.y];
        }
      } catch (e) {
      }
      if (!at) continue;
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", at[0].toFixed(1));
      t.setAttribute("y", (at[1] - 1.3 * u).toFixed(1));
      t.setAttribute("font-size", u.toFixed(1));
      t.setAttribute("data-power", id);
      t.textContent = "\u26A1" + powerText(w, lang);
      root.appendChild(t);
    }
    if (root.childNodes.length) svg.appendChild(root);
    const total = this._config.powerTotal ? powerWatts(states[this._config.powerTotal]) : any ? sum : null;
    if (chip) {
      chip.hidden = total === null;
      if (total !== null) chip.textContent = "\u26A1 " + translate(lang, this._config.powerTotal ? "power_house" : "power_devices", { w: powerText(total, lang) });
    }
  }
  _alertText(a) {
    const lang = this._lang();
    if (a.kind === "rule") {
      const s = this._hass.states[a.entity];
      return a.name || s && s.attributes && s.attributes.friendly_name || a.entity;
    }
    return translate(lang, "alert_" + a.kind, { t: a.value !== void 0 ? a.value.toLocaleString(lang, { maximumFractionDigits: 1 }) : "" });
  }
  _drawAlerts() {
    const svg = this._svg;
    if (!svg || !this._hass || !this._floorsLowered) return;
    const here = this._floorsLowered.find((f) => (f.id || null) === (this._floor || null));
    const all = this._floorsLowered.map((f) => ({ id: f.id, list: this._alertsOf(f) }));
    const mine = here ? all.find((x) => (x.id || null) === (this._floor || null)).list : [];
    svg.querySelectorAll("#fc-alerts").forEach((el) => el.remove());
    const roomById = new Map((this._rooms || []).map((r) => [r.id, r]));
    const polys = mine.filter((a) => a.room && roomById.has(a.room)).map((a) => `<polygon points="${roomById.get(a.room).points.map((p2) => p2[0].toFixed(1) + "," + p2[1].toFixed(1)).join(" ")}" fill="${a.color}"/>`);
    if (polys.length) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "g");
      t.innerHTML = `<g id="fc-alerts" pointer-events="none">${polys.join("")}</g>`;
      const rooms = svg.querySelector("#rooms");
      if (rooms) rooms.after(t.firstElementChild);
    }
    const box = this.shadowRoot.getElementById("alerts");
    const seen = /* @__PURE__ */ new Set();
    const flat = all.flatMap((x) => x.list.map((a) => ({ ...a, floor: x.id }))).filter((a) => {
      const k = a.entity + "|" + a.kind;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const now = Date.now();
    const nudges = this._config.forgotten && this._hass ? this._floorsLowered.flatMap((f) => forgottenLights(f.sources, this._hass.states, now, this._config.forgotten.minutes).map((n5) => ({ ...n5, floor: f.id, fl: f }))) : [];
    svg.querySelectorAll(".fc-forgotten").forEach((el) => el.classList.remove("fc-forgotten"));
    for (const n5 of nudges) {
      if ((n5.floor || null) !== (this._floor || null)) continue;
      for (const id of n5.lights) svg.querySelectorAll(`.light[data-entity="${CSS.escape(id)}"]`).forEach((el) => el.classList.add("fc-forgotten"));
    }
    const alarmKey = (this._floor || "") + "#" + flat.map((a) => a.entity + a.kind + a.room + (a.value !== void 0 ? Math.round(a.value) : "")).join("|");
    const key2 = alarmKey + "#" + nudges.map((n5) => n5.room + n5.lights.join() + Math.floor((now - n5.since) / 3e5)).join("|");
    if (key2 !== this._bannerKey) box.innerHTML = "";
    for (const a of key2 !== this._bannerKey ? flat : []) {
      const fl = this._floorsLowered.find((f) => (f.id || null) === (a.floor || null));
      const room = fl && a.room ? (fl.lowered.rooms.find((r) => r.id === a.room) || {}).name : null;
      const b = document.createElement("button");
      b.className = "fc";
      b.style.color = a.color;
      const other = (a.floor || null) !== (this._floor || null) ? (this._floorsList().find((f) => (f.id || null) === (a.floor || null)) || {}).name : null;
      b.textContent = "\u26A0 " + this._alertText(a) + (room ? " \xB7 " + room : "") + (other ? " (" + other + ")" : "");
      b.addEventListener("click", () => {
        if ((a.floor || null) !== (this._floor || null)) {
          this._floor = a.floor;
          this._buildFloor();
        } else this._moreInfo(a.entity);
      });
      box.appendChild(b);
    }
    for (const n5 of key2 !== this._bannerKey ? nudges : []) {
      const b = document.createElement("button");
      b.className = "fc nudge";
      b.style.color = "#ffab40";
      const room = (n5.fl.lowered.rooms.find((r) => r.id === n5.room) || {}).name || n5.room;
      b.textContent = translate(this._lang(), "forgotten", { room, min: Math.round((now - n5.since) / 6e4) });
      b.addEventListener("click", () => this._hass.callService("homeassistant", "turn_off", { entity_id: n5.lights }));
      box.appendChild(b);
    }
    this._bannerKey = key2;
    const floorsWith = new Set(all.filter((x) => x.list.length).map((x) => x.id || ""));
    this.shadowRoot.querySelectorAll("#floors button").forEach((b, i) => {
      const f = this._floorsList()[i];
      b.classList.toggle("alarm", !!f && floorsWith.has(f.id || ""));
    });
    if (flat.length && alarmKey !== this._alertKey) this._touched();
    this._alertKey = alarmKey;
  }
  // ---- time travel -----------------------------------------------------------
  _wireTimeline() {
    const sr = this.shadowRoot;
    const btn = sr.getElementById("tt-btn");
    if (!this._config.timeTravel) {
      btn.hidden = true;
      return;
    }
    btn.title = translate(this._lang(), "time_travel");
    btn.onclick = () => this._travel ? this._exitTravel() : this._enterTravel(1);
    sr.getElementById("tt-live").textContent = translate(this._lang(), "live");
    sr.getElementById("tt-live").onclick = () => this._exitTravel();
    this._renderRanges();
    const slider = sr.getElementById("tt-slider");
    slider.addEventListener("input", () => {
      if (!this._travel) return;
      this._stopPlay();
      this._showAt(this._sliderTime());
    });
    sr.getElementById("tt-play").onclick = () => this._playTimer ? this._stopPlay() : this._play();
    const rec = sr.getElementById("tt-rec");
    rec.title = translate(this._lang(), "rec_t");
    rec.onclick = () => this._recordDay();
  }
  // ---- "a day in 30 seconds": the travel range as an animated GIF ------------------------------
  // The plan as it is drawn now, whole, as an image: the SVG with the card's styles round it.
  async _frame(W2, H, F) {
    const sr = this.shadowRoot, wrap = sr.getElementById("wrap");
    const css = [...sr.querySelectorAll("style")].map((x) => x.textContent).join("\n").replace(/:host/g, "#fcx");
    const clone = this._svg.cloneNode(true);
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: W2, height: H, viewBox: F.join(" ") })) clone.setAttribute(k, v);
    clone.querySelectorAll("#fc-widgets, #fc-power").forEach((el) => el.remove());
    const xml = `<svg xmlns="http://www.w3.org/2000/svg" id="fcx" width="${W2}" height="${H}"><style><![CDATA[${css}]]></style><g id="wrap" class="${wrap.className}"><g id="stage">${new XMLSerializer().serializeToString(clone)}</g></g></svg>`;
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise((ok, bad) => {
        img.onload = ok;
        img.onerror = () => bad(new Error("frame"));
        img.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async _recordDay(N3 = 72) {
    const t = this._travel, sr = this.shadowRoot;
    if (!t || this._recording || !this._svg) return;
    this._stopPlay();
    this._recording = true;
    const btn = sr.getElementById("tt-rec"), slider = sr.getElementById("tt-slider"), keep = slider.value;
    const lang = this._lang();
    const F = (this._fullVB || this._baseVB).slice();
    const W2 = Math.round(Math.min(720, 720 * F[2] / F[3])), H = Math.round(W2 * F[3] / F[2]);
    const cv = document.createElement("canvas");
    cv.width = W2;
    cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const bg = getComputedStyle(this).getPropertyValue("--fc-bg").trim() || "#131a24";
    const fg = getComputedStyle(this).getPropertyValue("--fc-text").trim() || "#c3cfdf";
    const frames = [];
    try {
      for (let i = 0; i < N3; i++) {
        btn.textContent = `\u{1F3AC} ${Math.round(100 * i / N3)}%`;
        const at = t.start + (t.end - t.start) * i / (N3 - 1);
        slider.value = String(Math.round(1e3 * i / (N3 - 1)));
        this._showAt(at);
        await new Promise((r) => setTimeout(r, 0));
        const img = await this._frame(W2, H, F);
        g.fillStyle = bg;
        g.fillRect(0, 0, W2, H);
        g.drawImage(img, 0, 0, W2, H);
        let when;
        try {
          when = new Date(at).toLocaleString(lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        } catch (e) {
          when = new Date(at).toISOString();
        }
        g.font = "600 16px system-ui, sans-serif";
        const tw = g.measureText(when).width;
        g.fillStyle = bg;
        g.globalAlpha = 0.8;
        g.fillRect(8, H - 34, tw + 20, 26);
        g.globalAlpha = 1;
        g.fillStyle = fg;
        g.fillText(when, 18, H - 15);
        frames.push(g.getImageData(0, 0, W2, H).data);
      }
      btn.textContent = "\u{1F3AC} \u2026";
      await new Promise((r) => setTimeout(r, 0));
      const pal = makePalette(frames, 4), idx = indexer(pal);
      const gif = encodeGif(W2, H, frames.map(idx), pal, Math.round(2880 / N3));
      this._lastGif = { bytes: gif.length, w: W2, h: H, frames: N3, blob: new Blob([gif], { type: "image/gif" }) };
      const a = document.createElement("a");
      a.href = URL.createObjectURL(this._lastGif.blob);
      a.download = `floorplan-${new Date(t.start).toISOString().slice(0, 10)}-${t.days}d.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2e4);
    } catch (e) {
      console.warn("LIVING-FLOORPLAN-CARD: recording failed", e);
    } finally {
      this._recording = false;
      btn.textContent = "\u{1F3AC}";
      if (this._travel) {
        slider.value = keep;
        this._showAt(this._sliderTime());
      }
    }
  }
  // 24 h and 7 days from the recorder; 30 days and 3 months when InfluxDB Proxy is there.
  _renderRanges(sel) {
    const box = this.shadowRoot.getElementById("tt-ranges");
    if (!box) return;
    const keys = { 1: "range_24h", 7: "range_7d", 30: "range_30d", 90: "range_90d", 365: "p_year" };
    const days = this._influx ? [1, 7, 30, 90, 365] : [1, 7];
    box.innerHTML = "";
    for (const d of days) {
      const b = document.createElement("button");
      b.className = "fc" + (d === sel ? " sel" : "");
      b.dataset.r = String(d);
      b.textContent = translate(this._lang(), keys[d]);
      b.onclick = () => this._enterTravel(d);
      box.appendChild(b);
    }
  }
  // Is InfluxDB Proxy installed? Asked once.
  async _proxy() {
    if (!this._config.influx || !this._hass) return false;
    if (this._influx === void 0) this._influx = await hasProxy(this._hass);
    return this._influx;
  }
  _sliderTime() {
    const t = this._travel;
    if (!t) return Date.now();
    return t.start + (t.end - t.start) * Number(this.shadowRoot.getElementById("tt-slider").value) / 1e3;
  }
  async _enterTravel(days) {
    if (!this._hass || !this._entities) return;
    this._stopPlay();
    const req = this._travelReq = (this._travelReq || 0) + 1;
    const end = Date.now(), start = end - days * 864e5;
    const sr = this.shadowRoot;
    sr.getElementById("wrap").classList.add("traveling");
    sr.getElementById("timeline").hidden = false;
    sr.getElementById("tt-btn").classList.add("sel");
    this._renderRanges(days);
    sr.getElementById("tt-when").textContent = translate(this._lang(), "loading_history");
    sr.getElementById("wrap").style.setProperty("--fc-timeline-h", sr.getElementById("timeline").offsetHeight + "px");
    if (this._map !== "live") {
      this._map = "live";
      this._renderLayers();
      this._enterMap();
    }
    const proxy = await this._proxy();
    if (req !== this._travelReq) return;
    this._renderRanges(days);
    let raw = {}, hist = null;
    if (days > 10 && proxy) {
      try {
        hist = await proxyHistory(this._hass, this._allEntities(), start, end);
      } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e);
      }
    }
    if (!hist) try {
      raw = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        entity_ids: this._allEntities(),
        minimal_response: false,
        no_attributes: false,
        significant_changes_only: false
      });
    } catch (e) {
      console.warn("LIVING-FLOORPLAN-CARD: history failed", e);
    }
    if (req !== this._travelReq) return;
    this._travel = { start, end, days, hist: hist || normalizeHistory(raw) };
    const slider = sr.getElementById("tt-slider");
    slider.value = "0";
    this._showAt(start);
    this._renderMarks();
  }
  _showAt(t) {
    if (!this._travel || !this._svg) return;
    const get = statesAt(this._travel.hist, this._hass.states, t);
    this._placeLightField(get);
    applyStates(this._svg, { get }, this._lang(), this._paintFn());
    this._placeLabels();
    this._svg.querySelectorAll(".fc-forgotten").forEach((el) => el.classList.remove("fc-forgotten"));
    this._drawSun(t);
    this._drawTrail(t, (id) => this._travel.hist[id] || []);
    this.shadowRoot.getElementById("fc-alerts")?.remove();
    const lang = this._lang();
    let when;
    try {
      when = new Date(t).toLocaleString(lang, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      when = new Date(t).toISOString();
    }
    this.shadowRoot.getElementById("tt-when").textContent = when;
  }
  // What marks the time travel line: alarms, locks, cameras' detections, then the config's `events`.
  _eventRules() {
    if (!this._config.events || !this._hass) return [];
    const lang = this._lang();
    const name = (id) => this._hass.states[id] && this._hass.states[id].attributes && this._hass.states[id].attributes.friendly_name || id;
    const rules = [], seen = /* @__PURE__ */ new Set();
    const add3 = (r) => {
      if (r.entity && !seen.has(r.entity)) {
        seen.add(r.entity);
        rules.push(r);
      }
    };
    const rule = (entity, color, label, states = null) => ({ entity, states, above: null, below: null, color, name: label });
    for (const r of this._config.events) add3({ ...r, name: r.name || name(r.entity) });
    for (const f of this._floorsLowered || []) {
      for (const d of f.lowered.devices || []) {
        if (d.type === "icon" && ALARM_KINDS2.includes(d.kind) && d.entity) add3(rule(d.entity, "#e53935", translate(lang, "alert_" + d.kind)));
      }
      for (const l of f.lowered.locks || []) if (l.entity) add3(rule(l.entity, "#e57373", translate(lang, "ev_open", { name: name(l.entity) }), ["open", "unlocked", "opening"]));
      for (const c of f.lowered.cameras || []) {
        const det = this._config.cameraDetect[c.entity] || c.detect || (this._autoDetect || {})[c.entity];
        if (det) add3(rule(det, "#a99be0", translate(lang, "ev_detect", { name: c.name || name(c.entity) })));
      }
    }
    return rules;
  }
  _renderMarks() {
    const sr = this.shadowRoot, box = sr.getElementById("tt-marks"), t = this._travel;
    box.innerHTML = "";
    if (!t) return;
    const lang = this._lang();
    const marks = clusterMarks(eventMarks(this._eventRules(), t.hist, t.start, t.end), t.start, t.end);
    for (const m of marks.slice(-400)) {
      const b = document.createElement("button");
      b.className = "mk" + (m.n > 1 ? " many" : "");
      b.style.left = (m.pos * 100).toFixed(2) + "%";
      b.style.background = m.rule.color;
      let when;
      try {
        when = new Date(m.t).toLocaleString(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        when = "";
      }
      const label = m.rule.name + (m.n > 1 ? " \xD7" + m.n : "");
      b.dataset.label = label + " \xB7 " + when;
      b.setAttribute("aria-label", b.dataset.label);
      b.onclick = () => {
        this._stopPlay();
        sr.getElementById("tt-slider").value = String(Math.round(m.pos * 1e3));
        this._showAt(m.t);
        sr.getElementById("tt-when").textContent += " \xB7 " + label;
      };
      box.appendChild(b);
    }
    sr.getElementById("wrap").style.setProperty("--fc-timeline-h", sr.getElementById("timeline").offsetHeight + "px");
  }
  // Every entity of every floor (history for time travel, so a floor switch keeps the past).
  _allEntities() {
    const ids = new Set(this._entities || []);
    const walk = (o) => {
      if (typeof o === "string") {
        if (/^[a-z_]+\.[a-z0-9_]+$/.test(o)) ids.add(o);
        return;
      }
      if (o && typeof o === "object") for (const v of Object.values(o)) walk(v);
    };
    for (const f of this._floorsLowered || []) {
      for (const k of ["lights", "devices", "covers", "climate", "locks", "windows", "doors", "rooms", "cameras"]) walk(f.lowered[k]);
    }
    for (const r of this._eventRules()) ids.add(r.entity);
    return [...ids];
  }
  _play() {
    if (!this._travel) return;
    const sr = this.shadowRoot, slider = sr.getElementById("tt-slider");
    if (Number(slider.value) >= 1e3) slider.value = "0";
    sr.getElementById("tt-play").textContent = "\u275A\u275A";
    sr.getElementById("tt-play").title = translate(this._lang(), "pause");
    this._playTimer = setInterval(() => {
      const v = Math.min(1e3, Number(slider.value) + 4);
      slider.value = String(v);
      this._showAt(this._sliderTime());
      if (v >= 1e3) this._stopPlay();
    }, 120);
  }
  _stopPlay() {
    if (this._playTimer) {
      clearInterval(this._playTimer);
      this._playTimer = null;
    }
    const b = this.shadowRoot.getElementById("tt-play");
    if (b) {
      b.textContent = "\u25B6";
      b.title = translate(this._lang(), "play");
    }
  }
  _exitTravel() {
    this._stopPlay();
    this._travel = null;
    this._travelReq = (this._travelReq || 0) + 1;
    const sr = this.shadowRoot;
    sr.getElementById("wrap").classList.remove("traveling");
    sr.getElementById("timeline").hidden = true;
    sr.getElementById("tt-btn").classList.remove("sel");
    sr.getElementById("tt-marks").innerHTML = "";
    this._doorsKey = null;
    this._sig = "";
    this._update();
  }
  // ---- room maps -----------------------------------------------------------
  _mapLabel(kind) {
    return translate(this._lang(), "map_" + kind);
  }
  // The period of the map: "now", a number of days, "winter" / "summer".
  _period() {
    if (this._mapPeriod !== void 0 && this._mapPeriod !== null) return this._mapPeriod;
    return AVERAGE_KINDS.includes(this._map) ? "now" : this._config.mapDays;
  }
  _periodLabel(p2) {
    const lang = this._lang();
    if (p2 === "now" || p2 === "winter" || p2 === "summer") return translate(lang, "p_" + p2);
    if (p2 === 365) return translate(lang, "p_year");
    if (p2 === 90) return translate(lang, "range_90d");
    return translate(lang, "p_days", { n: p2 });
  }
  // Periods a map offers: averages from the long-term statistics (kept for ever), hours from
  // the history (the recorder's days, or InfluxDB Proxy's months and the year).
  _periodsFor(kind) {
    if (kind === "signal" || kind === "live") return [];
    if (AVERAGE_KINDS.includes(kind)) return ["now", 7, 30, 90, 365, "winter", "summer"];
    if (kind === "energy") return [7, 30, 90, 365];
    if (!this._influx) return [.../* @__PURE__ */ new Set([7, Math.min(this._config.mapDays, RECORDER_DAYS)])].sort((x, y) => x - y);
    return [.../* @__PURE__ */ new Set([7, 30, 90, 365, this._config.mapDays])].sort((x, y) => x - y);
  }
  // Comparing needs the period before too: from the history only as far back as it reaches.
  _canCompare(kind, p2) {
    if (p2 === "now" || kind === "signal") return false;
    if (AVERAGE_KINDS.includes(kind) || kind === "energy" || this._influx) return true;
    return typeof p2 === "number" && 2 * p2 <= RECORDER_DAYS;
  }
  _mapKey() {
    return [this._map, this._floor || "", String(this._period()), this._compare ? "vs" : ""].join("|");
  }
  _renderLayers() {
    const btn = this.shadowRoot.getElementById("layer-btn");
    const menu = this.shadowRoot.getElementById("layer-menu");
    if (!this._config.maps) {
      btn.hidden = true;
      menu.hidden = true;
      return;
    }
    btn.textContent = "\u25A6 ";
    const lbl = document.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = this._mapLabel(this._map);
    btn.appendChild(lbl);
    btn.title = this._mapLabel(this._map);
    btn.onclick = () => {
      menu.hidden = !menu.hidden;
    };
    menu.innerHTML = "";
    for (const k of MAP_KINDS) {
      const b = document.createElement("button");
      b.className = "fc" + (k === this._map ? " sel" : "");
      b.textContent = this._mapLabel(k);
      b.addEventListener("click", () => {
        menu.hidden = true;
        if (k === this._map) return;
        this._map = k;
        this._mapPeriod = null;
        this._compare = false;
        this._renderLayers();
        this._enterMap();
      });
      menu.appendChild(b);
    }
  }
  async _enterMap() {
    const wrap = this.shadowRoot.getElementById("wrap");
    const kind = this._map;
    wrap.classList.toggle("mapping", kind !== "live");
    if (kind === "live" || kind === "signal" || this._period() === "now") {
      this._drawMap();
      return;
    }
    const key2 = this._mapKey();
    const fresh = this._mapCache && this._mapCache.key === key2 && Date.now() - this._mapCache.at < 10 * 6e4;
    if (!fresh) {
      this._drawMap(null);
      const req = this._mapReq = (this._mapReq || 0) + 1;
      await this._proxy();
      const south = !!(this._hass && this._hass.config && this._hass.config.latitude < 0);
      const p2 = this._period();
      const now = Date.now();
      const r1 = periodRange(p2, now, { south }), r0 = periodRange(p2, now, { before: true, south });
      const earliest = this._compare ? r0[0] : r1[0];
      const lights = await this._proxy() || now - earliest <= RECORDER_DAYS * 864e5;
      const cur = await this._mapValues(kind, r1, { lights });
      const prev = this._compare ? await this._mapValues(kind, r0, { lights }) : null;
      if (req !== this._mapReq || key2 !== this._mapKey()) return;
      this._mapCache = { key: key2, at: Date.now(), values: prev ? diffValues(cur, prev) : cur };
    }
    this._drawMap();
  }
  // Values per room of a map for [start, end].
  async _mapValues(kind, [start, end], { lights = true } = {}) {
    const sources = this._sources || {};
    if (!this._hass) return {};
    if (AVERAGE_KINDS.includes(kind)) {
      const ids = [...new Set(Object.values(sources).flatMap((x) => x[kind] || []))];
      const st = await this._stats(ids, start, end, "mean");
      return roomAverages(sources, kind, (id) => st[id] === void 0 ? null : st[id]);
    }
    if (kind === "energy") {
      const out = {};
      const meters = this._meters();
      const st = await this._stats(meters.map((m) => m.entity), start, end, "change");
      for (const m of meters) {
        if (st[m.entity] === void 0) continue;
        out[m.room] = (out[m.room] || 0) + st[m.entity] * kwhFactor(this._hass.states[m.entity]);
      }
      if (lights) {
        const lv = await this._historyValues("light_energy", start, end);
        for (const [room, v] of Object.entries(lv)) out[room] = (out[room] || 0) + v;
      }
      return out;
    }
    return this._historyValues(kind, start, end);
  }
  // Long-term statistics of `ids` -> { id: mean of the means | sum of the changes }; sensors without
  // statistics: InfluxDB Proxy's hourly means.
  async _stats(ids, start, end, type) {
    const out = {};
    if (!ids.length) return out;
    try {
      const r = await this._hass.callWS({
        type: "recorder/statistics_during_period",
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        statistic_ids: ids,
        period: end - start > 120 * 864e5 ? "month" : "day",
        types: [type]
      });
      for (const [id, rows] of Object.entries(r || {})) {
        const v = statsValue(rows, type);
        if (v !== null) out[id] = v;
      }
    } catch (e) {
      console.warn("LIVING-FLOORPLAN-CARD: statistics failed", e);
    }
    const miss = ids.filter((id) => out[id] === void 0);
    if (type === "mean" && miss.length && await this._proxy()) {
      try {
        const h = await proxyHistory(this._hass, miss, start, end);
        for (const [id, rows] of Object.entries(h)) {
          const v = rows.map((x) => Number(x.state)).filter(Number.isFinite);
          if (v.length) out[id] = v.reduce((a, b) => a + b, 0) / v.length;
        }
      } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e);
      }
    }
    return out;
  }
  // Energy meters in the rooms of this floor: the config's `energy`, and the energy sensors of the
  // devices on the plan (their own, their reading, or on their device in Home Assistant).
  _meters() {
    const out = [], seen = /* @__PURE__ */ new Set();
    const L = this._lowered;
    if (!L || !this._hass) return out;
    const idx = roomIndex(L);
    const roomOfDevice = (d) => {
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      return d.room || (at ? idx.roomAt(at[0], at[1]) : null);
    };
    const add3 = (entity, room) => {
      if (entity && room && !seen.has(entity)) {
        seen.add(entity);
        out.push({ entity, room });
      }
    };
    const devices = L.devices || [];
    for (const m of this._config.energy) {
      const d = devices.find((x) => x.entity === m.entity || x.value_entity === m.entity);
      add3(m.entity, m.room || d && roomOfDevice(d));
    }
    const ents = this._hass.entities || {};
    const byDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    const PART = /cool|heat|import|export|return|produc|solar|charg|discharg|_l[123]\b|phase/;
    const pick = (ids) => ids.filter((x) => isEnergyMeter(this._hass.states[x])).sort((a, b) => Number(PART.test(a)) - Number(PART.test(b)) || a.length - b.length)[0];
    const usedDevices = /* @__PURE__ */ new Set();
    for (const d of devices) {
      const room = roomOfDevice(d);
      for (const id of [d.entity, d.value_entity]) {
        if (!id) continue;
        const dev = ents[id] && ents[id].device_id;
        if (isEnergyMeter(this._hass.states[id])) {
          add3(id, room);
          if (dev) usedDevices.add(dev);
          continue;
        }
        if (!dev || usedDevices.has(dev)) continue;
        const m = pick(byDevice[dev] || []);
        if (m) {
          usedDevices.add(dev);
          add3(m, room);
        }
      }
    }
    return out;
  }
  // Hours / light energy per room from the history: the recorder, InfluxDB Proxy beyond its days.
  async _historyValues(kind, start, end) {
    const sources = this._sources || {};
    const key2 = kind === "presence_hours" ? "presence" : "lights";
    const ids = [...new Set(Object.values(sources).flatMap((x) => x[key2] || []))];
    if (!ids.length) return {};
    const energy = kind === "light_energy";
    let rows = null;
    if ((Date.now() - start > RECORDER_DAYS * 864e5 || energy) && await this._proxy()) {
      try {
        rows = await proxyHistory(this._hass, ids, start, end);
      } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: InfluxDB Proxy history failed", e);
      }
    }
    if (!rows) {
      try {
        rows = normalizeHistory(await this._hass.callWS({
          type: "history/history_during_period",
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          entity_ids: ids,
          minimal_response: !energy,
          no_attributes: !energy,
          significant_changes_only: false
        }));
      } catch (e) {
        console.warn("LIVING-FLOORPLAN-CARD: history failed", e);
      }
    }
    rows = rows || {};
    if (energy) {
      const levels = {};
      for (const id of ids) {
        const b = this._hass.states[id] && this._hass.states[id].attributes && this._hass.states[id].attributes.brightness;
        if (typeof b === "number") levels[id] = b / 255;
      }
      return energyValues(sources, rows, start, end, lightWatts(this._lowered || {}), levels);
    }
    const history2 = {};
    for (const [id, list] of Object.entries(rows)) history2[id] = list.map((r) => ({ s: r.state, lu: r.t / 1e3 }));
    return hoursValues(kind, sources, history2, start, end);
  }
  // Radio devices on this floor with their signal: one spot per Home Assistant device.
  _signalPoints() {
    const L = this._lowered;
    if (!L || !this._hass) return [];
    const ents = this._hass.entities || {};
    const byDevice = {};
    for (const e of Object.values(ents)) if (e.device_id) (byDevice[e.device_id] = byDevice[e.device_id] || []).push(e.entity_id);
    const placed = [];
    const put = (id, at) => {
      if (id && at) placed.push([id, at]);
    };
    for (const l of L.lights || []) {
      const at = l.at || l.bulbs && l.bulbs[0] || l.strip && [l.strip[0] + l.strip[2] / 2, l.strip[1] + l.strip[3] / 2];
      if (l.type === "fixture") for (const c of l.circuits || []) put(c.entity, at);
      else put(l.entity, at);
    }
    for (const d of L.devices || []) {
      const at = d.at || (d.hit ? [d.hit[0] + d.hit[2] / 2, d.hit[1] + d.hit[3] / 2] : d.glow && d.glow.at);
      put(d.entity, at);
      put(d.value_entity, at);
    }
    for (const k of L.climate || []) {
      put(k.temperature, k.at);
      put(k.humidity, k.at);
    }
    for (const x of [...L.cameras || [], ...L.locks || []]) put(x.entity, x.at);
    const seen = /* @__PURE__ */ new Set(), out = [];
    for (const [id, at] of placed) {
      const dev = ents[id] && ents[id].device_id;
      if (!dev || seen.has(dev)) continue;
      const sig = (byDevice[dev] || []).find((x) => /linkquality|_lqi$|rssi|signal_strength|wifi_signal/.test(x) || this._hass.states[x] && this._hass.states[x].attributes && this._hass.states[x].attributes.device_class === "signal_strength");
      if (!sig) continue;
      seen.add(dev);
      const s = this._hass.states[sig];
      const unit2 = s && s.attributes && s.attributes.unit_of_measurement || "";
      const level = signalLevel(s);
      out.push({ x: at[0], y: at[1], level, entity: sig, text: level === null ? "\u2014" : Math.round(Number(s.state)) + (unit2 && unit2 !== "lqi" ? " " + unit2 : "") });
    }
    return out;
  }
  // values: undefined = compute now, null = nothing yet (loading)
  _drawMap(values) {
    const svg = this._svg;
    if (!svg) return;
    svg.querySelectorAll("#fc-map, #fc-map-text").forEach((el) => el.remove());
    const legend = this.shadowRoot.getElementById("legend");
    const kind = this._map;
    if (kind === "live" || !this._rooms) {
      legend.hidden = true;
      this._legendSpace();
      return;
    }
    const lang = this._lang();
    const textRot = -(this._lowered && this._lowered.canvas && this._lowered.canvas.rotate || 0);
    const angle = textRot - (this._turned ? 90 : 0);
    const g = (html) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "g");
      t.innerHTML = html;
      return t.firstElementChild;
    };
    const place = (layers2) => {
      const rooms = svg.querySelector("#rooms");
      if (rooms) rooms.after(g(layers2.fill));
      (svg.querySelector("#" + NAMES.rotation) || svg).appendChild(g(layers2.text));
    };
    legend.hidden = false;
    if (kind === "signal") {
      const pts3 = this._signalPoints();
      const layers2 = signalLayers(pts3, { angle, paint: this._paintFn() });
      place(layers2);
      this._legendHead(legend, "<div>" + this._mapLabel(kind) + (pts3.length ? "" : " \xB7 " + translate(lang, "none_found")) + '</div><div class="bar" style="background:linear-gradient(90deg,' + layers2.stops.map((x) => x[1]).join(",") + ')"></div><div class="ends"><span>' + translate(lang, "sig_weak") + "</span><span>" + translate(lang, "sig_good") + "</span></div>");
      legend.querySelector(".periods")?.remove();
      this._legendSpace();
      return;
    }
    const now = this._period() === "now";
    const delta = !!this._compare && !now;
    if (values === void 0) {
      if (now) values = this._hass ? liveValues(kind, this._sources, this._hass.states) : {};
      else values = this._mapCache && this._mapCache.key === this._mapKey() ? this._mapCache.values : null;
    }
    const title = this._mapLabel(kind) + (now ? "" : " \xB7 " + this._periodLabel(this._period())) + (delta ? " \xB7 " + translate(lang, "vs_before") : "");
    if (values === null) {
      this._legendHead(legend, "");
      legend.querySelector(".head").textContent = title + " \xB7 " + translate(lang, "loading_history");
      this._legendSpace();
      return;
    }
    const num3 = (v, d) => v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
    const money = (v) => {
      try {
        return v.toLocaleString(lang, { style: "currency", currency: this._hass.config && this._hass.config.currency || "EUR" });
      } catch (e) {
        return num3(v, 2);
      }
    };
    const base = kind === "temperature" ? (v) => num3(v, 1) + "\xB0" : kind === "humidity" ? (v) => num3(v, 0) + "%" : kind === "light_energy" || kind === "energy" ? (v) => this._config.price ? money(v * this._config.price) : num3(v, Math.abs(v) < 10 ? 2 : 1) + " kWh" : (v) => translate(lang, "hours", { n: num3(v, Math.abs(v) < 10 ? 1 : 0) });
    const format = delta ? (v) => (v > 0 ? "+" : v < 0 ? "\u2212" : "\xB1") + base(Math.abs(v)) : base;
    const layers = mapLayers(this._rooms, values, kind, { format, angle, paint: this._paintFn(), delta });
    place(layers);
    const stops = layers.stops;
    const lo = stops[0][0], hi = stops[stops.length - 1][0];
    this._legendHead(legend, "<div>" + title + '</div><div class="bar" style="background:linear-gradient(90deg,' + stops.map((x) => x[1]).join(",") + ')"></div><div class="ends"><span>' + format(lo) + "</span><span>" + format(hi) + "</span></div>");
    this._legendPeriods(legend);
    this._legendSpace();
  }
  // The legend's head (title, colour bar, ends) changes; its period chips stay the same nodes.
  _legendHead(legend, html) {
    let head2 = legend.querySelector(":scope > .head");
    if (!head2) {
      legend.innerHTML = "";
      head2 = document.createElement("div");
      head2.className = "head";
      legend.appendChild(head2);
    }
    if (head2.innerHTML !== html) head2.innerHTML = html;
  }
  // The plan ends above the legend (the zoom buttons keep their corner).
  _legendSpace() {
    const wrap = this.shadowRoot.getElementById("wrap"), legend = this.shadowRoot.getElementById("legend");
    const h = legend.hidden ? 0 : legend.offsetHeight + 12;
    if (wrap.style.getPropertyValue("--fc-legend-h") !== h + "px") wrap.style.setProperty("--fc-legend-h", h + "px");
  }
  // Period chips under a map, and "± before" to compare with the period before.
  _legendPeriods(legend) {
    const periods = this._periodsFor(this._map);
    const cur = this._period();
    const sig = [this._map, String(cur), this._compare ? "vs" : "", periods.join(), this._lang()].join("|");
    const old = legend.querySelector(":scope > .periods");
    if (old && old.dataset.sig === sig) return;
    if (old) old.remove();
    if (!periods.length) return;
    const row = document.createElement("div");
    row.className = "periods";
    row.dataset.sig = sig;
    for (const p2 of periods) {
      const b = document.createElement("button");
      b.className = "fc" + (p2 === cur ? " sel" : "");
      b.textContent = this._periodLabel(p2);
      b.onclick = () => {
        if (p2 === cur) return;
        this._mapPeriod = p2;
        if (!this._canCompare(this._map, p2)) this._compare = false;
        this._enterMap();
      };
      row.appendChild(b);
    }
    if (this._canCompare(this._map, cur)) {
      const c = document.createElement("button");
      c.className = "fc cmp" + (this._compare ? " sel" : "");
      c.textContent = translate(this._lang(), "compare");
      c.onclick = () => {
        this._compare = !this._compare;
        this._enterMap();
      };
      row.appendChild(c);
    }
    legend.appendChild(row);
  }
  _lang() {
    const h = this._hass;
    return h && (h.locale && h.locale.language || h.language) || navigator.language || "en";
  }
  getCardSize() {
    return 8;
  }
  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: 8, min_rows: 4 };
  }
  // A new card from the picker: no model yet, it shows how to make one.
  static getStubConfig() {
    return { type: "custom:" + CARD_NAME };
  }
  // The visual editor in the dashboard (Home Assistant's own form).
  static getConfigForm() {
    const nl = String(navigator.language || "").slice(0, 2).toLowerCase(), pl = nl === "pl", de = nl === "de";
    const L = (en, plText, deText) => pl ? plText : de && deText ? deText : en;
    return {
      schema: [
        { name: "model", selector: { text: {} } },
        { name: "light", selector: { select: { mode: "dropdown", options: [
          { value: "realistic", label: L("Realistic (shadows, through doorways)", "Realistyczne (cienie, przez drzwi)", "Realistisch (Schatten, durch T\xFCren)") },
          { value: "glow", label: L("Round glows", "Okr\u0105g\u0142e po\u015Bwiaty", "Runde Lichtkreise") }
        ] } } },
        { name: "rotate", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: L("Automatic", "Automatycznie", "Automatisch") },
          { value: "0", label: "0\xB0" },
          { value: "90", label: "90\xB0" }
        ] } } },
        { name: "map", selector: { select: { mode: "dropdown", options: MAP_KINDS.map((k) => ({ value: k, label: translate(navigator.language, "map_" + k, { days: 7 }) })) } } },
        { name: "map_days", selector: { number: { min: 1, max: 30, mode: "box" } } },
        { name: "doors", selector: { select: { mode: "dropdown", options: [
          { value: "closed", label: L("Closed (they stop the light)", "Zamkni\u0119te (blokuj\u0105 \u015Bwiat\u0142o)", "Geschlossen (sie halten das Licht auf)") },
          { value: "open", label: L("Open (light goes through)", "Otwarte (\u015Bwiat\u0142o przechodzi)", "Offen (Licht geht durch)") }
        ] } } },
        { name: "price", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: L("Like Home Assistant", "Jak Home Assistant", "Wie Home Assistant") },
          { value: "dark", label: L("Dark", "Ciemny", "Dunkel") },
          { value: "light", label: L("Light", "Jasny", "Hell") }
        ] } } },
        { name: "camera_popup", selector: { select: { mode: "dropdown", options: [
          { value: "kiosk", label: L("In tablet mode", "W trybie tabletu", "Im Tablet-Modus") },
          { value: "always", label: L("Always", "Zawsze", "Immer") },
          { value: "never", label: L("Never", "Nigdy", "Nie") }
        ] } } },
        { name: "show_room_names", selector: { boolean: {} } },
        { name: "time_travel", selector: { boolean: {} } },
        { name: "maps", selector: { boolean: {} } },
        { name: "hold_action", selector: { select: { mode: "dropdown", options: [
          { value: "insights", label: "Entity Insights" },
          { value: "more-info", label: L("Entity dialog", "Okno encji", "Entit\xE4tsdialog") }
        ] } } }
      ],
      computeLabel: (s) => ({
        model: L("Model (house.json from the floor plan editor)", "Model (house.json z edytora rzutu)", "Modell (house.json aus dem Grundriss-Editor)"),
        light: L("Light", "\u015Awiat\u0142o", "Licht"),
        rotate: L("Turn the plan", "Obr\xF3t rzutu", "Plan drehen"),
        map: L("Map on load", "Mapa na starcie", "Karte beim Laden"),
        map_days: L("Days of history for the maps", "Dni historii dla map", "Tage Verlauf f\xFCr die Karten"),
        price: L("Electricity price per kWh", "Cena pr\u0105du za kWh", "Strompreis pro kWh"),
        doors: L("Doors without a contact sensor", "Drzwi bez kontaktronu", "T\xFCren ohne Kontaktsensor"),
        show_room_names: L("Room names", "Nazwy pokoi", "Raumnamen"),
        time_travel: L("Time travel button", "Przycisk przewijania czasu", "Zeitreise-Taste"),
        maps: L("Map button", "Przycisk map", "Karten-Taste"),
        hold_action: L("Hold", "Przytrzymanie", "Gedr\xFCckt halten"),
        theme: L("Theme", "Wygl\u0105d", "Design"),
        camera_popup: L("Camera picture when it sees someone", "Obraz kamery, gdy kogo\u015B wykryje", "Kamerabild, wenn sie jemanden sieht")
      })[s.name]
    };
  }
};
function registerCard() {
  if (customElements.get(CARD_NAME)) return;
  customElements.define(CARD_NAME, LivingFloorplanCard);
  if (!customElements.get(OLD_CARD_NAME)) customElements.define(OLD_CARD_NAME, class extends LivingFloorplanCard {
  });
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: CARD_NAME,
    name: translate(navigator.language, "card_name"),
    description: translate(navigator.language, "card_description"),
    preview: false
  });
  console.info("%c LIVING-FLOORPLAN-CARD %c " + VERSION + " ", "background:#ffc300;color:#131a24", "");
}
if (typeof document !== "undefined" && document.querySelector("home-assistant") && !customElements.get("home-assistant")) {
  const wait = setInterval(() => {
    if (customElements.get("home-assistant")) {
      clearInterval(wait);
      registerCard();
    }
  }, 50);
  setTimeout(() => {
    clearInterval(wait);
    registerCard();
  }, 15e3);
} else registerCard();
export {
  CARD_NAME,
  DEFAULT_EDITOR_URL,
  LAYERS,
  LivingFloorplanCard,
  OLD_CARD_NAME,
  STRINGS,
  VERSION,
  coreRect,
  detectSensorFor,
  entitiesOf,
  inWindow,
  isEnergyMeter,
  kioskConfig,
  kwhFactor,
  normalizeEntityActions,
  safeIds,
  shouldTurn,
  translate,
  turnedViewBox,
  versionLabel
};
