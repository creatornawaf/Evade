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

    // Mobile input state
    this.mobileEnabled = this.isMobile();
    this.mobileMoveX = 0; // -1..1
    this.mobileMoveY = 0; // -1..1
    this.lookTouchId = null;
    this.moveTouchId = null;

    // This is the key fix:
    // movementYaw is the direction movement uses while keys are held.
    // It does NOT keep changing every frame when camera turns.
    this.movementYaw = 0;
    this.prevMoving = false;

    this.setupInput();
    this.updateCamera();
  }

  isMobile() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
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

    // Desktop look
    document.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== document.body) return;
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      const limit = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
      this.updateCamera();
    });

    if (this.mobileEnabled) {
      this.setupMobileControls();
    }
  }

  setupMobileControls() {
    const mobileUI = document.getElementById("mobileUI");
    const movePad = document.getElementById("movePad");
    const moveStick = document.getElementById("moveStick");
    const lookArea = document.getElementById("lookArea");
    const jumpBtn = document.getElementById("jumpBtn");
    const sprintBtn = document.getElementById("sprintBtn");

    if (!mobileUI || !movePad || !moveStick || !lookArea || !jumpBtn || !sprintBtn) return;

    mobileUI.classList.remove("hidden");

    const resetStick = () => {
      moveStick.style.left = "43px";
      moveStick.style.top = "43px";
      this.mobileMoveX = 0;
      this.mobileMoveY = 0;
      this.moveTouchId = null;
    };

    const updateMoveFromTouch = (touch) => {
      const rect = movePad.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;

      const max = rect.width * 0.33;
      const len = Math.hypot(dx, dy);
      if (len > max && len > 0) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }

      this.mobileMoveX = dx / max;
      this.mobileMoveY = dy / max;

      moveStick.style.left = `${rect.width / 2 - 32 + dx}px`;
      moveStick.style.top = `${rect.height / 2 - 32 + dy}px`;
    };

    movePad.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      this.moveTouchId = t.identifier;
      updateMoveFromTouch(t);
      e.preventDefault();
    }, { passive: false });

    movePad.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.moveTouchId) {
          updateMoveFromTouch(t);
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });

    movePad.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.moveTouchId) {
          resetStick();
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });

    movePad.addEventListener("touchcancel", resetStick, { passive: false });

    let lastLookX = 0;
    let lastLookY = 0;

    lookArea.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      this.lookTouchId = t.identifier;
      lastLookX = t.clientX;
      lastLookY = t.clientY;
      e.preventDefault();
    }, { passive: false });

    lookArea.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) {
          const dx = t.clientX - lastLookX;
          const dy = t.clientY - lastLookY;
          lastLookX = t.clientX;
          lastLookY = t.clientY;

          const sensitivity = 0.004;
          this.yaw -= dx * sensitivity;
          this.pitch -= dy * sensitivity;

          const limit = Math.PI / 2 - 0.05;
          this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
          this.updateCamera();
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });

    lookArea.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
      e.preventDefault();
    }, { passive: false });

    jumpBtn.addEventListener("touchstart", (e) => {
      this.wantJump = true;
      e.preventDefault();
    }, { passive: false });

    sprintBtn.addEventListener("touchstart", (e) => {
      this.sprinting = true;
      e.preventDefault();
    }, { passive: false });

    sprintBtn.addEventListener("touchend", (e) => {
      this.sprinting = false;
      e.preventDefault();
    }, { passive: false });

    sprintBtn.addEventListener("touchcancel", () => {
      this.sprinting = false;
    }, { passive: false });
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

    // keyboard movement
    let inputX = 0;
    let inputY = 0;

    if (this.moveForward) inputY += 1;
    if (this.moveBackward) inputY -= 1;
    if (this.moveLeft) inputX -= 1;
    if (this.moveRight) inputX += 1;

    // mobile movement overrides / mixes in
    if (this.mobileEnabled) {
      inputX += this.mobileMoveX;
      inputY += -this.mobileMoveY;
    }

    // clamp
    const moveLen = Math.hypot(inputX, inputY);
    let moveX = inputX;
    let moveY = inputY;
    if (moveLen > 1) {
      moveX /= moveLen;
      moveY /= moveLen;
    }

    const isMoving = Math.abs(moveX) > 0.001 || Math.abs(moveY) > 0.001;

    // IMPORTANT FIX:
    // lock movement direction basis when movement starts
    // so turning camera while holding W doesn't flip motion
    if (isMoving && !this.prevMoving) {
      this.movementYaw = this.yaw;
    }
    this.prevMoving = isMoving;

    const basisYaw = isMoving ? this.movementYaw : this.yaw;

    const forward = new THREE.Vector3(
      Math.sin(basisYaw),
      0,
      -Math.cos(basisYaw)
    );

    const right = new THREE.Vector3(
      Math.cos(basisYaw),
      0,
      Math.sin(basisYaw)
    );

    const dir = new THREE.Vector3();
    dir.addScaledVector(forward, moveY);
    dir.addScaledVector(right, moveX);

    if (dir.lengthSq() > 0) dir.normalize();

    let speed = this.walkSpeed;
    const wantsSprint =
      this.sprinting &&
      isMoving &&
      this.stamina > 0;

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

    // brighter / more visible body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.8, 0.8),
      new THREE.MeshStandardMaterial({
        color: 0x39a9ff,
        emissive: 0x0f2f55,
        roughness: 0.7,
        metalness: 0.1
      })
    );
    body.position.y = 0.9;
    this.group.add(body);

    // head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshStandardMaterial({
        color: 0xe6e6e6
      })
    );
    head.position.y = 1.95;
    this.group.add(head);

    const label = this.makeLabel(name);
    label.position.y = 2.65;
    this.group.add(label);

    this.scene.add(this.group);

    this.target = {
      x: 0,
      y: 1.7,
      z: 0,
      yaw: 0
    };
  }

  makeLabel(text) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.8, 0.7, 1);
    sprite.renderOrder = 999;
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
