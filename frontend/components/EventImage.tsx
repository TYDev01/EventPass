"use client";

import { useEffect, useState } from "react";
import { getImageFromMetadata } from "@/lib/metadata-cache";
import { getEventImageByIndex } from "@/lib/events";

type EventImageProps = {
  metadataUri: string;
  eventId: number;
  alt: string;
  className?: string;
};

export function EventImage({ metadataUri, eventId, alt, className }: EventImageProps) {
  const fallbackImage = getEventImageByIndex(eventId);
  const [imageSrc, setImageSrc] = useState(fallbackImage);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!metadataUri) {
        setImageSrc(fallbackImage);
        setIsLoading(false);
        return;
      }

      try {
        const imageUrl = await getImageFromMetadata(metadataUri, fallbackImage);
        if (!cancelled) {
          setImageSrc(imageUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load image from metadata:", error);
        if (!cancelled) {
          setImageSrc(fallbackImage);
          setIsLoading(false);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [metadataUri, eventId, fallbackImage]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => {
        // Fallback if image fails to load
        setImageSrc(fallbackImage);
      }}
    />
  );
}
