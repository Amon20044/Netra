import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyByRules } from "../dist/index.js";

test("classifyByRules routes explanations to markdown", () => {
  assert.equal(classifyByRules("Explain how recursion works").mode, "markdown");
  assert.equal(classifyByRules("Why is my function throwing an error?").mode, "markdown");
  assert.equal(
    classifyByRules("Write a SQL query to join two tables").mode,
    "markdown",
  );
});

test("classifyByRules routes standalone visual requests to artifact", () => {
  assert.equal(classifyByRules("Build a pricing page for a SaaS").mode, "artifact");
  assert.equal(classifyByRules("Create an invoice for my client").mode, "artifact");
  assert.equal(classifyByRules("Make a contact form").mode, "artifact");
  assert.equal(classifyByRules("Design a dashboard with stat cards").mode, "artifact");
  assert.equal(
    classifyByRules("Make a cinematic YouTube video player for https://youtu.be/Fij1aBcl_Ts").mode,
    "artifact",
  );
});

test("classifyByRules routes inline native UI requests to generative_ui", () => {
  assert.equal(classifyByRules("Make a generative UI component for onboarding").mode, "generative_ui");
  assert.equal(classifyByRules("Create seamless native UI states for a settings panel").mode, "generative_ui");
});

test("classifyByRules falls back to markdown on empty/ambiguous input", () => {
  assert.equal(classifyByRules("").mode, "markdown");
  assert.equal(classifyByRules("hello there").mode, "markdown");
});
