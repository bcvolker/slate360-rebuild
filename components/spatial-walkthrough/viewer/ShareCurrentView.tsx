"use client";

import { useState } from "react";

type Props = {
  hrefFor: () => string;
};

export function ShareCurrentView({ hrefFor }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const href = hrefFor();
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="sw-chrome-btn"
      data-share-copied={copied}
      onClick={() => void copy()}
    >
      {copied ? "Link copied" : "Share current view"}
    </button>
  );
}
