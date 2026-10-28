// Connection to Home Assistant over its WebSocket API: the list of entities
// (for picking) and their states, live (for the preview).
//
// Two ways in:
//  - the page is served by Home Assistant itself (same origin): the frontend's
//    login (localStorage "hassTokens") is used, refreshed when expired;
//  - anywhere else: the HA address and a long-lived access token, kept in this
//    browser's localStorage. (A login redirect is not possible from another
//    origin: HA does not allow cross-origin token requests.)

const STORE = "floorplan-editor.ha";

export class HaConnection {
  constructor() {
    this.states = new Map();       // entity_id -> state object
    this.ws = null;
    this.id = 1;
    this.pending = new Map();
    this.onChange = () => {};      // (entity_id | null) after states change; null = full reload
    this.onStatus = () => {};      // ("connected" | "closed" | "error", message)
  }

  static saved() { try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch { return null; } }
  static save(cfg) { if (cfg) localStorage.setItem(STORE, JSON.stringify(cfg)); else localStorage.removeItem(STORE); }

  // Inside a Home Assistant panel (an iframe of the same origin): the frontend's own login,
  // whether or not "keep me logged in" was ticked.
  static async parentToken() {
    try {
      const el = window.parent !== window && window.parent.document.querySelector("home-assistant");
      const auth = el && el.hass && el.hass.auth;
      if (!auth) return null;
      if (auth.expired) await auth.refreshAccessToken();
      return { url: location.origin, token: auth.accessToken };
    } catch { return null; }
  }

  // Token of the HA frontend when this page is served by HA (same origin).
  static async frontendToken() {
    let t;
    try { t = JSON.parse(localStorage.getItem("hassTokens") || "null"); } catch { return null; }
    if (!t || !t.access_token) return null;
    if (t.expires && t.expires < Date.now() + 30000 && t.refresh_token) {
      const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: t.clientId });
      const r = await fetch("/auth/token", { method: "POST", body });
      if (!r.ok) return null;
      const n = await r.json();
      t = { ...t, access_token: n.access_token, expires: Date.now() + n.expires_in * 1000 };
      localStorage.setItem("hassTokens", JSON.stringify(t));
    }
    return { url: location.origin, token: t.access_token };
  }

  connect({ url, token }) {
    this.close();
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url.replace(/\/+$/, "").replace(/^http/, "ws") + "/api/websocket");
      this.ws = ws;
      let ok = false;
      ws.onmessage = async (ev) => {
        const m = JSON.parse(ev.data);
        if (m.type === "auth_required") ws.send(JSON.stringify({ type: "auth", access_token: token }));
        else if (m.type === "auth_invalid") { reject(new Error(m.message || "auth_invalid")); ws.close(); }
        else if (m.type === "auth_ok") {
          ok = true;
          try {
            const list = await this.call({ type: "get_states" });
            this.states = new Map(list.map((s) => [s.entity_id, s]));
            await this.call({ type: "subscribe_events", event_type: "state_changed" });
            this.onStatus("connected", "");
            this.onChange(null);
            resolve();
          } catch (e) { reject(e); }
        } else if (m.type === "result" && this.pending.has(m.id)) {
          const p = this.pending.get(m.id);
          this.pending.delete(m.id);
          if (m.success) p.resolve(m.result); else p.reject(new Error(m.error && m.error.message));
        } else if (m.type === "event" && m.event && m.event.event_type === "state_changed") {
          const d = m.event.data;
          if (d.new_state) this.states.set(d.entity_id, d.new_state); else this.states.delete(d.entity_id);
          this.onChange(d.entity_id);
        }
      };
      ws.onerror = () => { if (!ok) reject(new Error("WebSocket")); this.onStatus("error", "WebSocket"); };
      ws.onclose = () => { this.onStatus("closed", ""); };
    });
  }

  call(msg) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ ...msg, id }));
    });
  }

  close() {
    if (this.ws) { this.ws.onclose = null; this.ws.close(); }
    this.ws = null;
    this.states = new Map();
  }

  get connected() { return !!this.ws && this.ws.readyState === 1; }

  // Home Assistant's areas and which entities are in them (an entity's own area, else its device's).
  async areas() {
    const [areas, ents, devs] = await Promise.all([
      this.call({ type: "config/area_registry/list" }),
      this.call({ type: "config/entity_registry/list_for_display" }),
      this.call({ type: "config/device_registry/list" }),
    ]);
    const devArea = new Map((devs || []).map((d) => [d.id, d.area_id]));
    const entityArea = new Map();
    for (const e of (ents && ents.entities) || []) {
      const a = e.ai || (e.di && devArea.get(e.di));
      if (a && !e.hb) entityArea.set(e.ei, a); // hb: hidden
    }
    return { areas: (areas || []).map((a) => ({ id: a.area_id, name: a.name })), entityArea };
  }
}
