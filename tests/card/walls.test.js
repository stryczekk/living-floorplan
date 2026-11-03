// Walls that meet: a wall ending inside another wall's thickness reaches its far face (no gap between them).
import { test } from "node:test";
import assert from "node:assert/strict";
import { wallPolygons } from "../../generator/model-v2.js";

const model = (walls) => ({ version: 2, wall_types: { exterior: { thickness: 45 }, partition: { thickness: 12 } }, walls });
const maxX = (polys) => Math.max(...polys.flat().map((p) => p[0]));

test("a wall stopping short of another wall's centre line runs on to its far face", () => {
  // the outside wall of x = 1005 (faces 982.5 and 1027.5); the other one drawn to x = 1000 and to x = 1020
  for (const end of [1000, 1020]) {
    const m = model([{ type: "exterior", a: [1005, 1030], b: [1005, 1215] }, { type: "exterior", a: [end, 1030], b: [665, 1030] }]);
    assert.equal(Math.round(maxX(wallPolygons(m, m.walls[1])) * 10) / 10, 1027.5, "ends at " + end);
  }
});

test("a free end (in no other wall) stays where it was drawn", () => {
  const m = model([{ type: "exterior", a: [1005, 1030], b: [1005, 1215] }, { type: "exterior", a: [900, 1030], b: [665, 1030] }]);
  assert.equal(maxX(wallPolygons(m, m.walls[1])), 900);
});
