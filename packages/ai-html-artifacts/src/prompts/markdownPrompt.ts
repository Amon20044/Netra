import { BASE_SYSTEM_PROMPT } from "./systemPrompt.js";

/** System prompt for plain markdown chat answers. */
export const MARKDOWN_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

You are answering in MARKDOWN mode. Reply with a normal, well-structured markdown message:
- Use headings, lists, and tables where they help.
- Use fenced code blocks for code.
- Be direct and avoid filler.
- Do NOT emit any <assistant_message> or <html_artifact> tags in this mode — just write the markdown answer.`;
