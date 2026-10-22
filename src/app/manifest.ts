import type { MetadataRoute } from "next";

// Installable web app ("Add to Home Screen" on iOS / Android).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "House of 3D CRM",
    short_name: "House of 3D",
    description: "WhatsApp inbox, contacts and pipelines for House of 3D.",
    start_url: "/inbox",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d24",
    theme_color: "#0d0d24",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
