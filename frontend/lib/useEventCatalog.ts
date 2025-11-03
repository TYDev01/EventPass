"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useStacks } from "@/components/StacksProvider";

import { events as sampleEvents, type EventPassEvent } from "@/lib/data";
import {
  fetchOnChainEvents,
  formatPriceFromMicroStx,
  getEventImageByIndex,
  type OnChainEvent
} from "@/lib/events";
import {
  derivePendingEventId,
  loadPendingEvents,
  persistPendingEvents,
  type PendingEventRecord
} from "@/lib/pending-events";
import { getContractParts } from "@/lib/stacks";
import { summarizePrincipal, summarizeHash } from "@/lib/utils";

type EventStats = {
  active: number;
  minted: number;
  capacity: number;
};

const mapOnChainToDisplay = (events: OnChainEvent[]): EventPassEvent[] =>
  events.map((event) => {
    const image = getEventImageByIndex(event.id);
    const creatorLabel = summarizePrincipal(event.creator);
    const priceLabel = formatPriceFromMicroStx(event.priceMicroStx);

    return {
      id: event.id,
      title: event.title,
      date: event.date,
      price: priceLabel,
      status: event.status,
      seats: event.totalSeats,
      sold: event.soldSeats,
      image,
      description: `Minted by ${creatorLabel} with EventPass smart contracts.`,
      location: "EventPass • On-chain drop",
      creator: event.creator,
      isOnChain: true
    };
  });

const computeStats = (events: EventPassEvent[]): EventStats =>
  events.reduce<EventStats>(
    (acc, event) => {
      if (event.status === "Pending") {
        return acc;
      }
      if (event.status === "Active") {
        acc.active += 1;
      }
      acc.minted += event.sold;
      acc.capacity += event.seats;
      return acc;
    },
    {
      active: 0,
      minted: 0,
      capacity: 0
    }
  );

const mapPendingToDisplayEvents = (records: PendingEventRecord[]): EventPassEvent[] =>
  records
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((record) => {
      const price = (() => {
        try {
          return formatPriceFromMicroStx(BigInt(record.priceMicroStx));
        } catch {
          const fallbackValue = Number.parseFloat(record.priceMicroStx || "0") / 1_000_000;
          if (Number.isNaN(fallbackValue)) {
            return "0 STX";
          }
          return `${fallbackValue} STX`;
        }
      })();
      const creatorLabel = record.creator ? summarizePrincipal(record.creator) : "Unknown creator";
      const baseId = record.expectedEventId ?? derivePendingEventId(record.txId);
      const imageIndex = record.imageIndex ?? 0;
      const seatsValue = Number.isFinite(record.totalSeats)
        ? record.totalSeats
        : Number.parseInt(String(record.totalSeats ?? 0), 10);

      return {
        id: baseId,
        title: record.title,
        date: record.date,
        price,
        status: "Pending",
        seats: Number.isFinite(seatsValue) && seatsValue > 0 ? seatsValue : 0,
        sold: 0,
        image: getEventImageByIndex(imageIndex),
        description: `Awaiting confirmation for transaction ${summarizeHash(record.txId)}.`,
        location: "Pending on-chain confirmation",
        creator: record.creator,
        isOnChain: false,
        txId: record.txId
      };
    });

const reconcilePendingRecords = (
  onChainEvents: OnChainEvent[],
  pendingRecords: PendingEventRecord[]
): PendingEventRecord[] => {
  if (pendingRecords.length === 0) {
    return pendingRecords;
  }

  const confirmedIds = new Set<number>(onChainEvents.map((event) => event.id));
  const confirmedSignatures = new Set(
    onChainEvents.map(
      (event) =>
        `${event.title.toLowerCase()}|${event.date.toLowerCase()}|${event.creator}|${event.priceMicroStx.toString()}|${event.totalSeats}`
    )
  );

  return pendingRecords.filter((pending) => {
    if (pending.expectedEventId && confirmedIds.has(pending.expectedEventId)) {
      return false;
    }
    if (!pending.creator) {
      return true;
    }
    const signature = `${pending.title.toLowerCase()}|${pending.date.toLowerCase()}|${pending.creator}|${pending.priceMicroStx}|${pending.totalSeats}`;
    return !confirmedSignatures.has(signature);
  });
};

export type EventCatalogState = {
  events: EventPassEvent[];
  isLoading: boolean;
  loadError: string | null;
  showEmptyState: boolean;
  stats: EventStats;
  contractConfigured: boolean;
  usedSampleFallback: boolean;
  refresh: () => void;
};

export function useEventCatalog(): EventCatalogState {
  const [{ contractAddress, contractName }] = useState(() => getContractParts());
  const contractConfigured = Boolean(contractAddress && contractName);
  const { address } = useStacks();

  const [onChainEvents, setOnChainEvents] = useState<EventPassEvent[]>([]);
  const [pendingRecords, setPendingRecords] = useState<PendingEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [usedSampleFallback, setUsedSampleFallback] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const readPendingFromStorage = () => {
      const stored = loadPendingEvents();
      if (!cancelled) {
        setPendingRecords(stored);
      }
      return stored;
    };

    const loadEvents = async () => {
      setIsLoading(true);
      setLoadError(null);
      setUsedSampleFallback(false);
      const initialPending = readPendingFromStorage();

      if (!contractConfigured) {
        if (!cancelled) {
          setOnChainEvents(sampleEvents);
          setLoadError(
            "Contract address not configured. Define NEXT_PUBLIC_CONTRACT_ADDRESS to load live events."
          );
          setUsedSampleFallback(true);
          setIsLoading(false);
          setHasAttemptedLoad(true);
          setPendingRecords(initialPending);
        }
        return;
      }

      try {
        const onChainEvents = await fetchOnChainEvents(address);
        if (cancelled) {
          return;
        }
        const reconciledPending = reconcilePendingRecords(onChainEvents, initialPending);
        if (!cancelled) {
          setOnChainEvents(mapOnChainToDisplay(onChainEvents));
          setLoadError(null);
          if (reconciledPending.length !== initialPending.length) {
            persistPendingEvents(reconciledPending);
          }
          setPendingRecords(reconciledPending);
        }
      } catch (error) {
        console.error("Unable to load on-chain events", error);
        if (!cancelled) {
          setOnChainEvents(sampleEvents);
          setLoadError("Unable to load on-chain events. Displaying sample showcases instead.");
          setUsedSampleFallback(true);
          // Ensure pending events still surface
          setPendingRecords(initialPending);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasAttemptedLoad(true);
        }
      }
    };

    void loadEvents();

    return () => {
      cancelled = true;
    };
  }, [address, contractConfigured, refreshToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (event: StorageEvent) => {
      if (event.key === "eventpass.pending-events") {
        setPendingRecords(loadPendingEvents());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!contractConfigured || !address || pendingRecords.length === 0) {
      return;
    }
    const interval = window.setInterval(() => {
      setRefreshToken((token) => token + 1);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [address, contractConfigured, pendingRecords.length]);

  const pendingDisplayEvents = useMemo(
    () => mapPendingToDisplayEvents(pendingRecords),
    [pendingRecords]
  );

  const combinedEvents = useMemo(
    () => [...pendingDisplayEvents, ...onChainEvents],
    [onChainEvents, pendingDisplayEvents]
  );

  const stats = useMemo(() => computeStats(onChainEvents), [onChainEvents]);
  const showEmptyState =
    !isLoading && hasAttemptedLoad && combinedEvents.length === 0 && !loadError;

  return {
    events: combinedEvents,
    isLoading,
    loadError,
    showEmptyState,
    stats,
    contractConfigured,
    usedSampleFallback,
    refresh
  };
}
