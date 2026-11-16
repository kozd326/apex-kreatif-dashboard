import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Apex Kreatif",
    short_name: "Apex",
    lang: "tr",
    description: "Apex ekibinin ortak çalışma alanı.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f7f7fb",
    theme_color: "#17171f",
    icons: [192, 512].map((size) => ({
      src: `/app-icons/${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
