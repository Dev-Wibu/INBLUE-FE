import { cn } from "@/lib/utils";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
interface ExpandableTextProps {
  text: string;
  clampClass?: string;
  className?: string;
}
export function ExpandableText({
  text,
  clampClass = "line-clamp-3",
  className,
}: ExpandableTextProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const pRef = useRef<HTMLParagraphElement>(null);
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
          {expanded ? t("common.collapse") : t("common.seeMore")}
        </button>
      )}
    </div>
  );
}
