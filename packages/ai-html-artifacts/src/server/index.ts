export { createArtifactStreamResponse } from "./createArtifactStreamResponse.js";
export { createSseResponse } from "./createSseResponse.js";
export { streamMarkdown } from "./createMarkdownStream.js";
export {
  streamHtmlArtifact,
  streamHtmlArtifactFromTextStream,
  type HtmlArtifactStreamResult,
  type HtmlArtifactTextStreamOptions,
} from "./createHtmlArtifactStream.js";
export { resolveServerConfig, latestUserText } from "./config.js";

// Re-export the pieces a server integrator commonly needs.
export { classifyMode, classifyByRules } from "../classifier/index.js";
export {
  CircuitBreaker,
  MemoryCircuitStore,
} from "../circuit-breaker/index.js";
export { sanitizeHtml, sanitize } from "../sanitizer/index.js";
export {
  parseArtifactEnvelope,
  StreamingEnvelopeParser,
} from "../artifacts/artifactEnvelope.js";
export {
  buildHtmlArtifactPrompt,
  HTML_ARTIFACT_SYSTEM_PROMPT,
  MARKDOWN_SYSTEM_PROMPT,
} from "../prompts/index.js";

export type * from "../types/index.js";
