import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import { cn } from "@/lib/utils";
import { StacksProvider } from "@/components/StacksProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap"
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
    <html lang="en" className={urbanist.variable} suppressHydrationWarning>
      <body className={cn("min-h-screen bg-hero-accent text-foreground", urbanist.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <StacksProvider>{children}</StacksProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
