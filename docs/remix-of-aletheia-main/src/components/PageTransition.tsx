import { motion } from "framer-motion";
import { ReactNode } from "react";

type TransitionStyle = "default" | "ritual" | "passage" | "mirror";

const transitionMap = {
  default: {
    initial: { opacity: 0, y: 16, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.99 },
  },
  ritual: {
    initial: { opacity: 0, scale: 0.9, filter: "blur(8px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 1.05, filter: "blur(4px)" },
  },
  passage: {
    initial: { opacity: 0, y: 40, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 1.02 },
  },
  mirror: {
    initial: { opacity: 0, x: -20, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 20, scale: 0.98 },
  },
} as const;

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  variant?: TransitionStyle;
}

export default function PageTransition({ children, className = "", variant = "default" }: PageTransitionProps) {
  const v = transitionMap[variant];
  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
