// Time travel: the house as it was at a moment, from the recorder's history.

// History rows of the WebSocket API (compressed: s = state, a = attributes,
// lu / lc = last updated / changed in seconds) -> [{ t (ms), state, attributes }]
// sorted by time; attributes carried over from the row before when missing.
export function normalizeHistory(history) {
  const out = {};
  for (const [id, rows] of Object.entries(history || {})) {
    let attrs = {};
    out[id] = (rows || []).map((r) => {
      if (r.a) attrs = r.a;
      return { t: ((r.lu !== undefined ? r.lu : r.lc) || 0) * 1000, state: String(r.s), attributes: attrs };
    }).sort((a, b) => a.t - b.t);
  }
  return out;
}

// The row in effect at time t (the last one at or before t), or null before the first.
export function rowAt(rows, t) {
  let lo = 0, hi = rows.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].t <= t) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best >= 0 ? rows[best] : null;
}

// A states lookup for the moment t: history where there is some, else the live
// state (entities the recorder skips keep their current look).
export function statesAt(hist, live, t) {
  return (id) => {
    const rows = hist[id];
    if (!rows || !rows.length) return live[id];
    const r = rowAt(rows, t) || rows[0];
    return { entity_id: id, state: r.state, attributes: { ...((live[id] && live[id].attributes) || {}), ...r.attributes }, last_updated: String(r.t) };
  };
}
