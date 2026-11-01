"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** จำนวนดาวที่ได้ */
  value: number;
  /** จำนวนดาวทั้งหมด (ปกติ 3 ดวงต่อหนึ่งด่าน) */
  total?: number;
  size?: "sm" | "md" | "lg";
  /** เล่นแอนิเมชันเด้งตอนเพิ่งได้ดาว */
  animate?: boolean;
  className?: string;
};

const sizeClass = {
  sm: "size-5",
  md: "size-8",
  lg: "size-12",
} as const;

export function StarRating({
  value,
  total = 3,
  size = "md",
  animate = false,
  className,
}: StarRatingProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="img"
      aria-label={`ได้ ${value} ดาว จาก ${total} ดาว`}
    >
      {Array.from({ length: total }, (_, index) => {
        const earned = index < value;
        return (
          <motion.span
            key={index}
            initial={animate && earned ? { scale: 0, rotate: -30 } : false}
            animate={animate && earned ? { scale: 1, rotate: 0 } : undefined}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 14,
              delay: index * 0.12,
            }}
            className="inline-flex"
          >
            <Star
              className={cn(
                sizeClass[size],
                earned ? "fill-star text-star" : "fill-surface-2 text-border",
              )}
              strokeWidth={2.5}
              aria-hidden
            />
          </motion.span>
        );
      })}
    </div>
  );
}
