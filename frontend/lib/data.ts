export type EventPassEvent = {
  id: number;
  title: string;
  date: string;
  location: string;
  price: string;
  status: "Active" | "Ended" | "Canceled" | "Pending";
  seats: number;
  sold: number;
  image: string;
  description: string;
  creator?: string;
  isOnChain?: boolean;
  txId?: string;
  metadataUri?: string;
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
    description: "A flagship builders summit exploring the Clarity smart contract ecosystem and EventPass ticket NFTs.",
    creator: "ST2F9A7B18RY8FJ48FJH0K52PYQ7R7C91WZ0XR4RB",
    metadataUri: "https://metadata.example/stacks-summit-2025.json"
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
    description: "Hands-on masterclasses and live coding sessions focused on decentralized finance experiences.",
    creator: "ST3PFH72F39KHM1BQK7Z9WTEXAMPLE3R47906WJ8",
    metadataUri: "https://metadata.example/defi-horizons-live.json"
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
    description: "Immersive art installations and performances celebrating the intersection of culture and Web3.",
    creator: "ST1ZH2F4JCYJY6BMF8CNS7EAVYKVBWNP5QNX4M7ZW",
    metadataUri: "https://metadata.example/metaverse-nights.json"
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
    description: "An intimate salon for creators to prototype token-gated experiences with EventPass primitives.",
    creator: "ST3NM6HGEDSN5QBCPB8SHA1EJ4YXEXAMPLE3T9PY",
    metadataUri: "https://metadata.example/creator-lab-popup.json"
  }
];
