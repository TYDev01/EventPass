"use client";

import {
  ClarityType,
  callReadOnlyFunction,
  cvToString,
  uintCV,
  type ClarityValue,
  type OptionalCV,
  type TupleCV
} from "@stacks/transactions-v6";
import { StacksTestnet } from "@stacks/network-v6";

import { TESTNET_CORE_API, getContractParts } from "@/lib/stacks";

export const EVENT_IMAGE_POOL = [
  "/images/stacks-summit.svg",
  "/images/defi-horizons.svg",
  "/images/metaverse-nights.svg",
  "/images/creator-lab.svg"
];

export const MICROSTX = 1_000_000n;

const network = new StacksTestnet({ url: TESTNET_CORE_API });

const DEFAULT_SENDER = "ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK.event-pass";

const resolveSenderAddress = (senderAddress: string | null | undefined, contractAddress: string) => {
  if (senderAddress && senderAddress.length > 0) {
    return senderAddress;
  }
  if (contractAddress) {
    return contractAddress;
  }
  return DEFAULT_SENDER;
};

export type EventStatus = "Active" | "Canceled" | "Ended";

export type OnChainEvent = {
  id: number;
  title: string;
  date: string;
  priceMicroStx: bigint;
  totalSeats: number;
  soldSeats: number;
  status: EventStatus;
  creator: string;
};

const mapStatusCode = (code: bigint): EventStatus => {
  switch (code) {
    case 0n:
      return "Active";
    case 1n:
      return "Canceled";
    case 2n:
      return "Ended";
    default:
      return "Active";
  }
};

export const normalizeBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return 0n;
    }
  }
  return 0n;
};

const getTupleFromOptional = (value: ClarityValue): TupleCV | null => {
  if (value.type !== ClarityType.OptionalSome) {
    return null;
  }
  const optional = value as OptionalCV;
  const inner = optional.value;
  if (!inner || inner.type !== ClarityType.Tuple) {
    return null;
  }
  return inner as TupleCV;
};

const readTupleField = (tuple: TupleCV, key: string) => {
  const record = (tuple as { data?: Record<string, ClarityValue>; value?: Record<string, ClarityValue> }).data;
  if (record && key in record) {
    return record[key];
  }
  const legacy = (tuple as { value?: Record<string, ClarityValue> }).value;
  if (legacy && key in legacy) {
    return legacy[key];
  }
  return undefined;
};

const readString = (tuple: TupleCV, key: string, fallback: string) => {
  const field = readTupleField(tuple, key);
  if (!field) {
    return fallback;
  }
  if (field.type === ClarityType.StringASCII || field.type === ClarityType.StringUTF8) {
    const data = (field as { data?: unknown }).data;
    return typeof data === "string" ? data : fallback;
  }
  const data = (field as { data?: unknown }).data;
  if (typeof data === "string") {
    return data;
  }
  return fallback;
};

const readPrincipal = (tuple: TupleCV, key: string, fallback: string) => {
  const field = readTupleField(tuple, key);
  if (!field) {
    return fallback;
  }
  if (field.type === ClarityType.PrincipalStandard || field.type === ClarityType.PrincipalContract) {
    return cvToString(field);
  }
  return fallback;
};

const readUInt = (tuple: TupleCV, key: string): bigint => {
  const field = readTupleField(tuple, key);
  if (!field) {
    return 0n;
  }
  if (field.type === ClarityType.UInt) {
    return normalizeBigInt(field.value);
  }
  return 0n;
};

const parseEventTuple = (eventId: number, tuple: TupleCV): OnChainEvent => {
  const title = readString(tuple, "title", `Event #${eventId}`);
  const date = readString(tuple, "date", "TBA");
  const price = readUInt(tuple, "price");
  const totalSeats = Number(readUInt(tuple, "total-seats"));
  const soldSeats = Number(readUInt(tuple, "sold-seats"));
  const status = mapStatusCode(readUInt(tuple, "status"));
  const creator = readPrincipal(tuple, "creator", DEFAULT_SENDER);

  return {
    id: eventId,
    title,
    date,
    priceMicroStx: price,
    totalSeats,
    soldSeats,
    status,
    creator
  };
};

const fetchEventById = async (
  contractAddress: string,
  contractName: string,
  senderAddress: string,
  eventId: bigint
): Promise<OnChainEvent | null> => {
  try {
    const response = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-event",
      functionArgs: [uintCV(eventId)],
      network,
      senderAddress
    });

    const tuple = getTupleFromOptional(response);
    if (!tuple) {
      return null;
    }

    return parseEventTuple(Number(eventId), tuple);
  } catch (error) {
    console.warn(`Failed to fetch event ${eventId.toString()}`, error);
    return null;
  }
};

export const fetchOnChainEvents = async (senderAddress?: string | null): Promise<OnChainEvent[]> => {
  const { contractAddress, contractName } = getContractParts();

  if (!contractAddress || !contractName) {
    return [];
  }

  const resolvedSender = resolveSenderAddress(senderAddress, contractAddress);
  const nextId = await fetchNextEventId(resolvedSender);

  const events: OnChainEvent[] = [];

  if (nextId > 1n) {
    const requests: Promise<OnChainEvent | null>[] = [];
    for (let eventId = 1n; eventId < nextId; eventId += 1n) {
      requests.push(fetchEventById(contractAddress, contractName, resolvedSender, eventId));
    }
    const results = await Promise.all(requests);
    events.push(...results.filter((item): item is OnChainEvent => Boolean(item)));
  } else {
    // Fallback scan for the first few event slots when the next-id lookup fails.
    const MAX_FALLBACK_EVENTS = 100n;
    for (let eventId = 1n; eventId <= MAX_FALLBACK_EVENTS; eventId += 1n) {
      const result = await fetchEventById(
        contractAddress,
        contractName,
        resolvedSender,
        eventId
      );
      if (!result) {
        if (eventId === 1n) {
          continue;
        }
        break;
      }
      events.push(result);
    }
  }

  return events.sort((a, b) => b.id - a.id);
};

export const fetchNextEventId = async (senderAddress?: string | null): Promise<bigint> => {
  const { contractAddress, contractName } = getContractParts();
  if (!contractAddress || !contractName) {
    return 1n;
  }
  const resolvedSender = resolveSenderAddress(senderAddress, contractAddress);

  try {
    const nextIdValue = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-next-event-id",
      functionArgs: [],
      network,
      senderAddress: resolvedSender
    });

    if (nextIdValue.type === ClarityType.UInt) {
      return normalizeBigInt(nextIdValue.value);
    }

    return 1n;
  } catch (error) {
    console.warn("Unable to read next-event-id from contract", error);
    return 1n;
  }
};

export const formatPriceFromMicroStx = (value: bigint): string => {
  const whole = value / MICROSTX;
  const fraction = value % MICROSTX;
  if (fraction === 0n) {
    return `${whole.toString()} STX`;
  }
  const fractionStr = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionStr} STX`;
};

export const getEventImageByIndex = (index: number) =>
  EVENT_IMAGE_POOL[Math.abs(index) % EVENT_IMAGE_POOL.length];
