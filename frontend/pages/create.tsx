'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Calendar,
  DollarSign,
  Users,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStacks } from '@/contexts/StacksContext';
import { createEvent } from '@/lib/stacks/contract';

const quickTips = [
  {
    title: 'Plan your drop',
    description: 'Coordinate mint windows so loyal fans can secure seats before the rush.',
  },
  {
    title: 'Price with flexibility',
    description: 'Experiment with early-bird pricing and premium experiences to increase revenue.',
  },
  {
    title: 'Keep it transparent',
    description: 'Ticket ownership lives on-chain so everyone can verify authenticity instantly.',
  },
];

export default function CreateEvent() {
  const router = useRouter();
  const { isSignedIn } = useStacks();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    price: '',
    totalSeats: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      alert('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEvent(
        formData.title,
        formData.date,
        parseInt(formData.price) * 1000000, // Convert to microSTX
        parseInt(formData.totalSeats)
      );
      alert('Event created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.title && formData.date && formData.price && formData.totalSeats;

  return (
    <div className="relative py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[#fc6432]/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_right,_rgba(252,100,50,0.12),_transparent_55%)]" />

      <div className="container relative z-10 grid gap-10 lg:grid-cols-[1.05fr_minmax(0,0.85fr)]">
        <div className="space-y-6 animate-fade-up">
          <Link
            href="/"
            className="inline-flex items-center text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-medium text-[#fc6432] shadow-sm">
            <Sparkles className="h-4 w-4" />
            <span>Launch a fresh on-chain experience</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Create an Event your community will never forget.
          </h1>
          <p className="text-lg text-muted-foreground">
            Combine transparent ticketing, fast payouts, and animated EventPass collectibles
            to deliver memorable shows, summits, and meetups.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {quickTips.map((tip, index) => (
              <div
                key={tip.title}
                className="flex h-full flex-col gap-2 rounded-3xl border border-orange-100 bg-white/70 p-4 shadow-sm animate-fade-up"
                style={{ animationDelay: `${index * 100 + 140}ms` }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#fc6432]">
                  <CheckCircle2 className="h-4 w-4" />
                  {tip.title}
                </div>
                <p className="text-sm text-muted-foreground">{tip.description}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="relative overflow-hidden border-orange-100 bg-white/90 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute -left-12 top-12 h-32 w-32 rounded-full bg-[#fc6432]/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-40 w-40 rounded-full bg-[#fc6432]/10 blur-3xl" />

          <CardHeader className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fc6432]/10 px-4 py-2 text-sm font-medium text-[#fc6432]">
              <ShieldCheck className="h-4 w-4" />
              Secure Ticket Minting
            </div>
            <CardTitle className="text-2xl">Create New Event</CardTitle>
            <CardDescription>
              Configure your on-chain event details, pricing, and capacity. You can adjust everything from your dashboard later.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Stacks Summit 2025"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Event Date</Label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="pl-10"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Ticket Price (STX)</Label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSeats">Total Seats</Label>
                  <div className="relative">
                    <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="totalSeats"
                      name="totalSeats"
                      type="number"
                      placeholder="250"
                      className="pl-10"
                      value={formData.totalSeats}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              {!isSignedIn && (
                <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm text-orange-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-[#fc6432]" />
                  <p>Please connect your Stacks wallet before publishing your event.</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#fc6432] text-white shadow-glow transition hover:bg-[#fc6432]/90"
                disabled={!isFormValid || !isSignedIn || isSubmitting}
              >
                {isSubmitting ? 'Creating Event...' : 'Create Event'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
