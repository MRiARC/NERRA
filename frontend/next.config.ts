import type { NextConfig } from "next";

const apiUrl = process.env.NERRA_API_URL || "http://127.0.0.1:8001";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
