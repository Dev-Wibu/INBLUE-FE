# Kiểm Tra Chất Lượng Mã Nguồn (Code Quality Audit) — Các Vấn Đề Trọng Tâm

## 1. File rác, Code thừa, Import không sử dụng (Dead Code & Unused Files)

- **Mô tả chi tiết:** Đây là những đoạn mã hoặc tệp tin tồn tại trong source code nhưng hoàn toàn bị cô lập, không đóng góp vào luồng chạy thực tế của ứng dụng. Việc giữ lại chúng làm tăng dung lượng dự án, gây nhiễu loạn khi tìm kiếm và làm giảm tốc độ build.
- **Tiêu chí để AI nhận diện:**
  - File `.ts`, `.tsx`, `.js`, `.css` không được `import` ở bất kỳ file nào khác trong toàn bộ dự án (ngoại trừ các file config ở root, hoặc file entry point như `index.tsx`, `main.tsx`).
  - Các biến (variables), hàm (functions), hoặc component đã được khai báo/export nhưng không có lời gọi (call) nào tới chúng.
  - Những khối code lớn bị comment out (vô hiệu hóa bằng `//` hoặc `/* */`) thay vì bị xóa đi.
  - Các thư viện (packages) có trong `package.json` nhưng không được `import` ở bất kỳ đâu trong thư mục `src`.
  - Các file không còn được sử dụng nhưng vẫn tồn tại trong thư mục `src` (ví dụ: file test cũ, file component đã bị refactor bỏ đi nhưng chưa xóa, file trang edit info cũ,.v.v).
- **Phát hiện:** Quét cây phụ thuộc (dependency tree), phân tích AST (Abstract Syntax Tree), rà soát các khối code bị comment.
- **Các file cụ thể là:**

### Dead Code — Hook Files (Chỉ re-export từ barrel, không có consumer)

- **useApplication.ts** (`src/hooks/useApplication.ts`):
  - Code Snippet: `export function useApplication() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có file nào import. 100% dead code.

- **useCompany.ts** (`src/hooks/useCompany.ts`):
  - Code Snippet: `export function useCompany() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useFeatureUsageLogs.ts** (`src/hooks/useFeatureUsageLogs.ts`):
  - Code Snippet: `export function useFeatureUsageLogs() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useInterviewAnalysis.ts** (`src/hooks/useInterviewAnalysis.ts`):
  - Code Snippet: `export function useInterviewAnalysis() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useInterviewSession.ts** (`src/hooks/useInterviewSession.ts`):
  - Code Snippet: `export function useInterviewSession() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useJobDescription.ts** (`src/hooks/useJobDescription.ts`):
  - Code Snippet: `export function useJobDescription() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useRound.ts** (`src/hooks/useRound.ts`):
  - Code Snippet: `export function useRound() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

- **useMutationHandler.ts** (`src/hooks/useMutationHandler.ts`):
  - Code Snippet: `export function useMutationHandler() { ... }`
  - Exact Reason: Chỉ được re-export từ `hooks/index.ts`, không có consumer nào.

### Dead Code — Lib Files

- **transforms.ts** (`src/lib/transforms.ts`):
  - Code Snippet: `export function transformUserCreateRequest(...)`, `validateEmail(...)`, `extractRole(...)` — tổng cộng 10+ hàm
  - Exact Reason: Tất cả hàm export không được gọi ở bất kỳ đâu trong codebase. 100% dead code.

### Dead Code — Service Manager Files

- **round.manager.ts** (`src/services/round.manager.ts`):
  - Code Snippet: `class RoundManager { ... }`
  - Exact Reason: Chỉ được re-export từ `services/index.ts`, không có consumer nào.

- **interview-session.manager.ts** (`src/services/interview-session.manager.ts`):
  - Code Snippet: `class InterviewSessionManager { ... }`
  - Exact Reason: Chỉ được re-export từ `services/index.ts`. Hook `useInterviewSession` sử dụng `$api` trực tiếp.

### Dead Code — Unused Packages trong `package.json`

- **next-themes** (`package.json`):
  - Exact Reason: Không có import nào trong `src/`. Dự án sử dụng custom `ThemeToggle` + `themeStore` (Zustand).

- **yet-another-react-lightbox** (`package.json`):
  - Exact Reason: Không có import nào trong `src/`. Dự án có custom `MediaLightboxDialog` không dùng thư viện này.

### Commented-Out Code Blocks

- **PostManagementPage.tsx** (`src/pages/Admin/PostManagement/PostManagementPage.tsx`):
  - Code Snippet: `{/* Edit functionality temporarily disabled on BE ... <Button ... <PenSquare ... */}`
  - Exact Reason: Lines 359–372 (~14 dòng). Nút "Edit" bị comment do backend chưa hỗ trợ. Nên xóa hoặc thêm `// TODO`.

- **PostManagementPage.tsx** (`src/pages/Admin/PostManagement/PostManagementPage.tsx`):
  - Code Snippet: `{/* Edit functionality temporarily disabled on BE ... <Button ... */}`
  - Exact Reason: Lines 750–763 (~14 dòng). Nút "Edit" thứ hai bị comment trong view danh sách.

## 2. Vi phạm nguyên tắc DRY (Lặp code UI & Logic - Code Duplication)

- **Mô tả chi tiết:** Tình trạng "Copy-Paste Driven Development", nơi các đoạn code xử lý logic giống hệt nhau hoặc các cấu trúc UI tương tự nhau bị lặp lại ở nhiều file khác nhau thay vì được đóng gói thành các module có thể tái sử dụng. Điều này khiến việc bảo trì trở thành thảm họa vì khi cần sửa một lỗi, lập trình viên phải sửa ở hàng chục nơi khác nhau.
- **Tiêu chí để AI nhận diện:**
  - **Lặp Logic:** Các file khác nhau có cùng một chuỗi các hook `useState`, `useEffect` để fetch cùng một loại data, hoặc có chung các hàm format dữ liệu (ngày tháng, tiền tệ, validation form). Cần được gom thành Custom Hook hoặc Utils function.
  - **Lặp UI:** Các khối JSX (HTML) dài có cấu trúc thẻ lồng nhau giống hệt nhau (ví dụ: các thẻ Card, Button, Modal, Sidebar,.v.v) chỉ khác vài dòng text hoặc tham số. Cần được gom thành Shared Component.
- **Phát hiện:** Tìm kiếm các chuỗi mã nguồn trùng lặp (code clones), phân tích cấu trúc JSX tương đồng giữa các file component.
- **Các file/đoạn code cụ thể là:**

### DRY-01: Locale Resolution Lặp 15 lần

- **10+ files** (nhiều thư mục):
  - Code Snippet: `i18n.language === "en" ? "en-US" : "vi-VN"`
  - Exact Reason: Biểu thức này xuất hiện 15 lần khắp codebase, nhưng `@/lib/formatting.ts` đã có `currentLocale()` (line 14). Các file: `InterviewHistoryPage.tsx:229`, `JobDescriptionDetailPage.tsx:48`, `JobCard.tsx:38`, `MockInterviewSchedulePage.tsx:111`, `SpeechPlaygroundPage.tsx:34`, `MessengerPage.tsx:204`, `DashboardOverviewPage.tsx:290,299`, `QuestionBankPage.tsx:31`, `chart.tsx:241`, `calendar.tsx:40,168`.

### DRY-02: Inline `toLocaleDateString` thay vì dùng `formatDate()`

- **InterviewHistoryPage.tsx** (`src/pages/User/InterviewHistory/InterviewHistoryPage.tsx:228–230`):
  - Code Snippet: `new Date(session.createdAt).toLocaleDateString(i18n.language === "en" ? "en-US" : "vi-VN")`
  - Exact Reason: Nên dùng `formatDate(session.createdAt)` từ `@/lib/formatting`.

- **JobDescriptionDetailPage.tsx** (`src/pages/Enterprise/JobDescriptionDetailPage.tsx:44–53`):
  - Code Snippet: Local `formatDate()` function tạo `new Date(dateStr).toLocaleDateString(locale, {...})`
  - Exact Reason: Toàn bộ hàm local trùng với `formatDate()` trong `@/lib/formatting`.

- **MockInterviewSchedulePage.tsx** (`src/pages/User/MockInterview/MockInterviewSchedulePage.tsx:111–119`):
  - Code Snippet: `formatVietnamDateLabel()` với `dateInVietnam.toLocaleDateString(locale, {timeZone, weekday, ...})`
  - Exact Reason: Nên extract vào `@/lib/formatting` hoặc dùng `formatDate()` có sẵn.

- **MessengerPage.tsx** (`src/pages/Shared/Messenger/MessengerPage.tsx:203–209`):
  - Code Snippet: `formatDayLabel()` với `parsed.toLocaleDateString(locale, {timeZone, weekday, day, month, year})`
  - Exact Reason: Nên extract vào `@/lib/formatting`.

- **SpeechPlaygroundPage.tsx** (`src/pages/Shared/SpeechPlaygroundPage.tsx:33–35`):
  - Code Snippet: `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale)}``
  - Exact Reason: Nên dùng `formatDateTime()` từ `@/lib/formatting`.

### DRY-03: Inline `format(date, "dd/MM/yyyy")` thay vì dùng `formatDate()`

- **Filter.tsx** (`src/components/shared/Filter.tsx:123,152,242,243`):
  - Code Snippet: `format(value.from, "dd/MM/yyyy")`
  - Exact Reason: 4 lần dùng `format` từ `date-fns` trực tiếp thay vì `formatDate()`.

- **PracticeSetDetailPage.tsx** (`src/pages/User/Practice/PracticeSetDetailPage.tsx:525,927`):
  - Code Snippet: `format(new Date(ps.startDate), "dd/MM/yyyy")`
  - Exact Reason: 2 lần inline format thay vì dùng shared utility.

- **DashboardOverviewPage.tsx** (`src/pages/Admin/DashboardOverview/DashboardOverviewPage.tsx:252,392,410`):
  - Code Snippet: `format(customFrom, "dd/MM/yyyy")`
  - Exact Reason: 3 lần inline format.

### DRY-04: Session `statusConfig` Lặp 5 lần

- **OverviewPage.tsx** (`src/pages/User/Overview/OverviewPage.tsx:65–100, 157–192, 233–268`):
  - Code Snippet: `const statusConfig: Record<string, { label, dot, badgeClass }> = { DRAFT: {...}, SCHEDULED: {...}, ... }`
  - Exact Reason: **3 lần** trong cùng một file. Cùng object `{ label, dot, badgeClass }` cho session statuses.

- **MentorOverviewPage.tsx** (`src/pages/Mentor/Overview/MentorOverviewPage.tsx:40–75`):
  - Code Snippet: `const statusConfig: Record<string, { label, dot, badgeClass }> = { ... }`
  - Exact Reason: Lặp lần 4. `status-utils.ts` đã có `getSessionStatusBadge()` nhưng không trả về `dotColor`.

- **ApplicationHistoryPage.tsx** (`src/pages/User/ApplicationHistory/ApplicationHistoryPage.tsx:134–170`):
  - Code Snippet: `const APPLICATION_STATUS_CONFIG: Record<string, { label, dot, badgeClass }> = { ... }`
  - Exact Reason: Lặp lần 5. Nên extend `getSessionStatusBadge()` trong `status-utils.ts`.

### DRY-05: `getStatusBadgeColor()` / `getLevelBadgeColor()` Trùng với `status-utils.ts`

- **JobDescriptionDetailPage.tsx** (`src/pages/Enterprise/JobDescriptionDetailPage.tsx:55–83`):
  - Code Snippet: `function getStatusBadgeColor(status) { switch(status) { case "OPEN": ... } }`
  - Exact Reason: Trùng với `getJobDescriptionStatusBadge()` và `getJobDescriptionLevelBadge()` trong `src/lib/status-utils.ts`.

### DRY-06: Missing `formatNumber()` — Lặp 4 lần

- **QuestionBankPage.tsx** (`src/pages/Homepage/Questions/QuestionBankPage.tsx:245`):
  - Code Snippet: `item.views.toLocaleString(locale)`
  - Exact Reason: `@/lib/formatting.ts` chỉ có `formatCurrency()`, không có `formatNumber()`.

- **JobCard.tsx** (`src/pages/Enterprise/CompanyDetail/components/JobCard.tsx:38`):
  - Code Snippet: `num.toLocaleString(i18n.language === "en" ? "en-US" : "vi-VN")`
  - Exact Reason: Locale resolution + number format lặp lại.

- **DashboardOverviewPage.tsx** (`src/pages/Admin/DashboardOverview/DashboardOverviewPage.tsx:290,299`):
  - Code Snippet: `(userCount?.data || 0).toLocaleString(...)`
  - Exact Reason: 2 lần inline number formatting.

### DRY-07: `formatDistanceToNow` Lặp 3 lần

- **NotificationItem.tsx** (`src/components/notification/NotificationItem.tsx:38`):
  - Code Snippet: `formatDistanceToNow(parsedCreatedAt, { addSuffix: true, locale })`
  - Exact Reason: Nên extract thành `formatRelativeTime()` trong `@/lib/formatting`.

- **MessageBubble.tsx** (`src/components/shared/MessageBubble.tsx:92`):
  - Code Snippet: `formatDistanceToNow(parsed, { addSuffix: true, locale })`
  - Exact Reason: Cùng pattern với locale resolution lặp lại.

- **time-ago.tsx** (`src/components/ui/time-ago.tsx:26`):
  - Code Snippet: `formatDistanceToNow(parsedDate, { addSuffix: true, locale })`
  - Exact Reason: Lần thứ 3 cùng pattern.

### DRY-08: Schedule Utils Gần Như Identical (2 files)

- **userSchedule.utils.ts** (`src/pages/User/MockInterview/utils/userSchedule.utils.ts`):
  - Code Snippet: `parseJoinDate()`, `toDateKey()`, `formatCalendarTime()`, `buildUserCalendarSessions()`, `groupUserCalendarByDate()`
  - Exact Reason: Gần như identical với mentorSchedule.utils.ts. Chỉ khác filter `userId2 === mentorId`.

- **mentorSchedule.utils.ts** (`src/pages/Mentor/Sessions/utils/mentorSchedule.utils.ts`):
  - Code Snippet: `parseJoinDate()`, `toDateKey()`, `formatCalendarTime()`, `buildMentorCalendarSessions()`, `groupMentorCalendarByDate()``
  - Exact Reason: Nên tạo shared `src/lib/calendar-utils.ts` với generic `buildCalendarSessions<T>()`.

### DRY-09: Sidebar Collapse Pattern Lặp 4 lần

- **AdminDashboardPage.tsx** (`src/pages/Admin/AdminDashboard/AdminDashboardPage.tsx:510`):
  - Code Snippet: `useEffect(() => { setIsSidebarCollapsed(sidebarBehavior === "auto-collapse"); }, [sidebarBehavior]);`
  - Exact Reason: Duplicated ở 4 dashboard pages. Nên extract thành `useSidebarCollapse()` hook.

- **UserDashboardPage.tsx** (`src/pages/User/UserDashboard/UserDashboardPage.tsx:300`): Cùng pattern.
- **MentorDashboardPage.tsx** (`src/pages/Mentor/MentorDashboard/MentorDashboardPage.tsx:243`): Cùng pattern.
- **StaffDashboardPage.tsx** (`src/pages/Staff/StaffDashboard/StaffDashboardPage.tsx:185`): Cùng pattern.

## 3. File quá dài, "God Component" (Trên 500 dòng code)

- **Mô tả chi tiết:** File vi phạm nghiêm trọng nguyên tắc "Đơn trách nhiệm" (Single Responsibility Principle). Một file nhồi nhét quá nhiều công việc: khai báo type/interface, xử lý logic gọi API phức tạp, quản lý hàng tá state nội bộ, và render một cây DOM (JSX) khổng lồ lồng nhau nhiều cấp. Những file này cực kỳ khó đọc, khó viết test và rất dễ sinh bug khi có thay đổi.
- **Tiêu chí để AI nhận diện:**
  - File vượt quá **500 dòng code** (Lines of Code - LOC).
  - Có sự xuất hiện của quá nhiều React Hooks (ví dụ: > 7 `useState`, nhiều `useEffect` phức tạp) trong cùng một component.
  - Định nghĩa nhiều hơn 2 Component phức tạp bên trong cùng một file (thay vì tách file riêng).
  - Khối `return (...)` chứa cấu trúc JSX lồng sâu (deep nesting) quá 5-6 cấp.
- **Phát hiện:** Đếm số dòng code tự động, đếm số lượng hooks/functions được khai báo trong một component.
- **Các file cụ thể là:**

> **Tổng cộng: 33 file vượt quá 500 LOC.** Dưới đây là danh sách đầy đủ, sắp xếp theo số dòng giảm dần.

| #   | File                                                                            | LOC      | useState | useEffect | Mức độ                                   |
| --- | ------------------------------------------------------------------------------- | -------- | -------- | --------- | ---------------------------------------- |
| 1   | `src/pages/Shared/Messenger/MessengerPage.tsx`                                  | **1523** | 19       | 13        | 🔴 Cực kỳ nghiêm trọng                   |
| 2   | `src/pages/User/Practice/PracticeSetDetailPage.tsx`                             | **1197** | 17       | 4         | 🔴 Cực kỳ nghiêm trọng                   |
| 3   | `src/pages/User/InterviewHistory/InterviewHistoryPage.tsx`                      | **994**  | 7        | 2         | 🔴 Nghiêm trọng                          |
| 4   | `src/pages/User/AIInterview/AIInterviewSetup/CandidateProfileStep.tsx`          | **913**  | 0        | 0         | 🔴 Nghiêm trọng                          |
| 5   | `src/pages/Admin/PostManagement/PostManagementPage.tsx`                         | **895**  | 14       | 2         | 🔴 Cực kỳ nghiêm trọng                   |
| 6   | `src/pages/Payment/PaymentSuccessPage.tsx`                                      | **842**  | 8        | 3         | 🔴 Nghiêm trọng                          |
| 7   | `src/pages/User/Overview/OverviewPage.tsx`                                      | **839**  | 8        | 0         | 🔴 Nghiêm trọng                          |
| 8   | `src/pages/User/AIInterview/AIInterviewResultPage.tsx`                          | **837**  | 4        | 0         | 🔴 Nghiêm trọng                          |
| 9   | `src/pages/Mentor/Overview/MentorOverviewPage.tsx`                              | **829**  | 8        | 0         | 🔴 Nghiêm trọng                          |
| 10  | `src/pages/User/MockInterview/MockInterviewSchedulePage.tsx`                    | **781**  | 10       | 2         | 🔴 Nghiêm trọng                          |
| 11  | `src/components/shared/DashboardSidebar.tsx`                                    | **744**  | 7        | 4         | 🔴 Nghiêm trọng                          |
| 12  | `src/pages/Admin/NotificationManagement/NotificationManagementPage.tsx`         | **733**  | 8        | 0         | 🔴 Nghiêm trọng                          |
| 13  | `src/pages/Mentor/Sessions/MentorSessionsPage.tsx`                              | **718**  | 6        | 2         | 🟡 Vượt ngưỡng                           |
| 14  | `src/pages/Admin/AdminDashboard/AdminDashboardPage.tsx`                         | **700**  | 4        | 4         | 🟡 Vượt ngưỡng                           |
| 15  | `src/pages/User/MockInterview/SessionHistoryPage.tsx`                           | **683**  | 4        | 2         | 🟡 Vượt ngưỡng                           |
| 16  | `src/pages/User/MockInterview/SessionDetailPage.tsx`                            | **679**  | 4        | 3         | 🟡 Vượt ngưỡng                           |
| 17  | `src/pages/Payment/PaymentCancelPage.tsx`                                       | **653**  | 5        | 3         | 🟡 Vượt ngưỡng                           |
| 18  | `src/pages/Auth/MentorRegisterPage.tsx`                                         | **641**  | 10       | 0         | 🟡 Vượt ngưỡng                           |
| 19  | `src/components/ui/sidebar.tsx`                                                 | **634**  | 3        | 1         | 🟡 Vượt ngưỡng                           |
| 20  | `src/pages/Admin/PracticeQuestionManagement/PracticeQuestionManagementPage.tsx` | **612**  | 12       | 2         | 🟡 Vượt ngưỡng                           |
| 21  | `src/pages/User/AIInterview/AIInterviewListPage.tsx`                            | **610**  | 2        | 0         | 🟡 Vượt ngưỡng                           |
| 22  | `src/pages/User/Practice/PracticeSetsPage.tsx`                                  | **609**  | 6        | 2         | 🟡 Vượt ngưỡng                           |
| 23  | `src/pages/Admin/MentorManagement/components/MentorFormDialog.tsx`              | **602**  | 8        | 2         | 🟡 Vượt ngưỡng                           |
| 24  | `src/pages/User/Account/InterviewHistoryTab.tsx`                                | **598**  | 6        | 0         | 🟡 Vượt ngưỡng                           |
| 25  | `src/pages/User/ApplicationHistory/ApplicationHistoryPage.tsx`                  | **596**  | 3        | 0         | 🟡 Vượt ngưỡng                           |
| 26  | `src/pages/Admin/DashboardOverview/DashboardOverviewPage.tsx`                   | **593**  | 4        | 0         | 🟡 Vượt ngưỡng                           |
| 27  | `src/pages/Admin/CompanyManagement/CompanyDetailView.tsx`                       | **578**  | 16       | 2         | 🔴 Cực kỳ nghiêm trọng (state explosion) |
| 28  | `src/pages/Shared/SpeechPlaygroundPage.tsx`                                     | **545**  | 18       | 3         | 🟡 Dev-only, thấp priority               |
| 29  | `src/pages/Enterprise/JobDescriptionDetailPage.tsx`                             | **539**  | 6        | 2         | 🟡 Vượt ngưỡng                           |
| 30  | `src/pages/Mentor/Students/StudentDetailPage.tsx`                               | **534**  | 0        | 0         | 🟡 Vượt ngưỡng                           |
| 31  | `src/components/post/CommentSection.tsx`                                        | **522**  | 7        | 0         | 🟡 Vượt ngưỡng                           |
| 32  | `src/pages/Staff/PostModeration/PostModerationPage.tsx`                         | **518**  | 10       | 2         | 🟡 Vượt ngưỡng                           |
| 33  | `src/pages/Staff/SessionProcessing/SessionProcessingPage.tsx`                   | **510**  | 5        | 0         | 🟡 Vượt ngưỡng                           |

### Files Vi phạm Quy tắc >7 useState (AP-03)

- **MessengerPage.tsx** — 19 `useState`, 13 `useEffect` 🔴
- **PracticeSetDetailPage.tsx** — 17 `useState` 🔴
- **CompanyDetailView.tsx** — 16 `useState` 🔴
- **SpeechPlaygroundPage.tsx** — 18 `useState` (dev-only)
- **PostManagementPage.tsx** — 14 `useState`
- **PracticeQuestionManagementPage.tsx** — 12 `useState`
- **MockInterviewSchedulePage.tsx** — 10 `useState`
- **MentorRegisterPage.tsx** — 10 `useState`
- **PostModerationPage.tsx** — 10 `useState`

## 4. Tên file sai lệch với chức năng (Mismatched Naming & Purpose)

- **Mô tả chi tiết:** Việc đặt tên file không phản ánh đúng ngữ nghĩa và chức năng thực tế của mã nguồn bên trong. Điều này gây hiểu lầm nghiêm trọng cho các lập trình viên khác khi họ đọc cấu trúc thư mục hoặc tìm kiếm file.
- **Tiêu chí để AI nhận diện:**
  - **Sai lệch logic:** Phân tích logic nghiệp vụ bên trong và đối chiếu với tên file. Ví dụ: Tên file là `UserPayment.tsx` (ngụ ý thanh toán) nhưng code bên trong lại chủ yếu là gọi API `/api/users/update-profile` và render form đổi tên, đổi mật khẩu.
  - **Sai lệch Export:** Tên file là `Navbar.tsx` nhưng component được `export default` bên trong lại tên là `SidebarComponent`.
  - **Chứa code không liên quan:** Một file có tên `utils/formatDate.ts` nhưng lại chứa cả hàm tính toán giỏ hàng hoặc validate email.
- **Phát hiện:** AI cần đối chiếu ngữ nghĩa (semantic) của tên file với: (1) Tên component được export, (2) Các endpoint API được gọi bên trong, (3) Các từ khóa text được render ra UI.
- **Các file cụ thể là:**

> **Kết quả: Không phát hiện sai lệch nghiêm trọng.** Tên file và export name khớp nhau trên toàn bộ `src/components/` và `src/pages/`. Các file API đều có tên phản ánh đúng chức năng nghiệp vụ bên trong.

## 5. File nằm sai thư mục (Misplaced Files)

- **Mô tả chi tiết:** File được đặt trong một thư mục không phù hợp với chức năng hoặc loại của nó. Điều này làm rối loạn cấu trúc dự án, khiến việc tìm kiếm và bảo trì trở nên khó khăn.
- **Tiêu chí để AI nhận diện:**
  - File component UI nhưng lại nằm trong thư mục `utils` hoặc `hooks`.
  - File chứa logic gọi API nhưng lại nằm trong thư mục `components`.
  - File test nhưng lại nằm trong thư mục `pages` hoặc `components`.
  - File có tên gợi ý về một loại chức năng (ví dụ: `UserProfile.tsx`) nhưng lại nằm trong thư mục của một loại chức năng khác (ví dụ: `AdminDashboard`).
  - File có chức năng hiển thị ở trang người dùng nhưng lại nằm trong thư mục dành cho mentor, hoặc ngược lại (ví dụ: `src/pages/Mentor/MentorDashboard/MentorDashboardPage.tsx` nhưng lại chứa code/file hiển thị thông tin người dùng).
- **Phát hiện:** AI cần phân tích tên file và nội dung bên trong để đối chiếu với cấu trúc thư mục chuẩn của dự án (ví dụ: `src/components`, `src/hooks`, `src/utils`, `src/pages`).
- **Các file cụ thể là:**

- **speech-synthesis.utils.ts** (`src/hooks/speech-synthesis.utils.ts`):
  - Exact Reason: Đây là file utility (`.utils.ts`), không phải hook. Nằm sai thư mục `hooks/`. Nên chuyển sang `src/lib/speech-synthesis.ts`.

- **speech-synthesis.utils.test.ts** (`src/hooks/speech-synthesis.utils.test.ts`):
  - Exact Reason: File test colocalized với file bị misplaced. Nên chuyển cùng source sang `src/lib/`.

- **useVideoCall.ts** (`src/components/video-call/useVideoCall.ts`):
  - Exact Reason: Đây là custom hook (bắt đầu bằng `use`), không phải component. Nên chuyển sang `src/hooks/useVideoCall.ts`.

## 6. Không thống nhất quy ước đặt tên file (Naming Convention Inconsistency)

- **Mô tả chi tiết:** Sự hỗn loạn trong cách đặt tên file giữa các thành viên trong đội ngũ hoặc giữa các giai đoạn phát triển. Việc trộn lẫn giữa camelCase, kebab-case, hoặc PascalCase cho cùng một loại file (ví dụ: file hooks hoặc utils) làm giảm tính đồng bộ và chuyên nghiệp của dự án.
- **Tiêu chí để AI nhận diện:**
  - Thư mục `src/hooks`: Có file dùng `camelCase` (ví dụ: `useMentorFeedback.ts`) nhưng lại có file dùng `kebab-case` (ví dụ: `use-tabs-state.ts`). Quy chuẩn bắt buộc đối với Custom Hook là `camelCase` và bắt đầu bằng từ `use`.
  - Thư mục `src/utils` hoặc `src/lib`: Trộn lẫn giữa `camelCase` (`formatDate.ts`) và `kebab-case` (`speech-synthesis.utils.ts`). Quy chuẩn nên thống nhất dùng `kebab-case` cho helper/util.
  - Thư mục `src/components`: File chứa React Component không viết theo dạng `PascalCase` (ví dụ: `userCard.tsx` thay vì `UserCard.tsx`).
- **Phát hiện:** Kiểm tra định dạng chuỗi (Regex matching) của tên file dựa trên sơ đồ phân cấp thư mục để phát hiện các file "lệch pha".
- **Các file cụ thể là:**

### NC-01: Hook dùng kebab-case thay vì camelCase

- **use-mobile.ts** (`src/hooks/use-mobile.ts`):
  - Exact Reason: Custom hook phải dùng `camelCase` và bắt đầu bằng `use`. Nên rename thành `useMobile.ts`.

### NC-02: Component non-PascalCase trong `src/components/`

- **sidebar-collapse.ts** (`src/components/shared/sidebar-collapse.ts`):
  - Exact Reason: File `.ts` trong `components/shared/` dùng `kebab-case`. Nên rename thành `sidebarCollapse.ts`.

### NC-03: Lib directory trộn lẫn naming conventions

- **`src/lib/`** (13 files kebab-case, 6 files camelCase):
  - Code Snippet: `auth-session.ts`, `dashboard-breadcrumb.ts` (kebab) vs `api.ts`, `queryClient.ts` (camel)
  - Exact Reason: `kebab-case` chiếm đa số (68%), nhưng `queryClient.ts` và `transforms.ts` lệch pha. Nên thống nhất.

## 7. Bỏ qua Tối ưu Hiệu năng & Re-render vô tội vạ (Performance & Memory Leaks)

- **Mô tả chi tiết:** Viết code không kiểm soát khiến component bị render lại liên tục không cần thiết, hoặc không dọn dẹp các tác vụ bất đồng bộ, dẫn đến tràn bộ nhớ (Memory Leak) và làm ứng dụng bị giật lag khi sử dụng lâu.
- **Tiêu chí để AI nhận diện:**
  - Sử dụng chỉ số mảng (`index`) làm thuộc tính `key` khi render danh sách động (vòng lặp `.map()` có thêm/xóa/sắp xếp phần tử).
  - Khai báo các hàm xử lý logic nặng hoặc các object/array thô ngay bên trong thân component và truyền xuống component con mà không bọc trong `useMemo` hoặc `useCallback`.
  - Trong hook `useEffect`, sử dụng `setInterval`, `addEventListener`, hoặc `subscribers` nhưng không viết hàm `return () => { ... }` để cleanup (hủy bỏ) khi component bị unmount.
- **Phát hiện:** Kiểm tra mảng dependency của hooks, phát hiện cú pháp render loop và các hàm lắng nghe sự kiện thiếu khối cleanup.
- **Các file/đoạn code cụ thể là:**

### PERF-01: Array Index làm `key` trong `.map()` (Dynamic Lists)

- **PostFeedModal.tsx** (`src/components/post/feed/PostFeedModal.tsx:225`):
  - Code Snippet: `likers.map((l, i) => <div key={i}>…)`
  - Exact Reason: Danh sách liker là dynamic — likes mới gây sai DOM reconciliation.

- **QuizPage.tsx** (`src/pages/User/Practice/QuizPage.tsx:272`):
  - Code Snippet: `quizItems.map((item, idx) => <button key={idx}>…)`
  - Exact Reason: `item.id` đã có sẵn nhưng không sử dụng làm key.

- **StudentDetailPage.tsx** (`src/pages/Mentor/Students/StudentDetailPage.tsx:460,479,499`):
  - Code Snippet: `candidateProfile.projects!.map((p, i) => <div key={i}>…)`
  - Exact Reason: 3 lần dùng index cho projects, workExperiences, educations. Cũng dùng `!` non-null assertion.

- **CommentItem.tsx** (`src/components/post/CommentItem.tsx:50`):
  - Code Snippet: `parts.map((part, i) => … key={i})`
  - Exact Reason: Text-derived parts có thể shift khi content thay đổi.

- **image-carousel.tsx** (`src/components/ui/image-carousel.tsx:59,98`):
  - Code Snippet: `images.map((image, index) => <div key={index}>…)`
  - Exact Reason: Carousel slides + indicators dùng index.

- **CompanyInfoSection.tsx** (`src/pages/Enterprise/CompanyDetail/components/CompanyInfoSection.tsx:91`):
  - Code Snippet: `benefits.map((benefit, index) => <div key={index}>…)`
  - Exact Reason: Benefits là strings, không có stable key — thấp priority.

- **JobDescriptionDetailPage.tsx** (`src/pages/Enterprise/JobDescriptionDetailPage.tsx:508`):
  - Code Snippet: `<Badge key={index} variant="outline">…`
  - Exact Reason: Badge list từ static data.

### PERF-02: WebSocket Subscribe Không Unsubscribe (Memory Leak)

- **socket.manager.ts** (`src/services/socket.manager.ts:54`):
  - Code Snippet: `this.stompClient?.subscribe(topic, (message) => { ... })` — return value (StompSubscription) bị discard.
  - Exact Reason: Subscriptions không được track. Nếu `connect()` gọi lại (re-login), duplicate subscriptions accumulate. Nên lưu references và unsubscribe trước khi re-subscribe.

### PERF-03: Unmemoized Computation trong Component Body

- **UserNotificationsPage.tsx** (`src/pages/User/Notifications/UserNotificationsPage.tsx:32–33`):
  - Code Snippet: `const unreadCount = notifications.filter((n) => !n.isRead).length;`
  - Exact Reason: Chạy mỗi render. Nên bọc trong `useMemo`.

- **MentorNotificationsPage.tsx** (`src/pages/Mentor/Notifications/MentorNotificationsPage.tsx:32–33`):
  - Code Snippet: `const unreadCount = notifications.filter((n) => !n.isRead).length;`
  - Exact Reason: Cùng pattern với UserNotificationsPage.

- **CommentItem.tsx** (`src/components/post/CommentItem.tsx:45–55`):
  - Code Snippet: `text.split(/(@\S+)/g).map(…)` — text parsing + JSX generation mỗi render.
  - Exact Reason: Nên bọc trong `useMemo` nếu text dài.

### PERF-04: Production `console.log` Không Có DEV Guard

- **socket.manager.ts** (`src/services/socket.manager.ts:40`):
  - Code Snippet: `debug: (str) => console.log("STOMP: " + str),`
  - Exact Reason: STOMP debug callback chạy **mọi frame** — không có `import.meta.env.DEV` guard. Xuất hiện trong production, log hàng trăm messages mỗi session.

- **socket.manager.ts** (`src/services/socket.manager.ts:48`):
  - Code Snippet: `console.log("Connected to STOMP: " + frame);`
  - Exact Reason: Không có DEV guard. Log mỗi lần kết nối WebSocket.

- **socket.manager.ts** (`src/services/socket.manager.ts:140`):
  - Code Snippet: `console.log("DEBUG: Sending Payload:", chatDto)`
  - Exact Reason: 🔴 **AN NINH** — Không có DEV guard. Log **toàn bộ nội dung tin nhắn chat** (bao gồm text, file URL) ra console production. Vi phạm nguyên tắc không ghi log dữ liệu nhạy cảm.

- **socket.manager.ts** (`src/services/socket.manager.ts:159`):
  - Code Snippet: `console.log("Disconnected from STOMP: " + frame);`
  - Exact Reason: Không có DEV guard. Log mỗi lần ngắt kết nối.

- **mentor.manager.ts** (`src/services/mentor.manager.ts:272`):
  - Code Snippet: `console.log("Update mentor payload:", JSON.stringify(mentorInfo, null, 2));`
  - Exact Reason: Không có DEV guard. Log **toàn bộ payload cập nhật mentor** (bao gồm thông tin cá nhân, giá, mô tả) dưới dạng pretty-printed JSON.

## 8. Xử lý bất đồng bộ thiếu an toàn & Nuốt lỗi (Poor Async Handling & Fragile Logic)

- **Mô tả chi tiết:** Gọi API hoặc xử lý các tác vụ bất đồng bộ (Promise) nhưng "quên" không bắt lỗi (`try-catch` hoặc `.catch()`), không quản lý trạng thái loading/error, hoặc truy cập trực tiếp vào các thuộc tính sâu của object trả về từ API mà không kiểm tra dữ liệu có tồn tại hay không (gây ra lỗi crash ứng dụng `Cannot read properties of undefined`).
- **Tiêu chí để AI nhận diện:**
  - Các hàm `async/await` gọi API từ backend nhưng không được bọc trong khối `try { ... } catch (error) { ... }`.
  - Dữ liệu trả về từ API được sử dụng trực tiếp theo kiểu `data.user.profile.avatar` thay vì sử dụng Optional Chaining (`data?.user?.profile?.avatar`) hoặc có giá trị fallback mặc định.
  - Thiếu biến state kiểm soát trạng thái giao diện khi API đang chạy (`isLoading`), dẫn đến việc người dùng có thể bấm click liên tục vào một nút gửi form.
- **Phát hiện:** Phân tích cú pháp các hàm `async`, các lệnh gọi Promise và kiểm tra độ an toàn của việc truy cập thuộc tính object (Object property access analysis).
- **Các file/đoạn code cụ thể là:**

### AP-08: Async Không có try-catch

- **SignupPage.tsx** (`src/pages/Auth/SignupPage.tsx:101–165`):
  - Code Snippet: `const result = await authManager.signup({ /* ... */ }); // ← no try-catch` → `setIsLoading(false)` ở line 165 không bao giờ chạy nếu API throw.
  - Exact Reason: Nút submit bị disable vĩnh viễn nếu API fail. Nên wrap trong `try/finally` với `setIsLoading(false)`.

- **HomepageHeader.tsx** (`src/components/homepage-redesign/HomepageHeader.tsx:80–84`):
  - Code Snippet: `await authManager.logout(); clearAuth();` — không có try-catch.
  - Exact Reason: Nếu logout API fail, `clearAuth()` không chạy → user bị kẹt ở trạng thái half-logged-in.

- **Header.tsx** (`src/components/layouts/Header.tsx:55–59`):
  - Code Snippet: `await authManager.logout(); clearAuth();` — identical pattern với HomepageHeader.
  - Exact Reason: Cùng lỗi. Nên wrap trong `try/finally`.

- **SessionRoomPage.tsx** (`src/pages/User/MockInterview/SessionRoomPage.tsx:56–66`):
  - Code Snippet: `await joinSessionMutation.mutateAsync({ /* ... */ }); setHasJoinedTracking(true);`
  - Exact Reason: Nếu mutation fail, `setHasJoinedTracking` không chạy → silent failure.

- **CreatePostModal.tsx** (`src/components/post/feed/CreatePostModal.tsx:43–53`):
  - Code Snippet: `const result = await questionMajorManager.getAll();` trong useEffect — không có try-catch.
  - Exact Reason: API throw → component crash.

- **PostEditForm.tsx** (`src/pages/Admin/PostManagement/components/PostEditForm.tsx:44–66`):
  - Code Snippet: Hai useEffects gọi API (`fetchMajors`, `fetchPost`) — cả hai không có try-catch.
  - Exact Reason: Edit form unusable nếu API fail.

### AP-08: Unsafe Deep Property Access

- **SignupPage.tsx** (`src/pages/Auth/SignupPage.tsx:125–151`):
  - Code Snippet: `result.data.user.fullName`, `result.data.user.email` — truy cập sâu không có optional chaining.
  - Exact Reason: Outer check `result.data?.user` guard `user` existence, nhưng `fullName`, `email` không có `?.`.

- **auth.manager.ts** (`src/services/auth.manager.ts:724–728`):
  - Code Snippet: `response.data.id`, `response.data.name` với `@ts-expect-error` suppression.
  - Exact Reason: Không có runtime type checks. Backend schema mismatch bị suppress thay vì handle đúng.

- **SessionManagementPage.tsx** (`src/pages/Admin/SessionManagement/SessionManagementPage.tsx:56`):
  - Code Snippet: `const sessionData = Array.isArray(response.data) ? response.data : response.data.data;`
  - Exact Reason: `response.data.data` có thể undefined → `setSessions(undefined)`. Nên thêm `?? []`.

- **UserManagementPage.tsx** (`src/pages/Admin/UserManagement/UserManagementPage.tsx:56`):
  - Code Snippet: `const userData = Array.isArray(response.data) ? response.data : response.data.data;`
  - Exact Reason: Cùng pattern với SessionManagementPage.

- **MentorManagementPage.tsx** (`src/pages/Admin/MentorManagement/MentorManagementPage.tsx:46`):
  - Code Snippet: `const mentorData = Array.isArray(response.data) ? response.data : response.data.data;`
  - Exact Reason: Cùng pattern. Nên thêm `?? []` fallback.

## 9. Cạnh tranh dữ liệu do Thiếu kiểm soát luồng Bất đồng bộ (Race Conditions in Data Fetching)

- **Mô tả chi tiết:** Xảy ra khi thao tác người dùng quá nhanh (gõ thanh tìm kiếm liên tục, chuyển đổi tab nhanh chóng) kích hoạt hàng loạt API call. API gọi sau có thể hoàn thành trước API gọi trước, dẫn đến giao diện cập nhật sai dữ liệu cuối cùng. Lỗi do dev quên cơ chế hủy (abort) các request đã hết hạn.
- **Tiêu chí để AI nhận diện:**
  - Gọi `fetch` hoặc `axios` bên trong `useEffect` khi `dependency` thay đổi liên tục, nhưng không tích hợp `AbortController` để hủy request nếu component bị unmount hoặc chạy lại effect.
  - Không có cờ (flag) kiểu `let ignore = false` bên trong hàm async nội bộ của hooks để ngăn chặn việc set State khi request đã "ôi thiu".
- **Phát hiện:** Phân tích logic gọi API bên trong hooks/effects, tìm kiếm sự thiếu vắng của cơ chế cleanup block (`return () => {...}`) hoặc `AbortSignal`.
- **Các file cụ thể là:**

> **Lưu ý:** Chỉ 1 file trong toàn bộ codebase (`PdfPreviewViewer.tsx`) sử dụng `AbortController`. Tất cả các useEffect+API patterns khác đều **không có cơ chế hủy request**.

- **MessengerPage.tsx** (`src/pages/Shared/Messenger/MessengerPage.tsx:433–620`):
  - Code Snippet: 3 useEffect blocks gọi cascading API calls (`getContacts` → `getMentorDetail`/`getUserDetail` → `getChatHistoryByParticipants`). Có `destroyedRef` nhưng check quá trễ — `setState` đã chạy trước.
  - Exact Reason: `setContacts(contactDetails)` chạy trước check `destroyedRef.current`. Nên dùng `ignore` flag check trước **mỗi** `setState`.

- **CompanyGridSection.tsx** (`src/components/homepage-redesign/CompanyGridSection.tsx:115–135`):
  - Code Snippet: `useEffect(() => { fetchCompanies(); }, []);` — gọi `companyManager.getAll()` không có AbortController.
  - Exact Reason: Có try-catch nhưng không cancel on unmount.

- **CompanyDetailPage.tsx** (`src/pages/Enterprise/CompanyDetail/CompanyDetailPage.tsx:27–52`):
  - Code Snippet: `Promise.all([companyManager.getById, companyManager.getJobs])` — không có AbortController, không có ignore flag.
  - Exact Reason: Navigate nhanh → `setCompany`/`setJobs` fire trên unmounted component.

- **MentorDetailPage.tsx** (`src/pages/User/MentorDetail/MentorDetailPage.tsx:~160–200`):
  - Code Snippet: `useEffect` gọi `chatManager.getMentorDetail()` và `chatManager.getAllMentors()` — không có cleanup.
  - Exact Reason: Race condition khi user navigate nhanh.

- **PracticeSetDetailPage.tsx** (`src/pages/User/Practice/PracticeSetDetailPage.tsx:841–887`):
  - Code Snippet: `loadData` useCallback gọi 4+ API calls liên tiếp. Không có AbortController.
  - Exact Reason: useEffect gọi `loadData()` không có cleanup.

- **CompanySearchPage.tsx** (`src/pages/Enterprise/CompanySearchPage.tsx:55–58`):
  - Code Snippet: `useEffect` gọi `searchCompanies(query)` → `companyManager.getAll()` — không có AbortController.
  - Exact Reason: Search query thay đổi liên tục → race condition.

- **PostEditForm.tsx** (`src/pages/Admin/PostManagement/components/PostEditForm.tsx:44–65`):
  - Code Snippet: Hai useEffects gọi API — không có AbortController.
  - Exact Reason: Rapid tab switching → stale data overwrites.

- **PostCreateForm.tsx** (`src/pages/Admin/PostManagement/components/PostCreateForm.tsx:41–46`):
  - Code Snippet: `useEffect` gọi `questionMajorManager.getAll()` — không có AbortController.
  - Exact Reason: Modal open/close nhanh → stale response.

- **JobDescriptionDetailPage.tsx** (`src/pages/Enterprise/JobDescriptionDetailPage.tsx:110–130`):
  - Code Snippet: `useEffect` gọi API — có try-catch nhưng không AbortController.
  - Exact Reason: `finally { setIsLoading(false) }` có thể fire sau unmount.

- **MentorListPage.tsx** (`src/pages/User/MentorList/MentorListPage.tsx:24–48`):
  - Code Snippet: `useEffect` gọi `loadMentors()` → `chatManager.getAllMentors()` — không có AbortController.
  - Exact Reason: Navigate away → stale setState.

- **ViewPracticeSetItemsDialog.tsx** (`src/pages/Admin/PracticeSetManagement/components/ViewPracticeSetItemsDialog.tsx:65–95`):
  - Code Snippet: `loadItems` và `loadAllQuestions` gọi trong useEffect — không có AbortController.
  - Exact Reason: Dialog close/open nhanh → race condition.

- **QuizPage.tsx** (`src/pages/User/Practice/QuizPage.tsx:67`) / **QuizResultPage.tsx** (`src/pages/User/Practice/QuizResultPage.tsx:53`):
  - Code Snippet: `loadData` useCallback gọi `quizSetManager.getById()` — có try-catch nhưng không AbortController.
  - Exact Reason: Thấp hơn vì có try-catch, nhưng vẫn không cancel on unmount.

## 10. Lạm dụng useEffect để đồng bộ State thay vì tính toán trực tiếp (Derived State Abuse)

- **Mô tả chi tiết:** Đây là một trong những lỗi kinh điển nhất được tài liệu chính thức của React cảnh báo liên tục. Dev thường có thói quen tạo ra một state mới, rồi dùng `useEffect` chỉ để "lắng nghe" một state khác thay đổi để cập nhật theo. Điều này tạo ra chuỗi re-render kép (render hai lần liên tiếp), làm chậm ứng dụng và rất dễ sinh bug vòng lặp vô tận.
- **Tiêu chí để AI nhận diện:**
  - Xuất hiện một cặp `useState` và `useEffect` hoạt động theo kiểu: Cứ hễ `stateA` đổi thì `useEffect` chạy để gọi `setStateB(tính_toán_từ_stateA)`.
  - Cách xử lý đúng: Bỏ hoàn toàn `stateB` và `useEffect` đó đi. Thay vào đó, tạo một biến thông thường được tính toán trực tiếp (Derived State) ngay trong thân component trong mỗi lần render: `const dataB = tinhToan(stateA)`. Chỉ bọc trong `useMemo` nếu phép tính đó cực kỳ nặng.
- **Phát hiện:** Rà soát các `useEffect` có dependency chứa state, và bên trong chỉ có duy nhất logic cập nhật một local state khác.
- **Các file/đoạn code cụ thể là:**

> **Kết quả: Không phát hiện classic derived state abuse.** Codebase sử dụng `useMemo` đúng cách ở nhiều nơi (filtered lists, sorted data). Tuy nhiên, có 2 pattern cần cải thiện:
