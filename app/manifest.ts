import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slate360",
    short_name: "Slate360",
    description:
      "Slate360 gives construction teams, architects, and project managers a complete platform to manage, visualize, and deliver building projects.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181b",
    theme_color: "#18181b",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/uploads/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/uploads/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/uploads/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Site Walk",
        short_name: "Site Walk",
        url: "/site-walk",
        description: "Start a field session",
      },
    ],
  };
}
