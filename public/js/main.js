/**
 * main.js — app entry point
 * -------------------------
 * Wires the modules together:
 *   1. Build the map (3D buildings + camera controls).
 *   2. Watch the browser Geolocation API.
 *   3. Drop/move the local avatar; broadcast position over Socket.io.
 *   4. Render remote peers + presence count.
 *   5. Load POI + sponsor layers from JSON (placed near the user in demo mode).
 */
import { CONFIG } from './config.js';
import { createMap, flyTo, toggleTilt, resetNorth, zoomForScaleMeters } from './map.js';
import { Avatar } from './avatar.js';
import { Multiplayer } from './multiplayer.js';
import { POILayer } from './pois.js';
import { SponsorLayer } from './sponsors.js';
import { initUI, setStatus, setPresence, promptDisplayName, promptLocationConsent } from './ui.js';
import { startDemoBots } from './demo.js';
import { bearing } from './geo.js';
import { ensureLocationPermission, ensureLocationServices } from './native.js';

// Remember the last place we saw the user so the app reopens there (instead of
// a hard-coded city) and so a denied/blocked GPS falls back somewhere relevant.
const LAST_LOC_KEY = 'rosy:lastLoc';
function loadLastLoc() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_LOC_KEY));
    if (v && Number.isFinite(v.lng) && Number.isFinite(v.lat)) return v;
  } catch { /* ignore */ }
  return null;
}
function saveLastLoc(lng, lat) {
  try { localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lng, lat })); } catch { /* ignore */ }
}

const map = createMap(loadLastLoc());
initUI();

// Presence shown = real online players (from server) + any local demo bots.
let lastServerCount = 1;
let demoBotCount = 0;
const showPresence = () => setPresence(lastServerCount + demoBotCount);

const net = new Multiplayer(map, (count) => { lastServerCount = count; showPresence(); });
const poiLayer = new POILayer(map);
const sponsorLayer = new SponsorLayer(map);

let selfAvatar = null;
let lastLoc = null;
let layersPlaced = false;
let didFirstFly = false;
let demoStarted = false;
let geoWatchId = null;   // active watchPosition id, or null when location is off
let locationOn = false;  // whether we're actively tracking + sharing location
let avatarsVisible = true; // avatars (incl. self) hide when zoomed out past the threshold

// The zoom level the opening / recenter view should use (scale bar ≈ startViewMeters).
function startZoomFor(lat) {
  return zoomForScaleMeters(CONFIG.startViewMeters, lat);
}

// Hide every avatar (peers + self) once the view is wider than avatarHideMeters
// (scale bar reads more than that), so they only appear when you're zoomed in.
function updateAvatarVisibility() {
  const lat = map.getCenter().lat;
  const hideZoom = zoomForScaleMeters(CONFIG.avatarHideMeters, lat);
  avatarsVisible = map.getZoom() >= hideZoom;
  // Your own dot also requires location to be ON (so toggling off hides you).
  if (selfAvatar) selfAvatar.setVisible(avatarsVisible && locationOn);
  net.setPeersVisible(avatarsVisible);
}
map.on('zoom', updateAvatarVisibility);
// New peers that appear while zoomed out should respect the current visibility.
net.onSpawn = (a) => a.setVisible(avatarsVisible);

const SUGGESTED_NAMES = ['Explorer', 'Wanderer', 'Otter', 'Sparrow', 'Comet', 'Nomad', 'Fox'];
const randomName = () =>
  `${SUGGESTED_NAMES[Math.floor(Math.random() * SUGGESTED_NAMES.length)]}-${Math.floor(Math.random() * 90 + 10)}`;

// --- Layer loading ---------------------------------------------------------
// Load data immediately; if we already have a location, place near user,
// otherwise place once the first GPS fix arrives.
async function loadLayers() {
  try {
    await Promise.all([poiLayer.load(), sponsorLayer.load()]);
    placeLayers();
  } catch (err) {
    console.error(err);
    setStatus('Could not load map data', true);
  }
}

function placeLayers() {
  if (layersPlaced && CONFIG.scatterNearUser && !lastLoc) return;
  poiLayer.render(lastLoc);
  sponsorLayer.render(lastLoc);
  layersPlaced = true;
}

// Spawn simulated players once, near the user's known location.
function maybeStartDemoBots(origin) {
  if (!CONFIG.demoMode || demoStarted || !origin) return;
  demoStarted = true;
  const { count } = startDemoBots(map, origin, CONFIG.demoBots);
  demoBotCount = count;
  showPresence();
  setStatus(`Demo mode: ${count} simulated players walking nearby`, true);
}

// --- Geolocation -----------------------------------------------------------
// Request the OS permission (native) then begin tracking. Used both on first
// consent and whenever the user re-enables location via the 📍 button.
async function enableLocation() {
  await ensureLocationPermission();          // app permission (allow Rosy to use location)
  await ensureLocationServices();            // device GPS switch — Uber-style one-tap turn-on
  startGeolocation();
}

function startGeolocation() {
  if (!('geolocation' in navigator)) {
    setStatus('Geolocation not supported — showing demo location', true);
    useFallbackLocation();
    return;
  }

  setStatus('Locating you…');
  geoWatchId = navigator.geolocation.watchPosition(onPosition, onGeoError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 15000,
  });
  locationOn = true;
  updateLocationButton();
}

// Turn location OFF: stop tracking and stop sharing our position with peers.
function stopGeolocation() {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  locationOn = false;
  updateLocationButton();
  updateAvatarVisibility();   // hide your own dot right away
  setStatus('Location off — your dot is hidden and you’ve stopped sharing', true);
}

function updateLocationButton() {
  const btn = document.getElementById('btn-location');
  if (!btn) return;
  btn.classList.toggle('active', locationOn);   // lit when tracking
  btn.classList.toggle('loc-off', !locationOn); // red slash when off
  btn.setAttribute('aria-pressed', String(locationOn));
  btn.title = locationOn ? 'Location on — tap to turn off' : 'Location off — tap to turn on';
}

function onPosition(pos) {
  const { longitude: lng, latitude: lat, heading } = pos.coords;
  const loc = { lng, lat };

  // Heading: prefer device heading; else infer from movement.
  let hdg = Number.isFinite(heading) ? heading : (lastLoc ? bearing(lastLoc, loc) : 0);

  if (!selfAvatar) {
    selfAvatar = new Avatar(map, { lng, lat, color: '#ff5d8f', self: true, heading: hdg });
    updateAvatarVisibility();
  } else {
    selfAvatar.moveTo(lng, lat, hdg);
  }

  if (!didFirstFly) {
    didFirstFly = true;
    flyTo(map, lng, lat, { zoom: startZoomFor(lat), pitch: CONFIG.tiltedPitch });
    setStatus('You are here — explore the map!', true);
    // Place demo layers around the user now that we know where they are.
    if (CONFIG.scatterNearUser) { lastLoc = loc; placeLayers(); }
    maybeStartDemoBots(loc);
    // Re-evaluate avatar visibility once we've settled at the close-up view.
    map.once('moveend', updateAvatarVisibility);
  }

  lastLoc = loc;
  saveLastLoc(lng, lat); // so next launch opens here, not a default city
  net.sendPosition(lng, lat, hdg);
}

function onGeoError(err) {
  console.warn('Geolocation error:', err.message);
  setStatus('Location unavailable — showing demo location', true);
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  locationOn = false;
  updateLocationButton();
  useFallbackLocation();
}

function useFallbackLocation() {
  // Prefer where we last saw the user; only fall back to the configured city
  // if we've genuinely never had a fix on this device.
  const last = loadLastLoc();
  const [lng, lat] = last ? [last.lng, last.lat] : CONFIG.fallbackCenter;
  lastLoc = { lng, lat };
  if (!selfAvatar) {
    selfAvatar = new Avatar(map, { lng, lat, color: '#ff5d8f', self: true });
  }
  if (!didFirstFly) {
    didFirstFly = true;
    flyTo(map, lng, lat, { zoom: startZoomFor(lat) });
    map.once('moveend', updateAvatarVisibility);
  }
  updateAvatarVisibility();   // location is off in fallback, so this hides your dot
  placeLayers();
  maybeStartDemoBots(lastLoc);
  if (locationOn) net.sendPosition(lng, lat, 0); // don't broadcast a position while off
}

// --- Control buttons -------------------------------------------------------
document.getElementById('btn-recenter').addEventListener('click', () => {
  if (lastLoc) flyTo(map, lastLoc.lng, lastLoc.lat, { zoom: startZoomFor(lastLoc.lat) });
});
document.getElementById('btn-tilt').addEventListener('click', () => toggleTilt(map));
document.getElementById('btn-compass').addEventListener('click', () => resetNorth(map));

// Location toggle: let the user turn their location off (and back on) anytime.
document.getElementById('btn-location').addEventListener('click', async () => {
  if (locationOn) stopGeolocation();
  else await enableLocation();
});

// Wave: show locally for instant feedback + broadcast so peers see it.
document.getElementById('btn-wave').addEventListener('click', () => {
  if (selfAvatar) selfAvatar.playEmote('wave');
  net.sendEmote('wave');
});

// --- Go --------------------------------------------------------------------
map.on('load', async () => {
  loadLayers();

  // Ask for a display name (persisted for the session) before we start
  // broadcasting, so peers see the chosen name from the first update.
  const name = CONFIG.displayNamePrompt
    ? await promptDisplayName(randomName())
    : randomName();
  net.identify(name, '#ff5d8f');

  // Ask for location approval up front (our own explainer). If they allow, we
  // request the OS permission and start tracking; if not, the app still runs on
  // a demo location and they can enable it later via the 📍 button.
  updateLocationButton();
  const useLocation = await promptLocationConsent();
  if (useLocation) {
    await enableLocation();
  } else {
    setStatus('Location off — showing a demo location. Tap 📍 to turn it on.', true);
    useFallbackLocation();
  }
});
