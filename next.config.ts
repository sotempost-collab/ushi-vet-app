import type { NextConfig } from "next";

// basePath определяется через env переменную NEXT_BASEPATH
// - Для Netlify/Vercel/RelaxDev: не задаём NEXT_BASEPATH → приложение в корне "/"
// - Для GitHub Pages: NEXT_BASEPATH=/ushi-vet-app (Actions workflow устанавливает это автоматически)
const basePath = process.env.NEXT_BASEPATH || ""

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Если basePath задан — добавляем его к URL и assetPrefix
  ...(basePath ? { basePath, assetPrefix: basePath + "/" } : {}),
};

export default nextConfig;
