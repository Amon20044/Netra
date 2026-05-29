import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSrcDoc } from "../dist/iframe/index.js";

test("camouflage override lands after model styles and suppresses white panels", () => {
  const doc = buildSrcDoc(
    `<!DOCTYPE html><html><head>
      <style>
        body{background:white!important}
        .panel{background:#fff!important;background-image:linear-gradient(#fff,#fff);color:#111}
      </style>
    </head><body><main class="shell"><section class="panel">White box</section></main></body></html>`,
    { camouflage: true, seamless: true },
  );

  assert.doesNotMatch(doc, /body :where\(main,section,article,aside,header,footer,nav,form,div\)/);
  assert.match(doc, /<body[^>]*style="[^"]*background:transparent!important/);
  assert.match(doc, /<main[^>]*style="[^"]*background-color:transparent!important/);
  assert.match(doc, /<section[^>]*style="[^"]*background-color:transparent!important/);
});

test("camouflage rewrites off-white and variable page backgrounds", () => {
  const doc = buildSrcDoc(
    `<!DOCTYPE html><html><head>
      <style>
        :root{--panel:#f8fafc;--paper:rgb(249,250,251)}
        .shell{background:var(--panel)!important}
        .card{background-color:#f9fafb}
        .soft{background:rgb(248,249,250)}
      </style>
    </head><body><main class="shell"><section class="card"><div class="soft">Soft panel</div></section></main></body></html>`,
    { camouflage: true, seamless: true },
  );

  assert.doesNotMatch(doc, /#f8fafc/i);
  assert.doesNotMatch(doc, /#f9fafb/i);
  assert.doesNotMatch(doc, /rgb\(249,250,251\)/i);
  assert.doesNotMatch(doc, /rgb\(248,249,250\)/i);
  assert.match(doc, /--panel:transparent/);
  assert.match(doc, /<html[^>]*style="[^"]*background-color:transparent!important/);
  assert.match(doc, /<main[^>]*style="[^"]*background-color:transparent!important/);
});

test("camouflage rewrites inline important white backgrounds before rendering", () => {
  const doc = buildSrcDoc(
    `<main style="background:#fff!important;color:#111!important">
      <section style="background-image:linear-gradient(#fff,#fff)!important;color:white!important">White box</section>
    </main>`,
    { camouflage: true, seamless: true },
  );

  assert.doesNotMatch(doc, /background:#fff/i);
  assert.doesNotMatch(doc, /linear-gradient\(#fff,#fff\)/i);
  assert.match(doc, /background:transparent !important/);
  assert.match(doc, /background-image:none !important/);
  assert.match(doc, /color:var\(--foreground,#f4f4f8\) !important/);
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
