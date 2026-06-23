import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];
    this.enemy = null;

    this.buildLights();
    this.buildFloor();
    this.buildMap();
    this.buildEnemy();
  }

  buildLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(6, 12, 6);
    this.scene.add(dir);
  }

  buildFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(80, 80, 0x444444, 0x222222);
    this.scene.add(grid);
  }

  addWall(x, y, z, sx, sy, sz, color = 0x666666) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({ color })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const min = new THREE.Vector3(x - sx / 2, y - sy / 2, z - sz / 2);
    const max = new THREE.Vector3(x + sx / 2, y + sy / 2, z + sz / 2);
    this.walls.push({ min, max, mesh });
  }

  buildMap() {
    // Outer borders
    this.addWall(0, 1.5, -20, 40, 3, 1);
    this.addWall(0, 1.5, 20, 40, 3, 1);
    this.addWall(-20, 1.5, 0, 1, 3, 40);
    this.addWall(20, 1.5, 0, 1, 3, 40);

    // Inner walls / rooms
    this.addWall(-6, 1.5, -6, 12, 3, 1);
    this.addWall(8, 1.5, -2, 1, 3, 14);
    this.addWall(-10, 1.5, 8, 10, 3, 1);
    this.addWall(5, 1.5, 10, 16, 3, 1);
    this.addWall(-2, 1.5, 3, 1, 3, 10);
    this.addWall(13, 1.5, -11, 10, 3, 1);
    this.addWall(-14, 1.5, -12, 1, 3, 8);

    // Decorations / obstacles
    this.addWall(0, 0.75, 0, 2, 1.5, 2, 0x885522);
    this.addWall(10, 0.75, 6, 2, 1.5, 2, 0x885522);
    this.addWall(-8, 0.75, -10, 2, 1.5, 2, 0x885522);
  }

  buildEnemy() {
    const enemyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xff3b3b })
    );
    enemyMesh.position.set(6, 1.1, 6);
    this.scene.add(enemyMesh);

    this.enemy = {
      mesh: enemyMesh,
      pos: enemyMesh.position,
      speed: 3.5
    };
  }

  resolvePlayerCollision(oldPos, nextPos, radius) {
    const out = nextPos.clone();

    for (const wall of this.walls) {
      const expandedMin = wall.min.clone().sub(new THREE.Vector3(radius, 0, radius));
      const expandedMax = wall.max.clone().add(new THREE.Vector3(radius, 0, radius));

      const insideX = out.x > expandedMin.x && out.x < expandedMax.x;
      const insideZ = out.z > expandedMin.z && out.z < expandedMax.z;
      const insideY = out.y > wall.min.y - 2 && out.y < wall.max.y + 2;

      if (insideX && insideZ && insideY) {
        const dxMin = Math.abs(out.x - expandedMin.x);
        const dxMax = Math.abs(expandedMax.x - out.x);
        const dzMin = Math.abs(out.z - expandedMin.z);
        const dzMax = Math.abs(expandedMax.z - out.z);

        const minPush = Math.min(dxMin, dxMax, dzMin, dzMax);

        if (minPush === dxMin) out.x = expandedMin.x;
        else if (minPush === dxMax) out.x = expandedMax.x;
        else if (minPush === dzMin) out.z = expandedMin.z;
        else out.z = expandedMax.z;
      }
    }

    return out;
  }

  updateEnemy(dt, localPlayer, remotePlayersMap) {
    if (!this.enemy) return;

    let nearest = {
      x: localPlayer.position.x,
      z: localPlayer.position.z,
      distSq: localPlayer.position.distanceToSquared(this.enemy.pos)
    };

    for (const [, remote] of remotePlayersMap) {
      const dx = remote.group.position.x - this.enemy.pos.x;
      const dz = remote.group.position.z - this.enemy.pos.z;
      const d = dx * dx + dz * dz;
      if (d < nearest.distSq) {
        nearest = {
          x: remote.group.position.x,
          z: remote.group.position.z,
          distSq: d
        };
      }
    }

    const dir = new THREE.Vector3(
      nearest.x - this.enemy.pos.x,
      0,
      nearest.z - this.enemy.pos.z
    );

    if (dir.lengthSq() > 0.0001) {
      dir.normalize();
      this.enemy.pos.x += dir.x * this.enemy.speed * dt;
      this.enemy.pos.z += dir.z * this.enemy.speed * dt;
    }

    const dx = localPlayer.position.x - this.enemy.pos.x;
    const dz = localPlayer.position.z - this.enemy.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.4) {
      localPlayer.takeDamage(22 * dt);
    }
  }
}
