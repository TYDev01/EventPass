'use client';

import { Button } from '@/components/ui/button';
import { useStacks } from '@/contexts/StacksContext';
import { Wallet, LogOut, Ticket, Flame, Menu } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { isSignedIn, userData, authenticate, signOut } = useStacks();

  return (
    <header className="sticky top-4 z-50 w-full px-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/60 bg-white/40 px-5 py-3 shadow-lg shadow-[#fc6432]/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/25">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#fc6432] shadow-sm transition hover:bg-white">
            <Ticket className="h-5 w-5" />
            <span className="text-base font-bold">EventPass</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/#events" className="transition-colors hover:text-foreground">
              Discover
            </Link>
            <Link href="/#platform" className="transition-colors hover:text-foreground">
              Platform
            </Link>
            <Link href="/#services" className="transition-colors hover:text-foreground">
              Services
            </Link>
            <Link href="/#testimonials" className="transition-colors hover:text-foreground">
              Stories
            </Link>
            <Link href="/#faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
            <Link href="/create" className="transition-colors hover:text-foreground">
              Create Event
            </Link>
            {isSignedIn && (
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                Dashboard
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#fc6432]">
            <Flame className="h-3.5 w-3.5" />
            <span>Live drops</span>
          </div>
          {isSignedIn ? (
            <div className="flex items-center gap-2 rounded-full border border-orange-100 bg-white/70 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
              <span className="text-sm text-muted-foreground">
                {userData?.profile?.stxAddress?.testnet || userData?.profile?.stxAddress?.mainnet}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Disconnect</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={authenticate}
              className="flex items-center gap-2 bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90"
            >
              <Wallet className="h-4 w-4" />
              <span>Connect Wallet</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
