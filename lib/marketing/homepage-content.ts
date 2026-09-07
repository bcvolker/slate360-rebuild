/**
 * Homepage content — single source of truth for the marketing page.
 * Adding a future app = append one entry to MARKETING_APPS.
 * Plain-English register: no jargon (no "splatting", "photogrammetry",
 * "rasterization") on the homepage; depth lives on Learn More pages.
 */


export type DemoStep = {
  image: string;
  /** Tap indicator position as % of the screen, from top-left. */
  tapX: number;
  tapY: number;
  caption: string;
};

export type MarketingAppContent = {
  id: "site-walk" | "twin-360";
  name: string;
  accentVar: "--graphite-primary" | "--twin360-blue";
  headline: string;
  subhead: string;
  capabilities: { title: string; description: string }[];
  demoLabel: string;
  demoSteps: DemoStep[];
  cta: { label: string; href: string };
};

export const MARKETING_HERO = {
  eyebrow: "Built for the building industry",
  titleLine1: "Capture the site.",
  titleLine2: "Keep the twin.",
  subhead:
    "We document construction sites as dated visits — walkthroughs, drawings, and explorable twins your team shares by link. Owners do not need an app.",
  primaryCta: { label: "Request a site visit", href: "/contact" },
  secondaryCta: { label: "See how it works", href: "#apps" },
} as const;

export const MARKETING_APPS: MarketingAppContent[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    accentVar: "--graphite-primary",
    headline: "Walk the job. It documents itself.",
    subhead:
      "Photos, voice notes, and pins organized stop by stop as you move through the site — then turned into reports your client can actually use.",
    capabilities: [
      {
        title: "Capture as you walk",
        description:
          "Point, shoot, keep moving. Every photo lands in order with its notes, markups, and pinned details attached.",
      },
      {
        title: "Speak instead of type",
        description:
          "Voice notes become written text automatically, so documentation keeps pace with your walk.",
      },
      {
        title: "Pin it to the plan",
        description:
          "On Pro, drop pins straight onto your drawings so every observation lives exactly where it happened.",
      },
      {
        title: "Reports they can step inside",
        description:
          "Send a link, not an attachment. Clients tap any photo to see every angle, note, and pin — live in their browser.",
      },
    ],
    demoLabel: "Watch a walk",
    demoSteps: [
      {
        image: "/marketing/demo/site-walk-1-capture.png",
        tapX: 50,
        tapY: 88,
        caption: "Tap the shutter — that's a stop",
      },
      {
        image: "/marketing/demo/site-walk-2-pin.png",
        tapX: 50,
        tapY: 42,
        caption: "Long-press to pin a detail",
      },
      {
        image: "/marketing/demo/site-walk-3-details.png",
        tapX: 70,
        tapY: 24,
        caption: "Speak your note — it types itself",
      },
      {
        image: "/marketing/demo/site-walk-4-review.png",
        tapX: 50,
        tapY: 90,
        caption: "End the walk — share the link",
      },
    ],
    cta: { label: "Request a site visit", href: "/contact" },
  },
  {
    id: "twin-360",
    name: "Twin 360",
    accentVar: "--twin360-blue",
    headline: "Walk through it once. Keep it forever.",
    subhead:
      "Record a short video walking the space — we turn it into a 3D model anyone can explore from a link. No special hardware required.",
    capabilities: [
      {
        title: "Just press record",
        description:
          "Walk the space with your phone, then submit the walkthrough for processing.",
      },
      {
        title: "Captured by us, not by your crew",
        description:
          "We bring the capture kit and walk the space; your team keeps building. Every visit is dated and filed under the project.",
      },
      {
        title: "Share an interactive link",
        description:
          "Send clients and stakeholders a link they open in any browser — they orbit, walk through, and inspect the space themselves. No app, no download, no login.",
      },
      {
        title: "Clean it up before you share",
        description:
          "The desktop studio editor lets you crop and erase stray geometry from a scan before you send the link.",
      },
      {
        title: "More than a model — a studio of deliverables",
        description:
          "The Twin 360 Studio on the dashboard turns a capture into a 2D floor plan and a progression timeline against earlier scans of the same space — with more deliverable types on the way.",
      },
    ],
    demoLabel: "Watch a scan",
    demoSteps: [
      {
        image: "/marketing/demo/twin-1-record.png",
        tapX: 50,
        tapY: 90,
        caption: "Your walk comes in as a 3D scan",
      },
      {
        image: "/marketing/demo/twin-2-ghost.png",
        tapX: 50,
        tapY: 88,
        caption: "Organize it and submit — the visit files under the project",
      },
    ],
    cta: { label: "Request a site visit", href: "/contact" },
  },
];

export const MARKETING_DELIVERABLE_STRIP = {
  title: "Send a link, not an attachment",
  steps: [
    {
      title: "Capture",
      description: "Walk the site with the phone already in your pocket.",
    },
    {
      title: "It becomes interactive",
      description: "Photos, pins, and twins assemble themselves into something you can step inside.",
    },
    {
      title: "Share the link",
      description: "Clients open it in a browser and explore on their own — no app, no login.",
    },
  ],
} as const;

export const MARKETING_FAQ = [
  {
    q: "What do we actually receive?",
    a: "A branded project portal your team shares by link: dated 360 walkthroughs, high-resolution 360 documentation stations pinned to your drawings, and — where the job calls for it — an explorable 3D twin. Items, questions and documents live at their exact location in the space.",
  },
  {
    q: "Do owners, architects or trades need an account?",
    a: "No. Everything opens from a regular link in any browser — no app, no download, no login. You control who gets which link, and links can expire or be revoked.",
  },
  {
    q: "Can we put our own brand on it?",
    a: "Yes. The portal and every shared view carry your logo and colours, so what your owner sees is your documentation, delivered by you.",
  },
  {
    q: "How accurate is the 3D twin?",
    a: "Twins are estimating-grade for visual coordination and quantity checks. Where scale is anchored on site we say so in the deliverable; critical dimensions should always be verified with a laser. Where a legal dimension is required, a laser governs.",
  },
  {
    q: "How often should a site be documented?",
    a: "Most teams document before cover-up and at regular intervals — weekly or biweekly on active floors. Every visit files under the same project, so conditions can be compared over time.",
  },
] as const;
