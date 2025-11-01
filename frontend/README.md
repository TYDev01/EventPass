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

## Wallet Integration

The header’s **Connect Wallet** action authenticates with the Leather browser wallet using Stacks Connect. Signed-in addresses display inline, and users can disconnect to clear the session.
