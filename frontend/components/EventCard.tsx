'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, EVENT_STATUS } from '@/lib/stacks/config';
import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const statusColor = {
    [EVENT_STATUS.ACTIVE]: 'default',
    [EVENT_STATUS.CANCELED]: 'destructive',
    [EVENT_STATUS.ENDED]: 'secondary',
  } as const;

  const statusText = {
    [EVENT_STATUS.ACTIVE]: 'Active',
    [EVENT_STATUS.CANCELED]: 'Canceled',
    [EVENT_STATUS.ENDED]: 'Ended',
  } as const;

  const availableSeats = event.totalSeats - event.soldSeats;
  const soldOutPercentage = Math.round((event.soldSeats / event.totalSeats) * 100);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{event.title}</CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>{event.date}</span>
            </CardDescription>
          </div>
          <Badge variant={statusColor[event.status]}>
            {statusText[event.status]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{(event.price / 1_000_000).toFixed(2)} STX</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{availableSeats} / {event.totalSeats} available</span>
          </div>
        </div>
        
        {event.status === EVENT_STATUS.ACTIVE && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sold: {soldOutPercentage}%</span>
              <span>{event.soldSeats} tickets sold</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300" 
                style={{ width: `${soldOutPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        {event.status === EVENT_STATUS.ACTIVE && availableSeats > 0 ? (
          <Link href={`/events/${event.eventId}`} className="w-full">
            <Button className="w-full">
              Buy Tickets
            </Button>
          </Link>
        ) : (
          <Button disabled className="w-full">
            {event.status === EVENT_STATUS.ACTIVE ? 'Sold Out' : statusText[event.status]}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}