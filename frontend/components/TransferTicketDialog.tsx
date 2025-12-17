"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { uintCV, principalCV } from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStacks } from "@/components/StacksProvider";
import { getContractParts } from "@/lib/stacks";
import { formatPriceFromMicroStx } from "@/lib/events";

type TransferTicketDialogProps = {
  eventId: number;
  seat: number;
  eventTitle: string;
  originalPrice: number | bigint;
  onTransferComplete?: () => void;
};

export function TransferTicketDialog({
  eventId,
  seat,
  eventTitle,
  originalPrice,
  onTransferComplete,
}: TransferTicketDialogProps) {
  const { userSession } = useStacks();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Convert originalPrice to BigInt if it isn't already, then calculate 5% fee
  const priceAsBigInt = typeof originalPrice === 'bigint' ? originalPrice : BigInt(originalPrice);
  const transferFee = Number((priceAsBigInt * BigInt(5)) / BigInt(100));

  const handleTransfer = async () => {
    if (!userSession) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!recipientAddress.trim()) {
      toast.error("Please enter a recipient address");
      return;
    }

    // Basic Stacks address validation
    if (!recipientAddress.includes(".") && !recipientAddress.startsWith("ST") && !recipientAddress.startsWith("SP")) {
      toast.error("Please enter a valid Stacks address or name");
      return;
    }

    const { contractAddress, contractName } = getContractParts();

    if (!contractAddress || !contractName) {
      toast.error("Contract not configured");
      return;
    }

    setIsTransferring(true);

    try {
      await openContractCall({
        contractAddress,
        contractName,
        functionName: "transfer-ticket",
        functionArgs: [
          uintCV(eventId),
          uintCV(seat),
          principalCV(recipientAddress),
        ],
        onFinish: (data) => {
          console.log("Transfer transaction:", data);
          toast.success("Ticket transfer initiated! Check your wallet for confirmation.");
          setIsOpen(false);
          setRecipientAddress("");
          if (onTransferComplete) {
            onTransferComplete();
          }
        },
        onCancel: () => {
          console.log("Transfer cancelled");
          toast.info("Transfer cancelled");
          setIsTransferring(false);
        },
      });
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Failed to initiate transfer");
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Send className="h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Ticket</DialogTitle>
          <DialogDescription>
            Transfer your ticket for {eventTitle} (Seat #{seat}) to another user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient Stacks Address</Label>
            <Input
              id="recipient"
              placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM or alice.btc"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={isTransferring}
            />
            <p className="text-xs text-muted-foreground">
              Enter a Stacks address (ST...) or BNS name (alice.btc)
            </p>
          </div>
          
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <h4 className="mb-2 text-sm font-semibold">Transfer Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-medium">{eventTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seat:</span>
                <span className="font-medium">#{seat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Price:</span>
                <span className="font-medium">{formatPriceFromMicroStx(originalPrice)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground">Transfer Fee (5%):</span>
                <span className="font-medium text-primary">{formatPriceFromMicroStx(transferFee)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The transfer fee goes to the event creator
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isTransferring}
          >
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={isTransferring || !recipientAddress.trim()}>
            {isTransferring ? "Initiating..." : "Transfer Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
