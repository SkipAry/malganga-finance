import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vercel caps a function request body at 4.5 MB at the infrastructure
    // level; a larger value here is not achievable on that platform, it just
    // moves the failure from our validation to an opaque 413. Kept under the
    // cap so the app's own message is what staff see.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
