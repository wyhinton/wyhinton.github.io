// Since we're using Three.js from CDN, we'll declare it as a global
declare const THREE: any;

// Define types for Three.js objects we use
interface ThreeVector3 {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): this;
  copy(v: ThreeVector3): this;
  clone(): ThreeVector3;
  add(v: ThreeVector3): this;
  addScaledVector(v: ThreeVector3, s: number): this;
  subVectors(a: ThreeVector3, b: ThreeVector3): this;
  multiplyScalar(s: number): this;
  normalize(): this;
  length(): number;
}

interface ThreeCamera {
  position: ThreeVector3;
  aspect: number;
  updateProjectionMatrix(): void;
}

interface ThreeRenderer {
  domElement: HTMLElement;
  setSize(width: number, height: number): void;
  render(scene: any, camera: any): void;
  dispose(): void;
}

interface ThreeGeometry {
  attributes: {
    position: {
      array: Float32Array;
      needsUpdate: boolean;
    };
  };
  dispose(): void;
  computeVertexNormals(): void;
}

interface ThreeMaterial {
  wireframe: boolean;
  dispose(): void;
}

interface ThreeMesh {
  position: ThreeVector3;
}

interface ThreeRaycaster {
  ray: {
    distanceToPoint(point: ThreeVector3): number;
    at(t: number, target: ThreeVector3): ThreeVector3;
  };
  setFromCamera(coords: { x: number; y: number }, camera: ThreeCamera): void;
}

interface ThreeOrbitControls {
  enableDamping: boolean;
  update(): void;
}

interface Particle {
  pos: ThreeVector3;
  prev: ThreeVector3;
  acc: ThreeVector3;
  mass: number;
  pinned: boolean;
  idx: number;
}

interface Spring {
  a: number;
  b: number;
  rest: number;
  k: number;
}

interface ParticleSphere {
  mesh: ThreeMesh;
  idx: number;
}

interface GravityState {
  val: boolean;
}

export class ThreeClothDemo {
  private scene: any;
  private renderer!: ThreeRenderer;
  private camera!: ThreeCamera;
  private controls!: ThreeOrbitControls;
  
  // Cloth parameters
  private readonly clothW = 24;
  private readonly clothH = 16;
  private readonly spacing = 0.14;
  private readonly restSpacing = 0.14;
  private readonly sphereRadius = 1.0;
  
  // Physics state
  private particles: Particle[] = [];
  private springs: Spring[] = [];
  private gravityOn: GravityState = { val: true };
  
  // Scene objects
  private sphere: any;
  private clothMesh: any;
  private clothGeo: any;
  private clothMat: any;
  private particleSpheres: ParticleSphere[] = [];
  
  // Interaction
  private ray: any;
  private mouse: any;
  private dragging: Particle | null = null;
  
  // Physics constants
  private readonly dt = 1/60;
  private readonly damping = 0.995;
  private readonly gravity: any;
  private readonly K_STRUCT = 8000;
  private readonly contactGapMax = 0.02;
  
  private wireframe = false;

  constructor(container: HTMLElement) {
    // Initialize gravity and interaction objects
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

  private initScene(container: HTMLElement): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 3, 8);
    
    // Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLighting(): void {
    // Ambient light
    this.scene.add(new THREE.AmbientLight(0x888888));
    
    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);
  }

  private createObstacles(): void {
    // Sphere obstacle
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x2266bb,
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

  private createCloth(): void {
    // Create particle grid
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        const idx = y * this.clothW + x;
        const px = (x - (this.clothW - 1) / 2) * this.spacing;
        const py = 2.0 + (this.clothH - 1 - y) * this.spacing; // top down
        const pz = 0;
        const mass = 0.08;
        
        this.particles.push({
          pos: new THREE.Vector3(px, py, pz),
          prev: new THREE.Vector3(px, py, pz),
          acc: new THREE.Vector3(),
          mass,
          pinned: (y === 0 && (x % 4 === 0)), // pin some top vertices
          idx
        });
      }
    }

    // Create springs
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        // Structural springs
        if (x < this.clothW - 1) {
          this.addSpring(this.idx(x, y), this.idx(x + 1, y), this.restSpacing, this.K_STRUCT);
        }
        if (y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x, y + 1), this.restSpacing, this.K_STRUCT);
        }
        
        // Shear springs
        if (x < this.clothW - 1 && y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x + 1, y + 1), Math.sqrt(2) * this.restSpacing, this.K_STRUCT * 0.8);
        }
        if (x > 0 && y < this.clothH - 1) {
          this.addSpring(this.idx(x, y), this.idx(x - 1, y + 1), Math.sqrt(2) * this.restSpacing, this.K_STRUCT * 0.8);
        }
        
        // Bend springs (longer)
        if (x < this.clothW - 2) {
          this.addSpring(this.idx(x, y), this.idx(x + 2, y), this.restSpacing * 2, this.K_STRUCT * 0.25);
        }
        if (y < this.clothH - 2) {
          this.addSpring(this.idx(x, y), this.idx(x, y + 2), this.restSpacing * 2, this.K_STRUCT * 0.25);
        }
      }
    }
  }

  private idx(x: number, y: number): number {
    return y * this.clothW + x;
  }

  private addSpring(a: number, b: number, rest: number, k: number): void {
    this.springs.push({ a, b, rest, k });
  }

  private createClothMesh(): void {
    // Create parametric geometry for cloth
    this.clothGeo = new THREE.ParametricGeometry((u: any, v: any, target: any) => {
      // Placeholder - we will update geometry from particles
      target.set(0, 0, 0);
    }, this.clothW - 1, this.clothH - 1);
    
    this.clothMat = new THREE.MeshStandardMaterial({
      color: 0xffaa77,
      side: THREE.DoubleSide,
      metalness: 0.2,
      roughness: 0.6,
      wireframe: false
    });
    
    this.clothMesh = new THREE.Mesh(this.clothGeo, this.clothMat);
    this.scene.add(this.clothMesh);
  }

  private createDebugSpheres(): void {
    // Create debug spheres for some particles
    for (let i = 0; i < this.particles.length; i += Math.floor(this.particles.length / 200) + 1) {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff3333 })
      );
      this.scene.add(sphere);
      this.particleSpheres.push({ mesh: sphere, idx: i });
    }
  }

  private setupInteraction(): void {
    this.renderer.domElement.addEventListener('pointerdown', (e: any) => this.onPointerDown(e));
    this.renderer.domElement.addEventListener('pointerup', () => this.onPointerUp());
    this.renderer.domElement.addEventListener('pointermove', (e: any) => this.onPointerMove(e));
  }

  private onPointerDown(e: any): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.ray.setFromCamera(this.mouse, this.camera);
    
    // Find nearest particle within threshold
    let best: Particle | null = null;
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

  private onPointerUp(): void {
    this.dragging = null;
  }

  private onPointerMove(e: any): void {
    if (!this.dragging) return;
    
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.ray.setFromCamera(this.mouse, this.camera);
    
    // Project onto plane near camera for positioning
    const targetPos = this.ray.ray.at(6, new THREE.Vector3());
    
    // Pull particle toward target by setting its position
    this.dragging.pos.copy(targetPos);
  }

  private onWindowResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private updateClothGeometry(): void {
    const pos = this.clothGeo.attributes.position.array as Float32Array;
    let k = 0;
    
    for (let y = 0; y < this.clothH - 1; y++) {
      for (let x = 0; x < this.clothW - 1; x++) {
        // Parametric geometry ordering is u-major; use particle positions of the corners of each quad's lower-left
        const particle = this.particles[this.idx(x, y)];
        pos[k++] = particle.pos.x;
        pos[k++] = particle.pos.y;
        pos[k++] = particle.pos.z;
      }
    }
    
    this.clothGeo.attributes.position.needsUpdate = true;
    this.clothGeo.computeVertexNormals();
  }

  private physicsStep(): void {
    // Reset accelerations
    for (const particle of this.particles) {
      particle.acc.set(0, 0, 0);
    }

    // Apply gravity
    for (const particle of this.particles) {
      if (!particle.pinned && this.gravityOn.val) {
        particle.acc.addScaledVector(this.gravity, 1);
      }
    }

    // Spring forces (Hooke's law)
    for (const spring of this.springs) {
      const particleA = this.particles[spring.a];
      const particleB = this.particles[spring.b];
      const direction = new THREE.Vector3().subVectors(particleB.pos, particleA.pos);
      const length = direction.length() || 1e-8;
      direction.multiplyScalar(1 / length);
      const stretch = length - spring.rest;
      
      // Apply equal/opposite forces
      const forceMagnitude = spring.k * stretch;
      const force = direction.clone().multiplyScalar(forceMagnitude);
      
      if (!particleA.pinned) {
        particleA.acc.addScaledVector(force, 1 / particleA.mass);
      }
      if (!particleB.pinned) {
        particleB.acc.addScaledVector(force, -1 / particleB.mass);
      }
    }

    // Contacts: sphere + cubic barrier
    for (const particle of this.particles) {
      // Compute signed gap = distance from sphere surface (positive outside)
      const toParticle = new THREE.Vector3().subVectors(particle.pos, this.sphere.position);
      const distance = toParticle.length();
      const gap = distance - this.sphereRadius;
      
      if (gap <= this.contactGapMax) {
        // Unit normal outward from sphere
        const normal = toParticle.clone().normalize();
        
        // Approximate local elasticity projection as average spring stiffness magnitude around this particle
        let localK = 0;
        let count = 0;
        
        for (const spring of this.springs) {
          if (spring.a === particle.idx || spring.b === particle.idx) {
            localK += spring.k;
            count++;
          }
        }
        
        if (count > 0) localK /= count;
        
        // Compute kappa (avoid tiny gap)
        const gapSafe = Math.max(gap, 1e-6);
        const kappa = particle.mass / (gapSafe * gapSafe) + localK * 1e-4; // scale localK down so it doesn't dominate
        
        // Force magnitude (derived from dψ/dg)
        const forceMagnitude = (2 * kappa / this.contactGapMax) * Math.pow(Math.max(this.contactGapMax - gap, 0), 2);
        const force = normal.clone().multiplyScalar(-forceMagnitude); // negative: pushes outward (normal points from sphere center)
        
        if (!particle.pinned) {
          particle.acc.addScaledVector(force, 1 / particle.mass);
        }
        
        // Simple positional correction to avoid tunneling
        const penetration = Math.max(0, this.sphereRadius - distance + 1e-6);
        if (penetration > 1e-5 && !particle.pinned) {
          particle.pos.add(normal.clone().multiplyScalar(penetration + 1e-5));
        }
      }
    }

    // Integrate (semi-implicit-ish)
    for (const particle of this.particles) {
      if (particle.pinned) {
        particle.prev.copy(particle.pos);
        continue;
      }
      
      // Velocity estimate
      const velocity = new THREE.Vector3().subVectors(particle.pos, particle.prev).multiplyScalar(this.damping);
      
      // Semi-implicit Euler: v += a * dt ; x += v * dt
      velocity.addScaledVector(particle.acc, this.dt);
      const newPos = particle.pos.clone().addScaledVector(velocity, this.dt);
      
      particle.prev.copy(particle.pos);
      particle.pos.copy(newPos);
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    // Run some physics substeps per render to stabilize
    for (let i = 0; i < 2; i++) {
      this.physicsStep();
    }
    
    this.updateClothGeometry();
    
    // Update particle spheres for debugging
    for (const particleSphere of this.particleSpheres) {
      particleSphere.mesh.position.copy(this.particles[particleSphere.idx].pos);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  // Public methods for UI controls
  public toggleWireframe(): void {
    this.wireframe = !this.wireframe;
    this.clothMat.wireframe = this.wireframe;
  }

  public toggleGravity(): void {
    this.gravityOn.val = !this.gravityOn.val;
  }

  public cleanup(): void {
    // Clean up resources
    this.renderer.dispose();
    this.clothGeo.dispose();
    this.clothMat.dispose();
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
  }
}

// Initialize demo when DOM is loaded
export function initThreeClothDemo(): void {
  // Create container with info panel
  const container = document.createElement('div');
  container.style.cssText = 'margin:0; overflow:hidden; background:#111; color:#ddd; font-family: sans-serif; position: relative; width: 100%; height: 100vh;';
  
  const info = document.createElement('div');
  info.style.cssText = 'position: absolute; left: 10px; top: 10px; width: 320px; z-index: 10;';
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
  
  // Initialize demo
  const demo = new ThreeClothDemo(container);
  
  // Setup UI event listeners
  const toggleGravityBtn = document.getElementById('toggleGravity');
  const toggleWireBtn = document.getElementById('toggleWire');
  
  if (toggleGravityBtn) {
    toggleGravityBtn.addEventListener('click', () => demo.toggleGravity());
  }
  
  if (toggleWireBtn) {
    toggleWireBtn.addEventListener('click', () => demo.toggleWireframe());
  }
}

// Auto-initialize if this script is loaded directly in browser
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThreeClothDemo);
} else if (typeof window !== 'undefined') {
  initThreeClothDemo();
}
