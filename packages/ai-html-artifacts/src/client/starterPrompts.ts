/**
 * Prebuilt starter prompts shown below the composer. Each has a short `label`
 * (the chip the user sees) and a rich `prompt` (the detailed message actually
 * sent to the model). `body` carries per-request overrides merged into the POST
 * body by `sendMessage` — e.g. `{ game: true }` or `{ mode: "generative_ui" }`.
 *
 * NOTE: for the `body` overrides to take effect, the server route must forward
 * those fields into `createArtifactStreamResponse` options, e.g.:
 *   `createArtifactStreamResponse({ ...(await req.json()), generateTextStream })`.
 */
export interface StarterPrompt {
  /** Stable id. */
  id: string;
  /** Short chip text shown to the user. */
  label: string;
  /** One-line description of what it produces. */
  hint: string;
  /** Leading glyph for the chip. */
  emoji: string;
  /** The full, detailed message sent to the chat. */
  prompt: string;
  /** Per-request body overrides merged into the POST body for this prompt. */
  body?: Record<string, unknown>;
}

/** YouTube videos used by the video-embed starter. */
const VIDEO_URLS = [
  "https://www.youtube.com/embed/dQw4w9WgXcQ?si=O39oVkrE_1PpJrRX",
  "https://www.youtube.com/embed/_e8BFrAPedM?si=L3FxEEFbGARDVAtG",
  "https://www.youtube.com/embed/H7gWCJNPpzk?si=trRfbxLq0ercujsX",
  "https://www.youtube.com/embed/wQs0uhFhMaI?si=iFm1GedCmKw5SsGi",
  "https://www.youtube.com/embed/glXx2r3ePcs?si=1iALmW5BiMPvEpTi",
];

/** Prebuilt generative-UI data payload (kept realistic and complete). */
const ORDER_JSON = JSON.stringify(
  {
    order: { id: "NX-48217", placed: "2026-05-28T14:02:00Z", status: "out_for_delivery", eta: "2026-05-30T18:00:00Z" },
    customer: { name: "Aria Nakamura", tier: "Gold" },
    shipment: {
      carrier: "Aerolane",
      tracking: "AL93 4471 0028",
      steps: [
        { label: "Ordered", at: "May 28, 2:02 PM", done: true },
        { label: "Packed", at: "May 28, 7:40 PM", done: true },
        { label: "Shipped", at: "May 29, 9:15 AM", done: true },
        { label: "Out for delivery", at: "May 30, 8:10 AM", done: true },
        { label: "Delivered", at: "Est. May 30, 6:00 PM", done: false },
      ],
    },
    items: [
      { name: "Aurora Wireless Headphones", qty: 1, price: 248.0, image: "headphones" },
      { name: "USB-C Braided Cable (2m)", qty: 2, price: 19.0, image: "cable" },
    ],
    totals: { subtotal: 286.0, shipping: 0, tax: 22.88, total: 308.88, currency: "USD" },
  },
  null,
  2,
);

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "artifact-dashboard",
    label: "Analytics dashboard",
    hint: "Rich HTML artifact",
    emoji: "📊",
    body: { mode: "artifact" },
    prompt:
      "Design a polished dark-mode SaaS analytics dashboard as a single self-contained HTML artifact. Include: a top bar with product name, a time-range selector, and a search; a row of 4 KPI cards (Revenue $48.9K +4.2%, Active Users 12,480 +1.8%, Churn 1.9% -0.3%, MRR $61.2K +5.1%) each with a tiny inline sparkline; a large area/line chart of revenue over 12 months drawn with inline SVG; a donut chart of traffic sources; and a recent-transactions table with status pills. Use a confident accent color, soft gradients, hairline borders, generous spacing, and precomputed realistic numbers. Make it fully responsive and compact on phones.",
  },
  {
    id: "markdown-explainer",
    label: "Explain a concept",
    hint: "Formatted markdown answer",
    emoji: "📝",
    body: { mode: "markdown" },
    prompt:
      "Explain how CSS Flexbox vs CSS Grid differ and when to use each. Answer in well-structured markdown: a short intro, an H2 for each, bullet lists of strengths, a comparison table (axis, alignment, use case), a fenced ```css code block showing a holy-grail layout with Grid, and a final 'rule of thumb' callout. Keep it practical and skimmable.",
  },
  {
    id: "game-runner",
    label: "Make a 3D game",
    hint: "Playable three.js game",
    emoji: "🎮",
    body: { game: true },
    prompt:
      "Build a complete, playable single-file three.js endless-runner game. The player is a glowing cube on a neon grid lane that auto-runs forward; left/right (A/D or arrows, plus on-screen touch buttons) dodges oncoming obstacles, space jumps. Spawn obstacles and floating score orbs with object pooling, speed up over time, and detect collisions. Show a DOM HUD with score, a start menu, pause (Esc/P), and a game-over screen with restart. Use ACES tone mapping, ambient + directional light, a deliberate synthwave palette, screen-shake on hit, and a fixed-timestep loop. Make it genuinely fun.",
  },
  {
    id: "genui-order",
    label: "Render this JSON",
    hint: "Generative UI from data",
    emoji: "🧩",
    body: { mode: "generative_ui" },
    prompt:
      "Render this order-tracking data as a beautiful, embedded generative-UI component (seamless, transparent page — it sits inline in a dark chat). Show a header with order id and an 'Out for delivery' status pill, a horizontal stepper for the shipment steps (completed vs pending), the item list with quantities and prices (use small picsum thumbnails keyed off the image field), the carrier + tracking number, and a totals summary. Cards must have their own visible surface. Here is the data:\n\n```json\n" +
      ORDER_JSON +
      "\n```",
  },
  {
    id: "image-landing",
    label: "Travel landing page",
    hint: "Image-rich design",
    emoji: "🖼️",
    body: { mode: "artifact" },
    prompt:
      "Create a striking landing page for a boutique travel company called 'Wayfare' as a single HTML artifact. Full-bleed hero with a background photo (use https://picsum.photos/seed/wayfare/1920/1080), overlaid headline, subtext and a search-trip bar; a 3-up 'Featured destinations' card grid with different seeded picsum images (seed per card: kyoto, patagonia, lisbon), price-from labels and ratings; a testimonial; and a footer CTA. Editorial typography, warm palette, rounded cards, tasteful shadows. Every image responsive with aspect-ratio and alt text. Fully responsive.",
  },
  {
    id: "video-gallery",
    label: "Video watch page",
    hint: "YouTube embeds",
    emoji: "▶️",
    body: { mode: "artifact", allowVideoEmbeds: true },
    prompt:
      "Build a YouTube-style watch page as a single HTML artifact. A large primary player at the top embedding " +
      VIDEO_URLS[0] +
      ", with a title, channel row, and action buttons; then a 'Up next' list on the side/below with the remaining videos as clickable thumbnail cards that each embed their player in a responsive 16:9 wrapper. Embed these: " +
      VIDEO_URLS.slice(1).join(" , ") +
      ". Every iframe must use referrerpolicy=\"strict-origin-when-cross-origin\", loading=\"lazy\", allowfullscreen, and a black rounded wrapper. Dark UI, clean spacing, fully responsive.",
  },
  {
    id: "pricing",
    label: "SaaS pricing page",
    hint: "Conversion-focused design",
    emoji: "💳",
    body: { mode: "artifact" },
    prompt:
      "Design a modern 3-tier SaaS pricing section as a single HTML artifact: Starter $0, Pro $24/mo (highlighted 'Most popular' with a glow/badge and scale), and Scale $79/mo. Each card: price, billing note, a feature checklist with check icons, and a CTA button. Add a monthly/annual toggle (native, CSS-only or simple), a feature-comparison table below, and an FAQ using native <details>. Premium dark aesthetic, one accent color, strong hierarchy, accessible contrast, responsive (cards stack on mobile).",
  },
  {
    id: "signup-form",
    label: "Sign-up form",
    hint: "Polished form UI",
    emoji: "✍️",
    body: { mode: "artifact", allowForms: true },
    prompt:
      "Create a beautiful centered sign-up card as a single HTML artifact: brand mark, heading, social sign-in buttons (Google/GitHub with inline SVG icons), an 'or' divider, then fields for full name, email, and password with a visible strength hint, a terms checkbox, and a primary 'Create account' button, plus a 'Sign in' link. Style inputs with clear labels, comfortable padding, ≥44px targets, focus rings, and helpful inline validation styling (error/success states via CSS). Glassy card on a soft gradient background, fully responsive.",
  },
];
