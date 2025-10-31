# EventPass

EventPass is a Clarity smart contract project for the Stacks blockchain that tokenizes event tickets as NFTs. Event creators can register events with basic metadata, pricing, and capacity. Attendees purchase seats by minting non-fungible tokens, ensuring that each ticket is unique, verifiable, and transferable on-chain.

## Features
- Register events with title, date, price, and total seat count.
- Auto-incrementing event identifiers stored on-chain.
- Seat-level ticket sales enforced through Clarity maps.
- Lifecycle controls so creators can cancel or end events.
- NFT minting for each purchased seat, tying ownership to the buyer.
- Read-only helpers to inspect events, ticket metadata, and the next event id.
- Comprehensive Vitest suite that exercises success paths and validation errors.

## Contract Overview
The main contract is `contracts/event-pass.clar` and includes:
- Constants describing common error codes.
- `events` map storing event metadata (`creator`, `title`, `date`, `price`, `total-seats`, `sold-seats`, `status`).
- `tickets` map mapping `(event-id, seat)` to `owner`.
- `ticket` NFT definition using the same `(event-id, seat)` tuple as its token identifier.
- Public functions:
  - `create-event`: Validates input, stores metadata, and increments the `next-event-id`.
  - `purchase-ticket`: Validates seat availability, handles payment via `stx-transfer?`, records ownership, and mints the NFT.
  - `cancel-event`: Lets the creator halt ticket sales by marking an event as canceled.
  - `end-event`: Lets the creator mark an event as ended once it concludes.
- Read-only helpers:
  - `get-next-event-id`
  - `get-event`
  - `get-ticket-metadata`

Inline comments explain each line of logic to aid onboarding and auditing.

## Project Structure
```
Clarinet.toml            # Clarinet project manifest
contracts/event-pass.clar
deployments/default.simnet-plan.yaml
settings/Devnet.toml
settings/Mainnet.toml
settings/Testnet.toml
tests/event-pass.test.ts # Vitest suite using Clarinet simnet
tsconfig.json
vitest.config.js
package.json / package-lock.json
event.md                 # Quick project notes
```

## Prerequisites
- Node.js 18+
- npm
- Clarinet CLI (`clarinet --version` should be available)

Install Node dependencies once:
```bash
npm install
```

## Development Tasks
- **Lint contract syntax:** `clarinet check`
- **Run tests:** `npm test`
  - Executes Vitest with the Clarinet simnet environment (`tests/event-pass.test.ts`).
- **Console REPL:** `clarinet console` (optional, for interactive experimentation).

## Testing
The Vitest suite covers:
- Event creation with valid metadata.
- Rejection of events with zero seats.
- Ticket purchase flow including NFT minting.
- Double-booking prevention.
- Invalid seat numbers and unknown event ids.
- Sold-out capacity rejections once the seat count is exhausted.
- Lifecycle state transitions (cancel / end) and enforcement preventing sales on inactive events.
- Read-only metadata access for sold and unsold seats.

Run the tests after any contract changes to ensure behavior remains intact:
```bash
npm test
```

## Deployment Notes
- The `deployments/default.simnet-plan.yaml` file captures the deployment configuration used by Clarinet tooling for simnet, `clarinet check`, and tests.
- Update the plan or add new batches when preparing for Devnet/Testnet/Mainnet deployments.

## Further Improvements
- Add refund logic or ticket transfers.
- Introduce seat tiers or dynamic pricing.
- Persist off-chain metadata URIs for richer ticket data.
- Extend the TypeScript test suite with additional scenarios (e.g., multiple seat purchases per block, payment edge cases).

EventPass demonstrates how to manage real-world ticketing workflows using Stacks smart contracts and provides a foundation for more advanced event platforms. Feel free to adapt and extend it for your own use case.
