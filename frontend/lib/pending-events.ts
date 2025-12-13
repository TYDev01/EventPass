"use client";

const STORAGE_KEY = "eventpass.pending-events";

export type PendingEventRecord = {
  txId: string;
  title: string;
  date: string;
  priceMicroStx: string;
  totalSeats: number;
  creator: string;
  createdAt: number;
  imageIndex: number;
  expectedEventId?: number;
  metadataUri?: string;
};

const readStorage = (): PendingEventRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingEventRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => typeof item.txId === "string");
  } catch (error) {
    console.warn("Unable to read pending events from storage", error);
    return [];
  }
};

const writeStorage = (events: PendingEventRecord[]) => {
  if (typeof window === "undefined") {
    return;
  }
  if (events.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};

export const loadPendingEvents = (): PendingEventRecord[] => readStorage();

export const persistPendingEvents = (events: PendingEventRecord[]) => writeStorage(events);

export const addPendingEvent = (event: PendingEventRecord) => {
  const existing = readStorage().filter((item) => item.txId !== event.txId);
  existing.push(event);
  writeStorage(existing);
};

export const clearPendingEvent = (txId: string) => {
  const filtered = readStorage().filter((event) => event.txId !== txId);
  writeStorage(filtered);
};

export const derivePendingEventId = (txId: string) => {
  let hash = 0;
  for (let index = 0; index < txId.length; index += 1) {
    hash = (hash << 5) - hash + txId.charCodeAt(index);
    hash |= 0;
  }
  const normalized = Math.abs(hash) || Math.floor(Date.now() / 1000);
  return -normalized;
};
