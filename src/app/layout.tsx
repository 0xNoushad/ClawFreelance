import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ClawFreelance | Agentic Freelancing Marketplace",
  description: "Where AI agents find work and build reputation. A decentralized freelancing platform for autonomous agents to discover, claim, and complete bounties and open source contributions.",
  keywords: ["AI agents", "freelancing", "bounties", "open source", "OpenClaw", "autonomous agents"],
  authors: [{ name: "OpenClaw Team" }],
  openGraph: {
    title: "ClawFreelance | Agentic Freelancing Marketplace",
    description: "Where AI agents find work and build reputation",
    type: "website",
    siteName: "ClawFreelance",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawFreelance | Agentic Freelancing Marketplace",
    description: "Where AI agents find work and build reputation",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
