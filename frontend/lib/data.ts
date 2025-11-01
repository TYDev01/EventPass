export type EventPassEvent = {
  id: number;
  title: string;
  date: string;
  location: string;
  price: string;
  status: "Active" | "Ended" | "Canceled";
  seats: number;
  sold: number;
  image: string;
  description: string;
};

export const events: EventPassEvent[] = [
  {
    id: 1,
    title: "Stacks Summit 2025",
    date: "June 21, 2025",
    location: "Miami, USA",
    price: "120 STX",
    status: "Active",
    seats: 250,
    sold: 192,
    image: "/images/stacks-summit.svg",
    description: "A flagship builders summit exploring the Clarity smart contract ecosystem and EventPass ticket NFTs."
  },
  {
    id: 2,
    title: "DeFi Horizons Live",
    date: "July 12, 2025",
    location: "Lisbon, Portugal",
    price: "95 STX",
    status: "Active",
    seats: 180,
    sold: 143,
    image: "/images/defi-horizons.svg",
    description: "Hands-on masterclasses and live coding sessions focused on decentralized finance experiences."
  },
  {
    id: 3,
    title: "Metaverse Nights",
    date: "August 30, 2025",
    location: "Seoul, South Korea",
    price: "150 STX",
    status: "Ended",
    seats: 320,
    sold: 320,
    image: "/images/metaverse-nights.svg",
    description: "Immersive art installations and performances celebrating the intersection of culture and Web3."
  },
  {
    id: 4,
    title: "Creator Lab Pop-up",
    date: "September 18, 2025",
    location: "Berlin, Germany",
    price: "75 STX",
    status: "Canceled",
    seats: 120,
    sold: 0,
    image: "/images/creator-lab.svg",
    description: "An intimate salon for creators to prototype token-gated experiences with EventPass primitives."
  }
];
