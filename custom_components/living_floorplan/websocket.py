"""WebSocket commands: the plan for the cards (any user), saving and versions for the editor (admins)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, EVENT_SAVED
from .store import Conflict, PlanStore


def _store(hass: HomeAssistant) -> PlanStore | None:
    return hass.data.get(DOMAIN)


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_plan)
    websocket_api.async_register_command(hass, ws_version)
    websocket_api.async_register_command(hass, ws_save)


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/plan"})
@websocket_api.async_response
async def ws_plan(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """The current plan, its version and the list of versions."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "the floor plan integration is not set up")
        return
    connection.send_result(msg["id"], {
        "model": await store.async_plan(),
        "version": store.current_version(),
        "versions": store.index["versions"],
    })


# "version", not "id": "id" is the message's own number in the WebSocket protocol
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/version", vol.Required("version"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_version(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """One saved version of the plan (to open it in the editor)."""
    store = _store(hass)
    model = store and await store.async_version(msg["version"])
    if model is None:
        connection.send_error(msg["id"], "not_found", "no such version")
        return
    connection.send_result(msg["id"], {"model": model})


@websocket_api.websocket_command({
    vol.Required("type"): f"{DOMAIN}/save",
    vol.Required("model"): dict,
    vol.Required("mode"): vol.In(["over", "new"]),
    vol.Optional("note"): vol.Any(str, None),
    vol.Optional("base"): vol.Any(str, None),
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Save the plan as a new version, or over the latest one (only the one the editor started from)."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_loaded", "the floor plan integration is not set up")
        return
    user = connection.user.name if connection.user else None
    try:
        res = await store.async_save(msg["model"], msg["mode"], msg.get("note"), msg.get("base"), user)
    except Conflict as err:
        connection.send_error(msg["id"], "conflict", str(err))
        return
    except ValueError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    hass.bus.async_fire(EVENT_SAVED, {"version": res["version"]["id"]})
    connection.send_result(msg["id"], res)
