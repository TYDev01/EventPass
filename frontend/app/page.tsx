"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EventCard, type EventSummary } from "@/components/EventCard"
import { Card, CardContent } from "@/components/ui/card"

const events: EventSummary[] = [
  {
    id: "aurora-nights",
    title: "Aurora Nights Festival",
    date: "May 18, 2024",
    location: "Reykjavík, Iceland",
    price: "Ξ 0.32",
    image: "/images/events/event-aurora.svg",
  },
  {
    id: "midnight-sessions",
    title: "Midnight Sessions Live",
    date: "June 03, 2024",
    location: "Lisbon, Portugal",
    price: "Ξ 0.25",
    image: "/images/events/event-midnight.svg",
  },
  {
    id: "summit-collective",
    title: "Summit Collective Conference",
    date: "July 11, 2024",
    location: "Vancouver, Canada",
    price: "Ξ 0.42",
    image: "/images/events/event-summit.svg",
  },
  {
    id: "desert-mirage",
    title: "Desert Mirage Weekender",
    date: "August 02, 2024",
    location: "Palm Springs, USA",
    price: "Ξ 0.28",
    image: "/images/events/event-aurora.svg",
  },
  {
    id: "cosmic-bloom",
    title: "Cosmic Bloom Immersive",
    date: "September 14, 2024",
    location: "Tokyo, Japan",
    price: "Ξ 0.35",
    image: "/images/events/event-midnight.svg",
  },
  {
    id: "altitude-live",
    title: "Altitude Live Sessions",
    date: "October 06, 2024",
    location: "Zermatt, Switzerland",
    price: "Ξ 0.38",
    image: "/images/events/event-summit.svg",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-32 pt-24">
      <HeroSection />
      <EventsShowcase />
      <FeaturesSection />
      <TicketsSpotlight />
      <CreatorCallout />
    </div>
  )
}

function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden rounded-3xl glass-card px-8 py-20 sm:px-16 lg:px-24 animate-fade-up shadow-2xl"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50/30 via-transparent to-brand-100/20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-brand-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="absolute inset-x-8 top-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-brand-600 sm:left-16 font-inter">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100">
          <Sparkles className="h-3 w-3 text-brand-600" />
        </div>
        <span>Elevated experiences, powered by web3</span>
      </div>

      <div className="relative grid gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
        {/* Content Side */}
        <div className="flex flex-col gap-10">
          <div className="space-y-8 pt-16">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl lg:text-7xl font-manrope">
              Premier event ticketing for the{" "}
              <span className="text-gradient">next generation</span> of creators.
            </h1>
            <p className="max-w-2xl text-xl text-slate-600 sm:text-2xl font-inter leading-relaxed">
              Discover curated festivals, immersive conferences, and boutique gatherings with
              transparent pricing and collectible-ready tickets.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="hover:scale-105 transition-transform duration-300">
              <Button className="btn-brand rounded-2xl px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-brand-glow/50">
                <span>Browse Events</span>
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </div>
            <div className="hover:scale-105 transition-transform duration-300">
              <Link href="#create">
                <Button
                  variant="outline"
                  className="rounded-2xl border-2 border-brand-200 bg-white/90 px-8 py-4 text-lg font-semibold text-brand-600 shadow-lg hover:border-brand-300 hover:bg-white hover:shadow-xl font-inter backdrop-blur-sm"
                >
                  Create Event
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-brand text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 font-manrope">Secure & Instant</h3>
                  <p className="text-sm text-slate-600 font-inter">Wallet-native ticketing with instant payouts and fraud protection.</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-brand text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2 font-manrope">Smart Analytics</h3>
                  <p className="text-sm text-slate-600 font-inter">Built-in analytics for attendance tracking and engagement insights.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Side */}
        <div className="relative flex items-center justify-center">
          <div className="relative">
            {/* Main Hero Card */}
            <div className="relative h-[480px] w-full max-w-[480px] overflow-hidden rounded-3xl glass-card shadow-2xl">
              <Image
                src="/images/hero/spotlight.svg"
                alt="Event spotlight"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 480px, 100vw"
              />
              {/* Overlay Content */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="glass rounded-2xl p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 font-inter mb-1">Up next</div>
                      <div className="font-bold text-lg text-slate-900 font-manrope">Aurora Nights Festival</div>
                      <div className="text-sm text-slate-600 font-inter">Reykjavík, Iceland</div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-gradient-brand px-4 py-2 text-xs font-semibold text-white shadow-lg">
                      <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                      Live
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white"></div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 border-2 border-white"></div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 border-2 border-white"></div>
                    </div>
                    <span className="text-xs text-slate-600 font-inter">+2.4k attending</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Stats Cards */}
            <div className="absolute -top-6 -right-6 glass rounded-2xl p-4 shadow-xl animate-float">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600 font-manrope">98%</div>
                <div className="text-xs text-slate-600 font-inter">Satisfaction</div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-600 font-manrope">10K+</div>
                <div className="text-xs text-slate-600 font-inter">Events</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function EventsShowcase() {
  return (
    <section id="events" className="space-y-16">
      {/* Section Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 font-inter">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Featured Events
        </div>
        <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl lg:text-6xl font-manrope max-w-4xl mx-auto">
          Discover extraordinary experiences waiting for you
        </h2>
        <p className="text-xl text-slate-600 font-inter max-w-3xl mx-auto leading-relaxed">
          Explore curated experiences with verified hosts, elevated production, and unforgettable memories that last a lifetime.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center glass rounded-2xl p-2 gap-2">
          <Button variant="ghost" className="rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 text-sm font-semibold px-6 py-3 font-inter">
            All Events
          </Button>
          <Button variant="ghost" className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 text-sm font-medium px-6 py-3 font-inter">
            Upcoming
          </Button>
          <Button variant="ghost" className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 text-sm font-medium px-6 py-3 font-inter">
            Virtual
          </Button>
          <Button variant="ghost" className="rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white/50 text-sm font-medium px-6 py-3 font-inter">
            Art & Culture
          </Button>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {events.map((event, index) => (
          <div key={event.id} className="animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
            <EventCard event={event} />
          </div>
        ))}
      </div>

      {/* View More Section */}
      <div className="text-center">
        <div className="inline-flex flex-col items-center gap-6 glass rounded-3xl p-8">
          <div className="text-center space-y-3">
            <h3 className="text-xl font-semibold text-slate-900 font-manrope">Discover More Events</h3>
            <p className="text-slate-600 font-inter">Join thousands of attendees at premium experiences worldwide</p>
          </div>
          <div className="flex items-center gap-4">
            <Button className="btn-brand rounded-2xl px-8 py-3 font-semibold">
              View All Events
            </Button>
            <Button variant="outline" className="rounded-2xl border-2 border-slate-200 px-8 py-3 font-semibold hover:border-brand-200">
              Create Event
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      title: "Secure & Transparent",
      description: "Blockchain-powered tickets with transparent pricing and fraud protection.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Instant Transfers",
      description: "Transfer tickets seamlessly between wallets with instant confirmation.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Smart Analytics",
      description: "Real-time insights on attendance, engagement, and revenue metrics.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      title: "Collectible NFTs",
      description: "Every ticket becomes a collectible memory with unique artwork and metadata.",
      color: "from-orange-500 to-red-500"
    }
  ];

  return (
    <section className="space-y-16">
      {/* Section Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 font-inter">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Why EventPass
        </div>
        <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl lg:text-6xl font-manrope max-w-4xl mx-auto">
          The future of event experiences
        </h2>
        <p className="text-xl text-slate-600 font-inter max-w-3xl mx-auto leading-relaxed">
          Built for the next generation of creators and attendees who demand transparency, security, and unforgettable experiences.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <div 
            key={feature.title}
            className="group glass-card rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="space-y-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {feature.icon}
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-900 font-manrope group-hover:text-brand-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 font-inter leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA Card */}
      <div className="glass-card rounded-3xl p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-brand-500/5" />
        <div className="relative space-y-6">
          <h3 className="text-3xl font-bold text-slate-900 font-manrope">
            Ready to revolutionize your events?
          </h3>
          <p className="text-xl text-slate-600 font-inter max-w-2xl mx-auto">
            Join thousands of creators who trust EventPass for their premium events.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button className="btn-brand rounded-2xl px-8 py-4 text-lg font-semibold shadow-xl">
              Get Started Today
            </Button>
            <Button variant="outline" className="rounded-2xl border-2 border-slate-200 px-8 py-4 text-lg font-semibold hover:border-brand-200">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function TicketsSpotlight() {
  return (
    <section
      id="tickets"
      className="glass-card rounded-3xl overflow-hidden shadow-2xl"
    >
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/30 via-transparent to-brand-100/20" />
        
        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="grid gap-12 px-12 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            {/* Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 font-inter">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Ticket Management
                </div>
                <h3 className="text-4xl font-bold text-slate-900 sm:text-5xl font-manrope leading-tight">
                  Manage your tickets with a single 
                  <span className="text-gradient"> wallet-native</span> identity.
                </h3>
                <p className="text-xl text-slate-600 font-inter leading-relaxed">
                  Access QR codes, transfer entries, and unlock collectible perks directly within EventPass. Your tickets, your way.
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100">
                    <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter">Instant QR code generation and validation</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100">
                    <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter">Seamless ticket transfers between wallets</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-100">
                    <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter">Collectible NFT memories for every event</span>
                </div>
              </div>

              <div className="hover:scale-105 transition-transform duration-300">
                <Button className="btn-brand rounded-2xl px-8 py-4 text-lg font-semibold shadow-xl">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  View My Tickets
                </Button>
              </div>
            </div>

            {/* Visual Side */}
            <div className="relative">
              <div className="glass rounded-3xl p-8 shadow-xl">
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="font-bold text-lg text-slate-900 font-manrope mb-2">Your Digital Wallet</h4>
                    <p className="text-sm text-slate-600 font-inter">All tickets in one secure place</p>
                  </div>
                  
                  {/* Mock Ticket Cards */}
                  <div className="space-y-3">
                    <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 font-manrope">Aurora Nights</div>
                          <div className="text-sm text-slate-600 font-inter">May 18, 2024</div>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl"></div>
                      </div>
                    </div>
                    <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 font-manrope">Summit Collective</div>
                          <div className="text-sm text-slate-600 font-inter">July 11, 2024</div>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl"></div>
                      </div>
                    </div>
                    <div className="glass rounded-2xl p-4 hover:shadow-lg transition-all opacity-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-900 font-manrope">Cosmic Bloom</div>
                          <div className="text-sm text-slate-600 font-inter">Sept 14, 2024</div>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function CreatorCallout() {
  return (
    <section className="glass-card rounded-3xl overflow-hidden shadow-2xl">
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/40 via-transparent to-brand-100/30" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-brand-500/10 to-transparent" />
        
        <div className="relative px-12 py-16">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
            {/* Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 font-inter">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  For Creators
                </div>
                <h2 className="text-4xl font-bold text-slate-900 sm:text-5xl lg:text-6xl font-manrope leading-tight">
                  Ready to host your 
                  <span className="text-gradient"> next event?</span>
                </h2>
                <p className="text-xl text-slate-600 font-inter leading-relaxed max-w-2xl">
                  Join thousands of creators building memorable experiences with blockchain-powered ticketing.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter font-medium">Zero setup fees</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter font-medium">Instant payouts</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter font-medium">Global audience</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700 font-inter font-medium">Smart analytics</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
              <div className="hover:scale-105 transition-transform duration-300">
                <Button className="btn-brand rounded-2xl px-8 py-4 text-lg font-semibold shadow-xl w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Event
                </Button>
              </div>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  className="rounded-2xl border-2 border-slate-200 px-8 py-4 text-lg font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 transition-all w-full sm:w-auto"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
