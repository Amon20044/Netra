import { test } from "node:test";
import assert from "node:assert/strict";
import { STARTER_PROMPTS } from "../dist/client/starterPrompts.js";

test("ships 8 starter prompts, each with a show label and a detailed prompt", () => {
  assert.equal(STARTER_PROMPTS.length, 8);
  const ids = new Set();
  for (const p of STARTER_PROMPTS) {
    assert.ok(p.id && !ids.has(p.id), `unique id: ${p.id}`);
    ids.add(p.id);
    assert.ok(p.label && p.label.length <= 24, "short show label");
    assert.ok(p.hint && p.emoji, "hint + emoji");
    // The detailed prompt is the real chat input — it must be substantial.
    assert.ok(p.prompt.length > 120, `detailed prompt for ${p.id}`);
  }
});

test("starter prompts carry the right per-feature body overrides", () => {
  const byId = Object.fromEntries(STARTER_PROMPTS.map((p) => [p.id, p]));
  assert.equal(byId["game-runner"].body.game, true);
  assert.equal(byId["markdown-explainer"].body.mode, "markdown");
  assert.equal(byId["genui-order"].body.mode, "generative_ui");
  assert.equal(byId["video-gallery"].body.allowVideoEmbeds, true);
  assert.equal(byId["artifact-dashboard"].body.mode, "artifact");
});

test("generative-UI starter embeds valid prebuilt JSON", () => {
  const genui = STARTER_PROMPTS.find((p) => p.id === "genui-order");
  const json = genui.prompt.match(/```json\n([\s\S]*?)\n```/);
  assert.ok(json, "has a ```json block");
  const data = JSON.parse(json[1]);
  assert.equal(data.order.id, "NX-48217");
  assert.ok(Array.isArray(data.shipment.steps) && data.items.length === 2);
});

test("video starter embeds the provided YouTube URLs with referrer guidance", () => {
  const video = STARTER_PROMPTS.find((p) => p.id === "video-gallery");
  assert.match(video.prompt, /youtube\.com\/embed\/dQw4w9WgXcQ/);
  assert.match(video.prompt, /youtube\.com\/embed\/glXx2r3ePcs/);
  assert.match(video.prompt, /referrerpolicy="strict-origin-when-cross-origin"/);
});
