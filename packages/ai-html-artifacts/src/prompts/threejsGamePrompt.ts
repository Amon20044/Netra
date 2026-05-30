import { BASE_SYSTEM_PROMPT } from "./systemPrompt.js";

/**
 * Canonical, working single-file three.js skeleton. This is the EXACT structure
 * the model must build from: pinned jsDelivr importmap (so the sanitizer's
 * trusted-CDN allowlist keeps it), `type="module"` script, `setAnimationLoop`,
 * and a resize handler. Mirrors `agent-instructions/.../threejs-skills-main/template.html`.
 */
export const THREEJS_GAME_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>three.js game</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #111; }
    canvas { display: block; }            /* no gap under the canvas */
    #hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
           font: 600 16px/1.3 system-ui, sans-serif; }   /* DOM overlay for score/menus */
    #hud .panel { pointer-events: auto; }  /* re-enable clicks on buttons inside the HUD */
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  <div id="hud"><!-- score / menus / buttons go here (real DOM, not canvas) --></div>
  <script type="module">
    import * as THREE from "three";
    // import only the addons you use, e.g.:
    // import { OrbitControls } from "three/addons/controls/OrbitControls.js";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(5, 10, 7); scene.add(sun);

    // ---- GAME STATE ----------------------------------------------------------
    const state = { running: true, score: 0 };
    const input = { left: false, right: false, jump: false };
    addEventListener("keydown", (e) => setKey(e.code, true));
    addEventListener("keyup",   (e) => setKey(e.code, false));
    function setKey(code, down) {
      if (code === "ArrowLeft"  || code === "KeyA") input.left = down;
      if (code === "ArrowRight" || code === "KeyD") input.right = down;
      if (code === "Space")     input.jump = down;
    }

    // ---- ENTITIES (swap for your game) --------------------------------------
    const player = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x4f9dff })
    );
    scene.add(player);

    // ---- FIXED-TIMESTEP LOOP -------------------------------------------------
    const clock = new THREE.Clock();
    let acc = 0; const STEP = 1 / 60;            // simulate at a stable 60 Hz
    function update(dt) {
      if (input.left)  player.position.x -= 6 * dt;
      if (input.right) player.position.x += 6 * dt;
      // collisions, scoring, spawning, win/lose checks go here
    }
    renderer.setAnimationLoop(() => {
      acc += Math.min(clock.getDelta(), 0.1);    // clamp to avoid spiral-of-death
      while (state.running && acc >= STEP) { update(STEP); acc -= STEP; }
      renderer.render(scene, camera);
    });

    addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;

/**
 * Distilled, game-tuned reference drawn from the threejs-skills set. The system
 * prompt is built without the user's message, so rather than selecting skills at
 * runtime we hand the model the full menu of "for X, import Y and use Z" lines
 * and let it pick what the requested game needs. Keep these accurate to r169.
 */
const THREEJS_TOPIC_CHEATSHEET = `THREE.JS CAPABILITY MAP (import from "three/addons/…" — pick only what the game needs):
- Camera/orbit controls: import { OrbitControls } from "three/addons/controls/OrbitControls.js"; call controls.update() each frame when enableDamping.
- First-person/pointer-lock: import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"; lock on a user gesture (click) — required by browsers.
- Pointer picking / click-to-select: const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera); ray.intersectObjects(scene.children, true).
- Load 3D models: import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; new GLTFLoader().load(url, (gltf)=>scene.add(gltf.scene)). Draco: DRACOLoader from "three/addons/loaders/DRACOLoader.js".
- Skeletal/keyframe animation: const mixer = new THREE.AnimationMixer(model); mixer.clipAction(gltf.animations[0]).play(); call mixer.update(dt) each frame.
- Instancing (many objects, 1 draw call): new THREE.InstancedMesh(geo, mat, count); set per-instance matrices with setMatrixAt + instanceMatrix.needsUpdate.
- Custom visuals/shaders: new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }); animate via uniforms.uTime.value in the loop.
- Postprocessing (bloom/DOF): import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js" + RenderPass + UnrealBloomPass; composer.render() instead of renderer.render().
- Shadows: renderer.shadowMap.enabled = true; light.castShadow = true; mesh.castShadow/receiveShadow = true; tune light.shadow.camera + mapSize.
- Textures: const tex = new THREE.TextureLoader().load(url); tex.colorSpace = THREE.SRGBColorSpace; for tiling tex.wrapS = tex.wrapT = THREE.RepeatWrapping.
- Procedural geometry: BoxGeometry/SphereGeometry/PlaneGeometry/CylinderGeometry/TorusGeometry; merge static geo with mergeGeometries from "three/addons/utils/BufferGeometryUtils.js".
- Audio: use the Web Audio API (new AudioContext()) for SFX/music; resume() the context on first user gesture. (Keep all assets inline/procedural or from picsum/data URIs.)`;

/**
 * The hard rules + build playbook for a single-file three.js GAME. Distinct from
 * the static-artifact rules: a game IS a full-viewport, scripted, CDN-importing
 * canvas app, so the usual "no scripts / no CDN / auto-sized / one style block"
 * constraints are deliberately replaced here.
 */
const THREEJS_GAME_RULES = `You are generating a COMPLETE, PLAYABLE single-file three.js game as one HTML document. It runs in an isolated, script-enabled sandbox (no same-origin), so it must be fully self-contained.

NON-NEGOTIABLE STRUCTURE (build from the TEMPLATE below — do not invent a different loader):
- Exactly ONE <script type="importmap"> in <head>, using this EXACT pinned, trusted CDN (any other host/version is stripped by the sanitizer and the game will not load):
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
- The game logic is ONE <script type="module"> at the end of <body>. Use bare specifiers ("three", "three/addons/…") — they resolve through the importmap. NO other <script src>, NO other CDN, NO eval/new Function, NO network fetch to other hosts.
- NO inline event-handler attributes (onclick/onkeydown/...). Attach input with addEventListener inside the module.

GAMEPLAY THE ARTIFACT MUST ACTUALLY HAVE (not a tech demo):
- A clear goal and a win/lose (or endless-score) condition, real player control, and visible feedback.
- A DOM HUD overlay (#hud) for score / lives / timer / start-menu / game-over — render text and buttons as REAL DOM, never as 3D text, so it's crisp and clickable (pointer-events:auto on interactive panels).
- Start, pause (toggle on Esc/P), restart, and game-over states. Gate the simulation on state.running; keep rendering so the scene stays visible while paused.
- A fixed-timestep update loop (accumulate delta, step at 1/60, clamp delta to avoid the spiral of death). Keep render and simulation separate. Use renderer.setAnimationLoop, not requestAnimationFrame.
- Input: keyboard (WASD + arrows + space), AND touch/pointer for mobile (on-screen buttons in the HUD or pointer drag). Tap targets ≥ 44px.

QUALITY + PERFORMANCE:
- Lighting that reads well (ambient + directional), tone mapping (renderer.toneMapping = THREE.ACESFilmicToneMapping), outputColorSpace = THREE.SRGBColorSpace, and a deliberate palette/mood — make it look designed, not a gray box on a gray plane.
- setPixelRatio(Math.min(devicePixelRatio, 2)). Reuse geometries/materials; prefer InstancedMesh for many similar objects; pool bullets/enemies instead of creating/disposing every frame.
- Handle window resize (update camera.aspect + updateProjectionMatrix + renderer.setSize). dispose() geometries/materials/textures you discard.
- Fail safe: guard addon imports you use; if something is missing, the game should still render the scene rather than throw on a black screen.

OUTPUT: emit the artifact block per the OUTPUT FORMAT, containing ONLY the full HTML document. No prose, no markdown fences, no explanation.`;

export interface ThreejsGamePromptOptions {
  /** Optional creative direction (theme/mood) appended to the brief. */
  themeNote?: string;
}

/** Build the system prompt for single-file three.js game generation. */
export function buildThreejsGamePrompt(
  options: ThreejsGamePromptOptions = {},
): string {
  return [
    BASE_SYSTEM_PROMPT,
    "",
    THREEJS_GAME_RULES,
    "",
    THREEJS_TOPIC_CHEATSHEET,
    "",
    "REQUIRED STARTING TEMPLATE — extend this; keep the importmap and module structure exactly, replace the entities/update/HUD with the requested game:",
    THREEJS_GAME_TEMPLATE,
    options.themeNote
      ? `\nCREATIVE DIRECTION: ${options.themeNote}`
      : "",
    "",
    "Ship a game that is genuinely fun and looks crafted. Precompute everything; the file must run the moment it loads.",
  ]
    .filter(Boolean)
    .join("\n");
}
