"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { openContractCall } from "@stacks/connect";
import { createNetwork } from "@stacks/network";
import { stringAsciiCV, uintCV } from "@stacks/transactions";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Plus, Ticket, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { BatchPaymentDialog } from "@/components/BatchPaymentDialog";
import { useStacks } from "@/components/StacksProvider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CORE_API_BASE_URL, STACKS_NETWORK, buildAppDetails, getContractParts } from "@/lib/stacks";
import { EVENT_IMAGE_POOL, fetchNextEventId, fetchOnChainEvents, formatPriceFromMicroStx, type OnChainEvent } from "@/lib/events";
import { addPendingEvent } from "@/lib/pending-events";
import {
  canCreateEventToday,
  millisUntilNextCreation,
  recordEventCreation
} from "@/lib/creation-limit";

const MAX_TITLE_LENGTH = 64;
const MAX_DATE_LENGTH = 32;
const MAX_METADATA_URI_LENGTH = 256;
const MAX_IMAGE_SIZE_BYTES = 1_000_000;

const PINATA_GATEWAY_URL =
  process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud/ipfs/";

const stacksNetwork = createNetwork({
  network: STACKS_NETWORK,
  client: { baseUrl: CORE_API_BASE_URL }
});

type AttributeInput = {
  traitType: string;
  value: string;
};

export default function CreateEventPage() {
  const { address, userSession, connect, refreshSession } = useStacks();
  const { contractAddress, contractName } = useMemo(() => getContractParts(), []);
  const contractConfigured = Boolean(contractAddress && contractName);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date>();
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [metadataDescription, setMetadataDescription] = useState("");
  const [metadataExternalUrl, setMetadataExternalUrl] = useState("");
  const [metadataAttributes, setMetadataAttributes] = useState<AttributeInput[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBatchPaymentOpen, setIsBatchPaymentOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [userEvents, setUserEvents] = useState<OnChainEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null;

  const formatDuration = (millis: number) => {
    const totalSeconds = Math.ceil(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${Math.max(minutes, 1)}m`;
  };

  // Fetch user's created events
  useEffect(() => {
    if (!address) {
      setUserEvents([]);
      return;
    }

    const loadUserEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const allEvents = await fetchOnChainEvents(address);
        const myEvents = allEvents.filter(event => event.creator === address);
        setUserEvents(myEvents);
      } catch (error) {
        console.error("Failed to load user events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadUserEvents();
  }, [address]);

  const resetForm = () => {
    setTitle("");
    setDate(undefined);
    setLocation("");
    setPrice("");
    setTotalSeats("");
    setMetadataDescription("");
    setMetadataExternalUrl("");
    setMetadataAttributes([]);
    setImageFile(null);
    setImageError(null);
  };

  const handleImageSelection = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setImageFile(null);
      return;
    }
    const file = files[0];
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setImageError("Image exceeds 1MB limit.");
      setImageFile(null);
      return;
    }
    setImageError(null);
    setImageFile(file);
  };

  const addAttributeRow = () => {
    setMetadataAttributes((prev) => [...prev, { traitType: "", value: "" }]);
  };

  const updateAttribute = (index: number, key: keyof AttributeInput, value: string) => {
    setMetadataAttributes((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value
            }
          : item
      )
    );
  };

  const removeAttributeRow = (index: number) => {
    setMetadataAttributes((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const validateInputs = () => {
    if (!contractConfigured) {
      toast.error("Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to your deployed contract (e.g. ST...event-pass).");
      return false;
    }

    if (!address || !userSession) {
      toast.info("Connect your Leather wallet to create a new event.");
      connect();
      return false;
    }

    if (!canCreateEventToday(address)) {
      const remaining = millisUntilNextCreation(address);
      toast.error(`You can create another event in ${formatDuration(remaining)}.`);
      return false;
    }

    if (!title.trim()) {
      toast.error("Event title is required.");
      return false;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      toast.error(`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
      return false;
    }

    if (!date) {
      toast.error("Please select an event date.");
      return false;
    }

    if (!location.trim()) {
      toast.error("Event location is required.");
      return false;
    }

    const priceValue = Number(price);
    if (Number.isNaN(priceValue) || priceValue < 0) {
      toast.error("Price must be a positive number.");
      return false;
    }

    const seatsValue = Number(totalSeats);
    if (!Number.isInteger(seatsValue) || seatsValue <= 0) {
      toast.error("Total seats must be an integer greater than zero.");
      return false;
    }

    if (!metadataDescription.trim()) {
      toast.error("Metadata description is required.");
      return false;
    }

    if (!imageFile) {
      toast.error("Upload an NFT image smaller than 1MB.");
      return false;
    }

    if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("The selected image is larger than 1MB. Please choose a smaller file.");
      setImageError("Image exceeds 1MB limit.");
      return false;
    }

    setImageError(null);

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

    if (!date) {
      toast.error("Please select an event date.");
      return;
    }

    try {
      setIsSubmitting(true);
      toast.info("Review and confirm the transaction in your Leather wallet to publish the event.");

      const trimmedTitle = title.trim();
      const trimmedDate = format(date, "MMMM d, yyyy");
      const trimmedLocation = location.trim();
      const numericPrice = Number(price);
      const numericSeats = Number(totalSeats);
      const priceInMicroStx = BigInt(Math.round(numericPrice * 1_000_000));
      const seatsValue = BigInt(numericSeats);
      let expectedEventId: number | undefined;

      try {
        if (!address) {
          throw new Error("Wallet address unavailable while predicting event id.");
        }
        const nextId = await fetchNextEventId(address);
        expectedEventId = Number(nextId);
      } catch (error) {
        console.warn("Unable to predict event id before submission", error);
      }

      const imageIndex = Math.floor(Math.random() * EVENT_IMAGE_POOL.length);

      if (!imageFile) {
        throw new Error("NFT image missing from form submission.");
      }

      const imageForm = new FormData();
      imageForm.append("file", imageFile);
      imageForm.append(
        "pinataMetadata",
        JSON.stringify({
          name: `${trimmedTitle}-${Date.now()}`
        })
      );

      const imageUploadResponse = await fetch("/api/pinata/upload", {
        method: "POST",
        body: imageForm
      });

      if (!imageUploadResponse.ok) {
        const errorPayload = await imageUploadResponse.json().catch(() => null);
        throw new Error(
          errorPayload?.error ?? "Failed to upload ticket artwork to Pinata. Please try again."
        );
      }

      const imageUploadData = await imageUploadResponse.json();
      const imageCid = imageUploadData.cid as string;
      const imageUrl = `${PINATA_GATEWAY_URL}${imageCid}`;

      const metadataPayload = {
        name: trimmedTitle,
        description: metadataDescription.trim(),
        image: imageUrl,
        ...(metadataExternalUrl.trim()
          ? { external_url: metadataExternalUrl.trim() }
          : {}),
        attributes: [
          {
            trait_type: "Location",
            value: trimmedLocation
          },
          {
            trait_type: "Date",
            value: trimmedDate
          },
          ...metadataAttributes
            .filter((item) => item.traitType.trim() && item.value.trim())
            .map((item) => ({
              trait_type: item.traitType.trim(),
              value: item.value.trim()
            }))
        ]
      };

      const metadataResponse = await fetch("/api/pinata/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metadataPayload)
      });

      if (!metadataResponse.ok) {
        const errorPayload = await metadataResponse.json().catch(() => null);
        throw new Error(
          errorPayload?.error ??
            "Failed to upload metadata to Pinata. Please try again after checking your inputs."
        );
      }

      const metadataData = await metadataResponse.json();
      const metadataCid = metadataData.cid as string;
      const metadataUri = `${PINATA_GATEWAY_URL}${metadataCid}`;

      await openContractCall({
        contractAddress,
        contractName,
        functionName: "create-event",
        functionArgs: [
          stringAsciiCV(trimmedTitle),
          stringAsciiCV(trimmedDate),
          uintCV(priceInMicroStx),
          uintCV(seatsValue),
          stringAsciiCV(metadataUri.slice(0, MAX_METADATA_URI_LENGTH))
        ],
        userSession,
        appDetails: buildAppDetails(),
        network: stacksNetwork,
        onCancel: () => {
          setIsSubmitting(false);
          toast.info("Event creation was cancelled in the wallet.");
        },
        onFinish: (payload) => {
          setIsSubmitting(false);
          addPendingEvent({
            txId: payload.txId,
            title: trimmedTitle,
            date: trimmedDate,
            priceMicroStx: priceInMicroStx.toString(),
            totalSeats: numericSeats,
            creator: address ?? "",
            createdAt: Date.now(),
            imageIndex,
            expectedEventId,
            metadataUri
          });
          recordEventCreation(address);
          toast.success(`Event creation submitted! Track status via tx ${payload.txId}. Your listing will appear once the transaction confirms.`);
          resetForm();
          void refreshSession();
        }
      });
    } catch (error) {
      console.error("Failed to initiate event creation", error);
      setIsSubmitting(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while opening the Leather transaction modal."
      );
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-hero-accent" aria-hidden />
      <div className="pointer-events-none absolute left-[-15%] top-[-5%] h-96 w-96 rounded-full bg-primary/10 blur-[140px]" aria-hidden />

      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-12 px-6 pb-24 pt-16">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to events
        </Link>

        {/* Side by side sections - responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - User's Events & Batch Payment */}
          <div className="flex flex-col gap-8">
            {/* User's Created Events */}
            {address && (
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="glass-panel rounded-[2.5rem] border border-primary/20 bg-white/80 p-8 shadow-[0_50px_120px_-60px_rgba(252,100,50,0.25)]"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-foreground">Your Events</h2>
                    <p className="text-sm text-muted-foreground">
                      Select an event to send batch payments to workers.
                    </p>
                  </div>
                  {isLoadingEvents ? (
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                      Loading your events...
                    </div>
                  ) : userEvents.length === 0 ? (
                    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                      You haven't created any events yet. Create your first event to get started.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {userEvents.map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedEventId(event.id)}
                          className={`w-full rounded-lg border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5 ${
                            selectedEventId === event.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary">#{event.id}</span>
                                <span className="text-sm font-medium text-foreground truncate">{event.title}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex min-w-0 items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="truncate">{event.date}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Ticket className="h-3 w-3" />
                                  {event.soldSeats}/{event.totalSeats} sold
                                </span>
                                <span className="font-medium text-primary">
                                  {formatPriceFromMicroStx(event.priceMicroStx)}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              event.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : event.status === "Ended"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {event.status}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {/* Batch Payment Section */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="glass-panel rounded-[2.5rem] border border-primary/20 bg-white/80 p-8 shadow-[0_50px_120px_-60px_rgba(252,100,50,0.25)] h-fit"
            >
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-foreground">Batch Pay Workers</h2>
                <p className="text-sm text-muted-foreground">
                  Send STX payments to multiple recipients in a single transaction. Perfect for paying event staff, contractors, or performers.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="batch-event-id">Select Event ID</Label>
                  <Input
                    id="batch-event-id"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Enter event ID (e.g., 1)"
                    value={selectedEventId ?? ""}
                    onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only the event creator can send batch payments for their events.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!address) {
                      toast.info("Connect your wallet first");
                      connect();
                      return;
                    }
                    if (!selectedEventId || selectedEventId < 1) {
                      toast.error("Please enter a valid event ID");
                      return;
                    }
                    setIsBatchPaymentOpen(true);
                  }}
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Batch Pay Workers
                </Button>
              </div>
            </div>
          </motion.section>
          </div>

          {/* Right Column - Event Creation Section */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="glass-panel rounded-[2.5rem] border border-white/50 bg-white/70 p-8 shadow-[0_50px_120px_-60px_rgba(36,17,0,0.65)]"
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

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label>Event date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !date && "text-muted-foreground"
                      }`}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="truncate">{date ? format(date, "PPP") : "Pick a date"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="New York, NY"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="pl-9"
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
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

            <div className="grid gap-2">
              <Label htmlFor="metadata-description">Event description</Label>
              <textarea
                id="metadata-description"
                placeholder="Describe the experience your attendees unlock."
                value={metadataDescription}
                onChange={(event) => setMetadataDescription(event.target.value)}
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metadata-external-url">External URL (optional)</Label>
              <Input
                id="metadata-external-url"
                placeholder="https://eventpass.xyz/your-event"
                value={metadataExternalUrl}
                onChange={(event) => setMetadataExternalUrl(event.target.value)}
                maxLength={MAX_METADATA_URI_LENGTH}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This appears in wallets as the “view on web” link.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="metadata-image">Ticket artwork (max 1MB)</Label>
              <Input
                id="metadata-image"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => handleImageSelection(event.target.files)}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground">
                Upload high-resolution artwork (PNG, JPG, SVG, or WEBP). Maximum 1MB.
              </p>
              {imageFile ? (
                <p className="text-xs text-muted-foreground">
                  Selected: {imageFile.name} ({Math.round(imageFile.size / 1024)} KB)
                </p>
              ) : null}
              {imageError ? <p className="text-xs text-red-600">{imageError}</p> : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Attributes (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={addAttributeRow}
                  disabled={isSubmitting}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add attribute
                </Button>
              </div>
              {metadataAttributes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No attributes yet. Add trait and value pairs to surface collectibles details in wallets.
                </p>
              ) : (
                <div className="space-y-3">
                  {metadataAttributes.map((attribute, index) => (
                    <div
                      key={`attribute-${index}`}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-3"
                    >
                      <div className="grid gap-1">
                        <Label htmlFor={`trait-${index}`} className="text-xs text-muted-foreground">
                          Trait type
                        </Label>
                        <Input
                          id={`trait-${index}`}
                          placeholder="Section"
                          value={attribute.traitType}
                          onChange={(event) => updateAttribute(index, "traitType", event.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor={`value-${index}`} className="text-xs text-muted-foreground">
                          Value
                        </Label>
                        <Input
                          id={`value-${index}`}
                          placeholder="VIP"
                          value={attribute.value}
                          onChange={(event) => updateAttribute(index, "value", event.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeAttributeRow(index)}
                        disabled={isSubmitting}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Remove attribute row</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {address && !canCreateEventToday(address) ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                You can create another event in {formatDuration(millisUntilNextCreation(address))}.
              </div>
            ) : null}


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
        </div>

        <BatchPaymentDialog
          isOpen={isBatchPaymentOpen}
          onClose={() => setIsBatchPaymentOpen(false)}
          eventId={selectedEventId}
        />
      </main>

      <Footer />
    </div>
  );
}
