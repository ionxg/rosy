/**
 * Central configuration. Tweak these without touching the modules.
 */
export const CONFIG = {
  // OpenFreeMap "liberty" style — free, no API key, includes building heights.
  // Swap for a MapTiler/your own style URL if you prefer.
  mapStyle: 'https://tiles.openfreemap.org/styles/liberty',

  // Socket.io endpoint. Same origin in dev (served by our Node server).
  // NOTE: in the installed app, "origin" is the device itself, so real
  // multiplayer won't connect until you deploy the server somewhere public and
  // set this to that URL, e.g. 'https://your-rosy-server.example.com'.
  socketUrl: window.location.origin,

  // Initial camera before we get a GPS fix (San Francisco-ish).
  fallbackCenter: [-122.4194, 37.7749],

  // Camera defaults
  defaultZoom: 17,
  tiltedPitch: 60,
  flatPitch: 0,

  // Data files for the POI + sponsor layers.
  poiData: './data/pois.json',
  sponsorData: './data/sponsors.json',

  // Demo helper: sample data ships with real-world coordinates. When true,
  // we translate that data so it appears AROUND the user's actual location,
  // which makes the demo explorable no matter where you are. Set false to
  // honor the literal coordinates in the JSON files.
  scatterNearUser: true,

  // How often (ms) to throttle position broadcasts to the server.
  moveBroadcastInterval: 1000,

  // How long (ms) to tween a peer avatar between two position updates so it
  // glides instead of teleporting.
  peerTweenMs: 450,

  // Ask the user for a display name on first load (persisted for the session).
  // Set false to skip the prompt and use a random guest name.
  displayNamePrompt: true,

  // Debug/demo mode: spawn simulated players who walk looping paths near the
  // user, so multiplayer movement is visible/testable in a single tab.
  demoMode: false,
  demoBots: 3, // how many simulated players (1-3)
};
