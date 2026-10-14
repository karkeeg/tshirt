import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Root package-lock.json (for the combined `npm run dev`) confuses
  // Turbopack's workspace-root inference otherwise.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
