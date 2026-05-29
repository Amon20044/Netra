import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PredictiveHtmlParser,
  assembleStreamingHtml,
} from "../dist/index.js";

test("predicts closings without mutating the truth", () => {
  const p = new PredictiveHtmlParser();
  const snap1 = p.push("<section><div><h2>Hello");
  assert.equal(snap1, "<section><div><h2>Hello</h2></div></section>");
  // committed truth has NO predicted closings
  assert.equal(p.committedHtml, "<section><div><h2>Hello");

  const snap2 = p.push("</h2><p>World");
  assert.equal(snap2, "<section><div><h2>Hello</h2><p>World</p></div></section>");
});

test("does not duplicate when the real closings arrive", () => {
  const p = new PredictiveHtmlParser();
  p.push("<div>Hello");
  const final = p.push("</div>");
  assert.equal(final, "<div>Hello</div>");
  assert.ok(!/<\/div><\/div>/.test(final), "must not duplicate closings");
});

test("implicit-closes <li> between siblings", () => {
  const { html } = assembleStreamingHtml("<ul><li>One<li>Two");
  assert.equal(html, "<ul><li>One</li><li>Two</li></ul>");
});

test("implicit-closes <p> when a block opens", () => {
  const { html } = assembleStreamingHtml("<p>Hello<p>World");
  assert.equal(html, "<p>Hello</p><p>World</p>");
});

test("implicit-closes table cells and rows", () => {
  const { html } = assembleStreamingHtml("<table><tr><td>A<td>B<tr><td>C");
  assert.equal(
    html,
    "<table><tr><td>A</td><td>B</td></tr><tr><td>C</td></tr></table>",
  );
});

test("repairs mis-nested close tags", () => {
  const { html } = assembleStreamingHtml("<section><div><p>Hello</section>");
  assert.equal(html, "<section><div><p>Hello</p></div></section>");
});

test("ignores orphan close tags", () => {
  const { html } = assembleStreamingHtml("<div>ok</span></div>");
  assert.equal(html, "<div>ok</div>");
});

test("incremental pushes match a single full push", () => {
  const full =
    '<!DOCTYPE html><html><head><style>.a{color:red}</style></head>' +
    "<body><main><h1>Hi</h1><ul><li>x<li>y</ul></main></body></html>";

  const incremental = new PredictiveHtmlParser();
  let last = "";
  for (let i = 0; i < full.length; i += 7) {
    last = incremental.push(full.slice(i, i + 7));
  }

  // Chunked streaming must produce the same projection as one full push.
  const oneShot = new PredictiveHtmlParser().push(full);

  assert.equal(incremental.complete, true);
  assert.equal(last, oneShot);
});

test("handles tags and quoted attributes split across chunks", () => {
  const p = new PredictiveHtmlParser();
  assert.equal(p.push("<body><a tit"), "<body></body>");
  assert.equal(
    p.push('le="2 > 1" href="#">link'),
    '<body><a title="2 > 1" href="#">link</a></body>',
  );
});

test("handles raw-text close tags split across chunks", () => {
  const p = new PredictiveHtmlParser();
  p.push("<html><head><style>.card > a{color:gold}</sty");
  const rendered = p.push("le></head><body><h1>Ready");
  assert.match(rendered, /\.card > a\{color:gold\}<\/style>/);
  assert.match(rendered, /<h1>Ready<\/h1><\/body><\/html>$/);
});

test("ignores doctype and void tags while balancing full documents", () => {
  const p = new PredictiveHtmlParser();
  const rendered = p.push(
    '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><link href="https://fonts.googleapis.com/css2?family=DM+Sans" rel="stylesheet"></head><body><input required><br><p>x',
  );
  assert.ok(!/<\/meta>|<\/link>|<\/input>|<\/br>/.test(rendered));
  assert.match(rendered, /<p>x<\/p><\/body><\/html>$/);
});

test("cleans markdown fences before assembling streaming HTML", () => {
  const { html, renderable } = assembleStreamingHtml(
    "```html\n<!DOCTYPE html><html><body><form><input required>",
  );
  assert.equal(renderable, true);
  assert.ok(!html.includes("```"));
  assert.match(html, /<input required><\/form><\/body><\/html>$/);
});

test("raw-text CSS with '>' combinators doesn't break parsing", () => {
  const partial =
    "<html><head><style>.nav > a{color:#09f}</style></head><body><p>hi";
  const { html, renderable } = assembleStreamingHtml(partial);
  assert.equal(renderable, true);
  assert.match(html, /\.nav > a\{color:#09f\}/);
  assert.match(html, /<p>hi<\/p><\/body><\/html>$/);
});

test("never throws on malformed input (fail open)", () => {
  assert.doesNotThrow(() => assembleStreamingHtml("<<<>>> <a <b <c"));
  const p = new PredictiveHtmlParser();
  assert.doesNotThrow(() => p.push("<<< weird <<"));
});
