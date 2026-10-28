// The light theme's colour swap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { lightOf, lightSvg, paintLight } from "../../card/theme.js";

test("known colours come from the table", () => {
  assert.equal(paintLight("#1e2836"), "#fdfdfe");
  assert.equal(lightSvg('<rect fill="#000000"/><g stroke="#6FC9EF"/>'), '<rect fill="#4a5263"/><g stroke="#2a9ccc"/>');
});

test("other dark colours turn light, bright ones stay", () => {
  const l = lightOf("#2a3961");
  const lum = (h) => [1, 3, 5].reduce((a, i) => a + parseInt(h.slice(i, i + 2), 16), 0) / 3;
  assert.ok(lum(l) > 200, l);
  assert.equal(lightOf("#ffc300"), "#ffc300");
  assert.equal(lightOf("#e53935"), "#e53935");
  assert.equal(lightOf("#000000"), "#ffffff");
});
