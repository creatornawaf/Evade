const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors({
  origin: "*"
}));

app.get("/", (req, res) => {
  res.send("3D survival multiplayer server is running.");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const players = {};
const enemy = {
  x: 6,
  y: 1.1,
  z: 6,
  speed: 2.8
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function getNearestPlayerToEnemy() {
  let best = null;
  let bestDist = Infinity;

  for (const id in players) {
    const p = players[id];
    if (p.downed) continue;
    const d = distanceSq(enemy, p);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }

  return best;
}

function updateEnemy(dt) {
  const target = getNearestPlayerToEnemy();
  if (!target) return;

  const dx = target.x - enemy.x;
  const dz = target.z - enemy.z;
  const len = Math.sqrt(dx * dx + dz * dz) || 1;

  enemy.x += (dx / len) * enemy.speed * dt;
  enemy.z += (dz / len) * enemy.speed * dt;

  for (const id in players) {
    const p = players[id];
    const ddx = p.x - enemy.x;
    const ddz = p.z - enemy.z;
    const dist = Math.sqrt(ddx * ddx + ddz * ddz);

    if (dist < 1.4 && !p.downed) {
      p.health -= 20 * dt;
      if (p.health <= 0) {
        p.health = 0;
        p.downed = true;
      }
    }
  }
}

io.on("connection", (socket) => {
  console.log("player connected", socket.id);

  players[socket.id] = {
    id: socket.id,
    name: "Player",
    x: 0,
    y: 1.7,
    z: 0,
    yaw: 0,
    pitch: 0,
    health: 100,
    stamina: 100,
    downed: false
  };

  socket.emit("messageText", "Connected");

  socket.on("joinGame", (data) => {
    const p = players[socket.id];
    if (!p) return;
    if (data && typeof data.name === "string") {
      p.name = data.name.slice(0, 16) || "Player";
    }
  });

  socket.on("move", (state) => {
    const p = players[socket.id];
    if (!p || !state) return;

    // basic sanity limits
    p.x = clamp(Number(state.x) || 0, -1000, 1000);
    p.y = clamp(Number(state.y) || 1.7, 0, 50);
    p.z = clamp(Number(state.z) || 0, -1000, 1000);
    p.yaw = Number(state.yaw) || 0;
    p.pitch = Number(state.pitch) || 0;
    p.health = clamp(Number(state.health) || p.health, 0, 100);
    p.stamina = clamp(Number(state.stamina) || p.stamina, 0, 100);
    p.downed = !!state.downed;
  });

  socket.on("disconnect", () => {
    console.log("player disconnected", socket.id);
    delete players[socket.id];
  });
});

let lastTick = Date.now();
setInterval(() => {
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt > 0.05) dt = 0.05;

  updateEnemy(dt);

  io.emit("state", {
    players,
    enemy
  });
}, 50);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
