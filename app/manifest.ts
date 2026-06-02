import type { MetadataRoute } from "next";
import { PWA_PLACEHOLDER_ICONS } from "@/lib/pwa/icon-assets";

// PLACEHOLDER ICON — pending final green/blue brand mark, do not ship to store as-is.
const { icon192, icon512, icon512Maskable } = PWA_PLACEHOLDER_ICONS;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slate360",
    short_name: "Slate360",
    description:
      "Slate360 gives construction teams, architects, and project managers a complete platform to manage, visualize, and deliver building projects.",
    id: "/",
    // Installed PWA opens directly into the app. Middleware redirects to
    // /login if no session, then back to /dashboard on success.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    /** Portrait-first field PWA — CSS/meta fallback in globals.css + layout head */
    orientation: "portrait",
    background_color: "#0B0F15",
    theme_color: "#0B0F15",
    categories: ["business", "productivity"],
    icons: [
      {
        src: icon192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: icon512Maskable,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/uploads/screenshot-wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/uploads/screenshot-narrow.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    shortcuts: [
      {
        name: "Site Walk",
        short_name: "Site Walk",
        url: "/site-walk",
        description: "Start a field session",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        description: "View your projects",
      },
    ],
  };
}
