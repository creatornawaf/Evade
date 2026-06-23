import { RemotePlayer } from "./player.js";

export class NetworkManager {
  constructor(scene, hud) {
    this.scene = scene;
    this.hud = hud;
    this.socket = null;
    this.id = null;
    this.remotePlayers = new Map();
    this.enemyState = null;
  }

  connect(serverUrl, playerName) {
    return new Promise((resolve, reject) => {
      if (!window.io) {
        reject(new Error("Socket.IO client not loaded."));
        return;
      }

      this.socket = window.io(serverUrl, {
        transports: ["websocket", "polling"]
      });

      this.socket.on("connect", () => {
        this.id = this.socket.id;
        this.socket.emit("joinGame", { name: playerName });
        resolve();
      });

      this.socket.on("connect_error", (err) => {
        reject(err);
      });

      this.socket.on("state", (packet) => {
        this.applyState(packet);
      });

      this.socket.on("messageText", (msg) => {
        this.hud.flashMessage(msg, 2200);
      });
    });
  }

  applyState(packet) {
    if (!packet || !packet.players) return;

    const players = packet.players;
    const seen = new Set();

    for (const id in players) {
      if (id === this.id) continue;
      seen.add(id);

      const p = players[id];
      let remote = this.remotePlayers.get(id);
      if (!remote) {
        remote = new RemotePlayer(id, p.name || "Player", this.scene);
        this.remotePlayers.set(id, remote);
      }
      remote.setState(p);
    }

    for (const [id, remote] of this.remotePlayers) {
      if (!seen.has(id)) {
        remote.dispose();
        this.remotePlayers.delete(id);
      }
    }

    this.hud.setPlayerCount(Object.keys(players).length);

    if (packet.enemy) {
      this.enemyState = packet.enemy;
    }
  }

  update(dt) {
    for (const [, remote] of this.remotePlayers) {
      remote.update(dt);
    }
  }

  sendLocalState(state) {
    if (!this.socket) return;
    this.socket.emit("move", state);
  }
}
