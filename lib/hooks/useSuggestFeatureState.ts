"use client";

import { useState, useCallback } from "react";

export function useSuggestFeatureState() {
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestPriority, setSuggestPriority] = useState<"low" | "medium" | "high">("medium");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);

  const handleSuggestFeature = useCallback(async () => {
    if (!suggestTitle.trim() || !suggestDesc.trim()) return;
    setSuggestLoading(true);
    try {
      await fetch("/api/suggest-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: suggestTitle, description: suggestDesc, priority: suggestPriority }),
      });
      setSuggestDone(true);
      setSuggestTitle("");
      setSuggestDesc("");
      setTimeout(() => setSuggestDone(false), 4000);
    } catch {
      // silently handle
    } finally {
      setSuggestLoading(false);
    }
  }, [suggestTitle, suggestDesc, suggestPriority]);

  return {
    suggestTitle, setSuggestTitle,
    suggestDesc, setSuggestDesc,
    suggestPriority, setSuggestPriority,
    suggestLoading,
    suggestDone,
    handleSuggestFeature,
  };
}
