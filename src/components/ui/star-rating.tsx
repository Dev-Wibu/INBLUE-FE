/**
 * StarRating Component
 * Displays or allows interaction with star ratings (1-5)
 *
 * Visual: gradient amber → orange fill, scale + glow on hover, smooth
 * transitions. Size ranges from `sm` (compact list rows) up to `2xl`
 * (interactive form entry). Supports both read-only display and
 * interactive entry.
 */

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  value?: number;
  onChange?: (_value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  "2xl": "h-10 w-10 sm:h-12 sm:w-12",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
  xl: "gap-2",
  "2xl": "gap-2.5 sm:gap-3",
};

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
  showValue = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const reduce = useReducedMotion();

  const displayValue = hoverValue || value || 0;

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      // Toggle off if clicking the current value (allow "clear").
      onChange(starValue === value ? 0 : starValue);
    }
  };

  const handleMouseEnter = (starValue: number) => {
    if (!readOnly) {
      setHoverValue(starValue);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(0);
    }
  };

  return (
    <div
      className={cn("inline-flex items-center", gapClasses[size], className)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label={readOnly ? "Rating" : "Set your rating"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;
        const isHalf = !isFilled && star - 0.5 <= displayValue;
        return (
          <motion.button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            onFocus={() => handleMouseEnter(star)}
            onBlur={handleMouseLeave}
            disabled={readOnly}
            whileHover={reduce || readOnly ? undefined : { scale: 1.12 }}
            whileTap={reduce || readOnly ? undefined : { scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-checked={value === star}
            role={readOnly ? undefined : "radio"}
            className={cn(
              "rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
              !readOnly && "cursor-pointer",
              readOnly && "cursor-default"
            )}>
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors duration-200",
                isFilled || isHalf
                  ? "fill-amber-400 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.35)]"
                  : "fill-transparent text-slate-300 dark:text-slate-600"
              )}
            />
          </motion.button>
        );
      })}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          {(value || 0).toFixed(1)}
        </span>
      )}
    </div>
  );
}
