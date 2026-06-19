import { ProductPageShell } from "@/components/marketing-launchpad/ProductPageShell";
import { ProductMediaFrame } from "@/components/marketing-launchpad/ProductMediaFrame";
import { ProductFeatureRow } from "@/components/marketing-launchpad/ProductFeatureRow";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";
import { MARKETING_APPS } from "@/lib/marketing/homepage-content";

export const metadata = {
  title: "Site Walk — Slate360",
  description:
    "Mobile field capture, plan pinning, ghost progress overlays, offline-first capture, and shareable visual reports with two-way Q&A for construction site documentation.",
};

const siteWalk = MARKETING_APPS.find((a) => a.id === "site-walk")!;

export default function SiteWalkProductPage() {
  const hero = (
    <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      <ProductMediaFrame
        label="Watch a full Site Walk"
        placeholderKind="video"
        aspect="16 / 10"
      />
      <PhoneDemo steps={siteWalk.demoSteps} accentVar={siteWalk.accentVar} label="Interactive Site Walk demo" />
    </div>
  );

  return (
    <ProductPageShell
      title="Site Walk Field Engine"
      subtitle="Walk a project site, capture conditions in real time, and turn visual data into organized, shareable reports your clients can open, explore, and ask questions about."
      hero={hero}
      wide
    >
      <ProductFeatureRow
        eyebrow="Capture"
        title="Document the site as you walk it"
        lead="Open the app, walk the space, and capture conditions in real time. Every photo is bound to its project, timestamped, and geolocated — no loose pictures, no guessing later where a shot was taken."
        media={
          <ProductMediaFrame
            label="Capture screen"
            imageSrc="/marketing/demo/site-walk-1-capture.png"
            imageAlt="Capturing a stop on a site walk"
            aspect="4 / 3"
          />
        }
        points={[
          { label: "Photos with context", body: "Each photo carries its project, location, and time automatically, so the visual record explains itself months later." },
          { label: "Notes & voice memos", body: "Type observations against the shot, or dictate hands-free — voice is transcribed straight into the report." },
          { label: "Zero camera-roll clutter", body: "Project photos stay inside Slate360, not your personal camera roll, with secure export when you choose to share." },
        ]}
      />

      <ProductFeatureRow
        reverse
        eyebrow="Plans & pins"
        title="Pin every photo to the drawing"
        lead="Bring your drawings and floor-plan sheets into the walk. Mark exactly where each observation lives so anyone reading the report knows the spot on the plan, not just the picture."
        media={
          <ProductMediaFrame
            label="Plan pinning"
            imageSrc="/marketing/demo/site-walk-2-pin.png"
            imageAlt="Dropping a pin on a plan sheet"
            aspect="4 / 3"
          />
        }
        points={[
          { label: "Drop pins on sheets", body: "Long-press a drawing or plan sheet to place a high-visibility tracking pin at the precise location." },
          { label: "Linked both ways", body: "Tap the plan to mark where a photo was taken — the pin and the photo stay connected." },
          { label: "Walk the plan", body: "Build a pinned map of conditions as you move through the space." },
        ]}
      />

      <ProductFeatureRow
        eyebrow="Progress"
        title="Compare the same angle over time"
        lead="Ghost overlays make repeat-visit documentation effortless — line up today's shot against a past one and capture true before/after progress."
        media={<ProductMediaFrame label="Ghost overlay in action" placeholderKind="video" aspect="4 / 3" />}
        points={[
          { label: "Transparent ghost view", body: "See a faded overlay of a previous photo on the live camera so you can match framing exactly." },
          { label: "Repeat-angle capture", body: "Reshoot from the same vantage point on every visit to build a clean progress sequence." },
        ]}
      />

      <ProductFeatureRow
        reverse
        eyebrow="Reliability"
        title="Works where the signal doesn't"
        lead="Job sites lose connectivity. Site Walk keeps capturing regardless and reconciles the moment you're back online."
        media={<ProductMediaFrame label="Offline-first capture" placeholderKind="interactive" aspect="4 / 3" />}
        points={[
          { label: "Offline-first capture", body: "Photos, notes, voice memos, and pins are recorded on-device without a connection." },
          { label: "Syncs automatically", body: "When the device regains signal, the walk uploads and syncs in the background — nothing is lost." },
        ]}
      />

      {/* Permissions band — compact, to vary the rhythm */}
      <section className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]">Permissions &amp; privacy</p>
        <h2 className="mt-2 text-2xl font-bold text-[#FFFFFF]">Clear about what it uses</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Camera & location", body: "Used to capture photos and bind them to where they were taken. Requested up front, in plain language." },
            { label: "Motion sensors", body: "Used for accurate framing and ghost alignment — never for tracking you." },
            { label: "Your data, your terms", body: "Project media lives securely in Slate360 and is shared only when you publish or export it." },
          ].map((p) => (
            <div key={p.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-[#F8FAFC]">{p.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#A3AED0]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ProductFeatureRow
        eyebrow="Deliverables"
        title="Turn the walk into something you can send"
        lead="A finished walk becomes a polished, shareable deliverable in a few taps — no manual assembly. Send it the way your client actually wants to receive it, and keep the conversation attached to the work."
        media={
          <ProductMediaFrame
            label="Shareable deliverable"
            imageSrc="/marketing/demo/site-walk-4-review.png"
            imageAlt="Reviewing and sharing a finished walk"
            aspect="4 / 3"
          />
        }
        points={[
          { label: "What's in a report", body: "Contextual photos, field notes, transcribed voice memos, and plan pins — assembled into a clean, branded document." },
          { label: "PDF, link, or slideshow", body: "Export a PDF, publish a hosted link to send by email or text, or present a click-through cinematic slideshow — no login required to view." },
          { label: "Two-way Q&A", body: "Clients ask questions right on the shared deliverable; you're notified and reply inline." },
        ]}
      />
    </ProductPageShell>
  );
}
