/* ============================================================
   Peak & Pan — the globe
   Earth. It was an invented planet until the story changed: Glorb
   wants to eat his way through THIS world, so the markers are real
   countries at real coordinates.

   Technique from `kevicebryan/pokemu`'s Atlas globe (vault note
   "How to Build an Interactive 3D Globe"): lat/lng → Vector3,
   emissive box markers floating just off the surface, timezone
   opening rotation, and the dot-product cull that stops labels
   showing through the planet.

   Textures are vendored in assets/ rather than fetched from a CDN —
   this has to work on a phone over local network with no internet.
   ============================================================ */

import * as THREE from "three";

const DAY_MAP = "assets/earth-day.jpg";
const BUMP_MAP = "assets/earth-topo.jpg";

/* ---------------- the one piece of maths ----------------
   The minus on x and the +180 on longitude are what align this with
   how an equirectangular texture wraps onto SphereGeometry. Get either
   wrong and every marker is mirrored but still looks plausible. */
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function mountPlanet(canvas, { chapters, onSelect, dark = true }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = dark ? 1.22 : 1.34;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 3);

  const world = new THREE.Group();
  scene.add(world);

  /* even, full-day lighting — a readable map, not a photograph */
  scene.add(new THREE.AmbientLight(0xffffff, 0.66));
  scene.add(new THREE.HemisphereLight(0xf0f7ff, 0x241a2c, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.05);
  key.position.set(3.1, 1.6, 2.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcdd8ff, 0.34);
  fill.position.set(-2.3, -0.6, -1.9);
  scene.add(fill);

  const loader = new THREE.TextureLoader();
  const dayTex = loader.load(DAY_MAP);
  const bumpTex = loader.load(BUMP_MAP);
  dayTex.colorSpace = THREE.SRGBColorSpace;   // without this the whole planet renders washed out
  dayTex.anisotropy = 8;
  bumpTex.anisotropy = 8;

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.995, 96, 96),
    new THREE.MeshStandardMaterial({ map: dayTex, bumpMap: bumpTex, bumpScale: 0.035, roughness: 0.62, metalness: 0 })
  );
  world.add(sphere);

  /* atmosphere — sells the silhouette on a dark page */
  world.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.07, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: { c: { value: new THREE.Color(0x6fa8ff) } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; uniform vec3 c;
        void main(){ float i = pow(0.66 - dot(vN, vec3(0.0,0.0,1.0)), 2.0); gl_FragColor = vec4(c, clamp(i,0.0,1.0) * 0.55); }`,
    })
  ));

  /* ---------------- markers ---------------- */
  const geo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
  let markers = [];

  function buildMarkers(list) {
    markers.forEach((m) => { world.remove(m); m.material.dispose(); });
    markers = list.map((c) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: c.unlocked ? c.color : 0x6E6A76,
        emissive: c.unlocked ? c.color : 0x000000,
        /* emissive carries the locked/unlocked state, so it has to vary —
           a fixed value blows every marker out to white under ACES */
        emissiveIntensity: c.cleared ? 0.85 : c.unlocked ? 0.45 : 0,
        roughness: 0.9, metalness: 0, flatShading: true,
      }));
      m.position.copy(latLngToVector3(c.lat, c.lng, 1.03));
      m.lookAt(0, 0, 0);
      m.userData = c;
      world.add(m);
      return m;
    });
  }
  buildMarkers(chapters);

  /* a pulsing ring under whichever country you're focused on */
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.068, 32),
    new THREE.MeshBasicMaterial({ color: 0xf9e95a, transparent: true, opacity: 0, side: THREE.DoubleSide })
  );
  world.add(ring);

  /* ---------------- interaction ---------------- */
  let spin = 0, tilt = 0, dragging = false, px = 0, py = 0, moved = 0, hovered = null;
  const baseY = Math.PI * ((new Date().getTimezoneOffset() || 0) / 720);
  const v = new THREE.Vector3();

  const screenOf = (mesh, rect) => {
    mesh.getWorldPosition(v);
    /* a DOM label has no depth buffer — without this a marker on the far
       side of the planet still answers the cursor */
    if (v.clone().normalize().dot(camera.position.clone().normalize()) < 0.1) return null;
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height };
  };

  function pick(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const mx = cx - rect.left, my = cy - rect.top;
    let best = null, bd = 32;
    for (const m of markers) {
      const s = screenOf(m, rect);
      if (!s) continue;
      const d = Math.hypot(s.x - mx, s.y - my);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; px = e.clientX; py = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging) {
      const dx = e.clientX - px, dy = e.clientY - py;
      moved += Math.hypot(dx, dy);
      spin += dx * 0.006;
      tilt = Math.max(-0.85, Math.min(0.85, tilt + dy * 0.005));
      px = e.clientX; py = e.clientY;
    }
    const hit = pick(e.clientX, e.clientY);
    if (hit !== hovered) {
      hovered = hit;
      canvas.style.cursor = hit ? "pointer" : "grab";
      canvas.dispatchEvent(new CustomEvent("planethover", { detail: hit ? hit.userData : null }));
    }
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 8) {
      const hit = pick(e.clientX, e.clientY);
      if (hit) onSelect?.(hit.userData);
    }
  });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointerleave", () => {
    dragging = false; hovered = null;
    canvas.dispatchEvent(new CustomEvent("planethover", { detail: null }));
  });

  function focus(id) {
    const c = chapters.find((x) => x.id === id);
    if (!c) return;
    spin = -((c.lng + 180) * Math.PI) / 180 - baseY + Math.PI / 2;
    tilt = ((c.lat * Math.PI) / 180) * 0.6;
    const m = markers.find((x) => x.userData.id === id);
    if (m) { ring.position.copy(m.position).multiplyScalar(0.999); ring.lookAt(0, 0, 0); }
  }

  /* ---------------- loop ---------------- */
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let raf = 0, pulse = 0;
  function frame() {
    if (!dragging && !reduced) spin += 0.0008;   // one object, slowly
    world.rotation.y = baseY + spin;
    world.rotation.x = tilt;
    pulse += 0.05;
    ring.material.opacity = 0.32 + Math.sin(pulse) * 0.2;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* fit the NARROWER axis — a phone is ~0.46 aspect, so horizontal FOV is
       far tighter than vertical and a fixed distance spills the planet off
       both sides */
    const vfov = (camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    camera.position.z = 1.32 / Math.sin(Math.min(vfov, hfov) / 2);
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  frame();
  canvas.style.cursor = "grab";

  return {
    focus,
    refresh(list) { buildMarkers(list); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      markers.forEach((m) => m.material.dispose());
      geo.dispose();
      sphere.geometry.dispose();
      sphere.material.dispose();
      dayTex.dispose();
      bumpTex.dispose();
      renderer.dispose();
    },
  };
}
