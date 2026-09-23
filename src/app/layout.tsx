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

// No height constraint or overflow rule on html/body: the page itself is
// the scroll container, which is what lets `position: sticky` work for the
// sidebar's siblings (the /form preview column, the /history table header).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
