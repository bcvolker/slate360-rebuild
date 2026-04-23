import { notFound } from "next/navigation";
import { loadDeliverableByToken } from "@/lib/site-walk/load-deliverable";
import ViewerClient from "./ViewerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deliverable — Slate360",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ViewDeliverablePage({ params }: Props) {
  const { token } = await params;
  const deliverable = await loadDeliverableByToken(token);
  if (!deliverable) notFound();

  return (
    <main className="h-screen w-full bg-[#0B0F15] text-foreground overflow-hidden flex flex-col">
      <ViewerClient deliverable={deliverable} token={token} />
    </main>
  );
}
