import { CreatorHome } from "@/components/product-shell/CreatorHome";

const HERO =
  "/api/spatial-walkthrough/public/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269/media?clip=f278d37f-1c2f-4511-aef5-437b3992d39d&kind=hero";

export default function CreatorHomePreview() {
  return (
    <main className="min-h-[100dvh] bg-[var(--graphite-canvas)]">
      <CreatorHome
        recentProjects={[
          { id: "1", name: "AOB205 — ASU", status: "active", createdAt: "2026-08-30T00:00:00.000Z", imageUrl: HERO },
        ]}
        recentWalks={[{ id: "w1", title: "HouseWalk", status: "ready", updatedAt: "2026-08-30T00:00:00.000Z" }]}
        needsAttention={[{ id: "a1", title: "Kitchen spec needs reply", message: "", linkPath: "/portal/S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269", createdAt: "2026-08-30T00:00:00.000Z" }]}
      />
    </main>
  );
}
