import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STEM Bee Contest",
  description: "Fast spelling bee contest platform for admins and teams.",
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
