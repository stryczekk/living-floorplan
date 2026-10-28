// Light and dark look of the card. The plan generator draws in a dark palette;
// the light theme swaps its colours for light ones (the same hex values the
// generator writes), lights and alerts keep theirs.

import { LIGHT, lightOf, paintLight, lightSvg } from "../generator/light.js";

export { LIGHT, lightOf, paintLight, lightSvg };

export const PALETTES = {
  dark: { bg: "#131a24", panel: "rgba(27, 36, 51, 0.92)", solid: "#1b2433", line: "#2a3547", lineHi: "#3d4b63",
    text: "#c3cfdf", text2: "#8a99ae", halo: "#131a24", accent: "#ffc300", ink: "#131a24", blend: "screen" },
  light: { bg: "#f6f8fa", panel: "rgba(255, 255, 255, 0.94)", solid: "#e6ebf0", line: "#cdd5df", lineHi: "#9fadbd",
    text: "#2b3442", text2: "#5f6d80", halo: "#ffffff", accent: "#b07a00", ink: "#ffffff", blend: "multiply" },
};

export function paletteCss(name, accent) {
  const p = PALETTES[name] || PALETTES.dark;
  return `--fc-bg: ${p.bg}; --fc-panel: ${p.panel}; --fc-solid: ${p.solid}; --fc-line: ${p.line}; --fc-line-hi: ${p.lineHi};` +
    ` --fc-text: ${p.text}; --fc-text2: ${p.text2}; --fc-halo: ${p.halo}; --fc-accent: ${accent || p.accent}; --fc-ink: ${p.ink};` +
    ` --fc-blend: ${p.blend};`;
}
