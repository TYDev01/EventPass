"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCcw } from "lucide-react";

import { Header } from "@/components/Header";
import { EventCard } from "@/components/EventCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEventCatalog } from "@/lib/useEventCatalog";

export default function EventsPage() {
  const { events, isLoading, loadError, showEmptyState, stats, refresh } = useEventCatalog();
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
                Every listing mirrors the state of the EventPass contract. Purchase seats with confidence knowing supply and ownership enforce on-chain limits.
              </p>
            </div>
            <Button variant="ghost" className="gap-2" asChild>
              <Link href="/create">
                Create new event
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {loadError}
            </div>
          ) : null}

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center text-sm text-muted-foreground">
                Loading events from the EventPass contract...
              </div>
            ) : showEmptyState ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No on-chain events found yet. Be the first to launch a showcase.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/create">Create your first event</Link>
                </Button>
              </div>
            ) : (
              events.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
