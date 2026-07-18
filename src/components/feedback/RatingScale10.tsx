/**
 * RatingScale10
 *
 * 1–10 rating selector. Renders 10 stars as two rows of 5 to keep the
 * control compact, matches the spec in `docs/frontend_student_rate_mentor.md` §8.2.
 *
 * Differences from `components/ui/star-rating` (which is 1-5 only):
 *   - Supports 1–10 by hardcoding `count = 10`.
 *   - Optimised for compact horizontal layout (10 small stars instead of 5 large).
 */

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface RatingScale10Props {
  value?: number;
  // eslint-disable-next-line no-unused-vars
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  /** When true (default) the control groups into two rows of 5. */
  compact?: boolean;
  /** Star color for the filled state. Defaults to the brand gold. */
  filledClassName?: string;
}

const DEFAULT_FILLED = "fill-[#FFD700] text-[#FFD700]";
const DEFAULT_EMPTY = "fill-transparent text-slate-300 dark:text-slate-600";

export function RatingScale10({
  value = 0,
  onChange,
  readOnly = false,
  className,
  compact = true,
  filledClassName = DEFAULT_FILLED,
}: RatingScale10Props) {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;

  const stars = Array.from({ length: 10 }, (_, i) => i + 1);

  const handleClick = (next: number) => {
    if (readOnly) return;
    onChange?.(next);
  };

  return (
    <div
      className={cn("flex flex-col gap-1", className)}
      role="radiogroup"
      aria-label="Rating 1 to 10">
      <div className={cn("flex", compact ? "flex-col gap-1" : "flex-wrap gap-2")}>
        {compact ? (
          <>
            <div className="flex items-center gap-0.5">
              {stars.slice(0, 5).map((n) => (
                <RatingStar
                  key={n}
                  value={n}
                  filled={n <= display}
                  readOnly={readOnly}
                  filledClassName={filledClassName}
                  onClick={handleClick}
                  onHover={setHover}
                  onLeave={() => setHover(0)}
                />
              ))}
            </div>
            <div className="flex items-center gap-0.5">
              {stars.slice(5).map((n) => (
                <RatingStar
                  key={n}
                  value={n}
                  filled={n <= display}
                  readOnly={readOnly}
                  filledClassName={filledClassName}
                  onClick={handleClick}
                  onHover={setHover}
                  onLeave={() => setHover(0)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {stars.map((n) => (
              <RatingStar
                key={n}
                value={n}
                filled={n <= display}
                readOnly={readOnly}
                filledClassName={filledClassName}
                onClick={handleClick}
                onHover={setHover}
                onLeave={() => setHover(0)}
              />
            ))}
          </div>
        )}
      </div>
      {value > 0 && (
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{value}/10</p>
      )}
    </div>
  );
}

interface RatingStarProps {
  value: number;
  filled: boolean;
  readOnly: boolean;
  filledClassName: string;
  // eslint-disable-next-line no-unused-vars
  onClick: (value: number) => void;
  // eslint-disable-next-line no-unused-vars
  onHover: (value: number) => void;
  onLeave: () => void;
}

function RatingStar({
  value,
  filled,
  readOnly,
  filledClassName,
  onClick,
  onHover,
  onLeave,
}: RatingStarProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={filled}
      aria-label={`Rate ${value} of 10`}
      onClick={() => onClick(value)}
      onMouseEnter={() => onHover(value)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(value)}
      onBlur={onLeave}
      disabled={readOnly}
      className={cn(
        "rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/50",
        !readOnly && "cursor-pointer transition-transform hover:scale-110",
        readOnly && "cursor-default"
      )}>
      <Star className={cn("h-5 w-5 transition-colors", filled ? filledClassName : DEFAULT_EMPTY)} />
    </button>
  );
}
