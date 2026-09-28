// Vlastiti three.js prikaz 3D modela rada. Podaci modela su statične datoteke
// (web/public/modeli3d/<šifra>/, gradi ih scripts/fetch_model3d.py), a ovaj modul se
// učitava dinamički, tek na klik, da three.js ne ulazi u JavaScript ostalih stranica.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type MaterialCfg = {
  color?: string;
  opacity?: number;
  transparent?: boolean;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  flatShading?: boolean;
};
type Bucket = { name: string; offset: number; count: number; material: MaterialCfg };
export type Manifest = { code: string; name: string; triangles: number; buckets: Bucket[] };

async function loadPositions(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`model: HTTP ${res.status}`);
  let buf = new Uint8Array(await res.arrayBuffer());
  // Datoteka je gzip. Ako ju je poslužitelj već raspakirao (Content-Encoding), preskoči.
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    buf = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

function material(cfg: MaterialCfg): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(cfg.color ?? "#d8d0bd"),
    metalness: cfg.metalness ?? 0,
    roughness: cfg.roughness ?? 0.92,
    envMapIntensity: cfg.envMapIntensity ?? 0.35,
    transparent: cfg.transparent ?? false,
    opacity: cfg.opacity ?? 1,
    // Trokuti iz modela nemaju pouzdan redoslijed vrhova, pa se crtaju s obje strane.
    side: THREE.DoubleSide,
    flatShading: cfg.flatShading ?? true,
  });
}

/** Crta model u `stage` i vraća funkciju za gašenje (oslobađa WebGL kontekst). */
export async function mountModel3d(stage: HTMLElement, base: string): Promise<() => void> {
  const manifest: Manifest = await (await fetch(`${base}/manifest.json`)).json();
  const positions = await loadPositions(`${base}/mesh.f32.gz`);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#c9d8e6");
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const model = new THREE.Group();
  for (const b of manifest.buckets) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions.slice(b.offset, b.offset + b.count), 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material(b.material));
    mesh.name = b.name;
    mesh.castShadow = !b.material.transparent;
    mesh.receiveShadow = true;
    model.add(mesh);
  }
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const radius = size.length() / 2;

  // Tlo oko modela, da stadion ne lebdi.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 3, 64),
    new THREE.MeshStandardMaterial({ color: "#8fa27a", roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, box.min.y - 0.05, center.z);
  ground.receiveShadow = true;
  scene.add(ground);

  scene.add(new THREE.HemisphereLight("#eef4ff", "#6b705c", 0.8));
  const sun = new THREE.DirectionalLight("#fff4e0", 2.2);
  sun.position.set(center.x + radius, radius * 1.2, center.z + radius * 0.6);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: radius * 4 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, radius * 20);
  camera.position.set(center.x + radius * 0.9, center.y + radius * 0.55, center.z + radius * 0.9);

  stage.replaceChildren(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.minDistance = 10;
  controls.maxDistance = radius * 6;

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    controls.dispose();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    pmrem.dispose();
    renderer.dispose();
  };
  renderer.setAnimationLoop(() => {
    // Navigacija u aplikaciji zamijeni sadržaj stranice: tada se prikaz sam gasi.
    if (!renderer.domElement.isConnected) return stop();
    controls.update();
    renderer.render(scene, camera);
  });
  return stop;
}
