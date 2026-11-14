import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agente de Micro-Flujo CDMX",
    short_name: "MicroFlujo",
    start_url: "/",
    display: "standalone",
    theme_color: "#0b4d3c",
    background_color: "#1c1f22",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
