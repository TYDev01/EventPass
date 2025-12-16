"use client";

import {
  ClarityType,
  cvToString,
  cvToValue,
  uintCV,
  fetchCallReadOnlyFunction,
  type ClarityValue,
  type OptionalCV,
  type TupleCV
} from "@stacks/transactions";
import { createNetwork } from "@stacks/network";

import { TESTNET_CORE_API, getContractParts } from "@/lib/stacks";

export const EVENT_IMAGE_POOL = [
  "/images/stacks-summit.svg",
  "/images/defi-horizons.svg",
  "/images/metaverse-nights.svg",
  "/images/creator-lab.svg"
];

export const MICROSTX = 1_000_000n;

const network = createNetwork({ network: "testnet", client: { baseUrl: TESTNET_CORE_API } });

const DEFAULT_SENDER = "ST000000000000000000002AMW42H";

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
  metadataUri: string;
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
  // Try .data first (newer format)
  const record = (tuple as any).data;
  if (record && typeof record === 'object' && key in record) {
    console.log(`✅ Found "${key}" in .data:`, record[key]);
    return record[key];
  }
  
  // Try .value (legacy format)
  const legacy = (tuple as any).value;
  if (legacy && typeof legacy === 'object' && key in legacy) {
    console.log(`✅ Found "${key}" in .value:`, legacy[key]);
    return legacy[key];
  }
  
  // Try direct access
  if (key in tuple) {
    console.log(`✅ Found "${key}" directly:`, (tuple as any)[key]);
    return (tuple as any)[key];
  }
  
  console.warn(`⚠️ Could not find field "${key}" in tuple.`);
  console.log('Available in .data:', record ? Object.keys(record) : 'N/A');
  console.log('Available in .value:', legacy ? Object.keys(legacy) : 'N/A');
  console.log('Available directly:', Object.keys(tuple));
  return undefined;
};

const readString = (tuple: TupleCV, key: string, fallback: string) => {
  const field = readTupleField(tuple, key);
  if (!field) {
    return fallback;
  }
  
  // Handle object format: {type: 'ascii', value: 'string'}
  if (typeof field === 'object' && 'value' in field) {
    return typeof field.value === 'string' ? field.value : fallback;
  }
  
  // Handle Clarity type format
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
  
  // Handle object format: {type: 'address', value: 'ST...'}
  if (typeof field === 'object' && 'value' in field && typeof field.value === 'string') {
    return field.value;
  }
  
  // Handle Clarity type format
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
  
  // Handle object format: {type: 'uint', value: 10000000n}
  if (typeof field === 'object' && 'value' in field) {
    return normalizeBigInt(field.value);
  }
  
  // Handle Clarity type format
  if (field.type === ClarityType.UInt) {
    return normalizeBigInt(field.value);
  }
  return 0n;
};

const parseEventTuple = (eventId: number, tuple: TupleCV): OnChainEvent => {
  console.log(`📝 Parsing event #${eventId}, raw tuple:`, tuple);
  
  // Use manual parsing with cvToString for reliable string conversion
  const title = readString(tuple, "title", `Event #${eventId}`);
  const date = readString(tuple, "date", "TBA");
  const price = readUInt(tuple, "price");
  const totalSeats = Number(readUInt(tuple, "total-seats"));
  const soldSeats = Number(readUInt(tuple, "sold-seats"));
  const status = mapStatusCode(readUInt(tuple, "status"));
  const creator = readPrincipal(tuple, "creator", DEFAULT_SENDER);
  const metadataUri = readString(tuple, "metadata-uri", "");
  
  console.log(`  Parsed values:`, { 
    title, 
    date, 
    price: price.toString(), 
    totalSeats, 
    soldSeats,
    status,
    creator,
    metadataUri
  });
  
  return {
    id: eventId,
    title,
    date,
    priceMicroStx: price,
    totalSeats,
    soldSeats,
    status,
    creator,
    metadataUri
  };
};

const fetchEventById = async (
  contractAddress: string,
  contractName: string,
  senderAddress: string,
  eventId: bigint
): Promise<OnChainEvent | null> => {
  try {
    console.log(`  📞 Fetching event ${eventId}...`);
    const response = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-event",
      functionArgs: [uintCV(eventId)],
      network,
      senderAddress
    });

    console.log(`  📦 Raw response for event ${eventId}:`, response);

    const tuple = getTupleFromOptional(response);
    if (!tuple) {
      console.warn(`  ⚠️ Event ${eventId} returned empty/none`);
      return null;
    }

    const parsed = parseEventTuple(Number(eventId), tuple);
    console.log(`  ✅ Successfully parsed event ${eventId}`);
    return parsed;
  } catch (error) {
    console.error(`❌ Failed to fetch event ${eventId.toString()}:`, error);
    return null;
  }
};

export const fetchOnChainEvents = async (senderAddress?: string | null): Promise<OnChainEvent[]> => {
  const { contractAddress, contractName } = getContractParts();

  console.log("🎯 fetchOnChainEvents called with:", { contractAddress, contractName, senderAddress });

  if (!contractAddress || !contractName) {
    console.warn("❌ No contract configured");
    return [];
  }

  const resolvedSender = resolveSenderAddress(senderAddress, contractAddress);
  const nextId = await fetchNextEventId(resolvedSender);

  console.log(`📋 Will fetch events from 1 to ${(nextId - 1n).toString()}`);

  const events: OnChainEvent[] = [];

  if (nextId > 1n) {
    const requests: Promise<OnChainEvent | null>[] = [];
    for (let eventId = 1n; eventId < nextId; eventId += 1n) {
      console.log(`  Queueing fetch for event ID: ${eventId.toString()}`);
      requests.push(fetchEventById(contractAddress, contractName, resolvedSender, eventId));
    }
    console.log(`⏳ Fetching ${requests.length} events...`);
    const results = await Promise.all(requests);
    events.push(...results.filter((item): item is OnChainEvent => Boolean(item)));
    console.log(`✅ Successfully fetched ${events.length} events`);
  } else {
    console.log("⚠️ nextId is 1 or less, using fallback scan");

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
  console.log("🔍 fetchNextEventId - Contract parts:", { contractAddress, contractName });
  
  if (!contractAddress || !contractName) {
    console.warn("❌ Contract address or name missing");
    return 1n;
  }
  const resolvedSender = resolveSenderAddress(senderAddress, contractAddress);
  console.log("📞 Calling get-next-event-id with sender:", resolvedSender);

  try {
    const nextIdValue = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-next-event-id",
      functionArgs: [],
      network,
      senderAddress: resolvedSender
    });

    console.log("✅ get-next-event-id response:", nextIdValue);

    if (nextIdValue.type === ClarityType.UInt) {
      const id = normalizeBigInt(nextIdValue.value);
      console.log("📊 Next event ID:", id.toString());
      return id;
    }

    console.warn("⚠️ Unexpected response type:", nextIdValue.type);
    return 1n;
  } catch (error) {
    console.error("❌ Unable to read next-event-id from contract:", error);
    return 1n;
  }
};

export const formatPriceFromMicroStx = (value: bigint | number): string => {
  // Convert to BigInt if it's a number
  const valueBigInt = typeof value === 'bigint' ? value : BigInt(Math.floor(value));
  
  const whole = valueBigInt / MICROSTX;
  const fraction = valueBigInt % MICROSTX;
  if (fraction === 0n) {
    return `${whole.toString()} STX`;
  }
  const fractionStr = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toString()}.${fractionStr} STX`;
};

export const getEventImageByIndex = (index: number) =>
  EVENT_IMAGE_POOL[Math.abs(index) % EVENT_IMAGE_POOL.length];
