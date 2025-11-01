"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const appName = "EventPass";
const appScopes = ["store_write", "publish_data"];

const formatAddress = (address: string) => {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
};

const extractAddress = (data: Record<string, any>) => {
  if (!data) return null;
  const profileAddress =
    data.profile?.stxAddress &&
    (data.profile.stxAddress.mainnet || data.profile.stxAddress.testnet);

  if (typeof profileAddress === "string") {
    return profileAddress;
  }

  if (typeof data.profile?.stxAddress === "string") {
    return data.profile.stxAddress;
  }

  return null;
};

export function ConnectWalletButton({ className }: { className?: string }) {
  const userSession = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const appConfig = new AppConfig(appScopes);
    return new UserSession({ appConfig });
  }, []);

  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userSession) {
      return;
    }

    try {
      if (userSession.isUserSignedIn()) {
        const data = userSession.loadUserData();
        const stxAddress = extractAddress(data);
        setAddress(stxAddress ?? null);
        return;
      }
    } catch (error) {
      console.warn("Failed to restore Leather session, clearing cached data.", error);
      userSession.store.deleteSessionData?.();
      setAddress(null);
      setIsLoading(false);
    }

    if (userSession.isSignInPending()) {
      userSession
        .handlePendingSignIn()
        .then(() => {
          const data = userSession.loadUserData();
          const stxAddress = extractAddress(data);
          setAddress(stxAddress ?? null);
        })
        .catch((error) => {
          console.warn("Leather sign-in failed. Clearing cached session.", error);
          userSession.store.deleteSessionData?.();
          setAddress(null);
          setIsLoading(false);
        });
    }
  }, [userSession]);

  const handleDisconnect = useCallback(() => {
    if (!userSession) {
      return;
    }
    userSession.signUserOut(window.location.href);
    setAddress(null);
    setIsLoading(false);
  }, [userSession]);

  const handleConnect = useCallback(() => {
    if (!userSession || typeof window === "undefined") {
      return;
    }
    setIsLoading(true);
    try {
      showConnect({
        userSession,
        appDetails: {
          name: appName,
          icon: `${window.location.origin}/icon.svg`
        },
        onFinish() {
          const data = userSession.loadUserData();
          const stxAddress = extractAddress(data);
          setAddress(stxAddress ?? null);
          setIsLoading(false);
        },
        onCancel() {
          setIsLoading(false);
        },
        onClose() {
          setIsLoading(false);
        }
      });
    } catch (error) {
      setIsLoading(false);
      console.error(error);
    }
  }, [userSession]);

  const buttonLabel = address ? "Disconnect" : "Connect Wallet";
  const displayAddress = address ? formatAddress(address) : null;

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
        onClick={address ? handleDisconnect : handleConnect}
        disabled={isLoading || !userSession}
        className={cn("gap-2", address && "border-primary/40 bg-white/60 hover:bg-white/80")}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : address ? (
          <LogOut className="h-4 w-4" aria-hidden="true" />
        ) : null}
        {buttonLabel}
      </Button>
    </div>
  );
}
