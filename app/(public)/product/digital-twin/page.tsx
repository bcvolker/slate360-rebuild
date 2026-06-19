import { ProductPageShell } from "@/components/marketing-launchpad/ProductPageShell";
import { ProductMediaFrame } from "@/components/marketing-launchpad/ProductMediaFrame";
import { ProductFeatureRow } from "@/components/marketing-launchpad/ProductFeatureRow";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";
import { MARKETING_APPS } from "@/lib/marketing/homepage-content";

export const metadata = {
  title: "Digital Twin — Slate360",
  description:
    "Turn a phone walkthrough into an interactive 3D twin anyone can explore from a link. LiDAR fusion, drone integration, measurement tools, upfront credits, and secure multi-user access.",
};

const twin = MARKETING_APPS.find((a) => a.id === "twin-360")!;

export default function DigitalTwinProductPage() {
  const hero = (
    <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
      {/* Drop a live twin share URL into embedSrc to make this hero fully explorable. */}
      <ProductMediaFrame label="Explore a live 3D twin" placeholderKind="twin" aspect="16 / 10" />
      <PhoneDemo steps={twin.demoSteps} accentVar={twin.accentVar} label="Interactive Digital Twin demo" />
    </div>
  );

  return (
    <ProductPageShell
      title="Digital Twin Real-World Simulation"
      subtitle="Walk a property with your phone and Slate360 compiles an accurate, immersive 3D twin — explorable in any browser, measurable, and shareable with a link. Fuse in drone and LiDAR for complete coverage."
      hero={hero}
      wide
    >
      <ProductFeatureRow
        eyebrow="Explore"
        title="Step inside from any browser"
        lead="Stakeholders orbit, pan, and walk through a life-like 3D model with a mouse or touchscreen — no app to install, no plugin. Share a link and they're inside."
        media={<ProductMediaFrame label="Interactive 3D twin viewer" placeholderKind="twin" aspect="16 / 10" />}
        points={[
          { label: "Orbit & walk modes", body: "Inspect the whole structure from outside, then drop in and move through it room by room." },
          { label: "Measure on the model", body: "Calculate real dimensions directly on the virtual canvas — distances, heights, openings." },
          { label: "Zero install", body: "Runs in the browser, so owners, architects, and lenders review without leaving the office." },
        ]}
      />

      <ProductFeatureRow
        reverse
        eyebrow="Capture → 3D"
        title="A phone walkthrough becomes a model"
        lead="Walk a property with your smartphone camera and the photogrammetry pipeline compiles a structural twin automatically — heavy processing runs in the cloud, not on your device."
        media={
          <ProductMediaFrame
            label="Recording a twin"
            imageSrc="/marketing/demo/twin-1-record.png"
            imageAlt="Recording a walkthrough that becomes a 3D twin"
            aspect="4 / 3"
          />
        }
        points={[
          { label: "Automatic reconstruction", body: "Your walkthrough frames feed straight into the model build — no manual stitching." },
          { label: "Cloud-processed", body: "Reconstruction happens on cloud GPUs, so your phone stays fast and cool." },
        ]}
      />

      <ProductFeatureRow
        eyebrow="Accuracy"
        title="Fuse LiDAR for survey-grade detail"
        lead="Combine phone photogrammetry with tripod LiDAR scans to lock down scale and capture fine structural detail where it matters most."
        media={<ProductMediaFrame label="LiDAR fusion" placeholderKind="video" aspect="16 / 10" />}
        points={[
          { label: "LiDAR + photogrammetry", body: "Blend point-cloud precision with photographic realism in a single twin." },
          { label: "Reliable scale", body: "Measurements you can trust because the geometry is anchored to real-world distances." },
        ]}
      />

      <ProductFeatureRow
        reverse
        eyebrow="Coverage"
        title="Add drone & aerial scans"
        lead="Pull in high-resolution aerial captures to render exteriors and roofs, then combine them with the interior walkthrough for complete inside-and-out coverage."
        media={<ProductMediaFrame label="Drone & aerial coverage" placeholderKind="video" aspect="16 / 10" />}
        points={[
          { label: "Exteriors & roofs", body: "Aerial photogrammetry captures the surfaces a walkthrough can't reach." },
          { label: "One unified twin", body: "Interior and exterior data resolve into a single explorable model." },
        ]}
      />

      {/* Credits & exports band */}
      <section className="rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]">Credits &amp; exports</p>
        <h2 className="mt-2 text-2xl font-bold text-[#FFFFFF]">No surprises, your data stays yours</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Credits shown up front", body: "See exactly what a reconstruction will cost in credits before you submit — never a surprise bill." },
            { label: "Shareable, secure links", body: "Invite lenders, clients, or remote team members to a precise visual history with secure, revocable access." },
            { label: "Export your twin", body: "Take your model with you — download and reuse the captured assets, not just a hosted view." },
          ].map((p) => (
            <div key={p.label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <h3 className="text-sm font-bold text-[#F8FAFC]">{p.label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#A3AED0]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ProductFeatureRow
        eyebrow="Over time"
        title="Before-and-after, side by side"
        lead="Stack historical scans to audit changes and verify progress. Ghost a prior state against the current twin so remote stakeholders can monitor status without a site visit."
        media={
          <ProductMediaFrame
            label="Twin progress comparison"
            imageSrc="/marketing/demo/twin-2-ghost.png"
            imageAlt="Comparing twin states over time"
            aspect="4 / 3"
          />
        }
        points={[
          { label: "Timeline comparison", body: "Place historical captures next to the latest to see exactly what changed." },
          { label: "Progress at a distance", body: "Owners and lenders monitor structural progress from anywhere." },
        ]}
      />
    </ProductPageShell>
  );
}
