"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uintCV } from "@stacks/transactions";
import { CalendarDays, MapPin, Ticket, Wallet } from "lucide-react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { EventPassEvent } from "@/lib/data";
import { cn, summarizePrincipal } from "@/lib/utils";
import { useStacks } from "@/components/StacksProvider";
import { getContractParts } from "@/lib/stacks";
import { formatPriceFromMicroStx } from "@/lib/events";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusStyles: Record<EventPassEvent["status"], string> = {
  Active: "text-primary bg-primary/10",
  Ended: "text-foreground/70 bg-foreground/5",
  Canceled: "text-red-500 bg-red-100",
  Pending: "text-amber-700 bg-amber-100"
};

export function EventCard({ event }: { event: EventPassEvent }) {
  const router = useRouter();
  const { session, connect, callContract } = useStacks();
  const [{ contractAddress, contractName }] = useState(() => getContractParts());
  const contractConfigured = Boolean(contractAddress && contractName);

  const isActive = event.status === "Active";
  const isPending = event.status === "Pending";
  const isOnChain = Boolean(event.isOnChain);
  const isSoldOut = isActive && event.sold >= event.seats;
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const priceMicroStx = useMemo(() => {
    if (event.priceMicroStx !== undefined) {
      return event.priceMicroStx;
    }
    const parsed = Number.parseFloat(event.price.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(parsed)) {
      return BigInt(0);
    }
    return BigInt(Math.round(parsed * 1_000_000));
  }, [event.price, event.priceMicroStx]);

  const formattedPrice = useMemo(() => {
    if (event.priceMicroStx !== undefined) {
      return formatPriceFromMicroStx(event.priceMicroStx);
    }
    return event.price;
  }, [event.price, event.priceMicroStx]);

  const paymentAddress = contractAddress || event.creator || "";
  const paymentMemo = `EventPass ticket ${event.title}`.slice(0, 60);
  const paymentUri = paymentAddress;

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

    if (!session) {
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
      
      const result = await callContract({
        contractAddress,
        contractName,
        functionName: "purchase-ticket",
        functionArgs: [uintCV(BigInt(event.id)), uintCV(BigInt(seatNumber))]
      });

      setIsPurchasing(false);
      if (result?.txid) {
        toast.success(
          `Ticket purchase submitted! Transaction ID: ${result.txid.slice(0, 8)}...`,
          {
            description: "Your ticket will be minted once the transaction confirms.",
            duration: 6000
          }
        );
      } else {
        toast.success("Ticket purchase submitted!");
      }
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
    event.seats,
    event.sold,
    isActive,
    isOnChain,
    isPending,
    isPurchasing,
    isSoldOut,
    router,
    session,
    callContract
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
          {(event.category || (event.tags && event.tags.length > 0)) ? (
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {event.category ? (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  {event.category}
                </span>
              ) : null}
              {event.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-white/70 px-2.5 py-1 text-foreground/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
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
            onClick={() => setIsPaymentOpen(true)}
          >
            {isSoldOut
              ? "Sold Out"
              : isPending
              ? "Pending confirmation"
              : isActive
              ? "Buy Ticket"
              : "View Details"}
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
          <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Pay for your ticket</DialogTitle>
                <DialogDescription>
                  Scan the QR code to send the ticket price, or continue in your wallet to mint the ticket on-chain.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex items-center justify-center rounded-xl border border-border bg-white p-4">
                  {paymentUri ? (
                    <QRCodeCanvas value={paymentUri} size={180} includeMargin />
                  ) : (
                    <div className="text-sm text-muted-foreground">Contract address unavailable.</div>
                  )}
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Send to</p>
                    <p className="font-medium text-foreground break-all">{paymentAddress || "Not available"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Amount</p>
                    <p className="font-medium text-foreground">{formattedPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Memo</p>
                    <p className="font-medium text-foreground">{paymentMemo}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(paymentAddress);
                          toast.success("Address copied to clipboard.");
                        } catch (error) {
                          console.error("Failed to copy address", error);
                          toast.error("Unable to copy address.");
                        }
                      }}
                      disabled={!paymentAddress}
                    >
                      Copy address
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(formattedPrice);
                          toast.success("Amount copied to clipboard.");
                        } catch (error) {
                          console.error("Failed to copy amount", error);
                          toast.error("Unable to copy amount.");
                        }
                      }}
                    >
                      Copy amount
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsPaymentOpen(false);
                    void handleBuyClick();
                  }}
                  disabled={isPurchasing || !isActive || isSoldOut}
                >
                  Continue in wallet
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
