import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/pwa";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CallSeal Dashboard",
  description: "Job inbox for service businesses - never miss a lead",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#334155", // Navy-600 for premium feel
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://unpkg.com/react-grab/dist/index.global.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://unpkg.com/@react-grab/claude-code/dist/client.global.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
