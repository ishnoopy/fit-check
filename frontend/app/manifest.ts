import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
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
        src: "/icons/icon-192.png?v=tuff-20260531",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png?v=tuff-20260531",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png?v=tuff-20260531",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
