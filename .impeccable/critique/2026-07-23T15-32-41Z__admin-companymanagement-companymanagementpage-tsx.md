---
target: /admin/companies
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-07-23T15-32-41Z
slug: admin-companymanagement-companymanagementpage-tsx
---

### Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                |
| --------- | ------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3/4       | Skeletons missing during initial load query                                              |
| 2         | Match System / Real World       | 3/4       | Good domain terminology, minor English/Vietnamese mix                                    |
| 3         | User Control and Freedom        | 2/4       | Dead-end "Feature under development" edit buttons; missing breadcrumb path in drill-down |
| 4         | Consistency and Standards       | 2/4       | Card grid used instead of standard `<Table>`; outer padding breaks full-bleed rule       |
| 5         | Error Prevention                | 3/4       | Delete modal present, but status toggle lacks optimistic rollback                        |
| 6         | Recognition Rather Than Recall  | 3/4       | Logos assist recognition, but search query resets on tab switch                          |
| 7         | Flexibility and Efficiency      | 1/4       | Missing keyboard shortcuts (`/` search, `Esc` back), batch actions, or column sorting    |
| 8         | Aesthetic and Minimalist Design | 2/4       | Saturated indigo accents, card hover translateY animation, over-rounded 2xl cards        |
| 9         | Error Recovery                  | 2/4       | Generic "Unable to load company list" toast messages                                     |
| 10        | Help and Documentation          | 2/4       | Minimal context on empty states                                                          |
| **Total** |                                 | **23/40** | **Acceptable (Significant improvements needed)**                                         |

### Anti-Patterns Verdict

**LLM assessment**: The current interface suffers from SaaS container clichés and card-grid reflex. Instead of using the standardized full-bleed data table specified in `DESIGN.md`, `CompanyGridTab` wraps companies in `rounded-2xl` cards with floating hover-action buttons (`absolute top-2 right-2 opacity-0 group-hover:opacity-100`) and bouncy `hover:-translate-y-1 hover:shadow-md` transforms. Furthermore, the search toolbar and top header introduce container padding (`p-4 md:p-6 lg:p-8`) that breaks full-bleed grid edges.

**Deterministic scan**: Automated detector (`detect.mjs`) flagged 2 `ai-color-palette` warning findings in `CompanyGridTab.tsx` (lines 323) due to default indigo text hover classes (`text-indigo-600` / `text-indigo-400` on titles).

**Visual overlays**: Skipped (browser sub-agent visualization was not executed in single-context mode).

### Overall Impression

The page is functional for basic company creation and JD viewing, but it violates several core design guidelines of the project repository (`DESIGN.md` & `AGENTS.md`). Using card grids instead of a uniform `<Table>` breaks navigation harmony across the admin section, and non-functional edit buttons create UX friction.

### What's Working

1. **Clear Drill-down Hierarchy**: Drilling into a company cleanly context-switches to that company's JDs with an explicit back button.
2. **Standardized Creation Dialogs**: `CompanyFormDialog` and `JobDescriptionFormDialog` handle form state cleanly with proper loading spinners.
3. **i18n Coverage**: Most UI strings use `t('adminCompanymanagement...')` key translations properly.

### Priority Issues

- **[P1] Non-standard Card Grid Layout**: `CompanyGridTab.tsx` uses a 4-column card grid with `p-4 md:p-6 lg:p-8` container padding.
  - **Why it matters**: Violates `DESIGN.md` rules ("KHÔNG dùng card grid view - tất cả dùng table; KHÔNG dùng p-6 ở top-level container").
  - **Fix**: Convert company list to a full-bleed `CompanyTable` using shadcn `<Table>` with `#ID`, `Logo + Name`, `Status`, `JDs Count`, `Created At`, and row action dropdowns.
  - **Suggested command**: `$impeccable layout`

- **[P1] Dead-End Edit Trigger & Incomplete Actions**: Clicking "Edit" on a JD detail view fires a generic toast `Tính năng đang phát triển`.
  - **Why it matters**: Misleads users into expecting an edit form, degrading trust in the admin tool.
  - **Fix**: Wire `JobDescriptionFormDialog` into edit mode or disable/hide the edit button until implemented.
  - **Suggested command**: `$impeccable harden`

- **[P2] Over-decorated Card Aesthetics & AI Palette**: Hover effects (`hover:-translate-y-1 hover:shadow-md`), `rounded-2xl` corners, and indigo text hover triggers read as unpolished templates.
  - **Why it matters**: Product UI requires restrained, quiet affordances where tool design stays out of the user's way.
  - **Fix**: Standardize borders, reduce border-radius to `rounded-lg`, and use subtle slate/zinc hover states.
  - **Suggested command**: `$impeccable quieter`

- **[P3] Lack of Keyboard Accelerators & Table Filters**: Search input requires mouse click; no `Esc` hotkey to exit company drill-down view.
  - **Why it matters**: Power users (admins) lose efficiency navigating between companies and JDs.
  - **Fix**: Add `/` keyboard shortcut for search focus and `Esc` key handler for back action.
  - **Suggested command**: `$impeccable polish`

### Persona Red Flags

- **Alex (Power User)**: Cannot quickly filter companies by status (Active/Inactive) or sort by JD counts. Navigating in and out of company details requires mouse clicks with zero keyboard shortcuts.
- **Jordan (First-Timer)**: Confusion when clicking "Chỉnh sửa" on a JD result displays a "Feature under development" toast instead of opening an edit modal.
- **Riley (Stress Tester)**: Search query state is reset when switching tabs ("companies" vs "jds"), and URL query string does not persist selected tab or company ID.

### Minor Observations

- The header icon box uses `indigo-50` background while other admin headers use slate neutrals.
- The company logo placeholder shows a plain building icon without fallbacks for broken image URLs.

### Questions to Consider

- Should companies be manageable directly within a standardized full-bleed table alongside the JD tab?
- Should the company drill-down view update the URL search params (`/admin/companies?companyId=123`) so admins can bookmark or deep-link to a specific company?
