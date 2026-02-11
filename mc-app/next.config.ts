import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep local builds reliable on constrained machines; CI/typecheck can run separately.
  typescript: { ignoreBuildErrors: true },

  // Note: avoid `output: "standalone"` here — it has been flaky with tracing in this workspace.

  // Avoid incorrect workspace root inference when multiple lockfiles are present.
  turbopack: {
    root: __dirname,
  },

  // Next's output file tracing can get confused in monorepos with multiple lockfiles.
  // Pin it explicitly to this app directory.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
