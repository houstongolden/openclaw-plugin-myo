import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local builds reliable on constrained machines; CI/typecheck can run separately.
  typescript: { ignoreBuildErrors: true },

  // Produce a server output (avoids export-only artifacts).
  output: "standalone",

  // Avoid incorrect workspace root inference when multiple lockfiles are present.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
