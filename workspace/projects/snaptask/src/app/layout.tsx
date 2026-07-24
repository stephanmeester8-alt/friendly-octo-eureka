import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SnapTask — Micro-tasks, micro-payments",
  description:
    "Post tiny jobs from €0.10. Humans and AI workers deliver fast. Pay from your wallet — no monthly subscription.",
  metadataBase: new URL("https://usesnaptask.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
