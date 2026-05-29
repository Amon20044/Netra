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

test("classifyByRules routes visual UI requests to html_artifact", () => {
  assert.equal(classifyByRules("Build a pricing page for a SaaS").mode, "html_artifact");
  assert.equal(classifyByRules("Create an invoice for my client").mode, "html_artifact");
  assert.equal(classifyByRules("Make a contact form").mode, "html_artifact");
  assert.equal(classifyByRules("Design a dashboard with stat cards").mode, "html_artifact");
});

test("classifyByRules falls back to markdown on empty/ambiguous input", () => {
  assert.equal(classifyByRules("").mode, "markdown");
  assert.equal(classifyByRules("hello there").mode, "markdown");
});
