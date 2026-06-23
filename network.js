import { RemotePlayer } from "./player.js";

export class NetworkManager {
  constructor(scene, hud) {
    this.scene = scene;
    this.hud = hud;

    this.socket = null;
    this.localId = null;
    this.remotePlayers = new Map();

    this.enemyState = null;
    this.lastPing = null;
  }

  connect(serverUrl, name) {
    return new Promise((resolve, reject) => {
      if (!serverUrl || !serverUrl.trim()) {
        reject(new Error("Missing server URL"));
        return;
      }

      if (typeof io === "undefined") {
        reject(new Error("Socket.IO client missing"));
        return;
      }

      this.socket = io(serverUrl, {
        transports: ["websocket", "polling"]
      });

      const failTimer = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      this.socket.on("connect", () => {
        this.localId = this.socket.id;
        this.socket.emit("joinGame", { name });
      });

      this.socket.on("joined", (payload) => {
        clearTimeout(failTimer);
        resolve(payload);
      });

      this.socket.on("connect_error", (err) => {
        clearTimeout(failTimer);
        reject(err);
      });

      this.socket.on("disconnect", () => {
        this.hud.flashMessage("Disconnected from server");
      });

      this.socket.on("worldState", (state) => {
        this.applyWorldState(state);
      });

      this.socket.on("pongCheck", (data) => {
        if (data && typeof data.sentAt === "number") {
          this.lastPing = performance.now() - data.sentAt;
          this.hud.setPing(this.lastPing);
        }
      });

      this.socket.on("serverMessage", (msg) => {
        if (msg) this.hud.flashMessage(msg);
      });
    });
  }

  applyWorldState(state) {
    if (!state) return;

    const players = state.players || {};
    const seen = new Set();

    for (const [id, p] of Object.entries(players)) {
      if (id === this.localId) continue;
      seen.add(id);

      let remote = this.remotePlayers.get(id);
      if (!remote) {
        remote = new RemotePlayer(id, p.name || "Player", this.scene);
        this.remotePlayers.set(id, remote);
      }
      remote.setState(p);
    }

    for (const [id, remote] of this.remotePlayers.entries()) {
      if (!seen.has(id)) {
        remote.dispose();
        this.remotePlayers.delete(id);
      }
    }

    this.enemyState = state.enemy || null;

    const count = Object.keys(players).length;
    this.hud.setPlayersCount(count);
  }

  sendLocalState(playerState) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit("playerUpdate", playerState);
  }

  update(dt) {
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }

    if (this.socket && this.socket.connected) {
      if (!this._lastPingSend) this._lastPingSend = 0;
      this._lastPingSend += dt;
      if (this._lastPingSend >= 2) {
        this._lastPingSend = 0;
        this.socket.emit("pingCheck", { sentAt: performance.now() });
      }
    }
  }
}
