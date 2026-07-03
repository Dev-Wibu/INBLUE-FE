# FE AI Agent — Mentor Review & AI Interview API Reference

> **Version**: 1.0 — Last updated: 2026-07-03
> **Backend Base**: `https://api.kdz.asia` · **OpenAPI Spec**: `/v3/api-docs`
> **Schema source**: `schema-from-be.d.ts` (regenerate with `pnpm generate-schema`)
> **API client**: `$api` (`openapi-fetch` + `openapi-react-query`) · **Auth**: JWT auto-injected via `useAuthStore`
> **Path alias**: `@/` maps to `src/` (always use `@/` imports, never relative paths)

---

## Mục lục

- [§1 — Mentor Review API](#1-mentor-review-api)
  - [1.1 GET /api/mentor-reviews — Lấy tất cả reviews](#11-get-apimentor-reviews--lấy-tất-cả-reviews)
  - [1.2 GET /api/mentor-reviews/{id} — Lấy review theo ID/session](#12-get-apimentor-reviewsid--lấy-review-theo-idsession)
  - [1.3 POST /api/mentor-reviews — Tạo review mới](#13-post-apimentor-reviews--tạo-review-mới)
  - [1.4 PUT /api/mentor-reviews — Update review](#14-put-apimentor-reviews--update-review)
- [§2 — Session Manager (Mock Interview)](#2--session-manager-mock-interview)
  - [2.1 sessionManager.create — Tạo session](#21-sessionmanagercreate--tạo-session)
  - [2.2 sessionManager.joinSession — Tham gia session](#22-sessionmanagerjoinsession--tham-gia-session)
  - [2.3 sessionManager.updateStatus — Cập nhật trạng thái thanh toán](#23-sessionmanagerupdatestatus--cập-nhật-trạng-thái-thanh-toán)
  - [2.4 sessionManager.makePayment — Tạo payment URL PayOS](#24-sessionmanagermakepayment--tạo-payment-url-payos)
  - [2.5 sessionManager.markSessionAsPaid — Sync trạng thái PAID (resilience)](#25-sessionmanagermarksessionaspaid--sync-trạng-thái-paid-resilience)
  - [2.6 Session lifecycle & status flow](#26-session-lifecycle--status-flow)
- [§3 — AI Interview API](#3--ai-interview-api)
  - [3.1 GET /api/interview-sessions/config-options](#31-get-apiinterview-sessionsconfig-options)
  - [3.2 POST /api/interview-sessions/create-session](#32-post-apiinterview-sessionscreate-session)
  - [3.3 GET /api/v1/interview/start/{sessionKey}](#33-get-apiv1interviewstartsessionkey)
  - [3.4 POST /api/v1/interview/submit](#34-post-apiv1interviewsubmit)
  - [3.5 GET /api/interview-sessions/{sessionId} — Xem kết quả](#35-get-apiinterview-sessionssessionid--xem-kết-quả)
- [§4 — Luồng tích hợp hoàn chỉnh](#4--luồng-tích-hợp-hoàn-chỉnh)
  - [4.1 Mentor Interview (Mock Interview)](#41-mentor-interview-mock-interview)
  - [4.2 AI Interview](#42-ai-interview)
  - [4.3 Application Mentor Review (Tuyển dụng)](#43-application-mentor-review-tuyển-dụng)
- [§5 — Mã nguồn tham chiếu](#5--mã-nguồn-tham-chiếu)
- [§6 — Known Issues & Gotchas](#6--known-issues--gotchas)

---

## §1 — Mentor Review API

### 1.1 GET /api/mentor-reviews — Lấy tất cả reviews

**Mục đích**: Lấy tất cả mentor reviews (dùng trong Mentor/Admin overview, stats).

**Query params** (tuỳ chọn):

| Param  | Type     | Mô tả                                  |
| ------ | -------- | -------------------------------------- |
| `page` | `number` | Số trang (bắt đầu từ 0)                |
| `size` | `number` | Số item mỗi trang                      |
| `sort` | `string` | Trường sắp xếp, ví dụ `createdAt,desc` |

**Code mẫu**:

```typescript
// Dùng $api (React Query)
const { data: reviews, isLoading } = $api.useQuery("get", "/api/mentor-reviews", {
  params: { query: { page: 0, size: 10 } },
});

// Hoặc dùng hook useMentorReviews (wrapper có sẵn, có toast + error handling)
import { useMentorReviews } from "@/hooks/useMentorReview";
const { data: reviews } = useMentorReviews();

// Filter theo mentor
const mentorReviews = reviews?.filter((r) => r.mentor?.id === mentorId);

// Filter theo user
import { useMentorReviewsByUser } from "@/hooks/useMentorReview";
const { data: userReviews } = useMentorReviewsByUser(userId);
```

**TypeScript response** (`schema-from-be.d.ts` line ~2093):

```typescript
MentorReview: {
  id?: number;
  session?: Session;
  mentor?: Mentor;
  user?: User;
  rating?: number;
  situationNote?: string;  // STAR: hoàn cảnh
  taskNote?: string;      // STAR: nhiệm vụ
  actionNote?: string;    // STAR: hành động
  resultNote?: string;    // STAR: kết quả
  strength?: string;      // Điểm mạnh của mentor
  weakness?: string;      // Điểm cần cải thiện
  improve?: string;       // Gợi ý cải thiện
}
```

---

### 1.2 GET /api/mentor-reviews/{id} — Lấy review theo ID/session

**Mục đích**: Lấy chi tiết 1 review theo `id`.

> ⚠️ Path param là **`id` (review ID)**, không phải `sessionId`. Để lấy review theo session, dùng `useMentorReviewBySession(sessionId)`.

**Code mẫu**:

```typescript
// Theo review ID
import { useMentorReviewById } from "@/hooks/useMentorReview";
const { data: review } = useMentorReviewById(reviewId);

// Theo session ID (filter từ list)
import { useMentorReviewBySession } from "@/hooks/useMentorReview";
const { data: review } = useMentorReviewBySession(sessionId);

// Tính điểm trung bình
import { calculateAverageRating } from "@/hooks/useMentorReview";
const avgRating = calculateAverageRating(reviews ?? []);
```

---

### 1.3 POST /api/mentor-reviews — Tạo review mới

**Mục đích**: Tạo mới 1 mentor review.

> ⚠️ **Validation**: Backend yêu cầu ít nhất `rating > 0` HOẶC ít nhất 1 trường STAR. Frontend validation nên check cả 2.

**Request body** (`CreateMentorReviewRequest`):

```typescript
{
  sessionId?: number;       // Required — session đang review
  mentorId?: number;        // Required — mentor được review
  userId?: number;          // Required — user viết review
  rating?: number;          // 1–5 sao (optional nhưng nên yêu cầu)
  situationNote?: string;   // STAR: hoàn cảnh
  taskNote?: string;        // STAR: nhiệm vụ
  actionNote?: string;      // STAR: hành động
  resultNote?: string;      // STAR: kết quả
  strength?: string;        // Điểm mạnh của mentor
  weakness?: string;        // Điểm cần cải thiện
  improve?: string;        // Gợi ý cải thiện
}
```

**Code mẫu**:

```typescript
// Dùng hook useCreateMentorReview (recommended — có auto-toast + cache invalidation)
import { useCreateMentorReview } from "@/hooks/useMentorReview";
const createReview = useCreateMentorReview();
createReview.mutate({
  sessionId: 123,
  mentorId: 456,
  userId: 789,
  rating: 5,
  situationNote: "Tôi phỏng vấn vị trí Frontend Developer...",
  taskNote: "Thí sinh cần hoàn thành bài test thuật toán...",
  actionNote: "Tôi đã trình bày giải pháp sử dụng...",
  resultNote: "Kết quả: giải được 3/5 bài...",
  strength: "Mentor giải thích rất chi tiết và dễ hiểu",
  weakness: "Thời gian hơi ngắn",
  improve: "Nên kéo dài thời gian thêm 15 phút",
});

// Hoặc dùng $api trực tiếp
import { $api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

const createReview = $api.useMutation("post", "/api/mentor-reviews");
const result = await createReview.mutateAsync({
  sessionId, mentorId, userId, rating, ...
});
queryClient.invalidateQueries({ queryKey: ["get", "/api/mentor-reviews"] });
```

**Error handling**: Backend trả về 400 nếu validation fail.

---

### 1.4 PUT /api/mentor-reviews — Update review

**Mục đích**: Update 1 review có sẵn.

> ⚠️ **Khác biệt quan trọng so với POST**: Body chỉ cần `id` (không cần `sessionId`, `mentorId`, `userId`). Backend dùng `id` để xác định review cần update.

**Request body** (`UpdateMentorReviewRequest`):

```typescript
{
  id?: number;              // Required — ID của review cần update
  rating?: number;          // 1–5 sao
  situationNote?: string;
  taskNote?: string;
  actionNote?: string;
  resultNote?: string;
  strength?: string;
  weakness?: string;
  improve?: string;
}
```

**Code mẫu**:

```typescript
import { useUpdateMentorReview } from "@/hooks/useMentorReview";
const updateReview = useUpdateMentorReview();
updateReview.mutate({
  id: reviewId,
  rating: 4,
  situationNote: "Updated: Tôi phỏng vấn...",
});
```

---

## §2 — Session Manager (Mock Interview)

### SessionManager — Wrapper hoàn chỉnh cho session operations

**File**: `src/services/session.manager.ts`
**Instance**: `sessionManager`

```typescript
import { sessionManager } from "@/services";

// Methods:
sessionManager.getAll(params?)            // GET /api/sessions
sessionManager.getById(id)               // GET /api/sessions/{id}
sessionManager.getByUserId(userId)        // GET /api/sessions/{userId}/by-user
sessionManager.create(data)               // POST /api/sessions/create-session
sessionManager.joinSession(data)          // POST /api/sessions/join-session
sessionManager.updateStatus(sessionId, isApproved)  // GET /api/sessions/update-status
sessionManager.makePayment(sessionId)     // GET /api/sessions/make-payment → checkoutUrl
sessionManager.markSessionAsPaid(sessionId, transactionCode?)  // PUT /api/sessions (resilience)
sessionManager.markSessionAsPaidWithRetry(sessionId, transactionCode?, maxAttempts?)  // Retry helper
sessionManager.update(id, data)           // PUT /api/sessions
sessionManager.delete(id)                 // PUT /api/sessions (status=REJECTED)
```

---

### 2.1 sessionManager.create — Tạo session

**Mục đích**: Tạo phòng Daily.co cho buổi mock interview với mentor.

**Request types** (`SessionCreationRequest`):

```typescript
// Cách 1: Full request với DailyCo options
sessionManager.create({
  userId: 1,
  mentorId: 2,
  joinTime: "2026-07-10T09:00:00Z", // ISO datetime — backend nhận UTC
  duration: 60, // phút
  totalPrice: 150000, // VND
  dailyCoCreationRequest: {
    name: "Mock Interview Room",
    privacy: "public",
    properties: {
      max_participants: 2,
      start_video_off: true,
      start_audio_off: true,
      enable_screenshare: true,
      exp: 0,
      enable_recording: "cloud",
    },
  },
});

// Cách 2: Simplified request (tự động tạo DailyCo options)
sessionManager.create({
  userId: 1,
  mentorId: 2,
  duration: 60,
  totalPrice: 150000,
  // dailyCoCreationRequest được tự động normalize
});
```

**Response**: `Session` object với `roomUrl` (Daily.co URL).

> ⚠️ **Datetime handling**: `joinTime` backend nhận UTC. Dùng `localDatetimeLocalToUtc()` hoặc `formatToVietnamISOString()` trước khi gửi.

---

### 2.2 sessionManager.joinSession — Tham gia session

**Mục đích**: Ghi nhận user tham gia session (tạo participant record trong DB).

**Request** (`JoinSessionRequest`):

```typescript
interface JoinSessionRequest {
  sessionName?: string; // Tên phòng (từ session.roomName)
  userId?: number;
  participantId?: string; // Daily.co participant ID
  isMentor: boolean; // ⚠️ CRITICAL: phải là boolean rõ ràng, không null/undefined
}
```

**Code mẫu** (`SessionRoomPage.tsx` line 60):

```typescript
// USER joins
const joinSessionMutation = useJoinSession();
await joinSessionMutation.mutateAsync({
  sessionName: session.roomName,
  userId: user.id,
  participantId: dailyCoParticipantId,
  isMentor: false, // ← Boolean rõ ràng, không null/undefined
});

// MENTOR joins
await sessionManager.joinSession({
  sessionName: session.roomName,
  userId: user.id,
  participantId: dailyCoParticipantId,
  isMentor: true, // ← Boolean rõ ràng
});
```

> ⚠️ **Critical**: `isMentor` phải là `true` hoặc `false`. Backend Spring Boot không deserialize `null`/`undefined` thành boolean.

---

### 2.3 sessionManager.updateStatus — Cập nhật trạng thái thanh toán

**Mục đích**: Cập nhật trạng thái thanh toán session.

```typescript
// Thanh toán thành công → status = PAID
await sessionManager.updateStatus(sessionId, true);

// Từ chối thanh toán → status = REJECTED
await sessionManager.updateStatus(sessionId, false);
```

---

### 2.4 sessionManager.makePayment — Tạo payment URL PayOS

**Mục đích**: Tạo payment checkout URL (PayOS).

```typescript
const result = await sessionManager.makePayment(sessionId);
if (result.success) {
  // result.data = checkoutUrl (string)
  window.location.href = result.data;
}
```

> Manager tự động extract checkout URL từ nhiều field names: `checkoutUrl`, `paymentUrl`, `redirectUrl`, `link`, `url`, hoặc nested `data.*`.

---

### 2.5 sessionManager.markSessionAsPaid — Sync trạng thái PAID (resilience)

**Mục đích**: Resilience path khi payment callback chưa kịp cập nhật status. Đọc session từ DB → build payload → PUT `/api/sessions` với `status=PAID`.

```typescript
// Gọi sau khi payment redirect về thành công
const result = await sessionManager.markSessionAsPaid(sessionId, transactionCode);
if (result.success) {
  // Session đã sync sang PAID
}

// Retry với exponential backoff (3 attempts, 500ms/1s/1.5s)
const resultWithRetry = await sessionManager.markSessionAsPaidWithRetry(
  sessionId,
  transactionCode,
  3 // maxAttempts
);
```

**Code flow trong `SessionRoomPage.tsx`** (lines 85–124):

```typescript
// Khi session.status === "SCHEDULED" (chưa PAID)
// Kiểm tra localStorage có pending sync context không
const pendingSync = getPendingSessionPaidStatusSync(session.id, userId);

if (pendingSync && canRetryPendingSessionPaidStatusSync(pendingSync)) {
  // Sync với retry
  const syncResult = await sessionManager.markSessionAsPaidWithRetry(
    session.id,
    pendingSync.transactionCode,
    3
  );
  if (syncResult.success) {
    clearPendingSessionPaidStatusSync(session.id, userId);
    await refetchSession(); // Refresh UI
  }
}
```

---

### 2.6 Session lifecycle & status flow

```
DRAFT ──(updateStatus isApproved=true)──→ SCHEDULED
                                         │
                                         │ (payment callback)
                                         ▼
                                       PAID
                                         │
                                         │ (user/mentor joins call)
                                         ▼
                                      ONGOING
                                         │
                                         │ (call ends, webhook)
                                         ▼
                                    COMPLETED

DRAFT ──(updateStatus isApproved=false)──→ REJECTED
    │                                        │
    └──(delete)──────────────────────────┘
```

| Status      | Mô tả                           | User có thể join? |
| ----------- | ------------------------------- | ----------------- |
| `DRAFT`     | Session mới tạo, chưa approve   | ❌                |
| `SCHEDULED` | Đã approve, đang đợi thanh toán | ❌                |
| `PAID`      | Đã thanh toán thành công        | ✅                |
| `ONGOING`   | Cuộc gọi đang diễn ra           | ✅                |
| `COMPLETED` | Đã kết thúc                     | ❌                |
| `REJECTED`  | Bị từ chối/hủy                  | ❌                |
| `CANCELED`  | Bị hủy                          | ❌                |

---

## §3 — AI Interview API

### 3.1 GET /api/interview-sessions/config-options

**Mục đích**: Lấy danh sách options cho UI setup (mode, difficulty, language).

```typescript
const { data: configOptions } = $api.useQuery("get", "/api/interview-sessions/config-options");
```

---

### 3.2 POST /api/interview-sessions/create-session

**Mục đích**: Tạo AI interview session mới.

**Request body**: Tùy thuộc vào mode:

```typescript
// STANDARD_MOCK (Phỏng vấn thử)
{
  mode: "STANDARD_MOCK",
  difficulty: "FRESHER_BASIC",
  language: "VI",
  domain: "IT",
  candidateProfile: {
    targetRole: "Frontend Developer",
    targetLevel: "Junior",
    technicalSkills: ["React", "TypeScript", "CSS"],
    softSkills: ["Communication"],
    // ...
  },
  sessionConfig: {
    duration_minutes: 45,
    // ...
  },
}

// THEORY_CHECK (Kiểm tra lý thuyết)
// → Backend tự sinh quiz questions

// PROJECT_DEFENSE (Bảo vệ dự án)
// → Backend cần project info trong configData
```

**Response**:

> ⚠️ **Quan trọng**: Response trả về **`sessionKey`** (UUID string) — dùng để resume/interact với session. **`sessionId`** (number) dùng để view result.

```typescript
{
  sessionId: number; // Dùng cho /api/interview-sessions/{sessionId}
  sessionKey: string; // UUID — dùng cho /api/v1/interview/start/{sessionKey}
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  // ...
}
```

**Code mẫu** (`AIInterviewListPage.tsx`):

```typescript
const createSession = $api.useMutation("post", "/api/interview-sessions/create-session");
const result = await createSession.mutateAsync({
  mode: "STANDARD_MOCK",
  difficulty: "FRESHER_BASIC",
  language: "VI",
  domain: "IT",
  candidateProfile: {
    targetRole: "Frontend Developer",
    targetLevel: "Junior",
    technicalSkills: ["React", "TypeScript", "CSS"],
  },
});

if (result.data?.sessionKey) {
  navigate(`/user/ai-interview/session?sessionKey=${result.data.sessionKey}`);
}
```

**SessionKey Expiry** (`AIInterviewListPage.tsx` line 32):

```typescript
// SessionKey hết hạn sau 1 giờ kể từ lúc tạo
const SESSION_EXPIRY_MS = 60 * 60 * 1000;
const isSessionExpired = (createdAt?: string) => {
  const createdTimestamp = toUtcNaiveTimestamp(createdAt);
  if (!createdTimestamp) return true;
  return Date.now() - createdTimestamp >= SESSION_EXPIRY_MS;
};
```

---

### 3.3 GET /api/v1/interview/start/{sessionKey}

**Mục đích**: Bắt đầu/kích hoạt AI interview — trả về câu hỏi đầu tiên.

```typescript
const { data: firstQuestion } = $api.useQuery("get", "/api/v1/interview/start/{sessionKey}", {
  params: { path: { sessionKey } },
});
// → firstQuestion chứa questionText, questionType, questionOrder
```

---

### 3.4 POST /api/v1/interview/submit

**Mục đích**: Gửi câu trả lời → nhận câu hỏi tiếp theo hoặc kết quả cuối.

```typescript
const submitAnswer = $api.useMutation("post", "/api/v1/interview/submit");
const result = await submitAnswer.mutateAsync({
  sessionKey,
  answerText: userAnswer,
});

// Kết thúc interview
if (result.data?.finished) {
  navigate(`/user/ai-interview/result/${result.data.sessionId}`);
} else {
  // Hiển thị câu hỏi tiếp theo
  setCurrentQuestion(result.data);
}
```

---

### 3.5 GET /api/interview-sessions/{sessionId} — Xem kết quả

**Mục đích**: Lấy chi tiết session và kết quả (Q&A history, scores, feedback).

```typescript
const {
  data: session,
  isLoading,
  isError,
} = $api.useQuery(
  "get",
  "/api/interview-sessions/{sessionId}",
  {
    params: {
      path: {
        sessionId: Number(id), // id từ useParams
      },
    },
  },
  {
    enabled: !!id,
  }
);
```

**Response data structure** (`AIInterviewResultPage.tsx` lines 310–460):

```typescript
{
  id: number;
  sessionKey: string;
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  mode: "STANDARD_MOCK" | "THEORY_CHECK" | "PROJECT_DEFENSE";
  domain: "IT" | "NON_IT";
  overallScore: number;           // 0–10
  result: "STRONG_HIRE" | "HIRE" | "CONSIDER" | "REJECT";

  resultDetail: {
    history: QAPair[];            // Array câu hỏi–câu trả lời
    aiOverviewFeedback: string;   // Nhận xét tổng quan
    improvementPlan: string;       // Kế hoạch cải thiện
  };

  blueprint: {
    strategy_analysis: string;     // Phân tích chiến lược phỏng vấn
  };

  candidateProfile: {
    targetRole: string;
    targetLevel: string;
    technicalSkills: string[];
    softSkills: string[];
    tools: string[];
  };

  sessionConfig: {
    difficulty: "FRESHER_BASIC" | "FRESHER_ADVANCED";
    language: "VI" | "EN";
    duration_minutes: number;
  };

  jobRequirement: {
    basic_info: { job_title: string };
  };

  createdAt: string;
  updatedAt: string;
  completedAt: string;
}
```

**Q&A History grouping** (`AIInterviewResultPage.tsx` lines 316–332):

```typescript
// Nhóm FOLLOW_UP vào sau BLUEPRINT tương ứng
const groupedHistory = history.reduce(
  (groups, qa) => {
    if (qa.questionType === "FOLLOW_UP" && groups.length > 0) {
      groups[groups.length - 1].followUps.push(qa);
    } else {
      groups.push({ blueprint: qa, followUps: [] });
    }
    return groups;
  },
  [] as { blueprint: QAItem; followUps: QAItem[] }[]
);

// Mỗi blueprint có thể có nhiều follow-ups
// Hiển thị trong QACard với border-left màu violet
```

---

## §4 — Luồng tích hợp hoàn chỉnh

### 4.1 Mentor Interview (Mock Interview)

```
┌──────────────────────────────────────────────────────────────────┐
│  1. USER chọn Mentor → Navigate đến /user/mock-interview/schedule │
├──────────────────────────────────────────────────────────────────┤
│  2. Tạo Session (MockInterviewSelectMentorPage)                  │
│     sessionManager.create({ userId, mentorId, duration, price }) │
│     → Lưu roomUrl (Daily.co)                                    │
├──────────────────────────────────────────────────────────────────┤
│  3. Thanh toán (BookingSuccessPage → PaymentSuccessPage)         │
│     sessionManager.makePayment(sessionId) → PayOS redirect       │
│     → Callback: sessionManager.updateStatus(sessionId, true)     │
│     → session.status = PAID                                     │
├──────────────────────────────────────────────────────────────────┤
│  4. USER join phòng (SessionRoomPage)                            │
│     VideoCallRoom → handleJoined() →                             │
│     sessionManager.joinSession({ sessionName, userId, isMentor: false })
├──────────────────────────────────────────────────────────────────┤
│  5. MENTOR join phòng (MentorSessionRoomPage)                    │
│     → sessionManager.joinSession({ ..., isMentor: true })        │
├──────────────────────────────────────────────────────────────────┤
│  6. Daily.co webhook → Backend cập nhật status = ONGOING/COMPLETED│
├──────────────────────────────────────────────────────────────────┤
│  7. USER viết Review (SessionDetailPage → WriteReviewPage)       │
│     POST /api/mentor-reviews                                     │
│     Body: { sessionId, mentorId, userId, rating, STAR... }       │
├──────────────────────────────────────────────────────────────────┤
│  8. MENTOR viết Feedback (MentorSessionDetailPage)               │
│     POST /api/feedback                                           │
├──────────────────────────────────────────────────────────────────┤
│  9. MENTOR xem Reviews (MentorReviewsPage)                       │
│     GET /api/mentor-reviews                                     │
└──────────────────────────────────────────────────────────────────┘
```

**Code hoàn chỉnh**:

```typescript
// 1. Tạo session
const sessionResult = await sessionManager.create({
  userId: currentUser.id,
  mentorId: selectedMentor.id,
  duration: 60,
  totalPrice: selectedMentor.pricePerMinute * 60,
});
if (!sessionResult.success) {
  /* handle error */
}

// 2. Thanh toán
const paymentResult = await sessionManager.makePayment(sessionResult.data.id);
if (paymentResult.success) {
  window.location.href = paymentResult.data;
}

// 3. Payment callback (PaymentSuccessPage)
const syncResult = await sessionManager.markSessionAsPaidWithRetry(sessionId, transactionCode, 3);
if (syncResult.success) {
  navigate(`/user/mock-interview/booking-success`);
}

// 4. Join phòng (SessionRoomPage)
await sessionManager.joinSession({
  sessionName: session.roomName,
  userId: user.id,
  participantId: dailyCoParticipantId,
  isMentor: false,
});

// 5. Viết review
import { useCreateMentorReview } from "@/hooks/useMentorReview";
const createReview = useCreateMentorReview();
createReview.mutate({
  sessionId: sessionId,
  mentorId: mentor.id,
  userId: user.id,
  rating: 5,
  situationNote: "Tôi phỏng vấn vị trí Frontend Developer...",
  taskNote: "Cần trả lời các câu hỏi...",
  actionNote: "Tôi đã...",
  resultNote: "Kết quả...",
  strength: "Mentor rất nhiệt tình",
  improve: "Nên cho thêm thời gian",
});
```

---

### 4.2 AI Interview

```
┌──────────────────────────────────────────────────────────────────┐
│  1. Setup (AIInterviewSetupPage)                                  │
│     → Chọn mode, difficulty, language, candidate profile          │
│     → POST /api/interview-sessions/create-session                 │
│     → Lấy sessionKey (UUID) + sessionId (number)                │
│     → Navigate /user/ai-interview/session?sessionKey=...        │
├──────────────────────────────────────────────────────────────────┤
│  2. Bắt đầu (AIInterviewSessionPage)                             │
│     GET /api/v1/interview/start/{sessionKey}                    │
│     → Nhận câu hỏi đầu tiên (questionType=BLUEPRINT)           │
├──────────────────────────────────────────────────────────────────┤
│  3. Vòng lặp: Trả lời → Nhận câu hỏi tiếp                     │
│     POST /api/v1/interview/submit                                │
│     Body: { sessionKey, answerText }                            │
│     → Câu hỏi tiếp theo (BLUEPRINT hoặc FOLLOW_UP)            │
│     → Đến khi { finished: true, sessionId }                    │
├──────────────────────────────────────────────────────────────────┤
│  4. Xem kết quả (AIInterviewResultPage)                          │
│     GET /api/interview-sessions/{sessionId}                       │
│     → Hiển thị overallScore, result, Q&A history               │
│     → Feedback, improvement plan, strategy analysis              │
│     → Tạo roadmap (nếu session COMPLETED)                     │
└──────────────────────────────────────────────────────────────────┘
```

**Code hoàn chỉnh**:

```typescript
// 1. Tạo session
const createSession = $api.useMutation("post", "/api/interview-sessions/create-session");
const result = await createSession.mutateAsync({
  mode: "STANDARD_MOCK",
  difficulty: "FRESHER_BASIC",
  language: "VI",
  domain: "IT",
  candidateProfile: {
    targetRole: "Frontend Developer",
    targetLevel: "Junior",
    technicalSkills: ["React", "TypeScript"],
  },
});

if (result.data?.sessionKey) {
  navigate(`/user/ai-interview/session?sessionKey=${result.data.sessionKey}`);
}

// 2. Bắt đầu (trong AIInterviewSessionPage)
const { data: firstQuestion } = $api.useQuery("get", "/api/v1/interview/start/{sessionKey}", {
  params: { path: { sessionKey } },
});

// 3. Submit câu trả lời (vòng lặp)
const submitAnswer = $api.useMutation("post", "/api/v1/interview/submit");
const nextResult = await submitAnswer.mutateAsync({
  sessionKey,
  answerText: userAnswer,
});

if (nextResult.data?.finished) {
  navigate(`/user/ai-interview/result/${nextResult.data.sessionId}`);
} else {
  setCurrentQuestion(nextResult.data);
}

// 4. Xem kết quả (AIInterviewResultPage)
const { data: session } = $api.useQuery("get", "/api/interview-sessions/{sessionId}", {
  params: { path: { sessionId: Number(id) } },
});
// → session.overallScore, session.result, session.resultDetail.history

// Tạo roadmap
import { practiceSetManager } from "@/services";
const roadmapResult = await practiceSetManager.createByAI({
  aiInterviewId: Number(id),
  dateNumber: 30,
});
if (roadmapResult.success) {
  navigate(`/user/practice/session/${id}`);
}
```

---

### 4.3 Application Mentor Review (Tuyển dụng)

```
┌──────────────────────────────────────────────────────────────────┐
│  Luồng: Ứng viên nộp đơn → Rounds (CV, Quiz, Mentor Interview)  │
├──────────────────────────────────────────────────────────────────┤
│  1. Lấy Round Config (mentorInterview)                           │
│     useCurrentRound(applicationId)                                │
│     → mentorInterview: { mentorId, mentorName, duration, price } │
├──────────────────────────────────────────────────────────────────┤
│  2. Thanh toán Mentor Review Round                               │
│     (dùng sessionManager.makePayment/updateStatus)               │
├──────────────────────────────────────────────────────────────────┤
│  3. Hoàn thành phỏng vấn với Mentor (Daily.co)                  │
├──────────────────────────────────────────────────────────────────┤
│  4. Nộp Review (ApplicationMentorReviewPage)                     │
│     POST /api/application-details/mentor-review/submit          │
│     Body: { applicationId, roundId, sessionId, mentorId,         │
│             userId, rating, situationNote, taskNote,             │
│             actionNote, resultNote, strength, weakness, improve }│
├──────────────────────────────────────────────────────────────────┤
│  5. Kiểm tra đã submit chưa (hiển thị form đã nộp)             │
│     applicationDetailManager.getByApplicationId(appId)            │
│     → find detail where roundId matches && mentorReview exists   │
└──────────────────────────────────────────────────────────────────┘
```

> ⚠️ **Khác biệt quan trọng**: Endpoint cho Application flow là **`/api/application-details/mentor-review/submit`** (khác với `/api/mentor-reviews` dùng trong Mock Interview).

**Code hoàn chỉnh** (`ApplicationMentorReviewPage.tsx` lines 77–130):

```typescript
// Lấy round config
const { data: currentRound } = useCurrentRound(applicationId, !!applicationId);
const mentorInfo = currentRound?.configData?.mentorInterview;

// Kiểm tra đã submit chưa
const [existingDetail, setExistingDetail] = useState<ApplicationDetail | null>(null);
useEffect(() => {
  if (!applicationId || !roundId) return;
  applicationDetailManager.getByApplicationId(applicationId).then((res) => {
    if (res.success && res.data) {
      const detail = res.data.find((d) => d.roundId === roundId);
      if (detail) setExistingDetail(detail);
    }
  });
}, [applicationId, roundId]);

// Submit review
const handleSubmit = async () => {
  const payload = {
    sessionId: 0,
    mentorId: mentorInfo?.mentorId ?? 0,
    userId: user.id,
    rating,
    situationNote: situationNote.trim() || undefined,
    taskNote: taskNote.trim() || undefined,
    actionNote: actionNote.trim() || undefined,
    resultNote: resultNote.trim() || undefined,
    strength: strength.trim() || undefined,
    weakness: weakness.trim() || undefined,
    improve: improve.trim() || undefined,
  };

  const response = await fetch("/api/application-details/mentor-review/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId, roundId, ...payload }),
  });

  if (response.ok) {
    toast.success(t("userApplicationhistory.reviewSubmittedSuccessfully"));
    navigate(-1);
  }
};

// Disable submit button nếu đã submit
const canSubmit = rating > 0 && (situationNote.trim() || taskNote.trim() || actionNote.trim() || resultNote.trim());
<Button disabled={!canSubmit || isSubmitting || !!existingDetail?.mentorReview} ...>
```

---

## §5 — Mã nguồn tham chiếu

### Hooks

| Hook                       | File                           | Mô tả                                          |
| -------------------------- | ------------------------------ | ---------------------------------------------- |
| `useMentorReviews`         | `src/hooks/useMentorReview.ts` | Lấy tất cả reviews                             |
| `useMentorReviewById`      | `src/hooks/useMentorReview.ts` | Lấy review theo ID                             |
| `useMentorReviewBySession` | `src/hooks/useMentorReview.ts` | Lấy review theo session                        |
| `useMentorReviewsByMentor` | `src/hooks/useMentorReview.ts` | Filter reviews theo mentor                     |
| `useMentorReviewsByUser`   | `src/hooks/useMentorReview.ts` | Filter reviews theo user                       |
| `useCreateMentorReview`    | `src/hooks/useMentorReview.ts` | Tạo review (auto-toast, cache invalidation)    |
| `useUpdateMentorReview`    | `src/hooks/useMentorReview.ts` | Update review (auto-toast, cache invalidation) |
| `useDeleteMentorReview`    | `src/hooks/useMentorReview.ts` | Delete review (Admin only)                     |
| `calculateAverageRating`   | `src/hooks/useMentorReview.ts` | Tính điểm TB từ array reviews                  |
| `useSessionById`           | `src/hooks/useSession.ts`      | Lấy session theo ID                            |
| `useJoinSession`           | `src/hooks/useSession.ts`      | Join session mutation                          |

### Managers

| Manager                    | File                                         | Mô tả                               |
| -------------------------- | -------------------------------------------- | ----------------------------------- |
| `mentorReviewManager`      | `src/services/mentor-review.manager.ts`      | CRUD cho MentorReview               |
| `sessionManager`           | `src/services/session.manager.ts`            | Session/Daily.co/Payment operations |
| `practiceSetManager`       | `src/services/practice-set.manager.ts`       | AI roadmap creation                 |
| `applicationDetailManager` | `src/services/application-detail.manager.ts` | Application rounds                  |

### Pages

| Page                          | Route                                     | Mô tả                          |
| ----------------------------- | ----------------------------------------- | ------------------------------ |
| `ApplicationMentorReviewPage` | `/user/application/:id/mentor-review`     | Review mentor trong tuyển dụng |
| `AIInterviewResultPage`       | `/user/ai-interview/result/:id`           | Kết quả AI interview           |
| `AIInterviewListPage`         | `/user?tab=aiInterview`                   | Danh sách AI interview         |
| `SessionRoomPage`             | `/user/mock-interview/room/:sessionId`    | Phòng video call (User)        |
| `MentorSessionRoomPage`       | `/mentor/sessions/room/:sessionId`        | Phòng video call (Mentor)      |
| `SessionDetailPage`           | `/user/mock-interview/history/:sessionId` | Chi tiết session               |
| `MentorReviewsPage`           | `/mentor?tab=reviews`                     | Reviews cho mentor             |
| `ReviewModerationPage`        | `/staff/reviews`                          | Staff moderation reviews       |

### Components

| Component           | File                                         | Mô tả                         |
| ------------------- | -------------------------------------------- | ----------------------------- |
| `MentorReviewForm`  | `src/components/review/MentorReviewForm.tsx` | Form STAR method (dùng chung) |
| `ReviewCard`        | `src/components/review/ReviewCard.tsx`       | Hiển thị 1 review             |
| `ReviewStats`       | `src/components/review/ReviewStats.tsx`      | Stats tổng hợp review         |
| `VideoCallRoom`     | `src/components/video-call/`                 | Daily.co video room           |
| `DeviceCheckDialog` | `src/components/video-call/`                 | Check mic/camera trước call   |

---

## §6 — Known Issues & Gotchas

### 6.1 `isMentor` Boolean Trap ⚠️ CRITICAL

Backend Spring Boot **KHÔNG deserialize** `null`/`undefined` thành `boolean`. Khi gọi `sessionManager.joinSession()`:

```typescript
// ❌ Sai — isMentor = undefined sẽ không deserialize đúng
await sessionManager.joinSession({
  sessionName: session.roomName,
  userId: user.id,
  isMentor: currentUser.role === "MENTOR" ? true : false, // undefined case!
});

// ✅ Đúng — luôn gửi boolean rõ ràng
await sessionManager.joinSession({
  sessionName: session.roomName,
  userId: user.id,
  participantId,
  isMentor: currentUser.role === "MENTOR", // Luôn là boolean
});
```

### 6.2 SessionKey Expiry

SessionKey (UUID) hết hạn sau **1 giờ** kể từ lúc tạo.

```typescript
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 giờ
```

Session IN_PROGRESS quá 1 giờ → bị coi là "hết hạn" → không cho resume.

### 6.3 Update vs Create MentorReview

|             | POST `/api/mentor-reviews` (create) | PUT `/api/mentor-reviews` (update) |
| ----------- | ----------------------------------- | ---------------------------------- |
| `sessionId` | ✅ Required                         | ❌ Không cần                       |
| `mentorId`  | ✅ Required                         | ❌ Không cần                       |
| `userId`    | ✅ Required                         | ❌ Không cần                       |
| `id`        | ❌ Không cần                        | ✅ Required                        |

### 6.4 Two Mentor Review Endpoints

| Endpoint                                             | Dùng cho                 | Body                                   |
| ---------------------------------------------------- | ------------------------ | -------------------------------------- |
| `POST /api/mentor-reviews`                           | Mock Interview (tự do)   | `{ sessionId, mentorId, userId, ... }` |
| `POST /api/application-details/mentor-review/submit` | Application (tuyển dụng) | `{ applicationId, roundId, ... }`      |

### 6.5 Datetime Timezone

`joinTime` (session creation) backend nhận UTC. Luôn dùng:

```typescript
import { localDatetimeLocalToUtc } from "@/lib/formatting";
// hoặc
import { formatToVietnamISOString } from "@/lib/utils";
```

### 6.6 sessionId vs sessionKey (AI Interview)

| Field        | Type            | Dùng cho                                                |
| ------------ | --------------- | ------------------------------------------------------- |
| `sessionId`  | `number`        | `GET /api/interview-sessions/{sessionId}` (view result) |
| `sessionKey` | `string` (UUID) | `GET /api/v1/interview/start/{sessionKey}` (interact)   |

### 6.7 Backend Schema Mismatches

Có nhiều `@ts-expect-error` trong codebase do backend Swagger schema không khớp response thực. **Không xoá** các `@ts-expect-error` này trừ khi backend fix schema và chạy `pnpm generate-schema`.

### 6.8 makePayment Response Parsing

`sessionManager.makePayment()` tự động extract checkout URL từ nhiều field names. Không cần parse thủ công:

```typescript
// Tự động tìm checkoutUrl, paymentUrl, redirectUrl, link, url, data.*
const result = await sessionManager.makePayment(sessionId);
if (result.success) {
  const checkoutUrl = result.data; // String URL đã extract
}
```

### 6.9 Video Call Flow (SessionRoomPage)

`VideoCallRoom` component call `onJoined(participantId)` callback khi user join thành công. Code **bên trong** callback phải gọi `sessionManager.joinSession()` để track participant trong DB:

```typescript
const handleJoined = async (participantId: string) => {
  if (hasJoinedTracking) return; // Tránh duplicate calls

  await sessionManager.joinSession({
    sessionName: session.roomName,
    userId: user.id,
    participantId,
    isMentor: false, // Luôn boolean
  });
  setHasJoinedTracking(true);
};
```

### 6.10 `useMentorReview.ts` Module-level `t()` (AP-12 Violation)

File `src/hooks/useMentorReview.ts` dùng `const t = i18n.t.bind(i18n)` ở module level (line 1–2). Đây là **frozen i18n anti-pattern** (AP-12). Không nên copy pattern này cho hooks mới. Tuy nhiên, file hiện tại vẫn hoạt động vì hooks chỉ dùng `t()` trong error messages không cần reactive language switching.
