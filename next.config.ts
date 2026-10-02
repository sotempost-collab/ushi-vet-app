import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // basePath и assetPrefix убраны — приложение работает в корне сайта.
  // Это делает его совместимым с Netlify, Vercel, GitHub Pages без дополнительных редиректов.
};

export default nextConfig;
