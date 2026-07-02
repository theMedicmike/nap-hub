import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nutraceutical Assisted Programs — an open framework for natural health care",
  description:
    "NAP is an early-stage, open framework for treating the root causes of chronic illness. Offered for review and shaping — not medical advice. Help build it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
