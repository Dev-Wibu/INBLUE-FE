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

## Table Pattern (Khảo thí & Đào tạo Standard)

Dùng shadcn/ui `<Table>` components theo chuẩn giao diện của **Khảo thí & Đào tạo** (`QuestionBankTable`, `CodingProblemTable`, `CodeReviewProblemTable`).

```jsx
<div className="border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
  <Table>
    <TableHeader>
      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
        <TableHead className="w-[80px] pl-6 font-medium text-slate-500">ID</TableHead>
        <TableHead className="min-w-[400px] font-medium text-slate-500">
          Nội dung / Tiêu đề
        </TableHead>
        <TableHead className="w-[150px] font-medium text-slate-500">Danh mục</TableHead>
        <TableHead className="w-[110px] font-medium text-slate-500">Độ khó</TableHead>
        <TableHead className="w-[100px] text-center font-medium text-slate-500">Bật/Tắt</TableHead>
        <TableHead className="w-[130px] font-medium text-slate-500">Ngày tạo</TableHead>
        <TableHead className="w-[130px] pr-6 font-medium text-slate-500">Cập nhật</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
        <TableCell className="pl-6 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
          #123
        </TableCell>
        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
          Tiêu đề bài tập
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center rounded-md bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Java
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
            Easy
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Switch className="shadow-sm data-[state=checked]:bg-emerald-500" />
        </TableCell>
        <TableCell className="text-xs font-medium text-slate-600 dark:text-slate-300">
          01/01/2026
        </TableCell>
        <TableCell className="pr-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          01/01/2026
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

**Quy tắc thiết kế Bảng (Table Rules):**

1. **Container**: Chỉ sử dụng `border-y border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950` (không bọc trong card bo góc rounded-xl hay p-6).
2. **TableHeader**: Dùng `bg-slate-50/50 hover:bg-slate-50/50 dark:bg-slate-900/50 dark:hover:bg-slate-900/50` với chữ `font-medium text-slate-500`. Cột đầu có `pl-6`, cột cuối có `pr-6`.
3. **TableRow**: Dùng `cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/80`.
4. **Cột ID**: Định dạng `font-mono text-xs font-medium text-slate-500 dark:text-slate-400` kèm dấu `#`.
5. **Cột Danh mục**: Dùng Badge pill mỏng `bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-xs`.
6. **Cột Độ khó**: Dùng chấm tròn `Circle` icon `h-2.5 w-2.5 fill-...` màu tương ứng (Easy: Emerald, Medium: Amber, Hard: Rose).
7. **Cột Công tắc Status**: Dùng `<Switch className="data-[state=checked]:bg-emerald-500" />`.
8. **Đồng bộ Chiều cao Hàng**: Đảm bảo chiều cao hàng (row height) giữa các bảng trong cùng phân nhóm (như Ngân hàng câu hỏi, Vòng Coding, Code Review) phải đồng đều 100% để trải nghiệm chuyển tab mượt mà.
9. **Actions**: Hàng có thể click trực tiếp (`onClick={() => onEdit(item)}`), hoặc dùng `<DropdownMenu>` với `MoreHorizontal` trigger.

---

## Pagination & Table Layout Pattern

**Quy tắc:**

1. Container của Table KHÔNG có margin bottom, chỉ dùng `border-y border-slate-200 shadow-sm`.
2. Không đặt các hàng đếm số lượng (ví dụ: "10 bài tập - 8 đang hoạt động") vào bên trong Table.
3. Phần hiển thị kết quả (e.g. `Hiển thị X/Y kết quả`) PHẢI được đặt ở TRÊN table (thường bọc trong `div.mb-3`), và chỉ hiển thị khi có bộ lọc active.
4. `PaginationControl` PHẢI đặt ngay dưới table container và dùng `border-b border-slate-200`. Không đặt text "Hiển thị X/Y kết quả" vào trong thẻ div này.

```jsx
{/* Phần hiển thị đếm số lượng (Chỉ hiện khi có filter) */}
{(searchQuery || statusFilter !== "ALL") && (
  <div className="mb-3 flex items-center gap-2 px-6">
    <span className="text-xs text-slate-500">
      Hiển thị <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> / <strong>{totalData.length}</strong> kết quả
    </span>
  </div>
)}

{/* Bảng dữ liệu */}
<div>
  <TableComponent data={pageData} />
</div>

{/* Thanh phân trang ngay dưới bảng */}
{filteredData.length > 0 && (
  <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-950">
    <PaginationControl pagination={pagination} ... />
  </div>
)}
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
