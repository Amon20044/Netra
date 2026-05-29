import { test } from "node:test";
import assert from "node:assert/strict";
import { assembleStreamingHtml, StreamingHtmlProjector } from "../dist/index.js";

test("empty input is not renderable", () => {
  const r = assembleStreamingHtml("");
  assert.equal(r.html, "");
  assert.equal(r.renderable, false);
  assert.equal(r.complete, false);
});

test("a closed document is returned untouched and complete", () => {
  const doc = "<!DOCTYPE html><html><body><h1>Hi</h1></body></html>";
  const r = assembleStreamingHtml(doc);
  assert.equal(r.complete, true);
  assert.equal(r.html, doc);
});

test("mid-<style> partial closes the style and is not yet renderable", () => {
  const partial = "<!DOCTYPE html><html><head><style>.a{color:red}.b{colo";
  const r = assembleStreamingHtml(partial);
  // style must be closed so later content is never swallowed
  assert.match(r.html, /<\/style>/);
  // head/html predictively closed
  assert.match(r.html, /<\/head>/);
  assert.match(r.html, /<\/html>/);
  // no body content yet
  assert.equal(r.renderable, false);
});

test("partial body content renders and is balanced", () => {
  const partial =
    "<!DOCTYPE html><html><head><style>.x{color:#09f}</style></head>" +
    '<body><main><section class="card"><h2>Pricing</h2><p>From $9';
  const r = assembleStreamingHtml(partial);
  assert.equal(r.renderable, true);
  // every open element is closed, innermost first
  assert.match(r.html, /<\/p><\/section><\/main><\/body><\/html>$/);
  assert.match(r.html, /<h2>Pricing<\/h2>/);
});

test("drops an incomplete trailing tag", () => {
  const r = assembleStreamingHtml("<body><div>ok</div><span class=\"hi");
  assert.ok(!/<span/.test(r.html), "partial <span should be removed");
  assert.match(r.html, /<div>ok<\/div>/);
});

test("does not treat '>' inside a quoted attribute as the tag end", () => {
  const partial = '<body><a title="a > b" href="#">link';
  const r = assembleStreamingHtml(partial);
  assert.match(r.html, /title="a > b"/);
  assert.match(r.html, /link<\/a><\/body>/);
});

test("void elements are not pushed onto the stack", () => {
  const partial = "<body><img src=\"x.png\"><br><input type=\"text\"><p>after";
  const r = assembleStreamingHtml(partial);
  // only <p> (and body) should be closed; no bogus </img></br></input>
  assert.ok(!/<\/img>|<\/br>|<\/input>/.test(r.html));
  assert.match(r.html, /<p>after<\/p><\/body>$/);
});

test("incomplete trailing comment is dropped", () => {
  const r = assembleStreamingHtml("<body><p>hi</p><!-- a partial comment");
  assert.ok(!/<!--/.test(r.html));
  assert.match(r.html, /<p>hi<\/p><\/body>/);
});

test("self-closing tags are not pushed", () => {
  const r = assembleStreamingHtml('<body><svg><rect/><circle/></svg><p>x');
  assert.match(r.html, /<p>x<\/p><\/body>$/);
  assert.ok(!/<\/rect>|<\/circle>/.test(r.html));
});

test("never throws on malformed input (fail open)", () => {
  assert.doesNotThrow(() => assembleStreamingHtml("<<<>>> <a <b <c"));
});

// --- StreamingHtmlProjector (incremental, O(n) streaming) -------------------

test("projector: byte-by-byte incremental matches one-shot assemble", () => {
  const full =
    "<!DOCTYPE html><html><head><style>.a{color:red}</style></head>" +
    "<body><section><div><h2>Hello</h2><p>world";
  const proj = new StreamingHtmlProjector();
  let last;
  for (let i = 1; i <= full.length; i++) last = proj.update(full.slice(0, i));
  const oneShot = assembleStreamingHtml(full);
  assert.equal(last.html, oneShot.html);
  assert.equal(last.renderable, oneShot.renderable);
});

test("projector: tolerates skipped frames (throttle) and catches up", () => {
  const full = "<body><ul><li>one<li>two<li>three</ul><p>done";
  const proj = new StreamingHtmlProjector();
  proj.update(full.slice(0, 10));
  proj.update(full.slice(0, 25));
  const last = proj.update(full);
  assert.equal(last.html, assembleStreamingHtml(full).html);
});

test("projector: strips a leading code fence", () => {
  const proj = new StreamingHtmlProjector();
  const r = proj.update("```html\n<!DOCTYPE html><html><body><h1>Hi</h1></body></html>");
  assert.ok(!r.html.includes("```"));
  assert.match(r.html, /<h1>Hi<\/h1>/);
  assert.equal(r.complete, true);
});

test("projector: withholds render until there is body content", () => {
  const proj = new StreamingHtmlProjector();
  assert.equal(proj.update("<!DOCTYPE html><html><head>").renderable, false);
  assert.equal(
    proj.update("<!DOCTYPE html><html><head></head><body><h1>x</h1>").renderable,
    true,
  );
});

test("projector: re-syncs when the stream is replaced (non-prefix)", () => {
  const proj = new StreamingHtmlProjector();
  proj.update("<body><h1>first</h1>");
  const r = proj.update("<body><h2>second</h2>");
  assert.equal(r.html, assembleStreamingHtml("<body><h2>second</h2>").html);
});

test("projector: empty / whitespace-only is not renderable and never throws", () => {
  const proj = new StreamingHtmlProjector();
  assert.doesNotThrow(() => {
    assert.equal(proj.update("").renderable, false);
    assert.equal(proj.update("   ").renderable, false);
    assert.equal(proj.update("   \n  ").renderable, false);
  });
});

test("projector: reset() clears state for reuse", () => {
  const proj = new StreamingHtmlProjector();
  proj.update("<body><h1>a</h1>");
  proj.reset();
  const r = proj.update("<body><h2>b</h2>");
  assert.equal(r.html, assembleStreamingHtml("<body><h2>b</h2>").html);
});
