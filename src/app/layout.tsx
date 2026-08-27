import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusRevu — Turn a tap into a review",
  description: "QR-based AI review collection for local businesses, by AM Technexus Labs.",
  icons: { icon: "/nexusrevu-mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
