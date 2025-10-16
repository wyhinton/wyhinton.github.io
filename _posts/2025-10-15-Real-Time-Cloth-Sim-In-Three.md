<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Three.js Cloth + Cubic Barrier Demo</title>
  <style>
    body { margin:0; overflow:hidden; background:#111; color:#ddd; font-family: sans-serif; }
    #info { position: absolute; left: 10px; top: 10px; width: 320px; z-index:10; }
    button { margin-top:6px; }
  </style>
</head>
<body>
<div id="info">
  <div><strong>Cubic Barrier + Elasticity-Inclusive Stiffness (simplified)</strong></div>
  <div>Drag cloth vertices with mouse. Toggle gravity / wireframe.</div>
  <div style="margin-top:6px;">
    <button id="toggleGravity">Toggle Gravity</button>
    <button id="toggleWire">Toggle Wireframe</button>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.min.js"></script>
<script>

// ----------------- Scene / gfx -----------------
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth/window.innerHeight, 0.1, 200);
camera.position.set(0, 3, 8);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Light
scene.add(new THREE.AmbientLight(0x888888));
const d = new THREE.DirectionalLight(0xffffff, 0.9);
d.position.set(5,10,7);
scene.add(d);

// sphere obstacle
const sphereRadius = 1.0;
const sphereMat = new THREE.MeshStandardMaterial({color:0x2266bb, metalness:0.3, roughness:0.6});
const sphere = new THREE.Mesh(new THREE.SphereGeometry(sphereRadius, 32, 24), sphereMat);
sphere.position.set(0, -0.5, 0);
scene.add(sphere);

// ----------------- Cloth physics (mass-spring) -----------------
const clothW = 24;
const clothH = 16;
const spacing = 0.14;
const gravityOn = {val: true};
const restSpacing = spacing;

const particles = []; // { pos, prev, acc, mass, pinned, idx }
const springs = []; // {a,b, rest, k}

// create grid
for (let y=0;y<clothH;y++){
  for (let x=0;x<clothW;x++){
    const idx = y*clothW + x;
    const px = (x - (clothW-1)/2) * spacing;
    const py = 2.0 + (clothH-1 - y) * spacing; // top down
    const pz = 0;
    const mass = 0.08;
    particles.push({
      pos: new THREE.Vector3(px, py, pz),
      prev: new THREE.Vector3(px, py, pz),
      acc: new THREE.Vector3(),
      mass,
      pinned: (y===0 && (x%4===0)), // pin some top vertices
      idx
    });
  }
}
function idx(x,y){ return y*clothW + x; }

// structural springs (grid)
const K_STRUCT = 8000; // spring stiffness (N/m)
for (let y=0;y<clothH;y++){
  for (let x=0;x<clothW;x++){
    if (x<clothW-1) addSpring(idx(x,y), idx(x+1,y), restSpacing, K_STRUCT);
    if (y<clothH-1) addSpring(idx(x,y), idx(x,y+1), restSpacing, K_STRUCT);
    // shear
    if (x<clothW-1 && y<clothH-1) addSpring(idx(x,y), idx(x+1,y+1), Math.sqrt(2)*restSpacing, K_STRUCT*0.8);
    if (x>0 && y<clothH-1) addSpring(idx(x,y), idx(x-1,y+1), Math.sqrt(2)*restSpacing, K_STRUCT*0.8);
    // bend (longer) springs
    if (x<clothW-2) addSpring(idx(x,y), idx(x+2,y), restSpacing*2, K_STRUCT*0.25);
    if (y<clothH-2) addSpring(idx(x,y), idx(x,y+2), restSpacing*2, K_STRUCT*0.25);
  }
}
function addSpring(a,b,rest,k){ springs.push({a,b,rest,k}); }

// cloth mesh visual
const clothGeo = new THREE.ParametricGeometry((u,v, target)=>{
  // placeholder - we will update geometry from particles
  target.set(0,0,0);
}, clothW-1, clothH-1);
const clothMat = new THREE.MeshStandardMaterial({color:0xffaa77, side: THREE.DoubleSide, metalness:0.2, roughness:0.6});
clothMat.wireframe = false;
const clothMesh = new THREE.Mesh(clothGeo, clothMat);
scene.add(clothMesh);

// helper: update geometry vertices from particles
function updateClothGeometry(){
  const pos = clothGeo.attributes.position.array;
  let k = 0;
  for (let y=0;y<clothH-1;y++){
    for (let x=0;x<clothW-1;x++){
      // parametric geometry ordering is u-major; use particle positions of the corners of each quad's lower-left
      const p = particles[idx(x,y)];
      pos[k++] = p.pos.x;
      pos[k++] = p.pos.y;
      pos[k++] = p.pos.z;
    }
  }
  clothGeo.attributes.position.needsUpdate = true;
  clothGeo.computeVertexNormals();
}

// ----------------- Mouse interaction (drag nearest particle) -----------------
let ray = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let dragging = null;
renderer.domElement.addEventListener('pointerdown', (e)=>{
  mouse.x = (e.clientX / window.innerWidth)*2 -1;
  mouse.y = -(e.clientY / window.innerHeight)*2 +1;
  ray.setFromCamera(mouse, camera);
  // find nearest particle within threshold
  let best = null; let bestd = 0.12;
  for (const p of particles){
    const world = p.pos;
    const dist = ray.ray.distanceToPoint(world);
    if (dist < bestd){ best = p; bestd = dist; }
  }
  if (best){
    dragging = best;
  }
});
renderer.domElement.addEventListener('pointerup', ()=>{ dragging = null; });
renderer.domElement.addEventListener('pointermove', (e)=>{
  if (!dragging) return;
  mouse.x = (e.clientX / window.innerWidth)*2 -1;
  mouse.y = -(e.clientY / window.innerHeight)*2 +1;
  ray.setFromCamera(mouse, camera);
  // project onto plane near camera for positioning
  const targetPos = ray.ray.at(6, new THREE.Vector3());
  // pull particle toward target by setting its position (simple)
  dragging.pos.copy(targetPos);
});

// ----------------- Physics step -----------------
const dt = 1/60;
const damping = 0.995;
const gravity = new THREE.Vector3(0, -9.81, 0);

function physicsStep(){
  // Reset accelerations
  for (const p of particles) p.acc.set(0,0,0);

  // gravity
  for (const p of particles){
    if (!p.pinned && gravityOn.val) p.acc.addScaledVector(gravity, 1);
  }

  // spring forces (Hooke)
  for (const s of springs){
    const A = particles[s.a];
    const B = particles[s.b];
    const dir = new THREE.Vector3().subVectors(B.pos, A.pos);
    const len = dir.length() || 1e-8;
    dir.multiplyScalar(1/len);
    const stretch = len - s.rest;
    // apply equal/opposite forces
    const fmag = s.k * stretch;
    const f = dir.clone().multiplyScalar(fmag);
    if (!A.pinned) A.acc.addScaledVector(f, 1/A.mass);
    if (!B.pinned) B.acc.addScaledVector(f, -1/B.mass);
  }

  // Contacts: sphere + cubic barrier
  // paper: psi_weak => force magnitude f_g = (2 κ / g_max) * (g_max - g)^2  for g <= g_max
  // stiffness κ ≈ m / g^2 + n·(H n). we approximate n·(H n) with average local spring stiffness of connected springs.
  const contactGapMax = 0.02; // g_max: zone where barrier acts
  for (const p of particles){
    // compute signed gap = distance from sphere surface (positive outside)
    const toP = new THREE.Vector3().subVectors(p.pos, sphere.position);
    const dist = toP.length();
    const g = dist - sphereRadius; // gap
    if (g <= contactGapMax){
      // unit normal outward from sphere
      const n = toP.clone().normalize();
      // approximate local elasticity projection as average spring stiffness magnitude around this particle
      let localK = 0; let count = 0;
      for (const s of springs){
        if (s.a === p.idx || s.b === p.idx){
          localK += s.k;
          count++;
        }
      }
      if (count > 0) localK /= count;
      // compute kappa (avoid tiny g)
      const gm = Math.max(g, 1e-6);
      const kappa = p.mass / (gm*gm) + localK * 1e-4; // scale localK down so it doesn't dominate
      // force magnitude (derived from dψ/dg)
      const fg = (2 * kappa / contactGapMax) * Math.pow(Math.max(contactGapMax - g,0), 2);
      const f = n.clone().multiplyScalar(-fg); // negative: pushes outward (n points from sphere center)
      if (!p.pinned) p.acc.addScaledVector(f, 1/p.mass);
      // simple positional correction to avoid tunneling
      const penetration = Math.max(0, sphereRadius - dist + 1e-6);
      if (penetration > 1e-5 && !p.pinned){
        p.pos.add(n.clone().multiplyScalar(penetration + 1e-5));
      }
    }
  }

  // integrate (semi-implicit-ish)
  for (const p of particles){
    if (p.pinned) { p.prev.copy(p.pos); continue; }
    // velocity estimate
    const vel = new THREE.Vector3().subVectors(p.pos, p.prev).multiplyScalar(damping);
    // semi-implicit Euler: v += a * dt ; x += v * dt
    vel.addScaledVector(p.acc, dt);
    const newPos = p.pos.clone().addScaledVector(vel, dt);
    p.prev.copy(p.pos);
    p.pos.copy(newPos);
  }
}

// ----------------- Visual helpers -----------------
const particleSpheres = [];
for (let i=0;i<particles.length;i+= Math.floor(particles.length/200)+1){
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.02,8,8), new THREE.MeshStandardMaterial({color:0xff3333}));
  scene.add(s);
  particleSpheres.push({mesh:s, idx:i});
}

// ----------------- Animation loop -----------------
let wire = false;
function animate(){
  requestAnimationFrame(animate);
  // run some physics substeps per render to stabilize
  for (let i=0;i<2;i++) physicsStep();
  updateClothGeometry();
  // update particle spheres for debugging
  for (const ps of particleSpheres){
    ps.mesh.position.copy(particles[ps.idx].pos);
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ----------------- UI -----------------
document.getElementById('toggleWire').addEventListener('click', ()=>{
  wire = !wire; clothMat.wireframe = wire;
});
document.getElementById('toggleGravity').addEventListener('click', ()=>{
  gravityOn.val = !gravityOn.val;
});

// resize
window.addEventListener('resize', ()=>{ renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); });

</script>
</body>
</html>
