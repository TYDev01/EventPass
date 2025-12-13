"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Header } from "@/components/Header";
import { EventCard } from "@/components/EventCard";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEventCatalog } from "@/lib/useEventCatalog";

export default function HomePage() {
  const { events, stats, isLoading } = useEventCatalog();
  
  // Show only first 6 events on homepage
  const featuredEvents = events.slice(0, 6);
  
  const activeEvents = stats.active;
  const totalTickets = stats.minted;
  const totalCapacity = stats.capacity;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute -right-28 top-[-10%] h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-6 pb-24 pt-32">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="grid items-center gap-12 md:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              EventPass • Powered by Clarity smart contracts
            </div>
            <h1 className="text-pretty text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Mint unforgettable experiences with Secured, on-chain ticketing.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              EventPass ensures every ticket is unique, traceable, and enforceable on-chain. Launch events, manage
              seat inventory, and deliver premium attendee journeys backed by transparent Clarity logic.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button size="lg" className="gap-2">
                <Link href="/events">Browse Events</Link>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link href="/create">Create Event</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/40 bg-white/60 p-4 text-sm text-muted-foreground"
              >
                <div className="text-2xl font-semibold text-foreground">{activeEvents}</div>
                Active events
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/40 bg-white/60 p-4 text-sm text-muted-foreground"
              >
                <div className="text-2xl font-semibold text-foreground">{totalTickets}</div>
                Tickets minted
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/40 bg-white/60 p-4 text-sm text-muted-foreground"
              >
                <div className="text-2xl font-semibold text-foreground">{totalCapacity}</div>
                Seats available
              </motion.div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
            className="relative rounded-[2.5rem] border border-white/50 bg-white/60 p-8 shadow-[0_30px_80px_-45px_rgba(36,17,0,0.55)]"
          >
            <div className="absolute inset-x-10 top-10 rounded-full border border-white/70 bg-primary/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Secured by EventPass
            </div>
            <div className="mt-24 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Immutable ticket ownership recorded on-chain
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Prevent double-sells with seat-level NFT IDs
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
                Automate payouts via Clarity smart contracts
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          id="events"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="space-y-12"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Featured events</h2>
              <p className="max-w-2xl text-muted-foreground">
                Each listing mirrors the on-chain event data stored in the EventPass contract. Track inventory, ticket
                status, and pricing at a glance.
              </p>
            </div>
            <Button variant="ghost" className="gap-2" asChild>
              <Link href="/events">
                Browse events
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center text-sm text-muted-foreground">
                Loading events from the blockchain...
              </div>
            ) : featuredEvents.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  No events found. Be the first to create one!
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/create">Create Event</Link>
                </Button>
              </div>
            ) : (
              featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}
