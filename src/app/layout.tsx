import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SchedulingProvider } from "@/lib/context";
import { StaffIdentityProvider } from "@/lib/staff-context";
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
  title: "HP Elite - Staff Scheduler",
  description: "Football academy staff scheduling and availability management",
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
        <SchedulingProvider>
          <StaffIdentityProvider>
            {children}
            <Toaster />
          </StaffIdentityProvider>
        </SchedulingProvider>
      </body>
    </html>
  );
}
