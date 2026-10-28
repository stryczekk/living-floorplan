// Walls lying on one another become one: two shapes placed side by side share
// a wall instead of drawing it twice. Pure function on the model v2 (cm).
//
// Two walls merge when they are on the same line (within `eps`) and overlap
// along it by more than `eps`: the merged wall spans both, takes the stronger
// type (exterior > load bearing > partition) and the larger own thickness, and
// keeps the openings of both (those of the second wall re-measured from the
// new start; where two openings overlap, the first wall's one stays).
// Walls on one line that only touch end to end (one continues the other) become
// one long wall too, when they are of the same type and thickness; a wall meeting
// that point from the side then simply ends on the long wall (a T-joint).
// Chimney walls merge only with chimney walls.

const RANK = { exterior: 4, load_bearing: 3, partition: 1 };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const r2 = (v) => Math.round(v * 100) / 100;
const FLIP = { from: "to", to: "from", left: "right", right: "left" };

function mergeTwo(A, B, eps) {
  if ((A.type === "chimney") !== (B.type === "chimney")) return null;
  const d = sub(A.b, A.a), L = Math.hypot(d[0], d[1]);
  if (L < eps) return null;
  const u = [d[0] / L, d[1] / L];
  const off = (p) => Math.abs(sub(p, A.a)[0] * u[1] - sub(p, A.a)[1] * u[0]);
  if (off(B.a) > eps || off(B.b) > eps) return null;
  const ta = dot(sub(B.a, A.a), u), tb = dot(sub(B.b, A.a), u);
  const b0 = Math.min(ta, tb), b1 = Math.max(ta, tb);
  const overlap = Math.min(L, b1) - Math.max(0, b0);
  if (overlap < -eps) return null; // apart on the line
  if (overlap <= eps) {
    // end to end: one continues the other - one long wall, but only of the same kind and thickness
    // (an exterior wall does not run on as a partition)
    if (A.type !== B.type || (A.thickness || null) !== (B.thickness || null)) return null;
  }
  const lo = Math.min(0, b0), hi = Math.max(L, b1);
  const at = (t) => [r2(A.a[0] + u[0] * t), r2(A.a[1] + u[1] * t)];
  const strong = (RANK[B.type] || 0) > (RANK[A.type] || 0) ? B : A;
  const w = { ...A, type: strong.type, a: at(lo), b: at(hi) };
  const th = Math.max(A.thickness || 0, B.thickness || 0);
  if (th) w.thickness = th; else delete w.thickness;
  // openings: A's shifted by -lo; B's mapped into A's direction (flipped when B runs the other way)
  const same = ta <= tb;
  const ops = (A.openings || []).map((o) => ({ ...o, from: r2(o.from - lo), to: r2(o.to - lo) }));
  for (const o of B.openings || []) {
    let q;
    if (same) q = { ...o, from: r2(ta + o.from - lo), to: r2(ta + o.to - lo) };
    else {
      q = { ...o, from: r2(ta - o.to - lo), to: r2(ta - o.from - lo) };
      for (const k of ["hinge", "swing", "outside"]) if (q[k] in FLIP) q[k] = FLIP[q[k]];
    }
    if (!ops.some((p) => p.id === q.id || (q.from < p.to - eps && q.to > p.from + eps))) ops.push(q);
  }
  if (ops.length) w.openings = ops.sort((p, q) => p.from - q.from); else delete w.openings;
  return w;
}

// Merge overlapping walls of the model in place. -> how many walls went away.
export function mergeWalls(m, eps = 1) {
  let n = 0, again = true;
  while (again) {
    again = false;
    const W = m.walls;
    for (let i = 0; i < W.length && !again; i++) {
      for (let j = i + 1; j < W.length; j++) {
        const w = mergeTwo(W[i], W[j], eps);
        if (!w) continue;
        W[i] = w;
        W.splice(j, 1);
        n++;
        again = true;
        break;
      }
    }
  }
  return n;
}
