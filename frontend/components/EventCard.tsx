"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventPassEvent } from "@/lib/data";
import { cn } from "@/lib/utils";

const statusStyles: Record<EventPassEvent["status"], string> = {
  Active: "text-primary bg-primary/10",
  Ended: "text-foreground/70 bg-foreground/5",
  Canceled: "text-red-500 bg-red-100"
};

export function EventCard({ event }: { event: EventPassEvent }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      <Card className="overflow-hidden">
        <div className="relative h-48 w-full overflow-hidden">
          <Image src={event.image} alt={`${event.title} banner`} fill className="object-cover" />
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-foreground/70">
            <Ticket className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {event.sold}/{event.seats} sold
          </div>
        </div>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                statusStyles[event.status]
              )}
            >
              {event.status}
            </span>
            <span className="text-sm font-semibold text-primary">{event.price}</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground">{event.title}</h3>
          <p className="text-sm text-muted-foreground">{event.description}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {event.date}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {event.location}
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant={event.status === "Active" ? "default" : "outline"}>
            {event.status === "Active" ? "Buy Ticket" : "View Details"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
