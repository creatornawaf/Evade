import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

export class LocalPlayer {
  constructor(camera, scene) {
    this.camera = camera;
    this.scene = scene;

    this.height = 1.7;
    this.radius = 0.35;

    this.position = new THREE.Vector3(0, this.height, 0);
    this.velocity = new THREE.Vector3();

    this.yaw = 0;
    this.pitch = 0;

    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.wantJump = false;
    this.sprinting = false;

    this.walkSpeed = 4.5;
    this.sprintSpeed = 7.5;
    this.jumpStrength = 6.5;
    this.gravity = 18;
    this.grounded = false;

    this.health = 100;
    this.stamina = 100;
    this.maxStamina = 100;
    this.downed = false;

    this.lastSent = 0;

    this.setupInput();
    this.updateCamera();
  }

  setupInput() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyW") this.moveForward = true;
      if (e.code === "KeyS") this.moveBackward = true;
      if (e.code === "KeyA") this.moveLeft = true;
      if (e.code === "KeyD") this.moveRight = true;
      if (e.code === "Space") this.wantJump = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.sprinting = true;
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "KeyW") this.moveForward = false;
      if (e.code === "KeyS") this.moveBackward = false;
      if (e.code === "KeyA") this.moveLeft = false;
      if (e.code === "KeyD") this.moveRight = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.sprinting = false;
    });

    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== document.body) return;

      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      const limit = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
      this.updateCamera();
    });
  }

  updateCamera() {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.position.copy(this.position);
  }

  takeDamage(amount) {
    if (this.downed) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.downed = true;
    }
  }

  revive(amount = 35) {
    this.health = Math.min(100, amount);
    this.downed = false;
  }

  update(dt, world) {
    if (this.downed) {
      this.velocity.x = 0;
      this.velocity.z = 0;
      this.velocity.y -= this.gravity * dt;
      this.position.y += this.velocity.y * dt;
      if (this.position.y < this.height) {
        this.position.y = this.height;
        this.velocity.y = 0;
        this.grounded = true;
      }
      this.updateCamera();
      return;
    }

    const move = new THREE.Vector3();
    if (this.moveForward) move.z -= 1;
    if (this.moveBackward) move.z += 1;
    if (this.moveLeft) move.x -= 1;
    if (this.moveRight) move.x += 1;
    move.normalize();

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    const dir = new THREE.Vector3();
    dir.addScaledVector(forward, -move.z);
    dir.addScaledVector(right, move.x);
    if (dir.lengthSq() > 0) dir.normalize();

    let speed = this.walkSpeed;
    const wantsSprint = this.sprinting && move.lengthSq() > 0 && this.stamina > 0;

    if (wantsSprint) {
      speed = this.sprintSpeed;
      this.stamina -= 30 * dt;
      if (this.stamina < 0) this.stamina = 0;
    } else {
      this.stamina += 18 * dt;
      if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
    }

    this.velocity.x = dir.x * speed;
    this.velocity.z = dir.z * speed;

    if (this.grounded && this.wantJump) {
      this.velocity.y = this.jumpStrength;
      this.grounded = false;
    }
    this.wantJump = false;

    this.velocity.y -= this.gravity * dt;

    const next = this.position.clone();
    next.x += this.velocity.x * dt;
    next.z += this.velocity.z * dt;

    next.y += this.velocity.y * dt;
    if (next.y <= this.height) {
      next.y = this.height;
      this.velocity.y = 0;
      this.grounded = true;
    }

    const corrected = world.resolvePlayerCollision(this.position, next, this.radius);
    this.position.copy(corrected);

    this.updateCamera();
  }

  getNetState() {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      yaw: this.yaw,
      pitch: this.pitch,
      health: this.health,
      stamina: this.stamina,
      downed: this.downed
    };
  }
}

export class RemotePlayer {
  constructor(id, name, scene) {
    this.id = id;
    this.name = name;
    this.scene = scene;

    this.group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x3da5ff })
    );
    body.position.y = 0.85;
    this.group.add(body);

    const label = this.makeLabel(name);
    label.position.y = 2.3;
    this.group.add(label);

    this.scene.add(this.group);

    this.target = {
      x: 0, y: 1.7, z: 0, yaw: 0
    };
  }

  makeLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.5, 0.6, 1);
    return sprite;
  }

  setState(state) {
    this.target.x = state.x;
    this.target.y = state.y;
    this.target.z = state.z;
    this.target.yaw = state.yaw || 0;
  }

  update(dt) {
    this.group.position.x += (this.target.x - this.group.position.x) * Math.min(1, dt * 12);
    this.group.position.y = this.target.y - 1.7;
    this.group.position.z += (this.target.z - this.group.position.z) * Math.min(1, dt * 12);
    this.group.rotation.y += (this.target.yaw - this.group.rotation.y) * Math.min(1, dt * 10);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
