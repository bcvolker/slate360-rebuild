
"use client";
import React from "react";
import Header from "./Header";

type HeaderProps = { activeSection: string | null };

export default function ClientHeader({ activeSection }: HeaderProps) {
  return <Header activeSection={activeSection} />;
}
