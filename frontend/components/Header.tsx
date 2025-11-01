"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Menu, Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const navLinks = [
  { href: "#", label: "Home" },
  { href: "#events", label: "Events" },
  { href: "#tickets", label: "My Tickets" },
  { href: "/create", label: "Create Event" }
];

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-6 z-50 flex justify-center px-4"
    >
      <nav className="glass-panel flex w-full max-w-5xl items-center justify-between rounded-2xl px-6 py-4">
        <Link href="#" className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Ticket className="h-5 w-5" aria-hidden="true" />
          </span>
          EventPass
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-4 flex items-center gap-3">
          <ConnectWalletButton />
          <Button size="icon" variant="outline" className="md:hidden">
            <span className="sr-only">Open navigation</span>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </nav>
    </motion.header>
  );
}
