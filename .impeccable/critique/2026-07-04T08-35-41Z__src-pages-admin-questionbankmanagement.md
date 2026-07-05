---
target: màn hình quản lý Ngân hàng câu hỏi
total_score: 22
p0_count: 0
p1_count: 2
timestamp: 2026-07-04T08-35-41Z
slug: src-pages-admin-questionbankmanagement
---

Method: single-context (A single agent ran Assessment A and B due to efficient inline execution).

### Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                   |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Good empty state and loading spinners.                                                      |
| 2         | Match System / Real World       | 3         | Categories and difficulty tags match domain models well.                                    |
| 3         | User Control and Freedom        | 2         | Actions are hidden behind hover states, making them hard to discover.                       |
| 4         | Consistency and Standards       | 3         | Uses standard tabs and dialogs.                                                             |
| 5         | Error Prevention                | 2         | Form requires all fields but doesn't show inline validation before submit.                  |
| 6         | Recognition Rather Than Recall  | 1         | Hover-only actions require users to remember where buttons are.                             |
| 7         | Flexibility and Efficiency      | 1         | Card grid layout for a Question "Bank" is inefficient. Missing bulk actions and pagination. |
| 8         | Aesthetic and Minimalist Design | 2         | Cards are too tall, adding visual noise.                                                    |
| 9         | Error Recovery                  | 3         | Standard error toasts are present.                                                          |
| 10        | Help and Documentation          | 2         | No inline help for formatting options.                                                      |
| **Total** |                                 | **22/40** | **Acceptable**                                                                              |

### Anti-Patterns Verdict

The interface exhibits common AI-generated tells:

1. **The Card Trap**: Data that should be a dense, scannable table (a "Bank" of questions) is displayed as a grid of large cards.
2. **Hover-Only Actions**: Edit and Delete buttons are hidden on `opacity-0` and only appear on hover, which completely breaks accessibility and mobile touch support.
3. **Automated Detector Findings**: 6 instances of the `gray-on-color` anti-pattern (using `text-slate-500` or `text-slate-400` on tinted backgrounds like `bg-indigo-50` or `bg-rose-100`). This causes contrast issues and a washed-out appearance.

### Overall Impression

The page is functional and has a solid structure (Tabs for Questions and Categories), but the layout choice (Cards) is fundamentally flawed for managing a large dataset. The hidden hover actions make it feel like a prototype rather than a robust product.

### What's Working

- **Tab Structure**: Splitting Questions and Categories into separate tabs reduces immediate cognitive load.
- **Difficulty Badges**: The color-coded tags for EASY/MEDIUM/HARD are distinct and readable.

### Priority Issues

- **[P1] What**: Card Grid for Tabular Data
  **Why it matters**: A question bank usually contains hundreds of items. Cards limit the view to 4-8 items per screen, breaking scannability and making comparison impossible.
  **Fix**: Switch from a `grid-cols-4` card layout to a dense, responsive Data Table with columns for ID, Category, Level, and Question Text snippet.
  **Suggested command**: `$impeccable shape`

- **[P1] What**: Hidden Hover Actions
  **Why it matters**: `opacity-0 group-hover:opacity-100` on the Edit/Delete buttons makes them invisible to touch users and screen readers, violating WCAG.
  **Fix**: Make actions permanently visible, or place them in a standard dropdown menu (`...`) at the end of a table row.
  **Suggested command**: `$impeccable layout`

- **[P2] What**: Gray text on colored backgrounds
  **Why it matters**: `text-slate-500` on `bg-indigo-100` looks washed out and often fails contrast ratio tests.
  **Fix**: Use a darker shade of the background color (e.g., `text-indigo-800` on `bg-indigo-100`).
  **Suggested command**: `$impeccable colorize`

### Persona Red Flags

**Alex (Power User)**: Will be frustrated by the lack of pagination, bulk selection, and the inefficient card layout when managing hundreds of questions.
**Sam (Accessibility-Dependent User)**: Cannot see or interact with the Edit/Delete buttons because they are hidden behind hover states and likely lack keyboard focus order.

### Minor Observations

- The "No Data" empty state uses a generic search icon. An illustration or a clearer call-to-action would be better.
- No pagination logic is visible in the frontend, which will crash or lag the browser if thousands of questions are loaded at once.

### Questions to Consider

- Does a Question Bank really need to look like a Pinterest board (Cards), or should it feel like an Excel spreadsheet (Table) for power users?
- How will users manage this when there are 1,000+ questions?
