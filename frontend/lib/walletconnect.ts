"use client";

import { UniversalConnector } from "@reown/appkit-universal-connector";
import type { CustomCaipNetwork } from "@reown/appkit-common";
import type { SessionTypes } from "@walletconnect/types";
import { cvToHex, type ClarityValue } from "@stacks/transactions";

import { APP_ICON_PATH, APP_NAME, CORE_API_BASE_URL, STACKS_NETWORK } from "@/lib/stacks";

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
const STACKS_EVENTS: string[] = [];

type AddressResponse = {
  addresses?: Array<{ symbol?: string; address?: string }>;
};

type ContractCallParams = {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
};

const resolveStacksChain = () => {
  if (STACKS_NETWORK === "mainnet") {
    return {
      id: 1,
      caipNetworkId: "stacks:1",
      name: "Stacks Mainnet"
    };
  }
  return {
    id: 2147483648,
    caipNetworkId: "stacks:2147483648",
    name: "Stacks Testnet"
  };
};

const buildStacksNetwork = (): CustomCaipNetwork<"stacks"> => {
  const base = resolveStacksChain();
  return {
    id: base.id,
    chainNamespace: "stacks",
    caipNetworkId: base.caipNetworkId as `stacks:${string}`,
    name: base.name,
    nativeCurrency: { name: "Stacks", symbol: "STX", decimals: 6 },
    rpcUrls: { default: { http: [CORE_API_BASE_URL] } }
  };
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

let connectorPromise: Promise<UniversalConnector> | null = null;

export const getUniversalConnector = async () => {
  if (!connectorPromise) {
    connectorPromise = UniversalConnector.init({
      projectId: REOWN_PROJECT_ID,
      metadata: buildMetadata(),
      networks: [
        {
          namespace: STACKS_NAMESPACE,
          chains: [buildStacksNetwork()],
          methods: STACKS_METHODS,
          events: STACKS_EVENTS
        }
      ]
    });
  }
  return connectorPromise;
};

export const getStacksSession = (connector: UniversalConnector) =>
  (connector.provider.session as SessionTypes.Struct | undefined) ?? null;

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
  connector: UniversalConnector,
  chainId: string
) => {
  const result = (await connector.request(
    {
      method: "stx_getAddresses",
      params: {}
    },
    chainId
  )) as AddressResponse;

  const addresses = result?.addresses ?? [];
  const stxAddress =
    addresses.find((entry) => entry.symbol === "STX")?.address ??
    addresses.find((entry) => entry.address)?.address ??
    null;

  return stxAddress ?? null;
};

export const requestStacksContractCall = async (
  connector: UniversalConnector,
  chainId: string,
  params: ContractCallParams
) => {
  const functionArgs = params.functionArgs.map((arg) => cvToHex(arg));
  return connector.request(
    {
      method: "stx_callContract",
      params: {
        contract: `${params.contractAddress}.${params.contractName}`,
        functionName: params.functionName,
        functionArgs
      }
    },
    chainId
  ) as Promise<{ txid?: string; transaction?: string }>;
};

export const getStacksChainId = () => resolveStacksChain().caipNetworkId;

export const getStacksMethods = () => [...STACKS_METHODS];

export const getStacksEvents = () => [...STACKS_EVENTS];

export const openWalletConnectModal = (connector: UniversalConnector) =>
  connector.connect({
    requiredNamespaces: {
      [STACKS_NAMESPACE]: {
        chains: [getStacksChainId()],
        methods: getStacksMethods(),
        events: getStacksEvents()
      }
    }
  });
