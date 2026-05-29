import type { ArtifactMode } from "../types/stream.js";

export interface RuleClassification {
  mode: ArtifactMode;
  reason: string;
  /** 0..1 — how confident the heuristic is. */
  confidence: number;
}

/**
 * Phrases that strongly suggest a visual, self-contained HTML/CSS preview adds
 * real value over plain text.
 */
const VISUAL_SIGNALS: RegExp[] = [
  /\blanding\s*page\b/i,
  /\bdashboard\b/i,
  /\binvoice\b/i,
  /\breceipt\b/i,
  /\bresume\b|\bcv\b/i,
  /\bemail\s*template\b/i,
  /\bpricing\s*(card|table|page)\b/i,
  /\bproduct\s*(page|card)\b/i,
  /\bprofile\s*card\b/i,
  /\bbusiness\s*card\b/i,
  /\bonboarding\s*(screen|flow)\b/i,
  /\b(ui|html)\s*(mockup|preview|layout|design)\b/i,
  /\bcomparison\s*(table|view|cards?)\b/i,
  /\bstat(s|istic)?\s*(card|view|grid)\b/i,
  /\bportfolio\b/i,
  /\bnewsletter\b/i,
  /\bgenerative\s*ui\b/i,
  /\b(interface|ui)\s*(kit|system|concept|exploration|variations?|combinations?)\b/i,
  /\b(combinations?|variations?|states?)\b[\s\S]*\b(ui|interface|layout|screen|component)\b/i,
  /\bbeautiful\b[\s\S]*\b(ui|interface|layout|screen|component|dashboard|page)\b/i,
  /\bstatic\s*(app|interface|experience|prototype)\b/i,
  /\bvisual\s*(prototype|concept|system|kit|exploration)\b/i,
  /\bcertificate\b/i,
  /\bmenu\b.*\b(restaurant|cafe|food)\b/i,
  /\btimeline\b/i,
  /\bgallery\b/i,
  /\b(bar|line|pie|donut|doughnut)\s*chart\b/i,
  /\b(report|stats?)\s*(visuali[sz]ation|view)\b/i,
  /\bsign[\s-]?up\s*form\b|\blogin\s*form\b|\bcontact\s*form\b/i,
  /\b(build|create|make|generate|design|render|show me|mock up|wireframe)\b[\s\S]*\b(page|form|card|table|layout|widget|view|screen|template|ui|website|webpage|section|hero|banner)\b/i,
  /\b(build|create|make|generate|design|render|show me|mock up|wireframe)\b[\s\S]*\b(app|interface|component|prototype|artifact|visual)\b/i,
];

/**
 * Requests that should blend into the host chat/application rather than render
 * as a standalone document card.
 */
const GENERATIVE_UI_SIGNALS: RegExp[] = [
  /\bgenerative\s*ui\b/i,
  /\bcamouflage\b/i,
  /\btransparent\b/i,
  /\bshowcase\b/i,
  /\bblend(s|ing)?\s*(in|into|with)?\b[\s\S]*\b(chat|host|ui|app)\b/i,
  /\bsit(s|ting)?\s*(on|in|inside)\b[\s\S]*\b(chat|host|app|page)\b/i,
  /\binline\s*(ui|interface|component|artifact|preview)\b/i,
  /\b(seamless|camouflage|native|chromeless)\s*(ui|interface|component|artifact|preview|gen|generation)?\b/i,
  /\b(component|widget)\b/i,
  /\b(app|interface)\s*(prototype|concept|exploration|variations?|states?)\b/i,
  /\b(ui|interface)\s*(kit|system|concept|exploration|variations?|combinations?)\b/i,
  /\b(combinations?|variations?|states?)\b[\s\S]*\b(ui|interface|screen|component)\b/i,
  /\ball\s+(the\s+)?(combinations?|variations?|components?|states?)\b/i,
  /\bstatic\s*(app|interface|experience|prototype)\b/i,
  /\bvisual\s*(prototype|concept|system|kit|exploration)\b/i,
];

/** Phrases that strongly suggest a text answer is the right output. */
const TEXTUAL_SIGNALS: RegExp[] = [
  /\bexplain\b|\bexplanation\b/i,
  /\bwhy\b|\bhow\s+(do|does|can|should|would|to)\b/i,
  /\bwhat\s+is\b|\bwhat\s+are\b|\bwhat'?s\b/i,
  /\bdebug\b|\bfix\b|\berror\b|\bstack\s*trace\b|\bexception\b/i,
  /\bdifference\s+between\b|\bcompare\b(?!.*\bcards?\b)/i,
  /\barchitecture\b|\bsystem\s*design\b|\bdesign\s*pattern\b/i,
  /\bbest\s*practice\b|\badvice\b|\brecommend\b|\bshould\s+i\b/i,
  /\brefactor\b|\boptimi[sz]e\b|\bperformance\b/i,
  /\bwrite\s+(a\s+)?(function|class|script|query|regex|algorithm|sql|test)\b/i,
  /\bsummari[sz]e\b|\bdefine\b|\bmeaning\s+of\b/i,
  /\bpros\s+and\s+cons\b|\btrade[\s-]?offs?\b/i,
];

/**
 * Cheap, deterministic classification used as a pre-check and as a fallback
 * when model-based classification is unavailable or fails.
 */
export function classifyByRules(query: string): RuleClassification {
  const text = (query ?? "").trim();
  if (!text) {
    return { mode: "markdown", reason: "Empty query", confidence: 0.5 };
  }

  let visual = 0;
  let generative = 0;
  let textual = 0;
  for (const re of VISUAL_SIGNALS) if (re.test(text)) visual++;
  for (const re of GENERATIVE_UI_SIGNALS) if (re.test(text)) generative++;
  for (const re of TEXTUAL_SIGNALS) if (re.test(text)) textual++;

  if (visual === 0 && generative === 0 && textual === 0) {
    return {
      mode: "markdown",
      reason: "No strong visual signal; defaulting to text",
      confidence: 0.4,
    };
  }

  if (visual > textual || generative > textual) {
    return {
      mode: generative > 0 ? "generative_ui" : "artifact",
      reason:
        generative > 0
          ? `Matched ${generative} generative UI signal(s)`
          : `Matched ${visual} visual signal(s)`,
      confidence: Math.min(0.5 + 0.15 * Math.max(visual, generative - textual), 0.95),
    };
  }

  return {
    mode: "markdown",
    reason:
      textual >= visual
        ? `Matched ${textual} textual signal(s)`
        : "Leaning textual",
    confidence: Math.min(0.5 + 0.15 * (textual - visual), 0.95),
  };
}
