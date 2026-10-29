// Icons of the devices drawn as a badge with a glyph (devices of type "icon").
// Each glyph fits a box of about +-5.5 units around (0, 0) and is stroked;
// only the icons a plan uses go into its <defs>.

export const ICON_KINDS = ["recuperator", "boiler", "plug", "media", "gate", "smoke", "co", "leak", "air",
  "thermostat", "trv", "fan", "purifier", "vacuum", "ev", "valve",
  "info", "bin", "mailbox", "irrigation", "weather", "solar", "battery",
  "doorbell", "power_strip", "router", "ap", "net_switch",
  "button", "gas", "lux", "vibration", "alarm_panel", "keypad", "siren", "nvr", "fireplace", "floor_heating", "water_tank", "heat_pump", "dehumidifier", "humidifier", "radiator", "amplifier", "set_top", "printer", "pool_pump", "rain", "intercom", "meter", "fuse_box", "inverter", "ups", "nas", "zigbee", "rack"];
// kinds that show their own entity's value under the icon when no other reading is set
// (a thermostat / TRV: current -> target temperature; a fan: its speed)
export const VALUE_KINDS = ["info", "bin", "weather", "solar", "battery", "thermostat", "trv", "fan", "meter", "inverter", "ups", "lux", "rain", "water_tank"];
// kinds that raise an alarm (red pulse) rather than just "working"
export const ALARM_KINDS = ["smoke", "co", "leak", "gas", "siren"];

// Drawn like small pictures of the things themselves (29.10): stroked in the badge's colour, with a touch of
// colour where it helps - .ia-red / .ia-yellow / .ia-blue / .ia-green (fills, see theme.js)
const G = {
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
  battery: '<rect x="-3.4" y="-4" width="6.8" height="9" rx="1.1"/><path d="M-1.4 -5 H1.4" stroke-width="1.2"/><rect class="ia-green" x="-2.2" y="0" width="4.4" height="3.8" rx="0.5" stroke="none"/>',
};

export function iconDefs(kinds) {
  return [...new Set(kinds)].filter((k) => G[k])
    .map((k) => `    <g id="icon-${k}">${G[k]}</g>`).join("\n");
}
