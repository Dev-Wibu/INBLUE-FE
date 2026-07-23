# System Rules for Inblue-FE

## UI/UX Design & Implementation (Impeccable Enforcement)

Whenever you are asked to create, modify, or interact with ANY Frontend code (including UI components, pages, layout, styling, or CSS) in this workspace, you MUST:

1. Immediately read `.agents/skills/impeccable/SKILL.md` before taking any action.
2. NOT skip reading any of the required `reference/*.md` files (such as `layout.md`, `colorize.md`, `interaction-design.md`, `craft.md`, `shape.md`) as mandated by the skill's flow.
3. Strictly execute the Impeccable instructions step-by-step from the local package installed in this repository, without relying solely on your pre-trained knowledge or memory.

## Standard UI Patterns

### Table Components

Always use shadcn/ui `<Table>` components (Table, TableHeader, TableBody, TableRow, TableCell, TableHead) following the **Khảo thí & Đào tạo Standard** defined in `DESIGN.md`.

- Container: `border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950`
- TableHeader: `bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50` with `font-medium text-slate-500` (ID column `pl-6`, last column `pr-6`).
- TableRow: `group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80`.
- ID Column: `#ID` in `font-mono text-xs font-medium text-slate-500 dark:text-slate-400` with `pl-6`.
- Difficulty: Colored `Circle` icon (`h-2.5 w-2.5 fill-...`) with label.
- Category: Badge pill `bg-slate-100/80 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-medium`.
- Status: `<Switch className="data-[state=checked]:bg-emerald-500" />` with `onClick={(e) => e.stopPropagation()}`.
- Row Height Alignment: Row heights across tables in the same tab set MUST be identical for seamless tab transitions (use dummy hidden spacers if a table has single-line text while other tabs have 2-line detail cells).
- Row actions: Click row directly or use a `<DropdownMenu>` with `MoreHorizontal` icon trigger.

**Pagination & Table Layout Standard:**

- The Table container should only have `border-y border-slate-200 shadow-sm`. Do not put any custom footer rows (like "10 bài tập" counts) inside the table.
- Result counts (e.g. `Hiển thị X/Y kết quả`) MUST be placed ABOVE the table (usually inside a `div.mb-3`), and ONLY displayed when a filter is active or required.
- The `PaginationControl` MUST be placed immediately AFTER the table container. It must be wrapped in `<div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">`. Do not include result counts inside this pagination bar.

### Single Unified Header & Nested Page Breadcrumb Standard

All nested pages and drill-down views (Root -> Parent Entity -> Child Detail) MUST adhere to the following header rules:

1. **Single Header Only**: NEVER render stacked or duplicated inner headers inside sub-components (e.g. `JobDescriptionDetailView`, `CompanyGridTab`). Only 1 single header is allowed at the top of the parent page.
2. **Sleek 1-Line Inline Breadcrumb & Title**:
   - Parent nodes (e.g., `Quản lý công ty`, `Company Name`) MUST be clickable link buttons (`text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400`).
   - Current active node (e.g., `JD Title`) MUST sit at the end of the line as the main bold heading (`text-base font-bold text-slate-900 dark:text-white`).
   - NEVER duplicate the active item title across multiple vertical lines. All breadcrumb elements, active title, and status badges MUST sit on a single horizontal row (`flex flex-wrap items-center gap-2 min-w-0`).
3. **Header Right Actions & Tab Switchers**:
   - Sub-view tab switchers (e.g., `Quy trình & Thông tin JD` vs `Đơn ứng tuyển (X)`) MUST be placed directly inside the right side of the main top header alongside action buttons (`Chỉnh sửa`, `Thêm JD`), eliminating secondary sub-header bars completely.

## Strict Inblue-FE Development Rules

When modifying or creating code in this workspace, you MUST strictly obey:

1. **API Client:** NEVER use Axios. ALWAYS use `$api` (openapi-fetch) for API calls.
2. **i18n:** NEVER hardcode user-facing strings in UI components. ALWAYS use `t('key')`. For a list of UNTRANSLATABLE terms, you MUST read `.agents/references/i18n-rules.md`.
3. **No Enums:** TypeScript `enum` and `namespace` are banned. Use Union Types or plain Objects.
4. **No Zombie Pages:** Every `<Route>` must have a reachable UI entry point.

## Architecture & Codebase Reference

- For deep architectural rules, custom hooks, shared components, and anti-patterns, you MUST read: `.agents/references/rules.md`
