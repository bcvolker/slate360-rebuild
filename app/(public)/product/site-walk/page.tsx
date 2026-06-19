import { ProductPageShell } from "@/components/marketing-launchpad/ProductPageShell";

export const metadata = {
  title: "Site Walk — Slate360",
  description:
    "Mobile field capture, plan pinning, ghost progress overlays, offline-first capture, and shareable visual reports with two-way Q&A for construction site documentation.",
};

type Group = {
  eyebrow: string;
  title: string;
  lead: string;
  points: { label: string; body: string }[];
};

const GROUPS: Group[] = [
  {
    eyebrow: "Capture",
    title: "Document the site as you walk it",
    lead: "Open the app, walk the space, and capture conditions in real time. Every photo is bound to its project, timestamped, and geolocated — no loose pictures, no guessing later where a shot was taken.",
    points: [
      {
        label: "Photos with context",
        body: "Each photo carries its project, location, and time automatically, so the visual record is self-explaining months later.",
      },
      {
        label: "Notes alongside the shot",
        body: "Type field observations directly against the photo they describe — the detail and the evidence stay together.",
      },
      {
        label: "Voice memos",
        body: "Dictate hands-free while you work; memos attach to the stop and are transcribed for the report.",
      },
      {
        label: "Zero camera-roll clutter",
        body: "Project photos stay inside Slate360, not your personal camera roll — with secure export when you choose to share.",
      },
    ],
  },
  {
    eyebrow: "Plans & pins",
    title: "Pin every photo to the drawing",
    lead: "Bring your drawings and floor-plan sheets into the walk. Mark exactly where each observation lives so anyone reading the report knows the spot on the plan, not just the picture.",
    points: [
      {
        label: "Drop pins on sheets",
        body: "Long-press a drawing or plan sheet to place a high-visibility tracking pin at the precise location.",
      },
      {
        label: "Tap-to-place",
        body: "Tap the plan to mark where a photo was taken — the pin and the photo are linked both ways.",
      },
      {
        label: "Walk the plan",
        body: "Navigate the sheet during the walk and build a pinned map of conditions as you move through the space.",
      },
    ],
  },
  {
    eyebrow: "Progress",
    title: "Compare the same angle over time",
    lead: "Ghost overlays make repeat-visit documentation effortless — line up today's shot against a past one and capture true before/after progress.",
    points: [
      {
        label: "Transparent ghost view",
        body: "See a faded overlay of a previous photo on the live camera so you can match framing exactly.",
      },
      {
        label: "Repeat-angle capture",
        body: "Reshoot from the same vantage point on every visit to build a clean progress sequence.",
      },
    ],
  },
  {
    eyebrow: "Reliability",
    title: "Works where the signal doesn't",
    lead: "Job sites lose connectivity. Site Walk is built to keep capturing regardless and reconcile the moment you're back online.",
    points: [
      {
        label: "Offline-first capture",
        body: "Photos, notes, voice memos, and pins are recorded on-device without a connection.",
      },
      {
        label: "Syncs automatically",
        body: "When the device regains signal, the walk uploads and syncs in the background — nothing is lost.",
      },
    ],
  },
  {
    eyebrow: "Permissions & privacy",
    title: "Clear about what it uses",
    lead: "The app asks only for what field capture needs, and your project data stays under your control.",
    points: [
      {
        label: "Camera & location",
        body: "Used to capture photos and bind them to where they were taken. Requested up front, in plain language.",
      },
      {
        label: "Motion sensors",
        body: "Used for accurate framing and ghost alignment — never for tracking you.",
      },
      {
        label: "Your data, exported on your terms",
        body: "Project media lives securely in Slate360 and is shared only when you publish or export it.",
      },
    ],
  },
  {
    eyebrow: "Deliverables",
    title: "Turn the walk into something you can send",
    lead: "A finished walk becomes a polished, shareable deliverable in a few taps — no manual assembly. Send it the way your client actually wants to receive it.",
    points: [
      {
        label: "What's in a report",
        body: "Contextual photos, field notes, transcribed voice memos, and plan pins — assembled into a clean, branded document.",
      },
      {
        label: "PDF or shareable link",
        body: "Export a PDF, or publish a hosted link you can send by email or text — no login required to view.",
      },
      {
        label: "Cinematic slideshow",
        body: "Present the walk as a click-through slideshow for a guided, visual handoff.",
      },
      {
        label: "Two-way Q&A",
        body: "Clients ask questions right on the shared deliverable; you're notified and reply inline — the conversation stays attached to the work.",
      },
    ],
  },
];

export default function SiteWalkProductPage() {
  return (
    <ProductPageShell title="Site Walk Field Engine">
      <p className="text-lg leading-relaxed text-[#F8FAFC]">
        Stop filling your device camera roll with uncontextualized field pictures. Site Walk is Slate360&apos;s
        mobile-first engine for walking a project site, capturing conditions in real time, and turning visual
        data into organized, shareable reports your clients can act on.
      </p>

      {GROUPS.map((group) => (
        <section key={group.title} className="rounded-xl border border-white/[0.08] bg-slate-900/40 p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]">{group.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold text-[#FFFFFF]">{group.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#A3AED0]">{group.lead}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {group.points.map((point) => (
              <div key={point.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-sm font-bold text-[#F8FAFC]">{point.label}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#A3AED0]">{point.body}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </ProductPageShell>
  );
}
