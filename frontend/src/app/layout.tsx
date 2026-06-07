import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/features/auth/AuthProvider";
import "./globals.css";

// Plus Jakarta Sans — self-hosted dari src/app/fonts/ (file .ttf).
// next/font/local subset + convert ke woff2 saat build, jadi runtime
// browser tidak perlu request ke Google. display:"swap" supaya teks
// langsung muncul pakai system fallback sebelum font selesai load.
const plusJakartaSans = localFont({
  src: [
    { path: "./fonts/PlusJakartaSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/PlusJakartaSans-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/PlusJakartaSans-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/PlusJakartaSans-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Sovereign Dialect-Bridge",
  description: "Platform pengaduan publik multidialek Indonesia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
