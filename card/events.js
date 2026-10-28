// Marks on the time travel line: the moments something happened - an alarm,
// a door unlocked, a camera that saw someone, anything listed under `events`.

import { normalizeAlerts, ruleActive } from "./alerts.js";

// `events:` items: { entity, state? | above? | below?, name?, color? } (as alerts, amber by default)
export function normalizeEvents(list) {
  return normalizeAlerts((Array.isArray(list) ? list : []).map((e) => ({ color: "#ffab40", ...e })));
}

// Moments in [start, end] when a rule became true: [{ t, rule }], from history rows [{ t, state }].
export function eventMarks(rules, hist, start, end) {
  const out = [];
  for (const rule of rules) {
    const rows = hist[rule.entity] || [];
    let was = null;
    for (const r of rows) {
      const now = ruleActive(rule, { state: r.state });
      if (now && was === false && r.t >= start && r.t <= end) out.push({ t: r.t, rule });
      // the first row is only the state at the start of the range, not a change
      was = now;
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

// Marks that would sit on top of each other (within `step` of the line) merged: [{ t, rule, n }].
export function clusterMarks(marks, start, end, step = 0.006) {
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
