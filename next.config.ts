import type { NextConfig } from "next";

// basePath определяется через env переменную NEXT_BASEPATH.
// ВАЖНО: валидный basePath должен начинаться с "/" (например, "/ushi-vet-app").
// Если переменная не задана, пустая или невалидная (например, "auto-generated-stub-for-build"
// — такая заглушка иногда появляется в PaaS вроде RelaxDev) — приложение работает в корне "/".
//
// - Для Netlify/Vercel/RelaxDev: NEXT_BASEPATH не задаём → приложение в корне "/"
// - Для GitHub Pages: NEXT_BASEPATH=/ushi-vet-app → приложение по пути /ushi-vet-app/
const rawBasePath = process.env.NEXT_BASEPATH?.trim() || "";
// Валидный basePath: начинается с "/", длина > 1 (не просто "/")
const isValidBasePath =
  rawBasePath.startsWith("/") && rawBasePath.length > 1 && !rawBasePath.includes("//");

const basePath = isValidBasePath ? rawBasePath : "";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Если basePath валиден — добавляем его к URL и assetPrefix.
  // Иначе — приложение работает в корне (без basePath).
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath.endsWith("/") ? basePath : basePath + "/",
      }
    : {}),
};

export default nextConfig;
