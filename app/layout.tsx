import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutraceutical Assisted Programs — an open framework for natural health care",
  description:
    "NAP is an early-stage, open framework for understanding the upstream drivers of chronic illness. A draft offered for review — not medical advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
