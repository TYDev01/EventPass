import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function summarizePrincipal(address: string | any, suffixLength = 4) {
  if (!address) {
    return "";
  }
  // Handle non-string inputs (e.g., Clarity principal objects)
  const addressStr = typeof address === 'string' ? address : String(address);
  const normalized = addressStr.trim();
  const prefixLength = Math.min(normalized.length, Math.max(suffixLength + 2, 4));
  if (normalized.length <= prefixLength + suffixLength + 1) {
    return normalized;
  }
  return `${normalized.slice(0, prefixLength)}...${normalized.slice(-suffixLength)}`;
}

export function summarizeHash(hash: string, prefixLength = 6, suffixLength = 6) {
  if (!hash) {
    return "";
  }
  const normalized = hash.trim();
  if (normalized.length <= prefixLength + suffixLength + 1) {
    return normalized;
  }
  return `${normalized.slice(0, prefixLength)}...${normalized.slice(-suffixLength)}`;
}
