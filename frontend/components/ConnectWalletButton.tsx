"use client";

import { Loader2, LogIn, LogOut } from "lucide-react";

import { useStacks } from "@/components/StacksProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatAddress = (address: string) =>
  address.length <= 10 ? address : `${address.slice(0, 5)}...${address.slice(-4)}`;

export function ConnectWalletButton({ className }: { className?: string }) {
  const { address, connect, disconnect, isAuthenticating } = useStacks();

  const displayAddress = address ? formatAddress(address) : null;
  const label = address ? "Disconnect" : "Connect Wallet";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {displayAddress && (
        <span className="hidden rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-foreground/70 lg:inline">
          {displayAddress}
        </span>
      )}
      <Button
        size="sm"
        variant={address ? "outline" : "default"}
        disabled={isAuthenticating}
        onClick={address ? disconnect : connect}
        className={cn(
          "gap-2",
          address && "border-primary/40 bg-white/60 text-foreground hover:bg-white/80"
        )}
      >
        {isAuthenticating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : address ? (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        {label}
      </Button>
    </div>
  );
}
