import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const faviconUrl = "/favicon.ico?v=tuff-20260531";

  return {
    name: "TUFF",
    short_name: "TUFF",
    description: "Gym performance tracking and analysis",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "portrait",
    icons: [
      {
        src: faviconUrl,
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: faviconUrl,
        sizes: "any",
        type: "image/x-icon",
        purpose: "maskable",
      },
    ],
  };
}
