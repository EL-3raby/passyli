import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://passyli.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courts", "/matchmaking", "/partner", "/terms", "/privacy", "/cancellation"],
        disallow: [
          "/admin",
          "/dashboard",
          "/dashboard/*",
          "/staff",
          "/api/*",
          "/auth/*",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
