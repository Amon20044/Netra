import { test } from "node:test";
import assert from "node:assert/strict";
import {
  streamHtmlArtifactFromTextStream,
} from "../dist/server/index.js";

const sanitize = {
  allowForms: true,
  allowScripts: false,
  allowInlineStyles: true,
  allowStyleTags: true,
  allowSvg: true,
  allowExternalFonts: false,
};

async function* chunks(parts) {
  for (const part of parts) yield part;
}

test("provider-agnostic text stream emits artifact lifecycle", async () => {
  const events = [];
  const result = await streamHtmlArtifactFromTextStream(
    {
      sanitize,
      snapshotIntervalMs: 0,
      textStream: chunks([
        "<assistant_message>Here</assistant_message>",
        '<html_artifact title="Signup">',
        "<!DOCTYPE html><html><body><form>",
        '<label for="email">Email</label><input id="email" type="email">',
        "</form></body></html></html_artifact>",
      ]),
    },
    (event) => events.push(event),
  );

  assert.ok(result.messageId.startsWith("msg_"));
  assert.ok(result.artifactId.startsWith("art_"));
  assert.match(result.finalHtml, /<form>[\s\S]*Email[\s\S]*<\/form>/);
  assert.equal(events.some((event) => event.type === "artifact_start"), true);
  assert.equal(events.some((event) => event.type === "artifact_delta"), true);
  assert.equal(events.some((event) => event.type === "artifact_snapshot"), true);
  assert.equal(events.at(-1).type, "artifact_done");
});

test("provider-agnostic text stream recovers bare HTML", async () => {
  const events = [];
  const result = await streamHtmlArtifactFromTextStream(
    {
      sanitize,
      snapshotIntervalMs: 0,
      textStream: chunks([
        "```html\n<!DOCTYPE html><html><body><main><h1>Hello",
        "</h1></main></body></html>\n```",
      ]),
    },
    (event) => events.push(event),
  );

  assert.match(result.finalHtml, /<h1>Hello<\/h1>/);
  assert.equal(events.some((event) => event.type === "artifact_start"), true);
});
