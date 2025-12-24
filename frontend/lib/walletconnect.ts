"use client";

import SignClient from "@walletconnect/sign-client";
import type { SessionTypes } from "@walletconnect/types";
import { createAppKit } from "@reown/appkit/core";
import { mainnet } from "@reown/appkit/networks";
import { cvToHex, type ClarityValue } from "@stacks/transactions";

import { APP_ICON_PATH, APP_NAME, STACKS_NETWORK } from "@/lib/stacks";

const REOWN_PROJECT_ID =
  (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "").trim() ||
  "";

const STACKS_NAMESPACE = "stacks";
const STACKS_METHODS = [
  "stx_getAddresses",
  "stx_transferStx",
  "stx_signTransaction",
  "stx_signMessage",
  "stx_signStructuredMessage",
  "stx_callContract"
];
const STACKS_EVENTS = ["accountsChanged", "chainChanged"];

const resolveStacksChainId = () => {
  const configured = (process.env.NEXT_PUBLIC_STACKS_WC_CHAIN_ID ?? "").trim();
  if (configured) {
    return configured;
  }
  if (STACKS_NETWORK === "mainnet") {
    return "stacks:1";
  }
  if (STACKS_NETWORK === "testnet") {
    return "stacks:2147483648";
  }
  return "stacks:1";
};

const STACKS_CHAIN_ID = resolveStacksChainId();

type AddressResponse = {
  addresses?: Array<{ symbol?: string; address?: string }>;
};

type ContractCallParams = {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
};

let appKitInstance: ReturnType<typeof createAppKit> | null = null;
let signClientPromise: Promise<SignClient> | null = null;

const getAppKit = () => {
  if (!appKitInstance) {
    appKitInstance = createAppKit({
      projectId: REOWN_PROJECT_ID,
      networks: [mainnet],
      manualWCControl: true
    });
  }
  return appKitInstance;
};

const buildMetadata = () => {
  if (typeof window === "undefined") {
    return {
      name: APP_NAME,
      description: "EventPass Stacks ticketing",
      url: "",
      icons: []
    };
  }

  return {
    name: APP_NAME,
    description: "EventPass Stacks ticketing",
    url: window.location.origin,
    icons: [`${window.location.origin}${APP_ICON_PATH}`]
  };
};

export const getSignClient = async () => {
  if (!signClientPromise) {
    signClientPromise = SignClient.init({
      projectId: REOWN_PROJECT_ID,
      metadata: buildMetadata()
    });
  }
  return signClientPromise;
};

export const getStacksNamespaceConfig = () => ({
  [STACKS_NAMESPACE]: {
    methods: STACKS_METHODS,
    chains: [STACKS_CHAIN_ID],
    events: STACKS_EVENTS
  }
});

export const openWalletConnectModal = (uri: string) => {
  getAppKit().open({ uri });
};

export const closeWalletConnectModal = () => {
  getAppKit().close();
};

export const findStacksSession = (client: SignClient) => {
  const sessions = client.session.getAll();
  const stacksSessions = sessions.filter((session) => session.namespaces?.[STACKS_NAMESPACE]);
  if (stacksSessions.length > 0) {
    return stacksSessions[stacksSessions.length - 1];
  }
  return sessions[sessions.length - 1] ?? null;
};

export const getAddressFromSession = (session: SessionTypes.Struct | null) => {
  if (!session) {
    return null;
  }
  const accounts = session.namespaces?.[STACKS_NAMESPACE]?.accounts ?? [];
  if (accounts.length === 0) {
    return null;
  }
  const account = accounts[0];
  const parts = account.split(":");
  return parts[2] ?? null;
};

export const requestStacksAddresses = async (
  client: SignClient,
  session: SessionTypes.Struct
) => {
  const result = (await client.request({
    topic: session.topic,
    chainId: STACKS_CHAIN_ID,
    request: {
      method: "stx_getAddresses",
      params: {}
    }
  })) as AddressResponse;

  const addresses = result?.addresses ?? [];
  const stxAddress =
    addresses.find((entry) => entry.symbol === "STX")?.address ??
    addresses.find((entry) => entry.address)?.address ??
    null;

  return stxAddress ?? null;
};

export const requestStacksContractCall = async (
  client: SignClient,
  session: SessionTypes.Struct,
  params: ContractCallParams
) => {
  const functionArgs = params.functionArgs.map((arg) => cvToHex(arg));
  return client.request({
    topic: session.topic,
    chainId: STACKS_CHAIN_ID,
    request: {
      method: "stx_callContract",
      params: {
        contract: `${params.contractAddress}.${params.contractName}`,
        functionName: params.functionName,
        functionArgs
      }
    }
  }) as Promise<{ txid?: string; transaction?: string }>;
};
