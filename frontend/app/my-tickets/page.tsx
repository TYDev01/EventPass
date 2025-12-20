"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Ticket as TicketIcon, RefreshCcw } from "lucide-react";
import { fetchCallReadOnlyFunction, cvToValue, uintCV, ClarityType } from "@stacks/transactions";
import { createNetwork } from "@stacks/network";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EventImage } from "@/components/EventImage";
import { TransferTicketDialog } from "@/components/TransferTicketDialog";
import { useStacks } from "@/components/StacksProvider";
import { CORE_API_BASE_URL, STACKS_NETWORK, getContractParts } from "@/lib/stacks";
import { fetchOnChainEvents, formatPriceFromMicroStx } from "@/lib/events";
import type { OnChainEvent } from "@/lib/events";

type UserTicket = {
  eventId: number;
  seat: number;
  event: OnChainEvent;
};

export default function MyTicketsPage() {
  const { userSession, address } = useStacks();
  const [tickets, setTickets] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserTickets = async () => {
    if (!userSession || !address) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const userAddress = address;
      const { contractAddress, contractName } = getContractParts();

      if (!contractAddress || !contractName) {
        setError("Contract not configured");
        setIsLoading(false);
        return;
      }

      // Fetch all events
      const events = await fetchOnChainEvents(userAddress);
      
      console.log(" Checking tickets for user:", userAddress);
      console.log(" Found events:", events.length);
      
      // For each event, check which seats the user owns
      const userTickets: UserTicket[] = [];
      const network = createNetwork({ network: STACKS_NETWORK, client: { baseUrl: CORE_API_BASE_URL } });

      for (const event of events) {
        console.log(` Checking event ${event.id}: ${event.title} (${event.soldSeats} seats sold)`);
        
        // Only check seats that have been sold
        if (event.soldSeats === 0) {
          continue;
        }
        
        // Check each sold seat
        for (let seat = 1; seat <= event.soldSeats; seat++) {
          try {
            const response = await fetchCallReadOnlyFunction({
              contractAddress,
              contractName,
              functionName: "get-ticket-metadata",
              functionArgs: [uintCV(event.id), uintCV(seat)],
              network,
              senderAddress: userAddress
            });

            console.log(`  Seat ${seat} response:`, response);
            console.log(`  Seat ${seat} response type:`, response.type);

            // The response is (ok {event-id, seat, owner}) or an error
            if (response.type === ClarityType.ResponseOk) {
              const okValue = (response as any).value;
              console.log(`  Seat ${seat} ok value:`, okValue);
              
              // okValue should be a tuple with event-id, seat, and owner
              if (okValue && okValue.type === ClarityType.Tuple) {
                // Access the tuple data
                const tupleData = (okValue as any).data || (okValue as any).value;
                console.log(`  Seat ${seat} tuple data:`, tupleData);
                
                if (tupleData && 'owner' in tupleData) {
                  const ownerField = tupleData.owner;
                  console.log(`  Seat ${seat} owner field:`, ownerField);
                  
                  // Extract the owner address
                  let owner = '';
                  if (typeof ownerField === 'string') {
                    owner = ownerField;
                  } else if (ownerField && typeof ownerField === 'object' && 'value' in ownerField) {
                    owner = String(ownerField.value);
                  } else {
                    owner = String(ownerField);
                  }
                  
                  console.log(`  Seat ${seat} owner address: ${owner}`);
                  console.log(`  User address: ${userAddress}`);
                  console.log(`  Match: ${owner === userAddress}`);
                  
                  if (owner === userAddress) {
                    console.log(`   User owns seat ${seat}!`);
                    userTickets.push({
                      eventId: event.id,
                      seat,
                      event
                    });
                  }
                }
              }
            } else {
              console.log(`   Seat ${seat} not an ok response, type: ${response.type}`);
            }
          } catch (err) {
            console.log(`   Error checking seat ${seat}:`, err);
            continue;
          }
        }
      }

      console.log(" Total tickets found:", userTickets.length);

      setTickets(userTickets);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load user tickets:", err);
      setError("Failed to load your tickets. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserTickets();
  }, [userSession]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute -left-24 top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-6 pb-24 pt-16">
        <Link href="/events" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to events
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
                <TicketIcon className="h-3 w-3" />
                My Collection
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-foreground">My Tickets</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {!userSession
                    ? "Connect your wallet to view your tickets"
                    : isLoading
                    ? "Loading your tickets..."
                    : `You own ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2"
              onClick={loadUserTickets}
              disabled={isLoading || !userSession}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </motion.section>

        <section className="space-y-6">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {!userSession ? (
            <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Please connect your wallet to view your tickets
              </p>
            </div>
          ) : isLoading ? (
            <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center text-sm text-muted-foreground">
              Loading your tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-primary/40 bg-white/60 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                You don't have any tickets yet. Browse events to purchase your first ticket!
              </p>
              <Button className="mt-4" asChild>
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {tickets.map((ticket) => (
                <motion.div
                  key={`${ticket.eventId}-${ticket.seat}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Card className="overflow-hidden border-white/50 bg-white/90 shadow-xl transition-all hover:shadow-2xl">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                      <EventImage
                        metadataUri={ticket.event.metadataUri}
                        eventId={ticket.event.id}
                        alt={ticket.event.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary">
                        Seat #{ticket.seat}
                      </div>
                    </div>
                    <CardHeader className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground">{ticket.event.title}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p> {ticket.event.date}</p>
                        <p> {formatPriceFromMicroStx(ticket.event.priceMicroStx)}</p>
                        <p> Event #{ticket.eventId}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <TransferTicketDialog
                        eventId={ticket.eventId}
                        seat={ticket.seat}
                        eventTitle={ticket.event.title}
                        originalPrice={ticket.event.priceMicroStx}
                        onTransferComplete={loadUserTickets}
                      />
                      {ticket.event.metadataUri && (
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a href={ticket.event.metadataUri} target="_blank" rel="noopener noreferrer">
                            View NFT Metadata
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
