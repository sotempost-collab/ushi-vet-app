import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Ассистент УшиХвост — ветеринарный помощник",
  description: "Веб-приложение для ветеринарного врача: сбор анамнеза, протокол осмотра с чек-листом, аудиоплеер для аускультации сердца, OCR-модуль для загрузки исследований и AI-генерация заключения.",
  keywords: ["ветеринария", "анамнез", "осмотр", "аускультация", "OCR", "ветеринарный ассистент"],
  authors: [{ name: "УшиХвост" }],
  manifest: "/manifest.json",
  applicationName: "Ассистент УшиХвост",
  appleWebApp: {
    capable: true,
    title: "УшиХвост",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-256.png", sizes: "256x256", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/icons/favicon-32.png"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

// Service Worker регистрация ОТКЛЮЧЕНА — приложение работает без SW.
// Причина: SW мог остаться от прошлых версий и ломать загрузку новых chunks.
// Приложение полностью работоспособно без SW — просто не будет офлайн-режима.
function ServiceWorkerRegister() {
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* PWA meta-теги для мобильных устройств */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="УшиХвост" />
        <meta name="application-name" content="УшиХвост" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="shortcut icon" href="/icons/favicon-32.png" />
        {/* Скрипт для отписки от старых Service Workers */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (var i = 0; i < registrations.length; i++) {
                  console.log('Удаляю старый SW:', registrations[i].scope);
                  registrations[i].unregister();
                }
              }).catch(function(err) {
                console.warn('SW cleanup error:', err);
              });
            });
          }
        ` }} />
      <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.sotem-post.workers.dev https://*.workers.dev https://relaxdev.ru https://*.relaxdev.ru; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'self';" />
      </head>
      <body
        className={`antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
