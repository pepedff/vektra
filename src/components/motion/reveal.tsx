"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

type Tag = "div" | "section" | "li" | "ul" | "p" | "h2" | "span";

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  amount = 0.3,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: Tag;
  amount?: number;
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={revealVariants}
      transition={{ delay }}
    >
      {children}
    </M>
  );
}

export function Stagger({
  children,
  className,
  gap = 0.08,
  delay = 0,
  as = "div",
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: Tag;
  amount?: number;
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </M>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE } },
};

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: Tag;
}) {
  const M = motion[as];
  return (
    <M className={className} variants={itemVariants}>
      {children}
    </M>
  );
}
