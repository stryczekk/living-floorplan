#!/usr/bin/env python3
"""Structural diff of two plan SVGs: same elements, ids, classes, data-*, geometry.

Elements are matched by id; elements without id by (nearest ancestor id, tag,
position among such siblings). Numbers compare with a tolerance (default
0.011 - hand-written SVGs often mix 1 and 2 decimals), everything else as text with
whitespace collapsed. Comments, <style> and <desc> text are skipped (the theme
is checked by the pixel test, tools/compare-render.sh).
  python3 tools/compare-svg.py old.svg new.svg [tolerance]
Exit code 1 when anything differs.
"""
import re, sys
import xml.etree.ElementTree as ET

NS = "{http://www.w3.org/2000/svg}"
NUM = re.compile(r"-?\d+(?:\.\d+)?")
TOL = float(sys.argv[3]) if len(sys.argv) > 3 else 0.011
SKIP_ATTRS = {"data-generator"}


def tag(e):
    return e.tag.replace(NS, "")


def index(path):
    root = ET.parse(path).getroot()
    out = {}

    def walk(e, scope):
        counts = {}
        for c in e:
            if tag(c) in ("style", "desc"):
                continue
            if c.get("id"):
                key = "#" + c.get("id")
                child_scope = key
            else:
                t = tag(c)
                counts[t] = counts.get(t, 0) + 1
                key = f"{scope}/{t}[{counts[t]}]"
                child_scope = key
            out[key] = c
            walk(c, child_scope)

    out["<root>"] = root
    walk(root, "")
    return out


def norm(v):
    v = " ".join(v.replace(",", " ").split())
    # "rotate(90.00)" == "rotate(90)", "08" == "8"
    return NUM.sub("#", v), [float(x) for x in NUM.findall(v)]


def same(a, b):
    sa, na = norm(a)
    sb, nb = norm(b)
    return sa == sb and len(na) == len(nb) and all(abs(x - y) <= TOL for x, y in zip(na, nb))


def main():
    A, B = index(sys.argv[1]), index(sys.argv[2])
    diffs = []
    for k in A.keys() - B.keys():
        diffs.append(f"only in old: {k} <{tag(A[k])}>")
    for k in B.keys() - A.keys():
        diffs.append(f"only in new: {k} <{tag(B[k])}>")
    for k in A.keys() & B.keys():
        a, b = A[k], B[k]
        if tag(a) != tag(b):
            diffs.append(f"{k}: tag {tag(a)} != {tag(b)}")
        for at in (set(a.attrib) | set(b.attrib)) - SKIP_ATTRS:
            va, vb = a.get(at), b.get(at)
            if va is None or vb is None:
                diffs.append(f"{k}: @{at} old={va!r} new={vb!r}")
            elif not same(va, vb):
                diffs.append(f"{k}: @{at}\n    old={va.strip()[:200]!r}\n    new={vb.strip()[:200]!r}")
        ta, tb = (a.text or "").strip(), (b.text or "").strip()
        if ta != tb and not same(ta, tb):
            diffs.append(f"{k}: text {ta[:60]!r} != {tb[:60]!r}")
    for d in sorted(diffs):
        print(d)
    print(f"{len(A)} / {len(B)} elements, {len(diffs)} differences")
    sys.exit(1 if diffs else 0)


main()
