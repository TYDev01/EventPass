"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import type { SessionTypes } from "@walletconnect/types";
import type SignClient from "@walletconnect/sign-client";

import {
  closeWalletConnectModal,
  findStacksSession,
  getAddressFromSession,
  getSignClient,
  getStacksNamespaceConfig,
  openWalletConnectModal,
  requestStacksAddresses,
  requestStacksContractCall
} from "@/lib/walletconnect";
import type { ClarityValue } from "@stacks/transactions";

type StacksContextValue = {
  session: SessionTypes.Struct | null;
  address: string | null;
  isAuthenticating: boolean;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  refreshSession: () => Promise<void>;
  callContract: (params: {
    contractAddress: string;
    contractName: string;
    functionName: string;
    functionArgs: ClarityValue[];
  }) => Promise<{ txid?: string; transaction?: string }>;
};

const StacksContext = createContext<StacksContextValue | undefined>(undefined);

export const useStacks = () => {
  const context = useContext(StacksContext);
  if (!context) {
    throw new Error("useStacks must be used within a StacksProvider");
  }
  return context;
};

const resolveAddress = async (
  client: SignClient,
  session: SessionTypes.Struct | null
) => {
  const fromSession = getAddressFromSession(session);
  if (fromSession) {
    return fromSession;
  }
  if (!session) {
    return null;
  }
  try {
    return await requestStacksAddresses(client, session);
  } catch (error) {
    console.warn("Unable to resolve Stacks address from WalletConnect.", error);
    return null;
  }
};

export function StacksProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const signClientRef = useRef<SignClient | null>(null);
  const listenersAttachedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isMounted = true;
    const initialize = async () => {
      const client = await getSignClient();
      if (!isMounted) {
        return;
      }
      signClientRef.current = client;
      if (!listenersAttachedRef.current) {
        client.on("session_update", ({ topic, params }) => {
          const { namespaces } = params;
          const existing = client.session.get(topic);
          const updated = { ...existing, namespaces };
          setSession(updated);
          void resolveAddress(client, updated).then(setAddress);
        });

        client.on("session_delete", () => {
          setSession(null);
          setAddress(null);
        });

        listenersAttachedRef.current = true;
      }

      const existingSession = findStacksSession(client);
      setSession(existingSession);
      const resolvedAddress = await resolveAddress(client, existingSession);
      setAddress(resolvedAddress);
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    const client = signClientRef.current;
    if (!client) {
      return;
    }
    const existingSession = findStacksSession(client);
    setSession(existingSession);
    const resolvedAddress = await resolveAddress(client, existingSession);
    setAddress(resolvedAddress);
  }, []);

  const disconnect = useCallback(() => {
    const client = signClientRef.current;
    if (!client || !session) {
      return;
    }
    void client
      .disconnect({
        topic: session.topic,
        reason: {
          code: 6000,
          message: "User disconnected"
        }
      })
      .catch((error) => {
        console.warn("Failed to disconnect WalletConnect session.", error);
      })
      .finally(() => {
        setSession(null);
        setAddress(null);
        setIsAuthenticating(false);
      });
  }, [session]);

  const connect = useCallback(() => {
    const client = signClientRef.current;
    if (!client) {
      console.warn("WalletConnect client not ready yet.");
      return;
    }

    setIsAuthenticating(true);
    void (async () => {
      try {
        const { uri, approval } = await client.connect({
          requiredNamespaces: getStacksNamespaceConfig()
        });

        if (uri) {
          openWalletConnectModal(uri);
        }

        const nextSession = await approval();
        setSession(nextSession);
        closeWalletConnectModal();
        const resolvedAddress = await resolveAddress(client, nextSession);
        setAddress(resolvedAddress);
      } catch (error) {
        console.warn("WalletConnect connection failed.", error);
        closeWalletConnectModal();
      } finally {
        setIsAuthenticating(false);
      }
    })();
  }, []);

  const callContract = useCallback(
    async (params: {
      contractAddress: string;
      contractName: string;
      functionName: string;
      functionArgs: ClarityValue[];
    }) => {
      const client = signClientRef.current;
      if (!client || !session) {
        throw new Error("Wallet not connected");
      }
      return requestStacksContractCall(client, session, params);
    },
    [session]
  );

  const value = useMemo<StacksContextValue>(
    () => ({
      session,
      address,
      isAuthenticating,
      isConnected: Boolean(session && address),
      connect,
      disconnect,
      refreshSession,
      callContract
    }),
    [address, callContract, connect, disconnect, isAuthenticating, refreshSession, session]
  );

  return <StacksContext.Provider value={value}>{children}</StacksContext.Provider>;
}
