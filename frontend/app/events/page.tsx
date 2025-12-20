"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  RefreshCcw,
  Search,
  Trash2
} from "lucide-react";

import { Header } from "@/components/Header";
import { EventCard } from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEventCatalog } from "@/lib/useEventCatalog";
import type { EventPassEvent } from "@/lib/data";

const PRESET_STORAGE_KEY = "eventpass.event-filter-presets";

type DateRangeFilter = "any" | "upcoming" | "week" | "month";
type PriceRangeFilter = "any" | "free" | "under-50" | "50-100" | "over-100";
type AvailabilityFilter = "any" | "available" | "selling-fast" | "sold-out";
type StatusFilter = "any" | "active" | "ended" | "canceled";
type SortOption = "recent" | "date-asc" | "date-desc" | "price-asc" | "price-desc" | "popularity";

type FilterState = {
  searchText: string;
  dateRange: DateRangeFilter;
  priceRange: PriceRangeFilter;
  availability: AvailabilityFilter;
  status: StatusFilter;
  location: string;
  categories: string[];
  tags: string[];
  sort: SortOption;
};

type FilterPreset = {
  id: string;
  name: string;
  createdAt: number;
  filters: FilterState;
};

type ReadonlySearchParams = Pick<URLSearchParams, "get" | "toString">;

const DEFAULT_FILTERS: FilterState = {
  searchText: "",
  dateRange: "any",
  priceRange: "any",
  availability: "any",
  status: "any",
  location: "",
  categories: [],
  tags: [],
  sort: "recent"
};

const BASE_CATEGORIES = ["Music", "Sports", "Tech", "Art", "General"];

const normalizeList = (items: string[]) =>
  Array.from(
    new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))
  ).sort();

const normalizeFilterState = (filters: FilterState): FilterState => ({
  ...filters,
  searchText: filters.searchText.trim(),
  location: filters.location.trim(),
  categories: normalizeList(filters.categories),
  tags: normalizeList(filters.tags)
});

const areFiltersEqual = (a: FilterState, b: FilterState): boolean => {
  const normalizedA = normalizeFilterState(a);
  const normalizedB = normalizeFilterState(b);
  return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
};

const readFilterStateFromParams = (params: ReadonlySearchParams): FilterState => {
  const parseValue = <T extends string>(
    value: string | null,
    allowed: T[],
    fallback: T
  ): T => {
    if (!value) {
      return fallback;
    }
    return (allowed.includes(value as T) ? value : fallback) as T;
  };

  const parseList = (value: string | null) =>
    normalizeList(
      value
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : []
    );

  return {
    searchText: params.get("q") ?? "",
    dateRange: parseValue<DateRangeFilter>(
      params.get("date"),
      ["any", "upcoming", "week", "month"],
      "any"
    ),
    priceRange: parseValue<PriceRangeFilter>(
      params.get("price"),
      ["any", "free", "under-50", "50-100", "over-100"],
      "any"
    ),
    availability: parseValue<AvailabilityFilter>(
      params.get("availability"),
      ["any", "available", "selling-fast", "sold-out"],
      "any"
    ),
    status: parseValue<StatusFilter>(
      params.get("status"),
      ["any", "active", "ended", "canceled"],
      "any"
    ),
    location: params.get("location") ?? "",
    categories: parseList(params.get("categories")),
    tags: parseList(params.get("tags")),
    sort: parseValue<SortOption>(
      params.get("sort"),
      ["recent", "date-asc", "date-desc", "price-asc", "price-desc", "popularity"],
      "recent"
    )
  };
};

const createSearchParamsFromFilters = (filters: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  const normalized = normalizeFilterState(filters);

  if (normalized.searchText) {
    params.set("q", normalized.searchText);
  }
  if (normalized.dateRange !== "any") {
    params.set("date", normalized.dateRange);
  }
  if (normalized.priceRange !== "any") {
    params.set("price", normalized.priceRange);
  }
  if (normalized.availability !== "any") {
    params.set("availability", normalized.availability);
  }
  if (normalized.status !== "any") {
    params.set("status", normalized.status);
  }
  if (normalized.location) {
    params.set("location", normalized.location);
  }
  if (normalized.categories.length > 0) {
    params.set("categories", normalized.categories.join(","));
  }
  if (normalized.tags.length > 0) {
    params.set("tags", normalized.tags.join(","));
  }
  if (normalized.sort !== "recent") {
    params.set("sort", normalized.sort);
  }

  return params;
};

const parseEventDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const getEventPriceStx = (event: EventPassEvent): number => {
  if (event.priceMicroStx !== undefined) {
    return Number(event.priceMicroStx) / 1_000_000;
  }
  const parsed = Number.parseFloat(event.price.replace(/[^0-9.]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getAvailability = (event: EventPassEvent): AvailabilityFilter => {
  if (event.status === "Pending") {
    return "available";
  }
  if (event.seats <= 0) {
    return "sold-out";
  }
  if (event.sold >= event.seats) {
    return "sold-out";
  }
  const ratio = event.sold / event.seats;
  if (ratio >= 0.7) {
    return "selling-fast";
  }
  return "available";
};

const matchesDateRange = (eventDate: Date, range: DateRangeFilter) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (range === "upcoming") {
    return eventDate >= startOfToday;
  }

  if (range === "week") {
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    return eventDate >= startOfToday && eventDate <= endOfWeek;
  }

  if (range === "month") {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return eventDate >= startOfMonth && eventDate <= endOfMonth;
  }

  return true;
};

const sortEvents = (events: EventPassEvent[], sort: SortOption) => {
  const sorted = [...events];
  sorted.sort((a, b) => {
    switch (sort) {
      case "date-asc": {
        const aDate = parseEventDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = parseEventDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      }
      case "date-desc": {
        const aDate = parseEventDate(a.date)?.getTime() ?? 0;
        const bDate = parseEventDate(b.date)?.getTime() ?? 0;
        return bDate - aDate;
      }
      case "price-asc":
        return getEventPriceStx(a) - getEventPriceStx(b);
      case "price-desc":
        return getEventPriceStx(b) - getEventPriceStx(a);
      case "popularity":
        return b.sold - a.sold;
      case "recent":
      default:
        return b.id - a.id;
    }
  });
  return sorted;
};

const FilterChip = ({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Button
    type="button"
    size="sm"
    variant={active ? "default" : "outline"}
    className="rounded-full"
    onClick={onClick}
  >
    {label}
  </Button>
);

export default function EventsPage() {
  const { events, isLoading, loadError, showEmptyState, stats, refresh } = useEventCatalog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(() => readFilterStateFromParams(searchParams), [searchParams]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const filtersRef = useRef(filters);

  const headingDetail = useMemo(() => {
    if (isLoading) {
      return "Loading live events from the EventPass contract...";
    }
    if (showEmptyState) {
      return "No on-chain events have been published yet.";
    }
    if (loadError) {
      return "Showing curated showcases while we reconnect to the EventPass contract.";
    }
    return "Browse the latest drops verified on-chain, complete with live seat inventory.";
  }, [isLoading, loadError, showEmptyState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FilterPreset[];
        setPresets(parsed);
      }
    } catch (error) {
      console.warn("Unable to load filter presets", error);
    }
  }, []);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const parsed = readFilterStateFromParams(searchParams);
    if (!areFiltersEqual(parsed, filtersRef.current)) {
      setFilters(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!pathname) {
      return;
    }
    const params = createSearchParamsFromFilters(filters);
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  const availableCategories = useMemo(() => {
    const set = new Set(BASE_CATEGORIES);
    events.forEach((event) => {
      if (event.category) {
        set.add(event.category);
      }
    });
    return Array.from(set).sort();
  }, [events]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    events.forEach((event) => {
      event.tags?.forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = normalizeSearchText(filters.searchText);
    const normalizedLocation = filters.location.trim().toLowerCase();

    const next = events.filter((event) => {
      const searchable = `${event.title} ${event.description} ${event.creator ?? ""} ${event.location} ${event.category ?? ""} ${(event.tags ?? []).join(" ")}`.toLowerCase();

      if (
        normalizedSearch.length > 0 &&
        !normalizedSearch.every((token) => searchable.includes(token))
      ) {
        return false;
      }

      if (normalizedLocation && !event.location.toLowerCase().includes(normalizedLocation)) {
        return false;
      }

      if (filters.categories.length > 0) {
        const category = event.category ?? "General";
        if (!filters.categories.includes(category)) {
          return false;
        }
      }

      if (filters.tags.length > 0) {
        const tags = event.tags ?? [];
        if (!tags.some((tag) => filters.tags.includes(tag))) {
          return false;
        }
      }

      if (filters.status !== "any") {
        const status = event.status.toLowerCase();
        if (status !== filters.status) {
          return false;
        }
      }

      if (filters.availability !== "any") {
        if (getAvailability(event) !== filters.availability) {
          return false;
        }
      }

      if (filters.priceRange !== "any") {
        const price = getEventPriceStx(event);
        if (filters.priceRange === "free" && price !== 0) {
          return false;
        }
        if (filters.priceRange === "under-50" && (price <= 0 || price >= 50)) {
          return false;
        }
        if (filters.priceRange === "50-100" && (price < 50 || price > 100)) {
          return false;
        }
        if (filters.priceRange === "over-100" && price <= 100) {
          return false;
        }
      }

      if (filters.dateRange !== "any") {
        const eventDate = parseEventDate(event.date);
        if (!eventDate || !matchesDateRange(eventDate, filters.dateRange)) {
          return false;
        }
      }

      return true;
    });

    return sortEvents(next, filters.sort);
  }, [events, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchText.trim()) count += 1;
    if (filters.dateRange !== "any") count += 1;
    if (filters.priceRange !== "any") count += 1;
    if (filters.availability !== "any") count += 1;
    if (filters.status !== "any") count += 1;
    if (filters.location.trim()) count += 1;
    if (filters.categories.length > 0) count += 1;
    if (filters.tags.length > 0) count += 1;
    return count;
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
  }, []);

  const updateFilters = useCallback(
    (updates: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const savePreset = useCallback(() => {
    const trimmedName = presetName.trim();
    if (!trimmedName) {
      return;
    }
    const normalizedFilters = normalizeFilterState(filters);
    const nextPreset: FilterPreset = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      createdAt: Date.now(),
      filters: normalizedFilters
    };
    const updated = [nextPreset, ...presets].slice(0, 8);
    setPresets(updated);
    setPresetName("");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [filters, presetName, presets]);

  const applyPreset = useCallback((preset: FilterPreset) => {
    setFilters(preset.filters);
  }, []);

  const removePreset = useCallback(
    (presetId: string) => {
      const updated = presets.filter((preset) => preset.id !== presetId);
      setPresets(updated);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
      }
    },
    [presets]
  );

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-24 pt-16">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to home
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
                On-chain catalog
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">EventPass listings</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{headingDetail}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground md:items-end">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.active}</span> active events
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.minted}</span> tickets minted
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{stats.capacity}</span> seats tracked
              </div>
              <Button variant="outline" size="sm" className="mt-2 inline-flex items-center gap-2" onClick={refresh} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">Featured events</h2>
              <p className="text-sm text-muted-foreground">
                Ongoing and available events.
              </p>
            </div>
            <Button variant="ghost" className="gap-2" asChild>
              <Link href="/create">
                Create new event
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={filters.searchText}
                    onChange={(event) => updateFilters({ searchText: event.target.value })}
                    placeholder="Search by title, description, or creator"
                    className="border-primary/20 pl-9"
                  />
                </div>
                <Input
                  value={filters.location}
                  onChange={(event) => updateFilters({ location: event.target.value })}
                  placeholder="Filter by location or venue"
                  className="border-primary/20"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Date range</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: "Any", value: "any" },
                      { label: "Upcoming", value: "upcoming" },
                      { label: "This week", value: "week" },
                      { label: "This month", value: "month" }
                    ] as const).map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={filters.dateRange === option.value}
                        onClick={() => updateFilters({ dateRange: option.value })}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Price</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: "Any", value: "any" },
                      { label: "Free", value: "free" },
                      { label: "< $50", value: "under-50" },
                      { label: "$50-$100", value: "50-100" },
                      { label: "> $100", value: "over-100" }
                    ] as const).map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={filters.priceRange === option.value}
                        onClick={() => updateFilters({ priceRange: option.value })}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Availability</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: "Any", value: "any" },
                      { label: "Available", value: "available" },
                      { label: "Selling fast", value: "selling-fast" },
                      { label: "Sold out", value: "sold-out" }
                    ] as const).map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={filters.availability === option.value}
                        onClick={() => updateFilters({ availability: option.value })}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { label: "Any", value: "any" },
                      { label: "Active", value: "active" },
                      { label: "Ended", value: "ended" },
                      { label: "Canceled", value: "canceled" }
                    ] as const).map((option) => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={filters.status === option.value}
                        onClick={() => updateFilters({ status: option.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => {
                    const isActive = filters.categories.includes(category);
                    return (
                      <FilterChip
                        key={category}
                        label={category}
                        active={isActive}
                        onClick={() => {
                          const next = isActive
                            ? filters.categories.filter((item) => item !== category)
                            : [...filters.categories, category];
                          updateFilters({ categories: next });
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {availableTags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isActive = filters.tags.includes(tag);
                      return (
                        <FilterChip
                          key={tag}
                          label={tag}
                          active={isActive}
                          onClick={() => {
                            const next = isActive
                              ? filters.tags.filter((item) => item !== tag)
                              : [...filters.tags, tag];
                            updateFilters({ tags: next });
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                    {filteredEvents.length} results
                  </span>
                  <span>{events.length} total</span>
                  {activeFilterCount > 0 ? (
                    <span>{activeFilterCount} filters active</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={filters.sort}
                    onChange={(event) => updateFilters({ sort: event.target.value as SortOption })}
                    className="h-9 rounded-full border border-border bg-white px-3 text-sm text-foreground shadow-sm"
                  >
                    <option value="recent">Recently added</option>
                    <option value="date-asc">Date: ascending</option>
                    <option value="date-desc">Date: descending</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                    <option value="popularity">Popularity</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
                    Reset filters
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                        Save preset
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Save current filters</p>
                        <Input
                          value={presetName}
                          onChange={(event) => setPresetName(event.target.value)}
                          placeholder="Preset name"
                        />
                        <Button className="w-full" size="sm" onClick={savePreset} disabled={!presetName.trim()}>
                          Save preset
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Saved presets</p>
                        {presets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No presets yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {presets.map((preset) => (
                              <div key={preset.id} className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className="text-left text-sm font-medium text-foreground hover:text-primary"
                                  onClick={() => applyPreset(preset)}
                                >
                                  {preset.name}
                                </button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removePreset(preset.id)}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {loadError}
            </div>
          ) : null}

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <>
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
                <EventCardSkeleton />
              </>
            ) : showEmptyState ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No on-chain events found yet. Be the first to launch a showcase.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/create">Create your first event</Link>
                </Button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No events match these filters. Try resetting or adjusting the filters.
                </p>
                <Button className="mt-4" onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
