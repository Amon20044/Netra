import { BASE_SYSTEM_PROMPT } from "./systemPrompt.js";

/**
 * Canonical, working single-file three.js CARTOON skeleton. This is the EXACT
 * structure the model must build from: pinned jsDelivr importmap (so the
 * sanitizer's trusted-CDN allowlist keeps it), `type="module"` script, toon
 * shading (MeshToonMaterial + banded gradient map), chunky inverted-hull
 * outlines, soft even lighting, a bloom "glow" pass, `setAnimationLoop`, a
 * fixed-timestep loop, and a DOM HUD. It looks good out of the box on purpose —
 * earlier non-art-directed games looked terrible.
 */
export const THREEJS_GAME_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>three.js cartoon game</title>
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #aee4ff; }
    canvas { display: block; }
    /* DOM HUD overlay — crisp text/buttons, never 3D text. */
    #hud { position: absolute; inset: 0; pointer-events: none; color: #2a2350;
           font: 800 18px/1.2 system-ui, 'Segoe UI', sans-serif;
           text-shadow: 0 2px 0 rgba(255,255,255,.65); }
    #hud .score { position: absolute; top: 16px; left: 20px; font-size: 28px; }
    #hud .panel { pointer-events: auto; position: absolute; inset: 0; display: grid;
                  place-content: center; gap: 16px; text-align: center; font-size: 30px; }
    #hud button { pointer-events: auto; font: inherit; font-size: 20px; padding: 14px 34px;
                  border: none; border-radius: 999px; background: #ff5da2; color: #fff;
                  box-shadow: 0 6px 0 #c93b7e, 0 12px 22px rgba(0,0,0,.22); cursor: pointer; }
    #hud button:active { transform: translateY(3px); box-shadow: 0 3px 0 #c93b7e; }
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
  <div id="hud">
    <div class="score">0</div>
    <div class="panel menu">🎈 Bouncy Collector<button id="play">Play</button></div>
  </div>
  <script type="module">
    import * as THREE from "three";
    import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
    import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
    import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

    // ---- RENDERER ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // ---- SCENE / CAMERA (bright sky + gentle fog = storybook depth) ----
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaee4ff);
    scene.fog = new THREE.Fog(0xaee4ff, 20, 44);
    const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 1, 0);

    // ---- CARTOON LIGHTING: soft + even, no harsh PBR ----
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8fb7c9, 1.15));
    const sun = new THREE.DirectionalLight(0xfff2cf, 1.5);
    sun.position.set(6, 13, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.top = sun.shadow.camera.right = 14;
    sun.shadow.camera.bottom = sun.shadow.camera.left = -14;
    scene.add(sun);

    // ---- TOON HELPERS ----
    // Banded gradient map = the core cartoon shading look (flat steps, not smooth).
    function toonGradient(steps = 4) {
      const data = new Uint8Array(steps);
      for (let i = 0; i < steps; i++) data[i] = (i / (steps - 1)) * 255;
      const t = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
      return t;
    }
    const GRAD = toonGradient(4);
    const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD });

    // Chunky comic outline via inverted hull (BackSide, scaled up). Reuse one
    // black material; add as a child so it tracks the parent automatically.
    const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x241a3a, side: THREE.BackSide });
    function outline(mesh, thickness = 0.06) {
      const o = new THREE.Mesh(mesh.geometry, OUTLINE_MAT);
      o.scale.setScalar(1 + thickness);
      mesh.add(o);
      return mesh;
    }

    // ---- WORLD ----
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1, 48), toon(0x7ed957));
    ground.position.y = -0.5; ground.receiveShadow = true; scene.add(ground);

    // ---- PLAYER (rounded, chunky, outlined) ----
    const player = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 28), toon(0xff5da2));
    player.castShadow = true; player.position.y = 0.8; scene.add(outline(player));

    // ---- GLOWING COLLECTIBLE (bright unlit material → bloom catches it) ----
    function makeOrb() {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0),
        new THREE.MeshBasicMaterial({ color: 0xfff36b }));
      orb.position.set((Math.random()*2-1)*6, 0.7, (Math.random()*2-1)*6);
      scene.add(orb); return orb;
    }
    let orb = makeOrb();

    // ---- GLOW: subtle bloom on the bright/emissive bits ----
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.8);
    composer.addPass(bloom);

    // ---- STATE / INPUT ----
    const game = { running: false, score: 0 };
    const hud = document.getElementById("hud");
    const scoreEl = hud.querySelector(".score");
    const keys = {};
    addEventListener("keydown", (e) => { keys[e.code] = true; });
    addEventListener("keyup", (e) => { keys[e.code] = false; });
    document.getElementById("play").onclick = () => {
      game.running = true; hud.querySelector(".menu").style.display = "none";
    };

    // ---- LOOP (fixed timestep) ----
    const clock = new THREE.Clock();
    let acc = 0; const STEP = 1 / 60;
    function update(dt) {
      const mx = (keys.ArrowRight||keys.KeyD?1:0) - (keys.ArrowLeft||keys.KeyA?1:0);
      const mz = (keys.ArrowDown||keys.KeyS?1:0) - (keys.ArrowUp||keys.KeyW?1:0);
      player.position.x = THREE.MathUtils.clamp(player.position.x + mx*7*dt, -7.5, 7.5);
      player.position.z = THREE.MathUtils.clamp(player.position.z + mz*7*dt, -7.5, 7.5);
      player.position.y = 0.8 + Math.abs(Math.sin(clock.elapsedTime*7)) * 0.25; // bouncy juice
      orb.rotation.y += dt*2.2;
      orb.position.y = 0.7 + Math.sin(clock.elapsedTime*3) * 0.15;
      if (player.position.distanceTo(orb.position) < 1.25) {
        game.score++; scoreEl.textContent = game.score;
        scene.remove(orb); orb = makeOrb();
      }
    }
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (game.running) { acc += dt; while (acc >= STEP) { update(STEP); acc -= STEP; } }
      composer.render(); // bloom glow (use instead of renderer.render)
    });
    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      composer.setSize(innerWidth, innerHeight);
    });
  </script>
</body>
</html>`;

/**
 * Distilled, game-tuned reference drawn from the threejs-skills set, biased
 * toward the cartoon look. The system prompt is built without the user's
 * message, so we hand the model the full menu of "for X, import Y, use Z" lines.
 * Accurate to r169.
 */
const THREEJS_TOPIC_CHEATSHEET = `THREE.JS CAPABILITY MAP (import from "three/addons/…" — pick only what the game needs):
- CARTOON SHADING (default look): THREE.MeshToonMaterial({ color, gradientMap }). Build the gradientMap from a tiny DataTexture of 3–5 ascending values with NearestFilter (banded steps). Reuse ONE gradient map across materials.
- OUTLINES (comic edge): inverted-hull — clone the mesh geometry with new MeshBasicMaterial({ color:0x20183a, side: THREE.BackSide }) scaled ~1.06 and add it as a child. (Or OutlineEffect from "three/addons/effects/OutlineEffect.js" and call effect.render(scene,camera) — but it does NOT compose with EffectComposer, so pick one.)
- GLOW (bloom): EffectComposer + RenderPass + UnrealBloomPass from "three/addons/postprocessing/…"; call composer.render() in the loop and composer.setSize() on resize. Keep it gentle (strength 0.5–0.9). Make glowing bits bright/unlit (MeshBasicMaterial) or emissive so bloom catches them.
- Camera/orbit controls: import { OrbitControls } from "three/addons/controls/OrbitControls.js"; controls.update() each frame when enableDamping.
- First-person/pointer-lock: import { PointerLockControls } from "three/addons/controls/PointerLockControls.js"; lock on a click (browser gesture requirement).
- Pointer picking: const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera); ray.intersectObjects(scene.children, true).
- Load 3D models: import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"; (swap loaded materials to MeshToonMaterial to keep the cartoon look).
- Skeletal/keyframe animation: const mixer = new THREE.AnimationMixer(model); mixer.clipAction(clip).play(); mixer.update(dt) each frame.
- Instancing (many objects, 1 draw call): new THREE.InstancedMesh(geo, mat, count); setMatrixAt + instanceMatrix.needsUpdate.
- Shadows: renderer.shadowMap.enabled = true; light.castShadow = true; mesh.castShadow/receiveShadow = true.
- Audio: Web Audio API (new AudioContext()); resume() on first user gesture; short blippy SFX fit the cartoon tone.`;

/**
 * Hard rules + build playbook for a single-file three.js GAME, art-directed to a
 * cartoon / toon look with a little glow. Distinct from the static-artifact
 * rules: a game IS a full-viewport, scripted, CDN-importing canvas app.
 */
const THREEJS_GAME_RULES = `You are generating a COMPLETE, PLAYABLE single-file three.js game as one HTML document. It runs in an isolated, script-enabled sandbox (no same-origin), so it must be fully self-contained.

NON-NEGOTIABLE STRUCTURE (build from the TEMPLATE below — do not invent a different loader):
- Exactly ONE <script type="importmap"> in <head>, using this EXACT pinned, trusted CDN (any other host/version is stripped by the sanitizer and the game will not load):
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
- The game logic is ONE <script type="module"> at the end of <body>. Use bare specifiers ("three", "three/addons/…"). NO other <script src>, NO other CDN, NO eval/new Function, NO network fetch to other hosts.
- NO inline event-handler attributes (onclick/onkeydown/...). Attach input with addEventListener inside the module.

ART DIRECTION — CARTOON / TOON, WITH A LITTLE GLOW (this is mandatory; do NOT ship a gray-box PBR scene):
- Toon shading: use THREE.MeshToonMaterial with a shared banded gradient map (3–5 steps, NearestFilter). Flat, stepped shading — never default shiny MeshStandard for the toy look.
- Chunky comic outlines on the main characters/objects via the inverted-hull trick (BackSide black mesh scaled ~1.05–1.08). Keep outlines off tiny particles to stay cheap.
- Bold, joyful color: a bright sky or pastel-gradient background, saturated character colors, and gentle THREE.Fog matching the sky for soft depth. Rounded, chunky shapes (spheres, rounded boxes, capsules, icosahedrons) — no thin sharp geometry.
- Soft, even lighting: HemisphereLight (sky/ground) + one warm DirectionalLight with soft PCFSoft shadows. Avoid dark, moody, high-contrast lighting.
- A LITTLE glow: a subtle UnrealBloomPass (strength ~0.5–0.9) via EffectComposer; make collectibles / power-ups / FX bright-unlit or emissive so they bloom. Call composer.render() in the loop (not renderer.render) and composer.setSize() on resize. (OutlineEffect and EffectComposer don't compose — use inverted-hull outlines when you use bloom.)
- Juice: squash/stretch or a bouncy sine on the player, a pop/scale on pickup, easing on camera, little particles or a flash on events. Cheap, huge charm.

GAMEPLAY THE ARTIFACT MUST ACTUALLY HAVE (not a tech demo):
- A clear goal and a win/lose (or endless-score) condition, real player control, and visible feedback.
- A DOM HUD (#hud) for score / lives / timer / start-menu / game-over — REAL DOM text and rounded candy-style buttons, never 3D text. pointer-events:auto only on interactive panels.
- Start, pause (Esc/P), restart, and game-over states. Gate the simulation on a running flag; keep rendering so the scene stays visible while paused.
- A fixed-timestep update loop (accumulate delta, step at 1/60, clamp delta). Use renderer.setAnimationLoop. Keep simulation and render separate.
- Input: keyboard (WASD + arrows + space) AND touch/pointer for mobile (on-screen candy buttons in the HUD). Tap targets ≥ 44px.

PERFORMANCE: setPixelRatio(Math.min(devicePixelRatio,2)); share the gradient map + outline material; pool spawned objects; prefer InstancedMesh for crowds; dispose what you discard; handle resize (camera + renderer + composer). Fail safe — if an addon import is missing, still render the scene rather than throw a black screen.

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
    "REQUIRED STARTING TEMPLATE — extend this; keep the importmap and module structure exactly, keep the toon + outline + bloom setup, and replace the entities/update/HUD with the requested game:",
    THREEJS_GAME_TEMPLATE,
    options.themeNote
      ? `\nCREATIVE DIRECTION: ${options.themeNote} (still render it in the cartoon/toon style above).`
      : "",
    "",
    "Ship a game that is genuinely fun AND looks like a charming cartoon toy. Precompute everything; the file must run the moment it loads.",
  ]
    .filter(Boolean)
    .join("\n");
}
