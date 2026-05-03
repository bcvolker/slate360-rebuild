import { redirect } from "next/navigation";

/**
 * /beta-pending — kept for backward compatibility.
 *
 * Canonical pending-verification URL is now /pending-verification.
 * Old email links, PWA caches, and logged references are redirected here.
 */
export default async function BetaPendingPage() {
  redirect("/pending-verification");
}

