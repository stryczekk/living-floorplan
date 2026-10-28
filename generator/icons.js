// Icons of the devices drawn as a badge with a glyph (devices of type "icon").
// Each glyph fits a box of about +-5.5 units around (0, 0) and is stroked;
// only the icons a plan uses go into its <defs>.

export const ICON_KINDS = ["recuperator", "boiler", "plug", "media", "gate", "smoke", "co", "leak", "air",
  "thermostat", "trv", "fan", "purifier", "vacuum", "ev", "valve",
  "info", "bin", "mailbox", "irrigation", "weather", "solar", "battery"];
// kinds that show their own entity's value under the icon when no other reading is set
// (a thermostat / TRV: current -> target temperature; a fan: its speed)
export const VALUE_KINDS = ["info", "bin", "weather", "solar", "battery", "thermostat", "trv", "fan"];
// kinds that raise an alarm (red pulse) rather than just "working"
export const ALARM_KINDS = ["smoke", "co", "leak"];

const G = {
  recuperator: '<rect x="-5" y="-4" width="10" height="8" rx="1"/><path d="M-3.5 -1.5 H3 M1.2 -3.2 L3 -1.5 L1.2 0.2 M3.5 1.5 H-3 M-1.2 -0.2 L-3 1.5 L-1.2 3.2"/>',
  boiler: '<path d="M0 -5 C2 -2 4 0 2.6 3 C1.6 5 -1.6 5 -2.6 3 C-4 0 -1 -1 0 -5 Z M0 1 C1 2 1 3.4 0 4 C-1 3.4 -1 2 0 1 Z"/>',
  plug: '<path d="M-2 -4 V-1 M2 -4 V-1 M-4 -1 H4 V0.5 A4 4 0 0 1 -4 0.5 Z M0 4.5 V6"/>',
  media: '<rect x="-3.5" y="-5" width="7" height="10" rx="1"/><circle cx="0" cy="1.6" r="2"/><circle cx="0" cy="-2.6" r="0.7"/>',
  gate: '<path d="M-5 -4.5 V4.5 M5 -4.5 V4.5 M-5 -2 H5 M-5 2 H5 M-2.5 -2 V2 M0 -2 V2 M2.5 -2 V2"/>',
  smoke: '<circle cx="0" cy="0" r="4.6"/><circle cx="0" cy="0" r="1.4"/><path d="M-3 -3 L-2 -2 M3 -3 L2 -2 M-3 3 L-2 2 M3 3 L2 2"/>',
  co: '<circle cx="0" cy="0" r="4.8"/><text x="0" y="1.6" text-anchor="middle" font-size="4.2" font-family="system-ui, sans-serif" stroke="none" fill="currentColor">CO</text>',
  leak: '<path d="M0 -5 C2 -2 4 0 4 2 A4 4 0 0 1 -4 2 C-4 0 -2 -2 0 -5 Z"/>',
  air: '<circle cx="0" cy="0" r="4.8"/><text x="0" y="1.4" text-anchor="middle" font-size="3.4" font-family="system-ui, sans-serif" stroke="none" fill="currentColor">CO₂</text>',
  thermostat: '<circle cx="0" cy="0" r="4.8"/><path d="M0 0 L2.6 -2.6"/><circle cx="0" cy="0" r="0.8"/>',
  trv: '<path d="M-5 -3 V3 M-2.5 -4 V4 M0 -4 V4 M2.5 -4 V4 M5 -3 V3 M-5 3 H5"/>',
  fan: '<circle cx="0" cy="0" r="5.6" fill="none" stroke="none"/><path d="M0 0 C1 -4.5 4.5 -3 3 -0.8 Z M0 0 C3.4 2.2 1.2 5.4 -1 4.2 Z M0 0 C-4.5 1 -4.4 -3 -2.2 -3.4 Z"/><circle cx="0" cy="0" r="0.8"/>',
  purifier: '<rect x="-4" y="-5" width="8" height="10" rx="1.5"/><path d="M-2 -2 H2 M-2 0 H2 M-2 2 H2"/>',
  vacuum: '<circle cx="0" cy="0" r="5"/><circle cx="0" cy="0.8" r="1.6"/><path d="M-3 -2.6 H3"/>',
  ev: '<path d="M1 -5 L-3 1 H0 L-1 5 L3 -1 H0 Z"/>',
  valve: '<path d="M-5 -3 L5 3 V-3 L-5 3 Z M0 0 V-5 M-2 -5 H2"/>',
  info: '<circle cx="0" cy="0" r="4.8"/><path d="M0 -0.6 V3"/><circle cx="0" cy="-2.6" r="0.6" fill="currentColor"/>',
  bin: '<path d="M-4 -3 H4 M-1.6 -3 V-4.4 H1.6 V-3 M-3.2 -3 L-2.4 5 H2.4 L3.2 -3 M-0.8 -1 V3 M0.8 -1 V3"/>',
  mailbox: '<path d="M-5 4 V-1 A3 3 0 0 1 1 -1 V4 Z M1 -4 H4.5 V-1 M-2 -1 A1 1 0 0 1 -2 -1.01 M-5 4 H5 V-1 A3 3 0 0 0 1 -4"/>',
  irrigation: '<path d="M0 5 V0 M0 0 C-1 -2 -3 -2.5 -4.5 -2 M0 0 C1 -2 3 -2.5 4.5 -2 M0 0 V-4.5 M-3 3 H3"/>',
  weather: '<circle cx="-1.6" cy="-1.4" r="2.4"/><path d="M-1.6 -5.4 V-4.6 M-5.6 -1.4 H-4.8 M-4.4 -4.2 L-3.8 -3.6 M1.2 -4.2 L0.6 -3.6 M-1 4.4 H3.4 A2.2 2.2 0 0 0 3.4 0 A3 3 0 0 0 -2.2 1 A1.8 1.8 0 0 0 -1 4.4 Z"/>',
  solar: '<path d="M-5 3 L-3 -3 H5 L3 3 Z M-4 0 H4 M-1 -3 L-2 3 M2 -3 L1 3"/>',
  battery: '<rect x="-3.5" y="-4" width="7" height="9" rx="1"/><path d="M-1.5 -5 H1.5 M-1.5 0 H1.5 M0 -1.5 V1.5"/>',
};

export function iconDefs(kinds) {
  return [...new Set(kinds)].filter((k) => G[k])
    .map((k) => `    <g id="icon-${k}">${G[k]}</g>`).join("\n");
}
