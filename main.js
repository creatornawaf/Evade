import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";
import { World } from "./world.js";
import { LocalPlayer } from "./player.js";
import { HUD } from "./hud.js";
import { NetworkManager } from "./network.js";

const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const nameInput = document.getElementById("nameInput");
const serverInput = document.getElementById("serverInput");
const mobileUI = document.getElementById("mobileUI");

let scene, camera, renderer;
let world, player, hud, network;
let lastTime = performance.now();
let started = false;

function isMobile() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  window.addEventListener("resize", onResize);
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function startGame() {
  if (started) return;
  started = true;

  initThree();

  hud = new HUD();
  hud.show();

  world = new World(scene);
  player = new LocalPlayer(camera, scene);
  network = new NetworkManager(scene, hud);

  const name = (nameInput.value || "Player").trim().slice(0, 16) || "Player";
  const serverUrl = (serverInput.value || "").trim();

  try {
    await network.connect(serverUrl, name);
    hud.flashMessage("Connected to server");
  } catch (err) {
    console.error(err);
    hud.flashMessage("Failed to connect server");
  }

  menu.classList.add("hidden");

  if (isMobile()) {
    mobileUI.classList.remove("hidden");
  } else {
    renderer.domElement.addEventListener("click", () => {
      document.body.requestPointerLock();
    });
  }

  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05;

  if (player && world) {
    player.update(dt, world);
    hud.updatePlayer(player);
  }

  if (network) {
    network.update(dt);

    if (network.enemyState) {
      world.updateEnemyFromServer(network.enemyState, player, dt);
    }

    if (player) {
      player.lastSent += dt;
      if (player.lastSent >= 0.05) {
        player.lastSent = 0;
        network.sendLocalState(player.getNetState());
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

playBtn.addEventListener("click", startGame);
