# Configuration

Everything is optional. The smallest card:

```yaml
type: custom:living-floorplan-card
```

The card also has a visual editor in the dashboard (the common options).

## Examples

### A wall tablet

```yaml
type: custom:living-floorplan-card
kiosk:
  idle: 60                 # back to the start view after a minute untouched
  night_dim: sun           # dimmed between sunset and sunrise ("22:00-06:00" works too)
  dim: 0.4
camera_popup: kiosk        # a camera that sees someone shows its picture (in tablet mode)
lock_action: hold          # the front door opens after holding the lock 0.8 s
hide: [furniture]
theme: dark
```

### Energy and cost

```yaml
type: custom:living-floorplan-card
price: 0.30                # a kWh, in Home Assistant's currency (or a sensor with the price in Entity Insights)
power_total: sensor.house_power   # the house's meter in the corner (devices with a power sensor show theirs anyway)
map: light_energy          # open on the energy-of-the-light map
map_days: 30
```

Each lamp's power (`Power (W)` in the editor) is what the light map and the history dialogs count with.

### Alerts

```yaml
type: custom:living-floorplan-card
cold:
  outside: sensor.outdoor_temperature
  below: 12                # an open window pulses blue when it is colder outside
alerts:
  - entity: binary_sensor.freezer_door
    state: "on"
    name: Freezer open
  - entity: sensor.server_room_temperature
    above: 30
    room: utility
    color: "#e57373"
```

### Rules

Quiet looks while something holds - the room tinted, the mark glowing or blinking:

```yaml
rules:
  - entity: sensor.bedroom_co2
    above: 1000
    color: "#ffab40"               # the bedroom tinted orange
  - entity: binary_sensor.kitchen_window
    state: "on"
    for: 15                        # minutes
    blink: true
```

### Your own actions

```yaml
entities:
  switch.christmas_tree:
    tap_action: { action: toggle }             # a plug that a tap switches (by default a tap opens its details)
  camera.front_door:
    tap_action: { action: navigate, navigation_path: /dashboard-cameras/door }
  scene.movie_night:
    hold_action:
      action: perform-action
      perform_action: scene.turn_on
      target: { entity_id: scene.movie_night }
      confirmation: { text: Start movie night? }
```

Actions are Home Assistant's own: `more-info`, `toggle`, `perform-action`, `navigate`, `url`, `fire-dom-event`,
`none`, with `confirmation`. A camera answers to either of its streams, a chandelier to either circuit, a room's
reading to its temperature sensor.

### Widgets

```yaml
widgets:
  - type: clock
  - type: state
    entity: weather.home           # "13° clouds"
  - type: calendar
    entity: calendar.family
  - type: button
    entity: script.good_night
    name: Good night
    at: [92, 8]                    # on the plan (x %, y %) instead of the bar under it
```

### A plan in a file

```yaml
model: /local/house.json           # a house.json saved by the editor, in config/www/
floor: first-floor                 # open on this floor
```

## All options

| Option | Default | |
|---|---|---|
| `model` | the integration's plan | URL of a `house.json` (or the model object) instead of the plan kept by the integration |
| `floor` | ground floor | the floor shown on load (a floor `id`) |
| `light` | `realistic` | `glow` - round glows clipped to the rooms |
| `doors` | `closed` | doors without a contact sensor stop the light; `open` - light goes through every doorway |
| `rotate` | `auto` | `0` / `90`; `auto` turns a wide plan on a tall screen (by the start view's shape when there is one) |
| `height` | from the plan | the card's height in px |
| `show_floors`, `show_zoom` | `true` | the floor buttons, the zoom buttons |
| `show_room_names` | `false` | room names on the plan |
| `hold_action` | `insights` | `more-info` - always Home Assistant's own dialog, also when Entity Insights is installed |
| `lock_action` | `more-info` | `hold` - a lock / door strike opens after holding it 0.8 s (a tap never opens it) |
| `undo` | `true` | the bar with *Undo* after a tap that switched something (small, in a corner, on a phone); `false` - none |
| `fixture_tap` | `toggle` | a two-circuit chandelier: `toggle` - a tap lights the smaller circuit, the next turns it off; `cycle` - smaller, both, off |
| `room_tap` | `dialog` | a tap on a room's empty floor opens the room; `none` |
| `entities` | - | your own `tap_action` / `hold_action` per entity (above) |
| `maps` | `true` | the ▦ button; `map` - the map on load: `temperature`, `humidity`, `light_hours`, `presence_hours`, `light_energy` (the light's energy and cost), `energy` (all the energy in the rooms, from meters), `signal` (Zigbee / Wi-Fi signal of the devices) |
| `map_days` | `7` | days for the hours maps |
| `time_travel` | `true` | the ⏱ button |
| `events` | alarms, locks, cameras | `[{ entity, state?, above?, below?, name?, color? }]` - more marks on the time line; `false` - none |
| `influx` | `true` | use [InfluxDB Proxy](companions.md#influxdb-proxy) for history beyond the recorder when installed |
| `price` | - | a kWh, for the light energy map |
| `power`, `power_total`, `power_min` | auto, -, `2` | live power: by each device (`false` hides it; `{ <entity>: <sensor or list> }` by hand), the house's meter for the corner, the watts below which a device shows nothing |
| `alerts` | - | `[{ entity, state? \| above? \| below?, room?, color?, name? }]` |
| `cold` | - | `{ outside: <sensor>, below: 12 }` - open windows in the cold |
| `rules` | - | `[{ entity, state? \| above? \| below?, attribute?, for?, color?, blink?, room?, target? }]` |
| `forgotten` | `{ minutes: 30 }` | a lamp on this long in a room whose sensors saw nobody as long; `false` - off |
| `room_heating` | `true` | rooms tinted while their thermostat / TRV heats (also the plan's own heating tints); each viewer can switch it in ⚙ |
| `trail`, `trail_minutes` | `true`, `30` | the trail of movement |
| `sun` | - | `true` or `{ offset: -12 }` - sunlight through the windows (`offset`: degrees the house is turned from its facades) |
| `camera_popup` | `kiosk` | a camera that sees someone shows its picture: `kiosk`, `always`, `never` |
| `camera_popup_seconds` | `30` | the picture closes this long after it goes quiet |
| `camera_detect` | found | `{ camera.x: binary_sensor.y }` when the person sensor is not on the camera's device |
| `kiosk` | - | `{ idle: 60, night_dim: "22:00-06:00" \| sun, dim: 0.4 }` - tablet mode |
| `lasso` | `true` | the ◌ lasso |
| `widgets` | - | `[{ type: clock \| calendar \| state \| button, entity?, attribute?, name?, icon?, tap_action?, hold_action?, at? }]`; `name` can carry the entity's attributes: `"Bins · {when}"` (`{state}` = its state) |
| `hide` | - | layers hidden on load: `idle_lights`, `sensors`, `devices`, `cameras`, `furniture` |
| `theme` | `auto` | `dark` / `light`; `auto` follows Home Assistant |
| `accent` | yellow | `#rrggbb` for the selected buttons and the time line |
| `editor_url` | the integration's panel | where *Open the editor* leads |
| `show_version` | `false` | a small version label (for testing) |

Where the card opens (its zoom and position) is set in the editor: **Plan → Start view**.
