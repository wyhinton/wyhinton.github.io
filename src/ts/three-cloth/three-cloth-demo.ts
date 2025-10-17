import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Pane } from 'tweakpane';
import { ViewportGizmo } from "three-viewport-gizmo";

interface Particle {
  pos: THREE.Vector3;
  prev: THREE.Vector3;
  acc: THREE.Vector3;
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
  mesh: THREE.Mesh | THREE.Sprite;
  idx: number;
}

interface GravityState {
  val: boolean;
}

export class ThreeClothDemo {
  private scene: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private gizmo!: ViewportGizmo;
  
  // Cloth parameters
  private clothW = 24;
  private clothH = 16;
  private spacing = 0.22;
  private restSpacing = 0.22;
  private sphereRadius = 1.0;
  
  // Physics state
  private particles: Particle[] = [];
  private springs: Spring[] = [];
  private gravityOn: GravityState = { val: true };
  
  // Scene objects
  private sphere!: THREE.Mesh;
  private clothMesh!: THREE.Mesh;
  private clothGeo!: THREE.BufferGeometry;
  private clothMat!: THREE.MeshStandardMaterial;
  private particleSpheres: ParticleSphere[] = [];
  
  // Interaction
  private ray: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragging: Particle | null = null;
  
  // Interaction gizmo
  private interactionGizmo?: THREE.Group;
  private forceIndicator?: THREE.Mesh;
  private directionArrow?: THREE.Mesh;
  private targetSphere?: THREE.Mesh;
  private gizmoVisible = false;
  
  // Physics constants
  private readonly dt = 1/60;
  private readonly damping = 0.995;
  private readonly gravity: THREE.Vector3;
  private readonly K_STRUCT = 8000;
  private readonly contactGapMax = 0.02;
  private readonly maxVelocity = 10.0; // Maximum velocity per step to prevent instability
  
  private wireframe = false;
  
  // Tweakpane controls N
  private pane?: Pane;
  private frameCount = 0;
  private lastFpsUpdate = performance.now();
  
  // Simulation control
  private simulationPaused = false;
  private vertexSelector?: HTMLElement; // Now used for range selector
  private geometryTable?: HTMLTableElement;
  private geometryTableEnabled = false; // Toggle for geometry table updates - default to false
  private lastUpdateTime = 0; // Time tracking for geometry table updates

  constructor(container: HTMLElement) {
    // Initialize scene and interaction objects first
    this.scene = new THREE.Scene();
    this.gravity = new THREE.Vector3(0, -9.81, 0);
    this.ray = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.initScene(container);
    this.createCloth();
    this.setupLighting();
    this.createFloorGrid();
    this.createObstacles();
    this.createClothMesh();
    this.createDebugSpheres();
    this.setupInteraction();
    this.createInteractionGizmo();
    this.initTweakpane(container);
    this.animate();
  }

  private initScene(container: HTMLElement): void {
    // Scene setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    
    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 200);
    this.camera.position.set(0, 3, 8);
    
    // Controls - Use the imported OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    // Create viewport gizmo with debugging
    this.gizmo = new ViewportGizmo(this.camera, this.renderer);
    this.gizmo.attachControls(this.controls);
    
    console.log('ViewportGizmo created:', this.gizmo);
    console.log('ViewportGizmo type:', typeof this.gizmo);
    console.log('ViewportGizmo properties:', Object.getOwnPropertyNames(this.gizmo));
    
    // Force the gizmo to be visible by setting its placement
    try {
      // Try different approaches to ensure visibility
      (this.gizmo as any).placement = 'top-right';
      (this.gizmo as any).size = 128;
      (this.gizmo as any).lineWidth = 4;
    } catch (e) {
      console.warn('Could not set gizmo properties:', e);
    }

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

  private createFloorGrid(): void {
    // Create a floor grid for better spatial reference
    const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
    gridHelper.position.y = -3; // Position below the cloth and sphere
    this.scene.add(gridHelper);
    
    // Add a subtle floor plane for better visual grounding
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = -3.01; // Slightly below the grid to avoid z-fighting
    this.scene.add(floor);
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

  private createCloth(centerX: number = 0, centerY: number = 2.0, centerZ: number = 0): void {
    console.log(`Creating cloth at position: (${centerX}, ${centerY}, ${centerZ})`);
    console.log(`Cloth dimensions: ${this.clothW} x ${this.clothH}, spacing: ${this.spacing}`);
    
    // Create particle grid
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        const idx = y * this.clothW + x;
        const px = centerX + (x - (this.clothW - 1) / 2) * this.spacing;
        const py = centerY + (this.clothH - 1 - y) * this.spacing; // top down
        const pz = centerZ;
        const mass = 0.08;
        
        // Debug: Check for NaN in initial positions
        if (isNaN(px) || isNaN(py) || isNaN(pz)) {
          console.error(`NaN detected in initial position for particle ${idx}: (${px}, ${py}, ${pz})`);
        }
        
        // Debug: Log position calculation details for first few particles
        if (idx < 10) {
          console.log(`Particle ${idx} (x=${x}, y=${y}):`, {
            calc: `(${x} - ${(this.clothW - 1) / 2}) * ${this.spacing} = ${px}`,
            finalPos: `(${px.toFixed(3)}, ${py.toFixed(3)}, ${pz.toFixed(3)})`
          });
        }
        
        this.particles.push({
          pos: new THREE.Vector3(px, py, pz),
          prev: new THREE.Vector3(px, py, pz),
          acc: new THREE.Vector3(),
          mass,
          pinned: (y === 0), // pin entire top row of vertices
          idx
        });
      }
    }
    
    console.log(`Created ${this.particles.length} particles`);
    
    // Debug: Check first few particles
    for (let i = 0; i < Math.min(5, this.particles.length); i++) {
      const p = this.particles[i];
      console.log(`Particle ${i}: pos(${p.pos.x.toFixed(3)}, ${p.pos.y.toFixed(3)}, ${p.pos.z.toFixed(3)}), pinned: ${p.pinned}`);
    }
    
    // Check for any NaN in the initial particle array
    const nanParticles = this.particles.filter(p => 
      isNaN(p.pos.x) || isNaN(p.pos.y) || isNaN(p.pos.z) ||
      isNaN(p.prev.x) || isNaN(p.prev.y) || isNaN(p.prev.z)
    );
    if (nanParticles.length > 0) {
      console.error(`Found ${nanParticles.length} particles with NaN positions after creation:`, nanParticles);
    }
    
    // Debug: Check for duplicate positions
    const positionMap = new Map<string, number[]>();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const posKey = `${p.pos.x.toFixed(6)},${p.pos.y.toFixed(6)},${p.pos.z.toFixed(6)}`;
      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey)!.push(i);
    }
    
    const duplicates = Array.from(positionMap.entries()).filter(([key, indices]) => indices.length > 1);
    if (duplicates.length > 0) {
      console.warn(`Found ${duplicates.length} duplicate positions:`, duplicates.slice(0, 5)); // Show first 5
    }
    
    // Debug: Show position range
    const xPositions = this.particles.map(p => p.pos.x);
    const yPositions = this.particles.map(p => p.pos.y);
    console.log('Position ranges:', {
      x: { min: Math.min(...xPositions).toFixed(3), max: Math.max(...xPositions).toFixed(3) },
      y: { min: Math.min(...yPositions).toFixed(3), max: Math.max(...yPositions).toFixed(3) },
      expectedWidth: ((this.clothW - 1) * this.spacing).toFixed(3),
      expectedHeight: ((this.clothH - 1) * this.spacing).toFixed(3)
    });

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
    // Create plane geometry for cloth
    this.clothGeo = new THREE.PlaneGeometry(
      (this.clothW - 1) * this.spacing,
      (this.clothH - 1) * this.spacing,
      this.clothW - 1,
      this.clothH - 1
    );
    
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
    // Create sprites for ALL particles to visualize the cloth simulation
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    
    // Draw a circle for the sprite texture
    context.beginPath();
    context.arc(32, 32, 30, 0, 2 * Math.PI);
    context.fillStyle = '#ff4444';
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.8
    });
    
    // Create a sprite for EVERY particle
    for (let i = 0; i < this.particles.length; i++) {
      const sprite = new THREE.Sprite(spriteMaterial.clone());
      sprite.scale.set(0.05, 0.05, 1); // Small size
      
      // Color-code sprites: red for pinned, blue for free particles
      if (this.particles[i].pinned) {
        sprite.material.color.setHex(0xff0000); // Red for pinned
      } else {
        sprite.material.color.setHex(0x4444ff); // Blue for free
      }
      
      this.scene.add(sprite);
      this.particleSpheres.push({ mesh: sprite, idx: i });
    }
    
    console.log(`Created ${this.particleSpheres.length} particle sprites (${this.particles.filter(p => p.pinned).length} pinned, ${this.particles.filter(p => !p.pinned).length} free)`);
  }

  private setupInteraction(): void {
    this.renderer.domElement.addEventListener('pointerdown', (e: any) => this.onPointerDown(e));
    this.renderer.domElement.addEventListener('pointerup', () => this.onPointerUp());
    this.renderer.domElement.addEventListener('pointermove', (e: any) => this.onPointerMove(e));
  }

  private onPointerDown(e: any): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
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
      this.gizmoVisible = true;
      
      // Show gizmo at particle position (if gizmo toggle is enabled)
      if (this.interactionGizmo && this.pane && (this.pane as any).params?.showGizmo) {
        this.interactionGizmo.visible = true;
        this.updateInteractionGizmo(best.pos, new THREE.Vector3());
      }
    }
  }

  private onPointerUp(): void {
    this.dragging = null;
    this.gizmoVisible = false;
    
    // Hide gizmo
    if (this.interactionGizmo) {
      this.interactionGizmo.visible = false;
    }
  }

  private onPointerMove(e: any): void {
    if (!this.dragging) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.mouse, this.camera);
    
    // Project onto plane near camera for positioning
    const targetPos = this.ray.ray.at(6, new THREE.Vector3());
    
    // Calculate force direction and magnitude
    const forceDirection = new THREE.Vector3().subVectors(targetPos, this.dragging.pos);
    
    // Update gizmo to show force direction and magnitude (if enabled)
    if (this.interactionGizmo && this.interactionGizmo.visible && this.pane && (this.pane as any).params?.showGizmo) {
      this.updateInteractionGizmo(this.dragging.pos, forceDirection);
    }
    
    // Pull particle toward target by setting its position
    this.dragging.pos.copy(targetPos);
  }

  private onWindowResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.gizmo.update();
  }

  public onResize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.gizmo.update();
  }

  private updateClothGeometry(): void {
    const pos = this.clothGeo.attributes.position.array as Float32Array;
    let k = 0;
    let nanCount = 0;
    
    // Update geometry vertices from particles
    for (let y = 0; y < this.clothH; y++) {
      for (let x = 0; x < this.clothW; x++) {
        const particle = this.particles[this.idx(x, y)];
        
        // Check for NaN in particle position before copying to geometry
        if (isNaN(particle.pos.x) || isNaN(particle.pos.y) || isNaN(particle.pos.z)) {
          nanCount++;
          if (nanCount <= 3) { // Only log first few to avoid spam
            console.error(`NaN in particle position during geometry update - particle ${particle.idx} at (${x}, ${y}):`, {
              pos: particle.pos,
              prev: particle.prev,
              acc: particle.acc,
              pinned: particle.pinned
            });
          }
        }
        
        pos[k++] = particle.pos.x;
        pos[k++] = particle.pos.y;
        pos[k++] = particle.pos.z;
      }
    }
    
    if (nanCount > 0) {
      console.error(`Found ${nanCount} particles with NaN positions during geometry update`);
    }
    
    this.clothGeo.attributes.position.needsUpdate = true;
    this.clothGeo.computeVertexNormals();
  }

  private physicsStep(): void {
    // Reset accelerations
    for (const particle of this.particles) {
      particle.acc.set(0, 0, 0);
    }
    
    // Check for NaN particles at the start of physics step and fix them
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (isNaN(particle.pos.x) || isNaN(particle.pos.y) || isNaN(particle.pos.z)) {
        console.warn(`Fixing NaN position for particle ${i}, resetting to initial position`);
        // Reset to a safe position based on grid layout
        const x = i % this.clothW;
        const y = Math.floor(i / this.clothW);
        const px = (x - (this.clothW - 1) / 2) * this.spacing;
        const py = 2.0 + (this.clothH - 1 - y) * this.spacing;
        const pz = 0;
        particle.pos.set(px, py, pz);
        particle.prev.copy(particle.pos);
      }
      if (isNaN(particle.prev.x) || isNaN(particle.prev.y) || isNaN(particle.prev.z)) {
        console.warn(`Fixing NaN previous position for particle ${i}`);
        particle.prev.copy(particle.pos);
      }
    }

    // Apply gravity
    let gravityAppliedCount = 0;
    for (const particle of this.particles) {
      if (!particle.pinned && this.gravityOn.val) {
        particle.acc.addScaledVector(this.gravity, 1);
        gravityAppliedCount++;
      }
    }
    
    // Debug: Log gravity application occasionally
    if (this.frameCount % 120 === 0 && gravityAppliedCount > 0) { // Every 2 seconds at 60fps
      console.log(`Gravity applied to ${gravityAppliedCount} particles, gravity vector:`, this.gravity, 'gravityOn:', this.gravityOn.val);
    }

    // Spring forces (Hooke's law)
    for (const spring of this.springs) {
      const particleA = this.particles[spring.a];
      const particleB = this.particles[spring.b];
      
      // Check for NaN particles before calculating forces
      if (isNaN(particleA.pos.x) || isNaN(particleA.pos.y) || isNaN(particleA.pos.z) ||
          isNaN(particleB.pos.x) || isNaN(particleB.pos.y) || isNaN(particleB.pos.z)) {
        console.error(`NaN particle positions detected before spring force calculation:`, {
          spring: spring,
          particleA: { idx: particleA.idx, pos: particleA.pos, pinned: particleA.pinned },
          particleB: { idx: particleB.idx, pos: particleB.pos, pinned: particleB.pinned }
        });
        continue; // Skip this spring
      }
      
      const direction = new THREE.Vector3().subVectors(particleB.pos, particleA.pos);
      const length = direction.length();
      
      // Check for invalid length values
      if (!isFinite(length) || length < 1e-8) {
        if (!isFinite(length)) {
          console.error(`Infinite length detected in spring:`, {
            spring: spring,
            length: length,
            particleA: { idx: particleA.idx, pos: particleA.pos, pinned: particleA.pinned },
            particleB: { idx: particleB.idx, pos: particleB.pos, pinned: particleB.pinned }
          });
        }
        continue; // Skip this spring
      }
      
      direction.multiplyScalar(1 / length);
      const stretch = length - spring.rest;
      
      // Apply equal/opposite forces
      const forceMagnitude = spring.k * stretch;
      const force = direction.clone().multiplyScalar(forceMagnitude);
      
      // Debug: Check for NaN/infinite values in force calculation
      if (!isFinite(forceMagnitude) || !isFinite(force.x) || !isFinite(force.y) || !isFinite(force.z)) {
        console.error(`Non-finite values in spring force calculation:`, {
          spring: spring,
          length, stretch, forceMagnitude,
          direction: direction,
          force: force,
          particleA: { idx: particleA.idx, pos: particleA.pos, pinned: particleA.pinned },
          particleB: { idx: particleB.idx, pos: particleB.pos, pinned: particleB.pinned }
        });
        continue; // Skip this spring
      }
      
      if (!particleA.pinned) {
        particleA.acc.addScaledVector(force, 1 / particleA.mass);
        // Debug: Check for NaN after force application
        if (isNaN(particleA.acc.x) || isNaN(particleA.acc.y) || isNaN(particleA.acc.z)) {
          console.error(`NaN in particleA acceleration after spring force:`, {
            idx: particleA.idx,
            acc: particleA.acc,
            force: force,
            mass: particleA.mass
          });
        }
      }
      if (!particleB.pinned) {
        particleB.acc.addScaledVector(force, -1 / particleB.mass);
        // Debug: Check for NaN after force application
        if (isNaN(particleB.acc.x) || isNaN(particleB.acc.y) || isNaN(particleB.acc.z)) {
          console.error(`NaN in particleB acceleration after spring force:`, {
            idx: particleB.idx,
            acc: particleB.acc,
            force: force,
            mass: particleB.mass
          });
        }
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
      
      // Clamp velocity to prevent instability
      const velocityMagnitude = velocity.length();
      if (velocityMagnitude > this.maxVelocity) {
        velocity.multiplyScalar(this.maxVelocity / velocityMagnitude);
      }
      
      const newPos = particle.pos.clone().addScaledVector(velocity, this.dt);
      
      // Validate new position before applying
      if (!isFinite(newPos.x) || !isFinite(newPos.y) || !isFinite(newPos.z) ||
          !isFinite(velocity.x) || !isFinite(velocity.y) || !isFinite(velocity.z)) {
        console.error(`Non-finite values during integration for particle ${particle.idx}:`, {
          oldPos: particle.pos.clone(),
          prevPos: particle.prev.clone(),
          acc: particle.acc.clone(),
          velocity: velocity.clone(),
          newPos: newPos.clone(),
          dt: this.dt,
          damping: this.damping
        });
        // Skip update for this particle to prevent corruption
        continue;
      }
      
      particle.prev.copy(particle.pos);
      particle.pos.copy(newPos);
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    
    // Skip physics if simulation is paused
    if (!this.simulationPaused) {
      // Run some physics substeps per render to stabilize
      for (let i = 0; i < 2; i++) {
        this.physicsStep();
        
        // Check for NaN after each physics step
        if (this.checkForNaNAndPause()) {
          break; // Stop physics steps if NaN detected
        }
      }
    }
    
    this.updateClothGeometry();
    
    // Update particle spheres for debugging
    for (const particleSphere of this.particleSpheres) {
      particleSphere.mesh.position.copy(this.particles[particleSphere.idx].pos);
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate > 1000) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      if (this.pane && (this.pane as any).params) {
        (this.pane as any).params.fps = fps;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    
    // Update geometry table periodically (every 10 frames to avoid too frequent updates)
    if (this.frameCount % 10 === 0 && this.geometryTable && this.geometryTableEnabled) {
      this.updateGeometryTableData(0);
    }
    
    // Render the viewport gizmo with debugging
    try {
      this.gizmo.render();
      // Log gizmo status occasionally
      if (this.frameCount % 300 === 0) { // Every 5 seconds at 60fps
        console.log('Gizmo render called, gizmo object:', this.gizmo);
      }
    } catch (e) {
      console.error('Error rendering gizmo:', e);
    }
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
    
    // Dispose Tweakpane
    if (this.pane) {
      this.pane.dispose();
    }
    
    // Remove geometry table
    const tableContainer = document.getElementById('geometry-table-container');
    if (tableContainer && tableContainer.parentNode) {
      tableContainer.parentNode.removeChild(tableContainer);
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
  }

  private initTweakpane(container: HTMLElement): void {
    // Create a container for the Tweakpane
    const paneContainer = document.createElement('div');
    paneContainer.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 20;';
    container.appendChild(paneContainer);
    
    this.pane = new Pane({
      container: paneContainer,
      expanded: true,
      title: "Cloth Controls",
    });

    const params = {
      gravity: this.gravityOn.val,
      wireframe: this.wireframe,
      paused: this.simulationPaused,
      showGizmo: true,
      fps: 60,
      particles: this.particles.length,
      springs: this.springs.length,
      // Cloth parameters
      clothW: this.clothW,
      clothH: this.clothH,
      spacing: this.spacing,
      restSpacing: this.restSpacing,
      sphereRadius: this.sphereRadius,
    };

    // Add gravity toggle
    this.pane
      .addBinding(params, "gravity", {
        label: "Gravity"
      })
      .on("change", (ev: any) => {
        this.gravityOn.val = ev.value;
      });

    // Add pause/resume toggle
    this.pane
      .addBinding(params, "paused", {
        label: "Paused"
      })
      .on("change", (ev: any) => {
        this.simulationPaused = ev.value;
        if (!ev.value) {
          console.log("🟢 Simulation resumed");
        }
      });

    // Add wireframe toggle
    this.pane
      .addBinding(params, "wireframe", {
        label: "Wireframe"
      })
      .on("change", (ev: any) => {
        this.wireframe = ev.value;
        this.clothMat.wireframe = this.wireframe;
      });

    // Add gizmo toggle
    this.pane
      .addBinding(params, "showGizmo", {
        label: "Show Gizmo"
      })
      .on("change", (ev: any) => {
        if (this.interactionGizmo) {
          // Only show if we're currently dragging and toggle is enabled
          this.interactionGizmo.visible = ev.value && this.gizmoVisible;
        }
      });

    // Add performance monitors
    this.pane.addBinding(params, "fps", {
      label: "FPS",
      format: (v: number) => `${v.toFixed(1)}`,
      interval: 100,
      readonly: true,
    });

    // Add FPS graph
    this.pane.addBinding(params, "fps", {
      label: "",
      format: (v: number) => Math.round(v).toString(),
      readonly: true,
      view: "graph",
    });

    // Add info displays
    this.pane.addBinding(params, "particles", {
      label: "Particles",
      readonly: true,
    });

    this.pane.addBinding(params, "springs", {
      label: "Springs", 
      readonly: true,
    });

    // Add cloth parameter controls
    const clothFolder = this.pane.addFolder({
      title: 'Cloth Parameters',
      expanded: false
    });

    clothFolder.addBinding(params, "clothW", {
      label: "Width",
      min: 5,
      max: 50,
      step: 1
    }).on("change", (ev: any) => {
      this.clothW = ev.value;
    });

    clothFolder.addBinding(params, "clothH", {
      label: "Height", 
      min: 5,
      max: 50,
      step: 1
    }).on("change", (ev: any) => {
      this.clothH = ev.value;
    });

    clothFolder.addBinding(params, "spacing", {
      label: "Spacing",
      min: 0.05,
      max: 0.5,
      step: 0.01
    }).on("change", (ev: any) => {
      this.spacing = ev.value;
    });

    clothFolder.addBinding(params, "restSpacing", {
      label: "Rest Spacing",
      min: 0.05,
      max: 0.5,
      step: 0.01
    }).on("change", (ev: any) => {
      this.restSpacing = ev.value;
    });

    clothFolder.addBinding(params, "sphereRadius", {
      label: "Sphere Radius",
      min: 0.5,
      max: 3.0,
      step: 0.1
    }).on("change", (ev: any) => {
      this.sphereRadius = ev.value;
      // Update the sphere geometry immediately
      this.updateSphereGeometry();
    });
    
    // Add reset button
    this.pane.addButton({
      title: 'Reset Simulation'
    }).on('click', () => {
      this.resetSimulation();
    });

    // Store reference for FPS updates
    (this.pane as any).params = params;
    
    // Create geometry inspector table below canvas
    this.createGeometryTable(container);
  }



  private dumpVertexData(): void {
    // Since we now show all vertices, this method dumps the first vertex as an example
    const selectedVertex = 0;
    const vertex = this.particles[selectedVertex];
    
    console.log(`=== Vertex ${selectedVertex} Data (Example) ===`);
    console.log('Position:', { x: vertex.pos.x, y: vertex.pos.y, z: vertex.pos.z });
    console.log('Previous:', { x: vertex.prev.x, y: vertex.prev.y, z: vertex.prev.z });
    console.log('Acceleration:', { x: vertex.acc.x, y: vertex.acc.y, z: vertex.acc.z });
    console.log('Mass:', vertex.mass);
    console.log('Pinned:', vertex.pinned);
    console.log('Index:', vertex.idx);
    
    // Find connected springs
    const connectedSprings = this.springs.filter(spring => 
      spring.a === selectedVertex || spring.b === selectedVertex
    );
    console.log('Connected Springs:', connectedSprings.length);
    console.log('Spring Details:', connectedSprings);
    
    console.log('For all vertex data, use "Dump All" button instead.');
  }

  private analyzeGeometry(): void {
    // Compute geometry statistics
    this.clothGeo.computeBoundingBox();
    this.clothGeo.computeBoundingSphere();
    
    const bbox = this.clothGeo.boundingBox!;
    const triangleCount = this.clothGeo.index ? this.clothGeo.index.count / 3 : 0;
    
    console.log('=== Geometry Analysis ===');
    console.log('Bounding Box:', bbox);
    console.log('Bounding Sphere:', this.clothGeo.boundingSphere);
    console.log('Vertex Count:', this.clothGeo.attributes.position.count);
    console.log('Triangle Count:', triangleCount);
    console.log('Spring Count:', this.springs.length);
  }

  private checkGeometryIssues(): void {
    let nanCount = 0;
    let infiniteCount = 0;
    let maxVelocity = 0;
    let unstableSprings = 0;
    
    // Check for NaN/infinite vertices
    for (const particle of this.particles) {
      if (isNaN(particle.pos.x) || isNaN(particle.pos.y) || isNaN(particle.pos.z)) {
        nanCount++;
      }
      if (!isFinite(particle.pos.x) || !isFinite(particle.pos.y) || !isFinite(particle.pos.z)) {
        infiniteCount++;
      }
      
      // Check velocity magnitude
      const velocity = new THREE.Vector3().subVectors(particle.pos, particle.prev);
      maxVelocity = Math.max(maxVelocity, velocity.length());
    }
    
    // Check for overstretched springs
    for (const spring of this.springs) {
      const particleA = this.particles[spring.a];
      const particleB = this.particles[spring.b];
      const currentLength = particleA.pos.distanceTo(particleB.pos);
      const stretchRatio = currentLength / spring.rest;
      
      if (stretchRatio > 2.0) { // More than 200% stretched
        unstableSprings++;
      }
    }
    
    console.log('=== Geometry Issues Check ===');
    console.log('NaN vertices:', nanCount);
    console.log('Infinite vertices:', infiniteCount);
    console.log('Max velocity:', maxVelocity.toFixed(4));
    console.log('Overstretched springs:', unstableSprings);
    
    if (nanCount === 0 && infiniteCount === 0 && unstableSprings === 0) {
      console.log('✅ No geometry issues detected');
    } else {
      console.warn('⚠️ Geometry issues detected!');
    }
  }

  private checkForNaNAndPause(): boolean {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      if (isNaN(particle.pos.x) || isNaN(particle.pos.y) || isNaN(particle.pos.z) ||
          isNaN(particle.prev.x) || isNaN(particle.prev.y) || isNaN(particle.prev.z) ||
          isNaN(particle.acc.x) || isNaN(particle.acc.y) || isNaN(particle.acc.z)) {
        
        console.error(`🛑 SIMULATION PAUSED: NaN detected in particle ${i}:`, {
          idx: particle.idx,
          pos: { x: particle.pos.x, y: particle.pos.y, z: particle.pos.z },
          prev: { x: particle.prev.x, y: particle.prev.y, z: particle.prev.z },
          acc: { x: particle.acc.x, y: particle.acc.y, z: particle.acc.z },
          pinned: particle.pinned
        });
        
        this.simulationPaused = true;
        
        // Update UI to show paused state
        if (this.pane && (this.pane as any).params) {
          (this.pane as any).params.paused = true;
        }
        
        return true; // NaN found
      }
    }
    return false; // No NaN found
  }

  private resetSimulation(): void {
    console.log("🔄 Resetting simulation...");
    
    // Clear existing particles and springs
    this.particles = [];
    this.springs = [];
    
    // Remove existing particle sprites
    for (const particleSphere of this.particleSpheres) {
      this.scene.remove(particleSphere.mesh);
      if (particleSphere.mesh.material) {
        (particleSphere.mesh.material as THREE.Material).dispose();
      }
    }
    this.particleSpheres = [];
    
    // Recreate cloth with new parameters
    this.createCloth();
    
    // Recreate cloth mesh geometry with new dimensions
    if (this.clothMesh) {
      this.scene.remove(this.clothMesh);
      this.clothGeo.dispose();
      this.createClothMesh();
    }
    
    // Recreate debug sprites with new particle count
    this.createDebugSpheres();
    
    // Resume simulation
    this.simulationPaused = false;
    
    // Update UI
    if (this.pane && (this.pane as any).params) {
      (this.pane as any).params.paused = false;
      (this.pane as any).params.particles = this.particles.length;
      (this.pane as any).params.springs = this.springs.length;
    }
    
    // Update geometry inspector
    if (this.vertexSelector) {
      // Update info in the table
      this.updateGeometryTableData(0);
    }
    
    console.log(`✅ Simulation reset complete - New dimensions: ${this.clothW}x${this.clothH}, spacing: ${this.spacing}`);
  }

  private updateSphereGeometry(): void {
    if (this.sphere) {
      // Remove old sphere
      this.scene.remove(this.sphere);
      this.sphere.geometry.dispose();
      
      // Create new sphere with updated radius
      this.sphere = new THREE.Mesh(
        new THREE.SphereGeometry(this.sphereRadius, 32, 24),
        this.sphere.material
      );
      this.sphere.position.set(0, -0.5, 0);
      this.scene.add(this.sphere);
    }
  }

  private createGeometryTable(container: HTMLElement): void {
    // Find or create a container below the cloth demo
    let tableContainer = document.getElementById('geometry-table-container');
    if (!tableContainer) {
      tableContainer = document.createElement('div');
      tableContainer.id = 'geometry-table-container';
      tableContainer.style.cssText = `
        background: rgba(0, 0, 0, 0.9); 
        padding: 15px; 
        border-radius: 8px; 
        border: 1px solid #444;
        max-height: 300px;
        overflow: auto;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #ddd;
        margin-top: 10px;
        width: 100%;
      `;
      
      // Insert after the cloth demo container
      const clothDemoContainer = document.getElementById('cloth-demo-container');
      if (clothDemoContainer && clothDemoContainer.parentNode) {
        clothDemoContainer.parentNode.insertBefore(tableContainer, clothDemoContainer.nextSibling);
      } else {
        // Fallback: append to document body
        document.body.appendChild(tableContainer);
      }
    }
    // Add title and info
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
    
    const title = document.createElement('h3');
    title.textContent = 'Geometry Inspector';
    title.style.cssText = 'margin: 0; color: #fff; font-size: 14px;';
    
    const infoSpan = document.createElement('span');
    infoSpan.style.cssText = 'color: #aaa; font-size: 11px;';
    infoSpan.textContent = `${this.particles.length} vertices`;
    
    // Add update status info
    const updateInfo = document.createElement('span');
    updateInfo.style.cssText = 'color: #888; font-size: 10px; margin-left: 10px;';
    updateInfo.textContent = 'Last update: 0ms';
    updateInfo.id = 'geometry-update-info';
    
    headerDiv.appendChild(title);
    headerDiv.appendChild(infoSpan);
    headerDiv.appendChild(updateInfo);
    tableContainer.appendChild(headerDiv);
    
    // Create controls row
    const controlsRow = document.createElement('div');
    controlsRow.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center; gap: 10px;';
    
    // Auto-update toggle
    const autoUpdateLabel = document.createElement('label');
    autoUpdateLabel.textContent = 'Auto-update: ';
    autoUpdateLabel.style.color = '#aaa';
    
    const autoUpdateCheckbox = document.createElement('input');
    autoUpdateCheckbox.type = 'checkbox';
    autoUpdateCheckbox.checked = this.geometryTableEnabled;
    autoUpdateCheckbox.style.cssText = 'margin-right: 10px;';
    
    // Show range selector for large datasets
    const showRangeLabel = document.createElement('label');
    showRangeLabel.textContent = 'Show: ';
    showRangeLabel.style.color = '#aaa';
    
    const showRangeSelect = document.createElement('select');
    showRangeSelect.style.cssText = 'padding: 2px; background: #333; color: #fff; border: 1px solid #555;';
    showRangeSelect.innerHTML = `
      <option value="all">All Vertices</option>
      <option value="first50">First 50</option>
      <option value="first100">First 100</option>
      <option value="pinned">Pinned Only</option>
      <option value="free">Free Only</option>
    `;
    
    // Utility buttons
    const dumpButton = document.createElement('button');
    dumpButton.textContent = 'Dump Example';
    dumpButton.style.cssText = 'padding: 4px 8px; background: #444; color: #fff; border: 1px solid #666; cursor: pointer;';
    
    const dumpAllButton = document.createElement('button');
    dumpAllButton.textContent = 'Dump All';
    dumpAllButton.style.cssText = 'padding: 4px 8px; background: #444; color: #fff; border: 1px solid #666; cursor: pointer;';
    
    const manualUpdateButton = document.createElement('button');
    manualUpdateButton.textContent = 'Manual Update';
    manualUpdateButton.style.cssText = 'padding: 4px 8px; background: #004400; color: #fff; border: 1px solid #666; cursor: pointer;';
    
    const analyzeButton = document.createElement('button');
    analyzeButton.textContent = 'Analyze';
    analyzeButton.style.cssText = 'padding: 4px 8px; background: #444; color: #fff; border: 1px solid #666; cursor: pointer;';
    
    const checkButton = document.createElement('button');
    checkButton.textContent = 'Check Issues';
    checkButton.style.cssText = 'padding: 4px 8px; background: #444; color: #fff; border: 1px solid #666; cursor: pointer;';
    
    controlsRow.appendChild(autoUpdateLabel);
    controlsRow.appendChild(autoUpdateCheckbox);
    controlsRow.appendChild(showRangeLabel);
    controlsRow.appendChild(showRangeSelect);
    controlsRow.appendChild(dumpButton);
    controlsRow.appendChild(dumpAllButton);
    controlsRow.appendChild(manualUpdateButton);
    controlsRow.appendChild(analyzeButton);
    controlsRow.appendChild(checkButton);
    tableContainer.appendChild(controlsRow);
    
    // Create the data table
    this.geometryTable = document.createElement('table');
    this.geometryTable.style.cssText = `
      width: 100%; 
      border-collapse: collapse; 
      background: rgba(0, 0, 0, 0.5);
      font-size: 10px;
    `;
    
    // Create table header with all vertex attributes
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = [
      'ID', 'Px', 'Py', 'Pz', 'PrevX', 'PrevY', 'PrevZ', 
      'AccX', 'AccY', 'AccZ', 'Mass', 'Pinned', 'Velocity'
    ];
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.cssText = 'padding: 3px 5px; border: 1px solid #555; background: #333; color: #fff; text-align: center; font-size: 10px; white-space: nowrap;';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    this.geometryTable.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    this.geometryTable.appendChild(tbody);
    
    tableContainer.appendChild(this.geometryTable);
    
    // Store reference to selector for updates
    this.vertexSelector = showRangeSelect as any; // Reuse the property for the range selector
    
    // Add event listeners
    autoUpdateCheckbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.geometryTableEnabled = target.checked;
      manualUpdateButton.style.display = target.checked ? 'none' : 'inline-block';
      console.log(`Geometry table auto-update: ${target.checked ? 'enabled' : 'disabled'}`);
    });
    
    showRangeSelect.addEventListener('change', () => {
      this.updateGeometryTableData(0); // Parameter not used in new version
    });
    
    manualUpdateButton.addEventListener('click', () => {
      this.updateGeometryTableData(0);
    });
    
    dumpButton.addEventListener('click', () => {
      this.dumpVertexData();
    });
    
    dumpAllButton.addEventListener('click', () => {
      this.dumpAllVertexData();
    });
    
    analyzeButton.addEventListener('click', () => {
      this.analyzeGeometry();
    });
    
    checkButton.addEventListener('click', () => {
      this.checkGeometryIssues();
    });
    
    // Initialize table
    this.updateGeometryTableData(0);
  }

  private updateGeometryTableData(vertexIndex: number): void {
    if (!this.geometryTable) {
      return;
    }
    
    // Start timing the update
    const startTime = performance.now();
    
    // Get the range selector (reusing vertexSelector property)
    const rangeSelector = this.vertexSelector as any as HTMLSelectElement;
    const showRange = rangeSelector?.value || 'all';
    
    // Determine which particles to show
    let particlesToShow: Particle[] = [];
    switch (showRange) {
      case 'first50':
        particlesToShow = this.particles.slice(0, 50);
        break;
      case 'first100':
        particlesToShow = this.particles.slice(0, 100);
        break;
      case 'pinned':
        particlesToShow = this.particles.filter(p => p.pinned);
        break;
      case 'free':
        particlesToShow = this.particles.filter(p => !p.pinned);
        break;
      case 'all':
      default:
        particlesToShow = this.particles;
        break;
    }
    
    // Update table body with all vertices
    const tbody = this.geometryTable.querySelector('tbody')!;
    tbody.innerHTML = '';
    
    particlesToShow.forEach((particle, displayIndex) => {
      const velocity = new THREE.Vector3().subVectors(particle.pos, particle.prev);
      const row = document.createElement('tr');
      
      // Add alternating row colors for better readability
      if (displayIndex % 2 === 0) {
        row.style.background = 'rgba(255, 255, 255, 0.05)';
      }
      
      // Highlight pinned particles
      if (particle.pinned) {
        row.style.background = 'rgba(255, 100, 100, 0.15)';
      }
      
      const data = [
        particle.idx.toString(),
        particle.pos.x.toFixed(3),
        particle.pos.y.toFixed(3),
        particle.pos.z.toFixed(3),
        particle.prev.x.toFixed(3),
        particle.prev.y.toFixed(3),
        particle.prev.z.toFixed(3),
        particle.acc.x.toFixed(4),
        particle.acc.y.toFixed(4),
        particle.acc.z.toFixed(4),
        particle.mass.toFixed(3),
        particle.pinned ? 'Y' : 'N',
        velocity.length().toFixed(3)
      ];
      
      data.forEach((value, colIndex) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        cell.style.cssText = 'padding: 2px 4px; border: 1px solid #555; text-align: center; font-size: 10px; white-space: nowrap;';
        
        // Color-code certain columns
        if (colIndex === 0) { // ID column
          cell.style.background = '#2a2a2a';
          cell.style.color = '#ccc';
        } else if (colIndex >= 1 && colIndex <= 3) { // Position columns
          cell.style.color = '#88ff88';
        } else if (colIndex >= 4 && colIndex <= 6) { // Previous position columns
          cell.style.color = '#ffaa88';
        } else if (colIndex >= 7 && colIndex <= 9) { // Acceleration columns
          cell.style.color = '#8888ff';
        } else if (colIndex === 11) { // Pinned column
          cell.style.color = particle.pinned ? '#ff6666' : '#66ff66';
          cell.style.fontWeight = 'bold';
        } else if (colIndex === 12) { // Velocity column
          const vel = parseFloat(value);
          if (vel > 1.0) {
            cell.style.color = '#ff6666'; // High velocity warning
            cell.style.fontWeight = 'bold';
          } else {
            cell.style.color = '#66ffff';
          }
        }
        
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    // Update info span
    const infoSpan = this.geometryTable.closest('div')?.querySelector('span');
    if (infoSpan) {
      infoSpan.textContent = `Showing ${particlesToShow.length} of ${this.particles.length} vertices`;
    }
    
    // End timing and update timing display
    const endTime = performance.now();
    const updateDuration = endTime - startTime;
    this.lastUpdateTime = updateDuration;
    
    const updateInfo = document.getElementById('geometry-update-info');
    if (updateInfo) {
      updateInfo.textContent = `Last update: ${updateDuration.toFixed(1)}ms`;
      // Color-code based on performance
      if (updateDuration > 10) {
        updateInfo.style.color = '#ff6666'; // Red for slow updates
      } else if (updateDuration > 5) {
        updateInfo.style.color = '#ffaa66'; // Orange for moderate updates
      } else {
        updateInfo.style.color = '#66ff66'; // Green for fast updates
      }
    }
  }

  private dumpAllVertexData(): void {
    console.log(`=== All Vertex Data Dump (${this.particles.length} particles) ===`);
    
    // Create a summary table
    const summary = {
      totalParticles: this.particles.length,
      pinnedParticles: this.particles.filter(p => p.pinned).length,
      freeParticles: this.particles.filter(p => !p.pinned).length,
      nanParticles: this.particles.filter(p => 
        isNaN(p.pos.x) || isNaN(p.pos.y) || isNaN(p.pos.z) ||
        isNaN(p.prev.x) || isNaN(p.prev.y) || isNaN(p.prev.z)
      ).length,
      maxVelocity: Math.max(...this.particles.map(p => {
        const vel = new THREE.Vector3().subVectors(p.pos, p.prev);
        return vel.length();
      })),
      avgMass: this.particles.reduce((sum, p) => sum + p.mass, 0) / this.particles.length
    };
    
    console.log('Summary:', summary);
    
    // Dump first 10 particles as examples
    console.log('\nFirst 10 particles:');
    this.particles.slice(0, 10).forEach((particle, index) => {
      const velocity = new THREE.Vector3().subVectors(particle.pos, particle.prev);
      console.log(`[${particle.idx}] pos:(${particle.pos.x.toFixed(3)}, ${particle.pos.y.toFixed(3)}, ${particle.pos.z.toFixed(3)}) vel:${velocity.length().toFixed(3)} pinned:${particle.pinned}`);
    });
    
    // Full data available in console
    console.log('\nFull particle array available as:', this.particles);
    
    // Export to downloadable JSON (if running in browser)
    if (typeof window !== 'undefined') {
      const dataStr = JSON.stringify(this.particles.map(p => ({
        id: p.idx,
        position: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
        previous: { x: p.prev.x, y: p.prev.y, z: p.prev.z },
        acceleration: { x: p.acc.x, y: p.acc.y, z: p.acc.z },
        mass: p.mass,
        pinned: p.pinned
      })), null, 2);
      
      console.log('To download as JSON, run: window.downloadVertexData()');
      (window as any).downloadVertexData = () => {
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cloth-vertex-data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
    }
  }

  private createInteractionGizmo(): void {
    // Create a group to hold all gizmo elements
    this.interactionGizmo = new THREE.Group();
    
    // 1. Target sphere - shows where force will be applied
    const targetGeometry = new THREE.SphereGeometry(0.02, 16, 12);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.8
    });
    this.targetSphere = new THREE.Mesh(targetGeometry, targetMaterial);
    this.interactionGizmo.add(this.targetSphere);
    
    // 2. Force direction arrow
    const arrowLength = 0.3;
    const arrowGeometry = new THREE.ConeGeometry(0.015, 0.06, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    this.directionArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.interactionGizmo.add(this.directionArrow);
    
    // 3. Force magnitude indicator (cylinder that extends based on force)
    const cylinderGeometry = new THREE.CylinderGeometry(0.005, 0.005, arrowLength, 8);
    const cylinderMaterial = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    this.forceIndicator = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    this.interactionGizmo.add(this.forceIndicator);
    
    // Initially hidden
    this.interactionGizmo.visible = false;
    this.scene.add(this.interactionGizmo);
  }

  private updateInteractionGizmo(position: THREE.Vector3, forceDirection: THREE.Vector3): void {
    if (!this.interactionGizmo || !this.targetSphere || !this.directionArrow || !this.forceIndicator) {
      return;
    }
    
    // Position the target sphere at the particle location
    this.targetSphere.position.copy(position);
    
    // Calculate force magnitude and direction
    const forceMagnitude = forceDirection.length();
    const maxForceDisplay = 2.0; // Maximum force for display scaling
    const normalizedMagnitude = Math.min(forceMagnitude / maxForceDisplay, 1.0);
    
    if (forceMagnitude > 0.001) {
      const normalizedDirection = forceDirection.clone().normalize();
      
      // Position and orient the arrow
      const arrowLength = 0.1 + normalizedMagnitude * 0.4; // Scale arrow length with force
      const arrowPosition = position.clone().add(normalizedDirection.clone().multiplyScalar(arrowLength / 2));
      
      this.directionArrow.position.copy(arrowPosition);
      this.directionArrow.lookAt(position.clone().add(normalizedDirection));
      this.directionArrow.rotateX(Math.PI / 2); // Adjust for cone orientation
      
      // Scale arrow based on force magnitude
      const arrowScale = 0.5 + normalizedMagnitude * 1.5;
      this.directionArrow.scale.setScalar(arrowScale);
      
      // Update force indicator (cylinder showing force direction)
      this.forceIndicator.position.copy(position.clone().add(normalizedDirection.clone().multiplyScalar(arrowLength / 4)));
      this.forceIndicator.lookAt(position.clone().add(normalizedDirection));
      this.forceIndicator.rotateX(Math.PI / 2);
      
      // Scale cylinder length and thickness based on force
      this.forceIndicator.scale.set(
        1 + normalizedMagnitude * 2, // Thickness
        arrowLength / 0.3, // Length (relative to original cylinder height)
        1 + normalizedMagnitude * 2  // Thickness
      );
      
      // Color-code based on force magnitude
      const forceColor = new THREE.Color().lerpColors(
        new THREE.Color(0x44ff44), // Green for low force
        new THREE.Color(0xff4444), // Red for high force
        normalizedMagnitude
      );
      
      (this.directionArrow.material as THREE.MeshBasicMaterial).color = forceColor;
      (this.forceIndicator.material as THREE.MeshBasicMaterial).color = forceColor;
      
      // Show direction elements
      this.directionArrow.visible = true;
      this.forceIndicator.visible = true;
    } else {
      // Hide direction elements when no force
      this.directionArrow.visible = false;
      this.forceIndicator.visible = false;
    }
    
    // Animate target sphere
    const time = Date.now() * 0.005;
    this.targetSphere.scale.setScalar(1 + Math.sin(time) * 0.2);
  }
}

// Initialize demo when DOM is loaded
export function initThreeClothDemo(): void {
  // Find the cloth demo container in the page
  const targetContainer = document.getElementById('cloth-demo-container');
  if (!targetContainer) {
    console.error('Cloth demo container not found');
    return;
  }
  
  // Create container with info panel
  const container = document.createElement('div');
  container.style.cssText = 'margin:0; overflow:hidden; background:#111; color:#ddd; font-family: sans-serif; position: relative; width: 100%; height: 80vh; border-radius: 8px;';
  
  const info = document.createElement('div');
  info.style.cssText = 'position: absolute; left: 10px; top: 10px; width: 320px; z-index: 10;';
  info.innerHTML = `
    <div><strong>Interactive Cloth Simulation</strong></div>
    <div>Drag cloth vertices with mouse. Use controls to adjust simulation.</div>
  `;
  
  container.appendChild(info);
  targetContainer.appendChild(container);
  
  // Initialize demo
  const demo = new ThreeClothDemo(container);
  
  // Handle container resize for the cloth demo specifically
  const resizeObserver = new ResizeObserver(() => {
    const rect = container.getBoundingClientRect();
    demo.onResize(rect.width, rect.height);
  });
  resizeObserver.observe(container);
}

// Auto-initialize if this script is loaded directly in browser
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThreeClothDemo);
} else if (typeof window !== 'undefined') {
  initThreeClothDemo();
}
