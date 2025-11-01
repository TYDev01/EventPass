import Link from "next/link";
import { Mail, MapPin, Phone, ArrowUpRight, CalendarHeart } from "lucide-react";

const quickLinks = [
  { label: "Platform", href: "/#platform" },
  { label: "Services", href: "/#services" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "FAQ", href: "/#faq" },
  { label: "Create Event", href: "/create" },
];

const resources = [
  { label: "Pricing Guide", href: "#" },
  { label: "Organizer Onboarding", href: "#" },
  { label: "Developer Docs", href: "#" },
  { label: "Brand Assets", href: "#" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#fc6432] text-white">
      <div className="absolute inset-0 bg-hero-sheen opacity-80" />
      <div className="container relative py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <CalendarHeart className="h-4 w-4" />
              EventPass
            </div>
            <h3 className="text-3xl font-semibold leading-tight">
              Elevate every touchpoint.
              Put your events on-chain without losing the human spark.
            </h3>
            <p className="text-white/80">
              From boutique gatherings to multi-city tours, EventPass combines secure ticketing,
              deep analytics, and fan-worthy experiences under one roof.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">Navigate</h4>
              <ul className="space-y-2 text-sm text-white/80">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex items-center gap-2 transition hover:text-white">
                      <span>{link.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">Resources</h4>
              <ul className="space-y-2 text-sm text-white/80">
                {resources.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex items-center gap-2 transition hover:text-white">
                      <span>{link.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4 sm:col-span-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">Talk to us</h4>
              <div className="grid gap-4 text-sm text-white/80 sm:grid-cols-2">
                <a href="mailto:hello@eventpass.io" className="flex items-center gap-2 transition hover:text-white">
                  <Mail className="h-4 w-4" />
                  hello@eventpass.io
                </a>
                <a href="tel:+14085551234" className="flex items-center gap-2 transition hover:text-white">
                  <Phone className="h-4 w-4" />
                  +1 (408) 555-1234
                </a>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>San Francisco · New York · Remote</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/20 py-6 text-sm text-white/70 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} EventPass. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="#" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="#" className="transition hover:text-white">Terms of Service</Link>
            <Link href="#" className="transition hover:text-white">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
