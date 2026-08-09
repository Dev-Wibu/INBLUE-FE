/**
 * Tiny helpers reused by mentor list page hero blocks. Kept as a
 * component-only file so the hero file can stay Fast-Refresh-clean.
 */

import type { ReactNode } from "react";

/** Two-line spotlight used inside `<MentorCommandHero>` right slot. */
export function SpotlightBlock({
  primary,
  secondary,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <>
      <p className="relative truncate text-sm font-semibold tracking-[-0.01em] text-white">
        {primary}
      </p>
      {secondary && <p className="relative truncate text-xs text-slate-400">{secondary}</p>}
    </>
  );
}
