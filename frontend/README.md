# EventPass Frontend

This Next.js (App Router) experience surfaces the EventPass Clarity contract in a premium ticketing UI. It uses Tailwind CSS with shadcn-styled primitives, Framer Motion interactions, and Lucide icons.

## Getting Started

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Visit http://localhost:3000 to view the site.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui primitives
- Framer Motion for animation
- Lucide icons
- Leather wallet connections powered by `@stacks/connect`

## Contract Alignment

Sample event data mirrors the smart contract states:
- `Active` events show purchasable tickets.
- `Ended` and `Canceled` events soften call-to-actions while preserving on-chain history.
- Ticket supply and sales figures correspond to the `total-seats` and `sold-seats` fields exposed by the Clarity contract.

Feel free to replace the mock event data in `lib/data.ts` with live contract queries once an API layer is available.

### Environment

Expose your deployed EventPass contract to the client by adding the identifier to `.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=ST2S0QHZC65P50HFAA2P7GD9CJBT48KDJ9DNYGDSK.event-pass
```

The create-event form derives the contract address and name from this identifier before submitting the transaction.

## Wallet Integration

The header’s **Connect Wallet** action authenticates with the Leather browser wallet using Stacks Connect. Signed-in addresses display inline, and users can disconnect to clear the session.

- Network: configure `NEXT_PUBLIC_STACKS_NETWORK` (`testnet` or `mainnet`) and `NEXT_PUBLIC_STACKS_API_BASE_URL` to align the app with your Leather wallet network.

## Create Flow

Visit `/create` (or the **Create Event** link in the navigation) to launch the on-chain publisher. The form validates inputs, opens Leather via `openContractCall`, and reports the resulting transaction ID once submitted.
