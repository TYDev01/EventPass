'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Calendar,
  Users,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Layers,
  Presentation,
  Mic2,
  Handshake,
  Clock,
  ArrowRight,
  Quote,
  Building2,
  Compass,
  MonitorCheck,
} from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Event } from '@/lib/stacks/config';

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
};

type WorkflowStep = {
  step: string;
  title: string;
  description: string;
};

type Service = {
  icon: React.ElementType;
  title: string;
  description: string;
  deliverables: string[];
};

type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

type Faq = {
  question: string;
  answer: string;
};

const featureHighlights: Feature[] = [
  {
    icon: ShieldCheck,
    title: 'Trustless Access',
    description: 'Every ticket is minted on Stacks so your attendees can verify ownership instantly.',
  },
  {
    icon: Layers,
    title: 'Creator Friendly',
    description: 'Launch events in minutes with configurable pricing, seat limits, and staged drops.',
  },
  {
    icon: Sparkles,
    title: 'Memorable Journeys',
    description: 'Build immersive experiences with animated passes, highlights, and rich attendee data.',
  },
];

const workflow: WorkflowStep[] = [
  {
    step: '01',
    title: 'Create & Configure',
    description:
      'Set event details, pricing, and capacity. Publish on-chain with a single click.',
  },
  {
    step: '02',
    title: 'Mint & Share',
    description: 'Distribute animated EventPass tickets and let supporters mint securely.',
  },
  {
    step: '03',
    title: 'Track In Real-Time',
    description: 'Monitor seat availability and on-chain transactions from your dashboard.',
  },
];

const serviceCatalog: Service[] = [
  {
    icon: Building2,
    title: 'Event Launch Concierge',
    description:
      'Let our team configure contracts, design ticket art, and orchestrate your drop timeline.',
    deliverables: ['Smart contract deployment review', 'Ticket artwork & metadata setup', 'Launch day playbook'],
  },
  {
    icon: MonitorCheck,
    title: 'On-site Check-in Suite',
    description:
      'Blend on-chain access with seamless front-of-house operations for hybrid and in-person events.',
    deliverables: ['QR badge scanning app', 'Wallet-assisted door support', 'Live attendee dashboards'],
  },
  {
    icon: Compass,
    title: 'Lifecycle Growth Program',
    description:
      'Grow recurring attendance with loyalty tokens, exclusive drops, and community analytics.',
    deliverables: ['Post-event POAP collectibles', 'Automated nurture campaigns', 'Audience segmentation insights'],
  },
];

const testimonials: Testimonial[] = [
  {
    name: 'Lina Rodriguez',
    role: 'Founder, Nexus Summit',
    quote:
      'EventPass replaced three tools, cut check-in time in half, and gave our sponsors verifiable impact metrics.',
  },
  {
    name: 'Marcus Lee',
    role: 'Program Director, Layer Labs',
    quote:
      'We sold out a 1,500 seat conference in days and monitored every on-chain transaction in real time.',
  },
  {
    name: 'Aisha Khan',
    role: 'Producer, CultureWave Live',
    quote:
      'The animated passes became collectibles our community proudly trades. Engagement stayed high weeks after the event.',
  },
];

const faqs: Faq[] = [
  {
    question: 'How long does it take to launch an event on EventPass?',
    answer:
      'Most organizers publish their first drop in under 20 minutes. Our guided workflow walks you through details, pricing, and capacity before minting on-chain.',
  },
  {
    question: 'Do attendees need a crypto wallet to participate?',
    answer:
      'EventPass supports native Stacks wallets, but you can also enable custodial passes so guests can claim tickets with email and upgrade later.',
  },
  {
    question: 'Can I integrate EventPass with my CRM or marketing stack?',
    answer:
      'Yes. Sync registration data into leading CRM platforms, trigger webhooks for marketing automation, and export analytics in CSV or via API.',
  },
  {
    question: 'What support do you provide during live events?',
    answer:
      'Our operations team offers remote war rooms and optional on-site specialists to monitor transactions, attendee flow, and issuer payouts.',
  },
];

// Mock events for demonstration
const mockEvents: Event[] = [
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
  {
    eventId: 2,
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    title: 'Web3 Workshop',
    date: '2025-03-01',
    price: 25000000,
    totalSeats: 50,
    soldSeats: 45,
    status: 0,
  },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      // For now, use mock data
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col">
      <section id="home" className="relative overflow-hidden bg-[#fc6432] text-white">
        <div className="absolute inset-0 bg-hero-sheen opacity-90" />
        <div className="container relative py-24">
          <div className="grid items-center gap-16 md:grid-cols-[1.1fr_minmax(0,0.9fr)]">
            <div className="space-y-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
                <Sparkles className="h-4 w-4" />
                <span>Stacks-powered ticketing reinvented</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                EventPass keeps your community thrilled from mint to entry.
              </h1>
              <p className="max-w-xl text-lg text-white/80 sm:text-xl">
                Design unforgettable blockchain-powered experiences, automate ticketing,
                and follow every on-chain interaction with real-time analytics.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/create">
                  <Button size="lg" className="w-full sm:w-auto bg-white text-[#fc6432] hover:bg-white/90">
                    <Plus className="mr-2 h-5 w-5" />
                    Launch an Event
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full border-white/30 bg-white/20 text-white backdrop-blur transition hover:bg-white/30 sm:w-auto"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Explore the Dashboard
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-fade-up" style={{ animationDelay: '120ms' }}>
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/40 blur-3xl" />
              <div className="absolute -right-6 bottom-10 h-16 w-16 rounded-full bg-white/30 blur-2xl" />
              <div className="relative rounded-3xl border border-white/25 bg-white/10 p-8 shadow-glow backdrop-blur">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm uppercase tracking-wide text-white/60">Live Snapshot</span>
                  <span className="text-xs font-semibold text-white/70">Updated moments ago</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <div>
                      <p className="text-sm text-white/70">Active Events</p>
                      <p className="text-2xl font-semibold">{events.filter((event) => event.status === 0).length}</p>
                    </div>
                    <div className="rounded-full bg-white/15 p-3">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <div>
                      <p className="text-sm text-white/70">Tickets sold</p>
                      <p className="text-2xl font-semibold">
                        {events.reduce((sum, event) => sum + event.soldSeats, 0)}
                      </p>
                    </div>
                    <div className="rounded-full bg-white/15 p-3">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-sm text-white/70">Upcoming Milestone</p>
                    <p className="text-lg font-semibold">Next drop opens in 2 days</p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
                      <span className="block h-full w-3/4 rounded-full bg-white/80" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl animate-pulse-glow" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-24 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-[50%] bg-white/30 blur-3xl opacity-70" />
      </section>

      <section id="platform" className="bg-white py-20">
        <div className="container space-y-12">
          <div className="mx-auto max-w-2xl text-center animate-fade-up">
            <h2 className="text-3xl font-semibold sm:text-4xl">Built for holistic event management</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              EventPass pairs full-service producer tools with transparent on-chain infrastructure.
              Coordinate programming, revenue, and attendee experiences from a single control plane.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureHighlights.map((feature, index) => (
              <div
                key={feature.title}
                className="flex h-full flex-col gap-4 rounded-3xl border border-orange-100 bg-orange-50/70 p-6 shadow-sm animate-fade-up"
                style={{ animationDelay: `${index * 100 + 100}ms` }}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fc6432]/10 text-[#fc6432]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fff5ef] py-20">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_minmax(0,1fr)] lg:items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#fc6432]">
              Ticketing pipeline
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Launch, mint, and manage every event without breaking a sweat.
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you&rsquo;re running intimate gatherings or multi-day conferences,
              EventPass keeps everything organized with automation, analytics, and secure payouts.
            </p>
            <div className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
              <div className="rounded-full bg-[#fc6432]/10 p-3 text-[#fc6432]">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue distributed to creators</p>
                <p className="text-lg font-semibold">350K+ STX settled</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            {workflow.map((item, index) => (
              <div
                key={item.title}
                className="relative flex flex-col gap-3 overflow-hidden rounded-3xl border border-orange-100 bg-white p-6 shadow-sm animate-fade-up"
                style={{ animationDelay: `${index * 140 + 160}ms` }}
              >
                <span className="text-sm font-semibold text-[#fc6432]">{item.step}</span>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#fc6432]/5 blur-xl animate-float" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-20">
        <div className="container space-y-12">
          <div className="mx-auto max-w-2xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Presentation className="h-4 w-4" />
              Managed event services
            </span>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">White-glove support from concept to curtain call</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Lean on EventPass strategists to launch multi-day conferences, community pop-ups, or hybrid experiences without adding headcount.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {serviceCatalog.map((service, index) => (
              <div
                key={service.title}
                className="flex h-full flex-col gap-5 rounded-3xl border border-orange-100 bg-orange-50/60 p-6 shadow-sm animate-fade-up"
                style={{ animationDelay: `${index * 120 + 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <service.icon className="h-5 w-5 text-[#fc6432]" />
                  <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{service.description}</p>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {service.deliverables.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ArrowRight className="mt-0.5 h-4 w-4 text-[#fc6432]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container grid gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Mic2 className="h-4 w-4" />
              Production-ready tooling
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Full lifecycle event operations, covered end-to-end.
            </h2>
            <p className="text-lg text-muted-foreground">
              Streamline workflows for programming, vendors, and sponsors. EventPass centralizes scheduling,
              staffing, and real-time metrics so your team focuses on delivering memorable performances.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
                <p className="text-sm font-semibold text-[#fc6432]">Stacked agenda planning</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag-and-drop builders for stages, speaker tracks, and time blocks keep everyone aligned.
                </p>
              </div>
              <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
                <p className="text-sm font-semibold text-[#fc6432]">Sponsor command center</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlock branded activations with performance dashboards and verifiable attendee proof.
                </p>
              </div>
            </div>
          </div>
          <div className="relative animate-fade-up" style={{ animationDelay: '140ms' }}>
            <div className="absolute -left-12 top-10 h-24 w-24 rounded-full bg-[#fc6432]/15 blur-3xl" />
            <div className="absolute -right-14 bottom-4 h-32 w-32 rounded-full bg-[#fc6432]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white/90 shadow-xl backdrop-blur">
              <div className="border-b border-orange-100/60 bg-orange-50/60 px-6 py-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#fc6432]">Operations pulse</p>
              </div>
              <div className="space-y-6 px-6 py-6">
                <div className="flex items-center justify-between rounded-2xl border border-orange-100 bg-white/90 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Live attendees</p>
                    <p className="text-xl font-semibold text-foreground">2,468</p>
                  </div>
                  <div className="rounded-2xl bg-[#fc6432]/10 px-3 py-1 text-xs font-semibold text-[#fc6432]">
                    +12% vs yesterday
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Speaker readiness</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">18 of 20 confirmed</p>
                    <p className="text-xs text-muted-foreground">2 sessions need AV check-in</p>
                  </div>
                  <div className="rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Sponsor activations</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">93% engagement</p>
                    <p className="text-xs text-muted-foreground">12,540 badge scans captured</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Venue capacity</span>
                    <span>78% utilized</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-orange-100">
                    <div className="h-full w-4/5 rounded-full bg-[#fc6432]" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Auto-balancing entrances keeps wait times under 3 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff5ef] py-20">
        <div className="container space-y-12">
          <div className="mx-auto max-w-xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Handshake className="h-4 w-4" />
              Trusted by producers worldwide
            </span>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Stories from teams shipping unforgettable events</h2>
          </div>
          <div id="testimonials" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                className="relative flex h-full flex-col gap-4 rounded-3xl border border-orange-100 bg-white/85 p-6 shadow-lg backdrop-blur animate-fade-up"
                style={{ animationDelay: `${index * 120 + 120}ms` }}
              >
                <Quote className="h-8 w-8 text-[#fc6432]" />
                <p className="text-sm text-muted-foreground">{testimonial.quote}</p>
                <div className="pt-2">
                  <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="events" className="bg-white py-20">
        <div className="container space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 animate-fade-up">
              <h2 className="text-3xl font-semibold sm:text-4xl">Upcoming Events</h2>
              <p className="text-lg text-muted-foreground">
                Discover curated drops from the EventPass community. Search by name to jump right in.
              </p>
            </div>
            <div className="relative w-full max-w-md animate-fade-up" style={{ animationDelay: '120ms' }}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 py-16 text-muted-foreground">
              <p className="text-sm font-medium">Loading events...</p>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event, index) => (
                <div
                  key={event.eventId}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 120 + 80}ms` }}
                >
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-12 text-center">
              <p className="text-base text-muted-foreground">No events found. Try another search term.</p>
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="bg-[#fff5ef] py-20">
        <div className="container grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Clock className="h-4 w-4" />
              Answers on demand
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Everything you need to know before launching your next event
            </h2>
            <p className="text-lg text-muted-foreground">
              From onboarding presenters to settling payouts, EventPass is designed to remove the friction of modern event management.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className="rounded-3xl border border-orange-100 bg-white/85 p-6 shadow-sm animate-fade-up"
                style={{ animationDelay: `${index * 110 + 100}ms` }}
              >
                <h3 className="text-lg font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="relative overflow-hidden bg-white py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(252,100,50,0.12),_transparent_60%)]" />
        <div className="container relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <Sparkles className="h-4 w-4" />
              Ready when you are
            </span>
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Launch your next event with confidence and creative freedom.
            </h2>
            <p className="text-lg text-muted-foreground">
              Start with templates for summits, hackathons, and concert tours, then customize everything from ticket art to partner dashboards. The EventPass team is on-call to help you deliver a breakthrough experience.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/create">
                <Button size="lg" className="w-full sm:w-auto bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90">
                  Launch an Event
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full border border-[#fc6432]/30 bg-white/80 text-[#fc6432] hover:bg-white sm:w-auto"
                >
                  Explore the Dashboard
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative animate-fade-up" style={{ animationDelay: '140ms' }}>
            <div className="absolute -top-8 right-0 h-24 w-24 rounded-full bg-[#fc6432]/15 blur-3xl" />
            <div className="absolute -bottom-10 left-6 h-32 w-32 rounded-full bg-[#fc6432]/10 blur-3xl" />
            <div className="relative rounded-3xl border border-orange-100 bg-white/90 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Support window</p>
                  <p className="text-lg font-semibold text-foreground">24/7 EventOps Lounge</p>
                </div>
                <div className="rounded-full bg-[#fc6432]/10 px-4 py-2 text-xs font-semibold text-[#fc6432]">
                  Priority
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#fc6432]" />
                  <div>
                    <p className="font-semibold text-foreground">War room for live shows</p>
                    <p>Engineers monitor transactions, overflows, and real-time mints during your headline moments.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <Layers className="mt-0.5 h-4 w-4 text-[#fc6432]" />
                  <div>
                    <p className="font-semibold text-foreground">Experience design studio</p>
                    <p>Custom art direction, collectible traits, and perks keep your community coming back.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
                  <TrendingUp className="mt-0.5 h-4 w-4 text-[#fc6432]" />
                  <div>
                    <p className="font-semibold text-foreground">Post-event analytics</p>
                    <p>Review settlement reports, ROI dashboards, and attendee funnels in one place.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
