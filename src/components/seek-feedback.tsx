"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export interface SeekFeedbackEvent {
  id: number;
  direction: "back" | "forward";
  seconds: number;
}

export const SeekFeedback = memo(function SeekFeedback({
  feedback,
}: {
  feedback: SeekFeedbackEvent | null;
}) {
  const reducedMotion = useReducedMotion();
  const forward = feedback?.direction === "forward";
  const direction = forward ? 1 : -1;

  return (
    <div className="pointer-events-none absolute inset-0 z-[45] select-none" aria-hidden="true">
      <AnimatePresence initial={false}>
        {feedback && (
          <motion.div
            key={feedback.direction}
            data-seek-feedback={feedback.direction}
            className={`absolute top-[38%] -translate-x-1/2 -translate-y-1/2 sm:top-1/2 ${forward ? "left-[80%] sm:left-[76%]" : "left-[20%] sm:left-[24%]"}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.16 }}
          >
            <motion.div
              key={feedback.id}
              className="relative flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-black/50 text-white sm:h-[88px] sm:w-[88px]"
              initial={reducedMotion ? false : { scale: 0.84, x: -direction * 6 }}
              animate={{ scale: 1, x: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 27 }}
            >
              {/* A single sweep follows the seek direction, not a loading loop. */}
              <motion.svg
                viewBox="0 0 88 88"
                fill="none"
                className="absolute inset-0 h-full w-full"
                initial={reducedMotion ? false : { rotate: -direction * 35 }}
                animate={{ rotate: 0 }}
                transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 23 }}
              >
                <g transform={forward ? undefined : "translate(88 0) scale(-1 1)"}>
                  <motion.path
                    d="M 19.5 64.5 A 32 32 0 1 1 75.5 38.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    initial={reducedMotion ? false : { pathLength: 0.15, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.65 }}
                    transition={{ duration: reducedMotion ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.path
                    d="m 70.5 35.5 5.5 4.5 3.5-6.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 0.65 }}
                    transition={{ delay: reducedMotion ? 0 : 0.12, duration: reducedMotion ? 0 : 0.15 }}
                  />
                </g>
              </motion.svg>

              <span className="text-lg font-semibold leading-6 tracking-tight tabular-nums sm:text-[23px] sm:leading-7">
                {forward ? "+" : "−"}{feedback.seconds}
              </span>
              <span className="text-[9px] leading-3 text-white/55 sm:text-[10px]">giây</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
