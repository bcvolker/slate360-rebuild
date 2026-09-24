import { VnextPageScaffold } from "@/components/vnext/VnextPageScaffold";
import { requireVnextOwner, requireVnextSession } from "@/lib/vnext/require-vnext-session";

type VnextRoutePageProps = {
  path: string;
  title: string;
  note: string;
};

export async function VnextClientRoutePage({ path, title, note }: VnextRoutePageProps) {
  await requireVnextSession(path);
  return <VnextPageScaffold title={title} note={note} />;
}

export async function VnextOwnerRoutePage({ path, title, note }: VnextRoutePageProps) {
  await requireVnextOwner(path);
  return <VnextPageScaffold title={title} note={note} />;
}
