"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

type StrikeoutOverlayProps = {
  show: boolean;
  onDone?: () => void;
};

export default function StrikeoutOverlay({
  show,
  onDone,
}: StrikeoutOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onDone?.();
    }, 1600);

    return () => clearTimeout(timer);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="strikeout-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.04, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative flex h-full w-full items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.06 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="relative z-20"
            >
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-8 py-5 shadow-[0_0_60px_rgba(239,68,68,.28)]">
                <motion.h2
                  initial={{ letterSpacing: "0.2em" }}
                  animate={{ letterSpacing: "0.08em" }}
                  transition={{ duration: 0.45 }}
                  className="text-center text-4xl font-extrabold uppercase tracking-[0.08em] text-red-400 md:text-6xl"
                >
                  Strikeout
                </motion.h2>
                <p className="mt-2 text-center text-sm uppercase tracking-[0.35em] text-white/75 md:text-base">
                  K
                </p>
              </div>
            </motion.div>

            <div className="absolute inset-0 z-10">
              <motion.div
                initial={{ x: "38vw", y: "-18vh", scale: 0.6, opacity: 0 }}
                animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: "easeIn" }}
                className="absolute left-1/2 top-1/2"
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div className="h-5 w-5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.95)]" />
                </div>
              </motion.div>

              <motion.div
                initial={{ rotate: -32, x: "7vw", y: "8vh", opacity: 0 }}
                animate={{ rotate: 18, x: "1vw", y: "1vh", opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.28, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 origin-bottom"
              >
                <div className="relative h-28 w-3 rounded-full bg-gradient-to-b from-amber-200 to-amber-500 shadow-[0_0_20px_rgba(251,191,36,.35)] md:h-36" />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 1, 0], scale: [0.2, 1.6, 2.2] }}
                transition={{ delay: 0.5, duration: 0.35 }}
                className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
