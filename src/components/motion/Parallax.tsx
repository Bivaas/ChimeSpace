'use client';

import { type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

interface Props {
  children: ReactNode;
  speed?: number; // 0.1–0.5 works well
  className?: string;
}

/**
 * Slow parallax background layer. Animates only transform.
 * Respects prefers-reduced-motion — renders static if disabled.
 */
export default function Parallax({ children, speed = 0.2, className }: Props) {
  const shouldReduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 600 * speed]);

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
