"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import { Minus, Plus } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface ScoreInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accent colour token – defaults to indigo palette */
  accent?: "indigo" | "emerald" | "amber" | "rose";
  className?: string;
  disabled?: boolean;
}

const ACCENT_MAP = {
  indigo: {
    track: "bg-indigo-500",
    thumb: "border-indigo-500 focus-visible:ring-indigo-500/40 hover:ring-indigo-500/30",
    badge:
      "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800",
    btn: "hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400",
  },
  emerald: {
    track: "bg-emerald-500",
    thumb: "border-emerald-500 focus-visible:ring-emerald-500/40 hover:ring-emerald-500/30",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800",
    btn: "hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400",
  },
  amber: {
    track: "bg-amber-500",
    thumb: "border-amber-500 focus-visible:ring-amber-500/40 hover:ring-amber-500/30",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
    btn: "hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-400",
  },
  rose: {
    track: "bg-rose-500",
    thumb: "border-rose-500 focus-visible:ring-rose-500/40 hover:ring-rose-500/30",
    badge:
      "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-800",
    btn: "hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400",
  },
};

export function ScoreInput({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  accent = "indigo",
  className,
  disabled = false,
}: ScoreInputProps) {
  const [editing, setEditing] = React.useState(false);
  const [raw, setRaw] = React.useState(String(value));
  const inputRef = React.useRef<HTMLInputElement>(null);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const commit = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n)) onChange(clamp(n));
    else onChange(value);
    setEditing(false);
  };

  const stepUp = () => !disabled && onChange(clamp(value + step));
  const stepDown = () => !disabled && onChange(clamp(value - step));

  // sync raw when value changes externally (e.g. max changes)
  React.useEffect(() => {
    if (!editing) setRaw(String(value));
  }, [value, editing]);

  // auto-focus inline input when editing starts
  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const colors = ACCENT_MAP[accent];
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Slider row */}
      <div className="flex items-center gap-3">
        {/* Minus button */}
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={stepDown}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors dark:border-slate-700 dark:text-slate-400",
            "disabled:cursor-not-allowed disabled:opacity-30",
            colors.btn
          )}>
          <Minus className="h-3.5 w-3.5" />
        </button>

        {/* Radix Slider */}
        <SliderPrimitive.Root
          min={min}
          max={max}
          step={step}
          value={[value]}
          disabled={disabled}
          onValueChange={([v]) => onChange(v)}
          className="relative flex flex-1 touch-none items-center select-none">
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <SliderPrimitive.Range className={cn("absolute h-full rounded-full", colors.track)} />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block h-4 w-4 rounded-full border-2 bg-white shadow-md transition-[box-shadow]",
              "focus-visible:ring-4 focus-visible:outline-none",
              "hover:ring-4",
              "disabled:pointer-events-none disabled:opacity-50",
              colors.thumb
            )}
          />
        </SliderPrimitive.Root>

        {/* Plus button */}
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={stepUp}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors dark:border-slate-700 dark:text-slate-400",
            "disabled:cursor-not-allowed disabled:opacity-30",
            colors.btn
          )}>
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Editable value badge */}
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={min}
            max={max}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onBlur={() => commit(raw)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(raw);
              if (e.key === "Escape") setEditing(false);
            }}
            className={cn(
              "h-9 w-16 rounded-lg border border-indigo-400 text-center text-sm font-bold tabular-nums",
              "bg-white text-slate-900 ring-2 ring-indigo-300 outline-none dark:bg-slate-900 dark:text-white",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            )}
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setRaw(String(value));
              setEditing(true);
            }}
            title="Nhấn để nhập thủ công"
            className={cn(
              "h-9 min-w-[3.5rem] rounded-lg px-3 text-center text-sm font-bold tabular-nums ring-1 transition-all",
              "focus-visible:ring-2 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-40",
              colors.badge
            )}>
            {value}
          </button>
        )}
      </div>

      {/* Progress bar label */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 tabular-nums">{min}</span>
        <div className="mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              colors.track,
              "opacity-30"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums">{max}</span>
      </div>
    </div>
  );
}
