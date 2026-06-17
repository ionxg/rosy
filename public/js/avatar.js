/**
 * Avatar module
 * -------------
 * A reusable map marker representing a player. Used for the local user
 * ("self"), remote peers, and simulated demo bots.
 *
 * Features:
 *  - Smooth tweened movement between position updates (no teleporting).
 *  - A direction arrow that rotates to face the avatar's travel heading.
 *  - A name label floating above the avatar.
 *  - Emotes (e.g. a wave) that briefly animate above the avatar.
 */
import { CONFIG } from './config.js';
import { bearing } from './geo.js';

const EMOTES = { wave: '👋', heart: '❤️', star: '⭐', tada: '🎉' };

const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/** Interpolate between two angles the short way around the circle. */
function lerpAngle(a, b, t) {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

export class Avatar {
  /**
   * @param {maplibregl.Map} map
   * @param {object} opts { lng, lat, color, name, self, heading }
   */
  constructor(map, opts = {}) {
    this.map = map;
    this.name = opts.name || 'Player';
    this.color = opts.color || '#ff5d8f';
    this.self = !!opts.self;

    const el = document.createElement('div');
    el.className = `avatar${this.self ? ' self' : ''}`;
    el.style.setProperty('--c', this.color);
    el.innerHTML = `
      <div class="pulse"></div>
      <div class="dir"></div>
      <div class="ring"></div>
      <div class="label">${this.self ? 'You' : escapeHtml(this.name)}</div>
      <div class="emote"></div>
    `;
    this.el = el;

    this.marker = new maplibregl.Marker({
      element: el,
      anchor: 'center',
      // rotationAlignment 'map' keeps the heading arrow pointing the correct
      // geographic way as the map rotates. pitchAlignment 'viewport' keeps the
      // avatar standing UPRIGHT (a billboard pinned to its lng/lat) instead of
      // lying flat on the ground — so it stays locked to the right spot when you
      // zoom/tilt and doesn't drift or vanish past the horizon.
      rotationAlignment: 'map',
      pitchAlignment: 'viewport',
    });

    // Interpolation state.
    this._cur = null;            // current rendered {lng,lat}
    this._from = null;
    this._to = null;
    this._t0 = 0;
    this._dur = 0;
    this._heading = Number.isFinite(opts.heading) ? opts.heading : 0;
    this._headingFrom = this._heading;
    this._headingTo = this._heading;
    this._anim = null;

    if (Number.isFinite(opts.lng) && Number.isFinite(opts.lat)) {
      this._cur = { lng: opts.lng, lat: opts.lat };
      this.marker.setLngLat([opts.lng, opts.lat]).addTo(map);
      this._applyHeading(this._heading);
    }
  }

  /**
   * Move the avatar. By default the motion is tweened over ~CONFIG.peerTweenMs
   * so peers glide instead of teleporting. Pass { tween: false } to snap (used
   * for continuous per-frame motion, e.g. demo bots, or authoritative self).
   *
   * @param {number} lng
   * @param {number} lat
   * @param {number} [heading]  explicit heading; otherwise inferred from travel
   * @param {object} [opts] { tween, duration }
   */
  moveTo(lng, lat, heading, opts = {}) {
    if (!this.marker._map) this.marker.addTo(this.map);

    const tween = opts.tween !== false && this._cur;
    const travel = this._cur ? bearing(this._cur, { lng, lat }) : this._heading;
    const moved = !this._cur || this._cur.lng !== lng || this._cur.lat !== lat;
    const nextHeading = Number.isFinite(heading) ? heading : (moved ? travel : this._heading);

    if (!tween) {
      this._cur = { lng, lat };
      this.marker.setLngLat([lng, lat]);
      this._applyHeading(nextHeading);
      return;
    }

    this._from = { ...this._cur };
    this._to = { lng, lat };
    this._t0 = performance.now();
    this._dur = opts.duration ?? CONFIG.peerTweenMs ?? 400;
    this._headingFrom = this._heading;
    this._headingTo = nextHeading;
    if (!this._anim) this._anim = requestAnimationFrame(this._tick);
  }

  _tick = (now) => {
    const p = this._dur > 0 ? Math.min(1, (now - this._t0) / this._dur) : 1;
    const e = easeOutCubic(p);
    const lng = lerp(this._from.lng, this._to.lng, e);
    const lat = lerp(this._from.lat, this._to.lat, e);
    this._cur = { lng, lat };
    this.marker.setLngLat([lng, lat]);
    this._applyHeading(lerpAngle(this._headingFrom, this._headingTo, e));

    if (p < 1) {
      this._anim = requestAnimationFrame(this._tick);
    } else {
      this._anim = null;
    }
  };

  _applyHeading(deg) {
    this._heading = deg;
    const dir = this.el.querySelector('.dir');
    if (dir) dir.style.transform = `rotate(${deg}deg)`;
  }

  /** Briefly show an emote above the avatar (visible to everyone). */
  playEmote(type = 'wave') {
    const e = this.el.querySelector('.emote');
    if (!e) return;
    e.textContent = EMOTES[type] || EMOTES.wave;
    e.classList.remove('show');
    void e.offsetWidth; // restart the CSS animation
    e.classList.add('show');
  }

  setMeta({ name, color }) {
    if (name) {
      this.name = name;
      const label = this.el.querySelector('.label');
      if (label && !this.self) label.textContent = name;
    }
    if (color) {
      this.color = color;
      this.el.style.setProperty('--c', color);
    }
  }

  remove() {
    if (this._anim) cancelAnimationFrame(this._anim);
    this.marker.remove();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
