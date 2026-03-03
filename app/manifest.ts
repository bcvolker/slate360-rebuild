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
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/uploads/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
