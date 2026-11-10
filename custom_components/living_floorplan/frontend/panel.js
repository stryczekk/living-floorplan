// card/panel.js
var PANEL_BUILD = true ? "1.0.5 \xB7 10.11, 21:16" : "dev";
var LivingFloorplanPanel = class extends HTMLElement {
  set hass(h) {
    this._hass = h;
  }
  set narrow(n) {
    this._narrow = n;
    this._render();
  }
  set panel(p) {
    this._panel = p;
    this._render();
  }
  connectedCallback() {
    this._render();
  }
  _render() {
    if (!this._panel) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" }).innerHTML = `<style>
        :host { display: block; height: 100vh; height: 100dvh; position: relative; background: var(--primary-background-color, #131a24); }
        iframe { border: 0; width: 100%; height: 100%; display: block; }
        button { position: absolute; left: 6px; bottom: 6px; z-index: 2; width: 40px; height: 40px; border-radius: 20px; border: 1px solid #2a3547;
          background: #1b2433; color: #c3cfdf; font-size: 20px; cursor: pointer; }
        button[hidden] { display: none; }
        #ver { position: absolute; right: 8px; top: 4px; z-index: 2; font: 11px sans-serif; color: #7c8ca3; pointer-events: none; }
      </style><button id="menu" title="Menu" aria-label="Menu">\u2630</button><span id="ver"></span><iframe title="Floor plan editor"></iframe>`;
      this.shadowRoot.getElementById("ver").textContent = "panel " + PANEL_BUILD;
      this._fresh = Date.now().toString(36);
      this.shadowRoot.getElementById("menu").onclick = () => this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
    }
    this.shadowRoot.getElementById("menu").hidden = !this._narrow;
    const src = this._panel.config && this._panel.config.editor || "/living_floorplan/static/editor.html";
    const f = this.shadowRoot.querySelector("iframe");
    const full = src + (src.includes("?") ? "&" : "?") + "ha=1&t=" + this._fresh + "&lang=" + (this._hass && this._hass.locale && this._hass.locale.language || "");
    if (f.getAttribute("src") !== full) f.setAttribute("src", full);
  }
};
if (!customElements.get("living-floorplan-panel")) customElements.define("living-floorplan-panel", LivingFloorplanPanel);
