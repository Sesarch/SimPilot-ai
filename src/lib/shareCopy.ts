/**
 * Single source of truth for social-share copy (Open Graph + Twitter Card)
 * per canonical route.
 *
 * SEOHead reads this automatically: any page that passes a `canonical` path
 * with an entry here will get the curated share title/description on
 * Facebook, LinkedIn, Slack, iMessage, X/Twitter, Discord, etc. — without
 * disturbing the SEO `<title>` or meta description (those typically need
 * keywords; share copy needs a hook).
 *
 * Usage rules:
 *   • title       — punchy, ≤ 70 chars (Facebook truncates at ~88,
 *                   Twitter at 70, LinkedIn at 100). The site name is
 *                   appended automatically by SEOHead if not present.
 *   • description — conversational, ≤ 200 chars (Facebook ~200, Twitter
 *                   ~200, LinkedIn ~250). Lead with value, not features.
 *
 * Pages may still pass `shareTitle` / `shareDescription` props directly to
 * SEOHead to override the registry entry. When neither the registry nor
 * the props provide values, SEOHead falls back to the SEO `title` /
 * `description` so previews never go blank.
 */

export type ShareCopy = {
  title: string;
  description: string;
};

/** Hard caps enforced by validateShareCopy() and the live test suite. */
export const SHARE_TITLE_MAX = 70;
export const SHARE_DESCRIPTION_MAX = 200;

export const SHARE_COPY_BY_PATH: Record<string, ShareCopy> = {
  "/": {
    title: "Train smarter. Pass your checkride.",
    description:
      "Your AI co-pilot for ground school, oral exams and FAA written prep — available 24/7. Built by pilots, for pilots.",
  },
  "/why-simpilot": {
    title: "Why student pilots choose SimPilot.AI",
    description:
      "A Socratic AI flight instructor that adapts to your aircraft, ratings and weak spots. See what makes us different.",
  },
  "/competitors": {
    title: "SimPilot.AI vs. the rest",
    description:
      "How SimPilot.AI compares to Sporty's, King Schools, Gleim and other pilot training platforms — feature-by-feature.",
  },
  "/for-schools": {
    title: "Bulk plans for flight schools and CFIs",
    description:
      "Equip every student with an AI ground-school instructor. Volume pricing, school dashboards and CFI oversight built in.",
  },
  "/contact": {
    title: "Talk to the SimPilot.AI team",
    description:
      "Questions about training, schools or partnerships? Reach the team behind your AI co-pilot.",
  },
  "/terms": {
    title: "SimPilot.AI Terms of Service",
    description:
      "The legal terms covering your use of SimPilot.AI, including the supplemental-training disclaimer.",
  },
  "/privacy": {
    title: "Your privacy on SimPilot.AI",
    description:
      "How SimPilot.AI collects, uses and protects pilot data — including chat history, uploads and usage analytics.",
  },
  // noIndex but still curated for DM/Slack/iMessage previews
  "/auth": {
    title: "Sign in to SimPilot.AI",
    description: "Access your AI flight instructor, training history and progress.",
  },
  "/dashboard": {
    title: "Your flight deck",
    description:
      "Personalised training dashboard — ground school progress, oral exam history and checkride readiness at a glance.",
  },
  "/ground-school": {
    title: "AI Ground One-on-One — 19 modules from PPL to ATP",
    description:
      "Interactive, Socratic ground school covering regulations, weather, navigation, systems and more — adaptive to your aircraft.",
  },
  "/oral-exam": {
    title: "Oral exam simulator with a real CFI personality",
    description:
      "Practice the checkride oral with an AI that asks follow-up questions, scores your answers and pinpoints weak ACS codes.",
  },
  "/weather-briefing": {
    title: "AI weather briefing for any flight",
    description:
      "Plain-English METAR, TAF and SIGMET analysis tailored to your route, aircraft and pilot certificates.",
  },
  "/live-tools": {
    title: "Live Sky — real-time aviation tools",
    description:
      "Track flights, look up tail numbers, simulate ATC and run live weather briefings from one cockpit-style dashboard.",
  },
  "/session-history": {
    title: "Your training session history",
    description: "Every chat, every oral exam, every checkride drill — searchable and shareable.",
  },
  "/progress": {
    title: "Your checkride readiness",
    description:
      "ACS-coded progress tracking across ground school, oral exam and weak-area drills — with a live readiness gauge.",
  },
};

export const DEFAULT_SHARE_COPY: ShareCopy = SHARE_COPY_BY_PATH["/"];

export type ResolvedShareCopy = ShareCopy & {
  /** True when the copy came from the registry (or an override) rather than
   *  the SEO title/description fallback. Useful for tests and admin tooling. */
  fromRegistry: boolean;
};

/**
 * Resolve share copy with this precedence:
 *   1. Explicit override (per-page `shareTitle` / `shareDescription` props)
 *   2. Registry entry for the canonical path
 *   3. Caller-supplied SEO fallbacks (the `<title>` / meta description)
 */
export function resolveShareCopy(args: {
  canonical?: string;
  overrideTitle?: string;
  overrideDescription?: string;
  fallbackTitle: string;
  fallbackDescription: string;
}): ResolvedShareCopy {
  const entry =
    (args.canonical && SHARE_COPY_BY_PATH[args.canonical]) || undefined;
  const title = args.overrideTitle ?? entry?.title ?? args.fallbackTitle;
  const description =
    args.overrideDescription ?? entry?.description ?? args.fallbackDescription;
  return {
    title,
    description,
    fromRegistry: Boolean(entry || args.overrideTitle || args.overrideDescription),
  };
}

/** Returns an array of human-readable problems, or [] if the copy is valid. */
export function validateShareCopy(copy: ShareCopy): string[] {
  const issues: string[] = [];
  if (!copy.title.trim()) issues.push("title is empty");
  if (!copy.description.trim()) issues.push("description is empty");
  if (copy.title.length > SHARE_TITLE_MAX) {
    issues.push(`title is ${copy.title.length} chars (> ${SHARE_TITLE_MAX})`);
  }
  if (copy.description.length > SHARE_DESCRIPTION_MAX) {
    issues.push(
      `description is ${copy.description.length} chars (> ${SHARE_DESCRIPTION_MAX})`,
    );
  }
  return issues;
}
