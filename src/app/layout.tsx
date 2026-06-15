import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/shared/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AfyaCall – Saba Saba Health Consultation",
  description:
    "Connect with qualified doctors at the AfyaCall Saba Saba Exhibition booth. Free health assessment and telemedicine consultations.",
  keywords: ["AfyaCall", "health consultation", "telemedicine", "Tanzania", "Saba Saba"],
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#00a65a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background kiosk-mode">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
