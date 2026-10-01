"use client";

import { CollaborationLayer } from "@/components/spatial-walkthrough/items/CollaborationLayer";
import type { ItemAudience } from "@/lib/spatial-walkthrough/project-items";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";

export type WalkthroughCollaboration = {
  shareToken?: string | null;
  projectId?: string | null;
  audience?: ItemAudience;
  canManage?: boolean;
  previewView?: string | null;
};

export function WalkthroughCollaborationHost(props: {
  collaboration: WalkthroughCollaboration | null;
  walkthroughId?: string;
  clipId: string;
  chapterId?: string | null;
  player: WalkthroughPlayerHandle | null;
  currentT: number;
  authoring: boolean;
  preview?: boolean;
}) {
  if (!props.collaboration) return null;
  return (
    <CollaborationLayer
      walkthroughId={props.walkthroughId}
      clipId={props.clipId}
      chapterId={props.chapterId}
      player={props.player}
      currentT={props.currentT}
      shareToken={props.collaboration.shareToken}
      projectId={props.collaboration.projectId}
      canManage={props.collaboration.canManage ?? props.authoring}
      audience={props.collaboration.audience ?? (props.authoring ? "contractor" : "client")}
      preview={props.preview}
      previewView={props.collaboration.previewView}
    />
  );
}
