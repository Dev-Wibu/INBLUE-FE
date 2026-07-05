# DESIGN.md — Inblue Admin Dashboard

## Overview

Đây là tài liệu ghi lại hệ thống thiết kế thực tế của dự án **Inblue** (Admin Dashboard).
Tài liệu này được duy trì để agent có thể nắm ngay context mà không cần đọc lại toàn bộ codebase.

---

## Color System

Dự án dùng **shadcn/ui** với Tailwind CSS. Dark mode được áp dụng toàn bộ thông qua class `dark:`.

| Role                   | Light                  | Dark                    |
| ---------------------- | ---------------------- | ----------------------- |
| Background (page)      | `bg-slate-50`          | `dark:bg-slate-950`     |
| Surface (toolbar/card) | `bg-white`             | `dark:bg-slate-900`     |
| Border                 | `border-slate-200`     | `dark:border-slate-800` |
| Primary accent         | `indigo-600`           | `indigo-400`            |
| Success                | `emerald-600`          | `emerald-500`           |
| Warning                | `amber-500`            | `amber-400`             |
| Destructive            | `rose-600` / `red-600` | `red-500`               |

---

## Admin Page Layout Pattern

Tất cả Admin pages đều dùng **full-bleed layout** — mở rộng ra khỏi padding của container cha để chiếm toàn bộ chiều cao màn hình.

### Full-bleed wrapper (bắt buộc)

```jsx
<div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
```

- `p-4` ở mobile, `p-6` ở md, `p-8` ở lg → cần dùng `-m` tương ứng để bù.
- Áp dụng cho list mode, create mode, edit mode, detail mode.

### Toolbar (fixed height, border-bottom)

```jsx
<div className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
```

- Toolbar chứa: Search input, filter selects, reload button, primary action button.
- Không dùng card. Không dùng padding nội bộ to.

### Content area (scrollable)

```jsx
<div className="flex-1 overflow-auto">
```

- Table nằm thẳng trong content area, không có card bao ngoài.
- Pagination nằm cuối content area với `px-4 pb-4 sm:px-6 sm:pb-6`.

### Detail / Create / Edit view

Khi chuyển sang view chi tiết hoặc form tạo/sửa, dùng cùng full-bleed wrapper:

```jsx
<div className="-m-4 flex h-[calc(100%+32px)] flex-col bg-slate-50 md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)] dark:bg-slate-950">
  {/* Toolbar with back button + title */}
  <div className="flex flex-none items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
    <button className="flex h-9 w-9 items-center justify-center rounded-lg border ...">
      <ChevronLeft className="h-5 w-5" />
    </button>
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Page Title</h2>
  </div>
  {/* Scrollable content */}
  <div className="flex-1 overflow-auto">...</div>
</div>
```

### Two-column layout (e.g. Company Management)

```jsx
<div className="-m-4 flex h-[calc(100%+32px)] overflow-hidden md:-m-6 md:h-[calc(100%+48px)] lg:-m-8 lg:h-[calc(100%+64px)]">
  <Sidebar className="w-72 flex-none border-r ..." />
  <main className="flex flex-1 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
    ...
  </main>
</div>
```

---

## Table Pattern

Dùng shadcn/ui `<Table>` components.

```jsx
<div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>...</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell>...</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

- KHÔNG dùng custom div grid table.
- Row actions dùng `<DropdownMenu>` với `MoreHorizontal` icon trigger (KHÔNG dùng inline hover-only buttons).

---

## Pagination Pattern

```jsx
<div className="px-4 pb-4 sm:px-6 sm:pb-6">
  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
    <span className="text-xs font-medium text-slate-500">Hiển thị X / Y kết quả</span>
    <PaginationControl pagination={pagination} ... />
  </div>
</div>
```

---

## Exceptions (KHÔNG áp dụng full-bleed)

| Page                                                 | Lý do                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Công ty** (`CompanyManagement`)                    | Dùng two-column layout với sidebar dọc. Đã được chuẩn hóa sang full-bleed two-column. |
| **Mẫu quy trình** (`InterviewTemplateManagement`)    | Layout đặc biệt, có builder step-by-step phức tạp.                                    |
| **Code Review Builder** (`CodeReviewProblemBuilder`) | Editor IDE-like, full height, đã bao bởi full-bleed wrapper từ parent page.           |

---

## Component Vocabulary

- **Back button**: `<button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 ...">` với ChevronLeft/ArrowLeft icon.
- **Primary button**: `className="h-8 bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"`.
- **Reload button**: `<ReloadButton>` từ `@/components/shared`.
- **Status badge**: `<StatusBadge>` từ `@/components/shared/StatusBadge`.
- **Spinner**: `<SpinnerBlock size="sm" />` từ `@/components/ui/spinner`.

---

## Rules

1. **KHÔNG dùng stat/metric card grid** ở đầu trang list (ví dụ: "Tổng đánh giá / Nháp / Đã publish"). Đây là pattern bị bỏ.
2. **KHÔNG dùng layout toggle** (table vs grid view) — tất cả dùng table.
3. **KHÔNG dùng card bao ngoài toàn bộ page** (`rounded-2xl border shadow-sm`).
4. **KHÔNG dùng `p-6` ở top-level container** — dùng full-bleed thay thế.
5. Tabs navigation phụ bên trong content area (không phải tabs chính điều hướng sidebar) cần được xem xét bỏ để đồng bộ.
