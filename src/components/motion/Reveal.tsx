'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Fade-up reveal wrapper. Animates only transform + opacity.
 * Respects prefers-reduced-motion — renders children fully visible if motion is disabled.
 */
export default function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' });

  if (shouldReduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
