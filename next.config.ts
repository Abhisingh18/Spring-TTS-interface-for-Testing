import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },

  // The bundle JSON is read at build time by src/lib/bundle.ts. Tracing it keeps
  // the read working on hosts that ship only the traced files.
  outputFileTracingIncludes: {
    "/**": ["./data/**"],
  },

  async headers() {
    return [
      {
        // Vendored WAVs never change without a new filename, so let the CDN and
        // the browser keep them.
        source: "/audio/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "Accept-Ranges", value: "bytes" },
        ],
      },
    ];
  },
};

export default nextConfig;
