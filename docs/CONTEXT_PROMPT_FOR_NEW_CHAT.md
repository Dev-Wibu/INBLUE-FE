# Context cho box chat mới — tiếp tục task FE Mentor Interview

## Bạn là ai

Bạn là **FE agent** tiếp tục giúp tôi (frontend developer) làm task đang dở. Repo: `D:/Capstone/EXE_FE`, stack: **React + TypeScript + Vite + Tailwind + shadcn/ui + i18next (en/ja/vi) + TanStack Query + Zustand**. Branch hiện tại: `main` (đã merge đầy đủ code mới nhất). Backend API: `https://api.kdz.asia`.

## Bối cảnh dự án

Đây là web app Capstone: nền tảng kết nối **sinh viên ứng tuyển việc** với **mentor phỏng vấn mock**. Có 4 role: `USER` (sinh viên), `MENTOR`, `STAFF` (HR), `ADMIN`. Luồng chính:

1. Sinh viên tạo **Application** (ứng tuyển vào Job Description)
2. Application có nhiều **Round** (CV Screening → Email Simulator → Quiz → Coding → **Mentor Review** → AI Interview)
3. Mỗi round sinh viên làm → backend chấm → round tiếp theo mở
4. Ở round **Mentor Review**: sinh viên phỏng vấn trực tiếp với mentor qua video call (Daily.co), sau đó sinh viên viết feedback (rating + STAR notes), HR/Staff duyệt review.

## Code mới đã merge vào main (commit `210b28b`)

Đây là commit chứa **toàn bộ** code tôi đã làm trong 2 ngày qua, dựa trên đó bạn tiếp tục:

### 1. Trang HR/Staff duyệt mentor review (MỚI — quan trọng nhất)

**File mới:**

- `src/pages/Shared/HrMentorReviewApproval/HrMentorReviewApprovalPage.tsx` (676 dòng)
- `src/pages/Shared/HrMentorReviewApproval/index.ts`

**Đã integrate vào:**

- `src/pages/Admin/AdminDashboard/AdminDashboardPage.tsx` — thêm menu "Mentor Review Approvals" + route `/admin/mentorReviewApprovals`
- `src/pages/Staff/StaffDashboard/StaffDashboardPage.tsx` — thêm tab "mentorReviewApprovals" + menu sidebar

**Trang này làm gì:** HR/Staff xem danh sách ApplicationDetail đã được student submit mentor review → Approve/Reject. Backend API dùng: `GET /api/mentor-reviews/pending`, `POST /api/mentor-reviews/{id}/approve`, `POST /api/mentor-reviews/{id}/reject`. **Hiện trang này chưa có data thật vì backend chưa có 3 endpoint trên — đây là GAP chính cần backend fix.**

### 2. Trang Student nộp mentor review (đã rewrite)

**File:** `src/pages/User/ApplicationHistory/ApplicationMentorReviewPage.tsx` (1667 dòng)

Luồng: student vào `/user/application/{id}/mentor-review` → form nhập rating (1-10) + 4 STAR notes + 3 free-text (strength/weakness/improve) → submit. **Hiện đang bị block vì backend API `POST /api/mentor-reviews` yêu cầu `mentorId` + `userId` mà FE không lấy được** (xem GAP dưới).

### 3. Nút "Mentor Review" trong lịch sử application

**File:** `src/pages/User/ApplicationHistory/ApplicationHistoryPage.tsx`

Thêm button mới hiện khi round hiện tại là MENTOR_REVIEW/MENTROR_REVIEW.

### 4. i18n (EN/JA/VI)

**Files:** `src/locales/en.json`, `ja.json`, `vi.json`

Thêm keys: `adminAdmindashboard.mentorReviewApprovals`, `staffStaffdashboard.mentorReviewApprovals`, `userApplicationhistory.mentorReview`, `userApplicationhistory.mentorWillBeAssigned`, kiosk flow keys,...

### 5. Schema sync

**File:** `schema-from-be.d.ts` (auto-generated từ OpenAPI backend)

### 6. Hook fix nhỏ

**File:** `src/hooks/useMutationHandler.ts` — prefix `_` cho unused args.

### 7. Docs (4 file mới — KHÔNG phải file thừa)

- `docs/BUG_REPORT_MENTOR_INTERVIEW_LEAVE_TIME.md` (358 dòng) — báo cáo bug **CRITICAL** về Daily.co webhook
- `docs/APPLICATION_MENTOR_INTERVIEW_FLOW.md` (911 dòng) — flow document luồng mentor review
- `docs/prompt_for_backend_agent.md` (223 dòng) — prompt đã gửi cho backend
- `docs/session_api_guide.md` — API guide cho session

## ⚠️ 3 GAP/BUG cần giải quyết tiếp

### GAP #1 (BLOCKER): API `POST /api/mentor-reviews` yêu cầu `mentorId` + `userId` mà FE không lấy được

**Triệu chứng:** Student vào `ApplicationMentorReviewPage` → submit → backend trả 500 "The data submitted is invalid".

**Nguyên nhân:** Backend không có endpoint nào trả `mentorId` của round Mentor Review cho student.

**Đã gửi prompt cho backend (`docs/prompt_for_backend_agent.md`)** — đề xuất 3 options, khuyến nghị Option A (backend tự derive từ sessionId).

**→ Task tiếp theo có thể là:**

- Chờ backend fix
- Hoặc viết workaround FE (ví dụ: lấy từ session API, hoặc để form chỉ gửi sessionId + rating)

### GAP #2 (CRITICAL): Session không bao giờ có `endTime` → user mãi mãi ở trạng thái ONGOING

**Docs:** `docs/BUG_REPORT_MENTOR_INTERVIEW_LEAVE_TIME.md` — đã gửi cho backend.

**Hiện trạng FE:** `ApplicationMentorReviewPage` check `session.status === 'COMPLETED'` mới cho submit → vì session mãi ONGOING nên **không bao giờ vào được form submit**.

**→ Task tiếp theo có thể là:** workaround tạm thời — cho phép student submit review dù session chưa COMPLETED (vì backend chưa có logic auto-complete). Hiển thị warning: "Session chưa kết thúc, bạn vẫn có thể viết review trước."

### GAP #3: API booking `GET /api/mentor-interview-bookings/{id}` không tồn tại

Backend đã nhận nhưng chưa fix.

## Code style / Convention

- Dùng shadcn/ui components có sẵn: `Button`, `Card`, `Dialog`, `Badge`, `Input`, `Textarea`, `Select`, `Tabs`, `Avatar`, ...
- Icons từ `lucide-react`
- Format: Prettier (đã config trong repo)
- Tất cả UI text **PHẢI** có i18n key qua `useTranslation()` → 3 file `en.json`, `ja.json`, `vi.json`
- Không hardcode tiếng Anh/Tiếng Việt trong JSX
- Tailwind class cho layout, dùng `cn()` từ `@/lib/utils` để merge class
- Mỗi page có page title qua `<Helmet>` (nếu chưa có thì thêm)
- Toast thông báo: `useToast()` hook

## Cấu trúc folder quan trọng

```
src/
├── pages/
│   ├── User/ApplicationHistory/
│   │   ├── ApplicationHistoryPage.tsx          (lịch sử application + nút vào review)
│   │   └── ApplicationMentorReviewPage.tsx     (form submit review — 1667 dòng)
│   ├── Shared/HrMentorReviewApproval/          (MỚI — HR duyệt review)
│   │   └── HrMentorReviewApprovalPage.tsx
│   ├── Admin/AdminDashboard/AdminDashboardPage.tsx
│   └── Staff/StaffDashboard/StaffDashboardPage.tsx
├── hooks/useMutationHandler.ts
├── locales/{en,ja,vi}.json
└── schema-from-be.d.ts                         (auto-gen, không edit tay)
```

## Quy tắc khi bạn code tiếp

1. **Không bịa thông tin** — nếu API chưa tồn tại, nói rõ "API chưa có, cần backend làm trước" thay vì fake response.
2. **Không phóng đại** — chỉ làm đúng task user yêu cầu, không tự thêm feature thừa.
3. **Tất cả UI text phải có i18n** — 3 ngôn ngữ, dùng `t('namespace.key')`.
4. **Đọc file trước khi sửa** — tận dụng `Read` tool, không sửa mù.
5. **Commit message format:** `feat(scope): mô tả ngắn` hoặc `fix(scope): mô tả ngắn`.
6. **Pre-commit hook tự chạy** prettier + eslint + tsc + vite build — nếu fail phải fix ngay, không được bypass.
7. **Không push force, không update git config, không commit khi chưa được user hỏi.**

## Câu mở đầu nên hỏi user

Sau khi paste context này, hỏi user:

> "Bạn muốn tôi tiếp tục phần nào? Ví dụ:
>
> 1. Workaround FE cho GAP #1 (session ONGOING không cho submit review) — có thể làm ngay, không cần backend
> 2. Refactor/optimize code đã merge
> 3. Implement task mới (bạn mô tả)
> 4. Review lại code đã merge tìm bug tiềm ẩn"

---

**Version:** 2026-07-12 — viết sau khi merge commit `210b28b` + `3ca6d81` lên main.
