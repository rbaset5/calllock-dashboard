import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Permanent_Marker, Space_Grotesk, DM_Sans, Inter, Public_Sans } from "next/font/google";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
import { ServiceWorkerRegistration } from "@/components/pwa";
import { Component as Background } from "@/components/ui/background-components";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});

const permanentMarker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-permanent-marker",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CallLock",
  description: "Never miss a lead - AI-powered missed call recovery",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#11bb77",
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
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className={`${publicSans.variable} ${plusJakartaSans.variable} ${spaceGrotesk.variable} ${permanentMarker.variable} ${dmSans.variable} ${inter.variable} font-sans antialiased`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
