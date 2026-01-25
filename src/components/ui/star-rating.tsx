/**
 * StarRating Component
 * Displays or allows interaction with star ratings (1-5)
 */

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  value?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const gapClasses = {
  sm: "gap-0.5",
  md: "gap-1",
  lg: "gap-1.5",
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

  const displayValue = hoverValue || value || 0;

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      onChange(starValue);
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
    <div className={cn("flex items-center", gapClasses[size], className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;
        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={cn(
              "transition-transform focus:outline-none",
              !readOnly && "cursor-pointer hover:scale-110",
              readOnly && "cursor-default"
            )}>
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                isFilled
                  ? "fill-[#FFD700] text-[#FFD700]"
                  : "fill-transparent text-slate-300 dark:text-slate-600"
              )}
            />
          </button>
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
