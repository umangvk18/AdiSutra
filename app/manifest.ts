import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AdiSutra",
    short_name: "AdiSutra",
    description: "AdiSutra saree inventory and billing",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f1e6",
    theme_color: "#4f7c6c",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
