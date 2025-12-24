"use client";

type StacksNetworkName = "mainnet" | "testnet" | "devnet" | "mocknet";

const resolveStacksNetwork = (value: string | undefined): StacksNetworkName => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "mainnet") {
    return "mainnet";
  }
  if (normalized === "testnet") {
    return "testnet";
  }
  return "testnet";
};

export const STACKS_NETWORK = resolveStacksNetwork(process.env.NEXT_PUBLIC_STACKS_NETWORK);
export const CORE_API_BASE_URL =
  (process.env.NEXT_PUBLIC_STACKS_API_BASE_URL ?? "").trim() ||
  (STACKS_NETWORK === "mainnet" ? "https://api.hiro.so" : "https://api.testnet.hiro.so");

export const APP_NAME = "EventPass";
export const APP_ICON_PATH = "/icon.svg";

export const CONTRACT_IDENTIFIER = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "").trim();

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
