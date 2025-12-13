"use client";

import { AppConfig, type AuthOptions } from "@stacks/connect";
import { UserSession } from "@stacks/auth";
import type { ConnectNetwork } from "@stacks/connect";

export const TESTNET_CORE_API = "https://api.testnet.hiro.so";
export const APP_NAME = "EventPass";
export const APP_ICON_PATH = "/icon.svg";
export const APP_MANIFEST_PATH = "/manifest.json";
export const APP_SCOPES = ["store_write", "publish_data"];
export const CONNECT_NETWORK: ConnectNetwork = "testnet";

export const CONTRACT_IDENTIFIER = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();

const resolveOrigin = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_ORIGIN ?? "";
};

export const buildAppConfig = () =>
  new AppConfig(
    APP_SCOPES,
    resolveOrigin() || undefined,
    "/",
    APP_MANIFEST_PATH,
    TESTNET_CORE_API
  );

export const createUserSession = () => new UserSession({ appConfig: buildAppConfig() });

export const buildAppDetails = () => ({
  name: APP_NAME,
  icon:
    typeof window !== "undefined" ? `${window.location.origin}${APP_ICON_PATH}` : APP_ICON_PATH
});

export const extractAddress = (data: Record<string, any> | null | undefined) => {
  if (!data) {
    return null;
  }
  const profile = data.profile ?? {};
  if (profile?.stxAddress) {
    if (typeof profile.stxAddress === "string") {
      return profile.stxAddress;
    }
    const { mainnet, testnet } = profile.stxAddress as Record<string, string | undefined>;
    if (CONNECT_NETWORK === "testnet") {
      return testnet ?? mainnet ?? null;
    }
    if (CONNECT_NETWORK === "mainnet") {
      return mainnet ?? testnet ?? null;
    }
    return testnet ?? mainnet ?? null;
  }
  return null;
};

export const clearSessionStore = (session: UserSession) => {
  const store = session.store as { deleteSessionData?: () => void };
  store.deleteSessionData?.();
};

export const buildAuthOptions = (
  session: UserSession,
  handlers: Pick<AuthOptions, "onCancel"> & {
    onFinish: NonNullable<AuthOptions["onFinish"]>;
    onClose?: () => void;
  }
) => {
  const options: AuthOptions & { network: ConnectNetwork } = {
    appDetails: buildAppDetails(),
    userSession: session,
    redirectTo: "/",
    ...handlers,
    network: CONNECT_NETWORK
  };
  return options;
};

export const getContractParts = (identifier = CONTRACT_IDENTIFIER) => {
  if (!identifier.includes(".")) {
    return { contractAddress: "", contractName: "" };
  }
  const [contractAddress, ...rest] = identifier.split(".");
  const contractName = rest.join(".");
  return {
    contractAddress,
    contractName
  };
};
