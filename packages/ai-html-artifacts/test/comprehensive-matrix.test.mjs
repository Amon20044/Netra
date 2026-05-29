import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ArtifactBuffer,
  PredictiveHtmlParser,
  SseDecoder,
  StreamingEnvelopeParser,
  assembleStreamingHtml,
  encodeSseEvent,
  event,
  parseArtifactEnvelope,
  sanitizeHtml,
} from "../dist/index.js";

const semanticTags = [
  "main",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "aside",
  "figure",
  "figcaption",
  "blockquote",
  "details",
  "summary",
  "dialog",
  "fieldset",
  "legend",
  "label",
  "button",
  "textarea",
  "select",
  "option",
  "output",
  "meter",
  "progress",
  "time",
  "mark",
  "small",
  "strong",
  "em",
  "code",
];

for (const tag of semanticTags) {
  test(`predictive parser balances semantic tag <${tag}>`, () => {
    const { html, renderable } = assembleStreamingHtml(`<body><${tag}>content`);
    assert.equal(renderable, true);
    assert.match(html, new RegExp(`<${tag}>content</${tag}></body>$`));
  });
}

const voidTags = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

for (const tag of voidTags) {
  test(`predictive parser never predicts a close for void tag <${tag}>`, () => {
    const { html } = assembleStreamingHtml(`<body><${tag} data-x="1"><p>after`);
    assert.ok(!html.includes(`</${tag}>`));
    assert.match(html, /<p>after<\/p><\/body>$/);
  });
}

const splitAttributeCases = [
  ["double quoted greater-than", '<body><a title="2 > 1"', ' href="#">x'],
  ["single quoted less-than", "<body><a title='2 < 3'", " href='#'>x"],
  ["data uri svg", '<body><div style="background:url(data:image/svg+xml,%3Csvg', '%3E)">x'],
  ["aria label", '<body><button aria-label="Submit', ' form">Go'],
  ["class list", '<body><section class="card primary', ' wide">x'],
  ["custom data", '<body><div data-state="streaming', '">x'],
  ["namespace tag", '<body><svg:viewBox data-x="1', '">x'],
  ["hyphen tag", '<body><custom-element data-role="demo', '">x'],
  ["equals in attr", '<body><div data-query="a=b', '&c=d">x'],
  ["escaped quotes text", '<body><p title="say ', 'hello">x'],
  ["form action", '<body><form action="/api', '/signup" method="post">x'],
  ["input placeholder", '<body><input placeholder="your', '@email.com"><p>x'],
];

for (const [name, first, second] of splitAttributeCases) {
  test(`predictive parser handles split attribute: ${name}`, () => {
    const parser = new PredictiveHtmlParser();
    const before = parser.push(first);
    assert.ok(!before.includes(second));
    const after = parser.push(second);
    assert.ok(after.includes("<body>"));
    assert.ok(!after.includes("</input>"));
  });
}

const implicitCases = [
  ["list items", "<ul><li>One<li>Two", "<ul><li>One</li><li>Two</li></ul>"],
  ["definition terms", "<dl><dt>A<dd>B", "<dl><dt>A</dt><dd>B</dd></dl>"],
  ["paragraph before div", "<p>A<div>B", "<p>A</p><div>B</div>"],
  ["paragraph before heading", "<p>A<h2>B", "<p>A</p><h2>B</h2>"],
  ["table cells", "<table><tr><td>A<td>B", "<table><tr><td>A</td><td>B</td></tr></table>"],
  ["table rows", "<table><tr><td>A<tr><td>B", "<table><tr><td>A</td></tr><tr><td>B</td></tr></table>"],
  ["thead to tbody", "<table><thead><tr><th>A<tbody><tr><td>B", "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>"],
  ["options", "<select><option>A<option>B", "<select><option>A</option><option>B</option></select>"],
  ["dt chain", "<dl><dt>A<dt>B", "<dl><dt>A</dt><dt>B</dt></dl>"],
  ["dd chain", "<dl><dd>A<dd>B", "<dl><dd>A</dd><dd>B</dd></dl>"],
  ["td before th", "<table><tr><td>A<th>B", "<table><tr><td>A</td><th>B</th></tr></table>"],
  ["th before td", "<table><tr><th>A<td>B", "<table><tr><th>A</th><td>B</td></tr></table>"],
];

for (const [name, input, expected] of implicitCases) {
  test(`predictive parser applies implicit close rule: ${name}`, () => {
    assert.equal(assembleStreamingHtml(input).html, expected);
  });
}

const rawTextCases = [
  ["style with child combinator", "<style>.a > .b{color:red}</style>"],
  ["style with media query", "<style>@media (min-width: 640px){.a{display:grid}}</style>"],
  ["title with angle", "<title>2 > 1 and 1 < 2</title>"],
  ["textarea with markup-looking text", "<textarea><div>not markup</div></textarea>"],
  ["script raw text", "<script>if (a < b) { c > d }</script>"],
  ["style split closer", "<style>.x{background:url('</not-a-tag>')}</style>"],
  ["textarea split closer", "<textarea>hello</textarea>"],
  ["title split closer", "<title>Hello world</title>"],
  ["style comment", "<style>/* > < */ .x{color:blue}</style>"],
  ["script string", "<script>const x = '</div>';</script>"],
];

for (const [name, raw] of rawTextCases) {
  test(`predictive parser keeps raw-text content intact: ${name}`, () => {
    const parser = new PredictiveHtmlParser();
    let output = "";
    for (let i = 0; i < raw.length; i += 5) {
      output = parser.push(raw.slice(i, i + 5));
    }
    assert.equal(output, raw);
  });
}

const malformedInputs = [
  "<<<<",
  "<body><div><span>oops</div>",
  "<body></section><main>x",
  "<body><p><div><span>x</main>",
  "<body><a href='unterminated",
  "<body><!-- comment",
  "<body><?xml version",
  "<body><!DOCTYPE html",
  "<body><div><",
  "<body><p>x</unknown>",
  "<body><svg><path d='M0 0 L10 10'",
  "<body><table><tr><td>A</table>",
];

for (const input of malformedInputs) {
  test(`predictive parser fails open for malformed input: ${input.slice(0, 28)}`, () => {
    assert.doesNotThrow(() => assembleStreamingHtml(input));
    assert.equal(typeof assembleStreamingHtml(input).html, "string");
  });
}

const accessibleHtmlCases = [
  '<form><label for="email">Email</label><input id="email" type="email" required autocomplete="email"></form>',
  '<button aria-label="Close dialog">x</button>',
  '<main role="main"><h1>Dashboard</h1></main>',
  '<img src="chart.png" alt="Revenue chart">',
  '<fieldset><legend>Account</legend><label><input type="checkbox"> Remember me</label></fieldset>',
  '<table><caption>Quarterly revenue</caption><thead><tr><th scope="col">Q</th></tr></thead><tbody><tr><td>Q1</td></tr></tbody></table>',
  '<nav aria-label="Primary"><a href="#home">Home</a></nav>',
  '<section aria-labelledby="title"><h2 id="title">Plans</h2></section>',
  '<input type="password" minlength="8" autocomplete="new-password">',
  '<details><summary>Terms</summary><p>Readable terms.</p></details>',
  '<a href="https://example.com" target="_blank" rel="noreferrer">Docs</a>',
  '<time datetime="2026-05-29">May 29, 2026</time>',
];

for (const html of accessibleHtmlCases) {
  test(`sanitizer preserves accessible static HTML: ${html.slice(0, 35)}`, () => {
    const result = sanitizeHtml(html);
    assert.equal(result.failedOpen, false);
    assert.ok(result.html.length > 0);
    assert.match(result.html, /aria-|for=|alt=|scope=|datetime=|autocomplete=|href=|rel=|<label|<main|<table|<details|<time/);
  });
}

const dangerousSanitizerCases = [
  ['<script>alert(1)</script><p>safe</p>', /<p>safe<\/p>/, /<script/i],
  ['<img src="x" onerror="alert(1)">', /<img src="x">/i, /onerror/i],
  ['<a href="javascript:alert(1)">x</a>', /<a>x<\/a>/i, /javascript/i],
  ['<iframe src="https://evil.test"></iframe><p>x</p>', /<p>x<\/p>/, /iframe/i],
  ['<object data="x"></object><p>x</p>', /<p>x<\/p>/, /object/i],
  ['<embed src="x"><p>x</p>', /<p>x<\/p>/, /embed/i],
  ['<meta http-equiv="refresh" content="0;url=x"><p>x</p>', /<p>x<\/p>/, /refresh/i],
  ['<div style="width: expression(alert(1))">x</div>', /void\(/, /expression/i],
  ['<link rel="stylesheet" href="https://evil.test/x.css"><p>x</p>', /<p>x<\/p>/, /evil/i],
  ['<style>@import "https://evil.test/x.css"; body{color:red}</style>', /body\{color:red\}/, /@import/i],
  ['<form><input></form>', /<form><input><\/form>/, /__never__/],
  ['<svg><circle></circle></svg>', /<svg><circle><\/circle><\/svg>/, /__never__/],
];

for (const [html, kept, removed] of dangerousSanitizerCases) {
  test(`sanitizer strips dangerous pattern: ${html.slice(0, 30)}`, () => {
    const result = sanitizeHtml(html);
    assert.match(result.html, kept);
    assert.doesNotMatch(result.html, removed);
  });
}

const envelopeCases = [
  ["bare doctype", "<!DOCTYPE html><html><body>x</body></html>", true],
  ["bare html tag", "<html><body>x</body></html>", true],
  ["fenced doctype", "```html\n<!DOCTYPE html><html><body>x</body></html>\n```", true],
  ["wrapped artifact", '<html_artifact title="Card"><html><body>x</body></html></html_artifact>', true],
  ["message plus artifact", "<assistant_message>Here</assistant_message><html_artifact><html><body>x</body></html></html_artifact>", true],
  ["plain text", "hello world", false],
  ["garbage", "<<<>>>", false],
  ["artifact with fence", "<html_artifact>```html\n<html><body>x</body></html>\n```</html_artifact>", true],
  ["doctype after prose", "Here\n<!DOCTYPE html><html><body>x</body></html>", true],
  ["html after prose", "Here\n<html><body>x</body></html>", true],
];

for (const [name, raw, hasArtifact] of envelopeCases) {
  test(`envelope parser recovery: ${name}`, () => {
    const parsed = parseArtifactEnvelope(raw);
    assert.equal(parsed.hasArtifact, hasArtifact);
    if (hasArtifact) assert.match(parsed.html, /<html|<!DOCTYPE html/i);
  });
}

for (let size = 1; size <= 12; size++) {
  test(`SSE decoder round-trips with chunk size ${size}`, () => {
    const html = "<html>\n<body>\n<p>hello</p>\n</body>\n</html>";
    const frame = encodeSseEvent(event.artifactSnapshot("art_1", html));
    const decoder = new SseDecoder();
    const out = [];
    for (let i = 0; i < frame.length; i += size) {
      out.push(...decoder.push(frame.slice(i, i + size)));
    }
    out.push(...decoder.flush());
    assert.equal(out.length, 1);
    assert.equal(out[0].html, html);
  });
}

for (let i = 0; i < 12; i++) {
  test(`streaming envelope parser detects bare HTML after prefix ${i}`, () => {
    const parser = new StreamingEnvelopeParser();
    const prefix = "x".repeat(i);
    const events = [
      ...parser.feed(prefix + "```html\n<!DOC"),
      ...parser.feed("TYPE html><html><body><p>x"),
      ...parser.flush(),
    ];
    assert.equal(events.some((ev) => ev.kind === "artifact_open"), true);
    assert.equal(
      events.filter((ev) => ev.kind === "artifact").map((ev) => ev.delta).join("").startsWith("<!DOCTYPE html>"),
      true,
    );
  });
}

const progressiveDocs = [
  ["signup", "<body><form><label>Email</label><input type=\"email\">"],
  ["pricing", "<body><main><section><h1>Pricing</h1><article><p>$19"],
  ["invoice", "<body><table><tr><th>Item<th>Total<tr><td>Design<td>$900"],
  ["resume", "<body><main><header><h1>Ada</h1><p>Designer<section><h2>Work"],
  ["dashboard", "<body><main><section><svg><rect width=\"10\" height=\"10\"></rect>"],
  ["email", "<body><table><tr><td><h1>Welcome</h1><p>Confirm"],
  ["landing", "<body><header><nav><a href=\"#\">Home</a><main><h1>Launch"],
  ["faq", "<body><details><summary>What is Netra?</summary><p>A parser"],
  ["timeline", "<body><ol><li>Plan<li>Build<li>Ship"],
  ["comparison", "<body><section><div><h2>Free</h2><p>$0<div><h2>Pro"],
];

for (const [name, html] of progressiveDocs) {
  test(`artifact buffer creates progressive snapshot for ${name} artifact`, () => {
    const buffer = new ArtifactBuffer();
    for (let i = 0; i < html.length; i += 11) {
      buffer.append(html.slice(i, i + 11));
      buffer.commit();
    }
    assert.ok(buffer.lastValidSnapshot.length > 0);
    assert.equal(buffer.raw, html);
  });
}
