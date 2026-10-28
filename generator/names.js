// Names the generated SVG uses for ids, classes and data-* attributes that a
// floor plan card reads, and for the state classes the card sets. One table,
// so a card with its own vocabulary can get it without forking the generator:
//   generateSvg(model, { names: { lock: "my-lock", ... } })
// Only the names that differ need to be given; the rest stay as below.
// Names not listed here (light, bulb, glow, cover, cover-hit, tv, climate-temp,
// room-*, clip-*, the layer ids) are fixed.

export const NAMES = {
  // groups and shared definitions
  rotation: "plan",                 // the group rotated by canvas.rotate
  deviceLabels: "device-labels",    // layer with appliance labels
  coverClosedIcon: "cover-closed",  // <defs> icon of a closed cover
  coverOpenIcon: "cover-open",      // <defs> icon of an open cover
  appliancePool: "appliance-pool",  // gradients
  acCoolPool: "ac-cool-pool",
  acHeatPool: "ac-heat-pool",
  waveKeyframes: "presence-wave",

  // classes
  hitArea: "hit-area",              // transparent click target of a device
  noSymbol: "no-symbol",            // door leaves and swings hidden
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

  pane: "pane",                     // one sash of a window divided into panes
  paneTick: "pane-tick",
  motion: "motion",                 // alarm motion detector (PIR)
  sensorFan: "sensor-fan",          // detection range of a motion / presence sensor
  iconDevice: "icon-device",        // devices drawn as an icon (catalogue in icons.js)
  iconBadge: "icon-badge",
  iconGlyph: "icon",
  deviceGlow: "device-glow",
  deviceValue: "device-value",

  // state classes - set by the card, styled here
  isOpen: "open",
  isArmed: "armed",                 // press-and-hold in progress
  isCovered: "covered",
  isUnknown: "unknown",
  isDetected: "detected",
  isMoving: "moving",
  isCooling: "cooling",
  isHeating: "heating",
  isDone: "done",
  isShown: "shown",                 // room labels visible
  isAlarm: "alarm",                 // smoke, CO, leak... detected
  isTilted: "tilted",               // a window tilted (contact sensors that know it)
  isOccupied: "occupied",           // a room tinted by presence

  // data-* attributes
  attrContract: "data-contract",
  attrName: "data-name",
  attrShort: "data-short",
  attrState: "data-state",
  attrEnd: "data-end",
  attrContact: "data-entity-contact",   // window / door contact sensor
  attrValue: "data-value-entity",       // a reading shown next to a device
  attrTintEntity: "data-tint-entity",   // room colouring
  attrTintKind: "data-tint-kind",
};

export function resolveNames(overrides) {
  const n = { ...NAMES, ...(overrides || {}) };
  for (const k of Object.keys(overrides || {})) if (!(k in NAMES)) throw new Error("unknown name key: " + k);
  return n;
}
