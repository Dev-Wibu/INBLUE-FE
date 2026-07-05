# System Rules for Inblue-FE

## UI/UX Design & Implementation (Impeccable Enforcement)

Whenever you are asked to create, modify, or interact with ANY Frontend code (including UI components, pages, layout, styling, or CSS) in this workspace, you MUST:

1. Immediately read `.agents/skills/impeccable/SKILL.md` before taking any action.
2. NOT skip reading any of the required `reference/*.md` files (such as `layout.md`, `colorize.md`, `interaction-design.md`, `craft.md`, `shape.md`) as mandated by the skill's flow.
3. Strictly execute the Impeccable instructions step-by-step from the local package installed in this repository, without relying solely on your pre-trained knowledge or memory.

## Standard UI Patterns

### Table Components

Always use shadcn/ui <Table> components (Table, TableHeader, TableBody, TableRow, TableCell, TableHead) instead of custom grid div tables. For row actions, ALWAYS use a <DropdownMenu> (with a MoreHorizontal icon trigger) instead of inline hover-only buttons (opacity-0) to ensure accessibility, touch-friendliness, and UI consistency.
