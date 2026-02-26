import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TournamentProvider } from "@/lib/context";
import { PlayerProvider } from "@/lib/player-context";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tournament Manager",
  description: "Soccer tournament management and fixtures system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TournamentProvider>
          <PlayerProvider>
            {children}
            <Toaster />
          </PlayerProvider>
        </TournamentProvider>
      </body>
    </html>
  );
}
