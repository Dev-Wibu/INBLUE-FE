# ✅ Backend Update — Chỉnh sửa cho FE (Snapshot 2026-07-12, master HEAD `3a290d5`)

> File này là **bản tóm tắt ngắn gọn** những gì Backend đã thay đổi trong master từ commit `2d6d26c..3a290d5`. Mục đích: để team FE biết phải chỉnh sửa/điều chỉnh gì ở phía client cho khớp với API hiện tại.
>
> (File điều tra bug Session Leave Time vẫn tồn tại ở `docs/MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md` — file này **chỉ tập trung vào 3 thay đổi đã deploy**.)

---

## Tổng quan nhanh

| #   | Commit                | Tính năng                                                                                                  | Endpoint/Field bị ảnh hưởng                                               |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `ffa9814` / `d7c54c0` | Auto-tạo `ApplicationDetail status=PENDING` khi apply JD có round đầu là `MENTROR_REVIEW` / `AI_INTERVIEW` | `POST /api/applications`, `GET /api/application-details/application/{id}` |
| 2   | `d6e9b51`             | Cron job tự đóng JD hết hạn vào 00:00 mỗi ngày                                                             | `GET /api/job-descriptions`, `GET /api/job-descriptions/search`           |
| 3   | `213c399`             | User entity có thêm `createdAt`, `updatedAt`                                                               | Bất kỳ endpoint nào trả về `User` (profile, application list, ...)        |

> **Không liên quan:** 3 file `docs/releases/2026-07/Release_063-065_*.md` chỉ là auto-generated release notes (bảo trì).

---

## 1. Auto-create `ApplicationDetail` PENDING cho round Mentor Review / AI Interview

### 1.1 Backend đã làm gì

**File:** `src/main/java/fpt/org/inblue/service/impl/ApplicationServiceImpl.java`

```java
@Override
public Application applyForJob(Long jdId) {
    // ... save application ...
    Application savedApplication = applicationRepository.save(application);

    // Nếu vòng đầu tiên là MENTROR_REVIEW hoặc AI_INTERVIEW (không có luồng nộp bài),
    // cần tạo ApplicationDetail PENDING ngay lúc apply vì moveToNextRound() chưa bao giờ được gọi trước đó.
    if (jd.getRounds() != null && !jd.getRounds().isEmpty()) {
        Round firstRound = jd.getRounds().get(0);
        if (firstRound.getRoundType() == RoundType.MENTROR_REVIEW
                || firstRound.getRoundType() == RoundType.AI_INTERVIEW) {
            ApplicationDetail firstDetail = ApplicationDetail.builder()
                    .applicationId(savedApplication.getId())
                    .roundId(firstRound.getId())
                    .status(ApplicationDetailStatus.PENDING)
                    .build();
            applicationDetailRepository.save(firstDetail);
        }
    }

    return savedApplication;
}
```

**Đồng thời** trong `moveToNextRound()`:

```java
// Tự động tạo ApplicationDetail với status PENDING cho các vòng
// không có luồng nộp bài (MENTROR_REVIEW, AI_INTERVIEW)
Round nextRound = rounds.get(currentRoundOrder);
if (nextRound.getRoundType() == RoundType.MENTROR_REVIEW
        || nextRound.getRoundType() == RoundType.AI_INTERVIEW) {
    boolean alreadyExists = applicationDetailRepository
            .findByApplicationIdAndRoundId(currentApplication.getId(), nextRound.getId())
            .isPresent();
    if (!alreadyExists) {
        ApplicationDetail nextDetail = ApplicationDetail.builder()
                .applicationId(currentApplication.getId())
                .roundId(nextRound.getId())
                .status(ApplicationDetailStatus.PENDING)
                .build();
        applicationDetailRepository.save(nextDetail);
    }
}
```

→ Logic cũ: Phải qua `moveToNextRound()` (sau khi pass CV/Quiz/Coding) mới có `ApplicationDetail`. Giờ: **Apply xong là có luôn Detail** cho các round kiểu Mentor Review/AI Interview (không cần submit bài).

### 1.2 Endpoint & Response thay đổi như thế nào

#### `POST /api/applications?jdId={jdId}` — apply job

```bash
POST /api/applications?jdId=35
Authorization: Bearer <user_token>
```

**Response — TRƯỚC (chỉ trả Application):**

```json
{
  "id": 101,
  "userId": 30,
  "jdId": 35,
  "currentRoundOrder": 0,
  "status": "PENDING",
  "appliedAt": "...",
  "appliedCount": 1
}
```

**Response — SAU (apply xong nếu round đầu Mentor Review/AI Interview, BE sẽ tự save ApplicationDetail):**

```json
{
  "id": 101,
  "userId": 30,
  "jdId": 35,
  "currentRoundOrder": 0,
  "status": "PENDING",
  "appliedAt": "...",
  "appliedCount": 1
}
```

⚠️ **Response của `POST /api/applications` KHÔNG đổi** — chỉ có side-effect bên trong BE (tạo thêm 1 ApplicationDetail).

#### `GET /api/application-details/application/{applicationId}` — lấy danh sách Detail của application

```bash
GET /api/application-details/application/101
```

**Response — SAU khi fix:**

```json
[
  {
    "id": 555,
    "applicationId": 101,
    "roundId": 12,
    "status": "PENDING",        // ← quan trọng: luôn PENDING cho Mentor Review round đầu
    "finalScore": null,
    "sessionId": null,
    "bookingId": null,
    "startedAt": "2026-07-12T...",
    "completedAt": null,
    "mentorReview": null,
    "aiScore": null,
    "hrScore": null,
    ...
  }
]
```

**Trước đây** → `GET` trả `[]` (rỗng) với các JD round-đầu Mentor Review vì `moveToNextRound` chưa chạy.
**Giờ** → `GET` trả về mảng có 1 phần tử `status=PENDING`.

### 1.3 FE cần chỉnh gì

#### 1.3.1 Bỏ flow chờ "submit CV/Quiz" trước khi có `applicationDetailId`

**Trước (giả định FE cũ):**

```ts
// Flow cũ: Apply → chờ user submit bài round 1 → moveToNextRound → mới có detail cho Mentor Review
const apply = await api.applyForJob(jdId);
await userSubmitQuiz();
await api.moveToNextRound(apply.id);
const details = await api.getApplicationDetails(apply.id);
const mentorDetail = details.find((d) => d.roundId === mentorReviewRoundId);
navigateToMentorBooking(mentorDetail.id);
```

**Sau (đúng với master):**

```ts
// Flow mới: Apply xong, kiểm tra round đầu — nếu là Mentor Review thì có detail luôn
const apply = await api.applyForJob(jdId);

// Check round đầu của JD để biết type
const jd = await api.getJobDescription(jdId);
const firstRound = jd.rounds[0];

if (firstRound.roundType === "MENTROR_REVIEW" || firstRound.roundType === "AI_INTERVIEW") {
  // Detail đã được BE tạo sẵn, chỉ cần lấy
  const details = await api.getApplicationDetails(apply.id);
  const mentorDetail = details.find((d) => d.roundId === firstRound.id);
  if (!mentorDetail) {
    throw new Error("ApplicationDetail not found — bug BE");
  }
  navigateToMentorBooking({ applicationDetailId: mentorDetail.id });
} else {
  // Round đầu là CV/Quiz/Coding → flow cũ vẫn đúng
  navigateToSubmitQuiz(jdId);
}
```

#### 1.3.2 Enum `status` của ApplicationDetail — biết được các giá trị

Backend dùng 5 giá trị (xem `enums/ApplicationDetailStatus.java`):

```java
public enum ApplicationDetailStatus {
    PENDING,       // Vừa tạo / đang chờ làm
    SLOT_PICKED,   // Đã chọn slot mentor
    SUBMITTED,     // Đã nộp bài (round tự luận/email/coding)
    AI_EVALUATED,  // AI chấm xong
    COMPLETED      // HR chốt
}
```

→ FE chỉ cần thêm 2 giá trị mới `SLOT_PICKED` và `AI_EVALUATED` vào enum mapping, các giá trị còn lại giữ nguyên.

```ts
// types/application-detail.ts (hoặc tương đương)
export enum ApplicationDetailStatus {
  PENDING = "PENDING",
  SLOT_PICKED = "SLOT_PICKED",
  SUBMITTED = "SUBMITTED",
  AI_EVALUATED = "AI_EVALUATED",
  COMPLETED = "COMPLETED",
}
```

#### 1.3.3 Mapping logic cho UI hiển thị

| Status BE      | UI element gợi ý                                              |
| -------------- | ------------------------------------------------------------- |
| `PENDING`      | Nút "Bắt đầu" / "Chọn slot mentor"                            |
| `SLOT_PICKED`  | Đã book slot, đợi đến giờ / hiển thị countdown                |
| `SUBMITTED`    | Round nộp bài → thông báo "Đang chờ AI chấm"                  |
| `AI_EVALUATED` | Điểm AI hiển thị + "Chờ HR duyệt"                             |
| `COMPLETED`    | Round xong → hiển thị điểm cuối + cho phép move to next round |

---

## 2. Cron JD — Auto close JobDescription hết hạn

### 2.1 Backend đã làm gì

**File mới:** `src/main/java/fpt/org/inblue/schedule/JobDescriptionSchedule.java`

```java
public void closeExpiredJobDescriptions() {
    LocalDateTime now = LocalDateTime.now();
    List<JobDescription> expiredJds =
            jobDescriptionRepository.findByStatusAndDeadlineAtBefore(JobDescriptionStatus.OPEN, now);

    if (expiredJds.isEmpty()) {
        log.info("[JD Schedule] Không có JD nào hết hạn.");
        return;
    }

    for (JobDescription jd : expiredJds) {
        jd.setStatus(JobDescriptionStatus.CLOSED);
        log.info("[JD Schedule] Đóng JD id={}, title='{}', deadline={}",
                jd.getId(), jd.getTitle(), jd.getDeadlineAt());
    }
    jobDescriptionRepository.saveAll(expiredJds);
}
```

**Cron registration** trong `BackgroundScheduler.java`:

```java
// Chạy mỗi ngày lúc 00:00 để đóng các JD đã hết hạn (deadlineAt < now)
@Scheduled(cron = "0 0 0 * * ?")
public void scheduleCloseExpiredJobDescriptions() {
    jobDescriptionSchedule.closeExpiredJobDescriptions();
}
```

⚠️ **Lưu ý:** Cron `0 0 0 * * ?` chạy theo **server timezone** (mặc định Spring Boot dùng `UTC` trừ khi config `spring.jackson.time-zone` hoặc JVM flag). Server `api.kdz.asia` có thể là UTC → 00:00 UTC = **07:00 sáng VN**. Nên JD hết hạn sẽ chuyển sang `CLOSED` vào khoảng **07:00–07:05 sáng giờ VN** mỗi ngày.

**Repository method mới:**

```java
List<JobDescription> findByStatusAndDeadlineAtBefore(JobDescriptionStatus status, LocalDateTime now);
```

### 2.2 Endpoint & Response thay đổi

#### `GET /api/job-descriptions` — list JD

```bash
GET /api/job-descriptions
```

**Response item — TRƯỚC/SAU giống nhau nhưng value `status` thay đổi theo thời gian:**

```json
{
  "id": 35,
  "title": "Backend Developer (Java)",
  "status": "CLOSED",        // ← đổi từ OPEN → CLOSED khi qua deadline
  "deadlineAt": "2026-07-12T17:00:00",
  "appliedCount": 5,
  "isDeleted": false,
  ...
}
```

#### `GET /api/job-descriptions/search?titleKeyword=...&status=OPEN&...`

Filter theo status, FE chú ý:

- `OPEN` — JD còn hạn
- `CLOSED` — JD hết hạn (auto-close lúc 07:00 sáng VN)
- `DRAFT` — JD đang nháp (chưa publish)

### 2.3 FE cần chỉnh gì

#### 2.3.1 Disable nút "Apply" khi JD `CLOSED` (nếu trước đây FE chỉ check `status !== DRAFT`)

```ts
// Trước (có thể chỉ check:
if (jd.status === "OPEN") applyBtn.disabled = false;

// Sau (chính xác hơn):
const canApply =
  jd.status === "OPEN" && !jd.isDeleted && (!jd.deadlineAt || new Date(jd.deadlineAt) > new Date());
if (!canApply) {
  applyBtn.disabled = true;
  applyBtn.textContent = jd.status === "CLOSED" ? "Đã hết hạn" : "Không thể ứng tuyển";
}
```

#### 2.3.2 Refresh list JD khi user mở app vào buổi sáng (07:00 VN trở đi)

```ts
// Khi user mở app sau 07:00 sáng → force refresh list JD
import dayjs from "dayjs";

const lastFetchJD = localStorage.getItem("lastFetchJDDate");
const today = dayjs().format("YYYY-MM-DD");
const now = dayjs();

if (lastFetchJD !== today && now.hour() >= 7) {
  await refreshJobDescriptions();
  localStorage.setItem("lastFetchJDDate", today);
}
```

Hoặc đơn giản hơn: thêm `staleTime` ngắn trong React Query cho endpoint list JD:

```ts
useQuery(["job-descriptions"], fetchJD, {
  staleTime: 30 * 60 * 1000, // 30 phút — đủ để bắt thay đổi sau 07:00 sáng
});
```

#### 2.3.3 UI cho `CLOSED` status

```tsx
const JobStatusBadge = ({ status }: { status: JobDescriptionStatus }) => {
  const map = {
    OPEN: { color: "green", label: "Đang tuyển" },
    CLOSED: { color: "gray", label: "Đã đóng" },
    DRAFT: { color: "orange", label: "Bản nháp" },
  };
  return <Badge color={map[status].color}>{map[status].label}</Badge>;
};
```

---

## 3. `User` entity có thêm `createdAt`, `updatedAt`

### 3.1 Backend đã làm gì

**File:** `src/main/java/fpt/org/inblue/model/User.java`

```java
// Thêm 2 trường ở cuối class
private LocalDateTime createdAt;
private LocalDateTime updatedAt;
```

⚠️ **Lưu ý quan trọng:** 2 field này **CHƯA có `@CreationTimestamp` / `@UpdateTimestamp`** (xem diff với `InterviewSession.java` có `@CreationTimestamp`). Nghĩa là BE tự set ở runtime — kiểm tra thêm ở `UserService`:

→ Field sẽ có trong response JSON từ backend. Bạn có thể hiển thị nếu muốn, nhưng nếu null thì ẩn đi.

### 3.2 Response trả về từ mọi endpoint có User

```json
// GET /api/users/{id} (nếu có) hoặc user trong ApplicationDetail.Reviewer
{
  "id": 30,
  "name": "Nguyen Van A",
  "email": "a@x.com",
  "role": "ROLE_USER",
  "avatarUrl": "...",
  "createdAt": "2026-05-12T10:30:00", // ← MỚI (có thể null với user tạo trước)
  "updatedAt": "2026-07-12T11:00:00" // ← MỚI (có thể null với user tạo trước)
  // ... các field cũ giữ nguyên
}
```

### 3.3 FE cần chỉnh gì

#### 3.3.1 Update TypeScript type cho User

```ts
// types/user.ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatarUrl?: string;
  cvUrl?: string;
  // Thêm 2 field mới (optional vì có thể null với user cũ)
  createdAt?: string; // ISO datetime
  updatedAt?: string; // ISO datetime
}
```

#### 3.3.2 Hiển thị "Thành viên từ..." ở profile (optional)

```tsx
const MemberSince = ({ user }: { user: User }) => {
  if (!user.createdAt) return null;
  return (
    <p className="text-sm text-gray-500">Thành viên từ {dayjs(user.createdAt).format("MM/YYYY")}</p>
  );
};
```

---

## 4. Tổng kết nhanh — Checklist cho FE

| #   | Task FE                                                                              | Endpoint/Field liên quan                                                  | Ưu tiên |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------- |
| 1   | Bỏ flow "submit round 1 trước khi vào Mentor Booking" cho JD round đầu Mentor Review | `POST /api/applications`, `GET /api/application-details/application/{id}` | 🔴 P0   |
| 2   | Thêm 2 enum values `SLOT_PICKED`, `AI_EVALUATED` vào mapping UI                      | `ApplicationDetailStatus` enum                                            | 🔴 P0   |
| 3   | Disable nút Apply khi JD `CLOSED`                                                    | `GET /api/job-descriptions`, field `deadlineAt`                           | 🟡 P1   |
| 4   | Refresh list JD sau 07:00 sáng VN (auto-close window)                                | Cron chạy lúc 00:00 server (≈07:00 VN)                                    | 🟢 P2   |
| 5   | Optional: Hiển thị "Thành viên từ..." từ `user.createdAt`                            | `User.createdAt`, `User.updatedAt`                                        | 🟢 P3   |
| 6   | Update TS type User thêm `createdAt?`, `updatedAt?`                                  | Tất cả endpoint trả về User                                               | 🟢 P3   |

---

## 5. Những thứ KHÔNG thay đổi (vẫn như cũ — để FE không bối rối)

| Module/Field                           | Trạng thái                                         | Ghi chú                                                            |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `Session` + Daily.co webhook           | ❌ Vẫn lỗi                                         | Xem `docs/MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md` mục 3 |
| `userId` trong `JoinSessionDtoRequest` | Không đổi                                          | FE vẫn truyền `userId` của hệ thống (không phải mentor)            |
| `JoinSessionDtoRequest.sessionName`    | Không đổi                                          | Là `roomName` (không phải room URL)                                |
| `Application.overallScore`             | Logic cũ giữ nguyên                                | Tính sau khi qua hết rounds                                        |
| `Application.moveToNextRound()`        | Có thêm auto-detail cho Mentor Review/AI Interview | Xem 1.1                                                            |

---

## 6. Verify sau khi FE deploy — Test cases

### 6.1 Test case 1: Apply JD round đầu Mentor Review

```bash
# Setup: Tìm 1 JD có round đầu roundType = MENTROR_REVIEW
curl -s "https://api.kdz.asia/api/job-descriptions/search?titleKeyword=Java" \
  -H "Authorization: Bearer <hr_or_test_token>" | jq '.[] | select(.rounds[0].roundType == "MENTROR_REVIEW") | {id, title, firstRound: .rounds[0].id}'

# Step 1: Apply
curl -X POST "https://api.kdz.asia/api/applications?jdId=35" \
  -H "Authorization: Bearer <user_token>"

# Step 2: Verify đã có ApplicationDetail PENDING ngay
curl "https://api.kdz.asia/api/application-details/application/<applicationId>" \
  -H "Authorization: Bearer <user_token>"

# Expected: trả về array có 1 element { status: "PENDING", roundId: <firstRoundId> }
```

### 6.2 Test case 2: Auto-close JD

```bash
# Tìm JD sắp hết hạn
curl "https://api.kdz.asia/api/job-descriptions/search?status=OPEN" \
  -H "Authorization: Bearer <user_token>" | jq '.[] | select(.deadlineAt != null) | {id, title, deadlineAt, status}'

# Đợi tới 07:00 sáng VN ngày hôm sau (server 00:00 UTC)
# Refresh list → status chuyển OPEN → CLOSED
```

### 6.3 Test case 3: User createdAt

```bash
curl "https://api.kdz.asia/api/users/30" \
  -H "Authorization: Bearer <user_token>"

# Expected: response có field "createdAt" và "updatedAt"
```

---

## 7. Liên kết tham chiếu

- File điều tra bug Session Leave Time: `docs/MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md`
- Release notes mới pull về:
  - `docs/releases/2026-07/Release_063_2026-07-12.md` (User createdAt)
  - `docs/releases/2026-07/Release_064_2026-07-12.md` (Merge master)
  - `docs/releases/2026-07/Release_065_2026-07-12.md` (Merge master)

---

**Tóm lại:** FE chỉ cần điều chỉnh theo 3 thay đổi này — không cần đụng gì tới Session/Webhook/Mentor Interview flow gốc (vì session leave time vẫn đang chờ backend fix).
