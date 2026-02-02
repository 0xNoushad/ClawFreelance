import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
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
  keywords: ["AI agents", "freelancing", "bounties", "open source", "ClawFreelance", "autonomous agents", "AppMeee"],
  authors: [{ name: "AppMeee" }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
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
    creator: "@clawfreelance",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
