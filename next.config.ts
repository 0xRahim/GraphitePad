import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: false,
  images: { unoptimized: true },
  trailingSlash: false,
  // The desktop build is served from a loopback Bun server. Development runs
  // against `next dev`, so no asset prefix is needed in either mode.
  experimental: {},
};

export default nextConfig;
