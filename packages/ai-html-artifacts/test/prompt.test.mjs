import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHtmlArtifactPrompt } from "../dist/server/index.js";

test("HTML artifact prompt asks for body-first streaming with final style", () => {
  const prompt = buildHtmlArtifactPrompt();
  const bodyIndex = prompt.indexOf('<body style="margin:0;background:var(--bg);color:var(--fg)">');
  const styleIndex = prompt.indexOf("<style>", bodyIndex);

  assert.ok(prompt.includes("<!doctype html>"));
  assert.ok(prompt.includes("<head> with only meta tags/title/minimal safety defaults"));
  assert.ok(prompt.includes("the LAST child of <body>"));
  assert.ok(prompt.includes("The page must still look good if that block is missing."));
  assert.ok(bodyIndex > -1);
  assert.ok(styleIndex > bodyIndex);
});
