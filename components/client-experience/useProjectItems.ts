"use client";

import { useCallback, useState } from "react";
import type { ProjectItem, SpatialRef } from "@/lib/client-experience/types";
import { questionTitle } from "@/lib/spatial-experience/questions";

/**
 * Client-side item/question state for a viewer session. Asking a question
 * creates a `question` item with the current view attached; replies append
 * to the conversation. Persistence is Cursor's (spatial_project_items).
 */
export function useProjectItems(initial: ProjectItem[], author = "You") {
  const [items, setItems] = useState<ProjectItem[]>(initial);

  const ask = useCallback((text: string, locator: SpatialRef): ProjectItem => {
    const now = new Date().toISOString();
    const id = `q-${Date.now().toString(36)}`;
    const item: ProjectItem = {
      id,
      title: questionTitle(text),
      type: "question",
      status: "open",
      author,
      description: "",
      createdAt: now,
      refs: [locator],
      attachments: [],
      comments: [{ id: `${id}-c0`, author, role: "client", at: now, body: text }],
      activity: [{ id: `${id}-a0`, at: now, summary: "Question asked from this view" }],
    };
    setItems((list) => [item, ...list]);
    return item;
  }, [author]);

  const reply = useCallback((itemId: string, body: string) => {
    const now = new Date().toISOString();
    setItems((list) => list.map((i) => (i.id === itemId ? { ...i, comments: [...i.comments, { id: `${itemId}-c${i.comments.length + 1}`, author, role: "client", at: now, body }] } : i)));
  }, [author]);

  return { items, ask, reply };
}
