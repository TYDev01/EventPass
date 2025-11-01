import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';

export const NETWORK = STACKS_TESTNET; // Change to STACKS_MAINNET for production

export const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with your deployed contract address
export const CONTRACT_NAME = 'event-pass';

// Error codes from the contract
export const CONTRACT_ERRORS = {
  ERR_ZERO_SEATS: 100,
  ERR_NO_SUCH_EVENT: 101,
  ERR_SEAT_TAKEN: 102,
  ERR_INVALID_SEAT: 103,
  ERR_SOLD_OUT: 104,
  ERR_NO_TICKET: 105,
  ERR_EVENT_INACTIVE: 106,
  ERR_NOT_CREATOR: 107,
  ERR_STATUS_TRANSITION: 108,
} as const;

// Status codes from the contract
export const EVENT_STATUS = {
  ACTIVE: 0,
  CANCELED: 1,
  ENDED: 2,
} as const;

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

export interface Event {
  eventId: number;
  creator: string;
  title: string;
  date: string;
  price: number;
  totalSeats: number;
  soldSeats: number;
  status: EventStatus;
}

export interface Ticket {
  eventId: number;
  seat: number;
  owner: string;
}