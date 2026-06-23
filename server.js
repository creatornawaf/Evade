const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.get("/", (req, res) => {
  res.send("Survival Chase server is running");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const players = new Map();

const enemy = {
  x: 0,
  y: 1.2,
  z: 0,
  speed: 4.2,
  targetPlayerId: null
};

io.on("connection", (socket) => {
  players.set(socket.id, {
    id: socket.id,
    name: "Player",
    x: rand(-10, 10),
    y: 1.7,
    z: rand(-10, 10),
    yaw: 0,
    pitch: 0,
    health: 100
  });

  socket.on("joinGame", (data) => {
    const p = players.get(socket.id);
    if (!p) return;

    p.name = sanitizeName(data?.name || "Player");
    socket.emit("joined", { id: socket.id });
    socket.emit("serverMessage", "Joined match");
  });

  socket.on("playerUpdate", (state) => {
    const p = players.get(socket.id);
    if (!p || !state) return;

    p.x = clampNum(state.x, p.x);
    p.y = clampNum(state.y, p.y);
    p.z = clampNum(state.z, p.z);
    p.yaw = clampNum(state.yaw, p.yaw);
    p.pitch = clampNum(state.pitch, p.pitch);
  });

  socket.on("pingCheck", (data) => {
    socket.emit("pongCheck", data);
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    if (enemy.targetPlayerId === socket.id) {
      enemy.targetPlayerId = null;
    }
  });
});

setInterval(() => {
  updateEnemy(1 / 20);

  const state = {
    players: Object.fromEntries(players.entries()),
    enemy: {
      x: enemy.x,
      y: enemy.y,
      z: enemy.z
    }
  };

  io.emit("worldState", state);
}, 50);

function updateEnemy(dt) {
  if (players.size === 0) return;

  let target = null;
  let bestDistSq = Infinity;

  for (const p of players.values()) {
    const dx = p.x - enemy.x;
    const dz = p.z - enemy.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      target = p;
    }
  }

  if (!target) return;
  enemy.targetPlayerId = target.id;

  const dx = target.x - enemy.x;
  const dz = target.z - enemy.z;
  const dist = Math.hypot(dx, dz);

  if (dist > 0.001) {
    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.z += (dz / dist) * enemy.speed * dt;
  }

  if (dist < 1.5) {
    target.health -= 8 * dt;
    if (target.health < 0) target.health = 0;
  } else {
    target.health += 3 * dt;
    if (target.health > 100) target.health = 100;
  }
}

function sanitizeName(name) {
  return String(name).trim().slice(0, 16) || "Player";
}

function clampNum(v, fallback = 0) {
  return Number.isFinite(v) ? v : fallback;
}

function rand(a, b) {
  return Math.random() * (b - a) + a;
}

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
