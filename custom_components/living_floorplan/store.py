"""The plan and its versions, in Home Assistant's own storage (.storage/).

The same rules as the editor's own server (tools/serve.mjs): saving "new" adds a
version, saving "over" rewrites the latest one - and only when the editor started
from it (else the plan was saved meanwhile: a conflict, nothing is lost).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, MAX_VERSIONS, NOTE_MAX, STORAGE_VERSION


class Conflict(Exception):
    """The plan was saved meanwhile as another version."""

    def __init__(self, current: str | None) -> None:
        super().__init__(f"the plan was saved meanwhile as {current}")
        self.current = current


class PlanStore:
    """An index (current version, the list) and one store file per version."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._index = Store[dict[str, Any]](hass, STORAGE_VERSION, f"{DOMAIN}.index")
        self.index: dict[str, Any] = {"current": None, "versions": []}

    def _version_store(self, vid: str) -> Store[dict[str, Any]]:
        return Store[dict[str, Any]](self.hass, STORAGE_VERSION, f"{DOMAIN}.{vid}")

    async def async_load(self) -> None:
        self.index = await self._index.async_load() or {"current": None, "versions": []}

    def current_version(self) -> dict[str, Any] | None:
        return next((v for v in self.index["versions"] if v["id"] == self.index["current"]), None)

    async def async_plan(self) -> dict[str, Any] | None:
        """The current plan (a model v2), or None before the first save."""
        if not self.index["current"]:
            return None
        return await self.async_version(self.index["current"])

    async def async_version(self, vid: str) -> dict[str, Any] | None:
        if not any(v["id"] == vid for v in self.index["versions"]):
            return None
        data = await self._version_store(vid).async_load()
        return data and data.get("model")

    async def async_save(self, model: dict[str, Any], mode: str, note: str | None, base: str | None, user: str | None) -> dict[str, Any]:
        if not isinstance(model, dict) or model.get("version") != 2:
            raise ValueError("not a version 2 plan")
        ix = self.index
        now = datetime.now(UTC).isoformat()
        note = (note or "").strip()[:NOTE_MAX]
        if mode == "new" or not ix["current"]:
            n = max((int(v["id"][1:]) for v in ix["versions"] if v["id"][1:].isdigit()), default=0) + 1
            version = {"id": f"v{n}", "saved": now, "note": note}
            ix["versions"].append(version)
            ix["current"] = version["id"]
        else:
            if base != ix["current"]:
                raise Conflict(ix["current"])
            version = self.current_version()
            version["saved"] = now
            if note:
                version["note"] = note
        if user:
            version["user"] = user
        await self._version_store(version["id"]).async_save({"model": model})
        # the oldest versions go (never the current one)
        while len(ix["versions"]) > MAX_VERSIONS:
            old = next(v for v in ix["versions"] if v["id"] != ix["current"])
            ix["versions"].remove(old)
            await self._version_store(old["id"]).async_remove()
        await self._index.async_save(ix)
        return {"version": version, "versions": ix["versions"]}

    async def async_remove_all(self) -> None:
        """Everything this integration stored (when it is deleted)."""
        for v in self.index["versions"]:
            await self._version_store(v["id"]).async_remove()
        await self._index.async_remove()
        self.index = {"current": None, "versions": []}
