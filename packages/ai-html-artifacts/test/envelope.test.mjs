import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArtifactEnvelope, StreamingEnvelopeParser } from "../dist/index.js";

const ENVELOPE = `<assistant_message>
Here's a simple card.
</assistant_message>

<html_artifact title="Profile Card">
<!DOCTYPE html>
<html><head><title>Card</title></head><body><h1>Hi</h1></body></html>
</html_artifact>`;

test("parseArtifactEnvelope extracts message, title, and html", () => {
  const result = parseArtifactEnvelope(ENVELOPE);
  assert.equal(result.hasArtifact, true);
  assert.equal(result.title, "Profile Card");
  assert.match(result.assistantMessage, /simple card/);
  assert.match(result.html, /<!DOCTYPE html>/);
  assert.match(result.html, /<h1>Hi<\/h1>/);
});

test("parseArtifactEnvelope fails open on garbage without throwing", () => {
  const result = parseArtifactEnvelope("not <<< valid >>> at all");
  assert.equal(result.hasArtifact, false);
  assert.ok(typeof result.assistantMessage === "string");
});

test("parseArtifactEnvelope recovers a bare HTML document", () => {
  const result = parseArtifactEnvelope("<!DOCTYPE html><html><body>x</body></html>");
  assert.equal(result.hasArtifact, true);
  assert.match(result.html, /<body>x<\/body>/);
});

test("parseArtifactEnvelope cleans markdown fences around bare HTML", () => {
  const result = parseArtifactEnvelope(
    "```html\n<!DOCTYPE html><html><body>x</body></html>\n```",
  );
  assert.equal(result.hasArtifact, true);
  assert.equal(result.html, "<!DOCTYPE html><html><body>x</body></html>");
});

test("parseArtifactEnvelope cleans markdown fences inside artifact content", () => {
  const result = parseArtifactEnvelope(
    '<html_artifact title="T">```html\n<!DOCTYPE html><html><body>x</body></html>\n```</html_artifact>',
  );
  assert.equal(result.hasArtifact, true);
  assert.equal(result.html, "<!DOCTYPE html><html><body>x</body></html>");
});

test("StreamingEnvelopeParser splits message and artifact across chunks", () => {
  const parser = new StreamingEnvelopeParser();
  const events = [];
  for (const chunk of ["<assistant_mess", "age>Hello</assistant_message>", "<html_artifact title=\"T\">", "<p>hi</p>", "</html_artifact>"]) {
    events.push(...parser.feed(chunk));
  }
  events.push(...parser.flush());

  const kinds = events.map((e) => e.kind);
  assert.ok(kinds.includes("message"));
  assert.ok(kinds.includes("artifact_open"));
  assert.ok(kinds.includes("artifact"));

  const open = events.find((e) => e.kind === "artifact_open");
  assert.equal(open.title, "T");
});

test("StreamingEnvelopeParser starts an artifact for bare HTML", () => {
  const parser = new StreamingEnvelopeParser();
  const events = [];
  for (const chunk of ["```html\n<!DOCT", "YPE html><html><body><p>hi"]) {
    events.push(...parser.feed(chunk));
  }
  events.push(...parser.flush());

  assert.equal(events[0].kind, "artifact_open");
  assert.equal(events[0].title, "Untitled artifact");
  assert.equal(
    events.filter((e) => e.kind === "artifact").map((e) => e.delta).join(""),
    "<!DOCTYPE html><html><body><p>hi",
  );
});
