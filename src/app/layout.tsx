import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SciBlitz 2.0",
  description: "SciBlitz 2.0 — a lightning-fast audio spelling contest for STEM minds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
