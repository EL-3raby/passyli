import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://passyli.com";
  const now = new Date();

  const routes = [
    "",
    "/courts",
    "/matchmaking",
    "/partner",
    "/terms",
    "/privacy",
    "/cancellation",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" || route === "/courts" ? "hourly" : "daily",
    priority: route === "" ? 1.0 : route === "/courts" ? 0.9 : 0.7,
  }));
}
