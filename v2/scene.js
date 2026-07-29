/* ============================================================
   BLOCS-ME — hero 3D scene
   An instanced "block city": a grid of construction blocks that
   breathes in waves, with mouse parallax + scroll pull-back.
   ============================================================ */
import * as THREE from "three";

const canvas = document.getElementById("scene");
if (canvas) init(canvas);

function init(canvas, opts = {}) {
  const { parallax = true } = opts;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.innerWidth < 768;

  /* ---------- Renderer (bail out gracefully if WebGL fails) ---------- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (e) {
    canvas.style.display = "none"; // CSS gradient fallback stays visible
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* ---------- Scene & camera ---------- */
  const BG = 0x0f0c09;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 16, 46);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);
  const camBase = new THREE.Vector3(13, 10.5, 13);
  camera.position.copy(camBase);

  const lookTarget = new THREE.Vector3(0, 1.2, 0);
  camera.lookAt(lookTarget);

  /* ---------- Lights ---------- */
  scene.add(new THREE.AmbientLight(0x8f8577, 0.6));

  const key = new THREE.DirectionalLight(0xf7f1e8, 1.5);
  key.position.set(8, 14, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x4a4a45, 0.8);
  rim.position.set(-10, 6, -8);
  scene.add(rim);

  const glow = new THREE.PointLight(0xf9b233, 70, 26, 1.8);
  glow.position.set(0, 6, 0);
  scene.add(glow);

  /* ---------- Block city (InstancedMesh) ---------- */
  const COLS = isMobile ? 20 : 30;
  const ROWS = isMobile ? 20 : 30;
  const GAP = 1.12;
  const COUNT = COLS * ROWS;

  const geo = new THREE.BoxGeometry(0.72, 1, 0.72);
  geo.translate(0, 0.5, 0); // pivot at base → scale grows upward

  const mat = new THREE.MeshLambertMaterial();
  const city = new THREE.InstancedMesh(geo, mat, COUNT);
  city.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const group = new THREE.Group();
  group.add(city);
  scene.add(group);

  // color palette: mostly dark concrete tones, a few brand-yellow blocks
  const palette = [
    new THREE.Color(0x241e16),
    new THREE.Color(0x302820),
    new THREE.Color(0x3d342a),
    new THREE.Color(0x4e463c),
  ];
  const accent = new THREE.Color(0xf87a1e);

  const dummy = new THREE.Object3D();
  const cells = []; // per-instance data

  // deterministic pseudo-random so the skyline is stable
  const rand = (seed) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let idx = 0;
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const x = (i - (COLS - 1) / 2) * GAP;
      const z = (j - (ROWS - 1) / 2) * GAP;

      // taller "downtown" cluster off-centre, falling off toward edges
      const d = Math.hypot(x - 3.5, z + 2.5);
      const falloff = Math.max(0, 1 - d / 16);
      const r = rand(idx + 1);
      const base = 0.25 + r * r * 4.5 * (0.35 + falloff);

      const isAccent = r > 0.93;
      city.setColorAt(idx, isAccent ? accent : palette[Math.floor(rand(idx * 2 + 7) * palette.length)]);

      cells.push({
        x, z, base,
        phase: rand(idx * 3 + 13) * Math.PI * 2,
        speed: 0.4 + rand(idx * 5 + 29) * 0.5,
      });
      idx++;
    }
  }
  if (city.instanceColor) city.instanceColor.needsUpdate = true;

  /* ---------- Ground plane (subtle, catches the glow) ---------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshLambertMaterial({ color: 0x14100c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  group.add(ground);

  /* ---------- Interaction state ---------- */
  const mouse = { x: 0, y: 0 };
  const smooth = { x: 0, y: 0 };

  if (window.matchMedia("(pointer: fine)").matches && !prefersReduced) {
    window.addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- Resize ---------- */
  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (prefersReduced) renderFrame(0);
  }
  window.addEventListener("resize", resize);

  /* ---------- Frame ---------- */
  const clock = new THREE.Clock();

  function renderFrame(t) {
    // wave through the skyline
    for (let k = 0; k < COUNT; k++) {
      const c = cells[k];
      const wave = Math.sin(t * c.speed + c.phase + (c.x * 0.32 + c.z * 0.26));
      const h = Math.max(0.12, c.base * (0.82 + 0.18 * wave));
      dummy.position.set(c.x, 0, c.z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      city.setMatrixAt(k, dummy.matrix);
    }
    city.instanceMatrix.needsUpdate = true;

    // slow rotation of the whole city
    group.rotation.y = t * 0.035;

    // brand glow drifting over the blocks
    glow.position.x = Math.sin(t * 0.3) * 6;
    glow.position.z = Math.cos(t * 0.22) * 6;
    glow.intensity = 62 + Math.sin(t * 1.4) * 16;

    // mouse parallax + scroll pull-back
    smooth.x += (mouse.x - smooth.x) * 0.04;
    smooth.y += (mouse.y - smooth.y) * 0.04;

    const scrollP = parallax ? Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1) : 0;

    camera.position.x = camBase.x + smooth.x * 1.6;
    camera.position.y = camBase.y - smooth.y * 1.0 + scrollP * 5.5;
    camera.position.z = camBase.z + scrollP * 3.5;
    camera.lookAt(lookTarget.x, lookTarget.y - scrollP * 1.5, lookTarget.z);

    renderer.render(scene, camera);
  }

  /* ---------- Loop control: pause offscreen / hidden tab ---------- */
  let running = false;
  let rafId = 0;

  function loop() {
    renderFrame(clock.getElapsedTime());
    if (running) rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running || prefersReduced) return;
    running = true;
    clock.start();
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  const watch = canvas.closest("section, footer") || canvas.parentElement;
  if (watch && "IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0.02 }
    ).observe(watch);
  } else {
    start();
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!watch) start();
    else {
      const r = watch.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) start();
    }
  });

  resize();
  if (prefersReduced) renderFrame(0); // single static frame
}
