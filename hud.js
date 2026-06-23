export class HUD {
  constructor() {
    this.root = document.getElementById("hud");
    this.healthText = document.getElementById("healthText");
    this.staminaText = document.getElementById("staminaText");
    this.statusText = document.getElementById("statusText");
    this.playersText = document.getElementById("playersText");
    this.pingText = document.getElementById("pingText");

    this.healthBar = document.getElementById("healthBar");
    this.staminaBar = document.getElementById("staminaBar");

    this.overlay = document.getElementById("overlayMessage");
    this.overlayTimeout = null;
  }

  show() {
    this.root.classList.remove("hidden");
  }

  updatePlayer(player) {
    this.healthText.textContent = Math.round(player.health);
    this.staminaText.textContent = Math.round(player.stamina);
    this.statusText.textContent = player.downed ? "Downed" : "Alive";

    this.healthBar.style.width = `${Math.max(0, Math.min(100, player.health))}%`;
    this.staminaBar.style.width = `${Math.max(0, Math.min(100, player.stamina))}%`;
  }

  setPlayersCount(n) {
    this.playersText.textContent = String(n);
  }

  setPing(ms) {
    this.pingText.textContent = ms == null ? "-" : `${Math.round(ms)}ms`;
  }

  flashMessage(msg, ms = 2500) {
    this.overlay.textContent = msg;
    this.overlay.classList.remove("hidden");

    if (this.overlayTimeout) clearTimeout(this.overlayTimeout);
    this.overlayTimeout = setTimeout(() => {
      this.overlay.classList.add("hidden");
    }, ms);
  }
}
