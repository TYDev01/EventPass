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
import type { UniversalConnector } from "@reown/appkit-universal-connector";

import {
  getAddressFromSession,
  getStacksChainId,
  getStacksSession,
  getUniversalConnector,
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
  connector: UniversalConnector,
  session: SessionTypes.Struct | null,
  chainId: string
) => {
  const fromSession = getAddressFromSession(session);
  if (fromSession) {
    return fromSession;
  }
  if (!session) {
    return null;
  }
  try {
    return await requestStacksAddresses(connector, chainId);
  } catch (error) {
    console.warn("Unable to resolve Stacks address from WalletConnect.", error);
    return null;
  }
};

export function StacksProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const connectorRef = useRef<UniversalConnector | null>(null);
  const listenersAttachedRef = useRef(false);
  const chainIdRef = useRef(getStacksChainId());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let isMounted = true;
    const initialize = async () => {
      const connector = await getUniversalConnector();
      if (!isMounted) {
        return;
      }
      connectorRef.current = connector;
      if (!listenersAttachedRef.current) {
        connector.provider?.on?.("session_update", ({ params }: { params: any }) => {
          const { namespaces } = params ?? {};
          const existing = connector.provider.session as SessionTypes.Struct | undefined;
          if (!existing) {
            return;
          }
          const updated = { ...existing, namespaces };
          setSession(updated);
          void resolveAddress(connector, updated, chainIdRef.current).then(setAddress);
        });

        connector.provider?.on?.("session_delete", () => {
          setSession(null);
          setAddress(null);
        });

        listenersAttachedRef.current = true;
      }

      const existingSession = getStacksSession(connector);
      setSession(existingSession);
      const resolvedAddress = await resolveAddress(
        connector,
        existingSession,
        chainIdRef.current
      );
      setAddress(resolvedAddress);
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) {
      return;
    }
    const existingSession = getStacksSession(connector);
    setSession(existingSession);
    const resolvedAddress = await resolveAddress(
      connector,
      existingSession,
      chainIdRef.current
    );
    setAddress(resolvedAddress);
  }, []);

  const disconnect = useCallback(() => {
    const connector = connectorRef.current;
    if (!connector) {
      return;
    }
    void connector
      .disconnect()
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
    const connector = connectorRef.current;
    if (!connector) {
      console.warn("Universal Connector not ready yet.");
      return;
    }

    setIsAuthenticating(true);
    void (async () => {
      try {
        const { session: providerSession } = await openWalletConnectModal(connector);
        setSession(providerSession as SessionTypes.Struct);
        const resolvedAddress = await resolveAddress(
          connector,
          providerSession as SessionTypes.Struct,
          chainIdRef.current
        );
        setAddress(resolvedAddress);
      } catch (error) {
        console.warn("WalletConnect connection failed.", error);
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
      const connector = connectorRef.current;
      if (!connector || !session) {
        throw new Error("Wallet not connected");
      }
      return requestStacksContractCall(connector, chainIdRef.current, params);
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
