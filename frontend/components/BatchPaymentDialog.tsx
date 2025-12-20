"use client";

import { useState } from "react";
import { X, Plus, Trash2, Send, Loader2 } from "lucide-react";
import { openContractCall } from "@stacks/connect";
import { createNetwork } from "@stacks/network";
import { uintCV, listCV, principalCV, PostConditionMode } from "@stacks/transactions";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TESTNET_CORE_API, buildAppDetails, getContractParts } from "@/lib/stacks";

const stacksTestnet = createNetwork({
  network: "testnet",
  client: { baseUrl: TESTNET_CORE_API }
});


interface Recipient {
  id: string;
  address: string;
  amount: string;
}

// ST3AFWCGYF2JJEBNANT3CD9HWFJY715DMYDE368DW
// STDEJDF3200G4SQ4GMA1QQ5VT013QBQF5QE84AT0





interface BatchPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number | null;
}

export function BatchPaymentDialog({ isOpen, onClose, eventId }: BatchPaymentDialogProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", address: "", amount: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddRecipient = () => {
    if (recipients.length >= 50) {
      toast.error("Maximum 50 recipients allowed per batch");
      return;
    }
    setRecipients([
      ...recipients,
      { id: Date.now().toString(), address: "", amount: "" }
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    if (recipients.length === 1) {
      toast.error("At least one recipient is required");
      return;
    }
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleRecipientChange = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const validateAddress = (address: string): boolean => {
    // Stacks mainnet address starts with SP, testnet with ST
    const stacksAddressRegex = /^(SP|ST)[0-9A-Z]{38,41}$/;
    return stacksAddressRegex.test(address);
  };

  const validateAndSubmit = async () => {
    if (!eventId) {
      toast.error("No event selected");
      return;
    }

    // Validate all recipients
    const errors: string[] = [];
    const validRecipients = recipients.filter((r) => r.address.trim() && r.amount.trim());

    if (validRecipients.length === 0) {
      toast.error("Please add at least one recipient with address and amount");
      return;
    }

    validRecipients.forEach((r, index) => {
      if (!validateAddress(r.address)) {
        errors.push(`Recipient ${index + 1}: Invalid Stacks address`);
      }
      const amount = parseFloat(r.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Recipient ${index + 1}: Invalid amount`);
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0]); // Show first error
      return;
    }

    // Calculate total
    const totalSTX = validRecipients.reduce(
      (sum, r) => sum + parseFloat(r.amount),
      0
    );

    try {
      setIsSubmitting(true);

      const { contractAddress, contractName } = getContractParts();

      // Convert amounts to microSTX (1 STX = 1,000,000 microSTX)
      const recipientPrincipals = validRecipients.map((r) => principalCV(r.address));
      const amountsInMicroSTX = validRecipients.map((r) =>
        uintCV(Math.floor(parseFloat(r.amount) * 1_000_000))
      );

      openContractCall({
        network: stacksTestnet,
        appDetails: buildAppDetails(),
        contractAddress,
        contractName,
        functionName: "batch-pay",
        functionArgs: [
          uintCV(eventId),
          listCV(recipientPrincipals),
          listCV(amountsInMicroSTX)
        ],
        postConditionMode: PostConditionMode.Allow,
        onFinish: (data) => {
          console.log("Batch payment transaction:", data);
          toast.success(
            `Batch payment submitted! Total: ${totalSTX.toFixed(6)} STX to ${validRecipients.length} recipients`
          );
          setRecipients([{ id: "1", address: "", amount: "" }]);
          onClose();
        },
        onCancel: () => {
          console.log("Transaction cancelled");
          toast.info("Batch payment cancelled");
        }
      });
    } catch (error) {
      console.error("Error submitting batch payment:", error);
      toast.error("Failed to submit batch payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = (): number => {
    return recipients.reduce((sum, r) => {
      const amount = parseFloat(r.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 backdrop-blur-sm p-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Batch Pay Workers</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send STX to multiple recipients in one transaction
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted transition-colors"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6 space-y-4">
          {recipients.map((recipient, index) => (
            <div
              key={recipient.id}
              className="flex gap-3 items-start bg-muted/30 rounded-lg p-4 border border-border"
            >
              <div className="flex-1 space-y-3">
                <div>
                  <Label htmlFor={`address-${recipient.id}`} className="text-foreground">
                    Recipient {index + 1} Address
                  </Label>
                  <Input
                    id={`address-${recipient.id}`}
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    value={recipient.address}
                    onChange={(e) =>
                      handleRecipientChange(recipient.id, "address", e.target.value)
                    }
                    className="mt-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor={`amount-${recipient.id}`} className="text-foreground">
                    Amount (STX)
                  </Label>
                  <Input
                    id={`amount-${recipient.id}`}
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="0.000000"
                    value={recipient.amount}
                    onChange={(e) =>
                      handleRecipientChange(recipient.id, "amount", e.target.value)
                    }
                    className="mt-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRecipient(recipient.id)}
                disabled={recipients.length === 1 || isSubmitting}
                className="mt-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {recipients.length < 50 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRecipient}
              disabled={isSubmitting}
              className="w-full border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          )}

          {/* Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Recipients:</span>
              <span className="text-foreground font-semibold">{recipients.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="text-foreground font-semibold">
                {calculateTotal().toFixed(6)} STX
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Event ID:</span>
              <span className="text-foreground font-semibold">#{eventId}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-white/95 backdrop-blur-sm p-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={validateAndSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Payments
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
