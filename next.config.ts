import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Lecture sheets are up to 10 MB (photos 2 MB); leave room for the form's own overhead
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // Dev logs print Server Action arguments verbatim, which would put passwords and sign-in codes in the terminal
  logging: {
    serverFunctions: false,
  },
  // The knowledge base (acadify_kb/kb) is read from disk at runtime, so ship it with the routes that read it
  outputFileTracingIncludes: {
    "/admin/knowledge-base/**": ["./acadify_kb/kb/**/*"],
    "/api/admin/kb/asset": ["./acadify_kb/kb/**/*"],
  },
  cacheComponents: true,
  partialPrefetching: true,
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
