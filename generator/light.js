// The plan's light look: the generator draws in a dark palette, this swaps its
// colours (the same hex values the generator writes) for light ones; lights and
// alerts keep theirs. Used by the card's light theme and the editor's print export.

export const LIGHT = {
  "#000000": "#4a5263", // walls
  "#131a24": "#f6f8fa", // outlines, halos, keyholes
  "#161d28": "#eceff3", // unused rooms
  "#1b2433": "#e6ebf0", // sheet, zero of a map
  "#1e2836": "#fdfdfe", // rooms
  "#1f2a3b": "#e7ecf2", // stairs
  "#22302a": "#dcf2e4", // occupied room
  "#22394a": "#cfe7f5", // map: a little presence
  "#243040": "#e4e9ef", // furniture
  "#26324a": "#d6e3f5", // room tint: cold
  "#2c3a4d": "#d5dce5", // furniture details
  "#2f3a22": "#dcebc9", // map: a little light energy
  "#33282b": "#f9e1da", // heating room
  "#33302a": "#f7ead0", // room tint: warm
  "#36301f": "#f6e7c4", // room tint: dry
  "#384354": "#a3aebc", // doors
  "#3a4861": "#b6c0cc", // dividers, furniture outlines
  "#3d2626": "#f6d5d2", // room tint: hot
  "#44546f": "#9ba8b9", // furniture detail lines
  "#4a3f22": "#f3e3b5", // map: a little light
  "#5a6b86": "#98a5b7",
  "#5b6a80": "#8693a6", // icons and lamps that are off
  "#6b7f9c": "#8f9cb1", // stair lines
  "#6f8fb0": "#5f7fa0",
  "#6fc9ef": "#2a9ccc", // glass
  "#7c8ca3": "#66758a",
  "#8ea1ba": "#5b6b80", // labels, lock
  "#8fa3bd": "#7d91ab", // cover fabric
  "#c3cfdf": "#2b3442", // texts
  "#1d3347": "#cfe1f2", "#1f2f3d": "#d9e7f2", // room tint: humid
};

// A colour not in the table (furniture drawn in its own colours): dark ones turned
// light with their hue kept, bright ones (lights, alerts, accents) left alone.
export function lightOf(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(...v), mn = Math.min(...v), l = (mx + mn) / 2;
  if (l >= 0.42) return hex;
  const d = mx - mn;
  let h = 0;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === v[0] ? ((v[1] - v[2]) / d) % 6 : mx === v[1] ? (v[2] - v[0]) / d + 2 : (v[0] - v[1]) / d + 4;
  const L = 1 - l * 0.55, S = sat * 0.5;
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h % 6) + 6) % 6 % 2 - 1)), m = L - c / 2;
  const k = Math.floor(((h % 6) + 6) % 6);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][k];
  return "#" + [r, g, b].map((u) => Math.round((u + m) * 255).toString(16).padStart(2, "0")).join("");
}

export const paintLight = (c) => LIGHT[String(c).toLowerCase()] || (/^#[0-9a-fA-F]{6}$/.test(c) ? lightOf(c) : c);

// Every #rrggbb in a piece of SVG / CSS, swapped for the light palette.
export function lightSvg(text) {
  return text.replace(/#[0-9a-fA-F]{6}\b/g, (c) => LIGHT[c.toLowerCase()] || lightOf(c));
}

// The card's own colours (buttons, panels, texts on the plan) as CSS variables.
