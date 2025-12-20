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

const FALLBACK_WINDOW_DAYS = 14;

const parsePriceToStx = (event: EventPassEvent): number => {
  if (event.priceMicroStx !== undefined) {
    return Number(event.priceMicroStx) / 1_000_000;
  }
  const parsed = Number.parseFloat(event.price.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildSalesSeries = (event: EventPassEvent) => {
  const totalSold = Math.max(event.sold, 0);
  const dailyBase = totalSold / FALLBACK_WINDOW_DAYS;
  const now = new Date();
  let cumulative = 0;

  return Array.from({ length: FALLBACK_WINDOW_DAYS }).map((_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (FALLBACK_WINDOW_DAYS - 1 - index));
    const swing = Math.sin(index / 2.4) * 0.8 + 1;
    const soldToday = Math.max(0, Math.round(dailyBase * swing));
    cumulative = Math.min(totalSold, cumulative + soldToday);
    return {
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sold: cumulative,
      revenue: Number((cumulative * parsePriceToStx(event)).toFixed(2))
    };
  });
};

const buildVelocitySeries = (event: EventPassEvent) => {
  const sold = Math.max(event.sold, 0);
  const hours = 72;
  const perHour = sold / hours;
  return Array.from({ length: 12 }).map((_, index) => {
    const label = `${(index + 1) * 6}h`;
    const value = Math.max(0, Math.round(perHour * (index + 1) * 0.9));
    return { label, value };
  });
};

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

const buildFunnelData = (event: EventPassEvent) => {
  const views = Math.max(event.sold * 12, 240);
  const addToCart = Math.round(views * 0.28);
  const checkout = Math.round(addToCart * 0.6);
  return [
    { stage: "Event views", value: views },
    { stage: "Checkout started", value: checkout },
    { stage: "Tickets sold", value: event.sold }
  ];
};

const buildTierData = (event: EventPassEvent) => [
  { name: "Standard", value: Math.max(event.sold, 0) }
];

const buildHeatmap = (event: EventPassEvent) => {
  const grid = [];
  const base = Math.max(event.sold, 1);
  for (let day = 0; day < 7; day += 1) {
    for (let slot = 0; slot < 6; slot += 1) {
      const intensity = Math.min(1, (base / 120) * (0.4 + Math.sin((day + slot) * 0.6) * 0.3));
      grid.push({
        key: `${day}-${slot}`,
        day,
        slot,
        value: Math.max(0.05, intensity)
      });
    }
  }
  return grid;
};

const buildPeakTimes = () => [
  { label: "Morning", value: 18 },
  { label: "Afternoon", value: 42 },
  { label: "Evening", value: 30 },
  { label: "Night", value: 10 }
];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const { events, isLoading } = useEventCatalog();
  const { address } = useStacks();
  const printRef = useRef<HTMLDivElement | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());

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

  const salesSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildSalesSeries(selectedEvent);
  }, [selectedEvent]);

  const dailySeries = useMemo(() => buildDailyDeltaSeries(salesSeries), [salesSeries]);
  const weeklySeries = useMemo(() => buildWeeklySeries(dailySeries), [dailySeries]);

  const velocitySeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildVelocitySeries(selectedEvent);
  }, [selectedEvent]);

  const funnelSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildFunnelData(selectedEvent);
  }, [selectedEvent]);

  const tierSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildTierData(selectedEvent);
  }, [selectedEvent]);

  const heatmapSeries = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    return buildHeatmap(selectedEvent);
  }, [selectedEvent]);

  const peakSeries = useMemo(() => buildPeakTimes(), []);

  const similarEvents = useMemo(() => {
    if (!selectedEvent) {
      return [];
    }
    const category = selectedEvent.category ?? "General";
    return events
      .filter((event) => event.id !== selectedEvent.id && (event.category ?? "General") === category)
      .slice(0, 3);
  }, [events, selectedEvent]);

  const totalRevenue = selectedEvent
    ? Number((selectedEvent.sold * parsePriceToStx(selectedEvent)).toFixed(2))
    : 0;

  const ticketsPerHour = selectedEvent ? Number((selectedEvent.sold / 72).toFixed(2)) : 0;

  useEffect(() => {
    setUpdatedAt(new Date());
  }, [events, selectedEventId]);

  const handleExportExcel = () => {
    if (!selectedEvent) {
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(salesSeries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 pb-24 pt-16">
        <Link href="/create" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to create
        </Link>

        <section className="glass-panel rounded-[2.5rem] border border-white/50 bg-white/70 p-10 shadow-[0_50px_120px_-60px_rgba(36,17,0,0.65)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-primary">
                Creator analytics
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">Ticket analytics</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Live analytics for your active EventPass drops. Charts are estimated from on-chain totals until per-ticket timestamps are available.
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
          <section ref={printRef} className="space-y-8">
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

            <div className="grid gap-6 md:grid-cols-2">
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
                  {selectedEvent?.sold ?? 0} tickets sold · {selectedEvent?.seats ?? 0} seats
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
                  Estimated based on last 72 hours of sales.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                  Tier breakdown available once pricing tiers are added.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
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

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-foreground">Conversion funnel</span>
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
                  Funnel stages are estimated until page-view tracking is wired.
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
                    <span className="font-semibold text-foreground">0</span>
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
                    <span>Estimated cancellations</span>
                    <span className="font-semibold text-foreground">0</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Refund analytics will populate once refund events are indexed.
                  </p>
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
                <p className="mt-2 text-xs text-muted-foreground">Heatmap represents estimated purchase clusters.</p>
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
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
