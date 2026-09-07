import { permanentRedirect } from "next/navigation";

/** Retired SaaS product page — the services site describes deliverables on the homepage. */
export default function RetiredProductPage() {
  permanentRedirect("/#apps");
}
