import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Truck Radar — Trasporti",
    short_name: "Truck Radar",
    description: "Portale autisti Truck Radar: gestione viaggi e consegne in mobilità.",
    start_url: "/dashboard/autista",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121417",
    theme_color: "#1e2d4a",
    lang: "it",
    dir: "ltr",
    categories: ["business", "shipping", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
