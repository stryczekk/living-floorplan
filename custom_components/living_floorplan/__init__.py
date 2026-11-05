"""Living Floor Plan: the house's floor plan for dashboards, its editor as a panel, the plan kept in Home Assistant.

One install: the card is loaded on every dashboard (no resource to add), the editor is a panel
in the sidebar (admins), and the plan with its versions lives in .storage - no files to copy.
"""

from __future__ import annotations

from pathlib import Path

from homeassistant.components import frontend, panel_custom
from aiohttp import web

from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import CARD_FILE, DOMAIN, PANEL_FILE, PANEL_URL, STATIC_URL
from .store import PlanStore
from .websocket import async_register

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)
# the editor page, always asked for again (a remembered old editor saved plans the old way)
EDITOR_URL = f"/{DOMAIN}/editor"
# pdf.js next to the editor page: the editor asks for "pdfjs/" relative to its own address (/living_floorplan/editor)
PDFJS_URL = f"/{DOMAIN}/pdfjs"
FRONTEND = Path(__file__).parent / "frontend"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    async_register(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = PlanStore(hass)
    await store.async_load()
    hass.data[DOMAIN] = store
    # the version and the files' time: a new address after an update of the files (a reload is enough)
    version = f"{(await async_get_integration(hass, DOMAIN)).version}-{await hass.async_add_executor_job(_stamp)}"
    card_url = f"{STATIC_URL}/{CARD_FILE}?v={version}"
    hass.data[f"{DOMAIN}_card_url"] = card_url
    # the card, the editor and the panel; a version in the address so browsers take a new one after an update
    if not hass.data.get(f"{DOMAIN}_static"):
        await hass.http.async_register_static_paths([
            StaticPathConfig(STATIC_URL, str(FRONTEND), False),
            StaticPathConfig(PDFJS_URL, str(FRONTEND / "pdfjs"), True),  # one fixed pdf.js version: cached
        ])
        hass.http.register_view(EditorView())
        hass.data[f"{DOMAIN}_static"] = True
    frontend.add_extra_js_url(hass, card_url)
    if PANEL_URL not in hass.data.get(frontend.DATA_PANELS, {}):
        await panel_custom.async_register_panel(
            hass,
            frontend_url_path=PANEL_URL,
            webcomponent_name="living-floorplan-panel",
            module_url=f"{STATIC_URL}/{PANEL_FILE}?v={version}",
            sidebar_title="Floor plan",
            sidebar_icon="mdi:floor-plan",
            require_admin=True,
            config={"editor": f"{EDITOR_URL}?v={version}"},
        )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    if url := hass.data.pop(f"{DOMAIN}_card_url", None):
        frontend.remove_extra_js_url(hass, url)
    frontend.async_remove_panel(hass, PANEL_URL)
    hass.data.pop(DOMAIN, None)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """The integration deleted: its plans go too."""
    store = PlanStore(hass)
    await store.async_load()
    await store.async_remove_all()


def _stamp() -> int:
    """The newest modification time of the frontend files (seconds)."""
    return int(max((f.stat().st_mtime for f in FRONTEND.iterdir() if f.is_file()), default=0))


class EditorView(HomeAssistantView):
    """The editor page with `no-cache`: a browser checks it every time (its address never changes)."""

    url = EDITOR_URL
    name = f"{DOMAIN}:editor"
    requires_auth = False  # a page like the frontend itself; the plan is read and saved over the authenticated WebSocket

    async def get(self, request: web.Request) -> web.FileResponse:
        return web.FileResponse(FRONTEND / "editor.html", headers={"Cache-Control": "no-cache"})
