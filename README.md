# Rosy 🌹

A web-based, location-based map for **local tourism & discovery** — a smaller-scale,
browser version of Pokémon GO. It centers an interactive 3D map on your real GPS
location, drops a live avatar that other connected players can see in real time,
and surfaces tourism points of interest and sponsored businesses as tappable
markers.

Built with **MapLibre GL JS** (open source maps) + **Node.js / Socket.io** for
real-time multiplayer presence.

---

## Features

- 🗺️ **3D interactive map** — MapLibre GL JS with 3D building extrusions, plus
  zoom / rotate / tilt camera controls.
- 📍 **Real GPS centering** — uses the browser Geolocation API and follows you
  as your position updates.
- 🧍 **Live avatar** — a marker that sits in the 3D scene (tilts with the map)
  and rotates to face your heading.
- 👥 **Real-time multiplayer** — connected users broadcast their positions over
  Socket.io and see each other's avatars, with an online-presence counter. Peer
  avatars **glide smoothly** between updates (tweened, no teleporting) and turn
  to face their direction of travel.
- 🪪 **Display names** — pick a name on first load (kept for the session); it
  shows on a label above your avatar and is broadcast to everyone.
- 👋 **Waves / emotes** — tap the wave button to send an emote that briefly
  animates above your avatar for all players.
- 🤖 **Demo mode** — flip one config flag to spawn 2–3 simulated players who
  walk looping paths near you, so multiplayer is testable in a single tab.
- 🏛️ **Points of interest** — tourism spots loaded from a JSON file; tap a
  marker to open an info card with name, photo, description, and a directions link.
- 🍽️ **Sponsored locations** — data-driven businesses rendered as distinct
  faux-3D building markers; tap to see details, menu, and current offer. Add new
  sponsors by editing one JSON file.
- 📱 **Mobile-first UI** — touch-friendly, safe-area aware, dark theme.

---

## Project structure

```
rosy-web/
├── server/
│   ├── server.js          # Express static server + Socket.io presence
│   └── package.json
├── public/
│   ├── index.html         # App shell + UI chrome
│   ├── css/styles.css     # Mobile-first styles
│   ├── js/
│   │   ├── config.js      # Tunable settings (map style, endpoints, demo flags)
│   │   ├── map.js         # MapLibre init, 3D buildings, camera controls
│   │   ├── avatar.js      # Avatar marker (self + peers)
│   │   ├── multiplayer.js # Socket.io client, peer rendering, presence
│   │   ├── pois.js        # POI layer (JSON-driven)
│   │   ├── sponsors.js    # Sponsored-locations layer (JSON-driven)
│   │   ├── demo.js        # Simulated players for single-tab demo mode
│   │   ├── ui.js          # Card + status/presence + display-name prompt
│   │   ├── geo.js         # Small geo helpers
│   │   └── main.js        # Entry point — wires everything together
│   └── data/
│       ├── pois.json      # Tourism points of interest
│       └── sponsors.json  # Sponsored businesses
└── README.md
```

Each concern lives in its own module (map, avatar, multiplayer, POIs, sponsors)
so they can be developed and reasoned about independently.

---

## Run it locally

**Prerequisites:** Node.js 18+.

```bash
cd rosy-web/server
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

> The Node server serves the front-end *and* hosts the Socket.io endpoint on the
> same origin, so there's nothing else to start.

### Geolocation note
Browsers only grant the Geolocation API on **`localhost`** or **HTTPS**. On
`localhost` it works out of the box. If the browser blocks location (or you deny
the prompt), Rosy falls back to a demo location so the app still runs.

### Try multiplayer
Open the URL in **two browser windows/tabs** (or two devices on the same network
pointing at your machine's LAN IP, e.g. `http://192.168.x.x:3000`). Each gets its
own avatar, and you'll see the others move in real time. The "online" counter in
the top-right reflects live presence.

> For phones to reach your laptop they must be on the same Wi‑Fi, and the phone
> needs HTTPS for GPS. Easiest path: run a tunnel like `npx localtunnel --port 3000`
> or `ngrok http 3000` and open the HTTPS URL it gives you.

---

## Display names, waves & demo mode

### Display names
On first load Rosy asks for a **display name**. It's stored in `sessionStorage`
(kept for the browser session), shown on a label above your avatar, and broadcast
to other players over Socket.io. To skip the prompt and use a random guest name,
set `displayNamePrompt: false` in `public/js/config.js`. To pick a new name, clear
the tab's session storage (or open a fresh private window).

### Waves
Tap the **👋 button** (bottom-right controls) to send a wave. It animates above
your avatar instantly and is broadcast so every other player sees it too.

### Demo mode (test multiplayer in a single tab)
You don't need a second device to see multiplayer come alive. In
`public/js/config.js`:

```js
demoMode: true,   // spawn simulated players
demoBots: 3,      // how many (1–3)
```

Reload the page. Rosy spawns 2–3 **simulated players** that walk looping paths
near your location — gliding smoothly, turning to face their direction of travel,
and occasionally throwing an emote. They're rendered client-side only, so they
never reach the server or affect real presence (the online counter shows
`real players + bots`). The bot cast is data-driven — edit the `BOTS` array in
`public/js/demo.js` to change names, colors, path radius, or speed.

---

## Adding your own content

### Points of interest
Edit `public/data/pois.json`. Each entry:

```json
{
  "id": "unique-id",
  "name": "Display name",
  "icon": "🏛️",
  "lng": -122.3933,
  "lat": 37.7955,
  "description": "Shown in the info card.",
  "address": "Optional address line",
  "photo": "https://…",
  "directionsUrl": "optional; auto-generated from lng/lat if omitted"
}
```

### Sponsored locations
Edit `public/data/sponsors.json`. Each entry supports an `offer` and a `menu`:

```json
{
  "id": "unique-id",
  "name": "Rosy's Bistro",
  "category": "Restaurant",
  "tag": "Eat",
  "icon": "🍝",
  "color": "#ff5d8f",
  "lng": -122.4010,
  "lat": 37.7890,
  "description": "Short blurb.",
  "address": "112 Market St, San Francisco, CA",
  "photo": "https://…",
  "offer": "Free dessert — show this card!",
  "menu": [
    { "name": "Tagliatelle al Ragù", "price": "$18" }
  ]
}
```

No code changes are required to add POIs or sponsors — just append to the JSON.

### Demo placement
The sample data uses real San Francisco coordinates. Because your actual GPS
location is probably elsewhere, `config.js` ships with `scatterNearUser: true`,
which **translates the sample markers to appear around wherever you are** so the
demo is explorable anywhere. Set it to `false` to honor the literal coordinates
in the JSON files.

---

## Configuration

All tunables live in `public/js/config.js`:

| Key | Purpose |
| --- | --- |
| `mapStyle` | MapLibre style URL (default: OpenFreeMap "liberty", free / no key). |
| `socketUrl` | Socket.io endpoint (defaults to same origin). |
| `fallbackCenter` | Camera/location used when GPS is unavailable. |
| `defaultZoom` / `tiltedPitch` | Initial camera framing. |
| `poiData` / `sponsorData` | Paths to the JSON data files. |
| `scatterNearUser` | Demo helper — place sample markers around the user. |
| `moveBroadcastInterval` | Throttle (ms) for position broadcasts. |
| `peerTweenMs` | Glide duration (ms) when a peer avatar moves between updates. |
| `displayNamePrompt` | Ask for a display name on first load (else random guest). |
| `demoMode` | Spawn simulated players for single-tab testing. |
| `demoBots` | How many simulated players (1–3) when `demoMode` is on. |

---

## How it works (data flow)

1. `main.js` builds the map, asks for a display name, then starts
   `navigator.geolocation.watchPosition`.
2. The chosen name is sent via `player:hello`; each GPS fix moves the local
   **avatar** and (throttled) emits `player:move` to the server.
3. The **Socket.io** server keeps an in-memory presence map and relays joins,
   moves, names, leaves, and **emotes** to other clients, plus a `presence` count.
4. Remote clients spawn peer **avatars** and **tween** them between updates,
   rotating each to face its travel direction; emotes animate above the sender.
5. **POI** and **sponsor** layers fetch their JSON and render tappable markers
   that open the shared info **card**.
6. With `demoMode` on, `demo.js` spawns client-side bot avatars that loop near
   the user — no server involved.

---

## Tech & licenses

- [MapLibre GL JS](https://maplibre.org/) — BSD-3-Clause.
- [OpenFreeMap](https://openfreemap.org/) tiles/style — free, no API key.
- [Socket.io](https://socket.io/) — MIT.
- [Express](https://expressjs.com/) — MIT.

Map data © OpenStreetMap contributors.
