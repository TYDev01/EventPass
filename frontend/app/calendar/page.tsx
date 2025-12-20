"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  Download,
  Globe,
  Heart,
  MapPin
} from "lucide-react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as CalendarEvent,
  type View
} from "react-big-calendar";
import {
  addHours,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfWeek
} from "date-fns";
import { enUS } from "date-fns/locale";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEventCatalog } from "@/lib/useEventCatalog";
import type { EventPassEvent } from "@/lib/data";
import { cn } from "@/lib/utils";

const FAVORITES_STORAGE_KEY = "eventpass.favorite-events";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS }
});

const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney"
];

const parseEventDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const primary = parse(value, "MMMM d, yyyy", new Date());
  if (isValid(primary)) {
    return primary;
  }
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const normalizeCalendarEvent = (event: EventPassEvent) => {
  const parsed = parseEventDate(event.date);
  if (!parsed) {
    return null;
  }
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0);
  const end = addHours(start, 2);
  return {
    title: event.title,
    start,
    end,
    resource: event
  } satisfies CalendarEvent<EventPassEvent>;
};

const formatTimezoneDate = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

const buildGoogleCalendarLink = (calendarEvent: CalendarEvent<EventPassEvent>) => {
  const start = calendarEvent.start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = calendarEvent.end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const resource = calendarEvent.resource as EventPassEvent;
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", calendarEvent.title);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("details", resource.description);
  url.searchParams.set("location", resource.location);
  return url.toString();
};

export default function CalendarPage() {
  const { events, isLoading, loadError, stats } = useEventCatalog();
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent<EventPassEvent> | null>(null);
  const [timezone, setTimezone] = useState("UTC");
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as number[];
        setFavorites(parsed);
      } catch (error) {
        console.warn("Unable to parse favorites", error);
      }
    }
  }, []);

  const calendarEvents = useMemo(() => {
    return events
      .map(normalizeCalendarEvent)
      .filter((item): item is CalendarEvent<EventPassEvent> => Boolean(item));
  }, [events]);

  const densityMap = useMemo(() => {
    const map = new Map<string, number>();
    calendarEvents.forEach((item) => {
      const key = format(item.start, "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [calendarEvents]);

  const favoriteEvents = useMemo(() => {
    const favoriteSet = new Set(favorites);
    return calendarEvents.filter((item) => favoriteSet.has(item.resource.id));
  }, [calendarEvents, favorites]);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) {
      return [];
    }
    return calendarEvents.filter((item) => isSameDay(item.start, selectedDate));
  }, [calendarEvents, selectedDate]);

  const toggleFavorite = useCallback((eventId: number) => {
    setFavorites((prev) => {
      const next = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const downloadCalendar = useCallback(
    async (items: CalendarEvent<EventPassEvent>[]) => {
      if (items.length === 0) {
        return;
      }
      try {
        const payload = {
          timezone,
          events: items.map((item) => ({
            title: item.title,
            start: item.start.toISOString(),
            end: item.end.toISOString(),
            location: item.resource.location,
            description: item.resource.description
          }))
        };
        const response = await fetch("/api/calendar/ics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error("Failed to generate calendar file.");
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "eventpass-events.ics";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to export calendar", error);
      }
    },
    [timezone]
  );

  const calendarHeading = useMemo(() => {
    if (isLoading) {
      return "Syncing calendar with the EventPass contract...";
    }
    if (loadError) {
      return "Calendar is showing cached or sample events while we reconnect.";
    }
    return "Plan your season across month, week, or day views.";
  }, [isLoading, loadError]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 pb-24 pt-16">
        <Link
          href="/events"
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to events
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel rounded-[2.5rem] border border-white/50 bg-white/70 p-10 shadow-[0_50px_120px_-60px_rgba(36,17,0,0.65)]"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-primary">
                Calendar view
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">EventPass calendar</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{calendarHeading}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground md:items-end">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.active}</span> active events
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{calendarEvents.length}</span> scheduled dates
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 inline-flex items-center gap-2"
                onClick={() => downloadCalendar(calendarEvents)}
                disabled={calendarEvents.length === 0}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export iCal
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">Interactive schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="h-9 rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground shadow-sm"
                >
                  {TIMEZONE_OPTIONS.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-sm">
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={(nextView) => setView(nextView)}
                selectable
                onSelectSlot={(slot) => {
                  setSelectedDate(slot.start);
                  setSelectedEvent(null);
                }}
                onSelectEvent={(event) => {
                  setSelectedEvent(event);
                  setSelectedDate(event.start);
                }}
                dayPropGetter={(date) => {
                  const key = format(date, "yyyy-MM-dd");
                  const count = densityMap.get(key) ?? 0;
                  const intensity = Math.min(count / 4, 1);
                  const isCurrentMonth = isSameMonth(date, new Date());
                  if (!count) {
                    return {
                      className: cn(!isCurrentMonth && "rbc-off-range-bg")
                    };
                  }
                  return {
                    style: {
                      backgroundColor: `rgba(252, 100, 50, ${0.08 + intensity * 0.22})`
                    }
                  };
                }}
                eventPropGetter={(event) => {
                  const status = event.resource.status;
                  const statusColor =
                    status === "Active"
                      ? "rgba(252, 100, 50, 0.9)"
                      : status === "Pending"
                      ? "rgba(245, 158, 11, 0.9)"
                      : "rgba(100, 116, 139, 0.85)";
                  return {
                    style: {
                      backgroundColor: statusColor,
                      borderRadius: 12,
                      border: "none",
                      color: "#fff",
                      padding: "2px 6px"
                    }
                  };
                }}
                popup
                className="eventpass-calendar"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected day</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Pick a date"}
                  </p>
                </div>
                {selectedDate ? (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {eventsForSelectedDate.length} events
                  </span>
                ) : null}
              </div>
              <div className="mt-4 space-y-3">
                {eventsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Select a date to see events.</p>
                ) : (
                  eventsForSelectedDate.map((item) => (
                    <button
                      key={item.resource.id}
                      type="button"
                      onClick={() => setSelectedEvent(item)}
                      className={cn(
                        "w-full rounded-xl border border-border/70 bg-white px-4 py-3 text-left transition hover:border-primary/40",
                        selectedEvent?.resource.id === item.resource.id && "border-primary/60"
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.resource.location}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-sm">
              {selectedEvent ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Event detail</p>
                    <h2 className="text-xl font-semibold text-foreground">{selectedEvent.title}</h2>
                    <p className="text-sm text-muted-foreground">{selectedEvent.resource.description}</p>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
                      {formatTimezoneDate(selectedEvent.start, timezone)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      {selectedEvent.resource.location}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleFavorite(selectedEvent.resource.id)}>
                      <Heart
                        className={cn(
                          "mr-2 h-4 w-4",
                          favorites.includes(selectedEvent.resource.id) && "fill-primary text-primary"
                        )}
                      />
                      {favorites.includes(selectedEvent.resource.id) ? "Remove reminder" : "Set reminder"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={buildGoogleCalendarLink(selectedEvent)} target="_blank" rel="noreferrer">
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Add to Google
                      </a>
                    </Button>
                    <Button size="sm" onClick={() => downloadCalendar([selectedEvent])}>
                      <Download className="mr-2 h-4 w-4" />
                      iCal
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select an event to see details and set reminders.</p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Reminders</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadCalendar(favoriteEvents)}
                  disabled={favoriteEvents.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {favoriteEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reminder events yet.</p>
                ) : (
                  favoriteEvents.map((item) => (
                    <div key={item.resource.id} className="rounded-xl border border-border/70 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{format(item.start, "MMM d, yyyy")}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
