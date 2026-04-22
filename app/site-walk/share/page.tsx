import { redirect } from "next/navigation";

/**
 * Legacy `/site-walk/share` placeholder. The real share/send flow lives
 * inside each deliverable detail page (`/site-walk/deliverables/[id]`) and
 * the public viewer is at `/view/[token]`. Recipients open the viewer
 * directly; sending users belong on the deliverables list.
 */
export default function ShareRedirect(): never {
  redirect("/site-walk/deliverables");
}

