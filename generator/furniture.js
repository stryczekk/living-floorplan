// Furniture on the plan: a library of simple pieces (drawn from their size)
// grouped by the room they usually stand in, and pieces carried over as ready
// SVG (kind "custom"). Everything here is in SVG units; model-v2.js converts.
//
// A piece: {id, kind, at: [x, y] (its middle), size: [w, d], rot (degrees,
// clockwise; 0 = its back up / -y), room?, note?}. A custom piece also has
// `svg` (its own <g id=...>...</g>, as drawn) and `origin` (the middle it was
// drawn at): moved or turned, it gets a transform around that middle.

// palette: [group, [kind, ...]]; default sizes in cm (width x depth)
export const FURNITURE_GROUPS = {
  f_bedroom: ["bed", "bed_single", "nightstand", "wardrobe", "sliding_wardrobe", "dresser", "vanity", "bench"],
  f_kids: ["crib", "changing_table", "bunk_bed", "toy_box", "play_mat", "kids_table", "high_chair"],
  f_bathroom: ["bathtub", "corner_bath", "shower", "wc", "bidet", "sink", "double_sink", "washer", "towel_rail"],
  f_kitchen: ["counter", "corner_counter", "kitchen_sink", "cooktop", "fridge", "tall_unit", "dishwasher", "island",
    "upper_cabinets", "bar_stool"],
  f_living: ["sofa", "corner_sofa", "armchair", "ottoman", "coffee_table", "tv_unit", "sideboard", "fireplace", "rug",
    "plant", "piano"],
  f_dining: ["table", "oval_table", "round_table", "chair", "dining_bench"],
  f_office: ["desk", "corner_desk", "office_chair", "bookcase", "filing_cabinet", "printer"],
  f_hall: ["shoe_cabinet", "coat_rack", "hall_bench", "mirror"],
  f_utility: ["boiler", "tank", "heat_pump", "rack", "electrical_panel", "shelf", "cabinet", "ironing_board", "box"],
  f_outdoor: ["car", "bike", "grill", "sunbed", "garden_set", "hot_tub", "trampoline"],
  f_stairs: ["stairs_straight", "stairs_l", "stairs_u", "stairs_spiral", "attic_ladder"],
};
// stairs lead to the floor above: there they show as a void in the floor (stairVoids)
export const STAIR_KINDS = FURNITURE_GROUPS.f_stairs;
export const FURNITURE_KINDS = Object.values(FURNITURE_GROUPS).flat();
export const FURNITURE_SIZE = {
  bed: [160, 200], bed_single: [90, 200], nightstand: [50, 40], wardrobe: [200, 60], sliding_wardrobe: [240, 65],
  dresser: [120, 50], vanity: [100, 45], bench: [120, 40],
  crib: [70, 130], changing_table: [80, 55], bunk_bed: [90, 200], toy_box: [70, 40], play_mat: [150, 150],
  kids_table: [70, 50], high_chair: [55, 60],
  bathtub: [170, 75], corner_bath: [140, 140], shower: [90, 90], wc: [38, 54], bidet: [38, 54], sink: [60, 45],
  double_sink: [120, 50], washer: [60, 60], towel_rail: [55, 12],
  counter: [240, 60], corner_counter: [240, 180], kitchen_sink: [80, 60], cooktop: [60, 52], fridge: [60, 65],
  tall_unit: [60, 60], dishwasher: [60, 60], island: [180, 90], upper_cabinets: [240, 35], bar_stool: [40, 40],
  sofa: [220, 90], corner_sofa: [260, 180], armchair: [85, 85], ottoman: [60, 60], coffee_table: [110, 60],
  tv_unit: [180, 40], sideboard: [160, 45], fireplace: [100, 60], rug: [200, 300], plant: [45, 45], piano: [150, 60],
  table: [180, 90], oval_table: [200, 100], round_table: [110, 110], chair: [45, 45], dining_bench: [160, 40],
  desk: [160, 70], corner_desk: [160, 140], office_chair: [60, 60], bookcase: [100, 35], filing_cabinet: [45, 60],
  printer: [50, 40],
  shoe_cabinet: [100, 35], coat_rack: [100, 30], hall_bench: [100, 40], mirror: [80, 5],
  boiler: [45, 40], tank: [60, 60], heat_pump: [100, 40], rack: [60, 60], electrical_panel: [80, 15], shelf: [100, 40],
  cabinet: [60, 40], ironing_board: [120, 35], box: [60, 60],
  car: [190, 480], bike: [60, 180], grill: [120, 60], sunbed: [70, 190], garden_set: [200, 200], hot_tub: [200, 200],
  trampoline: [300, 300],
  // stairs: width x run (you walk up towards their back, -y); the attic ladder: its hatch
  stairs_straight: [100, 300], stairs_l: [200, 260], stairs_u: [220, 260], stairs_spiral: [160, 160], attic_ladder: [60, 120],
};

import { pieceFill } from "./floors.js";

const n = (v) => Number(v.toFixed(2)).toString();
const DETAIL = ' fill="#2c3a4d" stroke="#44546f"';
const rect = (x, y, w, h, rx = 0, extra = "") =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${rx ? ` rx="${n(rx)}"` : ""}${extra}/>`;
const circle = (x, y, r, extra = "") => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"${extra}/>`;
const ellipse = (x, y, rx, ry, extra = "") => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"${extra}/>`;
const line = (x1, y1, x2, y2, extra = "") => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"${extra}/>`;

const STAIR = ' fill="#1f2a3b" stroke="#6b7f9c"';
const STAIR_LINE = ' stroke="#6b7f9c" stroke-width="0.8"';
const ARROW = ' stroke="#8ea1ba" stroke-width="1.1" stroke-linecap="round"';
const treads = (xa, xb, ya, yb, k) => Array.from({ length: k - 1 }, (_, i) => line(xa, ya + ((yb - ya) * (i + 1)) / k, xb, ya + ((yb - ya) * (i + 1)) / k, STAIR_LINE)).join("");
const treadsX = (xa, xb, ya, yb, k) => Array.from({ length: k - 1 }, (_, i) => line(xa + ((xb - xa) * (i + 1)) / k, ya, xa + ((xb - xa) * (i + 1)) / k, yb, STAIR_LINE)).join("");
// an arrowhead at x, y pointing `deg` (0 = up / -y, clockwise)
function head(x, y, deg, m) {
  const s = Math.max(2.5, m * 0.09);
  return `<path d="M${n(-s)} ${n(s * 1.3)} L0 0 L${n(s)} ${n(s * 1.3)}" fill="none"${ARROW} transform="translate(${n(x)} ${n(y)}) rotate(${n(deg)})"/>`;
}
const upArrow = (xa, ya, xb, yb, m) => line(xa, ya, xb, yb, ARROW) + head(xb, yb, Math.round((Math.atan2(xb - xa, -(yb - ya)) * 180) / Math.PI), m);

// Stairs of the floor below as voids in this floor (same place and turn).
export function stairVoids(below) {
  return (below && below.furniture || []).filter((p) => STAIR_KINDS.includes(p.kind))
    .map((p) => ({ id: p.id + "-void", kind: "stair_void", at: p.at, size: p.size, rot: p.rot || 0 }));
}

// The drawing of a library piece of w x d (SVG units) around 0,0, its back at -d/2.
export function pieceShape(kind, w, d) {
  const x0 = -w / 2, y0 = -d / 2, m = Math.min(w, d);
  switch (kind) {
    case "bed": case "bed_single": {
      const pw = kind === "bed" ? (w - 3 * m * 0.06) / 2 : w - 2 * m * 0.1, ph = d * 0.11, pad = kind === "bed" ? m * 0.06 : m * 0.1;
      const pillows = kind === "bed" ? [x0 + pad, x0 + 2 * pad + pw] : [x0 + pad];
      return rect(x0, y0, w, d, 4) + pillows.map((px) => rect(px, y0 + d * 0.03, pw, ph, 5, DETAIL)).join("") +
        line(x0, y0 + d * 0.22, x0 + w, y0 + d * 0.22);
    }
    case "nightstand": case "cabinet": case "dresser": return rect(x0, y0, w, d, 2);
    case "wardrobe": return rect(x0, y0, w, d, 1) + line(0, y0, 0, y0 + d) + line(x0, y0 + d * 0.9, x0 + w, y0 + d * 0.9);
    case "bathtub": return rect(x0, y0, w, d, m * 0.2) + rect(x0 + m * 0.1, y0 + m * 0.1, w - m * 0.2, d - m * 0.2, m * 0.3, DETAIL) +
      circle(x0 + w - m * 0.3, 0, m * 0.04);
    case "shower": return rect(x0, y0, w, d, 1) + line(x0, y0, x0 + w, y0 + d) + line(x0 + w, y0, x0, y0 + d) + circle(0, 0, m * 0.05, DETAIL);
    case "wc": return rect(x0, y0, w, d * 0.3, 2) + ellipse(0, y0 + d * 0.62, w * 0.45, d * 0.36, DETAIL);
    case "sink": return rect(x0, y0, w, d, 2) + ellipse(0, y0 + d * 0.55, w * 0.33, d * 0.3, DETAIL);
    case "washer": return rect(x0, y0, w, d, 2) + circle(0, y0 + d * 0.55, m * 0.3, DETAIL);
    case "counter": return rect(x0, y0, w, d, 1);
    case "fridge": return rect(x0, y0, w, d, 2) + line(x0, y0 + d * 0.85, x0 + w, y0 + d * 0.85);
    case "island": return rect(x0, y0, w, d, 2);
    case "cooktop": {
      const r = m * 0.16;
      return rect(x0, y0, w, d, 1) + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => circle(sx * w / 4, sy * d / 4, r, DETAIL)).join("");
    }
    case "sofa": {
      const back = d * 0.25, arm = Math.min(w * 0.1, d * 0.25);
      return rect(x0, y0, w, d, 4) + rect(x0 + arm, y0 + back, w - 2 * arm, d - back, 3, DETAIL);
    }
    case "corner_sofa": {
      // an L: the long part along the back, the short leg down the left side
      const b = Math.min(w, d) * 0.5, s = b * 0.28;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d)} H${n(x0)} Z"/>` +
        `<path d="M${n(x0 + s)} ${n(y0 + s)} H${n(x0 + w - s)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d - s * 0.3)} H${n(x0 + s)} Z"${DETAIL}/>`;
    }
    case "armchair": {
      const back = d * 0.25, arm = w * 0.18;
      return rect(x0, y0, w, d, 5) + rect(x0 + arm, y0 + back, w - 2 * arm, d - back - 2, 4, DETAIL);
    }
    case "coffee_table": case "table": case "desk": return rect(x0, y0, w, d, kind === "desk" ? 1 : 2);
    case "tv_unit": return rect(x0, y0, w, d, 1) + line(x0 + w / 3, y0, x0 + w / 3, y0 + d) + line(x0 + 2 * w / 3, y0, x0 + 2 * w / 3, y0 + d);
    case "round_table": return ellipse(0, 0, w / 2, d / 2);
    case "chair": return rect(x0, y0, w, d * 0.18, 2, DETAIL) + rect(x0 + w * 0.06, y0 + d * 0.2, w * 0.88, d * 0.8, 3);
    case "office_chair": return circle(0, d * 0.06, m * 0.4, DETAIL) +
      `<path d="M${n(-m * 0.4)} ${n(y0 + d * 0.2)} A${n(m * 0.5)} ${n(m * 0.5)} 0 0 1 ${n(m * 0.4)} ${n(y0 + d * 0.2)}" fill="none" stroke="#5a6b86" stroke-width="3" stroke-linecap="round"/>`;
    case "bookcase": case "shelf": {
      const k = Math.max(2, Math.round(w / (kind === "shelf" ? 25 : 30)));
      return rect(x0, y0, w, d, 1) + Array.from({ length: k - 1 }, (_, i) => line(x0 + (w * (i + 1)) / k, y0, x0 + (w * (i + 1)) / k, y0 + d)).join("");
    }
    // --- bedroom, kids
    case "sliding_wardrobe": return rect(x0, y0, w, d, 1) + line(x0 + 2, y0 + d * 0.62, 2, y0 + d * 0.62) + line(-2, y0 + d * 0.78, x0 + w - 2, y0 + d * 0.78);
    case "vanity": return rect(x0, y0, w, d, 2) + ellipse(0, y0 + 1.5, w * 0.3, 1.5, DETAIL);
    case "bench": case "hall_bench": case "dining_bench": case "ottoman": case "toy_box": return rect(x0, y0, w, d, m * 0.15);
    case "crib": {
      const k = Math.max(3, Math.round(w / 4));
      return rect(x0, y0, w, d, 2) + rect(x0 + m * 0.08, y0 + m * 0.08, w - m * 0.16, d - m * 0.16, 2, DETAIL) +
        Array.from({ length: k - 1 }, (_, i) => line(x0 + (w * (i + 1)) / k, y0, x0 + (w * (i + 1)) / k, y0 + m * 0.08)).join("");
    }
    case "changing_table": return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.08, y0 + d * 0.12, w * 0.84, d * 0.76, m * 0.2, DETAIL);
    case "bunk_bed": return rect(x0, y0, w, d, 3) + rect(x0 + w * 0.12, y0 + d * 0.03, w * 0.76, d * 0.11, 4, DETAIL) +
      line(x0, y0 + d * 0.22, x0 + w, y0 + d * 0.22) + line(x0 + w * 0.15, y0 + d, x0 + w * 0.15, y0 + d * 0.6) + line(x0 + w * 0.3, y0 + d, x0 + w * 0.3, y0 + d * 0.6);
    case "play_mat": return rect(x0, y0, w, d, m * 0.1, ' fill="none" stroke-dasharray="4 3"');
    case "kids_table": return rect(x0, y0, w, d, m * 0.25);
    case "high_chair": return rect(x0, y0, w, d, m * 0.2) + rect(x0 + w * 0.2, y0 + d * 0.25, w * 0.6, d * 0.5, 3, DETAIL);
    // --- bathroom
    case "corner_bath":
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + d * 0.45)} A${n(w * 0.55)} ${n(d * 0.55)} 0 0 1 ${n(x0 + w * 0.45)} ${n(y0 + d)} H${n(x0)} Z"/>` +
        `<path d="M${n(x0 + m * 0.1)} ${n(y0 + m * 0.1)} H${n(x0 + w - m * 0.1)} V${n(y0 + d * 0.45)} A${n(w * 0.45)} ${n(d * 0.45)} 0 0 1 ${n(x0 + w * 0.45)} ${n(y0 + d - m * 0.1)} H${n(x0 + m * 0.1)} Z"${DETAIL}/>`;
    case "bidet": return rect(x0, y0, w, d * 0.25, 2) + ellipse(0, y0 + d * 0.6, w * 0.45, d * 0.36, DETAIL) + circle(0, y0 + d * 0.42, m * 0.06);
    case "double_sink": return rect(x0, y0, w, d, 2) + ellipse(-w / 4, y0 + d * 0.55, w * 0.16, d * 0.3, DETAIL) + ellipse(w / 4, y0 + d * 0.55, w * 0.16, d * 0.3, DETAIL);
    case "towel_rail": return rect(x0, y0, w, d, 1) + line(x0 + w * 0.25, y0, x0 + w * 0.25, y0 + d) + line(x0 + w * 0.5, y0, x0 + w * 0.5, y0 + d) + line(x0 + w * 0.75, y0, x0 + w * 0.75, y0 + d);
    // --- kitchen
    case "corner_counter": {
      const t = Math.min(d, w) * 0.33;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + t)} H${n(x0 + t)} V${n(y0 + d)} H${n(x0)} Z"/>`;
    }
    case "kitchen_sink": return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.1, y0 + d * 0.15, w * 0.48, d * 0.7, 3, DETAIL) + rect(x0 + w * 0.64, y0 + d * 0.15, w * 0.26, d * 0.7, 2) + circle(x0 + w * 0.34, y0 + d * 0.08, m * 0.04);
    case "tall_unit": return rect(x0, y0, w, d, 1) + line(x0, y0, x0 + w, y0 + d) + line(x0 + w, y0, x0, y0 + d);
    case "dishwasher": return rect(x0, y0, w, d, 1) + line(x0 + w * 0.15, y0 + d * 0.88, x0 + w * 0.85, y0 + d * 0.88);
    case "upper_cabinets": return rect(x0, y0, w, d, 1, ' fill="none" stroke-dasharray="4 3"');
    case "bar_stool": return circle(0, 0, m * 0.45, DETAIL);
    // --- living
    case "sideboard": case "shoe_cabinet": case "filing_cabinet": {
      const k = Math.max(2, Math.round(w / (kind === "filing_cabinet" ? 100 : 30)));
      return rect(x0, y0, w, d, 1) + Array.from({ length: k - 1 }, (_, i) => line(x0 + (w * (i + 1)) / k, y0, x0 + (w * (i + 1)) / k, y0 + d)).join("") +
        (kind === "filing_cabinet" ? line(x0, y0 + d * 0.5, x0 + w, y0 + d * 0.5) : "");
    }
    case "fireplace": return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.2, y0, w * 0.6, d * 0.65, 1, DETAIL);
    case "rug": return rect(x0, y0, w, d, 1, ' fill="none" stroke-dasharray="6 4"') + rect(x0 + m * 0.06, y0 + m * 0.06, w - m * 0.12, d - m * 0.12, 1, ' fill="none"');
    case "plant": return circle(0, 0, m * 0.25, DETAIL) + [0, 60, 120, 180, 240, 300].map((a) => {
      const r = (a * Math.PI) / 180;
      return ellipse(Math.cos(r) * m * 0.3, Math.sin(r) * m * 0.3, m * 0.18, m * 0.09, ` transform="rotate(${a} ${n(Math.cos(r) * m * 0.3)} ${n(Math.sin(r) * m * 0.3)})"`);
    }).join("");
    case "piano": return rect(x0, y0, w, d * 0.55, 1) + rect(x0, y0 + d * 0.55, w, d * 0.2, 1, DETAIL) + rect(-w * 0.15, y0 + d * 0.78, w * 0.3, d * 0.22, 2);
    // --- dining, office
    case "oval_table": return ellipse(0, 0, w / 2, d / 2);
    case "corner_desk": {
      const t = Math.min(w, d) * 0.45;
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + t)} H${n(x0 + t)} V${n(y0 + d)} H${n(x0)} Z"/>`;
    }
    case "printer": return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.15, y0 + d * 0.6, w * 0.7, d * 0.3, 1, DETAIL);
    // --- hall
    case "coat_rack": {
      const k = Math.max(3, Math.round(w / 12));
      return line(x0, 0, x0 + w, 0) + Array.from({ length: k }, (_, i) => circle(x0 + (w * (i + 0.5)) / k, 0, m * 0.15, DETAIL)).join("");
    }
    case "mirror": return rect(x0, y0, w, Math.max(d, 1), 0.5, DETAIL);
    // --- utility
    case "heat_pump": return rect(x0, y0, w, d, 2) + circle(w * 0.15, 0, m * 0.38, DETAIL) + line(x0 + w * 0.08, y0 + d * 0.3, x0 + w * 0.35, y0 + d * 0.3);
    case "rack": return rect(x0, y0, w, d, 1) + rect(x0 + w * 0.1, y0 + d * 0.1, w * 0.8, d * 0.8, 1, DETAIL) + line(x0 + w * 0.1, y0 + d * 0.3, x0 + w * 0.9, y0 + d * 0.3) + line(x0 + w * 0.1, y0 + d * 0.5, x0 + w * 0.9, y0 + d * 0.5);
    case "electrical_panel": return rect(x0, y0, w, d, 1) + line(x0 + w * 0.1, y0 + d * 0.5, x0 + w * 0.9, y0 + d * 0.5, ' stroke-dasharray="2 2"');
    case "ironing_board": return `<path d="M${n(x0)} ${n(y0 + d * 0.15)} H${n(x0 + w * 0.7)} Q${n(x0 + w)} ${n(0)} ${n(x0 + w * 0.7)} ${n(y0 + d * 0.85)} H${n(x0)} Z"/>`;
    // --- outdoor
    case "car": return rect(x0, y0, w, d, m * 0.25) + rect(x0 + w * 0.1, y0 + d * 0.22, w * 0.8, d * 0.2, m * 0.08, DETAIL) +
      rect(x0 + w * 0.12, y0 + d * 0.66, w * 0.76, d * 0.14, m * 0.06, DETAIL) +
      [[-1, 0.2], [1, 0.2], [-1, 0.8], [1, 0.8]].map(([sx, fy]) => rect(sx < 0 ? x0 - 2 : x0 + w - 2, y0 + d * fy - d * 0.06, 4, d * 0.12, 1)).join("");
    case "bike": return ellipse(0, y0 + d * 0.18, w * 0.12, d * 0.17) + ellipse(0, y0 + d * 0.82, w * 0.12, d * 0.17) + line(0, y0 + d * 0.18, 0, y0 + d * 0.82) +
      line(-w * 0.4, y0 + d * 0.15, w * 0.4, y0 + d * 0.15);
    case "grill": return rect(x0, y0, w, d, 3) + ellipse(0, 0, w * 0.3, d * 0.35, DETAIL);
    case "sunbed": return rect(x0, y0, w, d, m * 0.12) + rect(x0 + w * 0.08, y0 + d * 0.04, w * 0.84, d * 0.28, m * 0.1, DETAIL);
    case "garden_set": {
      const r = m * 0.25;
      return circle(0, 0, r) + [0, 90, 180, 270].map((a) => {
        const t = (a * Math.PI) / 180, cx = Math.sin(t) * (r + m * 0.13), cy = -Math.cos(t) * (r + m * 0.13);
        return rect(cx - m * 0.1, cy - m * 0.1, m * 0.2, m * 0.2, 2, DETAIL);
      }).join("");
    }
    case "hot_tub": return rect(x0, y0, w, d, m * 0.12) + circle(0, 0, m * 0.38, DETAIL);
    case "trampoline": return ellipse(0, 0, w / 2, d / 2) + ellipse(0, 0, w * 0.42, d * 0.42, DETAIL);
    case "boiler": return rect(x0, y0, w, d, 2) + rect(x0 + w * 0.85, y0, w * 0.15, d, 1, DETAIL);
    // --- stairs: treads and an arrow up (from the start, +y, to the top, -y)
    case "stairs_straight": {
      const k = Math.max(3, Math.round(d / 15));
      return rect(x0, y0, w, d, 0, STAIR) + treads(x0, x0 + w, y0, y0 + d, k) + upArrow(0, y0 + d - m * 0.15, 0, y0 + m * 0.15, m);
    }
    case "stairs_l": {
      // up the left side, then a landing in the top-left corner and on to the right
      const b = Math.min(w, d) * 0.45, k1 = Math.max(3, Math.round((d - b) / 15)), k2 = Math.max(3, Math.round((w - b) / 15));
      return `<path d="M${n(x0)} ${n(y0)} H${n(x0 + w)} V${n(y0 + b)} H${n(x0 + b)} V${n(y0 + d)} H${n(x0)} Z"${STAIR}/>` +
        treads(x0, x0 + b, y0 + b, y0 + d, k1) + treadsX(x0 + b, x0 + w, y0, y0 + b, k2) +
        `<path d="M${n(x0 + b / 2)} ${n(y0 + d - m * 0.1)} V${n(y0 + b / 2)} H${n(x0 + w - m * 0.12)}" fill="none"${ARROW}/>` + head(x0 + w - m * 0.12, y0 + b / 2, 90, m);
    }
    case "stairs_u": {
      const b = w * 0.46, land = Math.min(d * 0.3, w * 0.45), k = Math.max(3, Math.round((d - land) / 15));
      return rect(x0, y0, w, d, 0, STAIR) + line(x0 + b, y0 + land, x0 + b, y0 + d) + line(x0 + w - b, y0 + land, x0 + w - b, y0 + d) +
        treads(x0, x0 + b, y0 + land, y0 + d, k) + treads(x0 + w - b, x0 + w, y0 + land, y0 + d, k) +
        `<path d="M${n(x0 + b / 2)} ${n(y0 + d - m * 0.08)} V${n(y0 + land / 2)} H${n(x0 + w - b / 2)} V${n(y0 + d - m * 0.15)}" fill="none"${ARROW}/>` +
        head(x0 + w - b / 2, y0 + d - m * 0.15, 180, m);
    }
    case "stairs_spiral": {
      const R = m / 2, k = 12;
      return circle(0, 0, R, STAIR) + circle(0, 0, R * 0.14, DETAIL) +
        Array.from({ length: k }, (_, i) => { const a = (i * 2 * Math.PI) / k; return line(Math.cos(a) * R * 0.14, Math.sin(a) * R * 0.14, Math.cos(a) * R, Math.sin(a) * R, ' stroke-width="0.7"'); }).join("") +
        // three quarters round, clockwise from the bottom
        `<path d="M0 ${n(R * 0.6)} A${n(R * 0.6)} ${n(R * 0.6)} 0 1 1 ${n(R * 0.6)} 0" fill="none"${ARROW}/>` + head(R * 0.6, 0, 180, m * 0.6);
    }
    case "attic_ladder": {
      // the hatch in the ceiling (dashed) with the folding ladder's rungs; you climb towards -y
      const k = Math.max(4, Math.round(d / 9));
      return rect(x0, y0, w, d, 0, ' fill="none" stroke-dasharray="4 3"') +
        line(x0 + w * 0.2, y0 + d * 0.06, x0 + w * 0.2, y0 + d * 0.94, STAIR_LINE) + line(x0 + w * 0.8, y0 + d * 0.06, x0 + w * 0.8, y0 + d * 0.94, STAIR_LINE) +
        Array.from({ length: k }, (_, i) => line(x0 + w * 0.2, y0 + (d * (i + 0.5)) / k, x0 + w * 0.8, y0 + (d * (i + 0.5)) / k, STAIR_LINE)).join("") +
        upArrow(0, y0 + d * 0.85, 0, y0 + d * 0.15, m * 1.4);
    }
    // the floor above: the opening the stairs come up through, an arrow down
    case "stair_void": return rect(x0, y0, w, d, 0, ' fill="#131a24" stroke-dasharray="5 3"') + line(x0, y0 + d, x0 + w, y0, ' stroke-width="0.7"') +
      upArrow(0, y0 + m * 0.2, 0, y0 + d - m * 0.2, m);
    case "tank": return rect(x0, y0, w, d, 2) + circle(0, 0, m * 0.42, DETAIL);
    default: return rect(x0, y0, w, d, 2);
  }
}

// One piece as SVG (units already SVG): library pieces from their size,
// custom ones as drawn, with a transform when moved or turned.
// A piece drawn by its owner (kind "drawn"): shapes in fractions of its size, -0.5..0.5 from its middle,
// so it resizes and turns like a library piece. parts: [{ t: "rect", x, y, w, h, r? } | { t: "poly", pts: [[x, y]...] }
// | { t: "ellipse", cx, cy, rx, ry }], each with detail: true for an inner, darker part.
export function drawnShape(parts, w, d) {
  return (parts || []).map((q) => {
    const extra = q.detail ? DETAIL : "";
    if (q.t === "rect") return rect(q.x * w, q.y * d, q.w * w, q.h * d, (q.r || 0) * Math.min(w, d), extra);
    if (q.t === "ellipse") return ellipse(q.cx * w, q.cy * d, Math.abs(q.rx * w), Math.abs(q.ry * d), extra);
    if (q.t === "poly" && Array.isArray(q.pts) && q.pts.length >= 3)
      return `<polygon points="${q.pts.map(([x, y]) => n(x * w) + "," + n(y * d)).join(" ")}"${extra}/>`;
    return "";
  }).join("");
}

export function pieceSvg(p) {
  const fill = pieceFill(p.color);
  const svg = pieceSvgBare(p);
  // a colour of its own on the piece's group (its inner details keep their darker fill)
  if (!fill) return svg;
  // the root <g>: its own fill replaced (a custom piece may carry one), else one added
  return svg.replace(/^(\s*<g\b)([^>]*)>/, (all, head, attrs) =>
    /\sfill="[^"]*"/.test(attrs) ? `${head}${attrs.replace(/\sfill="[^"]*"/, ` fill="${fill}"`)}>` : `${head} fill="${fill}"${attrs}>`);
}

function pieceSvgBare(p) {
  const rot = p.rot || 0;
  if (p.kind === "custom" && p.svg) {
    const o = p.origin || p.at;
    const dx = p.at[0] - o[0], dy = p.at[1] - o[1];
    if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 && !rot) return p.svg;
    const tf = (Math.abs(dx) >= 0.005 || Math.abs(dy) >= 0.005 ? `translate(${n(dx)} ${n(dy)})` : "") +
      (rot ? `${dx || dy ? " " : ""}rotate(${n(rot)} ${n(o[0])} ${n(o[1])})` : "");
    // in front of the piece's own transform (it was drawn with it)
    return p.svg.replace(/^(\s*<g\b[^>]*?)(\s+transform="([^"]*)")?(\s*\/?>)/,
      (all, head, _t, own, end) => `${head} transform="${tf}${own ? " " + own : ""}"${end}`);
  }
  const [w, d] = p.size;
  const shape = p.kind === "drawn" ? drawnShape(p.parts, w, d) : pieceShape(p.kind, w, d);
  return `<g id="${p.id}" transform="translate(${n(p.at[0])} ${n(p.at[1])})${rot ? ` rotate(${n(rot)})` : ""}">${shape}</g>`;
}

// The furniture layer: under the lights, not clickable.
export function furnitureLayer(pieces) {
  if (!pieces || !pieces.length) return "";
  return `  <g id="furniture" pointer-events="none" fill="#243040" stroke="#3a4861"\n     stroke-width="1.2" stroke-linejoin="round">\n` +
    pieces.map((p) => "    " + pieceSvg(p).trim()).join("\n") + "\n  </g>";
}
