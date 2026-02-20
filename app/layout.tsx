import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLATE360 — The All-In-One Sports Media Platform",
  description:
    "SLATE360 gives teams, venues, and content creators a complete platform to capture, produce, and distribute elite sports content.",
  icons: {
    icon: "/uploads/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${geistSans.variable} antialiased bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}
