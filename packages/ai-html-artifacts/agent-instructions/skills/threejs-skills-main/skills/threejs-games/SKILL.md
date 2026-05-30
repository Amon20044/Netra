---
name: threejs-games
description: Build complete, playable single-file three.js games. Use when the request is a game (not a static scene/demo) — needs a game loop, state machine, input, collision, HUD, scoring, pause/restart, spawning/pooling, and mobile controls. Covers the artifact-mode single-file setup (pinned import map) the other threejs skills assume.
---

# Three.js Games

The other threejs skills cover *rendering* primitives (geometry, materials, lighting, …).
This one covers *game orchestration* — turning a scene into something playable, in **one
self-contained HTML file** that runs with no build step.

## Single-File Setup (artifact mode — REQUIRED)

A game artifact runs in an isolated, script-enabled iframe. It must be one HTML document
that loads three.js from a **pinned, trusted CDN via an import map**. Use this exact import
map — other hosts/versions are stripped by the artifact sanitizer and the game won't load:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from "three";
  import { OrbitControls } from "three/addons/controls/OrbitControls.js"; // only what you use
</script>
```

Rules: exactly one import map; bare specifiers (`"three"`, `"three/addons/…"`); the game
logic is one `type="module"` script; no other `<script src>`, no `eval`/`new Function`, no
cross-host `fetch`; attach input with `addEventListener`, never `onclick=` attributes.

## Core Concept: the game loop

Render and simulation are separate concerns. Drive both from `renderer.setAnimationLoop`
(preferred over `requestAnimationFrame` — it also drives WebXR and pauses cleanly), but step
the **simulation at a fixed timestep** so physics/feel are framerate-independent.

```javascript
const clock = new THREE.Clock();
let acc = 0;
const STEP = 1 / 60;                 // simulate at a stable 60 Hz

function update(dt) {
  // movement, AI, spawning, collisions, scoring, win/lose checks
}

renderer.setAnimationLoop(() => {
  acc += Math.min(clock.getDelta(), 0.1); // clamp: avoid the "spiral of death" after a stall
  while (game.running && acc >= STEP) { update(STEP); acc -= STEP; }
  renderer.render(scene, camera);         // keep rendering even when paused, so the scene shows
});
```

## State machine

Gate the simulation, not the render, so a paused/game-over scene stays visible behind the HUD.

```javascript
const game = { phase: "menu", running: false, score: 0, lives: 3 };

function setPhase(next) {
  game.phase = next;                    // "menu" | "playing" | "paused" | "over"
  game.running = next === "playing";
  hud.dataset.phase = next;             // CSS shows/hides the right HUD panel
}

addEventListener("keydown", (e) => {
  if (e.code === "Escape" || e.code === "KeyP") {
    if (game.phase === "playing") setPhase("paused");
    else if (game.phase === "paused") setPhase("playing");
  }
});
```

## Input (keyboard + mobile)

Poll a held-keys object inside `update()` (don't move objects directly in the event — you'd
lose framerate independence). Always add touch controls so it's playable on a phone.

```javascript
const input = { left: false, right: false, fire: false };
const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", Space: "fire" };
addEventListener("keydown", (e) => { const k = KEYMAP[e.code]; if (k) { input[k] = true; e.preventDefault(); } });
addEventListener("keyup",   (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });

// On-screen buttons live in the HUD (pointer-events:auto). ≥44px tap targets.
function bindHold(el, key) {
  const on  = (e) => { e.preventDefault(); input[key] = true; };
  const off = (e) => { e.preventDefault(); input[key] = false; };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointerleave", off);
  el.addEventListener("pointercancel", off);
}
```

For mouse-look / FPS games use `PointerLockControls` and lock on a click (browsers require a
user gesture):

```javascript
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener("click", () => controls.lock());
```

## HUD overlay (real DOM, not 3D text)

Score, lives, timers, menus and buttons are crisp, accessible DOM layered over the canvas —
never `TextGeometry`. The overlay ignores pointer events except on interactive panels.

```html
<div id="hud">
  <div class="score" aria-live="polite">0</div>
  <div class="panel menu">  <button id="start">Play</button></div>
  <div class="panel over" hidden>Game Over <button id="again">Retry</button></div>
</div>
```
```css
#hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
       font: 600 16px/1.3 system-ui, sans-serif; }
#hud .panel { pointer-events: auto; display: grid; place-content: center; gap: 12px; }
#hud[data-phase="playing"] .menu, #hud[data-phase="playing"] .over { display: none; }
```

## Collision (cheap broad checks)

For most arcade games, sphere or AABB tests are enough — skip a physics engine.

```javascript
// Sphere vs sphere
const hit = a.position.distanceToSquared(b.position) < (ra + rb) ** 2;

// AABB via bounding boxes (recompute when objects move)
const boxA = new THREE.Box3().setFromObject(a);
const boxB = new THREE.Box3().setFromObject(b);
if (boxA.intersectsBox(boxB)) { /* … */ }
```

## Spawning + object pooling

Allocating/`dispose`-ing meshes every frame causes GC hitches. Pre-create a pool and recycle.

```javascript
const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
const bulletMat = new THREE.MeshStandardMaterial({ color: 0xffd166 });
const pool = Array.from({ length: 64 }, () => {
  const m = new THREE.Mesh(bulletGeo, bulletMat);  // share geometry + material
  m.visible = false; scene.add(m); return m;
});
function spawnBullet(pos, vel) {
  const b = pool.find((m) => !m.visible);
  if (!b) return;                       // pool exhausted — drop, don't allocate
  b.visible = true; b.position.copy(pos); b.userData.vel = vel;
}
```

For dense identical objects (asteroids, particles) prefer a single `InstancedMesh` — one draw
call — over many meshes (see `threejs-geometry`).

## Audio (Web Audio, gesture-gated)

```javascript
let audio;
function beep(freq = 440, ms = 80) {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  const osc = audio.createOscillator(); const gain = audio.createGain();
  osc.frequency.value = freq; osc.connect(gain); gain.connect(audio.destination);
  gain.gain.setValueAtTime(0.2, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
  osc.start(); osc.stop(audio.currentTime + ms / 1000);
}
// Resume the context on the first user gesture (autoplay policy):
addEventListener("pointerdown", () => audio?.resume(), { once: true });
```

## Look + feel checklist

- Ambient + directional light; `renderer.toneMapping = THREE.ACESFilmicToneMapping`;
  `renderer.outputColorSpace = THREE.SRGBColorSpace`. A deliberate palette beats a gray box.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — don't render at 3x on phones.
- Handle `resize`: update `camera.aspect`, `camera.updateProjectionMatrix()`, `renderer.setSize`.
- Juice: screen shake, hit flashes (`material.emissive`), particle bursts, easing — cheap, huge impact.

## Performance Tips

1. Share geometries/materials; pool entities; prefer `InstancedMesh` for many similar objects.
2. Fixed-timestep `update`, single `render` per frame; never `new` in the hot loop.
3. Keep draw calls low; merge static geometry (`BufferGeometryUtils.mergeGeometries`).
4. Dispose geometries/materials/textures when leaving a level; recompute `Box3` only for movers.
5. Clamp `getDelta()`; pause the sim (not the render) when the tab/phase is inactive.

## See Also

- `threejs-fundamentals` — scene/camera/renderer, resize, dispose, the single-file setup
- `threejs-interaction` — raycasting, pointer/keyboard, OrbitControls/PointerLockControls
- `threejs-geometry` — primitives, instancing for many entities
- `threejs-loaders` / `threejs-animation` — GLTF characters + `AnimationMixer` playback
- `threejs-materials` / `threejs-lighting` / `threejs-postprocessing` — making it look good
