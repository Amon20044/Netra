import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeSseEvent, SseDecoder, event } from "../dist/index.js";

test("SSE encode/decode round-trips an event", () => {
  const original = event.artifactDelta("art_1", "<div>chunk</div>");
  const frame = encodeSseEvent(original);
  const decoder = new SseDecoder();
  const decoded = decoder.push(frame);
  assert.equal(decoded.length, 1);
  assert.deepEqual(decoded[0], original);
});

test("SseDecoder handles events split across chunks", () => {
  const frame = encodeSseEvent(event.mode("html_artifact"));
  const decoder = new SseDecoder();
  const mid = Math.floor(frame.length / 2);
  assert.equal(decoder.push(frame.slice(0, mid)).length, 0);
  const out = decoder.push(frame.slice(mid));
  assert.equal(out.length, 1);
  assert.equal(out[0].type, "mode");
});

test("SseDecoder preserves multi-line HTML payloads", () => {
  const html = "<html>\n<body>\nline\n</body>\n</html>";
  const frame = encodeSseEvent(event.artifactDone("a", html));
  const decoder = new SseDecoder();
  const [decoded] = decoder.push(frame);
  assert.equal(decoded.html, html);
});
