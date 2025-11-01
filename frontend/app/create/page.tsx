"use client";

import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { openContractCall } from "@stacks/connect";
import { StacksTestnet } from "@stacks/network-v6";
import { stringAsciiCV, uintCV } from "@stacks/transactions";
import { ArrowLeft, Wallet } from "lucide-react";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useStacks } from "@/components/StacksProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TESTNET_CORE_API, buildAppDetails, getContractParts } from "@/lib/stacks";

const MAX_TITLE_LENGTH = 64;
const MAX_DATE_LENGTH = 32;

const stacksTestnet = new StacksTestnet({ url: TESTNET_CORE_API });

const initialFeedback = {
  message: "Review your event details before publishing on-chain.",
  tone: "info" as const
};

type FeedbackTone = "info" | "success" | "error";

type Feedback = {
  message: string;
  tone: FeedbackTone;
};

const formatFeedbackClasses = (tone: FeedbackTone) => {
  switch (tone) {
    case "success":
      return "border-emerald-400/50 bg-emerald-50 text-emerald-800";
    case "error":
      return "border-red-400/60 bg-red-50 text-red-700";
    default:
      return "border-primary/30 bg-white/70 text-foreground";
  }
};

export default function CreateEventPage() {
  const { address, userSession, connect, refreshSession } = useStacks();
  const { contractAddress, contractName } = useMemo(() => getContractParts(), []);
  const contractConfigured = Boolean(contractAddress && contractName);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(() =>
    contractConfigured
      ? initialFeedback
      : {
          tone: "error",
          message:
            "Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to your deployed contract (e.g. ST2...event-pass)."
        }
  );
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const resetForm = () => {
    setTitle("");
    setDate("");
    setPrice("");
    setTotalSeats("");
  };

  const validateInputs = () => {
    if (!contractConfigured) {
      setFeedback({
        tone: "error",
        message:
          "Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to your deployed contract (e.g. ST...event-pass)."
      });
      return false;
    }

    if (!address || !userSession) {
      setFeedback({
        tone: "info",
        message: "Connect your Leather wallet to create a new event."
      });
      connect();
      return false;
    }

    if (!title.trim()) {
      setFeedback({ tone: "error", message: "Event title is required." });
      return false;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      setFeedback({
        tone: "error",
        message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`
      });
      return false;
    }

    const normalizedDate = date.trim();
    if (!normalizedDate) {
      setFeedback({ tone: "error", message: "Provide a date or time label for the event." });
      return false;
    }

    if (normalizedDate.length > MAX_DATE_LENGTH) {
      setFeedback({
        tone: "error",
        message: `Date label must be ${MAX_DATE_LENGTH} characters or fewer.`
      });
      return false;
    }

    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      setFeedback({ tone: "error", message: "Price must be a positive number." });
      return false;
    }

    const seatsValue = Number(totalSeats);
    if (!Number.isInteger(seatsValue) || seatsValue <= 0) {
      setFeedback({
        tone: "error",
        message: "Total seats must be an integer greater than zero."
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateInputs()) {
      return;
    }

    if (!userSession || !contractAddress || !contractName) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback({
        tone: "info",
        message: "Review and confirm the transaction in your Leather wallet to publish the event."
      });

      const priceInMicroStx = BigInt(Math.round(Number(price) * 1_000_000));
      const seatsValue = BigInt(Number(totalSeats));

      await openContractCall({
        contractAddress,
        contractName,
        functionName: "create-event",
        functionArgs: [
          stringAsciiCV(title.trim()),
          stringAsciiCV(date.trim()),
          uintCV(priceInMicroStx),
          uintCV(seatsValue)
        ],
        userSession,
        appDetails: buildAppDetails(),
        network: stacksTestnet,
        onCancel: () => {
          setIsSubmitting(false);
          setFeedback({
            tone: "info",
            message: "Event creation was cancelled in the wallet."
          });
        },
        onFinish: (payload) => {
          setIsSubmitting(false);
          setFeedback({
            tone: "success",
            message: `Event creation submitted! Track status via tx ${payload.txId}.`
          });
          resetForm();
          void refreshSession();
        }
      });
    } catch (error) {
      console.error("Failed to initiate event creation", error);
      setIsSubmitting(false);
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while opening the Leather transaction modal."
      });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute left-[-15%] top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 pb-24 pt-16">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
        </Link>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="glass-panel rounded-[2.5rem] border border-white/50 bg-white/70 p-10 shadow-[0_50px_120px_-60px_rgba(36,17,0,0.65)]"
        >
          <div className="flex flex-col gap-6 pb-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-primary">
              <Wallet className="h-4 w-4" aria-hidden="true" />
              Create a premium EventPass drop
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-foreground">Launch a new on-chain event</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Define the public metadata and ticket supply for your EventPass experience. You will review and sign the
                resulting contract call in your Leather wallet.
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${formatFeedbackClasses(feedback.tone)}`}>
              {feedback.message}
            </div>
          </div>

          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                placeholder="Stacks Summit 2025"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date or time label</Label>
              <Input
                id="date"
                placeholder="June 21, 2025"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                maxLength={MAX_DATE_LENGTH}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                This string is stored on-chain (max {MAX_DATE_LENGTH} characters). Use a short human-readable label.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Ticket price (STX)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.000001"
                  placeholder="120"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="seats">Total seats</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="250"
                  value={totalSeats}
                  onChange={(event) => setTotalSeats(event.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {shortAddress ? (
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  Connected as {shortAddress}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Wallet not connected. Connect before submitting the contract call.
                </div>
              )}
              <div className="flex items-center gap-3">
                <ConnectWalletButton />
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? "Awaiting signature" : "Create event"}
                </Button>
              </div>
            </div>
          </form>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
}
