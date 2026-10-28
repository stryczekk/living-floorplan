// Build the card, the editor page and the panel for Home Assistant:
//   node tools/build.mjs   ->  dist/ and custom_components/living_floorplan/frontend/
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";

await build({
  entryPoints: ["card/card.js"],
  bundle: true,
  format: "esm",
  target: "es2020",
  outfile: "dist/living-floorplan-card.js",
  legalComments: "none",
  banner: { js: "// Living Floor Plan - card (MIT)" },
});
console.log("dist/living-floorplan-card.js");

// The floor plan editor as one page (JS, CSS and the example house inside), served next to the card:
// the integration serves it as its panel - on Home Assistant's own address, so it signs in with HA.
const ed = await build({ entryPoints: ["editor/editor.js"], bundle: true, format: "esm", target: "es2022", write: false, legalComments: "none" });
const js = ed.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync("editor/editor.css", "utf8");
const example = readFileSync("examples/house.json", "utf8").replace(/<\/script/gi, "<\\/script");
let html = readFileSync("editor/index.html", "utf8");
html = html.replace('<link rel="stylesheet" href="editor.css">', () => "<style>\n" + css + "\n</style>");
// the build shown in the editor's status bar: the integration's version and when it was built (Polish time)
const ver = JSON.parse(readFileSync("custom_components/living_floorplan/manifest.json", "utf8")).version;
const built = new Date().toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const buildLabel = `${ver} · ${built}`;
html = html.replace('<script type="module" src="editor.js"></script>', () =>
  "<script>window.FLOORPLAN_EXAMPLE = " + example.trim() + ";\nwindow.FLOORPLAN_BUILD = " + JSON.stringify(buildLabel) + ";</script>\n<script type=\"module\">\n" + js + "\n</script>");
if (html.includes('src="editor.js"') || html.includes('href="editor.css"')) throw new Error("editor page: placeholders not replaced");
writeFileSync("dist/living-floorplan-editor.html", "<!-- Living Floor Plan - editor -->\n" + html);
console.log("dist/living-floorplan-editor.html", Math.round(html.length / 1024) + " kB");

// The Home Assistant integration carries them all: the card (loaded on every dashboard), the editor
// (its panel) and the panel itself - custom_components/living_floorplan/frontend/
import { mkdirSync, copyFileSync } from "node:fs";
const FE = "custom_components/living_floorplan/frontend";
mkdirSync(FE, { recursive: true });
copyFileSync("dist/living-floorplan-card.js", FE + "/living-floorplan-card.js");
copyFileSync("dist/living-floorplan-editor.html", FE + "/editor.html");
await build({ entryPoints: ["card/panel.js"], bundle: true, format: "esm", target: "es2020", outfile: FE + "/panel.js", legalComments: "none",
  define: { __PANEL_BUILD__: JSON.stringify(buildLabel) } });
console.log(FE + "/ (card, editor, panel)");
