# pdf.js

[pdf.js](https://github.com/mozilla/pdf.js) 4.10.38 (`pdfjs-dist`, Apache-2.0, see `LICENSE`): `build/pdf.min.mjs` and
`build/pdf.worker.min.mjs`, unchanged. The editor loads them from here (`pdfjs/` next to the editor page) to turn a
PDF underlay into a picture - nothing is fetched from the internet. `npm run build` copies them next to the editor in
`custom_components/living_floorplan/frontend/` and `dist/`.

Checked against the npm registry: `sha512-/Y3fcFrXEAsMjJXeL9J8+ZG9U01LbuWaYypvDW2ycW1jL269L3js3DVBjDJ0Up9Np1uqDXsDrRihHANhZOlwdQ==`
(the package tarball).
