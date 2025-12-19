"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { openContractCall } from "@stacks/connect";
import { createNetwork } from "@stacks/network";
import { 
  uintCV, 
  PostConditionMode, 
  FungibleConditionCode,
  Pc
} from "@stacks/transactions";
import { CalendarDays, MapPin, Ticket, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventPassEvent } from "@/lib/data";
import { cn, summarizePrincipal } from "@/lib/utils";
import { useStacks } from "@/components/StacksProvider";
import { TESTNET_CORE_API, buildAppDetails, getContractParts } from "@/lib/stacks";

const statusStyles: Record<EventPassEvent["status"], string> = {
  Active: "text-primary bg-primary/10",
  Ended: "text-foreground/70 bg-foreground/5",
  Canceled: "text-red-500 bg-red-100",
  Pending: "text-amber-700 bg-amber-100"
};

export function EventCard({ event }: { event: EventPassEvent }) {
  const router = useRouter();
  const { userSession, connect } = useStacks();
  const [{ contractAddress, contractName }] = useState(() => getContractParts());
  const contractConfigured = Boolean(contractAddress && contractName);
  const network = useMemo(
    () => createNetwork({ network: "testnet", client: { baseUrl: TESTNET_CORE_API } }),
    []
  );

  const isActive = event.status === "Active";
  const isPending = event.status === "Pending";
  const isOnChain = Boolean(event.isOnChain);
  const isSoldOut = isActive && event.sold >= event.seats;
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleBuyClick = useCallback(async () => {
    if (!isActive || isPending || isPurchasing || isSoldOut) {
      return;
    }

    if (!isOnChain) {
      router.push("/events");
      return;
    }

    if (!contractConfigured) {
      console.warn("Contract address not configured. Unable to initiate ticket purchase.");
      return;
    }

    if (!userSession) {
      connect();
      return;
    }

    const seatNumber = event.sold + 1;
    if (seatNumber <= 0 || seatNumber > event.seats) {
      console.warn("Unable to determine an available seat for purchase.", {
        sold: event.sold,
        seats: event.seats
      });
      return;
    }

    try {
      setIsPurchasing(true);
      
      openContractCall({
        contractAddress,
        contractName,
        functionName: "purchase-ticket",
        functionArgs: [uintCV(event.id), uintCV(seatNumber)],
        postConditionMode: PostConditionMode.Allow,
        appDetails: buildAppDetails(),
        network,
        onCancel: () => {
          setIsPurchasing(false);
          toast.info("Purchase cancelled");
        },
        onFinish: (data) => {
          setIsPurchasing(false);
          if (data.txId) {
            toast.success(
              `Ticket purchase submitted! Transaction ID: ${data.txId.slice(0, 8)}...`,
              {
                description: "Your ticket will be minted once the transaction confirms.",
                duration: 6000
              }
            );
          } else {
            toast.success("Ticket purchase submitted!");
          }
        }
      });
    } catch (error) {
      console.error("Unable to start ticket purchase", error);
      toast.error(
        "Failed to purchase ticket",
        {
          description: error instanceof Error ? error.message : "Please try again"
        }
      );
      setIsPurchasing(false);
    }
  }, [
    connect,
    contractAddress,
    contractConfigured,
    contractName,
    event.id,
    event.priceMicroStx,
    event.seats,
    event.sold,
    isActive,
    isOnChain,
    isPending,
    isPurchasing,
    isSoldOut,
    network,
    router,
    userSession
  ]);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
    >
      <Card className="overflow-hidden">
        <div className="relative h-48 w-full overflow-hidden">
          <Image src={event.image} alt={`${event.title} banner`} fill className="object-cover" />
          {isSoldOut && (
            <div className="absolute left-4 top-4">
              <span className="inline-block rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                Sold Out
              </span>
            </div>
          )}
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
          {event.creator ? (
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
              {summarizePrincipal(event.creator)}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            variant={isActive && !isSoldOut ? "default" : "outline"}
            disabled={!isActive || isPending || isPurchasing || isSoldOut}
            onClick={handleBuyClick}
          >
            {isPurchasing ? (
              <>
                <Wallet className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isSoldOut ? (
              "Sold Out"
            ) : isPending ? (
              "Pending confirmation"
            ) : isActive ? (
              `Buy Ticket • ${event.price}`
            ) : (
              "View Details"
            )}
          </Button>
          {event.metadataUri ? (
            <Button
              className="w-full"
              variant="ghost"
              size="sm"
              asChild
            >
              <a href={event.metadataUri} target="_blank" rel="noopener noreferrer">
                View NFT metadata
              </a>
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
