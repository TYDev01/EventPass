"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { showConnect } from "@stacks/connect";
import { UserSession } from "@stacks/auth";

import { buildAuthOptions, clearSessionStore, createUserSession, extractAddress } from "@/lib/stacks";

type StacksContextValue = {
  userSession: UserSession | null;
  address: string | null;
  isAuthenticating: boolean;
  connect: () => void;
  disconnect: () => void;
  refreshSession: () => Promise<void>;
};

const StacksContext = createContext<StacksContextValue | undefined>(undefined);

export const useStacks = () => {
  const context = useContext(StacksContext);
  if (!context) {
    throw new Error("useStacks must be used within a StacksProvider");
  }
  return context;
};

const hydrateSession = async (
  session: UserSession,
  updateAddress: (address: string | null) => void,
  setAuthenticating?: (value: boolean) => void
) => {
  try {
    if (session.isUserSignedIn()) {
      const data = session.loadUserData();
      updateAddress(extractAddress(data));
      return;
    }

    if (session.isSignInPending()) {
      await session.handlePendingSignIn();
      const data = session.loadUserData();
      updateAddress(extractAddress(data));
      return;
    }
  } catch (error) {
    console.warn("Unable to hydrate Leather session. Clearing cache.", error);
    clearSessionStore(session);
  } finally {
    setAuthenticating?.(false);
  }

  updateAddress(null);
};

export function StacksProvider({ children }: { children: ReactNode }) {
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const session = createUserSession();
    setUserSession(session);
    void hydrateSession(session, setAddress);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!userSession) {
      return;
    }
    await hydrateSession(userSession, setAddress);
  }, [userSession]);

  const disconnect = useCallback(() => {
    if (!userSession) {
      return;
    }
    try {
      userSession.signUserOut(window.location.href);
    } catch (error) {
      console.warn("Failed to sign out from Leather wallet.", error);
    }
    clearSessionStore(userSession);
    setAddress(null);
    setIsAuthenticating(false);
  }, [userSession]);

  const connect = useCallback(() => {
    if (!userSession) {
      console.warn("User session unavailable. Recreating session.");
      const session = createUserSession();
      setUserSession(session);
      setIsAuthenticating(true);
      showConnect(
        buildAuthOptions(session, {
          onFinish: () => {
            void hydrateSession(session, setAddress, setIsAuthenticating);
          },
          onCancel: () => setIsAuthenticating(false),
          onClose: () => setIsAuthenticating(false)
        })
      );
      return;
    }

    setIsAuthenticating(true);
    showConnect(
      buildAuthOptions(userSession, {
        onFinish: () => {
          void hydrateSession(userSession, setAddress, setIsAuthenticating);
        },
        onCancel: () => setIsAuthenticating(false),
        onClose: () => setIsAuthenticating(false)
      })
    );
  }, [userSession]);

  const value = useMemo<StacksContextValue>(
    () => ({
      userSession,
      address,
      isAuthenticating,
      connect,
      disconnect,
      refreshSession
    }),
    [address, connect, disconnect, isAuthenticating, refreshSession, userSession]
  );

  return <StacksContext.Provider value={value}>{children}</StacksContext.Provider>;
}
