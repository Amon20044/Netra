/**
 * Root entry — isomorphic exports only (no React, no AI SDK import), safe to
 * pull into any environment. Use the `./server` and `./client` subpaths for
 * the AI-SDK and React surfaces respectively.
 */
export * from "./types/index.js";
export * from "./stream/index.js";
export * from "./sanitizer/index.js";
export * from "./artifacts/index.js";
export * from "./constants/index.js";
export * from "./utils/index.js";
export * from "./errors/index.js";
export * from "./prompts/index.js";

// Heuristic classifier + prompt are dependency-free; the model-based
// `classifyMode` lives behind the `./server` entry (it imports the AI SDK).
export { classifyByRules, type RuleClassification } from "./classifier/rules.js";
export {
  CLASSIFIER_SYSTEM_PROMPT,
  buildClassifierUserPrompt,
} from "./classifier/classifierPrompt.js";

// Circuit breaker is isomorphic.
export {
  CircuitBreaker,
  MemoryCircuitStore,
  defaultCircuitStore,
} from "./circuit-breaker/index.js";

// Core stream/response helpers (framework-agnostic).
export {
  createMessageId,
  createArtifactId,
  MessageLifecycle,
  ArtifactLifecycle,
  createArtifactStream,
  createArtifactResponse,
  SSE_HEADERS,
  type Emit,
  type ArtifactStreamProducer,
} from "./core/index.js";
