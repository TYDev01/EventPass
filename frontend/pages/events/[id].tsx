'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Ticket as TicketIcon,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStacks } from '@/contexts/StacksContext';
import { getEvent, purchaseTicket } from '@/lib/stacks/contract';
import { Event } from '@/lib/stacks/config';

export default function EventDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { isSignedIn } = useStacks();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [seatNumber, setSeatNumber] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvent(parseInt(id as string));
    }
  }, [id]);

  async function loadEvent(eventId: number) {
    try {
      const eventData = await getEvent(eventId);
      setEvent(eventData);
    } catch (error) {
      console.error('Error loading event:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePurchaseTicket = async () => {
    if (!event || !isSignedIn) return;

    const seat = parseInt(seatNumber);
    if (!seat || seat < 1 || seat > event.totalSeats) {
      alert('Please enter a valid seat number');
      return;
    }

    setPurchasing(true);
    try {
      await purchaseTicket(event.eventId, seat);
      alert('Ticket purchased successfully!');
      loadEvent(event.eventId); // Reload event data
      setSeatNumber('');
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      alert('Failed to purchase ticket. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <Badge className="bg-[#fc6432] text-white hover:bg-[#fc6432]/90">Active</Badge>;
      case 1:
        return <Badge variant="destructive">Cancelled</Badge>;
      case 2:
        return <Badge className="bg-orange-100 text-[#fc6432] hover:bg-orange-100">Ended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const availableSeats = event ? event.totalSeats - event.soldSeats : 0;
  const isEventActive = event?.status === 0;
  const hasAvailableSeats = availableSeats > 0;

  const locationLabel = 'Stacks HQ · Hybrid access available';

  if (loading) {
    return (
      <div className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,100,50,0.16),_transparent_55%)]" />
        <div className="container relative z-10 mx-auto max-w-3xl rounded-3xl border border-orange-100 bg-white/80 px-8 py-12 text-center shadow-lg backdrop-blur">
          <p className="text-base font-medium text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,100,50,0.16),_transparent_55%)]" />
        <div className="container relative z-10 mx-auto max-w-3xl space-y-6 text-center">
          <Link
            href="/"
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-[#fc6432] transition hover:bg-white/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to events
          </Link>
          <div className="rounded-3xl border border-orange-100 bg-white/85 px-8 py-12 shadow-lg backdrop-blur">
            <p className="text-lg font-medium text-muted-foreground">Event not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[#fc6432]/14 blur-3xl" />
      <div className="container relative z-10 mx-auto max-w-5xl space-y-10">
        <Link
          href="/"
          className="inline-flex items-center text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>

        <div className="rounded-3xl border border-orange-100 bg-white/90 p-8 shadow-xl backdrop-blur animate-fade-up">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
                <Sparkles className="h-4 w-4" />
                Featured EventPass Experience
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  {getStatusBadge(event.status)}
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#fc6432]">
                    #{event.eventId.toString().padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-3xl border border-orange-100 bg-orange-50/60 px-5 py-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-4 w-4 text-[#fc6432]" />
                <span className="font-semibold text-foreground">
                  {event.soldSeats}/{event.totalSeats} passes distributed
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#fc6432]" />
                <span>{availableSeats} seats remain before sell-out.</span>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-orange-100 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Event date</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Calendar className="h-4 w-4 text-[#fc6432]" />
                {event.date}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket price</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <DollarSign className="h-4 w-4 text-[#fc6432]" />
                {(event.price / 1_000_000).toFixed(2)} STX
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="h-4 w-4 text-[#fc6432]" />
                {locationLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-white/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Availability</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <TicketIcon className="h-4 w-4 text-[#fc6432]" />
                {availableSeats > 0 ? `${availableSeats} seats left` : 'Sold out'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
          <Card className="border-orange-100 bg-white/90 shadow-lg backdrop-blur animate-fade-up">
            <CardHeader className="space-y-2">
              <CardTitle>Why this event matters</CardTitle>
              <CardDescription>
                Dive deep into the heart of the Stacks ecosystem with curated sessions and live showcases.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Join us for an immersive gathering designed for builders, creators, and communities exploring on-chain ticketing.
                  Expect product launches, hands-on workshops, and fireside conversations with industry leaders.
                </p>
                <p className="text-muted-foreground">
                  Each EventPass unlocks exclusive content drops, networking lounges, and proof of attendance badges minted directly to your wallet.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[#fc6432]">Event creator</h3>
                <code className="mt-2 inline-block rounded-xl bg-orange-50 px-3 py-2 text-sm text-[#fc6432]">
                  {event.creator}
                </code>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-orange-100 bg-white/90 shadow-lg backdrop-blur animate-fade-up" style={{ animationDelay: '100ms' }}>
              <CardHeader className="space-y-2">
                <CardTitle>Purchase Ticket</CardTitle>
                <CardDescription>
                  Secure your spot with blockchain-verified access in seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEventActive ? (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 text-sm text-orange-900">
                    This event is not currently active for ticket sales.
                  </div>
                ) : !hasAvailableSeats ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
                    This event is sold out. No tickets available.
                  </div>
                ) : !isSignedIn ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900">
                    Please connect your Stacks wallet to purchase tickets.
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="seat">Seat Number (1-{event.totalSeats})</Label>
                      <Input
                        id="seat"
                        type="number"
                        placeholder="Enter seat number"
                        value={seatNumber}
                        onChange={(e) => setSeatNumber(e.target.value)}
                        min="1"
                        max={event.totalSeats}
                      />
                    </div>

                    <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                      <div className="flex items-center justify-between text-sm font-medium text-foreground">
                        <span>Ticket Price</span>
                        <span>{(event.price / 1_000_000).toFixed(2)} STX</span>
                      </div>
                    </div>

                    <Button
                      onClick={handlePurchaseTicket}
                      disabled={purchasing || !seatNumber}
                      className="w-full bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90"
                    >
                      {purchasing ? 'Processing...' : 'Purchase Ticket'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-orange-100 bg-white/90 shadow-lg backdrop-blur animate-fade-up" style={{ animationDelay: '180ms' }}>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total Seats</span>
                  <span className="font-medium text-foreground">{event.totalSeats}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Sold Tickets</span>
                  <span className="font-medium text-foreground">{event.soldSeats}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Available</span>
                  <span className="font-medium text-[#fc6432]">{availableSeats}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
                  <div
                    className="h-full rounded-full bg-[#fc6432] transition-all duration-300"
                    style={{ width: `${(event.soldSeats / event.totalSeats) * 100}%` }}
                  />
                </div>
                <p className="text-center text-sm font-medium text-muted-foreground">
                  {((event.soldSeats / event.totalSeats) * 100).toFixed(1)}% sold
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
