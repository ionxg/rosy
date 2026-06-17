/**
 * Multiplayer module
 * ------------------
 * Connects to the Socket.io backend, broadcasts the local player's position
 * (throttled), and renders remote peers as Avatars. Also surfaces the live
 * online-presence count.
 */
import { CONFIG } from './config.js';
import { Avatar } from './avatar.js';

export class Multiplayer {
  /**
   * @param {maplibregl.Map} map
   * @param {(count:number)=>void} onPresence
   */
  constructor(map, onPresence) {
    this.map = map;
    this.onPresence = onPresence || (() => {});
    this.peers = new Map(); // id -> Avatar
    this.selfId = null;
    this.lastSent = 0;
    this._name = null;
    this._color = null;

    this.socket = io(CONFIG.socketUrl, { transports: ['websocket', 'polling'] });
    this._wire();
  }

  _wire() {
    const s = this.socket;

    s.on('welcome', ({ id, players }) => {
      this.selfId = id;
      (players || []).forEach((p) => this._spawn(p));
    });

    s.on('player:join', ({ player }) => this._spawn(player));

    s.on('player:moved', ({ id, lng, lat, heading }) => {
      const peer = this.peers.get(id);
      if (peer) peer.moveTo(lng, lat, heading);
    });

    s.on('player:meta', ({ id, name, color }) => {
      const peer = this.peers.get(id);
      if (peer) peer.setMeta({ name, color });
    });

    s.on('player:leave', ({ id }) => {
      const peer = this.peers.get(id);
      if (peer) {
        peer.remove();
        this.peers.delete(id);
      }
    });

    s.on('player:emote', ({ id, type }) => {
      const peer = this.peers.get(id);
      if (peer) peer.playEmote(type);
    });

    s.on('presence', ({ count }) => this.onPresence(count));

    // Re-send our identity after a reconnect so peers keep our chosen name.
    s.on('connect', () => {
      if (this._name) this.socket.emit('player:hello', { name: this._name, color: this._color });
    });
  }

  _spawn(p) {
    if (!p || p.id === this.selfId || this.peers.has(p.id)) return;
    if (!Number.isFinite(p.lng) || !Number.isFinite(p.lat)) return;
    const avatar = new Avatar(this.map, {
      lng: p.lng, lat: p.lat, name: p.name, color: p.color, heading: p.heading,
    });
    this.peers.set(p.id, avatar);
  }

  /** Set a display name / color for this player and broadcast it. */
  identify(name, color) {
    this._name = name;
    this._color = color;
    this.socket.emit('player:hello', { name, color });
  }

  /** Broadcast an emote (e.g. 'wave') to other players. */
  sendEmote(type = 'wave') {
    this.socket.emit('player:emote', { type });
  }

  /** Throttled broadcast of the local player's position. */
  sendPosition(lng, lat, heading) {
    const now = Date.now();
    if (now - this.lastSent < CONFIG.moveBroadcastInterval) return;
    this.lastSent = now;
    this.socket.emit('player:move', { lng, lat, heading });
  }
}
