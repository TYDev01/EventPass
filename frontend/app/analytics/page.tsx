"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Download,
  LineChart,
  Printer,
  Timer,
  TrendingUp,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEventCatalog } from "@/lib/useEventCatalog";
import { useStacks } from "@/components/StacksProvider";
import type { EventPassEvent } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getChainhookClient } from "@/lib/chainhook-client";
import { CORE_API_BASE_URL, getContractParts } from "@/lib/stacks";

const SALES_WINDOW_HOURS = 72;
const VELOCITY_BUCKET_HOURS = 6;
const CONTRACT_EVENTS_PAGE_SIZE = 50;
const MAX_CONTRACT_EVENTS_PAGES = 6;

const parsePriceToStx = (event: EventPassEvent): number => {
  if (event.priceMicroStx !== undefined) {
    return Number(event.priceMicroStx) / 1_000_000;
  }
  const parsed = Number.parseFloat(event.price.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildTierData = (_event: EventPassEvent, soldCount: number) => [
  { name: "Standard", value: Math.max(soldCount, 0) }
];

const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const formatDayKey = (date: Date) => date.toISOString().slice(0, 10);

const buildDailyDeltaSeries = (series: { date: string; sold: number }[]) => {
  let last = 0;
  return series.map((item) => {
    const delta = Math.max(0, item.sold - last);
    last = item.sold;
    return { date: item.date, value: delta };
  });
};

const buildWeeklySeries = (daily: { date: string; value: number }[]) => {
  const weeks: { label: string; value: number }[] = [];
  daily.forEach((item, index) => {
    const weekIndex = Math.floor(index / 7);
    const label = `Week ${weekIndex + 1}`;
    if (!weeks[weekIndex]) {
      weeks[weekIndex] = { label, value: 0 };
    }
    weeks[weekIndex].value += item.value;
  });
  return weeks;
};

type ContractLogEvent = {
  event_type?: string;
  tx_id?: string;
  block_time?: number;
  block_time_iso?: string;
  burn_block_time_iso?: string;
  contract_log?: {
    value?: {
      repr?: string;
    };
  };
};

type ParsedContractEvent = {
  event: string;
  eventId: number;
  seat?: number;
  priceMicroStx?: bigint;
  timestamp: Date;
};

const parsePrintEvent = (repr: string | undefined) => {
  if (!repr) {
    return null;
  }
  const eventMatch = repr.match(/\(event \"([^\"]+)\"\)/);
  const eventIdMatch = repr.match(/\(event-id u(\d+)\)/);
  if (!eventMatch || !eventIdMatch) {
    return null;
  }
  const seatMatch = repr.match(/\(seat u(\d+)\)/);
  const priceMatch = repr.match(/\(price u(\d+)\)/);
  return {
    event: eventMatch[1],
    eventId: Number(eventIdMatch[1]),
    seat: seatMatch ? Number(seatMatch[1]) : undefined,
    priceMicroStx: priceMatch ? BigInt(priceMatch[1]) : undefined
  };
};

const parseContractEvents = (events: ContractLogEvent[]): ParsedContractEvent[] => {
  return events.flatMap((event) => {
    if (event.event_type !== "smart_contract_log") {
      return [];
    }
    const parsed = parsePrintEvent(event.contract_log?.value?.repr);
    if (!parsed || !Number.isFinite(parsed.eventId)) {
      return [];
    }
    const timestamp =
      event.burn_block_time_iso ||
      event.block_time_iso ||
      (event.block_time ? new Date(event.block_time * 1000).toISOString() : null);
    if (!timestamp) {
      return [];
    }
    return [
      {
        ...parsed,
        timestamp: new Date(timestamp)
      }
    ];
  });
};

const fetchContractEvents = async (contractId: string) => {
  const collected: ContractLogEvent[] = [];
  for (let page = 0; page < MAX_CONTRACT_EVENTS_PAGES; page += 1) {
    const offset = page * CONTRACT_EVENTS_PAGE_SIZE;
    const url = `${CORE_API_BASE_URL}/extended/v1/contract/${contractId}/events?limit=${CONTRACT_EVENTS_PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Unable to fetch contract events");
    }
    const payload = await response.json();
    const events = (payload?.events ?? payload?.results ?? []) as ContractLogEvent[];
    if (!Array.isArray(events) || events.length === 0) {
      break;
    }
    collected.push(...events);
    if (events.length < CONTRACT_EVENTS_PAGE_SIZE) {
      break;
    }
  }
  return collected;
};

const buildSalesSeriesFromPurchases = (
  purchases: ParsedContractEvent[],
  pricePerTicket: number
) => {
  if (purchases.length === 0) {
    return [];
  }
  const sorted = [...purchases].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const dailyCounts = new Map<string, number>();
  sorted.forEach((purchase) => {
    const key = formatDayKey(purchase.timestamp);
    dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
  });

  const start = sorted[0].timestamp;
  const end = sorted[sorted.length - 1].timestamp;
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const series: { date: string; sold: number; revenue: number }[] = [];
  let cumulative = 0;

  while (cursor <= endDay) {
    const key = formatDayKey(cursor);
    const soldToday = dailyCounts.get(key) ?? 0;
    cumulative += soldToday;
    series.push({
      date: formatDayLabel(cursor),
      sold: cumulative,
      revenue: Number((cumulative * pricePerTicket).toFixed(2))
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

const buildVelocitySeriesFromPurchases = (purchases: ParsedContractEvent[]) => {
  const buckets = Array.from({ length: SALES_WINDOW_HOURS / VELOCITY_BUCKET_HOURS }).map(
    (_, index) => ({
      label: `${(index + 1) * VELOCITY_BUCKET_HOURS}h`,
      value: 0
    })
  );
  if (purchases.length === 0) {
    return buckets;
  }
  const end = new Date();
  const start = new Date(end.getTime() - SALES_WINDOW_HOURS * 60 * 60 * 1000);
  purchases.forEach((purchase) => {
    if (purchase.timestamp < start || purchase.timestamp > end) {
      return;
    }
    const diff = purchase.timestamp.getTime() - start.getTime();
    const bucketIndex = Math.min(
      buckets.length - 1,
      Math.max(0, Math.floor(diff / (VELOCITY_BUCKET_HOURS * 60 * 60 * 1000)))
    );
    buckets[bucketIndex].value += 1;
  });
  return buckets;
};

const buildPeakSeriesFromPurchases = (purchases: ParsedContractEvent[]) => {
  const buckets = [
    { label: "Morning", value: 0 },
    { label: "Afternoon", value: 0 },
    { label: "Evening", value: 0 },
    { label: "Night", value: 0 }
  ];
  purchases.forEach((purchase) => {
    const hour = purchase.timestamp.getHours();
    if (hour >= 6 && hour < 12) {
      buckets[0].value += 1;
    } else if (hour >= 12 && hour < 18) {
      buckets[1].value += 1;
    } else if (hour >= 18 && hour < 24) {
      buckets[2].value += 1;
    } else {
      buckets[3].value += 1;
    }
  });
  return buckets;
};

const buildHeatmapFromPurchases = (purchases: ParsedContractEvent[]) => {
  const counts: number[][] = Array.from({ length: 7 }, () => Array(6).fill(0));
  purchases.forEach((purchase) => {
    const date = purchase.timestamp;
    const dayIndex = (date.getDay() + 6) % 7;
    const slotIndex = Math.min(5, Math.floor(date.getHours() / 4));
    counts[dayIndex][slotIndex] += 1;
  });
  const maxCount = counts.flat().reduce((max, value) => Math.max(max, value), 0);
  const cells = [];
  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < 6; slot += 1) {
      const value = maxCount > 0 ? counts[day][slot] / maxCount : 0;
      cells.push({
        key: `${day}-${slot}`,
        day,
        slot,
        value
      });
    }
  }
  return cells;
};

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const { events, isLoading, refresh } = useEventCatalog();
  const { address } = useStacks();
  const [{ contractAddress, contractName }] = useState(() => getContractParts());
  const contractConfigured = Boolean(contractAddress && contractName);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [logRefreshToken, setLogRefreshToken] = useState(0);
  const [contractEvents, setContractEvents] = useState<ParsedContractEvent[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const userEvents = useMemo(() => {
    if (!address) {
      return [];
    }
    return events.filter((event) => event.creator === address && event.status === "Active");
  }, [address, events]);

  const selectedEventIdParam = Number(searchParams.get("eventId"));
  const defaultEvent = userEvents[0];
  const [selectedEventId, setSelectedEventId] = useState<number>(
    Number.isFinite(selectedEventIdParam) ? selectedEventIdParam : defaultEvent?.id ?? 0
  );

  const selectedEvent = useMemo(() => {
    const direct = userEvents.find((event) => event.id === selectedEventId);
    if (direct) {
      return direct;
    }
    return defaultEvent ?? null;
  }, [defaultEvent, selectedEventId, userEvents]);

  useEffect(() => {
    if (!contractConfigured) {
      return;
    }
    const contractId = `${contractAddress}.${contractName}`;
    let cancelled = false;
    setLogLoading(true);
    setLogError(null);
    fetchContractEvents(contractId)
      .then((events) => {
        if (cancelled) {
          return;
        }
        setContractEvents(parseContractEvents(events));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error("Failed to load contract events", error);
        setLogError("Unable to load indexed contract events.");
      })
      .finally(() => {
        if (!cancelled) {
          setLogLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contractConfigured, contractAddress, contractName, logRefreshToken]);

  const filteredEvents = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return contractEvents.filter((event) => event.eventId === selectedEvent.id);
  }, [contractEvents, selectedEvent]);

  const purchaseEvents = useMemo(
    () => filteredEvents.filter((event) => event.event === "ticket-purchased"),
    [filteredEvents]
  );

  const refundClaimedEvents = useMemo(
    () => filteredEvents.filter((event) => event.event === "refund-claimed"),
    [filteredEvents]
  );

  const refundProcessedEvents = useMemo(
    () => filteredEvents.filter((event) => event.event === "refund-processed"),
    [filteredEvents]
  );

  const transferEvents = useMemo(
    () => filteredEvents.filter((event) => event.event === "ticket-transferred"),
    [filteredEvents]
  );

  const derivedSoldCount = selectedEvent
    ? purchaseEvents.length > 0
      ? purchaseEvents.length
      : selectedEvent.sold
    : 0;

  const pricePerTicket = selectedEvent ? parsePriceToStx(selectedEvent) : 0;

  const salesSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildSalesSeriesFromPurchases(purchaseEvents, pricePerTicket);
  }, [purchaseEvents, pricePerTicket, selectedEvent]);

  const dailySeries = useMemo(() => buildDailyDeltaSeries(salesSeries), [salesSeries]);
  const weeklySeries = useMemo(() => buildWeeklySeries(dailySeries), [dailySeries]);

  const velocitySeries = useMemo(
    () => buildVelocitySeriesFromPurchases(purchaseEvents),
    [purchaseEvents]
  );

  const funnelSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return [
      { stage: "Tickets sold", value: derivedSoldCount },
      { stage: "Transfers", value: transferEvents.length },
      { stage: "Refunds processed", value: refundProcessedEvents.length }
    ];
  }, [derivedSoldCount, refundProcessedEvents.length, selectedEvent, transferEvents.length]);

  const tierSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildTierData(selectedEvent, derivedSoldCount);
  }, [derivedSoldCount, selectedEvent]);

  const heatmapSeries = useMemo(
    () => buildHeatmapFromPurchases(purchaseEvents),
    [purchaseEvents]
  );

  const peakSeries = useMemo(
    () => buildPeakSeriesFromPurchases(purchaseEvents),
    [purchaseEvents]
  );

  const totalRevenue = useMemo(() => {
    if (!selectedEvent) {
      return 0;
    }
    return Number((derivedSoldCount * pricePerTicket).toFixed(2));
  }, [derivedSoldCount, pricePerTicket, selectedEvent]);

  const similarEvents = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    const category = selectedEvent.category ?? "General";
    return events
      .filter((event) => event.id !== selectedEvent.id && (event.category ?? "General") === category)
      .slice(0, 3);
  }, [events, selectedEvent]);

  const comparisonSeries = useMemo(() => {
    if (!selectedEvent || similarEvents.length === 0) {
      return [];
    }
    const avgSold = Math.round(
      similarEvents.reduce((sum, event) => sum + event.sold, 0) / similarEvents.length
    );
    const avgRevenue = Number(
      (
        similarEvents.reduce((sum, event) => sum + event.sold * parsePriceToStx(event), 0) /
        similarEvents.length
      ).toFixed(2)
    );
    return [
      { label: "Your event", sold: derivedSoldCount, revenue: totalRevenue },
      { label: "Category avg", sold: avgSold, revenue: avgRevenue }
    ];
  }, [derivedSoldCount, selectedEvent, similarEvents, totalRevenue]);

  const ticketsPerHour = selectedEvent
    ? Number((purchaseEvents.length / SALES_WINDOW_HOURS).toFixed(2))
    : 0;
  const avgTicketPrice = selectedEvent && derivedSoldCount > 0
    ? Number((totalRevenue / derivedSoldCount).toFixed(2))
    : 0;
  const sellThrough = selectedEvent && selectedEvent.seats > 0
    ? Math.min(100, Math.round((derivedSoldCount / selectedEvent.seats) * 100))
    : 0;

  const topSalesDays = useMemo(() => {
    return [...dailySeries]
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [dailySeries]);

  useEffect(() => {
    setUpdatedAt(new Date());
  }, [events, selectedEventId, contractEvents.length]);

  useEffect(() => {
    if (!liveEnabled) {
      return;
    }
    const interval = window.setInterval(() => {
      refresh();
      setLogRefreshToken((token) => token + 1);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [liveEnabled, refresh]);

  useEffect(() => {
    if (!liveEnabled || !contractConfigured) {
      return;
    }
    const client = getChainhookClient(contractAddress, contractName);
    const handler = (event: { eventId?: number | string }) => {
      if (!selectedEvent) {
        return;
      }
      const eventId = Number(event.eventId);
      if (!Number.isFinite(eventId) || eventId !== selectedEvent.id) {
        return;
      }
      refresh();
      setLogRefreshToken((token) => token + 1);
      setUpdatedAt(new Date());
    };
    const unsubscribeCreated = client.on("event-created", handler);
    const unsubscribePurchased = client.on("ticket-purchased", handler);
    return () => {
      unsubscribeCreated();
      unsubscribePurchased();
    };
  }, [contractConfigured, contractAddress, contractName, liveEnabled, refresh, selectedEvent]);

  const handleExportExcel = () => {
    if (!selectedEvent) {
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(salesSeries);
    const dailyWorksheet = XLSX.utils.json_to_sheet(dailySeries);
    const weeklyWorksheet = XLSX.utils.json_to_sheet(weeklySeries);
    const velocityWorksheet = XLSX.utils.json_to_sheet(velocitySeries);
    const funnelWorksheet = XLSX.utils.json_to_sheet(funnelSeries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
    XLSX.utils.book_append_sheet(workbook, dailyWorksheet, "Daily Sales");
    XLSX.utils.book_append_sheet(workbook, weeklyWorksheet, "Weekly Sales");
    XLSX.utils.book_append_sheet(workbook, velocityWorksheet, "Velocity");
    XLSX.utils.book_append_sheet(workbook, funnelWorksheet, "Funnel");
    XLSX.writeFile(workbook, `eventpass-${selectedEvent.id}-analytics.xlsx`);
  };

  const handleExportCsv = () => {
    if (!selectedEvent) {
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(salesSeries);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `eventpass-${selectedEvent.id}-analytics.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current
  });

  const emptyState = !isLoading && userEvents.length === 0;

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 pb-20 pt-12">
        <Link href="/create" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to create
        </Link>

        <section className="glass-panel rounded-[2.5rem] border border-white/50 bg-white/70 p-8 shadow-[0_50px_120px_-60px_rgba(36,17,0,0.65)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-primary">
                Creator analytics
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">Ticket analytics</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Live analytics for your active EventPass drops. Charts are built from indexed on-chain events and update as new transactions confirm.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </section>

        {emptyState ? (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-white/70 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No active events yet. Create an event to see analytics.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/create">Create your first event</Link>
            </Button>
          </div>
        ) : (
          <section ref={printRef} className="space-y-6">
            {logError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                {logError} Showing contract totals where possible.
              </div>
            ) : logLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                Loading indexed contract events...
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active event</p>
                <h2 className="text-2xl font-semibold text-foreground">
                  {selectedEvent?.title ?? "Select an event"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  Live updates · {updatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLiveEnabled((prev) => !prev)}
                >
                  {liveEnabled ? "Pause live" : "Resume live"}
                </Button>
                <Button variant="outline" size="sm" onClick={refresh}>
                  Refresh now
                </Button>
                <select
                  value={selectedEvent?.id ?? ""}
                  onChange={(event) => setSelectedEventId(Number(event.target.value))}
                  className="h-10 rounded-full border border-border bg-white px-4 text-sm text-foreground shadow-sm"
                >
                  {userEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      #{event.id} · {event.title}
                    </option>
                  ))}
                </select>
                <Button variant="ghost" className="gap-2" asChild>
                  <Link href="/events">
                    View catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total revenue</p>
                    <p className="text-3xl font-semibold text-foreground">{totalRevenue.toFixed(2)} STX</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {derivedSoldCount} tickets sold · {selectedEvent?.seats ?? 0} seats
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sales velocity</p>
                    <p className="text-3xl font-semibold text-foreground">{ticketsPerHour.toFixed(2)} tickets/hr</p>
                  </div>
                  <div className="rounded-full bg-primary/10 p-3 text-primary">
                    <Timer className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Based on the last 72 hours of on-chain ticket purchases.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  <span className="font-medium text-foreground">Sales over time</span>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesSeries} margin={{ left: 0, right: 16 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fc6432" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#fc6432" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sold" stroke="#fc6432" fill="url(#salesGradient)" />
                      <Area type="monotone" dataKey="revenue" stroke="#f97316" fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Revenue line shows cumulative STX value.</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">Ticket tiers</span>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tierSeries} dataKey="value" nameKey="name" innerRadius={40} outerRadius={80} fill="#fc6432">
                        <LabelList dataKey="name" position="outside" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tier breakdown will expand once multi-tier pricing is on-chain.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium text-foreground">Sales velocity</span>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={velocitySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  <span className="font-medium text-foreground">Peak purchase times</span>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakSeries} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#fb923c" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">Daily sales</span>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#fb923c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">Weekly totals</span>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklySeries}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#fdba74" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium text-foreground">Revenue breakdown</span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Average ticket price</span>
                    <span className="font-semibold text-foreground">{avgTicketPrice.toFixed(2)} STX</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Sell-through rate</span>
                    <span className="font-semibold text-foreground">{sellThrough}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Remaining inventory</span>
                    <span className="font-semibold text-foreground">
                      {Math.max(0, (selectedEvent?.seats ?? 0) - derivedSoldCount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  <span className="font-medium text-foreground">Top sales days</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {topSalesDays.length === 0 ? (
                    <p>No sales recorded yet.</p>
                  ) : (
                    topSalesDays.map((item) => (
                      <div key={item.date} className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                        <span>{item.date}</span>
                        <span className="font-semibold text-foreground">{item.value} tickets</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">On-chain activity</span>
                </div>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip />
                      <Funnel data={funnelSeries} dataKey="value" nameKey="stage" fill="#fb7185">
                        <LabelList dataKey="stage" position="right" fill="#4b5563" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Activity stages reflect indexed on-chain events for this drop.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">Refunds & cancellations</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Refunds processed</span>
                    <span className="font-semibold text-foreground">{refundProcessedEvents.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Refunds claimed</span>
                    <span className="font-semibold text-foreground">{refundClaimedEvents.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Event status</span>
                    <span className={cn(
                      "font-semibold",
                      selectedEvent?.status === "Active" && "text-emerald-600",
                      selectedEvent?.status === "Canceled" && "text-rose-600",
                      selectedEvent?.status === "Ended" && "text-slate-600"
                    )}>
                      {selectedEvent?.status ?? "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 bg-white px-3 py-2">
                    <span>Transfers</span>
                    <span className="font-semibold text-foreground">{transferEvents.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  <span className="font-medium text-foreground">Purchase time heatmap</span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-2 text-[10px] text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="text-center font-semibold">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {heatmapSeries.map((cell) => (
                    <div
                      key={cell.key}
                      className="h-6 rounded"
                      style={{ backgroundColor: `rgba(252, 100, 50, ${cell.value})` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Heatmap represents indexed purchase timestamps.</p>
              </div>

              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium text-foreground">Similar events</span>
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {similarEvents.length === 0 ? (
                    <p>No comparable events in this category yet.</p>
                  ) : (
                    similarEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border/60 bg-white px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      </div>
                    ))
                  )}
                </div>
                {comparisonSeries.length > 0 ? (
                  <div className="mt-4 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonSeries} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="sold" name="Tickets sold" fill="#fb923c" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="revenue" name="Revenue (STX)" fill="#fdba74" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
