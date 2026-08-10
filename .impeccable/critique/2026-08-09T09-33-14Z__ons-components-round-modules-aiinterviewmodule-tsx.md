---
timestamp: 2026-08-09T09-33-14Z
slug: ons-components-round-modules-aiinterviewmodule-tsx
---
Method: dual-agent (A: e62944bd-e721-4a16-866c-20261df6a9b2 · B: 5acabb81-c15c-4c31-b4a4-4d005c12ff3a)

# Design Health Score

| # | Heuristic | Score | Key Issue / Observation |
|---|---|---|---|
| 1 | Visibility of System Status | 3/4 | Filter pills display question counts (`ALL (X)`, `HIGH (Y)`, `IMPROVE (Z)`). State toggles between "Thu gọn tất cả" and "Mở tất cả". |
| 2 | Match Between System and Real World | 3/4 | Clear Vietnamese domain terms ("Chủ đề phỏng vấn", "Từ khóa trọng tâm", "Dàn ý trả lời"). Threaded follow-ups mimic natural interview flow. |
| 3 | User Control and Freedom | 2/4 | Topic clusters can be expanded/collapsed individually or in bulk. Search input lacks a 1-click clear ("X") button. |
| 4 | Consistency and Standards | 2/4 | WAI-ARIA violation: Clickable `div` wrapping cluster header contains nested `<button>`. Scores use mixed representations across tabs. |
| 5 | Error Prevention | 3/4 | Defensive string parsing (`parseSuggestionText`) with fallback defaults (`noDataYet`). |
| 6 | Recognition Rather Than Recall | 3/4 | Highlighted keyword tags and score badges enable quick visual scanning. |
| 7 | Flexibility and Efficiency of Use | 2/4 | Lacks keyboard navigation (e.g. `J`/`K` to switch clusters, `/` to focus search). |
| 8 | Aesthetic and Minimalist Design | 1/4 | High visual noise. Heavy nesting of colored border cards, badge overload, icon clutter (Mic, Bot, Lightbulb, Tag, Sparkles, ShieldAlert). |
| 9 | Help Users Recognize & Recover from Errors | 3/4 | Behavioral warnings prominently displayed with red alert card. Clear empty state for zero search results. |
| 10 | Help and Documentation | 2/4 | "Dàn ý trả lời" and "Senior Tip" offer great guidance, but terms like "BLUEPRINT" lack contextual tooltips for first-timers. |
| **Total** | | **24/40** | **Acceptable (Significant improvements needed before release)** |

---

# Anti-Patterns Verdict

- **LLM Assessment**: High risk of AI Slop and container proliferation. The tab relies heavily on nested card wrappers (`Card` -> `rounded-2xl border` -> `rounded-xl border`). It uses 5 competing background color tints simultaneously (Indigo, Purple, Emerald, Amber, Rose), creating visual noise. Defaulting all clusters to expanded (`allExpanded = true`) creates a massive wall of cards on initial load.
- **Deterministic Scan**: 100 total occurrences across 7 issue categories:
  - 17 missing focus ring / keyboard navigation bugs (`focus-visible:ring-2`)
  - 12 WAI-ARIA & semantic role issues (nested click targets, missing `role="tab"`)
  - 13 WCAG low contrast violations (`text-slate-400`/`text-slate-500` on light/dark bg)
  - 28 non-standard micro typography tokens (`text-[10px]`, `text-[11px]`) and hardcoded layout dimensions
  - 21 inconsistent padding scale tokens (`p-3.5`, `py-2.5`, `px-3.5`)
  - 5 text truncation & overflow risks missing `title` tooltips
  - 4 suboptimal empty states without clear CTAs or retry triggers

---

# Overall Impression

The Questions & Answers tab has a strong data architecture foundation (topic clustering + AI suggestion parsing), but suffers from visual clutter, nested container anti-patterns, and severe WAI-ARIA accessibility flaws (nested buttons inside clickable divs). Stripping card-in-card borders, refining color accents, and fixing keyboard/ARIA semantics will dramatically elevate this tab to a sleek, executive-level interview evaluation workspace.

---

# What's Working

1. **Topic Clustering Architecture**: Intelligently groups main benchmark questions with their follow-up questions into unified topic clusters with average score calculations.
2. **Structured Suggestion Extraction**: Regex parsing (`parseSuggestionText`) successfully breaks down dense raw AI text into actionable Keywords, Answer Structures, and Senior Tips.
3. **Comprehensive Search & Discovery**: Multi-field search filtering across questions, candidate answers, AI feedback, and suggestions.

---

# Priority Issues

### 🔴 [P1] Nested Interactive Controls (WAI-ARIA Accessibility Violation)
- **What**: The cluster header `div` (line 1082) is styled `cursor-pointer` with `onClick` while nesting an inner `<button>` toggle (line 1115).
- **Why it matters**: HTML & WAI-ARIA violation (nested interactive elements). Breaks keyboard focus navigation and confuses screen readers.
- **Fix**: Refactor the outer cluster header wrapper into a single semantic button with `aria-expanded={isExpanded}`.
- **Suggested Command**: `$impeccable audit` / `$impeccable harden`

### 🔴 [P1] Card-in-Card Anti-Pattern & Rainbow Color Overload
- **What**: Excessive nested cards (`Card` -> `rounded-2xl border` -> `rounded-xl border`) with 5 competing background color tints (Indigo, Purple, Emerald, Amber, Rose).
- **Why it matters**: Violates Impeccable UI rules ("Cards inside cards are always wrong"). Creates visual noise and AI slop feel.
- **Fix**: Strip nested card borders inside expanded cluster streams. Replace them with borderless vertical flow using subtle left-accent indicators or clean typographic headers (`font-mono text-xs uppercase text-slate-500`). Limit accent colors to Indigo (neutral/structure), Emerald (success/keywords), and Amber/Rose (improvements/warnings).
- **Suggested Command**: `$impeccable layout` / `$impeccable quieter`

### 🟡 [P2] Default State Cognitive Overload (`allExpanded = true`)
- **What**: All topic clusters default to expanded (`allExpanded = true`) on initial render.
- **Why it matters**: Forces users into immediate cognitive overload and long vertical scrolling instead of progressive disclosure.
- **Fix**: Set `allExpanded` default state to `false` (or auto-expand only cluster #1). Let candidates expand clusters as needed.
- **Suggested Command**: `$impeccable layout` / `$impeccable polish`

### 🟡 [P2] First-Timer Jargon Barrier ("BLUEPRINT" Filter)
- **What**: Filter button uses the raw system enum label `"BLUEPRINT"`.
- **Why it matters**: Jordan (first-timer) does not understand what "Blueprint" means relative to "Follow-up".
- **Fix**: Update translation key or label to `"Câu chính (JD)"` and add an info icon tooltip explaining "Benchmark questions generated directly from Job Description requirements".
- **Suggested Command**: `$impeccable clarify`

### 🟢 [P3] Search Input Usability (Missing Clear Button)
- **What**: Search input does not feature an instant clear (`X`) button when query text is typed.
- **Why it matters**: Power users (Alex) have to select-all or backspace to reset search queries.
- **Fix**: Add a clear icon button inside the right slot of the `Input` when `searchQuery.length > 0`.
- **Suggested Command**: `$impeccable polish`

---

# Persona Red Flags

- **Alex (Impatient Power User)**: No keyboard shortcuts (e.g., arrow keys or `J`/`K` to cycle clusters, `Space`/`Enter` to toggle expand, `/` for search focus). Forced manual scrolling through expanded cards.
- **Jordan (Confused First-Timer)**: Technical domain jargon ("BLUEPRINT" filter label) is unexplainable without prior knowledge or tooltips. Overwhelmed by simultaneous AI critique, structure steps, keywords, and tips.
- **Sam (Accessibility-Dependent User)**: **WAI-ARIA Violations.** The cluster header is a clickable `div` (`onClick={() => toggleExpandCluster()}`) containing an inner `<button type="button" aria-label="Toggle cluster details">`. Screen readers encounter nested interactive controls, breaking focus order and screen reader semantics.
- **Riley (Deliberate Stress Tester)**: Extremely long unstructured candidate answers or unformatted AI suggestions may break card boundaries or regex parsing in `parseSuggestionText`.

---

# Minor Observations

- Non-standard typography tokens (`text-[10px]`, `text-[11px]`) should be standardized to design system scale (`text-xs`).
- Non-standard padding scale tokens (`p-3.5`, `py-2.5`, `px-3.5`) should be aligned to standard Tailwind spacing.
- Missing `focus-visible:ring-2 focus-visible:ring-indigo-500` on interactive filter pills and kiosk cards.

---

# Questions to Consider

- "What if the Questions & Answers tab rendered as a clean, single-surface executive dialogue timeline instead of nested cards?"
- "What if topic clusters defaulted to collapsed so users can scan all topics in 3 seconds before diving deep?"
- "What if keyboard shortcuts (J/K/Slash) made cycling through interview questions feel as fast as Superhuman?"
