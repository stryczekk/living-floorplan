// Lamps left on in an empty room: on for at least `minutes` while every
// presence / motion sensor of the room has been clear at least as long.
// Rooms without a sensor are never judged - nobody knows if they are empty.

import { isMotion } from "./trail.js";

const since = (s) => Date.parse(s.last_changed || s.last_updated);

// sources: roomSources(); states: hass.states -> [{ room, lights, since }]
export function forgottenLights(sources, states, now, minutes) {
  const ms = minutes * 60e3;
  const out = [];
  for (const [room, src] of Object.entries(sources || {})) {
    if (!src.presence.length || !src.lights.length) continue;
    const empty = src.presence.every((id) => {
      const s = states[id];
      return s && !["unavailable", "unknown"].includes(s.state) && !isMotion(s.state) && now - since(s) >= ms;
    });
    if (!empty) continue;
    const lamps = src.lights.filter((id) => { const s = states[id]; return s && s.state === "on" && now - since(s) >= ms; });
    if (lamps.length) out.push({ room, lights: lamps, since: Math.min(...lamps.map((id) => since(states[id]))) });
  }
  return out;
}
