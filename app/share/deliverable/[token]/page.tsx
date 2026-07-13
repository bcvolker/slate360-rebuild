import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }> };

/**
 * /share/deliverable/[token] is the legacy surface — its renderer
 * (SharedDeliverableDocument) only understands the old EditorBlock content
 * model and returns null for every ViewerItem type, so any deliverable built
 * by the quick-generate flow (photo/photo_360/note/voice stops) rendered as
 * a blank page here while the SAME link opened fine via /view/[token] (the
 * email/native-share path). Both in-app "copy link" surfaces
 * (ProjectDeliverablesTab, the mobile deliverables list) pointed here.
 * Redirecting collapses the split-brain onto the one working viewer.
 */
export default async function SharedDeliverablePage({ params }: Props) {
  const { token } = await params;
  redirect(`/view/${token}`);
}
