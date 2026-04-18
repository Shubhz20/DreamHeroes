import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heroic — Play for charity, win for impact",
  description:
    "A subscription platform where your golf scores fund causes you believe in — and unlock monthly draw-based rewards.",
  applicationName: "Heroic",
  openGraph: {
    title: "Heroic — Play for charity, win for impact",
    description:
      "Track your rounds. Fund the causes you care about. Win from a monthly community prize pool.",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
