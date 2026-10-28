"""Constants of the floor plan integration."""

DOMAIN = "living_floorplan"
# where the card, the editor and the panel are served from
STATIC_URL = f"/{DOMAIN}/static"
PANEL_URL = "living-floorplan"
CARD_FILE = "living-floorplan-card.js"
EDITOR_FILE = "editor.html"
PANEL_FILE = "panel.js"
# fired after a save: the cards on the dashboards load the plan again
EVENT_SAVED = f"{DOMAIN}_saved"
# versions kept (the current one always stays)
MAX_VERSIONS = 50
STORAGE_VERSION = 1
NOTE_MAX = 200
