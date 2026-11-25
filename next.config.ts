import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Open Library covers bounce through up to two redirects to archive.org and can
    // take several seconds (we measured 17s). Routing them through the image optimizer
    // fetches each cover once, resizes it to the size actually shown, and serves it
    // from the CDN afterwards. Locked to cover paths with our exact query string.
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org", port: "", pathname: "/b/**", search: "?default=false" },
    ],
    // A cover image never changes for a given ID/ISBN, so cache for 31 days.
    minimumCacheTTL: 2678400,
    qualities: [75],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
