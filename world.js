import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.enemyMesh = null;
    this.enemyTarget = { x: 0, y: 1.2, z: 0 };
    this.enemyPulse = 0;

    this.build();
  }

  build() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(10, 18, 8);
    this.scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x2f3d2f })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // outer walls
    this.addBox(0, 2, -40, 80, 4, 1, 0x666666);
    this.addBox(0, 2, 40, 80, 4, 1, 0x666666);
    this.addBox(-40, 2, 0, 1, 4, 80, 0x666666);
    this.addBox(40, 2, 0, 1, 4, 80, 0x666666);

    // interior obstacles
    this.addBox(0, 2, -12, 24, 4, 1.2, 0x888888);
    this.addBox(-12, 2, 10, 1.2, 4, 20, 0x888888);
    this.addBox(15, 2, 12, 18, 4, 1.2, 0x888888);
    this.addBox(20, 2, -10, 1.2, 4, 18, 0x888888);
    this.addBox(-20, 2, -18, 14, 4, 1.2, 0x888888);
    this.addBox(-6, 2, 22, 20, 4, 1.2, 0x888888);

    // crates
    for (const [x, z] of [
      [-8, -6], [8, -3], [12, 18], [-16, 16], [24, 4], [-24, -8]
    ]) {
      this.addBox(x, 1, z, 2, 2, 2, 0x7a5a39);
    }

    // enemy mesh
    const enemy = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xcc3344,
        emissive: 0x330000
      })
    );
    body.position.y = 1.1;
    enemy.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0xf1d4d4 })
    );
    head.position.y = 2.6;
    enemy.add(head);

    enemy.position.set(0, 0, 0);
    this.scene.add(enemy);
    this.enemyMesh = enemy;
  }

  addBox(x, y, z, sx, sy, sz, color = 0x888888) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.colliders.push({
      minX: x - sx / 2,
      maxX: x + sx / 2,
      minZ: z - sz / 2,
      maxZ: z + sz / 2,
      height: sy
    });

    return mesh;
  }

  resolvePlayerCollision(prev, next, radius) {
    const corrected = next.clone();

    // x axis
    let testX = corrected.x;
    let testZ = prev.z;
    if (this.collidesXZ(testX, testZ, radius)) {
      corrected.x = prev.x;
    }

    // z axis
    testX = corrected.x;
    testZ = corrected.z;
    if (this.collidesXZ(testX, testZ, radius)) {
      corrected.z = prev.z;
      if (this.collidesXZ(corrected.x, corrected.z, radius)) {
        corrected.x = prev.x;
      }
    }

    return corrected;
  }

  collidesXZ(x, z, radius) {
    for (const c of this.colliders) {
      const nearestX = clamp(x, c.minX, c.maxX);
      const nearestZ = clamp(z, c.minZ, c.maxZ);
      const dx = x - nearestX;
      const dz = z - nearestZ;
      if (dx * dx + dz * dz < radius * radius) {
        return true;
      }
    }
    return false;
  }

  updateEnemyFromServer(enemyState, localPlayer, dt = 0.016) {
    if (!enemyState || !this.enemyMesh) return;

    this.enemyTarget.x = enemyState.x;
    this.enemyTarget.y = enemyState.y ?? 1.2;
    this.enemyTarget.z = enemyState.z;

    this.enemyMesh.position.x += (this.enemyTarget.x - this.enemyMesh.position.x) * Math.min(1, dt * 8);
    this.enemyMesh.position.z += (this.enemyTarget.z - this.enemyMesh.position.z) * Math.min(1, dt * 8);
    this.enemyMesh.position.y = 0;

    this.enemyPulse += dt * 6;
    const bob = Math.sin(this.enemyPulse) * 0.06;
    this.enemyMesh.position.y = bob;
  }
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
