/**
 * Prebuilt starter prompts shown below the composer. Each has a short `label`
 * (the chip the user sees) and a rich `prompt` (the detailed message actually
 * sent to the model). The prompts are written in a natural, human voice —
 * describing the desired RESULT, not implementation — so users never feel they
 * need to know any technical details. `body` carries per-request overrides
 * merged into the POST body by `sendMessage` (e.g. `{ game: true }`).
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
  /** The full, natural-language message sent to the chat. */
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
      { name: "Aurora Wireless Headphones", qty: 1, price: 248.0 },
      { name: "USB-C Braided Cable (2m)", qty: 2, price: 19.0 },
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
    hint: "A polished stats dashboard",
    emoji: "📊",
    body: { mode: "artifact" },
    prompt:
      "I run a small software company and I want a slick analytics dashboard to show off how we're doing. Up top, give me the headline numbers — revenue, active users, churn and monthly recurring revenue — each with a little sense of whether it's going up or down. Underneath, I'd love a big chart of revenue growing over the past year, a breakdown of where our traffic comes from, and a neat table of the latest sign-ups or transactions. Make it look premium and dark, the kind of screen a startup would screenshot and be proud of.",
  },
  {
    id: "markdown-explainer",
    label: "Explain a concept",
    hint: "A clear written explainer",
    emoji: "📝",
    body: { mode: "markdown" },
    prompt:
      "Explain the difference between Flexbox and CSS Grid like you're patiently teaching a junior developer who's a little confused. Keep it friendly and practical — when should I reach for one over the other? Walk me through each, give me a simple side-by-side comparison, show a tiny example or two, and finish with an easy rule of thumb I'll actually remember.",
  },
  {
    id: "game-runner",
    label: "Make a 3D game",
    hint: "A playable cartoon game",
    emoji: "🎮",
    body: { game: true },
    prompt:
      "Make me a fun little 3D game I can play right here in the browser. I'm picturing something bright and cartoonish — I control a bouncy little character and zip around a colorful world collecting glowing things while my score climbs and it slowly gets trickier. Give it a cheerful, toy-like look with a soft glow, a friendly start screen, a score counter, and the ability to pause and start over. Make it genuinely fun to mess around with for a minute.",
  },
  {
    id: "genui-order",
    label: "Turn data into a card",
    hint: "Generative UI from your data",
    emoji: "🧩",
    body: { mode: "generative_ui" },
    prompt:
      "I've got the details of a customer's order and I'd love it turned into a clean, friendly order-tracking card — the kind of thing the customer would see when they check 'where's my stuff'. Show how far along the delivery is, what they bought, and what it all came to, and make it feel calm and reassuring. Here's the order:\n\n```json\n" +
      ORDER_JSON +
      "\n```",
  },
  {
    id: "image-landing",
    label: "Travel landing page",
    hint: "A beautiful homepage",
    emoji: "🖼️",
    body: { mode: "artifact" },
    prompt:
      "Design a gorgeous homepage for a boutique travel company called Wayfare that plans dreamy, once-in-a-lifetime trips for people. I want a big, beautiful opening image with an inviting headline and a little 'where do you want to go?' search. Below that, show a few featured destinations as elegant cards with photos, a starting price and a rating, then a glowing quote from a happy traveler, and end with a warm invitation to join their list. Make the whole thing feel editorial, warm and high-end — like flipping through a luxury travel magazine.",
  },
  {
    id: "video-gallery",
    label: "Video watch page",
    hint: "A streaming-style page",
    emoji: "▶️",
    body: { mode: "artifact", allowVideoEmbeds: true },
    prompt:
      "Build me a video watch page like a streaming site. Put one big main video player at the top with its title and the channel underneath, and a list of more videos down the side (or below on a phone) as clickable thumbnails I can play. Use these videos — the first one as the main player and the rest in the 'up next' list:\n" +
      VIDEO_URLS.map((u) => `- ${u}`).join("\n") +
      "\nMake it clean and dark like a real video site.",
  },
  {
    id: "pricing",
    label: "Pricing page",
    hint: "Plans that convert",
    emoji: "💳",
    body: { mode: "artifact" },
    prompt:
      "I need a pricing page for my app with three plans — a free Starter to get people in the door, a Pro plan that's the one I really want most people to choose, and a bigger Scale plan for serious teams. Show what's included in each, make the Pro one clearly stand out as the popular pick, let people switch between paying monthly or yearly, and pop a short FAQ at the bottom for the usual questions. Make it modern and trustworthy so people feel confident hitting subscribe.",
  },
  {
    id: "signup-form",
    label: "Sign-up screen",
    hint: "A welcoming form",
    emoji: "✍️",
    body: { mode: "artifact", allowForms: true },
    prompt:
      "Create a beautiful sign-up screen for a modern app that feels genuinely welcoming. I'd like a clean card with the logo, quick options to continue with Google or GitHub, then the usual fields — name, email, and a password with a little hint about how strong it is — an agree-to-the-terms checkbox, and a big friendly 'Create account' button, with a small 'already have an account? sign in' link. Keep it soft, polished and inviting, sitting on a gentle gradient background.",
  },
];
