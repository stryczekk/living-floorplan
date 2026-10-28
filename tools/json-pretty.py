#!/usr/bin/env python3
"""JSON with short arrays and objects on one line (readable diffs of the model).
  python3 tools/json-pretty.py < in.json > out.json"""
import json, sys


def dump(o, ind=0):
    sp = "  " * ind
    if isinstance(o, dict):
        if not o:
            return "{}"
        one = "{ " + ", ".join(f'{json.dumps(k, ensure_ascii=False)}: {dump(v, ind + 1)}' for k, v in o.items()) + " }"
        if len(one) + len(sp) < 110 and "\n" not in one:
            return one
        items = [f'{sp}  {json.dumps(k, ensure_ascii=False)}: {dump(v, ind + 1)}' for k, v in o.items()]
        return "{\n" + ",\n".join(items) + "\n" + sp + "}"
    if isinstance(o, list):
        one = "[" + ", ".join(dump(v, ind + 1) for v in o) + "]"
        if len(one) + len(sp) < 110 and "\n" not in one:
            return one
        return "[\n" + ",\n".join(sp + "  " + dump(v, ind + 1) for v in o) + "\n" + sp + "]"
    return json.dumps(o, ensure_ascii=False)


print(dump(json.load(sys.stdin)))
