// Ready-made outlines to start a plan from: rectangle, L and T. Pure geometry,
// no DOM - usable from the editor and from Node.
//
// Dimensions are in cm. `outside: true` means the numbers are the building's
// outside dimensions (how a house is usually measured); the walls are then
// drawn on centre lines half a wall thickness inside them.

export const SHAPES = {
  rect: { params: { width: 1000, depth: 800 } },
  L: { params: { width: 1000, depth: 800, cutWidth: 400, cutDepth: 300, corner: "ne" } },
  T: { params: { width: 1200, depth: 900, barDepth: 500, stemWidth: 500 } },
};
export const CORNERS = ["nw", "ne", "se", "sw"];

// Outline of a shape (outside or axis rectangle units), clockwise on screen
// (y down), starting at the top-left. -> [[x, y], ...] or throws on bad input.
export function outline(kind, p) {
  const W = +p.width, D = +p.depth;
  if (!(W > 0 && D > 0)) throw new Error("size");
  if (kind === "rect") return [[0, 0], [W, 0], [W, D], [0, D]];
  if (kind === "L") {
    const a = +p.cutWidth, b = +p.cutDepth;
    if (!(a > 0 && b > 0 && a < W && b < D)) throw new Error("cut");
    const pts = {
      ne: [[0, 0], [W - a, 0], [W - a, b], [W, b], [W, D], [0, D]],
      nw: [[a, 0], [W, 0], [W, D], [0, D], [0, b], [a, b]],
      se: [[0, 0], [W, 0], [W, D - b], [W - a, D - b], [W - a, D], [0, D]],
      sw: [[0, 0], [W, 0], [W, D], [a, D], [a, D - b], [0, D - b]],
    }[p.corner || "ne"];
    if (!pts) throw new Error("corner");
    return pts;
  }
  if (kind === "T") {
    const bd = +p.barDepth, sw = +p.stemWidth;
    if (!(bd > 0 && bd < D && sw > 0 && sw < W)) throw new Error("stem");
    const x0 = (W - sw) / 2, x1 = x0 + sw;
    return [[0, 0], [W, 0], [W, bd], [x1, bd], [x1, D], [x0, D], [x0, bd], [0, bd]];
  }
  throw new Error("kind");
}

// Move every edge of a right-angled outline inwards by d (the outline must be
// clockwise on screen, as outline() returns it). At a convex corner the point
// moves diagonally inwards, at a concave one outwards - both v + d*(n1 + n2),
// n = the inward normals of the two edges.
export function inset(pts, d) {
  const n = pts.length;
  const inward = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return [-dy / L, dx / L]; // clockwise on screen: the inside is on the left of a -> b
  };
  return pts.map((v, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const n1 = inward(prev, v), n2 = inward(v, next);
    return [v[0] + d * (n1[0] + n2[0]), v[1] + d * (n1[1] + n2[1])];
  });
}

// Wall centre lines of a shape placed with its top-left (outside) corner at
// `at`: [[a, b], ...], a closed loop.
export function shapeWalls(kind, params, { at = [0, 0], thickness = 40, outside = true } = {}) {
  let pts = outline(kind, params);
  if (outside) pts = inset(pts, thickness / 2);
  pts = pts.map(([x, y]) => [round(x + at[0]), round(y + at[1])]);
  return pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
}

const round = (v) => Math.round(v * 100) / 100;
