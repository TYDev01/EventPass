# EventPass

EventPass is a full-stack Stacks ticketing app. The Clarity contract mints seat-level NFTs for events, and the Next.js frontend provides a premium UI for creating events, buying tickets, transferring ownership, and exporting calendars.

## Smart Contract Features
- Register events with title, date, price, seats, and metadata URI.
- Seat-level NFT minting with on-chain ownership and SIP-016 metadata support.
- Lifecycle controls for canceling or ending events.
- Ticket transfers with a 5% creator fee.
- Two-step refunds for canceled events (claim + creator payout).
- Batch STX payments for creator workflows (e.g., staff payouts).
- Read-only helpers for events, tickets, and metadata.

## Frontend Features
- Event discovery with on-chain reads and graceful fallback sample data.
- Create-event flow with metadata + image pinning via Pinata.
- Real-time updates via Hiro websocket event streaming.
- Ticket purchasing with QR payment preview and WalletConnect calls.
- My Tickets view with transfer dialog.
- Calendar view with ICS export + Google Calendar deep links.
- Analytics view with export to XLSX and printable summaries.

## Project Structure
```
Clarinet.toml
contracts/event-pass.clar
deployments/
settings/
tests/event-pass.test.ts
frontend/
README.md
```

## Prerequisites
- Node.js 18+
- npm
- Clarinet CLI (`clarinet --version`)
- A Stacks wallet (Leather, Xverse, or WalletConnect)

## Setup

Contract dev + tests:
```bash
npm install
clarinet check
npm test
```

Frontend dev server:
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=ST...event-pass
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_STACKS_API_BASE_URL=https://api.testnet.hiro.so
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_PINATA_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
PINATA_JWT=your_pinata_jwt
```

Notes:
- `PINATA_JWT` is required for the `/api/pinata/*` routes used by the create flow.
- `NEXT_PUBLIC_REOWN_PROJECT_ID` defaults to the in-code fallback if omitted.
- `NEXT_PUBLIC_STACKS_API_BASE_URL` is optional; it defaults to Hiro’s public API per network.

## API Routes
- `POST /api/pinata/upload`: Upload an image file to Pinata (1 MB limit).
- `POST /api/pinata/metadata`: Pin NFT metadata JSON to Pinata.
- `POST /api/calendar/ics`: Generate an ICS calendar file for selected events.

## Contract Functions (Public)
- `create-event`
- `purchase-ticket`
- `cancel-event`
- `end-event`
- `transfer-ticket`
- `claim-refund`
- `process-refund`
- `batch-pay`
- `set-contract-metadata`

## Contract Functions (Read-only)
- `get-next-event-id`
- `get-event`
- `get-ticket-metadata`
- `get-token-uri`
- `get-contract-uri`
- `contract-owner`

## Testing
The Vitest suite covers creation, purchase, transfer, refund, and lifecycle transitions.
```bash
npm test
```

## Known Gaps / Improvements to Consider
- Add on-chain rate limiting or creator reputation (current limit is client-side).
- Replace seat-by-seat ticket scans with owner-indexed lookups.
- Align chainhook and transaction status polling with the configured network.
- Add frontend unit + E2E tests (e.g., Testing Library, Playwright).
- Add search + filtering UI and a resale marketplace (see `IMPROVEMENTS.md`).

## Deployment Notes
Clarinet plans live in `deployments/`. Update or add batches before deploying to devnet/testnet/mainnet.

EventPass demonstrates how to manage real-world ticketing workflows on Stacks and provides a strong foundation for building production-grade event platforms.
