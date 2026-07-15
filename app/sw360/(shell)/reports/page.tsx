import { SW360StubScreen } from "@/components/sw360/SW360StubScreen";
import { SW360BackHeader } from "@/components/sw360/SW360BackHeader";

export default function SW360ReportsPage() {
  return (
    <div className="px-4 pt-6">
      <SW360BackHeader href="/sw360" label="Home" />
      <SW360StubScreen title="Reports" />
    </div>
  );
}
