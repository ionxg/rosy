/**
 * Demo / debug mode
 * -----------------
 * Spawns 2-3 simulated players that walk looping elliptical paths near the
 * user's location, so multiplayer movement (smooth glide + direction facing +
 * emotes) is visible and testable in a single tab with nobody else online.
 *
 * These bots are purely client-side — they never touch the server, so they
 * don't pollute real presence. Enable via CONFIG.demoMode.
 */
import { Avatar } from './avatar.js';
import { bearing } from './geo.js';

// Data-driven bot definitions. Add/remove entries to change the cast.
const BOTS = [
  { name: 'Mochi', color: '#5d9cff', radius: 0.00060, speed: 0.45, phase: 0.0 },
  { name: 'Pixel', color: '#3ddc97', radius: 0.00090, speed: -0.30, phase: 2.1 },
  { name: 'Comet', color: '#ffb13d', radius: 0.00042, speed: 0.62, phase: 4.2 },
];

const EMOTES = ['wave', 'heart', 'star', 'tada'];

/**
 * Start the demo bots.
 * @param {maplibregl.Map} map
 * @param {{lng:number, lat:number}} origin  center of the looping paths
 * @param {number} count  how many bots (clamped to available definitions)
 * @returns {{ stop: () => void, count: number }}
 */
export function startDemoBots(map, origin, count = 3) {
  const defs = BOTS.slice(0, Math.max(1, Math.min(count, BOTS.length)));
  const latRad = (origin.lat * Math.PI) / 180;
  const lngScale = 1 / Math.max(0.2, Math.cos(latRad)); // keep paths circular on screen

  const bots = defs.map((def) => {
    const start = positionOn(def, def.phase, origin, lngScale);
    return {
      def,
      t: def.phase,
      last: start,
      avatar: new Avatar(map, { lng: start.lng, lat: start.lat, name: def.name, color: def.color }),
    };
  });

  let raf;
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); // seconds, clamped
    prev = now;
    for (const b of bots) {
      b.t += b.def.speed * dt;
      const pos = positionOn(b.def, b.t, origin, lngScale);
      const heading = bearing(b.last, pos);
      b.avatar.moveTo(pos.lng, pos.lat, heading, { tween: false });
      b.last = pos;
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // Occasionally have a random bot emote, so waves are visible without help.
  const emoteTimer = setInterval(() => {
    const b = bots[Math.floor(Math.random() * bots.length)];
    b.avatar.playEmote(EMOTES[Math.floor(Math.random() * EMOTES.length)]);
  }, 3500);

  return {
    count: bots.length,
    stop() {
      cancelAnimationFrame(raf);
      clearInterval(emoteTimer);
      bots.forEach((b) => b.avatar.remove());
    },
  };
}

function positionOn(def, t, origin, lngScale) {
  return {
    lng: origin.lng + Math.cos(t) * def.radius * lngScale,
    lat: origin.lat + Math.sin(t) * def.radius,
  };
}
