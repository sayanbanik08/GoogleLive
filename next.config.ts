import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['react-leaflet', 'leaflet'],
  // @ts-ignore - Newer Next.js property not in types yet
  allowedDevOrigins: ["localhost", "10.199.153.212", "192.168.1.1", "192.168.1.10", "192.168.0.1", "192.168.0.10"],
};

export default nextConfig;
