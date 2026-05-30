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

test("HTML artifact prompt moves scripts after final style only when enabled", () => {
  const prompt = buildHtmlArtifactPrompt({ allowScripts: true });
  const bodyIndex = prompt.indexOf('<body style="margin:0;background:var(--bg);color:var(--fg)">');
  const styleIndex = prompt.indexOf("<style>", bodyIndex);
  const scriptIndex = prompt.indexOf("<script>", styleIndex);

  assert.ok(prompt.includes("with opt-in inline JavaScript"));
  assert.ok(prompt.includes("semantic body -> final <style> -> final inline <script>"));
  assert.ok(prompt.includes("No <script src>"));
  assert.ok(bodyIndex > -1);
  assert.ok(styleIndex > bodyIndex);
  assert.ok(scriptIndex > styleIndex);
});
