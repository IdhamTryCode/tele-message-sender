import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// DESIGN.md (Apple reference) calls for SF Pro; Inter is documented there as
// the closest open-source substitute for non-Apple platforms.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tele Message Sender",
  description: "Kirim laporan insiden ke Telegram",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
