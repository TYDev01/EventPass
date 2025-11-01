'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  DollarSign,
  Settings,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Ticket,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStacks } from '@/contexts/StacksContext';
import { Event } from '@/lib/stacks/config';
import { cancelEvent, endEvent } from '@/lib/stacks/contract';

// Mock data for user's events
const mockUserEvents: Event[] = [
  {
    eventId: 1,
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    title: 'Blockchain Conference 2025',
    date: '2025-02-15',
    price: 50000000,
    totalSeats: 100,
    soldSeats: 25,
    status: 0,
  },
];

export default function Dashboard() {
  const { isSignedIn, userData } = useStacks();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSignedIn) {
      loadUserEvents();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  async function loadUserEvents() {
    try {
      // For now, use mock data
      setEvents(mockUserEvents);
    } catch (error) {
      console.error('Error loading user events:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCancelEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to cancel this event?')) {
      try {
        await cancelEvent(eventId);
        alert('Event cancelled successfully!');
        loadUserEvents();
      } catch (error) {
        console.error('Error cancelling event:', error);
        alert('Failed to cancel event.');
      }
    }
  };

  const handleEndEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to end this event?')) {
      try {
        await endEvent(eventId);
        alert('Event ended successfully!');
        loadUserEvents();
      } catch (error) {
        console.error('Error ending event:', error);
        alert('Failed to end event.');
      }
    }
  };

  const totalTicketsSold = events.reduce((sum, event) => sum + event.soldSeats, 0);
  const totalRevenue = events.reduce((sum, event) => sum + event.soldSeats * event.price, 0) / 1_000_000;
  const activeEvents = events.filter((event) => event.status === 0).length;
  const openSeats = events.reduce((sum, event) => sum + Math.max(event.totalSeats - event.soldSeats, 0), 0);

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

  if (!isSignedIn) {
    return (
      <div className="relative py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,100,50,0.18),_transparent_55%)]" />
        <div className="container relative z-10 mx-auto max-w-3xl text-center space-y-6 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/70 px-4 py-2 text-sm font-semibold text-[#fc6432]">
            <Sparkles className="h-4 w-4" />
            EventPass Dashboard
          </span>
          <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">Connect your wallet to continue</h1>
          <p className="text-lg text-muted-foreground">
            Your personalized dashboard unlocks live analytics, seat management, and quick access to upcoming drops.
          </p>
          <p className="text-sm text-muted-foreground">
            Once connected, you&apos;ll see events tied to your Stacks address in real time.
          </p>
        </div>
      </div>
    );
  }

  const connectedAddress =
    userData?.profile?.stxAddress?.testnet ??
    userData?.profile?.stxAddress?.mainnet ??
    'Connected Wallet';

  return (
    <div className="relative py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[#fc6432]/12 blur-3xl" />
      <div className="container relative z-10 space-y-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4 animate-fade-up">
            <Link
              href="/"
              className="inline-flex items-center text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Sparkles className="h-4 w-4" />
              Real-time creator insights
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Your EventPass command center.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Track sales, adjust seats, and celebrate every milestone. EventPass keeps your community close and your operations streamlined.
            </p>
            <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-orange-100 bg-white/80 px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-[#fc6432]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Connected Wallet</p>
                  <p className="font-medium text-sm text-foreground">{connectedAddress}</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-orange-100 md:block" />
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[#fc6432]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue tracked</p>
                  <p className="font-medium text-sm text-foreground">{totalRevenue.toFixed(2)} STX</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-orange-100 md:block" />
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-[#fc6432]" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Open seats</p>
                  <p className="font-medium text-sm text-foreground">{openSeats}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative rounded-3xl border border-orange-100 bg-white/80 p-6 shadow-lg animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Upcoming milestones</h2>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#fc6432]">Live feed</span>
            </div>
            <div className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-2xl bg-orange-50/70 p-4">
                <Calendar className="mt-1 h-4 w-4 text-[#fc6432]" />
                <div>
                  <p className="font-medium text-foreground">Next drop opens soon</p>
                  <p>Your audience will be notified 24 hours before minting begins.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-orange-50/50 p-4">
                <Users className="mt-1 h-4 w-4 text-[#fc6432]" />
                <div>
                  <p className="font-medium text-foreground">Community is growing</p>
                  <p>{totalTicketsSold} attendees secured their spots across your events.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-orange-50/40 p-4">
                <BarChart3 className="mt-1 h-4 w-4 text-[#fc6432]" />
                <div>
                  <p className="font-medium text-foreground">Monitor momentum</p>
                  <p>Keep an eye on active event performance straight from your dashboard.</p>
                </div>
              </div>
            </div>
            <Link href="/create" className="mt-6 inline-flex w-full justify-center">
              <Button className="w-full bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90">
                Launch another event
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-orange-100 bg-white/85 shadow-sm animate-fade-up">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-2xl bg-[#fc6432]/10 p-3 text-[#fc6432]">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total events</p>
                <p className="text-2xl font-semibold text-foreground">{events.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-white/85 shadow-sm animate-fade-up" style={{ animationDelay: '80ms' }}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-2xl bg-[#fc6432]/10 p-3 text-[#fc6432]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets sold</p>
                <p className="text-2xl font-semibold text-foreground">{totalTicketsSold}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-white/85 shadow-sm animate-fade-up" style={{ animationDelay: '160ms' }}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-2xl bg-[#fc6432]/10 p-3 text-[#fc6432]">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
                <p className="text-2xl font-semibold text-foreground">{totalRevenue.toFixed(2)} STX</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-white/85 shadow-sm animate-fade-up" style={{ animationDelay: '240ms' }}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-2xl bg-[#fc6432]/10 p-3 text-[#fc6432]">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active events</p>
                <p className="text-2xl font-semibold text-foreground">{activeEvents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-orange-100 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle>Your Events</CardTitle>
            <CardDescription>Manage and monitor your event listings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 py-12 text-sm text-muted-foreground">
                Loading your events...
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div
                    key={event.eventId}
                    className="rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-sm animate-fade-up"
                    style={{ animationDelay: `${index * 120 + 80}ms` }}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-semibold text-foreground">{event.title}</h3>
                          {getStatusBadge(event.status)}
                        </div>
                        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#fc6432]" />
                            {event.date}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#fc6432]" />
                            {event.soldSeats}/{event.totalSeats} tickets sold
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-[#fc6432]" />
                            {(event.price / 1_000_000).toFixed(2)} STX per ticket
                          </div>
                        </div>
                      </div>
                      {event.status === 0 && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#fc6432]/30 text-[#fc6432] hover:bg-[#fc6432]/10"
                            onClick={() => handleEndEvent(event.eventId)}
                          >
                            End Event
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-[#fc6432] hover:bg-[#fc6432]/90"
                            onClick={() => handleCancelEvent(event.eventId)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-12 text-center">
                <p className="text-base text-muted-foreground">
                  You haven&apos;t created any events yet.
                </p>
                <Link href="/create" className="mt-5 inline-flex">
                  <Button className="bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90">
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
