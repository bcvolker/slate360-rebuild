/**
 * Homepage content — single source of truth for the marketing page.
 * Adding a future app = append one entry to MARKETING_APPS.
 * Plain-English register: no jargon (no "splatting", "photogrammetry",
 * "rasterization") on the homepage; depth lives on Learn More pages.
 */

import { cheapestCreditPack, formatCreditPackPrice } from "@/lib/billing/credit-packs";

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
    "Two independent apps for documenting real places — walk a job and it documents itself, or turn a short video into a 3D space anyone can explore from a link.",
  primaryCta: { label: "Start free", href: "/signup" },
  secondaryCta: { label: "See pricing", href: "#pricing" },
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
    cta: { label: "Try Site Walk free", href: "/signup?plan=site-walk-basic" },
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
        title: "Built for the camera in your pocket",
        description:
          "Works with any modern phone — and automatically uses your device's LiDAR sensor when available (iPhone Pro models) for sharper results.",
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
        caption: "Organize it and submit — your credits are shown up front",
      },
    ],
    cta: { label: "Try Twin 360 free", href: "/signup?plan=twin-360-essential" },
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
    q: "Do I need both apps?",
    a: "No — they're independent. Site Walk is for documenting work as you walk a job. Twin 360 is for turning spaces into explorable 3D models. Plenty of teams use just one. If you want both, the Bundle saves you money versus subscribing separately.",
  },
  {
    q: "What's a credit?",
    a: `Credits are how Twin 360 processing is measured. An average twin uses about 15 credits — smaller spaces use fewer and larger or higher-detail captures use more, depending on how much data you bring. Every Twin 360 plan includes a monthly allowance, and you can buy a credit pack anytime — packs start at ${formatCreditPackPrice(cheapestCreditPack())}, and prices are the same on the web and in the app.`,
  },
  {
    q: "Do my clients need an account to view what I send?",
    a: "No. Reports and twins open from a regular link in any browser — no app, no download, no login.",
  },
  {
    q: "Does it work without cell service?",
    a: "Yes. Site Walk keeps capturing offline and syncs everything when you're back in coverage.",
  },
  {
    q: "Do I need an iPhone Pro for Twin 360?",
    a: "No — any modern phone camera works. If your device has a LiDAR sensor (iPhone Pro models), Twin 360 uses it automatically for even sharper, true-to-scale results.",
  },
] as const;
