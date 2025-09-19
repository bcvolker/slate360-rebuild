
export const revalidate = 0;
export const dynamic = "force-dynamic";
import PageClient from "./page-client";

export default function PageWrapper() {
  return <PageClient />;
}
