# Troubleshooting

**The card says there is no plan.** Draw and *Save* one in **Floor plan** (sidebar), or point the card at a file with
`model: /local/house.json`. The panel is for administrators only.

**I don't see Floor plan in the sidebar.** The integration is installed but not added: *Settings → Devices & services →
Add integration → Living Floor Plan*. After an update of the integration, restart Home Assistant.

**The card still looks old after an update.** The browser keeps the old file: reload the page (on the phone app:
*Settings → Companion app → Debugging → Reset frontend cache*).

**A lamp, sensor or cover does nothing on the plan.** Its entity does not exist (a typo, or it was renamed): the editor
says so by the entity field ("Home Assistant has no such entity"). Pick it again in the editor and save.

**A tap on a plug / the TV only opens its dialog.** By design: a tap switches only lights and covers (safe, and undone
with *Undo*). Make a tap switch something else with [`entities`](configuration.md#your-own-actions):
`switch.x: { tap_action: { action: toggle } }`.

**The light leaks through a door that is closed.** Give the door its contact sensor in the editor (a door without one
counts as closed, unless `doors: open`).

**The light stops at an open doorway.** The opening is a door without a contact sensor (closed by default); use a
*passage* for a doorway without a door, or set `doors: open`.

**A gap or a line between two walls.** Walls join when one ends on another; if the editor shows them not joined, drag
the end onto the other wall (it snaps). Walls that end a little short of another wall, or a little past it, are drawn to
its face by themselves.

**Time travel only goes back a week.** The recorder keeps about 10 days; [InfluxDB Proxy](companions.md#influxdb-proxy)
adds 30 days and 3 months.

**Holding a lamp opens Home Assistant's dialog, not the history.** Install [Entity Insights](companions.md#entity-insights)
and refresh the browser; check that `hold_action` is not `more-info`.

**The plan is tiny on the phone / shows too much garden.** Set a **start view** in the editor (*Plan → Start view →
Set to what I see*): the card opens there, and a phone turns the plan by its shape.

**Rooms are tinted red.** They are heating (a thermostat or a TRV in the room is heating). Off for everyone:
`room_heating: false`; for yourself: ⚙ → *Heating rooms tinted*.
