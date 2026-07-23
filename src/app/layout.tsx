import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TerminKI - DSGVO-konformer KI-Terminservice",
  description: "24/7 KI-Terminagent fuer Friseure, Physiotherapeuten, Werkstaetten & Dienstleister. Natuerliche Sprache, Sentiment-Erkennung, Crypto-Payment. DSGVO-safe, EU-Hosting.",
  keywords: ["KI Termin", "Terminbuchung KI", "DSGVO KI Agent", "Crypto Payment"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${inter.className} bg-gray-950 text-gray-200`}>{children}</body>
    </html>
  );
}

