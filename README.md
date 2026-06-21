# Rosy

Rosy is a browser-based map game for local tourism and discovery. Think of it as
a small, web version of Pokémon GO. It puts an interactive 3D map on your real
GPS location, shows a live avatar that other connected players can see, and marks
nearby points of interest and sponsored businesses you can tap for details.

It's built on MapLibre GL JS for the maps and Node.js with Socket.io for the
real-time multiplayer side.

## Features

- 3D interactive map using MapLibre GL JS, with 3D buildings and zoom, rotate,
  and tilt controls.
- Real GPS centering through the browser Geolocation API, following you as your
  position changes.
- A live avatar marker that sits in the 3D scene, tilts with the map, and rotates
  to face the way you're heading.
- Real-time multiplayer over Socket.io. Connected players see each other's avatars
  and an online-presence counter. Peer avatars glide between updates instead of
  teleporting, and turn to face their direction of travel.
- Display names. Pick a name on first load and it shows on a label above your
  avatar and is sent to everyone else for the session.
- Waves. Tap the wave button to send a quick emote that animates above your
  avatar for all players.
- Demo mode. Flip one config flag to spawn a couple of simulated players who walk
  looping paths near you, so you can test multiplayer in a single tab.
- Points of interest loaded from a JSON file. Tap a marker for an info card with
  the name, photo, description, and a directions link.
- Sponsored locations rendered as distinct building markers. Tap one to see
  details, a menu, and the current offer. Adding a sponsor is a JSON edit.
- Mobile-first UI: touch-friendly, safe-area aware, dark theme.

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

Each piece (map, avatar, multiplayer, POIs, sponsors) lives in its own module so
you can work on them separately.

## Run it locally

You'll need Node.js 18 or newer.

```bash
cd rosy-web/server
npm install
npm start
```

Then open http://localhost:3000 in your browser.

The Node server serves the front-end and hosts the Socket.io endpoint on the same
origin, so there's nothing else to start.

### Geolocation note

Browsers only allow the Geolocation API on `localhost` or over HTTPS. On
`localhost` it works out of the box. If the browser blocks location, or you deny
the prompt, Rosy falls back to a demo location so the app still runs.

### Try multiplayer

Open the URL in two browser windows or tabs, or on two devices on the same
network pointing at your machine's LAN IP (for example
`http://192.168.x.x:3000`). Each gets its own avatar and you'll see the others
move in real time. The online counter in the top-right reflects who's connected.

For phones to reach your laptop they need to be on the same Wi-Fi, and the phone
needs HTTPS for GPS to work. The easiest path is to run a tunnel like
`npx localtunnel --port 3000` or `ngrok http 3000` and open the HTTPS URL it
gives you.

## Display names, waves, and demo mode

### Display names

On first load Rosy asks for a display name. It's stored in `sessionStorage` for
the browser session, shown on a label above your avatar, and sent to other
players over Socket.io. To skip the prompt and use a random guest name, set
`displayNamePrompt: false` in `public/js/config.js`. To pick a new name, clear
the tab's session storage or open a fresh private window.

### Waves

Tap the wave button in the bottom-right controls to send a wave. It animates
above your avatar right away and is sent so every other player sees it.

### Demo mode (test multiplayer in a single tab)

You don't need a second device to see multiplayer working. In
`public/js/config.js`:

```js
demoMode: true,   // spawn simulated players
demoBots: 3,      // how many (1–3)
```

Reload the page. Rosy spawns a few simulated players that walk looping paths near
your location, gliding between points, turning to face their direction of travel,
and occasionally throwing an emote. They run client-side only, so they never
reach the server or affect real presence (the online counter shows real players
plus bots). To change their names, colors, path radius, or speed, edit the `BOTS`
array in `public/js/demo.js`.

## Adding your own content

### Points of interest

Edit `public/data/pois.json`. Each entry looks like this:

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

Edit `public/data/sponsors.json`. Each entry can include an `offer` and a `menu`:

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

Adding POIs or sponsors doesn't need any code changes, just append to the JSON.

### Demo placement

The sample data uses real San Francisco coordinates. Since your actual GPS
location is probably somewhere else, `config.js` ships with
`scatterNearUser: true`, which moves the sample markers to appear around wherever
you are so the demo works anywhere. Set it to `false` to use the literal
coordinates in the JSON files.

## Configuration

All tunables live in `public/js/config.js`:

| Key | Purpose |
| --- | --- |
| `mapStyle` | MapLibre style URL (default: OpenFreeMap "liberty", free, no key). |
| `socketUrl` | Socket.io endpoint (defaults to same origin). |
| `fallbackCenter` | Camera/location used when GPS is unavailable. |
| `defaultZoom` / `tiltedPitch` | Initial camera framing. |
| `poiData` / `sponsorData` | Paths to the JSON data files. |
| `scatterNearUser` | Demo helper that places sample markers around the user. |
| `moveBroadcastInterval` | Throttle (ms) for position broadcasts. |
| `peerTweenMs` | Glide duration (ms) when a peer avatar moves between updates. |
| `displayNamePrompt` | Ask for a display name on first load (else random guest). |
| `demoMode` | Spawn simulated players for single-tab testing. |
| `demoBots` | How many simulated players (1–3) when `demoMode` is on. |

## How it works

1. `main.js` builds the map, asks for a display name, then starts
   `navigator.geolocation.watchPosition`.
2. The chosen name is sent via `player:hello`. Each GPS fix moves the local
   avatar and, throttled, emits `player:move` to the server.
3. The Socket.io server keeps an in-memory presence map and relays joins, moves,
   names, leaves, and emotes to other clients, along with a `presence` count.
4. Remote clients spawn peer avatars and tween them between updates, rotating
   each to face its travel direction. Emotes animate above the sender.
5. The POI and sponsor layers fetch their JSON and render tappable markers that
   open the shared info card.
6. With `demoMode` on, `demo.js` spawns client-side bot avatars that loop near
   the user, with no server involved.

## Tech and licenses

- [MapLibre GL JS](https://maplibre.org/) — BSD-3-Clause.
- [OpenFreeMap](https://openfreemap.org/) tiles and style — free, no API key.
- [Socket.io](https://socket.io/) — MIT.
- [Express](https://expressjs.com/) — MIT.

Map data © OpenStreetMap contributors.
