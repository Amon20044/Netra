import { test } from "node:test";
import assert from "node:assert/strict";
import { ArtifactBuffer, looksRenderable } from "../dist/index.js";

test("looksRenderable rejects partial tags and unbalanced style blocks", () => {
  assert.equal(looksRenderable("<div>ok</div>"), true);
  assert.equal(looksRenderable("<div>ok</div><span"), false);
  assert.equal(looksRenderable("<style>.a{color:red}"), false);
  assert.equal(looksRenderable("<script>document.body.dataset.x='1'"), false);
  assert.equal(looksRenderable("<p>x</p>&amp"), false);
});

test("ArtifactBuffer keeps last valid snapshot when partial HTML is broken", () => {
  const buffer = new ArtifactBuffer();

  buffer.append("<section><h1>Title</h1></section>");
  const good = buffer.commit();
  assert.match(good, /<h1>Title<\/h1>/);

  // A broken trailing chunk must NOT become the displayed snapshot.
  buffer.append("<div class=\"unclosed");
  const stillGood = buffer.commit();
  assert.equal(stillGood, good);
});

test("ArtifactBuffer promotes predictive snapshots for open-ended HTML", () => {
  const buffer = new ArtifactBuffer();
  buffer.append("<!DOCTYPE html><html><body><main><h1>Signup");
  const snapshot = buffer.commit();
  assert.match(snapshot, /<h1>Signup<\/h1><\/main><\/body><\/html>$/);
});

test("ArtifactBuffer never writes predicted closings into raw HTML", () => {
  const buffer = new ArtifactBuffer();
  buffer.append("<!DOCTYPE html><html><body><form>");
  const first = buffer.commit();
  assert.match(first, /<form><\/form><\/body><\/html>$/);
  assert.equal(buffer.raw, "<!DOCTYPE html><html><body><form>");

  buffer.append("<div><label>Email</label>");
  const second = buffer.commit();
  assert.match(
    second,
    /<form><div><label>Email<\/label><\/div><\/form><\/body><\/html>$/,
  );
  assert.equal(
    buffer.raw,
    "<!DOCTYPE html><html><body><form><div><label>Email</label>",
  );
});

test("ArtifactBuffer repairs form-shaped streaming chunks progressively", () => {
  const buffer = new ArtifactBuffer();
  const chunks = [
    "\n<!DOCTYPE html",
    '>\n<html lang="en"><head><style>body{display:flex}</style></head><body><div class="signup-container"><form action="#" method="post">\n   ',
    '<div class="form-group"><label for="email">Email Address</label><input type="email" id="email"',
    ' name="email" required /></div><div class="form-group"><label for="password">Password</label><input type="password"',
    ' id="password" name="password" required /></div><button type="submit">Sign Up</button></form></div></body></html>',
  ];

  const snapshots = [];
  for (const chunk of chunks) {
    buffer.append(chunk);
    const snapshot = buffer.commit();
    if (snapshot) snapshots.push(snapshot);
  }

  assert.ok(snapshots.length >= 3);
  assert.match(snapshots.at(-1), /<form action="#" method="post">[\s\S]*Email Address[\s\S]*Password[\s\S]*Sign Up[\s\S]*<\/form>/);
  assert.ok(!buffer.raw.includes("</form></div></body></html><div"));
});

test("ArtifactBuffer strips markdown fences from snapshots", () => {
  const buffer = new ArtifactBuffer();
  buffer.append("```html\n<!DOCTYPE html><html><body><p>Hi");
  const snapshot = buffer.commit();
  assert.ok(!snapshot.includes("```"));
  assert.match(snapshot, /<p>Hi<\/p><\/body><\/html>$/);
});

test("ArtifactBuffer.finalize forces the final document", () => {
  const buffer = new ArtifactBuffer();
  buffer.append("<div>partial");
  const final = buffer.finalize("<html><body>done</body></html>");
  assert.match(final, /done/);
  assert.equal(buffer.lastValidSnapshot, final);
});
