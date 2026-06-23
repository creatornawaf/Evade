export class HUD {
  constructor() {
    this.hud = document.getElementById("hud");
    this.healthText = document.getElementById("healthText");
    this.staminaText = document.getElementById("staminaText");
    this.statusText = document.getElementById("statusText");
    this.playersText = document.getElementById("playersText");
    this.healthBar = document.getElementById("healthBar");
    this.staminaBar = document.getElementById("staminaBar");
    this.overlay = document.getElementById("overlayMessage");
  }

  show() {
    this.hud.classList.remove("hidden");
  }

  updatePlayer(player) {
    const health = Math.max(0, Math.round(player.health));
    const stamina = Math.max(0, Math.round(player.stamina));

    this.healthText.textContent = health;
    this.staminaText.textContent = stamina;
    this.statusText.textContent = player.downed ? "Downed" : "Alive";

    this.healthBar.style.width = `${health}%`;
    this.staminaBar.style.width = `${stamina}%`;
  }

  setPlayerCount(n) {
    this.playersText.textContent = String(n);
  }

  flashMessage(text, ms = 2000) {
    this.overlay.textContent = text;
    this.overlay.classList.remove("hidden");
    clearTimeout(this._overlayTimeout);
    this._overlayTimeout = setTimeout(() => {
      this.overlay.classList.add("hidden");
    }, ms);
  }
}
