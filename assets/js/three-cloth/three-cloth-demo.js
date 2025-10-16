// src/ts/three-cloth/three-cloth-demo.ts
var ThreeClothDemo = class {
  constructor(container) {
    // Cloth parameters
    this.clothW = 24;
    this.clothH = 16;
    this.spacing = 0.14;
    this.restSpacing = 0.14;
    this.sphereRadius = 1;
    // Physics state
    this.particles = [];
    this.springs = [];
    this.gravityOn = { val: true };
    this.particleSpheres = [];
    this.dragging = null;
    // Physics constants
    this.dt = 1 / 60;
    this.damping = 0.995;
    this.K_STRUCT = 8e3;
    this.contactGapMax = 0.02;
    this.wireframe = false;
    this.animate = () => {
      requestAnimationFrame(this.animate);
      for (let i = 0; i < 2; i++) {
        this.physicsStep();
      }
      this.updateClothGeometry();
      for (const particleSphere of this.particleSpheres) {
        particleSphere.mesh.position.copy(this.particles[particleSphere.idx].pos);
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    this.gravity = new THREE.Vector3(0, -9.81, 0);
    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.initScene(container);
    this.createCloth();
    this.setupLighting();
    this.createObstacles();
    this.createClothMesh();
    this.createDebugSpheres();
    this.setupInteraction();
    this.animate();
  }
  initScene(container) {
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 3, 8);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    window.addEventListener("resize", () => this.onWindowResize());
  }
  setupLighting() {
    this.scene.add(new THREE.AmbientLight(8947848));
    const directionalLight = new THREE.DirectionalLight(16777215, 0.9);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);
  }
  createObstacles() {
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 2254523,
      metalness: 0.3,
      roughness: 0.6
    });
    this.sphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.sphereRadius, 32, 24),
      sphereMat
    );
    this.sphere.position.set(0, -0.5, 0);
    this.scene.add(this.sphere);
  }
  createCloth() {
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        const idx = y * this.clothW + x;
        const px = (x - (this.clothW - 1) / 2) * this.spacing;
        const py = 2 + (this.clothH - 1 - y) * this.spacing;
        const pz = 0;
        const mass = 0.08;
        this.particles.push({
          pos: new THREE.Vector3(px, py, pz),
          prev: new THREE.Vector3(px, py, pz),
          acc: new THREE.Vector3(),
          mass,
          pinned: y === 0 && x % 4 === 0,
          // pin some top vertices
          idx
        });
      }
    }
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        if (x < this.clothW - 1) {
          this.addSpring(this.idx(x, y), this.idx(x + 1, y), this.restSpacing, this.K_STRUCT);
        }
        if (y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x, y + 1), this.restSpacing, this.K_STRUCT);
        }
        if (x < this.clothW - 1 && y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x + 1, y + 1), Math.sqrt(2) * this.restSpacing, this.K_STRUCT * 0.8);
        }
        if (x > 0 && y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x - 1, y + 1), Math.sqrt(2) * this.restSpacing, this.K_STRUCT * 0.8);
        }
        if (x < this.clothW - 2) {
          this.addSpring(this.idx(x, y), this.idx(x + 2, y), this.restSpacing * 2, this.K_STRUCT * 0.25);
        }
        if (y < this.clothH - 2) {
          this.addSpring(this.idx(x, y), this.idx(x, y + 2), this.restSpacing * 2, this.K_STRUCT * 0.25);
        }
      }
    }
  }
  idx(x, y) {
    return y * this.clothW + x;
  }
  addSpring(a, b, rest, k) {
    this.springs.push({ a, b, rest, k });
  }
  createClothMesh() {
    this.clothGeo = new THREE.ParametricGeometry((u, v, target) => {
      target.set(0, 0, 0);
    }, this.clothW - 1, this.clothH - 1);
    this.clothMat = new THREE.MeshStandardMaterial({
      color: 16755319,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.6,
      wireframe: false
    });
    this.clothMesh = new THREE.Mesh(this.clothGeo, this.clothMat);
    this.scene.add(this.clothMesh);
  }
  createDebugSpheres() {
    for (let i = 0; i < this.particles.length; i += Math.floor(this.particles.length / 200) + 1) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 16724787 })
      );
      this.scene.add(sphere);
      this.particleSpheres.push({ mesh: sphere, idx: i });
    }
  }
  setupInteraction() {
    this.renderer.domElement.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.renderer.domElement.addEventListener("pointerup", () => this.onPointerUp());
    this.renderer.domElement.addEventListener("pointermove", (e) => this.onPointerMove(e));
  }
  onPointerDown(e) {
    this.mouse.x = e.clientX / window.innerWidth * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.ray.setFromCamera(this.mouse, this.camera);
    let best = null;
    let bestDistance = 0.12;
    for (const particle of this.particles) {
      const distance = this.ray.ray.distanceToPoint(particle.pos);
      if (distance < bestDistance) {
        best = particle;
        bestDistance = distance;
      }
    }
    if (best) {
      this.dragging = best;
    }
  }
  onPointerUp() {
    this.dragging = null;
  }
  onPointerMove(e) {
    if (!this.dragging) return;
    this.mouse.x = e.clientX / window.innerWidth * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.ray.setFromCamera(this.mouse, this.camera);
    const targetPos = this.ray.ray.at(6, new THREE.Vector3());
    this.dragging.pos.copy(targetPos);
  }
  onWindowResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
  updateClothGeometry() {
    const pos = this.clothGeo.attributes.position.array;
    let k = 0;
    for (let y = 0; y < this.clothH - 1; y++) {
      for (let x = 0; x < this.clothW - 1; x++) {
        const particle = this.particles[this.idx(x, y)];
        pos[k++] = particle.pos.x;
        pos[k++] = particle.pos.y;
        pos[k++] = particle.pos.z;
      }
    }
    this.clothGeo.attributes.position.needsUpdate = true;
    this.clothGeo.computeVertexNormals();
  }
  physicsStep() {
    for (const particle of this.particles) {
      particle.acc.set(0, 0, 0);
    }
    for (const particle of this.particles) {
      if (!particle.pinned && this.gravityOn.val) {
        particle.acc.addScaledVector(this.gravity, 1);
      }
    }
    for (const spring of this.springs) {
      const particleA = this.particles[spring.a];
      const particleB = this.particles[spring.b];
      const direction = new THREE.Vector3().subVectors(particleB.pos, particleA.pos);
      const length = direction.length() || 1e-8;
      direction.multiplyScalar(1 / length);
      const stretch = length - spring.rest;
      const forceMagnitude = spring.k * stretch;
      const force = direction.clone().multiplyScalar(forceMagnitude);
      if (!particleA.pinned) {
        particleA.acc.addScaledVector(force, 1 / particleA.mass);
      }
      if (!particleB.pinned) {
        particleB.acc.addScaledVector(force, -1 / particleB.mass);
      }
    }
    for (const particle of this.particles) {
      const toParticle = new THREE.Vector3().subVectors(particle.pos, this.sphere.position);
      const distance = toParticle.length();
      const gap = distance - this.sphereRadius;
      if (gap <= this.contactGapMax) {
        const normal = toParticle.clone().normalize();
        let localK = 0;
        let count = 0;
        for (const spring of this.springs) {
          if (spring.a === particle.idx || spring.b === particle.idx) {
            localK += spring.k;
            count++;
          }
        }
        if (count > 0) localK /= count;
        const gapSafe = Math.max(gap, 1e-6);
        const kappa = particle.mass / (gapSafe * gapSafe) + localK * 1e-4;
        const forceMagnitude = 2 * kappa / this.contactGapMax * Math.pow(Math.max(this.contactGapMax - gap, 0), 2);
        const force = normal.clone().multiplyScalar(-forceMagnitude);
        if (!particle.pinned) {
          particle.acc.addScaledVector(force, 1 / particle.mass);
        }
        const penetration = Math.max(0, this.sphereRadius - distance + 1e-6);
        if (penetration > 1e-5 && !particle.pinned) {
          particle.pos.add(normal.clone().multiplyScalar(penetration + 1e-5));
        }
      }
    }
    for (const particle of this.particles) {
      if (particle.pinned) {
        particle.prev.copy(particle.pos);
        continue;
      }
      const velocity = new THREE.Vector3().subVectors(particle.pos, particle.prev).multiplyScalar(this.damping);
      velocity.addScaledVector(particle.acc, this.dt);
      const newPos = particle.pos.clone().addScaledVector(velocity, this.dt);
      particle.prev.copy(particle.pos);
      particle.pos.copy(newPos);
    }
  }
  // Public methods for UI controls
  toggleWireframe() {
    this.wireframe = !this.wireframe;
    this.clothMat.wireframe = this.wireframe;
  }
  toggleGravity() {
    this.gravityOn.val = !this.gravityOn.val;
  }
  cleanup() {
    this.renderer.dispose();
    this.clothGeo.dispose();
    this.clothMat.dispose();
    window.removeEventListener("resize", this.onWindowResize);
  }
};
function initThreeClothDemo() {
  const container = document.createElement("div");
  container.style.cssText = "margin:0; overflow:hidden; background:#111; color:#ddd; font-family: sans-serif; position: relative; width: 100%; height: 100vh;";
  const info = document.createElement("div");
  info.style.cssText = "position: absolute; left: 10px; top: 10px; width: 320px; z-index: 10;";
  info.innerHTML = `
    <div><strong>Cubic Barrier + Elasticity-Inclusive Stiffness (simplified)</strong></div>
    <div>Drag cloth vertices with mouse. Toggle gravity / wireframe.</div>
    <div style="margin-top:6px;">
      <button id="toggleGravity">Toggle Gravity</button>
      <button id="toggleWire">Toggle Wireframe</button>
    </div>
  `;
  container.appendChild(info);
  document.body.appendChild(container);
  const demo = new ThreeClothDemo(container);
  const toggleGravityBtn = document.getElementById("toggleGravity");
  const toggleWireBtn = document.getElementById("toggleWire");
  if (toggleGravityBtn) {
    toggleGravityBtn.addEventListener("click", () => demo.toggleGravity());
  }
  if (toggleWireBtn) {
    toggleWireBtn.addEventListener("click", () => demo.toggleWireframe());
  }
}
if (typeof window !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThreeClothDemo);
} else if (typeof window !== "undefined") {
  initThreeClothDemo();
}
export {
  ThreeClothDemo,
  initThreeClothDemo
};
//# sourceMappingURL=three-cloth-demo.js.map
