/**
 * Rosy backend
 * -------------
 * - Serves the static front-end from ../public
 * - Exposes a Socket.io server for real-time multiplayer presence:
 *   players broadcast their GPS position and see each other live.
 *
 * Wire protocol (events):
 *   client -> server: "player:hello"  { name, color }
 *   client -> server: "player:move"   { lng, lat, heading }
 *   server -> client: "welcome"       { id, players: [...] }
 *   server -> client: "player:join"   { player }
 *   server -> client: "player:moved"  { id, lng, lat, heading }
 *   server -> client: "player:leave"  { id }
 *   server -> client: "presence"      { count }
 */

const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }, // dev-friendly; tighten for production
});

// --- Static front-end ------------------------------------------------------
app.use(express.static(PUBLIC_DIR));
app.get('/healthz', (_req, res) => res.json({ ok: true, players: players.size }));

// --- In-memory presence store ---------------------------------------------
/** @type {Map<string, {id:string,name:string,color:string,lng:number,lat:number,heading:number,updatedAt:number}>} */
const players = new Map();

const PALETTE = ['#ff5d8f', '#5d9cff', '#3ddc97', '#ffb13d', '#b06dff', '#ff6d6d', '#2dd4bf'];
const ADJ = ['Wandering', 'Curious', 'Roaming', 'Sunny', 'Lucky', 'Hidden', 'Swift'];
const NOUN = ['Explorer', 'Traveler', 'Fox', 'Otter', 'Sparrow', 'Comet', 'Nomad'];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function broadcastPresence() {
  io.emit('presence', { count: players.size });
}

io.on('connection', (socket) => {
  // Seed a guest identity; the client may override the name via "player:hello".
  const player = {
    id: socket.id,
    name: `${pick(ADJ)} ${pick(NOUN)}`,
    color: pick(PALETTE),
    lng: null,
    lat: null,
    heading: 0,
    updatedAt: Date.now(),
  };
  players.set(socket.id, player);

  // Tell the newcomer who they are + everyone already on the map (with a position).
  socket.emit('welcome', {
    id: socket.id,
    self: player,
    players: [...players.values()].filter((p) => p.id !== socket.id && p.lng !== null),
  });
  broadcastPresence();

  socket.on('player:hello', (data = {}) => {
    if (typeof data.name === 'string' && data.name.trim()) {
      player.name = data.name.trim().slice(0, 24);
    }
    if (typeof data.color === 'string') player.color = data.color;
    // Re-announce to peers that already know about this player.
    socket.broadcast.emit('player:meta', { id: socket.id, name: player.name, color: player.color });
  });

  socket.on('player:move', (data = {}) => {
    const { lng, lat, heading } = data;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const isFirstFix = player.lng === null;
    player.lng = lng;
    player.lat = lat;
    player.heading = Number.isFinite(heading) ? heading : player.heading;
    player.updatedAt = Date.now();

    if (isFirstFix) {
      // First real position => announce as a join so peers can spawn an avatar.
      socket.broadcast.emit('player:join', { player });
    } else {
      socket.broadcast.emit('player:moved', {
        id: socket.id,
        lng: player.lng,
        lat: player.lat,
        heading: player.heading,
      });
    }
  });

  socket.on('player:emote', (data = {}) => {
    const type = typeof data.type === 'string' ? data.type.slice(0, 16) : 'wave';
    socket.broadcast.emit('player:emote', { id: socket.id, type });
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player:leave', { id: socket.id });
    broadcastPresence();
  });
});

// Drop stale players (e.g. half-open mobile connections) after 60s of silence.
setInterval(() => {
  const now = Date.now();
  for (const [id, p] of players) {
    if (now - p.updatedAt > 60_000) {
      players.delete(id);
      io.emit('player:leave', { id });
    }
  }
  broadcastPresence();
}, 30_000);

server.listen(PORT, () => {
  console.log(`Rosy server running -> http://localhost:${PORT}`);
});
