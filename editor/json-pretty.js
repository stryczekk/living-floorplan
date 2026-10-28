// JSON with short arrays and objects on one line: readable diffs of the model
// (the same layout as tools/json-pretty.py).
export function prettyJson(o, ind = 0) {
  const sp = "  ".repeat(ind);
  const one = (open, parts, close) => open + parts.join(", ") + close;
  if (Array.isArray(o)) {
    const parts = o.map((v) => prettyJson(v, ind + 1));
    const line = one("[", parts, "]");
    if (line.length + sp.length < 110 && !line.includes("\n")) return line;
    return "[\n" + parts.map((p) => sp + "  " + p).join(",\n") + "\n" + sp + "]";
  }
  if (o && typeof o === "object") {
    const keys = Object.keys(o);
    if (!keys.length) return "{}";
    const parts = keys.map((k) => `${JSON.stringify(k)}: ${prettyJson(o[k], ind + 1)}`);
    const line = one("{ ", parts, " }");
    if (line.length + sp.length < 110 && !line.includes("\n")) return line;
    return "{\n" + parts.map((p) => sp + "  " + p).join(",\n") + "\n" + sp + "}";
  }
  return JSON.stringify(o);
}
