import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSrcDoc, resolveSandbox } from "../dist/iframe/index.js";

test("camouflage transparentizes the page but keeps inner card surfaces", () => {
  const doc = buildSrcDoc(
    `<!DOCTYPE html><html><head>
      <style>
        body{background:#0b0b12!important}
        .panel{background:#fff;background-image:linear-gradient(#222,#111);color:#eee}
      </style>
    </head><body><main class="shell"><section class="panel">Card</section></main></body></html>`,
    { camouflage: true, seamless: true },
  );

  // The PAGE (html/body) is forced transparent.
  assert.match(doc, /<body[^>]*style="[^"]*background:transparent!important/);
  // Inner card keeps its own surface + gradient (no longer stripped).
  assert.match(doc, /\.panel\{background:#fff;background-image:linear-gradient\(#222,#111\)/);
  // Inner blocks are NOT force-transparented anymore.
  assert.doesNotMatch(doc, /<section[^>]*style="[^"]*background-color:transparent!important/);
});

test("camouflage preserves inner surfaces (light and dark) and only clears the page", () => {
  const doc = buildSrcDoc(
    `<!DOCTYPE html><html><head>
      <style>
        :root{--panel:#f8fafc}
        .card{background-color:#111827}
        .soft{background:rgb(248,249,250)}
      </style>
    </head><body><main class="shell"><section class="card"><div class="soft">Soft</div></section></main></body></html>`,
    { camouflage: true, seamless: true },
  );

  // Inner surfaces preserved verbatim (dark AND light) — cards stay visible.
  assert.match(doc, /\.card\{background-color:#111827/);
  assert.match(doc, /\.soft\{background:rgb\(248,249,250\)/);
  assert.match(doc, /--panel:#f8fafc/);
  // Page transparent.
  assert.match(doc, /<html[^>]*style="[^"]*background-color:transparent!important/);
});

test("camouflage leaves inline element backgrounds intact, page transparent", () => {
  const doc = buildSrcDoc(
    `<main style="background:#0f172a;color:#fff"><section style="background-image:linear-gradient(#1e293b,#0f172a)">Card</section></main>`,
    { camouflage: true, seamless: true },
  );

  assert.match(doc, /style="background:#0f172a;color:#fff"/);
  assert.match(doc, /background-image:linear-gradient\(#1e293b,#0f172a\)/);
  assert.match(doc, /<body[^>]*style="[^"]*background:transparent!important/);
});

test("normal artifact mode does not inject seamless camouflage styles", () => {
  const doc = buildSrcDoc("<main><h1>Standalone</h1></main>", {
    seamless: false,
    camouflage: false,
  });

  assert.doesNotMatch(doc, /CAMOUFLAGE/i);
  assert.doesNotMatch(doc, /body>:only-child/);
  assert.doesNotMatch(doc, /color-scheme/);
});

test("buildSrcDoc keeps inline scripts only when script artifacts are enabled", () => {
  const input = "<main>Interactive</main><script>window.__artifact = true;</script>";

  assert.doesNotMatch(buildSrcDoc(input), /<script/i);

  const doc = buildSrcDoc(input, {
    sanitizeOptions: { allowScripts: true },
  });
  assert.match(doc, /<script>window\.__artifact = true;<\/script>/);
});

test("resolveSandbox isolates script-enabled previews", () => {
  assert.equal(
    resolveSandbox({ allowScripts: true }),
    "allow-forms allow-popups allow-scripts",
  );
  assert.equal(
    resolveSandbox({ allowScripts: true, allowForms: false }),
    "allow-popups allow-scripts",
  );
  assert.equal(
    resolveSandbox({
      sandbox: "allow-scripts allow-same-origin allow-forms allow-top-navigation",
    }),
    "allow-scripts allow-forms",
  );
});

test("game frames get allow-scripts (no same-origin), a CSP, and a kept importmap", () => {
  assert.equal(
    resolveSandbox({ allowModuleImports: true }),
    "allow-forms allow-popups allow-scripts",
  );

  const game =
    '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"}}</script>' +
    '<script type="module">import * as THREE from "three"; new THREE.Scene();</script>';
  const doc = buildSrcDoc(game, {
    sanitizeOptions: { allowModuleImports: true },
  });

  assert.match(doc, /Content-Security-Policy/);
  assert.match(doc, /script-src[^"]*cdn\.jsdelivr\.net/);
  assert.match(doc, /<script type="importmap">/);
  assert.match(doc, /three@0\.169\.0\/build\/three\.module\.js/);
  assert.match(doc, /<script type="module">import \* as THREE/);
  // resize bridge is injected so the host can size the game frame.
  assert.match(doc, /netra-artifact:resize/);
});

test("no module CSP is injected for a normal artifact even when allowModuleImports is on", () => {
  // The demo enables allowModuleImports globally; a non-game artifact (no
  // importmap) must NOT be constrained by the strict game CSP.
  const doc = buildSrcDoc("<main><h1>Dashboard</h1></main>", {
    sanitizeOptions: { allowModuleImports: true, allowScripts: true },
  });
  assert.doesNotMatch(doc, /Content-Security-Policy/);
});

test("resolveSandbox lets trusted video embeds play without preserving inline scripts", () => {
  assert.equal(
    resolveSandbox({ allowVideoEmbeds: true }),
    "allow-forms allow-popups allow-scripts",
  );

  const doc = buildSrcDoc(
    '<iframe src="https://youtu.be/Fij1aBcl_Ts?t=1m2s"></iframe><script>window.bad = true;</script>',
    { sanitizeOptions: { allowVideoEmbeds: true, allowScripts: false } },
  );

  assert.match(doc, /https:\/\/www\.youtube\.com\/embed\/Fij1aBcl_Ts\?start=62/);
  assert.match(doc, /allowfullscreen/);
  assert.match(doc, /netra-artifact:resize/);
  assert.doesNotMatch(doc, /window\.bad|<script>window\.bad/i);
});
