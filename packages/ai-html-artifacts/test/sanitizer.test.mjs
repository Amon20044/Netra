import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "../dist/index.js";

test("removes <script> tags", () => {
  const { html } = sanitizeHtml('<div>ok</div><script>alert(1)</script>');
  assert.ok(!/<script/i.test(html));
  assert.match(html, /<div>ok<\/div>/);
});

test("removes inline event handlers", () => {
  const { html } = sanitizeHtml('<button onclick="steal()">x</button>');
  assert.ok(!/onclick/i.test(html));
  assert.match(html, /<button[^>]*>x<\/button>/);
});

test("removes javascript: URLs", () => {
  const { html } = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
  assert.ok(!/javascript:/i.test(html));
});

test("preserves style tags, inline styles, forms, and svg by default", () => {
  const input =
    '<style>.a{color:red}</style><div style="color:blue">x</div>' +
    '<form><input type="email" required /><button>Go</button></form>' +
    '<svg viewBox="0 0 1 1"><rect width="1" height="1"/></svg>';
  const { html } = sanitizeHtml(input);
  assert.match(html, /<style>/);
  assert.match(html, /style="color:blue"/);
  assert.match(html, /<form>/);
  assert.match(html, /<input/);
  assert.match(html, /<svg/);
});

test("blocks external stylesheets and @import unless allowed", () => {
  const input =
    '<link rel="stylesheet" href="https://evil.test/x.css" />' +
    '<style>@import url("https://evil.test/y.css");</style>';
  const { html } = sanitizeHtml(input);
  assert.ok(!/<link/i.test(html));
  assert.ok(!/@import/i.test(html));
});

test("strips CSS expression() vector", () => {
  const { html } = sanitizeHtml('<div style="width:expression(alert(1))">x</div>');
  assert.ok(!/expression\(/i.test(html));
});

test("scripts stay removed when allowScripts is false", () => {
  const { html } = sanitizeHtml("<script>x</script>", { allowScripts: false });
  assert.ok(!/<script/i.test(html));
});

test("allowScripts preserves inline scripts but strips external or evented scripts", () => {
  const { html } = sanitizeHtml(
    '<div>ok</div><script>window.__netra = 1;</script>' +
      '<script type="module">window.__module = true;</script>' +
      '<script src="https://evil.test/x.js">bad</script>' +
      '<script onload="steal()">bad</script>' +
      '<script type="application/json">{"bad":true}</script>',
    { allowScripts: true },
  );

  assert.match(html, /<script>window\.__netra = 1;<\/script>/);
  assert.match(html, /<script type="module">window\.__module = true;<\/script>/);
  assert.ok(!/src=|onload|application\/json|bad/i.test(html));
});

test("allowExternalFonts keeps Google Fonts but strips other external CSS", () => {
  const input =
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />' +
    '<link href="https://fonts.googleapis.com/css2?family=Fraunces&display=swap" rel="stylesheet" />' +
    '<link rel="stylesheet" href="https://evil.test/x.css" />';
  const { html } = sanitizeHtml(input, { allowExternalFonts: true });
  assert.match(html, /fonts\.googleapis\.com/);
  assert.match(html, /fonts\.gstatic\.com/);
  assert.ok(!/evil\.test/.test(html));
});

test("allowVideoEmbeds keeps trusted YouTube iframes only when enabled", () => {
  const input =
    '<iframe src="https://www.youtube.com/watch?v=Fij1aBcl_Ts&t=1m2s" onload="steal()" allow="bad"></iframe>' +
    '<iframe src="https://evil.test/embed/x"></iframe>';

  const blocked = sanitizeHtml(input);
  assert.ok(!/<iframe/i.test(blocked.html));

  const { html } = sanitizeHtml(input, { allowVideoEmbeds: true });
  assert.match(html, /<iframe/i);
  assert.match(html, /https:\/\/www\.youtube\.com\/embed\/Fij1aBcl_Ts\?start=62/);
  assert.match(html, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.match(html, /allowfullscreen/);
  assert.ok(!/onload|evil\.test|allow="bad"/i.test(html));
});

test("importmaps are stripped when allowModuleImports is off", () => {
  const input =
    '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js"}}</script>';
  const { html } = sanitizeHtml(input);
  assert.ok(!/importmap/i.test(html));
  assert.ok(!/<script/i.test(html));
});

test("allowModuleImports keeps a trusted, pinned importmap + module game code", () => {
  const input =
    '<script type="importmap">{"imports":{' +
    '"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",' +
    '"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"' +
    "}}</script>" +
    '<script type="module">import * as THREE from "three"; window.__game = !!THREE;</script>';
  const { html } = sanitizeHtml(input, { allowModuleImports: true });

  assert.match(html, /<script type="importmap">/);
  assert.match(html, /three@0\.169\.0\/build\/three\.module\.js/);
  assert.match(html, /three\/addons\//);
  assert.match(html, /<script type="module">import \* as THREE/);
});

test("importmap drops untrusted hosts and unpinned versions", () => {
  const input =
    '<script type="importmap">{"imports":{' +
    '"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",' +
    '"evil":"https://evil.test/malware.js",' +
    '"floating":"https://cdn.jsdelivr.net/npm/three/build/three.module.js"' +
    "}}</script>";
  const { html } = sanitizeHtml(input, { allowModuleImports: true });

  assert.match(html, /three@0\.169\.0/);
  assert.ok(!/evil\.test/.test(html));
  assert.ok(!/"floating"/.test(html));
});

test("importmap with no trusted entries is dropped entirely", () => {
  const input =
    '<script type="importmap">{"imports":{"x":"https://evil.test/x.js"}}</script>';
  const { html } = sanitizeHtml(input, { allowModuleImports: true });
  assert.ok(!/importmap/i.test(html));
  assert.ok(!/evil\.test/.test(html));
});

test("allowModuleImports still strips module scripts that load external src", () => {
  const input =
    '<script type="module" src="https://evil.test/x.js"></script>' +
    '<script type="module">window.__ok = 1;</script>';
  const { html } = sanitizeHtml(input, { allowModuleImports: true });
  assert.ok(!/evil\.test/.test(html));
  assert.match(html, /window\.__ok = 1;/);
});
