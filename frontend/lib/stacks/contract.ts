import {
  contractPrincipalCV,
  uintCV,
  stringAsciiCV,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { NETWORK, CONTRACT_ADDRESS, CONTRACT_NAME, Event, Ticket } from './config';

// Mock data for development - replace with actual contract calls when deployed
const mockEvents: Event[] = [
  {
    eventId: 1,
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    title: 'Blockchain Conference 2025',
    date: '2025-02-15',
    price: 50000000, // 50 STX in micro-STX
    totalSeats: 100,
    soldSeats: 25,
    status: 0, // ACTIVE
  },
  {
    eventId: 2,
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    title: 'Web3 Workshop',
    date: '2025-03-01',
    price: 25000000, // 25 STX in micro-STX
    totalSeats: 50,
    soldSeats: 45,
    status: 0, // ACTIVE
  },
  {
    eventId: 3,
    creator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    title: 'NFT Art Exhibition',
    date: '2025-01-20',
    price: 10000000, // 10 STX in micro-STX
    totalSeats: 200,
    soldSeats: 200,
    status: 2, // ENDED
  },
];

// Read-only functions (using mock data for now)
export async function getNextEventId(): Promise<number> {
  return mockEvents.length + 1;
}

export async function getEvent(eventId: number): Promise<Event | null> {
  const event = mockEvents.find(e => e.eventId === eventId);
  return event || null;
}

export async function getTicketMetadata(eventId: number, seat: number): Promise<Ticket | null> {
  // Mock implementation - return null for available seats
  return null;
}

// Write functions (require wallet connection)
export async function createEvent(
  title: string,
  date: string,
  price: number,
  totalSeats: number
) {
  const functionArgs = [
    stringAsciiCV(title),
    stringAsciiCV(date),
    uintCV(price),
    uintCV(totalSeats),
  ];

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-event',
    functionArgs,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  await openContractCall(txOptions);
}

export async function purchaseTicket(eventId: number, seat: number) {
  const functionArgs = [
    uintCV(eventId),
    uintCV(seat),
  ];

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'purchase-ticket',
    functionArgs,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  await openContractCall(txOptions);
}

export async function cancelEvent(eventId: number) {
  const functionArgs = [uintCV(eventId)];

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'cancel-event',
    functionArgs,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  await openContractCall(txOptions);
}

export async function endEvent(eventId: number) {
  const functionArgs = [uintCV(eventId)];

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'end-event',
    functionArgs,
    network: NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };

  await openContractCall(txOptions);
}