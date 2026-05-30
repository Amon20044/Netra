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

test("scripts stay removed even if allowScripts is forced", () => {
  const { html } = sanitizeHtml("<script>x</script>", { allowScripts: false });
  assert.ok(!/<script/i.test(html));
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
