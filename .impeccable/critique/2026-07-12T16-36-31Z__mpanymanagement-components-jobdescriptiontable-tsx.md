---
target: src/pages/Admin/CompanyManagement/components/JobDescriptionTable.tsx
total_score: 32
p0_count: 1
p1_count: 0
timestamp: 2026-07-12T16-36-31Z
slug: mpanymanagement-components-jobdescriptiontable-tsx
---

### Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                   |
| --------- | ------------------------------- | --------- | --------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3/4       | Status and badges clear, but missing loading states on inline status switch |
| 2         | Match System / Real World       | 4/4       | Good use of formatting for currency and dates                               |
| 3         | User Control and Freedom        | 1/4       | **Critical:** `onEdit` and `onDelete` are completely missing from the UI    |
| 4         | Consistency and Standards       | 4/4       | Adheres to shadcn/ui table and dropdown patterns                            |
| 5         | Error Prevention                | 3/4       | Switch component clearly shows binary state                                 |
| 6         | Recognition Rather Than Recall  | 4/4       | Headers and data are clearly labeled                                        |
| 7         | Flexibility and Efficiency      | 3/4       | Sorting supported, but lacks bulk actions                                   |
| 8         | Aesthetic and Minimalist Design | 3/4       | Clean, but empty state is slightly generic                                  |
| 9         | Error Recovery                  | 4/4       | Graceful fallbacks for missing data (`—`)                                   |
| 10        | Help and Documentation          | 3/4       | Self-explanatory interface                                                  |
| **Total** |                                 | **32/40** | **Good**                                                                    |

### Anti-Patterns Verdict

**LLM Assessment**: The design is structurally sound and follows shadcn/ui conventions well, adhering exactly to the workspace rule of using standard Table components. However, it exhibits a classic AI slop error in its logic: it defines and accepts `onEdit` and `onDelete` props but entirely forgets to render them into the DropdownMenu. The empty state also uses the standard AI "muted circle with an icon inside a rounded-2xl dashed/bordered box" trope, which is acceptable but recognizable.

**Deterministic scan**: The automated detector found 0 issues (clean scan).

### Overall Impression

A solid, clean data table that gets the presentation right (especially the complex salary formatting) but fails on core administrative functionality by omitting the edit and delete actions. The foundation is good, but it is currently broken for actual admin CRUD use.

### What's Working

1. **Robust Salary Formatting**: The `formatSalaryRange` function elegantly handles the permutations of missing min, missing max, and non-VND currencies.
2. **Proper Component Usage**: Follows the workspace rule by using the `<Table>` component and a `<DropdownMenu>` for row actions instead of custom divs or hover-only buttons.
3. **Graceful Fallbacks**: Uses `|| "—"` for missing data (title, company, level), preventing awkward empty cells.

### Priority Issues

1. **[P0] Missing Edit/Delete Actions**
   - **Why it matters**: `onEdit` and `onDelete` are passed as props but never rendered in the `DropdownMenu`. Admins literally cannot edit or delete job descriptions from this view. _(Note: The user explicitly requested removing the Edit button in the previous turn, so this might be intentional, but Delete should still be present if applicable)._
   - **Fix**: Re-evaluate if Edit/Delete should be available. If so, add `<DropdownMenuItem>` entries for them in the row's `DropdownMenuContent`. If not, remove the unused props.
   - **Suggested command**: `$impeccable harden`

2. **[P2] Ambiguous Click Target on Switch**
   - **Why it matters**: The Switch is placed directly in the table cell. While `e.stopPropagation()` is used, having an interactive toggle inside a row that is _also_ interactive (clicking the row navigates to details) can cause accidental misclicks.
   - **Fix**: Ensure sufficient padding around the switch, and consider if the entire row needs to be clickable when there are direct inline mutation controls.
   - **Suggested command**: `$impeccable layout`

3. **[P2] Accessibility on Status Switch**
   - **Why it matters**: The switch has no screen-reader specific label associating it with the job title.
   - **Fix**: Add an `aria-label` to the `<Switch>` indicating which job's status is being toggled.
   - **Suggested command**: `$impeccable audit`

### Persona Red Flags

**Alex (Power User)**: Will immediately look for the edit/delete controls. Finding none, will try clicking the row, which only opens a read-only detail view. Will be blocked entirely. Also lacks bulk-selection checkboxes for deleting multiple old JDs at once.

**Sam (Accessibility-Dependent User)**: The Switch for toggling status doesn't appear to have an `aria-label` specifying _which_ job it toggles, making it ambiguous for screen reader users tabbing through the table.

### Minor Observations

- The row hover state uses `hover:bg-slate-50/80`. Make sure it contrasts well in both dark and light modes.
- `job.company?.name || job.companyName` shows a TypeScript workaround. The types should ideally be fixed in `JobDescription` rather than suppressed.
- ID column uses `w-16`, which might be too tight if IDs grow beyond 4 digits.

### Questions to Consider

- Should changing a job status from OPEN to CLOSED require a confirmation modal, or is optimistic inline toggling safe enough?
- Do we need a bulk-action column (checkboxes) so admins don't have to delete expired jobs one by one?
- Is the click-the-entire-row-to-view pattern competing too much with the inline status switch?
