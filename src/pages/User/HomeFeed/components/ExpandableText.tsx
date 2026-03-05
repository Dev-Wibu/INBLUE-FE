import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  /** CSS class to clamp (e.g. "line-clamp-3"). Applied when collapsed. */
  clampClass?: string;
  className?: string;
}

/**
 * Renders text with a Facebook-style "Xem thêm" / "Thu gọn" toggle.
 * When collapsed the text is clamped to the given number of lines.
 */
export function ExpandableText({
  text,
  clampClass = "line-clamp-3",
  className,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);

  // Detect whether the clamped text actually overflows (scrollHeight > clientHeight)
  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [text, clampClass, expanded]);

  const showToggle = expanded || isOverflowing;

  return (
    <div className={className}>
      <p ref={pRef} className={cn("whitespace-pre-wrap", !expanded && clampClass)}>
        {text}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-sm font-medium text-[#0047AB] hover:underline dark:text-[#66B2FF]">
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
