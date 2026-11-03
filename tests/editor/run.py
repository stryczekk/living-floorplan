#!/usr/bin/env python3
"""Browser test of the editor: real mouse and keyboard events through Chrome
DevTools on headless Chromium, no Home Assistant.
  python3 tests/editor/run.py           -> results, exit code 1 on failure
  SHOT=/tmp/editor.png python3 ...      -> also a screenshot at the end
"""
import base64, json, os, shutil, socket, struct, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repository root
PORT = int(os.environ.get("PORT", 8771))
DBG = 9341
DATA = Path(tempfile.mkdtemp())                     # the server's plan, versions and SVG (empty at start)
srv = subprocess.Popen(["node", str(ROOT / "tools" / "serve.mjs"), "--data", str(DATA), "--port", str(PORT), "--publish"], cwd=ROOT,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.5)
prof = tempfile.mkdtemp()
chrome = subprocess.Popen(["chromium", "--headless", "--no-sandbox", "--disable-gpu", f"--remote-debugging-port={DBG}",
                           "--user-data-dir=" + prof, "--window-size=1280,800", "about:blank"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(50):
    try:
        tabs = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{DBG}/json").read()); break
    except Exception:
        time.sleep(0.2)
ws_url = [t for t in tabs if t["type"] == "page"][0]["webSocketDebuggerUrl"]
s = socket.create_connection(("127.0.0.1", DBG))
key = base64.b64encode(os.urandom(16)).decode()
s.sendall(f"GET {ws_url.split(str(DBG), 1)[1]} HTTP/1.1\r\nHost: 127.0.0.1:{DBG}\r\nUpgrade: websocket\r\n"
          f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n".encode())
buf = b""
while b"\r\n\r\n" not in buf:
    buf += s.recv(4096)
buf = buf.split(b"\r\n\r\n", 1)[1]


def send(o):
    d = json.dumps(o).encode(); m = os.urandom(4); n = len(d)
    h = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack(">H", n) if n < 65536
                         else bytes([0x80 | 127]) + struct.pack(">Q", n))
    s.sendall(h + m + bytes(b ^ m[i % 4] for i, b in enumerate(d)))


def recv():
    global buf
    def need(k):
        global buf
        while len(buf) < k:
            buf += s.recv(65536)
    need(2); n = buf[1] & 0x7F; off = 2
    if n == 126: need(4); n = struct.unpack(">H", buf[2:4])[0]; off = 4
    elif n == 127: need(10); n = struct.unpack(">Q", buf[2:10])[0]; off = 10
    need(off + n); d = buf[off:off + n]; buf = buf[off + n:]
    return json.loads(d)


mid = [0]
def call(method, **params):
    mid[0] += 1; send({"id": mid[0], "method": method, "params": params})
    while True:
        r = recv()
        if r.get("id") == mid[0]:
            return r.get("result", r)


def ev(js):
    r = call("Runtime.evaluate", expression=js, awaitPromise=True, returnByValue=True)
    if "exceptionDetails" in r:
        raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", r))
    return r.get("result", {}).get("value")


def screen(p):
    return ev(f"floorplanEditor.toScreen({json.dumps(p)})")


def mouse(kind, x, y, button="left", shift=False, ctrl=False):
    call("Input.dispatchMouseEvent", type=kind, x=x, y=y, button=button, buttons=0 if kind == "mouseReleased" or button == "none" else 1,
         clickCount=1, modifiers=(8 if shift else 0) | (2 if ctrl else 0))


def move(p, shift=False):
    x, y = screen(p); mouse("mouseMoved", x, y, button="none", shift=shift); time.sleep(0.03)


def click(p, shift=False):
    x, y = screen(p)
    mouse("mouseMoved", x, y, button="none", shift=shift)
    mouse("mousePressed", x, y, shift=shift); mouse("mouseReleased", x, y, shift=shift)
    time.sleep(0.35)  # past the double-click window


def drag(p, q, steps=6):
    x0, y0 = screen(p); x1, y1 = screen(q)
    mouse("mouseMoved", x0, y0, button="none"); mouse("mousePressed", x0, y0)
    for i in range(1, steps + 1):
        mouse("mouseMoved", x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps)
        time.sleep(0.02)
    mouse("mouseReleased", x1, y1); time.sleep(0.1)


KEYS = {"Enter": 13, "Escape": 27, "Delete": 46, "Backspace": 8, "Tab": 9}
def key(k, ctrl=False, shift=False):
    code = KEYS.get(k, ord(k.upper()) if len(k) == 1 else 0)
    mods = (2 if ctrl else 0) | (8 if shift else 0)
    call("Input.dispatchKeyEvent", type="keyDown", key=k, windowsVirtualKeyCode=code, modifiers=mods,
         **({"text": k} if len(k) == 1 and not ctrl else {}))
    call("Input.dispatchKeyEvent", type="keyUp", key=k, windowsVirtualKeyCode=code, modifiers=mods)


def type_text(t):
    for ch in t:
        key(ch)


results = []
def check(name, cond, info=""):
    results.append((bool(cond), name, info))


def walls():
    return json.loads(ev("JSON.stringify(floorplanEditor.model.walls)"))


try:
    call("Page.enable")
    call("Page.navigate", url=f"http://127.0.0.1:{PORT}/editor/?lang=en"); time.sleep(1.5)
    # tests run without animations (the users get them), and with the right panel always in its column: the
    # scenario's clicks and snapping count on a plan area that does not change with the selection
    ev("(() => { const st = document.createElement('style'); st.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; } "
       "main, main.has-sel { grid-template-columns: 256px minmax(0, 1fr) 270px; } #panel { display: block; }'; document.head.append(st); return 1; })()")
    ev("localStorage.clear(); floorplanEditor.load(floorplanEditor.emptyModel(), ''); "
       "floorplanEditor.state.view = {cx: 500, cy: 400, s: 0.8}; 1")
    # the scenario below counts on a fixed 10 cm grid (the default is "auto")
    ev("(() => { const g = document.getElementById('s-grid'); g.value = '10'; g.dispatchEvent(new Event('change')); })()")
    time.sleep(0.3)

    # 1. outline 800 x 600 with typed lengths, closed by clicking the start
    key("w")
    click([100, 100])
    move([300, 100]); type_text("800"); key("Enter")
    move([900, 300]); type_text("600"); key("Enter")
    move([500, 700]); type_text("800"); key("Enter")
    click([100, 100])
    W = walls()
    check("4 walls drawn", len(W) == 4, len(W))
    check("outline corners", [w["a"] for w in W] == [[100, 100], [900, 100], [900, 700], [100, 700]], [w["a"] for w in W])
    check("closed: last wall ends at start", W and W[-1]["b"] == [100, 100], W and W[-1]["b"])
    check("type exterior", all(w["type"] == "exterior" for w in W))
    check("chain ended after closing", ev("floorplanEditor.state.draw === null"))

    # 2. partition from the top wall's axis to the bottom one (T-joints)
    ev("document.querySelector('[data-pick=walltype][data-value=partition]').click(); 1")
    click([403, 102])
    click([398, 697])
    key("Escape")
    W = walls()
    check("partition snapped to both wall axes", len(W) == 5 and W[4]["a"] == [400, 100] and W[4]["b"] == [400, 700]
          and W[4]["type"] == "partition", W[4] if len(W) > 4 else W)

    # 3. 45 degree snapping, then cancel with Escape (one wall only)
    ev("floorplanEditor.state.view = {cx: 700, cy: 300, s: 0.8}; 1")
    click([1000, 100])
    move([1104, 207])
    snap = ev("JSON.stringify(floorplanEditor.state.snap)")
    check("45 degrees snap", json.loads(snap)["p"] in ([1100, 200], [1110, 210]), snap)
    key("Escape"); key("Escape")
    check("escape drew nothing", len(walls()) == 5)

    # 4. select and move the partition 100 cm to the right - its ends stay on the walls
    key("v")
    drag([400, 400], [500, 400])
    W = walls()
    check("partition moved", W[4]["a"] == [500, 100] and W[4]["b"] == [500, 700], W[4])
    check("outline untouched by the move", W[0]["a"] == [100, 100] and W[0]["b"] == [900, 100], W[0])

    # 5. drag a corner: both walls follow
    drag([900, 100], [1000, 100])
    W = walls()
    check("corner dragged, both walls follow", W[0]["b"] == [1000, 100] and W[1]["a"] == [1000, 100], (W[0], W[1]))

    # 6. undo / redo
    key("z", ctrl=True)
    check("undo corner", walls()[0]["b"] == [900, 100], walls()[0])
    key("z", ctrl=True, shift=True)
    check("redo corner", walls()[0]["b"] == [1000, 100], walls()[0])
    key("z", ctrl=True)

    # 7. panel: thickness and length of the selected wall
    click([250, 100])
    check("top wall selected", ev("floorplanEditor.state.sel") == 0, ev("floorplanEditor.state.sel"))
    ev("(() => { const i = document.getElementById('w-len'); i.value = '700'; i.dispatchEvent(new Event('change')); })()")
    W = walls()
    check("length set from the panel", W[0]["b"] == [800, 100] and W[1]["a"] == [800, 100], (W[0], W[1]))
    ev("(() => { const i = document.getElementById('w-thick'); i.value = '30'; i.dispatchEvent(new Event('change')); })()")
    check("thickness set", walls()[0].get("thickness") == 30, walls()[0])

    # 8. delete
    click([600, 400])  # empty space -> nothing selected
    click([500, 400])  # the partition
    key("Delete")
    check("partition deleted", len(walls()) == 4 and all(w["type"] == "exterior" for w in walls()), len(walls()))
    check("panel cleared after delete: only a hint (the right panel is for what is selected)", not ev("document.querySelector('#p-sel h3')")
          and ev("document.querySelector('#p-sel .empty') !== null"), ev("document.getElementById('p-sel').textContent.slice(0, 80)"))
    check("the right panel comes only with a selection (main.has-sel)", not ev("document.querySelector('main').classList.contains('has-sel')"))
    check("the rooms list is in the Rooms tool, the plan's settings and the help on the left",
          ev("!!document.querySelector('#rooms-list') && (document.querySelector('[data-open=plan]').click(), !!document.querySelector('#tb-plan #pl-rot')) && !!document.querySelector('[data-panel=help] #help-list li')"))

    # the start view: what the editor shows, kept in the model; removed again
    ev("document.getElementById('pl-start').click(); 1"); time.sleep(0.2)
    st = ev("JSON.stringify(floorplanEditor.state.model.canvas.start || null)")
    check("start view: set to what the editor shows", st and len(json.loads(st)) == 4 and json.loads(st)[2] > 0, st)
    check("start view: the panel says it is set and offers Show / Remove", ev("!!document.getElementById('pl-start-show') && !!document.getElementById('pl-start-del')"))
    ev("document.getElementById('pl-start-del').click(); 1"); time.sleep(0.2)
    check("start view: removed", ev("floorplanEditor.state.model.canvas.start === undefined"))

    # 9. the plan rendered without errors
    time.sleep(0.2)
    check("no drawing error", ev("document.getElementById('st-msg').textContent") == "",
          ev("document.getElementById('st-msg').textContent"))
    check("walls in the generated SVG", ev("document.querySelectorAll('#plan #wall-ext').length") == 1)
    check("autosaved", json.loads(ev("localStorage.getItem('floorplan-editor.model')"))["walls"] == walls())
    if os.environ.get("SHOT_NEW"):
        open(os.environ["SHOT_NEW"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))

    # 10. a shape with a 45 degree corner drawn with the mouse only
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 500, cy: 400, s: 0.8}; 1")
    ev("document.querySelector('[data-pick=walltype][data-value=exterior]').click(); 1")
    key("w")
    for p in ([100, 100], [702, 98], [903, 302], [898, 697], [100, 703], [100, 100]):
        click(p)
    W = walls()
    check("mouse outline with a 45 degree wall", [w["a"] for w in W] == [[100, 100], [700, 100], [900, 300], [900, 700], [100, 700]]
          and W[-1]["b"] == [100, 100], [w["a"] for w in W])
    check("45 degree outline renders", ev("document.getElementById('st-msg').textContent") == "")
    key("v")
    if os.environ.get("SHOT45"):
        time.sleep(0.3)
        open(os.environ["SHOT45"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))

    # 11. ready-made shapes (outside dimensions -> wall centre lines)
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1")
    ev("document.querySelector('[data-pick=walltype][data-value=exterior]').click(); 1")
    key("s")
    check("shape panel shown (tiles)", ev("document.querySelectorAll('#tb-shape [data-pick=shape]').length") == 3)
    click([100, 100])
    W = walls()
    check("rectangle 1000 x 800 outside -> axes 20 cm in", [w["a"] for w in W] == [[120, 120], [1080, 120], [1080, 880], [120, 880]]
          and W[-1]["b"] == [120, 120], [w["a"] for w in W])
    check("back to select after placing", ev("floorplanEditor.state.tool") == "select")
    key("z", ctrl=True)
    check("one undo removes the whole shape", len(walls()) == 0, len(walls()))

    def set_shape(kind, **params):
        ev(f"document.querySelector('[data-pick=shape][data-value={kind}]').click(); 1")
        for k, v in params.items():
            if k == "corner":
                ev(f"document.querySelector('[data-pick=corner][data-value={v}]').click(); 1")
            else:
                ev(f"(() => {{ const i = document.querySelector('[data-sp={k}]'); i.value = '{v}'; i.dispatchEvent(new Event('change')); }})()")

    key("s"); set_shape("L", width=1000, depth=800, cutWidth=400, cutDepth=300, corner="ne")
    click([100, 100])
    W = walls()
    check("L with the cut-out top right", [w["a"] for w in W] == [[120, 120], [680, 120], [680, 420], [1080, 420], [1080, 880], [120, 880]],
          [w["a"] for w in W])
    key("z", ctrl=True)
    key("s"); set_shape("T", width=1200, depth=900, barDepth=500, stemWidth=500)
    click([100, 100])
    check("T has 8 walls", len(walls()) == 8, len(walls()))
    key("z", ctrl=True)
    key("s"); set_shape("L", cutWidth=1000)  # as wide as the whole shape
    check("impossible L reported", "--warn" in ev("document.getElementById('tb-shape').innerHTML"))
    click([100, 100])
    check("impossible L not placed", len(walls()) == 0, len(walls()))
    ev("(() => { const i = document.querySelector('[data-sp=cutWidth]'); i.value = '400'; i.dispatchEvent(new Event('change')); })()")
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = false; c.dispatchEvent(new Event('change')); })()")
    set_shape("rect", width=500, depth=400)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = false; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    check("axis dimensions: corners exactly as given", [w["a"] for w in walls()] == [[100, 100], [600, 100], [600, 500], [100, 500]],
          [w["a"] for w in walls()])
    check("shapes render", ev("document.getElementById('st-msg').textContent") == "")
    if os.environ.get("SHOT_SHAPE"):
        key("s"); set_shape("L", width=900, depth=700, cutWidth=300, cutDepth=250, corner="sw"); move([700, 150])
        time.sleep(0.3)
        open(os.environ["SHOT_SHAPE"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
        key("Escape")

    # 12. openings: windows, doors, ... on walls
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1")
    ev("document.querySelector('[data-pick=walltype][data-value=exterior]').click(); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # axes: 120..1080 x 120..880
    def set_op(kind, width=None):
        # the tool's two tabs: windows (and balcony doors, HST) / doors
        tab = "doors" if kind in ("door", "double_door", "sliding_door", "pocket_door", "garage_door", "double_gate", "passage") else "windows"
        key("b" if tab == "doors" else "o")
        ev(f"document.querySelector('[data-pick=optype][data-value={kind}]').click(); 1")
        if width is None and kind == "window": width = 120   # the geometry below was laid out for 120 cm windows
        if width:
            ev(f"(() => {{ const i = document.getElementById('ot-width'); i.value = '{width}'; i.dispatchEvent(new Event('change')); }})()")
    ops = lambda i: walls()[i].get("openings", [])
    key("o"); set_op("window")
    click([400, 122])
    check("window on the north wall", ops(0) == [{"type": "window", "id": "window-1", "from": 220, "to": 340,
          "outside": "right", "facade": "north"}], ops(0))
    click([400, 122])
    check("no second opening on top of it", len(ops(0)) == 1, ops(0))
    set_op("door")
    click([600, 870])                      # south wall, cursor inside the house
    d = ops(2)[0] if ops(2) else {}
    check("door opens inwards, hinge at the start", d.get("type") == "door" and d.get("swing") == "left" and d.get("hinge") == "from"
          and d.get("facade") == "south", d)
    # a balcony door opens into the house even when put in from outside; a two-pane window
    set_op("balcony_door"); click([1095, 450])            # east wall, cursor outside
    bd = [o for o in ops(1) if o["type"] == "balcony_door"]
    check("balcony door: opens inwards whichever side it was put in from", bd and bd[0]["swing"] != bd[0]["outside"], bd)
    set_op("window_2"); click([800, 122])
    w2 = [o for o in ops(0) if o.get("panes")]
    check("window, two panes: a window of two panes, 150 cm", w2 and w2[0]["type"] == "window" and w2[0]["panes"] == 2 and w2[0]["to"] - w2[0]["from"] == 150, w2)
    check("windows and doors: two tools on the toolbar", ev("document.querySelectorAll('[data-pick=optype][data-value=door]').length") == 0
          and ev("document.querySelectorAll('.tool-h[data-optab]').length") == 2
          and ev("document.querySelector('.tool-h[data-optab=windows]').classList.contains('on')"))
    # a triple balcony door: the outer panes open, the middle one is fixed; panes of their own widths
    set_op("balcony_door_3"); click([330, 878])
    b3 = [o for o in ops(2) if o["type"] == "balcony_door" and o.get("panes") == 3]
    check("balcony door, triple: three panes, the outer ones open", b3 and b3[0]["pane_open"] == ["from", "fixed", "to"], b3)
    leaves = ev("(() => { const o = floorplanEditor.model.walls[2].openings.find((x) => x.panes === 3); return o ? document.querySelectorAll('#plan g[id^=\\\"' + o.id + '-leaf\\\"]').length : -1; })()")
    check("balcony door, triple: a leaf for each pane that opens", leaves == 2, leaves)
    ev("floorplanEditor.undo(); 1")
    ev("floorplanEditor.undo(); floorplanEditor.undo(); 1")
    # a corner window: one click near a corner glazes both walls; two lengths in its panel; deleted together
    snap0 = ev("JSON.stringify(floorplanEditor.model.walls)")
    set_op("corner_window"); click([1000, 122])           # north wall, near its east end
    cw = [(i, o) for i, w in enumerate(walls()) for o in w.get("openings", []) if o["type"] == "corner_window"]
    check("corner window: both walls of the corner get glass, joined", len(cw) == 2 and cw[0][0] != cw[1][0]
          and cw[0][1]["pair"] == cw[1][1]["id"] and cw[1][1]["pair"] == cw[0][1]["id"], cw)
    key("v"); click([1060, 120]); time.sleep(0.2)
    has = ev("!!document.getElementById('op-cw-a') && !!document.getElementById('op-cw-b')")
    ev("(() => { const i = document.getElementById('op-cw-b'); i.value = '100'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    lens = sorted(o["to"] - o["from"] for w in walls() for o in w.get("openings", []) if o["type"] == "corner_window")
    check("corner window: two lengths in its panel, the one round the corner changed", has and lens == [100, 150], (has, lens))
    glass = ev("document.querySelectorAll('#plan [id^=corner-window]').length")
    check("corner window: drawn on both walls", glass >= 2, glass)
    key("Delete"); time.sleep(0.2)
    key("Delete"); time.sleep(0.2)
    check("corner window: deleting it takes both halves", not [o for w in walls() for o in w.get("openings", []) if o["type"] == "corner_window"])
    check("corner window: the walls are as before", ev("JSON.stringify(floorplanEditor.model.walls)") == snap0)
    # both lengths set before placing it; the hover shows both halves
    set_op("corner_window")
    ev("(() => { for (const [id, v] of [['ot-width', '140'], ['ot-width2', '110']]) { const i = document.getElementById(id); i.value = v; i.dispatchEvent(new Event('change')); } })()")
    move([1000, 122])
    quads = ev("[...document.querySelectorAll('#overlay polygon.ov-preview')].filter((p) => p.getAttribute('points').trim().split(/\\s+/).length === 6).length")
    click([1000, 122])
    lens2 = sorted(o["to"] - o["from"] for w in walls() for o in w.get("openings", []) if o["type"] == "corner_window")
    check("corner window: both lengths set in the tool, one L shape shown while pointing", quads == 1 and lens2 == [110, 140], (quads, lens2))
    ends = json.loads(ev("JSON.stringify(floorplanEditor.model.walls.flatMap((w) => (w.openings || []).filter((o) => o.type === 'corner_window').map((o) => { "
                         "const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), u = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L], s = o.corner === 'to' ? o.to : o.from; "
                         "return [w.a[0] + u[0] * s, w.a[1] + u[1] * s, o.corner === 'to' ? o.to - L : -o.from]; })))"))
    check("corner window: both lengths measured from where the walls' centre lines meet",
          len(ends) == 2 and abs(ends[0][0] - ends[1][0]) < 0.6 and abs(ends[0][1] - ends[1][1]) < 0.6, ends)
    ev("floorplanEditor.undo(); 1")
    check("corner window: undo takes it back", ev("JSON.stringify(floorplanEditor.model.walls)") == snap0)
    key("v")
    click([400, 120])                      # the window (x 340..460)
    check("opening selected", ev("JSON.stringify(floorplanEditor.state.selOp)") == '{"w":0,"o":0}' and
          ev("document.querySelector('#p-sel h3').textContent").startswith("Window"), ev("JSON.stringify(floorplanEditor.state.selOp)"))
    types = json.loads(ev("JSON.stringify([...document.querySelectorAll('#p-sel [data-pick=op-type]')].map((b) => b.dataset.value))"))
    check("a window's type: only window kinds (no doors), a two-pane window among them", "door" not in types and "window_2" in types, types)
    ev("document.querySelector('#p-sel [data-pick=op-type][data-value=window_2]').click(); 1"); time.sleep(0.2)
    check("a window made two-pane from its panel", ops(0)[0].get("panes") == 2 and ops(0)[0]["type"] == "window"
          and ev("document.querySelectorAll('#plan .pane-tick').length") >= 1, ops(0)[0])
    sym = json.loads(ev("JSON.stringify((() => { const g = document.querySelector('#plan #window-1'); return g ? [g.querySelectorAll('polygon.frame').length, g.querySelectorAll('.frame-cross').length, g.querySelectorAll('.sill').length] : null; })())"))
    check("a window drawn as on the owner's drawing: one frame, blocks at both ends and between the sashes, no sills", sym == [1, 4, 0], sym)
    ev("document.querySelector('#p-sel [data-pick=op-type][data-value=window]').click(); 1"); time.sleep(0.2)
    drag([400, 120], [500, 120])
    check("window dragged along its wall", ops(0)[0]["from"] == 320 and ops(0)[0]["to"] == 440, ops(0))
    ev("(() => { const i = document.getElementById('op-width'); i.value = '200'; i.dispatchEvent(new Event('change')); })()")
    check("width keeps the centre", ops(0)[0]["from"] == 280 and ops(0)[0]["to"] == 480, ops(0))
    ev("(() => { const i = document.querySelector('[data-cover]'); i.value = 'cover.office'; i.dispatchEvent(new Event('change')); })()")
    check("cover attached", json.loads(ev("JSON.stringify(floorplanEditor.model.covers)")) == [{"entity": "cover.office", "window": "window-1"}])
    ev("document.querySelector('[data-pick=op-type][data-value=hst]').click(); 1")
    o0 = ops(0)[0]
    check("retyped to a sliding window with sashes, single cover dropped", o0["type"] == "hst" and set(o0.get("sashes", {})) == {"fixed", "sliding"}
          and json.loads(ev("JSON.stringify(floorplanEditor.model.covers)")) == [], o0)
    key("Delete")
    check("opening deleted", ops(0) == [], ops(0))
    click([600, 880]); key("r")
    check("R flips the door hinge", ops(2)[0]["hinge"] == "to", ops(2))
    # all eight types on the west wall (a = (120, 880) -> b = (120, 120))
    key("o")
    xs = {"window": 800, "hst": 640, "balcony_door": 480, "door": 360, "double_door": 220}
    for kind, y in xs.items():
        set_op(kind, 100 if kind not in ("hst", "double_door") else 130); click([118, y])
    set_op("sliding_door", 90); click([1078, 300])
    set_op("garage_door", 250); click([1078, 600])
    set_op("passage", 90); click([900, 878])
    types = sorted(o["type"] for w in walls() for o in w.get("openings", []))
    check("all eight opening types placed", types == sorted(["window", "hst", "balcony_door", "door", "double_door", "sliding_door",
          "garage_door", "passage", "door"]), types)
    time.sleep(0.2)
    check("openings render", ev("document.getElementById('st-msg').textContent") == "" and
          ev("document.querySelectorAll('#plan #window-1, #plan #sliding-window-1, #plan #garage-door-1').length") == 3,
          ev("document.getElementById('st-msg').textContent"))
    if os.environ.get("SHOT_OPEN"):
        key("v"); click([120, 640]); time.sleep(0.3)
        open(os.environ["SHOT_OPEN"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))

    # outline of a selected wall: its real shape, to both outer corners (a regression:
    # a copy of the wall used to meet itself at one end)
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1")
    ev("document.querySelector('[data-pick=walltype][data-value=exterior]').click(); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100]); key("v"); click([600, 120])
    pts = sorted(json.loads(ev("JSON.stringify(document.querySelector('#overlay .ov-sel').getAttribute('points').split(' ').map((p) => p.split(',').map(Number)))")))
    check("selected wall outlined to its corners, square ends", pts == sorted([[100, 100], [1100, 100], [1100, 140], [100, 140]]), pts)

    # 13. rooms from walls, virtual boundaries, zones
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1")
    def set_type(v):
        ev(f"document.querySelector('[data-pick=walltype][data-value={v}]').click(); 1")
    set_type("exterior")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # inner faces 140..1060 x 140..860
    set_type("partition"); key("w"); click([600, 122]); click([600, 878]); key("Escape"); key("Escape")
    rooms = lambda: json.loads(ev("JSON.stringify(floorplanEditor.model.rooms)"))
    key("p")
    click([300, 400]); click([800, 400])
    R = rooms()
    check("two rooms from the walls", [r["id"] for r in R] == ["room-1", "room-2"] and R[0]["at"] == [300, 400], R)
    area = lambda i: ev(f"(() => {{ const r = floorplanEditor.model.rooms[{i}]; return floorplanEditor.roomArea(r); }})()")
    check("room area on the wall faces (454 x 720 cm)", area(0) == 454 * 720 and area(1) == 454 * 720, (area(0), area(1)))
    click([50, 50])
    check("outside: not enclosed, no room", len(rooms()) == 2 and ev("document.getElementById('st-msg').textContent") != "")
    click([300, 300])
    check("click in a room selects it", len(rooms()) == 2 and ev("floorplanEditor.state.selRoom") == 0)
    ev("(() => { const i = document.getElementById('rm-name'); i.value = 'Kitchen'; i.dispatchEvent(new Event('change')); })()")
    check("room renamed", rooms()[0]["name"] == "Kitchen")
    key("l"); click([120, 500]); click([600, 500]); key("Escape")
    check("divider drawn", json.loads(ev("JSON.stringify(floorplanEditor.model.dividers)")) == [{"a": [120, 500], "b": [600, 500]}],
          ev("JSON.stringify(floorplanEditor.model.dividers)"))
    key("p"); click([300, 700])
    check("divider splits the area: 454 x 360 each", area(0) == 454 * 360 and area(2) == 454 * 360, (area(0), area(2)))
    time.sleep(0.2)
    svg_zone = ev("document.querySelectorAll('#plan clipPath[id^=clip-zone]').length")
    check("rooms split by a boundary share a zone", svg_zone == 1 and ev("document.querySelectorAll('#plan #rooms polygon').length") == 3, svg_zone)
    # the line can be dragged across itself; both rooms measured inside meanwhile
    key("v")
    x0, y0 = screen([360, 500]); x1, y1 = screen([360, 550])
    mouse("mouseMoved", x0, y0, button="none"); mouse("mousePressed", x0, y0)
    for i in range(1, 6): mouse("mouseMoved", x0, y0 + (y1 - y0) * i / 5); time.sleep(0.02)
    time.sleep(0.15)
    lab = json.loads(ev("JSON.stringify([...document.querySelectorAll('#overlay .ov-dim.live')].map((e) => e.textContent))"))
    mouse("mouseReleased", x1, y1); time.sleep(0.1)
    check("dividing line dragged, ends stay on the walls", json.loads(ev("JSON.stringify(floorplanEditor.model.dividers)")) == [{"a": [120, 550], "b": [600, 550]}],
          ev("JSON.stringify(floorplanEditor.model.dividers)"))
    check("while dragging the line: rooms on both sides measured (410 and 310 deep)", "410" in lab and "310" in lab, lab)
    key("z", ctrl=True)
    # the same line, but light stops at it: two rooms, no shared glow zone
    before_div = ev("JSON.stringify(floorplanEditor.model.dividers)")
    ev("floorplanEditor.model.dividers[0].blocks_light = true; floorplanEditor.load(JSON.parse(JSON.stringify(floorplanEditor.model)), ''); 1")
    time.sleep(0.3)
    check("a light-stopping line splits rooms without a zone", ev("document.querySelectorAll('#plan clipPath[id^=clip-zone]').length") == 0
          and ev("document.querySelectorAll('#plan #rooms polygon').length") == 3)
    ev("floorplanEditor.model.dividers[0] = " + before_div + "[0]; floorplanEditor.load(JSON.parse(JSON.stringify(floorplanEditor.model)), ''); 1")
    ev("floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1"); time.sleep(0.2)
    key("p"); key("Escape")
    set_type("partition"); key("v")
    x0, y0 = screen([600, 300]); x1, y1 = screen([700, 300])
    mouse("mouseMoved", x0, y0, button="none"); mouse("mousePressed", x0, y0)
    for i in range(1, 6): mouse("mouseMoved", x0 + (x1 - x0) * i / 5, y0); time.sleep(0.02)
    time.sleep(0.15)
    lab = json.loads(ev("JSON.stringify([...document.querySelectorAll('#overlay .ov-dim.live')].map((e) => e.textContent))"))
    mouse("mouseReleased", x1, y1); time.sleep(0.1)
    check("while moving a wall: both rooms measured inside (554 and 354 wide)", "554" in lab and "354" in lab, lab)
    key("z", ctrl=True)
    drag([600, 300], [700, 300])
    check("moving the wall changes the area (the boundary follows)", area(0) == 554 * 360 and area(1) == 354 * 720, (area(0), area(1)))
    click([360, 500]); key("Delete")
    check("boundary deleted", json.loads(ev("JSON.stringify(floorplanEditor.model.dividers)")) == [] and area(0) == 554 * 720, area(0))
    ev("floorplanEditor.model.rooms.push({id: 'hand', name: 'Hand', points: [[700,140],[1060,140],[1060,500],[700,500]], label: [880, 300]}); 1")
    ev("floorplanEditor.state.selRoom = 3; floorplanEditor.state.sel = null; document.getElementById('b-fit').click(); 1")
    key("Escape")
    ev("(() => { floorplanEditor.state.selRoom = 3; document.querySelector('[data-room]') ; })()")
    click([880, 300])
    ev("document.getElementById('rm-auto') && document.getElementById('rm-auto').click(); 1")
    R = rooms()
    hand = [r for r in R if r["id"] == "hand"]
    check("hand-drawn room taken from the walls", hand and "points" not in hand[0] and hand[0].get("at") == [880, 300], hand)
    key("Escape")
    ev("floorplanEditor.setTool('rooms'); 1")                # the list of rooms is in the Rooms tool
    check("two rooms in one area flagged, counted once", "⚠" in ev("document.getElementById('rooms-list').textContent") and
          "65,38" in ev("document.getElementById('rooms-list').textContent").replace(".", ","), ev("document.getElementById('rooms-list').textContent"))
    check("room list with the total", "m²" in ev("document.getElementById('rooms-list').textContent") and
          ev("document.querySelectorAll('#rooms-list .room-row').length") == 4, ev("document.getElementById('rooms-list').textContent")[:120])
    if os.environ.get("SHOT_ROOMS"):
        key("p"); move([300, 700]); time.sleep(0.3)
        open(os.environ["SHOT_ROOMS"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
        key("Escape")

    # 14. devices: lights, sensors, cameras, appliances, locks
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.6}; 1")
    set_type("exterior")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # inner faces 140..1060 x 140..860
    key("p"); click([600, 500])
    model = lambda k: json.loads(ev(f"JSON.stringify(floorplanEditor.model.{k} || [])"))
    def pick(kind):
        # a folded palette group opens first (clicking its name)
        ev(f"""(() => {{ for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {{
            if (document.querySelector('[data-pick=dev][data-value={kind}]')) break; h.click(); }}
          document.querySelector('[data-pick=dev][data-value={kind}]').click(); return 1; }})()""")
    def setf(k, v):
        if k == "kind":
            return ev(f"document.querySelector('[data-pick=df-kind][data-value={v}]').click(); 1")
        ev(f"(() => {{ const i = document.querySelector('[data-df={k}]'); if (i.type === 'checkbox') i.checked = {str(v).lower() if isinstance(v, bool) else 'false'}; else i.value = {json.dumps(str(v))}; i.dispatchEvent(new Event('change')); }})()")
    key("d"); pick("ceiling")
    click([400, 300])
    setf("entity", "light.kitchen")
    click([400, 500], shift=True); click([400, 700], shift=True)
    L = model("lights")
    check("ceiling light with three bulbs in the room", len(L) == 1 and L[0]["entity"] == "light.kitchen" and
          [b[:2] for b in L[0]["bulbs"]] == [[400, 300], [400, 500], [400, 700]] and L[0].get("room") == "room-1", L)
    pick("wall"); click([600, 150])
    check("wall light faces away from the north wall", model("lights")[1]["bulbs"][0] == [600, 150, 180], model("lights")[1])
    pick("rail"); click([700, 300]); click([900, 300]); key("Enter"); key("Escape"); key("d")
    check("track light from its corners", model("lights")[2]["rail"] == [[700, 300], [900, 300]], model("lights")[2])
    pick("strip"); click([700, 600]); click([900, 612])
    check("LED strip runs straight", model("lights")[3]["strip"] == [700, 599.5, 200, 1], model("lights")[3])
    pick("fixture"); click([600, 500])
    pick("presence"); click([300, 750])
    pick("climate"); click([200, 200]); setf("temperature", "sensor.t"); setf("humidity", "sensor.h")
    pick("camera"); click([1150, 300])
    pick("tv"); click([600, 840])
    pick("ac"); click([1040, 500])
    pick("appliance"); click([950, 750]); setf("alert", True)
    pick("lock"); click([500, 880]); setf("entity", "lock.front")
    counts = [len(model(k)) for k in ("lights", "devices", "climate", "cameras", "locks")]
    check("every device kind placed", counts == [5, 4, 1, 1, 1], counts)
    check("climate entities set", model("climate")[0]["temperature"] == "sensor.t" and model("climate")[0]["humidity"] == "sensor.h")
    check("appliance alert set", model("devices")[3].get("alert") is True, model("devices")[3])
    check("A/C on the east wall turned along it", model("devices")[2]["hit"][2] < model("devices")[2]["hit"][3], model("devices")[2])
    key("v")
    drag([400, 500], [450, 500])
    check("drag moves only the grabbed bulb", [b[:2] for b in model("lights")[0]["bulbs"]] == [[400, 300], [450, 500], [400, 700]],
          model("lights")[0]["bulbs"])
    click([1150, 300])
    check("camera selected", json.loads(ev("JSON.stringify(floorplanEditor.state.selDev)"))["list"] == "cameras")
    cam = model("cameras")[0]
    drag([1150, 300 + cam["range"]], [1250, 300])   # the direction handle (90 deg = down)
    cam = model("cameras")[0]
    check("camera direction and length from the handle", cam["direction"] == 0 and cam["range"] == 100, cam)
    setf("fov", 60)
    check("camera field of view from the panel", model("cameras")[0]["fov"] == 60)
    click([500, 880]); key("Delete")
    check("lock deleted", model("locks") == [])
    time.sleep(0.2)
    check("devices render", ev("document.getElementById('st-msg').textContent") == "" and
          ev("document.querySelectorAll('#plan .light').length") == 6 and ev("document.querySelectorAll('#plan .camera').length") == 1,
          ev("document.getElementById('st-msg').textContent"))
    if os.environ.get("SHOT_DEV"):
        click([1150, 300]); time.sleep(0.3)
        open(os.environ["SHOT_DEV"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))

    # 15. more devices: contacts and panes, room colouring, motion, icon devices
    key("d"); pick("motion"); click([300, 200]); setf("fov", 80)
    pick("smoke"); click([200, 650])
    pick("plug"); click([300, 650]); setf("entity", "switch.tree"); setf("value_entity", "sensor.tree_power")
    D = model("devices")
    check("motion detector and icon devices placed", [d["type"] for d in D[-3:]] == ["motion", "icon", "icon"] and
          D[-3]["fov"] == 80 and D[-1]["kind"] == "plug" and D[-1]["value_entity"] == "sensor.tree_power", D[-3:])
    key("v"); click([300, 750])                     # the presence sensor
    setf("has_range", True)
    check("presence sensor got a range", model("devices")[0].get("range") == 300, model("devices")[0])
    key("o"); set_op("window", 240); click([400, 122])
    key("v"); click([400, 120])
    ev("(() => { const i = document.getElementById('op-panes'); i.value = '3'; i.dispatchEvent(new Event('change')); })()")
    # each pane of a window opens by default: its contact in its row of the panes list
    for i in range(3):
        ev(f"(() => {{ const i = document.querySelector('[data-contact=\"{i}\"]'); i.value = 'binary_sensor.w{i}'; i.dispatchEvent(new Event('change')); }})()")
    win = [o for o in walls()[0]["openings"] if o["type"] == "window"][0]
    check("window with three panes and a contact per pane", win.get("panes") == 3 and win.get("contacts") == ["binary_sensor.w0", "binary_sensor.w1", "binary_sensor.w2"], win)
    ev("(() => { const s = document.querySelector('[data-pane-open=\"1\"]'); s.value = 'fixed'; s.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    win = [o for o in walls()[0]["openings"] if o["type"] == "window"][0]
    check("a pane made fixed: no contact field and its contact gone", win.get("contacts") == ["binary_sensor.w0", "", "binary_sensor.w2"]
          and not ev("document.querySelector('[data-contact=\"1\"]')"), win)
    ev("(() => { const s = document.querySelector('[data-pane-open=\"1\"]'); s.value = 'from'; s.dispatchEvent(new Event('change')); })()")
    ev("(() => { const i = document.querySelector('[data-contact=\"1\"]'); i.value = 'binary_sensor.w1'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    key("p"); click([600, 500]); key("v")
    ev("(() => { const s = document.getElementById('rm-tint-kind'); s.value = 'heating'; s.dispatchEvent(new Event('change')); })()")
    ev("(() => { const i = document.getElementById('rm-tint'); i.value = 'climate.living'; i.dispatchEvent(new Event('change')); })()")
    check("room is a floor-heating zone", model("rooms")[0].get("tint") == {"entity": "climate.living", "kind": "heating"}, model("rooms")[0])
    time.sleep(0.2)
    q = lambda sel: ev(f"document.querySelectorAll('#plan {sel}').length")
    check("new devices render", ev("document.getElementById('st-msg').textContent") == "" and q("[data-entity-contact]") == 3 and
          q(".pane-tick") == 2 and q("[data-tint-kind=heating]") == 1 and q(".icon-device") == 2 and q(".motion") == 1 and
          q(".sensor-fan") == 2 and q("#icon-smoke, #icon-plug") == 2,
          [q(x) for x in ("[data-entity-contact]", ".pane-tick", "[data-tint-kind=heating]", ".icon-device", ".motion", ".sensor-fan")])
    if os.environ.get("SHOT_DEV2"):
        key("d"); time.sleep(0.3)
        open(os.environ["SHOT_DEV2"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
        key("Escape")

    # 16. smooth dragging: the snapping step follows the zoom, live measurements
    ev("(() => { const g = document.getElementById('s-grid'); g.value = 'auto'; g.dispatchEvent(new Event('change')); })()")
    steps = [ev(f"(() => {{ floorplanEditor.state.view.s = {z}; return floorplanEditor.snapStep(); }})()") for z in (0.3, 0.8, 2, 6)]
    check("auto step: coarser zoomed out, finer zoomed in", steps == [20, 5, 2, 1], steps)
    ev("floorplanEditor.state.view = {cx: 600, cy: 500, s: 0.8}; 1")
    key("v")
    b = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[0])"))
    x0, y0 = screen(b[:2]); x1, y1 = screen([b[0] + 37, b[1] + 21])
    mouse("mouseMoved", x0, y0, button="none"); mouse("mousePressed", x0, y0)
    for i in range(1, 7):
        mouse("mouseMoved", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6); time.sleep(0.02)
    during = json.loads(ev("""JSON.stringify({rays: document.querySelectorAll('#overlay .ov-measure:not(.end)').length,
      labels: [...document.querySelectorAll('#overlay .ov-dim.live')].map((e) => e.textContent)})"""))
    if os.environ.get("SHOT_DRAG"):
        open(os.environ["SHOT_DRAG"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
    mouse("mouseReleased", x1, y1); time.sleep(0.1)
    nb = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[0])"))
    check("while dragging a lamp: distances to the walls on 4 sides", during["rays"] == 4 and len(during["labels"]) == 4
          and not any(x.startswith("Δ") for x in during["labels"]), during)
    check("fine steps: moved by 35 x 20 (5 cm grid at this zoom)", [nb[0] - b[0], nb[1] - b[1]] == [35, 20], (b, nb))
    key("z", ctrl=True)
    ev("floorplanEditor.state.view = {cx: 900, cy: 300, s: 0.8}; 1")
    x0, y0 = screen([1080, 120]); x1, y1 = screen([1100, 120])
    mouse("mouseMoved", x0, y0, button="none"); mouse("mousePressed", x0, y0)
    for i in range(1, 5): mouse("mouseMoved", x0 + (x1 - x0) * i / 4, y0); time.sleep(0.02)
    time.sleep(0.1)
    nd = json.loads(ev("JSON.stringify([...document.querySelectorAll('#overlay .ov-dim')].map((e) => e.textContent))"))
    mouse("mouseReleased", x1, y1); time.sleep(0.1)
    check("while dragging a corner: the outer dimension updates live", "1,020.5" in nd and not any(x.startswith("Δ") for x in nd), nd)
    check("corner ends where shown", walls()[0]["b"] == [1100, 120], walls()[0])
    key("z", ctrl=True)

    # 17. underlay: an image scaled by two points a known distance apart
    ev("floorplanEditor.state.view = {cx: 500, cy: 400, s: 0.8}; 1")
    ev("""(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300;
      const g = c.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#000'; g.fillRect(50, 50, 300, 10);
      floorplanEditor.setUnderlay(c.toDataURL()); })()""")
    time.sleep(0.5)
    check("underlay loaded, calibration tool on", ev("floorplanEditor.state.tool") == "calibrate" and ev("!!floorplanEditor.state.underlay"))
    u0 = json.loads(ev("JSON.stringify(floorplanEditor.state.underlay)"))
    click([300, 300]); click([500, 300])
    ev("(() => { const i = document.getElementById('ul-dist'); i.value = '400'; i.dispatchEvent(new Event('change')); })()")
    ev("document.getElementById('ul-apply').click(); 1")
    u1 = json.loads(ev("JSON.stringify(floorplanEditor.state.underlay)"))
    check("calibration: 200 cm picked, 400 cm real -> scale x2 around the first point",
          abs(u1["scale"] / u0["scale"] - 2) < 1e-6 and abs(u1["x"] - (300 + (u0["x"] - 300) * 2)) < 1e-6, (u0["scale"], u1["scale"]))
    drag([400, 400], [450, 400])
    check("underlay dragged", abs(json.loads(ev("JSON.stringify(floorplanEditor.state.underlay)"))["x"] - (u1["x"] + 50)) < 1e-6)
    ev("document.getElementById('ul-del').click(); 1")
    check("underlay removed", ev("floorplanEditor.state.underlay") is None and ev("floorplanEditor.state.tool") == "select")

    # 18. Home Assistant (optional: HA_URL and HA_TOKEN in the environment; read only)
    if os.environ.get("HA_URL") and os.environ.get("HA_TOKEN"):
        cfg = json.dumps({"url": os.environ["HA_URL"], "token": os.environ["HA_TOKEN"]})
        n = ev(f"floorplanEditor.ha.connect({cfg}).then(() => floorplanEditor.ha.states.size)")
        time.sleep(0.5)
        check("connected to Home Assistant", n > 50, n)
        check("entity suggestions filled", ev("document.querySelectorAll('#ha-entities option').length") == n)
        key("v"); click([600, 140])
        bad = ev("""(() => { const i = document.querySelector('[data-df=entity]'); if (!i) return null; i.value = 'light.does_not_exist';
          i.dispatchEvent(new Event('change')); return document.querySelector('[data-df=entity]').classList.contains('bad'); })()""")
        check("unknown entity marked", bad is True, bad)
        if (ROOT / "local" / "house.json").exists():   # a real house whose entities exist in that HA
            ev(f"floorplanEditor.load({(ROOT / 'local' / 'house.json').read_text()}, ''); 1"); time.sleep(1.5)
            ev("floorplanEditor.applyLive(true); 1"); time.sleep(0.5)
            res = json.loads(ev("""JSON.stringify((() => { const st = floorplanEditor.ha.states; const out = {ok: 0, bad: []};
              document.querySelectorAll('#plan .light[data-entity]').forEach((el) => { const on = st.get(el.dataset.entity)?.state === 'on';
                if (on === el.classList.contains('on')) out.ok++; else out.bad.push(el.dataset.entity); });
              out.temps = [...document.querySelectorAll('#plan .climate-temp')].map((e) => e.textContent);
              return out; })())"""))
            check("live: lights match Home Assistant", res["ok"] > 20 and not res["bad"], res)
            check("live: temperatures shown", res["temps"] and all(x != "—" for x in res["temps"][:6]), res["temps"])
            if os.environ.get("SHOT_LIVE"):
                time.sleep(0.3)
                open(os.environ["SHOT_LIVE"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
            ev("floorplanEditor.applyLive(false); 1")
        ev("floorplanEditor.ha.close(); 1")

    # 18b. a second click on the open tool's name folds its options, a third unfolds them
    vis = "getComputedStyle(document.querySelector('#tb-shape')).display"
    key("s"); shown = ev(vis)
    ev("document.querySelector('.tool-h[data-tool=shape]').click(); 1"); folded = ev(vis)
    still = ev("floorplanEditor.state.tool")
    ev("document.querySelector('.tool-h[data-tool=shape]').click(); 1"); again = ev(vis)
    ev("document.querySelector('.tool-h[data-tool=shape]').click(); 1"); key("o")
    check("sidebar: second click folds a tool, third unfolds, another tool opens unfolded",
          shown == "block" and folded == "none" and still == "shape" and again == "block"
          and ev("getComputedStyle(document.querySelector('#tb-opening-windows')).display") == "block"
          and ev("getComputedStyle(document.querySelector('#tb-opening-doors')).display") == "none", (shown, folded, still, again))
    key("Escape")

    # 18c. drawing tools: a drag pans the view and draws nothing, a click still draws
    for tk in ["w", "o", "l", "d", "p"]:
        key(tk)
        n0 = ev("JSON.stringify(floorplanEditor.model).length"); v0 = ev("floorplanEditor.state.view.cx")
        c = ev("[floorplanEditor.state.view.cx, floorplanEditor.state.view.cy]")
        drag(c, [c[0] + 80 / ev("floorplanEditor.state.view.s"), c[1]])
        check(f"tool {tk}: a drag pans and changes nothing", ev("JSON.stringify(floorplanEditor.model).length") == n0
              and ev("floorplanEditor.state.view.cx") != v0,
              (n0, ev("JSON.stringify(floorplanEditor.model).length"), v0, ev("floorplanEditor.state.view.cx"), screen([0, 0]), ev("floorplanEditor.state.tool")))
        key("Escape")
    ev("floorplanEditor.fit(); 1")

    # 18d. device palette groups fold; R turns the selected device
    key("d")
    tiles_n = lambda: ev("document.querySelectorAll('#tb-devices [data-pick=dev]').length")
    n0 = tiles_n()
    ev("document.querySelector('#tb-devices [data-group]').click(); 1"); n1 = tiles_n()
    ev("document.querySelector('#tb-devices [data-group]').click(); 1"); n2 = tiles_n()
    check("devices: a palette group folds and unfolds", n1 != n0 and n2 == n0, (n0, n1, n2))
    ev("floorplanEditor.state.model.lights = [{id: 'l-r', entity: '', kind: 'ceiling', bulbs: [[500, 500]]}]; floorplanEditor.state.selDev = {list: 'lights', i: 0, bulb: 0}; 1")
    key("v"); ev("floorplanEditor.state.selDev = {list: 'lights', i: 0, bulb: 0}; 1")
    key("r"); r1 = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[0])"))
    key("r", shift=True); key("r", shift=True); r2 = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[0])"))
    check("R turns a bulb by 90°, Shift+R back", r1 == [500, 500, 90] and r2 == [500, 500, 270], (r1, r2))
    ev("floorplanEditor.state.model.devices = [{id: 'tv-r', type: 'tv', entity: '', hit: [0, 0, 120, 10], glow: {at: [60, 5], rx: 110, ry: 88}}]; floorplanEditor.state.selDev = {list: 'devices', i: 0, bulb: 0}; 1")
    key("r"); h = json.loads(ev("JSON.stringify(floorplanEditor.model.devices[0].hit)"))
    check("R turns a TV's outline by 90°", round(h[2]) == 10 and round(h[3]) == 120, h)
    # a beam narrower than all around clips the glow (a wedge) and shows on the overlay
    ev("floorplanEditor.state.model.lights = [{id: 'l-b', entity: '', kind: 'ceiling', bulbs: [[500, 500, 90]]}]; floorplanEditor.state.selDev = {list: 'lights', i: 0, bulb: 0}; floorplanEditor.renderPanel(); 1")
    ev("(() => { const i = document.querySelector('[data-df=beam]'); i.value = '180'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.3)
    check("beam: the angle is saved and the glow gets a wedge clip",
          ev("floorplanEditor.model.lights[0].beam") == 180 and ev("!!document.querySelector('#plan clipPath#clip-beam-l-b polygon')")
          and ev("!!document.querySelector('#overlay .ov-beam')"),
          (ev("floorplanEditor.model.lights[0].beam"), ev("[...document.querySelectorAll('#plan clipPath')].map(c => c.id).join(',')"), ev("!!document.querySelector('#overlay .ov-beam')"), ev("document.getElementById('st-msg').textContent")))
    ev("(() => { const i = document.querySelector('[data-df=beam]'); i.value = ''; i.dispatchEvent(new Event('change')); })()")
    # power of the lamp (all its bulbs): saved in the model and written to the SVG for a card
    ev("(() => { const i = document.querySelector('[data-df=watts]'); i.value = '18'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.3)
    check("watts: the power is saved and the SVG carries data-watts",
          ev("floorplanEditor.model.lights[0].watts") == 18 and ev("!!document.querySelector('#plan [data-watts=\"18\"]')"),
          (ev("floorplanEditor.model.lights[0].watts"), ev("document.getElementById('st-msg').textContent")))
    check("beam: empty = all around again", ev("floorplanEditor.model.lights[0].beam === undefined"))
    key("Escape")

    # 18e. the card's frame follows the walls (plus the margin), and the panel sets the margin
    fr = lambda: ev("import('/generator/model-v2.js').then(g => g.frame(floorplanEditor.model).viewBox)")
    ev("floorplanEditor.renderPanel(); 1"); key("Escape")
    f0 = fr()
    ev("floorplanEditor.state.model.walls.forEach(w => { if (w.a[0] > 900) w.a = [w.a[0] + 100, w.a[1]]; if (w.b[0] > 900) w.b = [w.b[0] + 100, w.b[1]]; }); 1")
    f1 = fr()
    k = 17 / 30
    check("frame: a wall moved 1 m out widens the frame by 1 m", abs((f1[2] - f0[2]) - 100 * k) < 0.05, (f0, f1))
    ev("""(() => { const i = document.querySelector('[data-margin="1"]'); i.value = '50'; i.dispatchEvent(new Event('change')); })()""")
    check("frame: the panel sets one side's margin", ev("JSON.stringify(floorplanEditor.model.canvas.margin)") == "[100,50,100,100]",
          ev("JSON.stringify(floorplanEditor.model.canvas.margin)"))

    # 18f. furniture: placed against a wall, moved, turned, removed; a custom piece moves with a transform
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # inner faces 140..1060 x 140..860
    key("f")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-furniture [data-fgroup]:not(.open)')) {
        if (document.querySelector('[data-pick=furn][data-value=bed]')) break; h.click(); }
        document.querySelector('[data-pick=furn][data-value=bed]').click(); return 1; })()""")
    click([500, 180])                      # 40 cm from the north wall face
    bed = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    check("furniture: a bed near the north wall stands with its back against it",
          bed["kind"] == "bed" and bed["rot"] == 0 and abs(bed["at"][1] - (140 + 100)) < 0.5 and bed["size"] == [160, 200], bed)
    key("f"); ev("document.querySelector('[data-pick=furn][data-value=bed]').click(); 1")   # the next one: picked again
    click([1030, 500])                     # near the east wall: turned to face west
    b2 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[1])"))
    check("furniture: near the east wall it turns (back east)", b2["rot"] == 90 and abs(b2["at"][0] - (1060 - 100)) < 0.5, b2)
    check("furniture: the plan draws the pieces", ev("document.querySelectorAll('#plan #furniture > g').length") == 2)
    key("Escape"); key("v")
    drag([500, 260], [400, 360])
    m1 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0].at)"))
    check("furniture: a drag moves the piece", abs(m1[0] - 400) < 1 and abs(m1[1] - 340) < 1, m1)
    # the east side's handle: 40 cm wider, the west side stays
    f0 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    drag([f0["at"][0] + 80, f0["at"][1]], [f0["at"][0] + 120, f0["at"][1]])
    f1 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    check("furniture: a side handle resizes, the opposite side stays",
          abs(f1["size"][0] - 200) < 0.5 and f1["size"][1] == 200 and abs((f1["at"][0] - 100) - (f0["at"][0] - 80)) < 0.5, (f0, f1))
    # a corner handle on a turned piece: both sizes
    ev("floorplanEditor.state.model.furniture[0].rot = 90; floorplanEditor.renderPanel(); 1"); time.sleep(0.2)
    c0 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    # turned 90: its local +x is the plan's +y, local +y is the plan's -x
    corner = [c0["at"][0] - c0["size"][1] / 2, c0["at"][1] + c0["size"][0] / 2]
    drag(corner, [corner[0] - 20, corner[1] + 30])
    c1 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0].size)"))
    check("furniture: a corner handle of a turned piece resizes both ways", abs(c1[0] - (c0["size"][0] + 30)) < 0.5 and abs(c1[1] - (c0["size"][1] + 20)) < 0.5, (c0, c1))
    ev("floorplanEditor.state.model.furniture[0].rot = 0; floorplanEditor.renderPanel(); 1")
    key("r")
    check("furniture: R turns the selected piece", ev("floorplanEditor.model.furniture[0].rot") == 90)
    key("Delete")
    check("furniture: Delete removes it", ev("floorplanEditor.model.furniture.length") == 1)
    ev("""floorplanEditor.state.model.furniture.push({id: 'furniture-x', kind: 'custom', at: [300, 600], origin: [300, 600], size: [40, 40],
         svg: '<g id="furniture-x"><rect x="158" y="329" width="22" height="22"/></g>'}); floorplanEditor.renderPanel(); 1"""); time.sleep(0.3)
    check("furniture: a custom piece unmoved is drawn as it was", ev("document.querySelector('#plan #furniture-x').getAttribute('transform')") is None)
    drag([300, 600], [350, 600])
    tf = ev("document.querySelector('#plan #furniture-x').getAttribute('transform')")
    check("furniture: a moved custom piece gets a translate", tf is not None and tf.startswith("translate("), tf)
    key("Escape")

    # 18f2. several pieces: Shift adds, a group moves and turns as one, drawing order, splitting a drawn piece
    ev("""floorplanEditor.state.model.furniture = [
      {id: 'f-table', kind: 'table', at: [400, 500], size: [180, 90], rot: 0},
      {id: 'f-c1', kind: 'chair', at: [400, 440], size: [45, 45], rot: 0},
      {id: 'f-c2', kind: 'chair', at: [700, 700], size: [45, 45], rot: 0},
      {id: 'f-x', kind: 'custom', at: [300, 700], origin: [300, 700], size: [100, 20],
       svg: '<g id="f-x"><rect x="141.67" y="390.95" width="10" height="10"/><rect x="181.67" y="390.95" width="10" height="10"/></g>'}];
      floorplanEditor.state.selFurn = null; floorplanEditor.renderPanel(); 1"""); time.sleep(0.3)
    key("v"); click([350, 500]); click([700, 700], shift=True)
    check("pieces: Shift + click adds to the selection", ev("document.getElementById('p-sel').textContent").find("2") >= 0
          and ev("document.querySelectorAll('#overlay .ov-sel').length") == 2)
    key("g", ctrl=True)
    g = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture.map(f => f.group || null))"))
    check("pieces: Ctrl+G groups them", g[0] and g[0] == g[2] and not g[1], g)
    key("Escape"); click([700, 700])
    check("pieces: a click on one piece of a group selects the group", ev("document.querySelectorAll('#overlay .ov-sel').length") == 2)
    drag([700, 700], [750, 700])
    a = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture.map(f => f.at))"))
    check("pieces: the group moves together (snapping may shift it a little, both alike)", a[0][0] > 420 and a[1] == [400, 440]
          and a[2][0] - a[0][0] == 300 and a[2][1] - a[0][1] == 200, a)
    # the table drawn over the chair: order
    ev("floorplanEditor.state.model.furniture.forEach(f => delete f.group); floorplanEditor.state.selFurn = null; floorplanEditor.renderPanel(); 1"); time.sleep(0.2)
    click([400, 445])                       # the chair (on top of the table: drawn after it? no - before: the table wins)
    first = ev("floorplanEditor.state.selFurn")
    ev("floorplanEditor.state.selFurn = 1; floorplanEditor.state.selMore = new Set(); floorplanEditor.renderPanel(); 1")
    key("[", shift=True)
    check("pieces: Shift+[ sends the chair to the back (under the table)", ev("floorplanEditor.model.furniture[0].id") == "f-c1", first)
    # split the drawn piece into its two separate squares
    ev("floorplanEditor.state.selFurn = 3; floorplanEditor.state.selMore = new Set(); floorplanEditor.renderPanel(); 1")
    ev("document.getElementById('fu-split').click(); 1"); time.sleep(0.3)
    parts = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture.filter(f => f.id.startsWith('f-x-')).map(f => [f.id, f.at, f.size]))"))
    check("pieces: a drawn piece splits into its separate parts, each where it was",
          len(parts) == 2 and abs(parts[0][1][0] - 258.82) < 0.5 and abs(parts[1][1][0] - 329.41) < 0.5, parts)
    key("Escape")

    # 18f3. my furniture: drawn from shapes, coloured, saved and placed again; a room's floor
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("f")
    ev("(() => { const h = document.querySelector('#tb-furniture [data-fgroup=f_mine]:not(.open)'); if (h) h.click(); document.querySelector('[data-pick=furn][data-value=_draw]').click(); return 1; })()")
    click([300, 300], shift=True); click([500, 400], shift=True)          # a rectangle 200 x 100
    ev("document.querySelector('[data-pick=sk-shape][data-value=ellipse]').click(); 1")
    ev("(() => { const c = document.getElementById('sk-detail'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([350, 320], shift=True); click([450, 380], shift=True)          # an inner ellipse
    ev("document.querySelector('[data-pick=sk-shape][data-value=poly]').click(); 1")
    click([300, 400], shift=True); click([400, 450], shift=True); click([500, 400], shift=True); key("Enter")  # a triangle under it
    check("draw: three shapes so far", ev("floorplanEditor.state.sketch.parts.length") == 3, ev("floorplanEditor.state.sketch.parts.length"))
    ev("document.getElementById('sk-done').click(); 1"); time.sleep(0.3)
    d = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    check("draw: Done makes one piece of them - its box, the shapes in fractions of it",
          d["kind"] == "drawn" and d["size"] == [200, 150] and d["at"] == [400, 375] and len(d["parts"]) == 3
          and d["parts"][0] == {"t": "rect", "x": -0.5, "y": -0.5, "w": 1, "h": 0.6667} and d["parts"][1].get("detail") is True, d)
    check("draw: the plan draws it (a rect, an ellipse and a polygon)",
          ev("(() => { const g = document.querySelector('#plan #furniture > g'); return g ? g.querySelectorAll('rect,ellipse,polygon').length : 0; })()") == 3)
    ev("document.querySelector('#panel button.sw[data-c=\"#a07850\"]').click(); 1"); time.sleep(0.2)
    check("colour: a swatch colours the piece (toned into the plan)", ev("floorplanEditor.model.furniture[0].color") == "#a07850"
          and ev("document.querySelector('#plan #furniture > g').getAttribute('fill')") not in (None, "#a07850"))
    ev("(() => { const i = document.getElementById('fu-name'); i.value = 'Komoda Łucji'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("document.getElementById('fu-lib').click(); 1"); time.sleep(0.3)
    lib = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture_library)"))
    check("my furniture: saved with its name, size and colour", lib and lib[0]["name"] == "Komoda Łucji" and lib[0]["size"] == [200, 150]
          and lib[0]["color"] == "#a07850", lib)
    ev("document.querySelector('[data-pick=furn][data-value=\"lib:' + floorplanEditor.model.furniture_library[0].id + '\"]').click(); 1")
    click([700, 600])
    d2 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[1])"))
    check("my furniture: placed again from the palette", d2["kind"] == "drawn" and d2["name"] == "Komoda Łucji" and d2["parts"] == d["parts"]
          and d2["color"] == "#a07850", d2)
    # a room's floor: the pattern and a colour
    key("Escape"); key("p"); click([800, 200])
    ev("(() => { const s = document.getElementById('rm-floor'); s.value = 'herringbone'; s.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("document.querySelector('#panel button.sw[data-c=\"#6b4a32\"]').click(); 1"); time.sleep(0.2)
    fl = json.loads(ev("JSON.stringify(floorplanEditor.model.rooms[0].floor)"))
    check("floor: a pattern and a colour for the room", fl == {"pattern": "herringbone", "color": "#6b4a32"}, fl)
    check("floor: the plan fills the room with it", ev("document.querySelector('#plan #rooms polygon').getAttribute('fill')") == "url(#fl-herringbone-6b4a32)"
          and ev("!!document.querySelector('#plan pattern#fl-herringbone-6b4a32')"))
    key("Escape")

    # 18f4. notes: a text, a marker with its icon and note, an arrow (two clicks); moved, turned, deleted
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("d")
    def pick_note(kind):
        ev(f"""(() => {{ for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {{
            if (document.querySelector('[data-pick=dev][data-value={kind}]')) break; h.click(); }}
          document.querySelector('[data-pick=dev][data-value={kind}]').click(); return 1; }})()""")
    pick_note("text"); click([400, 300])
    ev("(() => { const t = document.querySelector('#panel textarea[data-nt=text]'); t.value = 'Łóżeczko\\nŁucji'; t.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("(() => { const i = document.querySelector('#panel [data-df=size]'); i.value = '40'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("document.querySelector('#panel button.sw[data-c=\"#b0674a\"]').click(); 1"); time.sleep(0.2)
    tx = json.loads(ev("JSON.stringify(floorplanEditor.model.notes[0])"))
    check("notes: a text with two lines, its size and colour", tx["type"] == "text" and tx["text"] == "Łóżeczko\nŁucji" and tx["size"] == 40
          and tx["color"] == "#b0674a", tx)
    check("notes: the plan draws the text in two lines", ev("document.querySelectorAll('#plan #notes .note-text tspan').length") == 2)
    key("v"); ev("floorplanEditor.state.selDev = {list: 'notes', i: 0, bulb: 0}; 1"); key("r")
    check("notes: R turns a text", ev("floorplanEditor.model.notes[0].rot") == 90)
    key("d"); pick_note("marker"); click([600, 500])
    ev("document.querySelector('[data-pick=nt-icon][data-value=fuse]').click(); 1"); time.sleep(0.2)
    ev("(() => { const i = document.querySelector('#panel [data-df=mtext]'); i.value = 'Bezpieczniki'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("(() => { const t = document.querySelector('#panel textarea[data-nt=note]'); t.value = 'Za drzwiami garażu'; t.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    mk = json.loads(ev("JSON.stringify(floorplanEditor.model.notes[1])"))
    check("notes: a marker with its icon, caption and note", mk["type"] == "marker" and mk["icon"] == "fuse" and mk["text"] == "Bezpieczniki"
          and mk["note"] == "Za drzwiami garażu", mk)
    check("notes: the plan draws the marker's pin and caption", ev("(() => { const g = document.querySelector('#plan #notes .note-marker'); return !!g && g.getAttribute('data-note') === 'Za drzwiami garażu' && /Bezpieczniki/.test(g.textContent); })()"))
    key("d"); pick_note("arrow"); click([300, 600]); click([500, 600])
    ar = json.loads(ev("JSON.stringify(floorplanEditor.model.notes[2])"))
    check("notes: an arrow from two clicks", ar["type"] == "arrow" and ar["from"] == [300, 600] and ar["to"] == [500, 600], ar)
    # dragged by its middle: both ends move
    key("v"); drag([400, 600], [450, 650])
    ar2 = json.loads(ev("JSON.stringify(floorplanEditor.model.notes[2])"))
    check("notes: an arrow moves as a whole", ar2["from"][0] - ar["from"][0] == ar2["to"][0] - ar["to"][0] != 0, (ar, ar2))
    ev("document.getElementById('dv-del').click(); 1")
    check("notes: delete", ev("floorplanEditor.model.notes.length") == 2)
    key("Escape")

    # 18f5. export: a PNG of the plan with its dimensions, a PDF at a true scale
    ev("document.getElementById('b-example').click(); 1"); time.sleep(1.0)
    def export(kind):
        ev("floorplanEditor.state.lastExport = null; 1")
        ev(f"(() => {{ const s = document.getElementById('s-export'); s.value = '{kind}'; s.dispatchEvent(new Event('change')); return 1; }})()")
        for _ in range(60):
            if ev("!!floorplanEditor.state.lastExport"): break
            time.sleep(0.2)
        if os.environ.get("EXPORT_DIR"):  # keep the files to look at
            b64 = ev("(async () => { const b = new Uint8Array(await floorplanEditor.state.lastExport.blob.arrayBuffer()); let s = ''; "
                     "for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); })()")
            Path(os.environ["EXPORT_DIR"], ev("floorplanEditor.state.lastExport.file")).write_bytes(base64.b64decode(b64))
        return json.loads(ev("JSON.stringify((() => { const x = floorplanEditor.state.lastExport; return x && { file: x.file, w: x.w, h: x.h, scale: x.scale, "
                             "type: x.blob.type, size: x.blob.size, dims: (x.svg.match(/class=\"ov-dim/g) || []).length, rooms: (x.svg.match(/class=\"ov-room/g) || []).length, "
                             "sel: /ov-room sel|ov-sel|ov-node/.test(x.svg), light: x.svg.includes('#fdfdfe') }; })())"))
    sel_before = ev("JSON.stringify(floorplanEditor.state.view)")
    png = export("png")
    check("export: a PNG of the plan, 2x, with dimensions and room names", png and png["type"] == "image/png" and png["file"].endswith(".png")
          and png["w"] > 1500 and png["dims"] > 10 and png["rooms"] >= 10 and not png["sel"] and not png["light"], png)
    check("export: the editor's view is as it was", ev("JSON.stringify(floorplanEditor.state.view)") == sel_before)
    pdf = export("pdf-a4")
    check("export: a PDF A4 at 1:100, light for print", pdf and pdf["type"] == "application/pdf" and pdf["scale"] == 100 and pdf["file"].endswith("-1-100.pdf")
          and pdf["light"], pdf)
    head = ev("floorplanEditor.state.lastExport.blob.slice(0, 8).text()")
    tail = ev("(async () => { const b = floorplanEditor.state.lastExport.blob; return await b.slice(b.size - 6).text(); })()")
    check("export: the PDF is a PDF (header, image, end)", head.startswith("%PDF-1.4") and tail.strip() == "%%EOF", (head, tail))
    pdf3 = export("pdf-a3")
    check("export: A3 holds the same house at a bigger scale or the same", pdf3 and pdf3["scale"] <= pdf["scale"], pdf3)

    # 18f6. garden: a lawn (rectangle), a terrace (polygon), a fence (line), a tree; selected, reshaped, deleted
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("g")
    check("garden: G opens the garden tool", ev("floorplanEditor.state.tool") == "garden")
    ev("floorplanEditor.state.view = {cx: 450, cy: 650, s: 0.32}; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)  # the whole garden on screen
    click([-300, 1000]); click([500, 1400])
    gd = lambda: json.loads(ev("JSON.stringify(floorplanEditor.model.garden || [])"))
    check("garden: a lawn from two corners", gd() and gd()[0]["kind"] == "lawn" and gd()[0]["points"] == [[-300, 1000], [500, 1000], [500, 1400], [-300, 1400]], gd())
    ev("document.querySelector('[data-pick=gd-kind][data-value=terrace]').click(); document.querySelector('[data-pick=gd-mode][data-value=poly]').click(); 1")
    click([700, 1000]); click([1100, 1000]); click([900, 1300]); click([700, 1000])
    check("garden: a terrace closed on its first corner", len(gd()) == 2 and gd()[1]["kind"] == "terrace" and len(gd()[1]["points"]) == 3, gd()[1:])
    ev("document.querySelector('[data-pick=gd-kind][data-value=fence]').click(); 1")
    click([-400, -200]); click([1300, -200]); click([1300, 1500]); key("Enter")
    check("garden: a fence of three points (Enter ends it)", gd()[2]["kind"] == "fence" and len(gd()[2]["line"]) == 3, gd()[2:])
    ev("document.querySelector('[data-pick=gd-kind][data-value=tree]').click(); 1")
    click([-250, 400])
    check("garden: a tree", gd()[3]["kind"] == "tree" and gd()[3]["at"] == [-250, 400] and gd()[3]["r"] == 250, gd()[3:])
    check("garden: the plan draws all four under the house", ev("(() => { const g = document.querySelector('#plan #garden'); return g && g.querySelectorAll('.gd-lawn,.gd-terrace,.gd-fence,.gd-tree').length; })()") == 4
          and ev("(() => { const g = document.querySelector('#plan #garden'), r = document.querySelector('#plan #rooms'); return !!(g.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING); })()"))
    # select tool: a click outside the house selects the garden there, its corner drags
    key("v"); click([-280, 1380])
    check("garden: a click on the lawn selects it", ev("floorplanEditor.state.selGarden") == 0 and "m²" in ev("document.getElementById('p-sel').textContent"))
    drag([500, 1400], [600, 1500])
    check("garden: a corner drags", gd()[0]["points"][2] == [600, 1500], gd()[0])
    click([-250, 420])
    ev("(() => { const i = document.getElementById('gd-d'); i.value = '300'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    check("garden: a tree's crown size", ev("floorplanEditor.state.selGarden") == 3 and gd()[3]["r"] == 150, gd()[3])
    key("Delete")
    check("garden: Delete removes it", len(gd()) == 3 and ev("floorplanEditor.state.selGarden") is None, len(gd()))
    key("Escape")

    # 18f7. the wizard: a house from its size and rooms, with doors, windows, rooms, lights and furniture
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    ev("document.getElementById('b-wizard').click(); 1"); time.sleep(0.3)
    check("wizard: opens with a preview of the rooms", ev("document.getElementById('wizard').open") and "m²" in ev("document.getElementById('wz-out').textContent"))
    ev("(() => { const i = document.getElementById('wz-bedrooms'); i.value = '2'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
    ev("(() => { const i = document.getElementById('wz-width'); i.value = '7'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
    check("wizard: too many rooms for the size - says so, cannot draw", ev("document.getElementById('wz-go').disabled") is True)
    ev("(() => { const i = document.getElementById('wz-width'); i.value = '16'; i.dispatchEvent(new Event('input', {bubbles: true})); })()")
    ev("document.getElementById('wz-go').click(); 1"); time.sleep(0.6)
    wm = json.loads(ev("JSON.stringify({ walls: floorplanEditor.model.walls.length, rooms: floorplanEditor.model.rooms.map((r) => [r.name, floorplanEditor.roomArea(r)]), "
                       "doors: floorplanEditor.model.walls.flatMap((w) => w.openings || []).filter((o) => o.type === 'door').length, "
                       "windows: floorplanEditor.model.walls.flatMap((w) => w.openings || []).filter((o) => ['window', 'hst'].includes(o.type)).length, "
                       "lights: floorplanEditor.model.lights.length, furniture: (floorplanEditor.model.furniture || []).length, open: document.getElementById('wizard').open })"))
    names = [r[0] for r in wm["rooms"]]
    check("wizard: draws the house - every room found by its walls", not wm["open"] and len(wm["rooms"]) == 9 and all(r[1] for r in wm["rooms"])
          and sum(1 for n in names if n.startswith(("Bedroom", "Sypialnia"))) == 2, wm)
    check("wizard: a door to each room and the front door, windows, a light in each room, furniture", wm["doors"] == 8 and wm["windows"] >= 9
          and wm["lights"] == 9 and wm["furniture"] >= 30, wm)
    check("wizard: the plan draws it", ev("document.querySelectorAll('#plan #rooms polygon').length") == 9)
    ev("floorplanEditor.undo(); 1")
    check("wizard: undo brings the empty plan back", ev("floorplanEditor.model.walls.length") == 0)

    # 18f8. a piece moved near a wall snaps flush to it; the distances are drawn from its sides, not its middle
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # inner faces 140..1060 x 140..860
    key("v")
    ev("floorplanEditor.state.model.furniture = [{id: 'p1', kind: 'box', at: [400, 500], size: [60, 60], rot: 0}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    sx, sy = screen([400, 500]); tx, ty = screen([176, 500])
    mouse("mouseMoved", sx, sy, button="none"); mouse("mousePressed", sx, sy)
    for k in range(1, 9): mouse("mouseMoved", sx + (tx - sx) * k / 8, sy + (ty - sy) * k / 8); time.sleep(0.03)
    flush = ev("document.querySelectorAll('#overlay .ov-flush').length")
    starts = json.loads(ev("JSON.stringify([...document.querySelectorAll('#overlay .ov-measure:not(.end)')].map((l) => [Number(l.getAttribute('x1')), Number(l.getAttribute('y1'))]))"))
    mouse("mouseReleased", tx, ty); time.sleep(0.3)
    at = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0].at)"))
    check("furniture: 6 cm from a wall it snaps flush (its side on the wall face)", abs(at[0] - 170) < 0.01 and flush >= 1, (at, flush))
    check("furniture: the distances while moving start at its sides", any(abs(x - 200) < 0.6 for x, y in starts) and any(abs(y - 470) < 0.6 or abs(y - 530) < 0.6 for x, y in starts)
          and not any(abs(x - at[0]) < 0.6 and abs(y - at[1]) < 0.6 for x, y in starts), starts)
    sx, sy = screen(at); tx, ty = screen([186, 500])
    mouse("mouseMoved", sx, sy, button="none"); mouse("mousePressed", sx, sy)   # Shift held while moving (on the press it adds to the selection)
    for k in range(1, 9): mouse("mouseMoved", sx + (tx - sx) * k / 8, sy + (ty - sy) * k / 8, shift=True); time.sleep(0.03)
    mouse("mouseReleased", tx, ty, shift=True); time.sleep(0.3)
    at2 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0].at)"))
    check("furniture: Shift - no snapping", abs(at2[0] - 186) < 1.5, at2)
    key("Escape")

    # 18f8b. snapping to other pieces: flush side to side, the edges lined up, a rug under it does not count
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("v")
    ev("floorplanEditor.state.model.furniture = [{id: 'bed', kind: 'box', at: [600, 400], size: [160, 200], rot: 0}, "
       "{id: 'rug', kind: 'box', at: [600, 600], size: [400, 300], rot: 0}, {id: 'ns', kind: 'box', at: [400, 600], size: [40, 40], rot: 0}]; "
       "floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    # bed spans x 520..680, y 300..500; drop the nightstand just left of it (gap ~4) with its top ~5 below the bed's top
    sx, sy = screen([400, 600]); tx, ty = screen([496, 325])
    mouse("mouseMoved", sx, sy, button="none"); mouse("mousePressed", sx, sy)
    for k in range(1, 9): mouse("mouseMoved", sx + (tx - sx) * k / 8, sy + (ty - sy) * k / 8); time.sleep(0.03)
    guides = ev("document.querySelectorAll('#overlay .ov-guide').length")
    mouse("mouseReleased", tx, ty); time.sleep(0.3)
    ns = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[2].at)"))
    check("furniture: flush against the piece next to it", abs(ns[0] - 500) < 0.6, ns)
    check("furniture: its edge lined up with the neighbour's, with a guide line", abs(ns[1] - 320) < 0.6 and guides >= 1, (ns, guides))
    check("furniture: the guides go once the piece is put down", ev("document.querySelectorAll('#overlay .ov-guide').length") == 0)
    key("Escape")

    # 18f8f. walls drawn up to another wall's face (not its centre line) still close the rooms
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = ["
       "{id: 'n', a: [0, 0], b: [1000, 0], thickness: 40, type: 'exterior'}, {id: 'e', a: [1000, 0], b: [1000, 800], thickness: 40, type: 'exterior'},"
       "{id: 's', a: [1000, 800], b: [0, 800], thickness: 40, type: 'exterior'}, {id: 'w', a: [0, 800], b: [0, 0], thickness: 40, type: 'exterior'},"
       "{id: 'p', a: [400, 20], b: [400, 780], thickness: 12, type: 'interior'}, {id: 'q', a: [20, 300], b: [391, 300], thickness: 12, type: 'interior'}];"
       "floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    areas = json.loads(ev("JSON.stringify([[200, 150], [200, 500], [700, 400]].map((p) => { floorplanEditor.state.model.rooms = [{id: 'x', name: 'x', at: p}]; "
                          "return floorplanEditor.roomArea(floorplanEditor.state.model.rooms[0]); }))"))
    check("rooms: a wall ending at a face (or 3 cm short of it) still closes the room - three rooms, not one",
          len(set(areas)) == 3 and all(areas) and max(areas) < 450000, areas)
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = ["
       "{id: 'n', a: [0, 0], b: [1400, 0], thickness: 40, type: 'exterior'}, {id: 'e', a: [1400, 0], b: [1400, 1400], thickness: 40, type: 'exterior'},"
       "{id: 's', a: [1400, 1400], b: [0, 1400], thickness: 40, type: 'exterior'}, {id: 'w', a: [0, 1400], b: [0, 0], thickness: 40, type: 'exterior'},"
       "{id: 'k1', a: [740, 0], b: [740, 740], thickness: 20}, {id: 'k2', a: [740, 740], b: [600, 740], thickness: 20},"
       "{id: 'k3', a: [600, 740], b: [600, 580], thickness: 20}, {id: 'k4', a: [600, 580], b: [740, 580], thickness: 20},"
       "{id: 'h', a: [940, 743], b: [1400, 743], thickness: 20}];"
       "floorplanEditor.state.model.dividers = [{id: 'd1', a: [20, 743], b: [590, 743]}, {id: 'd2', a: [750, 746], b: [940, 743]}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    areas = json.loads(ev("JSON.stringify([[300, 300], [300, 1000], [850, 300]].map((p) => { floorplanEditor.state.model.rooms = [{id: 'x', name: 'x', at: p}]; "
                          "return floorplanEditor.roomArea(floorplanEditor.state.model.rooms[0]); }))"))
    check("rooms: boundaries drawn to the face of a wall at its corner still close the rooms", len(set(areas)) == 3 and all(areas), areas)
    ev("floorplanEditor.state.model.rooms = []; floorplanEditor.state.model.dividers = []; 1")
    # walls sticking out past a corner stay straight; a wall end and a boundary end a few cm apart still close
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = ["
       "{id: 'n', a: [-20, 0], b: [1030, 0], thickness: 45}, {id: 'e', a: [1002, -18], b: [1000, 800], thickness: 45},"
       "{id: 's', a: [1000, 800], b: [0, 800], thickness: 45}, {id: 'w', a: [0, 800], b: [0, 0], thickness: 45},"
       "{id: 'p', a: [500, 22], b: [500, 404], thickness: 12}, {id: 'q', a: [978, 400], b: [497, 400], thickness: 12}];"
       "floorplanEditor.state.model.dividers = [{id: 'd', a: [22, 404], b: [494, 404]}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    areas = json.loads(ev("JSON.stringify([[250, 200], [750, 200], [500, 600]].map((p) => { floorplanEditor.state.model.rooms = [{id: 'x', name: 'x', at: p}]; "
                          "return floorplanEditor.roomArea(floorplanEditor.state.model.rooms[0]); }))"))
    check("rooms: overshooting corners and ends a few cm apart - three rooms", len(set(areas)) == 3 and all(areas), areas)
    # a boundary a little askew next to a wall (nearly straight on): the outline does not run off outside the house
    ev("floorplanEditor.state.model.dividers = [{id: 'd', a: [22, 404], b: [494, 404]}]; "
       "floorplanEditor.state.model.walls.push({id: 'r', a: [500, 410], b: [600, 410], thickness: 12}); floorplanEditor.renderPanel(); 1")
    xs = json.loads(ev("JSON.stringify((() => { floorplanEditor.state.model.rooms = [{id: 'x', name: 'x', at: [250, 600]}]; floorplanEditor.renderPanel(); "
                       "return [...document.querySelectorAll('#plan #rooms polygon')].flatMap((p) => p.getAttribute('points').trim().split(/\\s+/).map((q) => Number(q.split(',')[0]))); })())"))
    check("rooms: a slightly askew boundary leaves no spike outside the walls", xs and min(xs) >= -1, (min(xs) if xs else None))
    ev("floorplanEditor.state.model.rooms = []; floorplanEditor.state.model.dividers = []; 1")

    # 18f8g. a room's name: its id follows it, Tab goes straight to the id field
    ev("floorplanEditor.state.model.rooms = [{id: 'room-1', name: 'Pokój 1', at: [200, 150]}, {id: 'pokoj-lucji', name: 'X', at: [700, 400]}];"
       "floorplanEditor.state.selRoom = 0; floorplanEditor.renderPanel(); document.getElementById('rm-name').focus(); document.getElementById('rm-name').select(); 1")
    call("Input.insertText", text="Pokój Łucji")
    live = ev("document.getElementById('rm-id').value")
    key("Tab"); time.sleep(0.2)
    rm = json.loads(ev("JSON.stringify(floorplanEditor.model.rooms[0])"))
    check("rooms: the id follows the name (Polish letters, taken ids get a number)", live == "pokoj-lucji-2" and rm["id"] == "pokoj-lucji-2" and rm["name"] == "Pokój Łucji", (live, rm))
    check("rooms: Tab from the name goes to the id at once", ev("document.activeElement && document.activeElement.id") == "rm-id")
    call("Input.insertText", text="lucja"); key("Tab"); time.sleep(0.2)
    ev("document.getElementById('rm-name').focus(); document.getElementById('rm-name').select(); 1"); call("Input.insertText", text="Pokój Kuby"); key("Tab"); time.sleep(0.2)
    check("rooms: an id typed by hand stays when the name changes", ev("floorplanEditor.model.rooms[0].id") == "lucja")
    ev("floorplanEditor.state.model.rooms = []; floorplanEditor.state.selRoom = null; floorplanEditor.renderPanel(); 1")

    # 18f8e. a wall moved: the walls across it that end at its face (not its axis) stretch along
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = ["
       "{id: 'h', a: [100, 500], b: [900, 500], thickness: 12, type: 'interior'},"
       "{id: 'up', a: [400, 200], b: [400, 494], thickness: 12, type: 'interior'},"
       "{id: 'dn', a: [600, 506], b: [600, 800], thickness: 12, type: 'interior'},"
       "{id: 'far', a: [200, 200], b: [200, 450], thickness: 12, type: 'interior'}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    key("v"); drag([750, 500], [750, 560])
    ws = {w["id"]: w for w in json.loads(ev("JSON.stringify(floorplanEditor.model.walls)"))}
    check("walls: the walls across it that end at its faces follow the moved wall",
          ws["h"]["a"][1] == 560 and ws["up"]["b"] == [400, 554] and ws["dn"]["a"] == [600, 566] and ws["far"]["b"] == [200, 450], ws)
    key("Escape")

    # 18f8h. entity fields suggest only entities of their kind (covers for a cover, door / window sensors for a contact)
    ev("""(() => { const st = floorplanEditor.ha.states; const keep = new Map(st);
      st.clear();
      for (const [id, a] of [['cover.office', {friendly_name: 'Office blind'}], ['light.desk', {}], ['binary_sensor.office_window', {device_class: 'window'}],
                              ['binary_sensor.motion', {device_class: 'motion'}]]) st.set(id, {entity_id: id, attributes: a, state: 'off'});
      floorplanEditor.ha.onChange(null); window._keepStates = keep; return 1; })()""")
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = [{id: 'n', a: [0, 0], b: [600, 0], thickness: 30, type: 'exterior',"
       "openings: [{type: 'window', id: 'window-1', from: 200, to: 300}]}]; floorplanEditor.state.selOp = {w: 0, o: 0}; floorplanEditor.renderPanel(); 1"); time.sleep(0.2)
    lists = json.loads(ev("""JSON.stringify((() => { const c = document.querySelector('[data-cover]'), k = document.querySelector('[data-contact]');
      const opts = (i) => [...document.getElementById(i.getAttribute('list')).options].map((o) => o.value);
      return [opts(c), opts(k), [...document.getElementById(c.getAttribute('list')).options][0].label]; })())"""))
    check("entities: a cover field suggests covers (with their names), a contact door / window sensors",
          lists[0] == ["cover.office"] and lists[1] == ["binary_sensor.office_window"] and lists[2] == "Office blind", lists)
    ev("(() => { const st = floorplanEditor.ha.states; st.clear(); for (const [k, v] of window._keepStates) st.set(k, v); floorplanEditor.ha.onChange(null); "
       "floorplanEditor.state.selOp = null; return 1; })()")

    # 18f8i. lights on one circuit: two merged into one (Shift + click, Merge), more bulbs with "+ bulb", the circuit drawn joined
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.lights = ["
       "{id: 'l1', kind: 'ceiling', entity: 'light.a', bulbs: [[300, 300]], watts: 10}, {id: 'l2', kind: 'ceiling', entity: '', bulbs: [[500, 300]], watts: 5}];"
       "floorplanEditor.renderPanel(); 1"); time.sleep(0.2)
    key("v"); click([300, 300]); click([500, 300], shift=True)
    can = ev("!!document.getElementById('dv-merge')")
    ev("document.getElementById('dv-merge').click(); 1"); time.sleep(0.2)
    ls = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("lights: Shift + click another light, Merge - one circuit with both bulbs, its entity, the power summed",
          can and len(ls) == 1 and ls[0]["bulbs"] == [[300, 300], [500, 300]] and ls[0]["entity"] == "light.a" and ls[0]["watts"] == 15, ls)
    check("lights: the circuit's bulbs drawn joined", ev("document.querySelectorAll('#overlay polyline.ov-guide').length") == 1)
    ev("document.getElementById('dv-addbulb').click(); 1"); time.sleep(0.2)
    click([700, 300]); click([700, 500]); key("Escape")
    ls = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("lights: + bulb adds bulbs to that circuit with each click until Esc", len(ls) == 1 and len(ls[0]["bulbs"]) == 4
          and ev("floorplanEditor.state.tool") == "select", ls)
    click([700, 500]); time.sleep(0.2)                        # that bulb
    rows = ev("document.querySelectorAll('.bulb-row').length")
    ev("(() => { const i = document.querySelector('.bulb-row.on [data-df^=bbeam]'); i.value = '60'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    ev("(() => { const i = document.querySelector('.bulb-row.on [data-df^=brot]'); i.value = '90'; i.dispatchEvent(new Event('change')); })()"); time.sleep(0.2)
    b3 = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[3])"))
    clips = ev("document.querySelectorAll('#plan clipPath[id^=clip-beam-]').length")
    beam_pts = ev("(() => { const p = document.querySelector('#overlay .ov-beam'); return p ? p.getAttribute('points').trim().split(/\\s+/).every((q) => q.split(',').length === 2) : null; })()")
    check("lights: the selected bulb's own beam drawn around it (a proper wedge)", beam_pts is True, beam_pts)
    check("lights: the circuit's bulbs listed, each with its own direction and beam angle", rows == 4 and b3 == [700, 500, 90, 60] and clips == 1, (rows, b3, clips))
    ev("document.querySelector('.bulb-row.on [data-bsplit]').click(); 1"); time.sleep(0.2)
    ls = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("lights: a bulb taken out of the circuit is a light of its own", len(ls) == 2 and len(ls[0]["bulbs"]) == 3
          and ls[1]["bulbs"] == [[700, 500, 90, 60]] and ls[1]["entity"] == "" and ls[1]["id"] != ls[0]["id"], ls)
    key("Escape")

    # 18f8j. a rail: drawn corner by corner (an L), its bulbs clicked onto it anywhere, corners dragged, moved whole
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {
        if (document.querySelector('[data-pick=dev][data-value=rail]')) break; h.click(); }
        document.querySelector('[data-pick=dev][data-value=rail]').click(); return 1; })()""")
    click([300, 300]); click([600, 300]); click([600, 500]); key("Enter")
    rl = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("rail: an L drawn corner by corner, no bulbs yet", len(rl) == 1 and rl[0]["kind"] == "rail" and rl[0]["rail"] == [[300, 300], [600, 300], [600, 500]]
          and rl[0]["bulbs"] == [], rl)
    click([420, 310]); click([590, 400]); key("Escape")
    rl = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("rail: bulbs clicked near it sit on it, anywhere along it", rl[0]["bulbs"] == [[420, 300], [600, 400]] and ev("floorplanEditor.state.tool") == "select", rl)
    check("rail: the plan draws it with its bulbs", ev("!!document.querySelector('#plan polyline.rail')"))
    drag([600, 500], [700, 500])
    rl = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("rail: a corner dragged changes it, its bulbs stay on it", rl[0]["rail"][2] == [700, 500] and rl[0]["bulbs"][0] == [420, 300], rl)
    drag([500, 300], [500, 350])
    rl = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("rail: dragged by the rail itself it moves whole, bulbs too", rl[0]["rail"][0] == [300, 350] and rl[0]["bulbs"][0] == [420, 350], rl)
    drag([420, 350], [470, 400])
    rl = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("rail: a bulb dragged slides along it", rl[0]["bulbs"][0] == [470, 350], rl)
    key("Escape")

    # 18f8k. a spotlight: a narrow beam turned away from the wall; the round handle turns it (and a piece of furniture)
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = [{id: 'n', a: [0, 0], b: [1000, 0], thickness: 20, type: 'interior'}]; floorplanEditor.renderPanel(); 1")
    key("d")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {
        if (document.querySelector('[data-pick=dev][data-value=spot]')) break; h.click(); }
        document.querySelector('[data-pick=dev][data-value=spot]').click(); return 1; })()""")
    click([500, 60]); key("Escape")
    sp = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0])"))
    check("spotlight: a narrow beam (60), turned away from the wall near it", sp["kind"] == "spot" and sp["beam"] == 60 and sp["bulbs"][0][2] == 180, sp)
    key("v"); click([500, 60]); time.sleep(0.2)
    hp = json.loads(ev("(() => { const c = document.querySelector('#overlay .ov-rot'); return c ? JSON.stringify([Number(c.dataset.x), Number(c.dataset.y)]) : 'null'; })()"))
    check("turn handle: shown for the selected light, where it points", hp and abs(hp[0] - 500) < 1 and hp[1] > 60, hp)
    drag(hp, [hp[0] + 80, 60])               # to its right: east
    sp = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0])"))
    check("turn handle: dragging it turns the light (15 degree steps)", sp["bulbs"][0][2] == 90, sp)
    ev("floorplanEditor.state.model.furniture = [{id: 'sofa', kind: 'sofa', at: [500, 400], size: [200, 90], rot: 0}]; floorplanEditor.state.selDev = null; floorplanEditor.renderPanel(); 1")
    click([500, 400]); time.sleep(0.2)
    hp = json.loads(ev("(() => { const c = document.querySelector('#overlay .ov-rot'); return c ? JSON.stringify([Number(c.dataset.x), Number(c.dataset.y)]) : 'null'; })()"))
    drag(hp, [700, 400])
    check("turn handle: a piece of furniture turns too", ev("floorplanEditor.model.furniture[0].rot") == 90, ev("floorplanEditor.model.furniture[0].rot"))
    key("Escape")

    # 18f8l. a motion sensor's range stops at the walls (through a doorway only); "through partitions" lets a radar through
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = ["
       "{id: 'n', a: [0, 0], b: [900, 0], thickness: 45, type: 'exterior'}, {id: 'e', a: [900, 0], b: [900, 600], thickness: 45, type: 'exterior'},"
       "{id: 's', a: [900, 600], b: [0, 600], thickness: 45, type: 'exterior'}, {id: 'w', a: [0, 600], b: [0, 0], thickness: 45, type: 'exterior'},"
       "{id: 'p', a: [450, 0], b: [450, 600], thickness: 12, type: 'partition'}];"
       "floorplanEditor.state.model.devices = [{id: 'm1', type: 'motion', entity: '', at: [225, 300], direction: 0, fov: 359, range: 600}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    def fan_max_x():
        return ev("(() => { const p = document.querySelector('#plan .sensor-fan'); if (!p || !p.getAttribute('points')) return null; "
                  "const svg = document.querySelector('#plan svg'); const m = p.getCTM(), s = svg.getCTM().inverse(); "
                  "return Math.max(...p.getAttribute('points').trim().split(/\\s+/).map((q) => Number(q.split(',')[0]))); })()")
    x1 = fan_max_x()
    ev("floorplanEditor.state.model.devices[0].through_partitions = true; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    x2 = fan_max_x()
    check("motion sensor: its range stops at a wall (doors closed); seen through partitions it reaches the next room", x1 is not None and x2 is not None and x2 > x1 * 1.3, (x1, x2))
    ev("(() => { const d = floorplanEditor.state.model.devices[0]; delete d.through_partitions; floorplanEditor.state.model.walls[4].openings = [{type: 'door', id: 'door-1', from: 250, to: 340, hinge: 'from', swing: 'left'}]; floorplanEditor.renderPanel(); return 1; })()"); time.sleep(0.3)
    x3 = fan_max_x()
    ev("floorplanEditor.state.model.walls[4].openings = [{type: 'passage', from: 250, to: 340}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    x4 = fan_max_x()
    check("motion sensor: a door counts as closed, a passage lets it through", x3 is not None and x3 < x1 * 1.1 and x4 > x1 * 1.3, (x1, x3, x4))

    # 18f8m. a temperature / humidity sensor: a symbol by default, its readings on the plan as a choice
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {
        if (document.querySelector('[data-pick=dev][data-value=climate]')) break; h.click(); }
        document.querySelector('[data-pick=dev][data-value=climate]').click(); return 1; })()""")
    click([300, 300]); key("Escape")
    check("climate sensor: a symbol by default", ev("!!document.querySelector('#plan .climate-icon') && !document.querySelector('#plan .climate-temp')"))
    key("v"); click([300, 300]); setf("show_values", True)
    check("climate sensor: its readings on the plan instead when chosen - the editor still shows its symbol",
          ev("!!document.querySelector('#plan .climate-temp') && getComputedStyle(document.querySelector('#plan .climate-icon.alt')).display !== 'none'"))
    key("Escape")

    # 18f8n. a TV is selected anywhere on its outline, not only at its middle
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.devices = [{id: 'tv-1', type: 'tv', entity: '', hit: [300, 300, 160, 20], glow: {at: [380, 320], r: 80}}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.2)
    key("v"); click([310, 305])
    check("a TV: a click near its end selects it", json.loads(ev("JSON.stringify(floorplanEditor.state.selDev)")) == {"list": "devices", "i": 0, "bulb": 0},
          ev("JSON.stringify(floorplanEditor.state.selDev)"))
    key("Escape")

    # 18f8o. appliances and units drawn as themselves: a washer, a boiler (with their outline and a front)
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d")
    for kind, at in (("washer", [300, 300]), ("boiler", [500, 300])):
        ev(f"""(() => {{ for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {{
            if (document.querySelector('[data-pick=dev][data-value={kind}]')) break; h.click(); }}
            document.querySelector('[data-pick=dev][data-value={kind}]').click(); return 1; }})()""")
        click(at)
    key("Escape")
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a washer and a boiler: their size and a front", [d.get("kind") for d in D] == ["washer", "boiler"] and D[0]["hit"][2:] == [60, 60]
          and D[1]["hit"][2:] == [44, 36] and all(d.get("beam_dir") == 180 for d in D), D)
    check("drawn as themselves (a door on the washer, no badge on the boiler)", ev("document.querySelectorAll('#plan .unit-door').length") >= 1
          and ev("document.querySelectorAll('#plan .icon-badge').length") == 0)

    # 18f8p. a dryer put on a washer stands on it (one device, two entities), and is put back beside it
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d")
    def pick_dev(kind):
        ev(f"""(() => {{ for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {{
            if (document.querySelector('[data-pick=dev][data-value={kind}]')) break; h.click(); }}
            document.querySelector('[data-pick=dev][data-value={kind}]').click(); return 1; }})()""")
    pick_dev("washer"); click([300, 300])
    pick_dev("dryer"); click([310, 310])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a dryer on a washer: one stacked device", len(D) == 1 and D[0].get("top") == {"kind": "dryer", "entity": ""}, D)
    setf("entity", "sensor.washer"); setf("top_entity", "sensor.dryer")
    check("a stack: both machines in the plan, each with its entity",
          ev("document.querySelector('#plan [data-entity=\"sensor.washer\"]') && document.querySelector('#plan .stack-top[data-entity=\"sensor.dryer\"]') ? 1 : 0") == 1)
    ev("document.getElementById('dv-unstack').click(); 1")
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("put side by side: two devices, the dryer keeps its entity", len(D) == 2 and "top" not in D[0] and D[1].get("kind") == "dryer"
          and D[1]["entity"] == "sensor.dryer" and D[1]["hit"][0] >= D[0]["hit"][0] + 60, D)
    pick_dev("washer_dryer"); click([600, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("the washer + dryer tile places a stack", D[-1].get("kind") == "washer" and D[-1].get("top", {}).get("kind") == "dryer", D[-1])
    pick_dev("fridge"); click([800, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a fridge is 60 x 60 by default", D[-1]["hit"][2:] == [60, 60], D[-1])
    pick_dev("fridge_sbs"); click([1000, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a side-by-side fridge: 91 x 72, two handles", D[-1].get("kind") == "fridge_sbs" and D[-1]["hit"][2:] == [91, 72]
          and ev(f"document.querySelectorAll('#{D[-1]['id']} .unit-handle').length") == 2, D[-1])
    pick_dev("fridge"); click([800, 500])
    # its own size: along the wall / out from it, kept when it faces a side wall
    setf("w", "91"); setf("h", "72")
    check("size fields: width along its wall, depth out from it", json.loads(ev("JSON.stringify(floorplanEditor.model.devices.at(-1).hit)"))[2:] == [91, 72])
    key("r")
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices.at(-1))"))
    check("turned: the same width along its wall", D["hit"][2:] == [72, 91] and ev("document.querySelector('[data-df=w]').value") == "91", D)
    key("Escape")
    # a resize handle: the opposite side stays
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d"); pick_dev("dishwasher"); click([400, 400])
    h0 = json.loads(ev("JSON.stringify(floorplanEditor.model.devices[0].hit)"))
    drag([h0[0] + h0[2], h0[1] + h0[3] / 2], [h0[0] + h0[2] + 25, h0[1] + h0[3] / 2])
    h1 = json.loads(ev("JSON.stringify(floorplanEditor.model.devices[0].hit)"))
    check("a side handle: wider by the drag, the other side stays", h1[0] == h0[0] and abs(h1[2] - (h0[2] + 25)) <= 1 and h1[3] == h0[3], (h0, h1))
    # a TV by its diagonal
    pick_dev("tv"); click([400, 700])
    setf("inch", "55")
    W = json.loads(ev("JSON.stringify(floorplanEditor.model.devices.at(-1).hit)"))
    check("a TV of 55 inches is about 122 cm wide", abs(max(W[2], W[3]) - 121.76) < 0.1, W)
    key("Escape")

    # 18f8q. a device in hand: drawn under the cursor before the click, turned by R, placed as shown
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d"); pick_dev("washer")
    move([300, 300]); time.sleep(0.15)
    check("the washer in hand is drawn under the cursor", ev("document.querySelectorAll('#plan .appliance.ghost').length") == 1
          and len(json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))) == 0)
    key("r"); move([302, 300]); time.sleep(0.15)
    check("R turns the one in hand", ev("floorplanEditor.state.devGhost.item.beam_dir") == 270)
    click([302, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("placed as it was shown (turned)", len(D) == 1 and D[0].get("beam_dir") == 270 and ev("document.querySelectorAll('#plan .ghost').length") == 0, D)
    pick_dev("dryer"); move([305, 305]); time.sleep(0.15)
    check("a dryer over the washer: shown on top of it", ev("document.querySelectorAll('#plan .stack-top.ghost').length") == 1)
    key("Escape")
    check("leaving the tool drops the one in hand", ev("document.querySelectorAll('#plan .ghost').length") == 0)

    # 18f8r. near a wall a device in hand turns its back to it and stands against its face
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); floorplanEditor.state.model.walls = [{type: 'exterior', a: [0, 100], b: [1000, 100]}]; floorplanEditor.renderPanel(); 1")
    key("d"); pick_dev("washer"); click([400, 150])
    pick_dev("dryer"); click([600, 50])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("below the wall: front down, back on its face", D[0]["beam_dir"] == 180 and D[0]["hit"][1] == 120, D[0])
    check("above the wall: front up, back on its face", D[1]["beam_dir"] == 0 and D[1]["hit"][1] + D[1]["hit"][3] == 80, D[1])
    pick_dev("tv"); click([800, 130])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a TV on the wall: against its face, screen to the room", D[2]["beam_dir"] == 180 and D[2]["hit"][1] == 120, D[2])
    pick_dev("dishwasher"); click([300, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("farther from the wall: turned to it, but left where the cursor is", D[-1]["beam_dir"] == 180 and D[-1]["hit"][1] == 270,
          (D[-1], ev("floorplanEditor.state.view.s")))
    click([900, 30], shift=True)
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("Shift: exactly at the cursor, not turned", D[-1]["beam_dir"] == 180 and D[-1]["hit"][1] == 0, D[-1])
    ev("floorplanEditor.state.model.devices.splice(-2, 2); floorplanEditor.renderPanel(); 1")
    pick_dev("tv"); move([200, 150]); time.sleep(0.15); key("r"); click([200, 150])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("turned by hand (R): it keeps that turn by a wall", D[3]["beam_dir"] == 270 and D[3]["hit"][1] != 120, D[3])
    key("Escape")

    # 18f8s. kitchen appliances and TV / audio: their own palette groups, each drawn as itself
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("d")
    kinds = ["freezer", "oven", "cooktop", "microwave", "hood", "coffee", "soundbar", "projector", "console"]
    for i, k in enumerate(kinds):
        pick_dev(k); click([150 + i * 130, 300])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("new appliances placed with their kinds", [d.get("kind") for d in D] == kinds, [d.get("kind") for d in D])
    check("each drawn as itself", all(ev(f"document.querySelector('#{d['id']} .dev-shape') ? 1 : 0") == 1 for d in D))
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    k2 = ["doorbell", "power_strip", "router", "ap", "net_switch"]
    for i, k in enumerate(k2):
        pick_dev(k); click([150 + i * 130, 500])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("doorbell, power strip, router, AP, switch: placed as badges with their glyphs", [d.get("kind") for d in D] == k2
          and all(ev(f"document.querySelector('#plan use[href=\"#icon-{k}\"]') ? 1 : 0") == 1 for k in k2), D)
    # a rack: a router and a switch dropped on it go into it, each with its entity; one taken out again
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    pick_dev("rack"); click([400, 400])
    pick_dev("router"); click([400, 400])
    pick_dev("net_switch"); click([405, 405])
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("a rack with a router and a switch in it", len(D) == 1 and [i["kind"] for i in D[0].get("items", [])] == ["router", "net_switch"], D)
    setf("ri0", "device_tracker.router"); setf("ri1", "switch.poe")
    check("each piece in the rack in the plan with its entity", ev("document.querySelectorAll('#plan .rack-item[data-entity=\"device_tracker.router\"], #plan .rack-item[data-entity=\"switch.poe\"]').length") == 2)
    ev("document.querySelector('[data-rout=\"0\"]').click(); 1")
    D = json.loads(ev("JSON.stringify(floorplanEditor.model.devices)"))
    check("taken out: next to the rack, keeping its entity", len(D) == 2 and len(D[0]["items"]) == 1 and D[1]["kind"] == "router" and D[1]["entity"] == "device_tracker.router", D)
    # every new kind places and draws
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    allk = ["pendant", "floor_lamp", "table_lamp", "garden_lamp", "gas", "lux", "vibration", "button", "alarm_panel", "keypad", "siren", "nvr",
            "radiator", "floor_heating", "heat_pump", "water_tank", "fireplace", "dehumidifier", "humidifier", "intercom", "rain", "pool_pump",
            "meter", "fuse_box", "inverter", "ups", "washdry", "wine_fridge", "mower", "amplifier", "set_top", "printer", "nas", "zigbee"]
    for i, k in enumerate(allk):
        pick_dev(k); click([100 + (i % 10) * 120, 200 + (i // 10) * 150])
    n = ev("floorplanEditor.model.devices.length + floorplanEditor.model.lights.length")
    check(f"all {len(allk)} new kinds placed", n == len(allk), n)
    check("the lamps with their shade", ev("document.querySelectorAll('#plan .light .shade').length") == 4)
    check("AGD and RTV groups in the palette", ev("[...document.querySelectorAll('#tb-devices [data-group]')].map(b => b.dataset.group).join()").count("g_appliances") == 1
          and ev("[...document.querySelectorAll('#tb-devices [data-group]')].map(b => b.dataset.group).join()").count("g_av") == 1)
    key("Escape")

    # 18f8d. a PDF as the underlay: its page drawn into a picture (pdf.js from the CDN; skipped offline)
    def tiny_pdf(path, pages=2):
        objs = ["<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [" + " ".join(f"{3 + 2 * i} 0 R" for i in range(pages)) + f"] /Count {pages} >>"]
        for i in range(pages):
            objs.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents {4 + 2 * i} 0 R >>")
            st = f"4 w 20 20 m 380 20 l 380 180 l 20 180 l h S {10 + i * 100} 60 m {60 + i * 100} 140 l S".encode()
            objs.append("<< /Length %d >>\nstream\n%s\nendstream" % (len(st), st.decode()))
        out, offs = b"%PDF-1.4\n", []
        for i, o in enumerate(objs):
            offs.append(len(out)); out += f"{i + 1} 0 obj\n{o}\nendobj\n".encode()
        x = len(out)
        out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode() + b"".join(f"{o:010d} 00000 n \n".encode() for o in offs)
        out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode()
        Path(path).write_bytes(out)
    try:
        urllib.request.urlopen("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs", timeout=10); online = True
    except Exception:
        online = False
    if online:
        pdfp = str(DATA / "test.pdf"); tiny_pdf(pdfp)
        ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); window.prompt = () => '2'; 1")
        doc = call("DOM.getDocument")
        nid = call("DOM.querySelector", nodeId=doc["root"]["nodeId"], selector="#f-under")["nodeId"]
        call("DOM.setFileInputFiles", files=[pdfp], nodeId=nid)
        for _ in range(60):
            if ev("!!floorplanEditor.state.underlay"): break
            time.sleep(0.25)
        u = json.loads(ev("JSON.stringify(floorplanEditor.state.underlay && {w: floorplanEditor.state.underlay.w, h: floorplanEditor.state.underlay.h, jpg: floorplanEditor.state.underlay.src.startsWith('data:image/jpeg')})"))
        check("underlay: a PDF page becomes the picture (the page asked for, 3500 px on the long side)", u and u["w"] == 3500 and u["h"] == 1750 and u["jpg"], u)
        ev("floorplanEditor.state.underlay = null; 1"); key("Escape")
    else:
        print("skip underlay PDF: offline")

    # 18f8c. Ctrl / Cmd + click on a piece: a copy in hand, turned the same way, put down with a click
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("v")
    ev("floorplanEditor.state.model.furniture = [{id: 'sofa', kind: 'sofa', at: [500, 400], size: [200, 90], rot: 90, group: 'g1'}]; floorplanEditor.renderPanel(); 1"); time.sleep(0.3)
    x, y = screen([500, 400])
    mouse("mouseMoved", x, y, button="none"); mouse("mousePressed", x, y, ctrl=True); mouse("mouseReleased", x, y, ctrl=True); time.sleep(0.35)
    move([800, 450])
    gh = json.loads(ev("JSON.stringify(floorplanEditor.state.furnGhost)"))
    check("furniture: Ctrl + click gives a copy in hand, turned the same way", gh and gh["kind"] == "sofa" and gh["rot"] == 90
          and abs(gh["at"][0] - 800) < 15 and ev("floorplanEditor.model.furniture.length") == 1, gh)
    click([800, 450])
    fs = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture)"))
    check("furniture: a click puts the copy down - its own id, outside the group, selected", len(fs) == 2 and fs[1]["id"] != "sofa"
          and "group" not in fs[1] and fs[1]["rot"] == 90 and ev("floorplanEditor.state.tool") == "select" and ev("floorplanEditor.state.selFurn") == 1, fs)
    ev("floorplanEditor.undo(); 1")
    check("furniture: undo takes the copy back", ev("floorplanEditor.model.furniture.length") == 1)
    x, y = screen([500, 400])
    mouse("mouseMoved", x, y, button="none"); mouse("mousePressed", x, y, ctrl=True); mouse("mouseReleased", x, y, ctrl=True); time.sleep(0.35)
    move([800, 450]); key("r")
    check("furniture: R turns the piece in hand", ev("floorplanEditor.state.furnGhost.rot") == 180)
    key("Escape")
    key("f")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-furniture [data-fgroup]:not(.open)')) {
        if (document.querySelector('[data-pick=furn][data-value=bed]')) break; h.click(); }
        document.querySelector('[data-pick=furn][data-value=bed]').click(); return 1; })()""")
    move([800, 450]); r0 = ev("floorplanEditor.state.furnGhost.rot"); key("r", shift=True); move([810, 450])
    check("furniture: Shift+R turns one from the palette the other way, and it stays turned", ev("floorplanEditor.state.furnGhost.rot") == (r0 - 90) % 360, r0)
    key("Escape")

    # 18f9. Furniture / Devices tools: what was just placed moves under the same tool; a click on empty floor places another
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("f")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-furniture [data-fgroup]:not(.open)')) {
        if (document.querySelector('[data-pick=furn][data-value=bed]')) break; h.click(); }
        document.querySelector('[data-pick=furn][data-value=bed]').click(); return 1; })()""")
    move([600, 500]); move([180, 500])        # in hand: follows the cursor, its back to the west wall near it
    gh = json.loads(ev("JSON.stringify(floorplanEditor.state.furnGhost)"))
    check("furniture: the bed picked in the palette is in hand, turned with its back to the wall near the cursor and flush with it",
          gh and gh["kind"] == "bed" and gh["rot"] == 270 and abs(gh["at"][0] - (140 + 100)) < 0.6
          and ev("document.querySelectorAll('#overlay .ov-ghost').length") == 1, gh)
    click([180, 500])
    a1 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0])"))
    check("furniture: a click puts it down where it was shown, then Select with it selected", ev("floorplanEditor.model.furniture.length") == 1
          and a1["at"] == gh["at"] and a1["rot"] == 270 and ev("floorplanEditor.state.tool") == "select" and ev("floorplanEditor.state.selFurn") == 0, a1)
    drag([a1["at"][0], a1["at"][1]], [a1["at"][0] + 150, a1["at"][1]])
    a2 = json.loads(ev("JSON.stringify(floorplanEditor.model.furniture[0].at)"))
    check("furniture: and drags at once", a2[0] - a1["at"][0] > 100, (a1["at"], a2))
    click([700, 300])
    check("furniture: another one only when picked again in the palette", ev("floorplanEditor.model.furniture.length") == 1)
    key("d")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {
        if (document.querySelector('[data-pick=dev][data-value=ceiling]')) break; h.click(); }
        document.querySelector('[data-pick=dev][data-value=ceiling]').click(); return 1; })()""")
    click([800, 300])
    drag([800, 300], [850, 400])
    lt = json.loads(ev("JSON.stringify(floorplanEditor.model.lights)"))
    check("devices tool: a lamp just placed drags under the same tool", len(lt) == 1 and lt[0]["bulbs"][0][0] > 830 and lt[0]["bulbs"][0][1] > 380, lt)
    key("Escape")

    # 18g. floors: a new floor from the outline below, stairs below show as a void, each floor its own walls and undo
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=1000, depth=800)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = true; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])
    key("f")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-furniture [data-fgroup]:not(.open)')) {
        if (document.querySelector('[data-pick=furn][data-value=stairs_straight]')) break; h.click(); }
        document.querySelector('[data-pick=furn][data-value=stairs_straight]').click(); return 1; })()""")
    click([600, 500]); key("Escape")
    ground_walls = ev("floorplanEditor.model.walls.length")
    ev("window.prompt = () => 'Piętro'; window.confirm = () => true; document.getElementById('b-floor-add').click(); 1"); time.sleep(0.4)
    check("floors: a new floor starts from the exterior walls below and is the one edited",
          ev("floorplanEditor.state.floor") == 0 and ev("floorplanEditor.model.walls.length") == ground_walls
          and ev("floorplanEditor.house.floors[0].name") == "Piętro")
    check("floors: the stairs from below are a void on it", ev("!!document.querySelector('#plan [id$=\"-void\"]')"))
    check("floors: the floor below shows faint", ev("document.querySelectorAll('#overlay .ov-below').length") >= 4)
    ev("document.getElementById('b-floor-below').click(); 1"); time.sleep(0.2)
    check("floors: ▤ hides the floor below", ev("document.querySelectorAll('#overlay .ov-below').length") == 0
          and not ev("document.getElementById('b-floor-below').classList.contains('on')"))
    ev("document.getElementById('b-floor-below').click(); 1"); time.sleep(0.2)
    check("floors: ▤ shows it again", ev("document.querySelectorAll('#overlay .ov-below').length") >= 4)
    key("w"); click([300, 300]); click([300, 700]); key("Escape"); key("Escape")
    up_walls = ev("floorplanEditor.model.walls.length")
    ev("(() => { const s = document.getElementById('floor'); s.value = '-1'; s.dispatchEvent(new Event('change')); })()"); time.sleep(0.3)
    check("floors: back on the ground floor its walls are its own",
          ev("floorplanEditor.state.floor") == -1 and ev("floorplanEditor.model.walls.length") == ground_walls
          and ev("floorplanEditor.house.floors[0].walls.length") == up_walls == ground_walls + 1, (ground_walls, up_walls))
    ev("floorplanEditor.undo(); 1")
    check("floors: undo on the ground floor does not touch the floor above",
          ev("floorplanEditor.house.floors[0].walls.length") == up_walls and ev("(floorplanEditor.model.furniture || []).length") == 0)
    ev("floorplanEditor.redo(); 1")
    svg_up = ev("import('/generator/floorplan-model.js').then(g => g.generateSvg(floorplanEditor.house, {floor: 'floor-1'}).length)")
    check("floors: the generator builds the floor above", svg_up > 1000, svg_up)
    ev("window.prompt = () => ''; window.confirm = () => true; floorplanEditor.switchFloor(0); document.getElementById('b-floor-edit').click(); 1"); time.sleep(0.3)
    check("floors: an empty name removes the floor", ev("floorplanEditor.house.floors === undefined") and ev("floorplanEditor.state.floor") == -1)

    # 18i. two shapes side by side: the shared wall is one wall, not two on top of each other
    ev("floorplanEditor.load(floorplanEditor.emptyModel(), ''); 1")
    key("s"); set_shape("rect", width=400, depth=300)
    ev("(() => { const c = document.getElementById('sh-out'); c.checked = false; c.dispatchEvent(new Event('change')); })()")
    click([100, 100])                      # axes 100..500 x 100..400
    key("s"); click([500, 100])            # axes 500..900: its west wall lies on the first one's east wall
    n = ev("floorplanEditor.model.walls.length")
    # the shared wall is one, and the top and bottom walls run on as one long wall each: 5, not 8
    longest = ev("Math.max(...floorplanEditor.model.walls.map(w => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1])))")
    check("walls: two shapes side by side share a wall, their outlines run on as one wall (5, not 8)", n == 5 and round(longest) == 800, (n, longest))
    key("z", ctrl=True)
    check("walls: undo removes the second shape with the merge", ev("floorplanEditor.model.walls.length") == 4)
    key("Escape")

    # 18h. an unused room is darker, a divider can be shown dashed
    svg = ev("""import('/generator/floorplan-model.js').then(g => g.generateSvg({version: 2, canvas: {cm_per_svg: 30/17, rotate: 0},
      walls: [{type: 'exterior', a: [0, 0], b: [600, 0]}, {type: 'exterior', a: [600, 0], b: [600, 400]},
              {type: 'exterior', a: [600, 400], b: [0, 400]}, {type: 'exterior', a: [0, 400], b: [0, 0]}],
      dividers: [{a: [300, 0], b: [300, 400], show: true}],
      rooms: [{id: 'a', name: 'A', at: [150, 200]}, {id: 'b', name: 'B', at: [450, 200], unused: true}]}))""")
    check("unused room and a shown divider", 'id="room-b" data-room="B"' in svg and 'class="unused"' in svg.split('id="room-b"')[1].split("/>")[0]
          and '<g id="dividers"' in svg and 'class="unused"' not in svg.split('id="room-a"')[1].split("/>")[0])

    # 19. the example house (examples/house.json: two storeys and a garage, made up)
    ev("document.getElementById('b-example').click(); 1"); time.sleep(1.2)
    check("example loaded", len(walls()) >= 10, len(walls()))
    check("example renders", ev("document.getElementById('st-msg').textContent") == "" and
          ev("document.querySelectorAll('#plan #wall-ext').length") == 1)
    check("example: every room is enclosed by walls",
          ev("document.querySelectorAll('#plan #rooms polygon').length") == len(json.loads((ROOT / "examples" / "house.json").read_text())["rooms"]))
    check("example: two floors in the switcher", ev("document.querySelectorAll('#floor option').length") == 2)
    ev("floorplanEditor.switchFloor(0); 1"); time.sleep(0.4)
    check("example: the first floor shows the stairs from below as a void",
          ev("!!document.querySelector('#plan [id$=\"-void\"]')") and ev("floorplanEditor.model.rooms.length") == len(json.loads((ROOT / "examples" / "house.json").read_text())["floors"][0]["rooms"]))
    ev("floorplanEditor.switchFloor(-1); floorplanEditor.fit(); 1"); time.sleep(0.4)
    before = ev("JSON.stringify(floorplanEditor.model)")
    key("v")
    b0 = json.loads(ev("JSON.stringify(floorplanEditor.model.lights[0].bulbs[0])"))
    drag(b0[:2], [b0[0] + 50, b0[1]])
    moved = ev("JSON.stringify(floorplanEditor.model)") != before
    key("z", ctrl=True)
    check("example: a lamp moves and undo restores the model exactly", moved and ev("JSON.stringify(floorplanEditor.model)") == before)
    # touch: two fingers zoom around their middle and move the view; one finger moves the view; nothing in the plan moves
    def touch(kind, pts):
        call("Input.dispatchTouchEvent", type=kind, touchPoints=[{"x": x, "y": y, "id": i} for i, (x, y) in pts])
    ev("floorplanEditor.setTool('select'); floorplanEditor.fit(); const S = floorplanEditor.state; S.sel = S.selFurn = S.selDev = S.selOp = S.selDiv = S.selRoom = null; S.selMore && S.selMore.clear(); 1"); time.sleep(0.3)
    before, v0 = ev("JSON.stringify(floorplanEditor.model)"), ev("JSON.stringify(floorplanEditor.state.view)")
    v0 = json.loads(v0)
    cx, cy = ev("(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()")
    anchor = ev(f"(() => {{ const v = floorplanEditor.state.view, r = document.getElementById('stage').getBoundingClientRect(); return [v.cx + ({cx} - r.left - r.width / 2) / v.s, v.cy + ({cy} - r.top - r.height / 2) / v.s]; }})()")
    touch("touchStart", [(0, (cx - 50, cy))]); touch("touchStart", [(0, (cx - 50, cy)), (1, (cx + 50, cy))])
    for k in range(1, 7):
        touch("touchMove", [(0, (cx - 50 - 10 * k, cy)), (1, (cx + 50 + 10 * k, cy))]); time.sleep(0.03)
    touch("touchEnd", [(0, (cx - 110, cy))]); touch("touchEnd", [])
    v1 = json.loads(ev("JSON.stringify(floorplanEditor.state.view)"))
    after_anchor = ev(f"(() => {{ const v = floorplanEditor.state.view, r = document.getElementById('stage').getBoundingClientRect(); return [v.cx + ({cx} - r.left - r.width / 2) / v.s, v.cy + ({cy} - r.top - r.height / 2) / v.s]; }})()")
    check("touch: a pinch selects nothing", ev("JSON.stringify([floorplanEditor.state.sel, floorplanEditor.state.selFurn, floorplanEditor.state.selDev])") == "[null,null,null]")
    check("touch: pinching out zooms in around the fingers", abs(v1["s"] / v0["s"] - 2.2) < 0.05 and max(abs(a - b) for a, b in zip(anchor, after_anchor)) < 1, (v0, v1))
    touch("touchStart", [(0, (cx, cy))])
    for k in range(1, 6):
        touch("touchMove", [(0, (cx + 20 * k, cy + 10 * k))]); time.sleep(0.03)
    touch("touchEnd", [])
    v2 = json.loads(ev("JSON.stringify(floorplanEditor.state.view)"))
    check("touch: one finger moves the view", abs((v1["cx"] - v2["cx"]) * v2["s"] - 100) < 1 and abs((v1["cy"] - v2["cy"]) * v2["s"] - 50) < 1, (v1, v2))
    check("touch: nothing in the plan moved", ev("JSON.stringify(floorplanEditor.model)") == before)
    # a finger on a piece that is not selected moves the view and selects it; on the selected piece it moves the piece
    # (40 cm off the table's centre: the chandelier hangs over it)
    ti = ev("floorplanEditor.model.furniture.findIndex((f) => f.id === 'f-table')")
    ev("(() => { const t = floorplanEditor.model.furniture.find((f) => f.id === 'f-table'); floorplanEditor.state.view = {cx: t.at[0], cy: t.at[1], s: 0.6}; floorplanEditor.state.selFurn = null; floorplanEditor.renderPanel(); return 1; })()"); time.sleep(0.2)
    tx, ty = ev("(() => { const a = floorplanEditor.model.furniture.find((f) => f.id === 'f-table').at; return floorplanEditor.toScreen([a[0], a[1] + 40]); })()")
    touch("touchStart", [(0, (tx, ty))])
    touch("touchMove", [(0, (tx + 40, ty))]); touch("touchEnd", [])
    check("touch: a drag on an unselected piece moves the view, not the piece",
          ev("JSON.stringify(floorplanEditor.model)") == before and ev("floorplanEditor.state.selFurn") == ti)
    tx, ty = ev("(() => { const a = floorplanEditor.model.furniture.find((f) => f.id === 'f-table').at; return floorplanEditor.toScreen([a[0], a[1] + 40]); })()")
    touch("touchStart", [(0, (tx, ty))])
    for k in range(1, 5):
        touch("touchMove", [(0, (tx + 15 * k, ty))]); time.sleep(0.03)
    touch("touchEnd", [])
    check("touch: the selected piece moves under the finger", ev("JSON.stringify(floorplanEditor.model)") != before)
    ev("floorplanEditor.undo(); 1")
    check("touch: undo puts it back", ev("JSON.stringify(floorplanEditor.model)") == before)
    # round trip: the house as loaded, saved on the server, is the same plan and the same SVG
    ev("document.getElementById('b-example').click(); 1"); time.sleep(1.2)
    original = json.loads((ROOT / "examples" / "house.json").read_text())
    check("round trip: loading changes nothing in the model", json.loads(ev("JSON.stringify(floorplanEditor.house)")) == original)

    # 19b. "Send to HA" (--publish): the button shows, a click leaves a request, a result file is shown
    check("publish: the button shows when the server offers it", ev("!document.getElementById('b-publish').hidden"))
    ev("document.getElementById('b-publish').click()"); time.sleep(0.5)
    req = DATA / "publish-request.json"
    check("publish: a click leaves a request for whatever sends the plan", req.exists())
    import json as _json
    (DATA / "publish-result.json").write_text(_json.dumps({"at": "9999-01-01T00:00:00.000Z", "ok": True, "version": "v9", "message": "sent"}))
    req.unlink(missing_ok=True)
    time.sleep(1.6)
    check("publish: the result is shown", "v9" in ev("document.getElementById('st-msg').textContent"), ev("document.getElementById('st-msg').textContent"))
    (DATA / "publish-result.json").unlink(missing_ok=True)

    # 20. saving on the server (tools/serve.mjs): versions, overwrite, conflicts
    def save_as(mode, note=""):
        ev("document.getElementById('b-save').click(); 1"); time.sleep(0.2)
        ev(f"document.getElementById('sv-note').value = {json.dumps(note)}; document.getElementById('sv-{'new' if mode == 'new' else 'over'}').click(); 1")
        time.sleep(0.8)
    index = lambda: json.loads((DATA / "versions" / "index.json").read_text())
    plan_before = json.loads(ev("JSON.stringify(floorplanEditor.house)"))
    save_as("new", "first")
    ix = index()
    check("server: the first save is v1 with its note, the plan and the SVG are written",
          ix["current"] == "v1" and ix["versions"][0]["note"] == "first" and (DATA / "plan.svg").exists()
          and json.loads((DATA / "house.json").read_text()) == plan_before and ev("document.getElementById('ver').textContent") == "v1", ix)
    built = subprocess.run(["node", "--input-type=module", "-e",
        "import {generateSvg} from './generator/floorplan-model.js'; import fs from 'fs';"
        "process.stdout.write(generateSvg(JSON.parse(fs.readFileSync('examples/house.json'))))"], cwd=ROOT, capture_output=True, text=True).stdout
    check("round trip: the SVG built from the saved plan is the SVG of the original", (DATA / "plan.svg").read_text() == built)
    ev("floorplanEditor.state.model.lights = [...(floorplanEditor.state.model.lights || []), {id: 'l-v', entity: '', kind: 'ceiling', bulbs: [[10, 10]]}]; 1")
    ev("floorplanEditor.load(floorplanEditor.model, floorplanEditor.state.furniture); 1")   # not a change by itself
    check("server: loading is not an unsaved change", ev("document.getElementById('ver').textContent") == "v1")
    # a real change: a new lamp through the devices tool
    key("d")
    c = ev("[floorplanEditor.state.view.cx, floorplanEditor.state.view.cy]")
    ev("""(() => { for (const h of document.querySelectorAll('#tb-devices [data-group]:not(.open)')) {
        if (document.querySelector('[data-pick=dev][data-value=ceiling]')) break; h.click(); }
        document.querySelector('[data-pick=dev][data-value=ceiling]').click(); return 1; })()""")
    click(c); key("Escape"); key("Escape")
    check("server: a change marks the plan unsaved", ev("document.getElementById('ver').textContent") == "v1 •")
    save_as("over")
    ix = index()
    check("server: Save overwrites v1", ix["current"] == "v1" and len(ix["versions"]) == 1
          and ev("document.getElementById('ver').textContent") == "v1"
          and json.loads((DATA / "house.json").read_text()) == json.loads(ev("JSON.stringify(floorplanEditor.house)")))
    save_as("new", "second")
    check("server: Save as new version makes v2 current", index()["current"] == "v2" and (DATA / "versions" / "v1.json").exists())
    # open v1: an older version can only be saved as a new one
    ev("document.getElementById('b-save').click(); 1"); time.sleep(0.2)
    ev("document.querySelector('#sv-list [data-ver=v1]').click(); 1"); time.sleep(0.8)
    ev("document.getElementById('b-save').click(); 1"); time.sleep(0.2)
    over_disabled = ev("document.getElementById('sv-over').disabled")
    ev("document.getElementById('save-dialog').close('cancel'); 1")
    check("server: an opened older version cannot be overwritten", ev("document.getElementById('ver').textContent") == "v1" and over_disabled)
    r = ev("""fetch('/api/save', {method: 'POST', body: JSON.stringify({model: floorplanEditor.model, mode: 'over', base: 'v1'})}).then(r => r.status)""")
    check("server: overwriting with a stale base is refused (409)", r == 409, r)
    check("server: the saved file is the readable layout (short arrays on one line)",
          '"a": [' in (DATA / "house.json").read_text() or '[' in (DATA / "house.json").read_text().splitlines()[1])
finally:
    if os.environ.get("SHOT"):
        time.sleep(0.3)
        open(os.environ["SHOT"], "wb").write(base64.b64decode(call("Page.captureScreenshot", format="png")["data"]))
    chrome.kill(); srv.kill(); chrome.wait(); shutil.rmtree(prof, ignore_errors=True); shutil.rmtree(DATA, ignore_errors=True)

bad = [r for r in results if not r[0]]
for ok, name, info in results:
    print(("ok   " if ok else "FAIL ") + name + ("" if ok else f"  -> {info}"))
print(("OK " if not bad else "FAILED ") + f"{len(results) - len(bad)}/{len(results)}")
sys.exit(1 if bad else 0)
