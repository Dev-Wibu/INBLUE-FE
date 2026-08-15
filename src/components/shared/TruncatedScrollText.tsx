import { useEffect, useRef, useState } from "react";

export interface TruncatedScrollTextProps {
  text: string;
  className?: string;
}

export function TruncatedScrollText({ text, className }: TruncatedScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (!containerRef.current || !textRef.current) return;
      const overflow = textRef.current.scrollWidth - containerRef.current.clientWidth;
      setScrollOffset(overflow > 0 ? overflow + 16 : 0);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [text]);

  const isOverflowing = scrollOffset > 0;
  const durationMs = Math.max(1200, Math.round(scrollOffset * 10));

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full overflow-hidden">
      <div
        className="inline-block whitespace-nowrap transition-transform ease-linear"
        style={{
          transform:
            isHovered && isOverflowing ? `translateX(-${scrollOffset}px)` : "translateX(0px)",
          transitionDuration: isHovered && isOverflowing ? `${durationMs}ms` : "250ms",
        }}>
        <span
          ref={textRef}
          className={`${className ?? "text-sm font-bold text-slate-900 dark:text-slate-100"} ${
            isOverflowing ? "inline-block" : "block truncate"
          }`}>
          {text}
        </span>
      </div>
    </div>
  );
}
