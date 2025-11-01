import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { cn } from "@/lib/utils";
import { StacksProvider } from "@/components/StacksProvider";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-urbanist"
});

export const metadata: Metadata = {
  title: "EventPass | Next-Gen Ticketing",
  description: "Mint, manage, and discover premium events backed by EventPass smart contracts."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={urbanist.variable}>
      <body className={cn("min-h-screen bg-hero-accent text-foreground", urbanist.className)}>
        <StacksProvider>{children}</StacksProvider>
      </body>
    </html>
  );
}
