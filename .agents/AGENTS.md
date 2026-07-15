# System Rules for Inblue-FE

## UI/UX Design & Implementation (Impeccable Enforcement)

Whenever you are asked to create, modify, or interact with ANY Frontend code (including UI components, pages, layout, styling, or CSS) in this workspace, you MUST:

1. Immediately read `.agents/skills/impeccable/SKILL.md` before taking any action.
2. NOT skip reading any of the required `reference/*.md` files (such as `layout.md`, `colorize.md`, `interaction-design.md`, `craft.md`, `shape.md`) as mandated by the skill's flow.
3. Strictly execute the Impeccable instructions step-by-step from the local package installed in this repository, without relying solely on your pre-trained knowledge or memory.

## Standard UI Patterns

### Table Components

Always use shadcn/ui <Table> components (Table, TableHeader, TableBody, TableRow, TableCell, TableHead) instead of custom grid div tables. For row actions, ALWAYS use a <DropdownMenu> (with a MoreHorizontal icon trigger) instead of inline hover-only buttons (opacity-0) to ensure accessibility, touch-friendliness, and UI consistency.

**Pagination & Table Layout Standard:**

- The Table container should only have `border-y border-slate-200 shadow-sm`. Do not put any custom footer rows (like "10 bài tập" counts) inside the table.
- Result counts (e.g. `Hiển thị X/Y kết quả`) MUST be placed ABOVE the table (usually inside a `div.mb-3`), and ONLY displayed when a filter is active or required.
- The `PaginationControl` MUST be placed immediately AFTER the table container. It must be wrapped in `<div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">`. Do not include result counts inside this pagination bar.

## Strict Inblue-FE Development Rules

When modifying or creating code in this workspace, you MUST strictly obey:

1. **API Client:** NEVER use Axios. ALWAYS use `$api` (openapi-fetch) for API calls.
2. **i18n:** NEVER hardcode user-facing strings in UI components. ALWAYS use `t('key')`. For a list of UNTRANSLATABLE terms, you MUST read `.agents/references/i18n-rules.md`.
3. **No Enums:** TypeScript `enum` and `namespace` are banned. Use Union Types or plain Objects.
4. **No Zombie Pages:** Every `<Route>` must have a reachable UI entry point.

## Architecture & Codebase Reference

- For deep architectural rules, custom hooks, shared components, and anti-patterns, you MUST read: `.agents/references/rules.md`
