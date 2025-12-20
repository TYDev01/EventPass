"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Github, Twitter, Waves } from "lucide-react";

export function Footer() {
  const socials = [
    { label: "Twitter", href: "https://twitter.com", icon: Twitter },
    { label: "GitHub", href: "https://github.com", icon: Github },
    { label: "Stacks", href: "https://stacks.co", icon: Waves }
  ];

  return (
    <motion.footer
      id="tickets"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="mt-24 border-t border-transparent bg-[linear-gradient(180deg,rgba(246,199,182,0)_0%,#f6c7b6_45%,#f1ad97_100%)] dark:!bg-[#201a17] dark:bg-none"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-6 py-10 text-center text-sm text-[#1e1916] dark:text-white/80">
        <div className="flex items-center gap-2 text-[#1e1916] dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            EP
          </span>
          EventPass
        </div>
        <p className="max-w-xl text-balance">
          Secure, transparent ticketing powered by the EventPass Clarity smart contract. Mint experiences, manage seat
          inventory, and reward your communities.
        </p>
        <div className="flex items-center gap-4">
          {socials.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="rounded-full bg-white/10 p-2 text-white/70 transition hover:text-primary"
            >
              <span className="sr-only">{label}</span>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </Link>
          ))}
        </div>
        <span className="text-xs">© {new Date().getFullYear()} EventPass. All rights reserved.</span>
      </div>
    </motion.footer>
  );
}
