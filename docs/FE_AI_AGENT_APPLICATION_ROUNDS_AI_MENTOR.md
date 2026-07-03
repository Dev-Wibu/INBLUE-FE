# FE AI Agent — Application Rounds: AI Interview & Mentor Review

> **Version**: 1.1 — Last updated: 2026-07-03
> **Backend Base**: `https://api.kdz.asia` · **OpenAPI Spec**: `/v3/api-docs`
> **Schema source**: `schema-from-be.d.ts` (regenerate with `pnpm generate-schema`)
> **API client**: `$api` (`openapi-fetch` + `openapi-react-query`) · **Auth**: JWT auto-injected via `useAuthStore`
> **Path alias**: `@/` maps to `src/` (always use `@/` imports, never relative paths)

---

## Mục lục

- [§1 — Tổng quan luồng 2 vòng](#1--tổng-quan-luồng-2-vòng)
- [§2 — Vòng AI Interview](#2--vòng-ai-interview)
  - [2.1 Backend API flow](#21-backend-api-flow)
  - [2.2 Frontend implementation](#22-frontend-implementation)
  - [2.3 Redirect sau khi kết thúc](#23-redirect-sau-khi-kết-thúc)
- [§3 — Vòng Mentor Review](#3--vòng-mentor-review)
  - [3.1 Backend API flow](#31-backend-api-flow)
  - [3.2 Frontend implementation](#32-frontend-implementation)
  - [3.3 Hiển thị form đã nộp](#33-hiển-thị-form-đã-nộp)
- [§4 — Mã nguồn tham chiếu](#4--mã-nguồn-tham-chiếu)
- [§5 — Known Issues & Gotchas](#5--known-issues--gotchas)

---

## §1 — Tổng quan luồng 2 vòng

### Sơ đồ luồng đầy đủ

```
Ứng viên nộp đơn (Application)
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Round 1: CV_SCREENING (Admin duyệt CV)              │
  └─────────────────────────────────────────────────────────┘
        │ ✅ Pass
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Round 2: QUIZ (Ứng viên làm bài quiz)               │
  └─────────────────────────────────────────────────────────┘
        │ ✅ Pass
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Round 3: AI_INTERVIEW  ◀── Vòng AI Interview         │
  │  • configData: instruction, timeLimitMinutes          │
  │  • Tạo interview-sessions với application_id         │
  │  • Ứng viên làm phỏng vấn AI                         │
  └─────────────────────────────────────────────────────────┘
        │ ✅ Pass (hoặc Backend tự đánh giá)
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Round 4: MENTOR_REVIEW  ◀── Vòng Mentor Review       │
  │  • configData: mentorInterview { mentorId, duration,    │
  │    totalPrice, mentorName, mentorAvatar }               │
  │  • Ứng viên thanh toán → Phỏng vấn với Mentor       │
  │  • Sau phỏng vấn: Ứng viên đánh giá Mentor          │
  └─────────────────────────────────────────────────────────┘
```

### Cấu trúc dữ liệu chung

#### Round (từ `useCurrentRound`)

```typescript
// Hook: useCurrentRound(applicationId)
// GET /api/rounds/find-by-application-order/{applicationId}

Round {
  id: number;
  name: string;
  roundOrder: number;
  roundType: "CV_SCREENING" | "EMAIL_SIMULATOR" | "QUIZ" |
             "CODING" | "CODE_REVIEW" | "MENTROR_REVIEW" | "AI_INTERVIEW";
  passThreshold: number;
  configData: RoundConfig;       // Khác nhau theo roundType
  reviewerId?: number;
  isDeleted?: boolean;
  isAuto?: boolean;
}
```

#### ApplicationDetail

```typescript
// GET /api/application-details/{applicationId}
// Lưu trạng thái chi tiết từng round

ApplicationDetail {
  id?: number;
  applicationId?: number;
  roundId?: number;
  status?: "PENDING" | "PASS" | "FAIL" | "IN_PROGRESS";
  submittedAt?: string;
  quizScore?: number;
  quizResult?: "PASS" | "FAIL";
  mentorReview?: {
    rating?: number;
    situationNote?: string;
    taskNote?: string;
    actionNote?: string;
    resultNote?: string;
    strength?: string;
    weakness?: string;
    improve?: string;
  };
  // ... các trường khác cho từng round type
}
```

---

## §2 — Vòng AI Interview

### 2.1 Backend API Flow

#### Step 1: Lấy Round Config

```
GET /api/rounds/find-by-application-order/{applicationId}
→ Trả về Round có roundType = "AI_INTERVIEW"
→ round.configData chứa: { instruction, timeLimitMinutes, ... }
```

#### Step 2: Tạo AI Interview Session

```
POST /api/interview-sessions/create-session
Body:
{
  user_id: number,              // ✅ THÊM: user ID
  application_id: number,       // ✅ THÊM: application ID
  candidate_profile: null,       // Backend lấy từ application
  job_requirement: {
    basic_info: {
      job_title: string,
      industry_domain: string,
      seniority_level: string
    },
    competencies: { ... }
  },
  session_config: {
    duration_minutes: number,   // Từ round.configData.timeLimitMinutes
    interview_mode: "STANDARD_MOCK",
    difficulty: "FRESHER_ADVANCED",
    language: "VI",
    domain: "IT"
  }
}
→ Response: { sessionId: number, sessionKey: string, ... }
```

> ⚠️ **Quan trọng**: Body phải bao gồm `user_id` và `application_id` để BE biết context. `candidate_profile` = null vì BE lấy từ application.

#### Step 3: Làm Interview (Frontend ↔ BE)

```
Frontend: GET /api/v1/interview/start/{sessionKey}
→ Nhận câu hỏi đầu tiên

Frontend → Backend: POST /api/v1/interview/submit
Body: { sessionKey, answerText }
→ Backend: Câu hỏi tiếp theo hoặc { finished: true, sessionId }

Frontend: GET /api/interview-sessions/{sessionId}
→ Xem kết quả
```

#### Step 4: Kết quả được tự động ghi vào ApplicationDetail

> Backend tự động cập nhật `ApplicationDetail` khi interview kết thúc. FE không cần gọi thêm API để submit kết quả.

---

### 2.2 Frontend Implementation

**File**: `src/pages/User/ApplicationHistory/ApplicationAIInterviewPage.tsx`

```typescript
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { $api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentRound } from "@/hooks/useRound";
import { toast } from "sonner";

export function ApplicationAIInterviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const applicationId = Number(searchParams.get("applicationId"));

  // Step 1: Lấy round config
  const { data: currentRound, isLoading: roundLoading } = useCurrentRound(
    applicationId,
    !!applicationId
  );

  const roundConfig = currentRound?.configData as
    | { instruction?: string; timeLimitMinutes?: number }
    | undefined;

  // Step 2: Tạo session khi mount
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const createAttemptedRef = useRef(false);
  const createSessionMutation = $api.useMutation("post", "/api/interview-sessions/create-session");

  useEffect(() => {
    if (!applicationId || !user?.id || isCreatingSession || createAttemptedRef.current) return;
    createAttemptedRef.current = true;
    setIsCreatingSession(true);

    void (async () => {
      try {
        const result = await createSessionMutation.mutateAsync({
          body: {
            user_id: user.id, // ✅ user ID
            application_id: applicationId, // ✅ application ID
            candidate_profile: null, // Backend lấy từ application
            job_requirement: {
              basic_info: {
                job_title: "Application Interview",
                industry_domain: "IT",
                seniority_level: "Senior",
              },
              competencies: {
                hard_skills: [],
                soft_skills: [],
                tools_and_platforms: [],
              },
              responsibilities: [roundConfig?.instruction ?? ""],
            },
            session_config: {
              duration_minutes: roundConfig?.timeLimitMinutes ?? 30,
              interview_mode: "STANDARD_MOCK",
              difficulty: "FRESHER_ADVANCED",
              language: "VI",
              domain: "IT",
            },
          },
        } as never);

        // Parse sessionKey từ response
        const sessionKey = extractSessionKey(result);

        // Lưu return URL để redirect sau khi interview kết thúc
        sessionStorage.setItem(`app-session-return:${sessionKey}`, `/user/application-history`);

        // Navigate đến AI Interview page
        navigate(`/user/ai-interview/session?sessionKey=${sessionKey}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("userAiinterview.unableToCreateInterviewSession")
        );
        navigate(-1);
      } finally {
        setIsCreatingSession(false);
      }
    })();
  }, [applicationId, user, isCreatingSession, roundConfig, createSessionMutation, navigate, t]);

  // Helper: extract sessionKey từ response
  const extractSessionKey = (result: unknown): string => {
    // Case 1: Response là UUID string trực tiếp
    const rawKey = (result as unknown as string)?.trim?.() ?? "";
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawKey)) {
      return rawKey;
    }

    // Case 2: Response là object có sessionKey
    if (typeof result === "object" && result !== null && "sessionKey" in result) {
      return String((result as { sessionKey: string }).sessionKey);
    }

    throw new Error("Invalid session key: " + rawKey.slice(0, 50));
  };

  // ... render loading UI
}
```

**Data flow**:

```
┌──────────────────────────────────────────────────────────┐
│  ApplicationAIInterviewPage mount                        │
│  useEffect → tạo session với application_id            │
├──────────────────────────────────────────────────────────┤
│  navigate(/user/ai-interview/session?sessionKey=...)   │
│  AIInterviewSessionPage (có sẵn)                        │
│  → GET /api/v1/interview/start/{sessionKey}            │
│  → Vòng lặp submit/question                           │
│  → POST /api/v1/interview/submit                       │
│  → { finished: true }                                  │
├──────────────────────────────────────────────────────────┤
│  → Xem kết quả (AIInterviewResultPage)                 │
│  sessionStorage return URL = /user/application-history   │
│  Backend tự động update ApplicationDetail              │
└──────────────────────────────────────────────────────────┘
```

---

### 2.3 Redirect sau khi kết thúc

**AI Interview kết thúc** → Backend tự động:

1. Cập nhật interview session status = `COMPLETED`
2. Tính điểm, ghi kết quả vào `ApplicationDetail`
3. **Frontend không cần làm gì thêm** — BE tự xử lý

**Redirect URL**: Sau khi interview kết thúc, user quay về `/user/application-history`.

> ⚠️ **Lưu ý**: `sessionStorage.setItem()` được dùng để lưu return URL. Khi user xem kết quả xong và click "Quay về", sẽ redirect về `/user/application-history`.

---

## §3 — Vòng Mentor Review

### 3.1 Backend API Flow

#### Step 1: Lấy Round Config

```
GET /api/rounds/find-by-application-order/{applicationId}
→ Trả về Round có roundType = "MENTROR_REVIEW"
→ round.configData chứa:
{
  mentorInterview: {
    userId: number,        // User ID của mentor (người được assign)
    mentorId: number,      // Mentor entity ID
    mentorName: string,
    mentorAvatar: string,
    mentorExpertise: string,
    duration: number,      // Thời lượng (phút)
    totalPrice: number     // Giá tiền (VND)
  }
}
```

#### Step 2: Thanh toán (nếu có phí)

```
Ứng viên chưa thanh toán → Hiển thị nút "Thanh toán"
→ sessionManager.makePayment(sessionId) → PayOS
→ Callback → sessionManager.updateStatus(sessionId, true)
→ session.status = PAID
```

#### Step 3: Phỏng vấn với Mentor (Daily.co)

```
Đã thanh toán → Join phòng Daily.co
→ sessionManager.joinSession({ sessionName, userId, isMentor: false })
→ Mentor join → sessionManager.joinSession({ ..., isMentor: true })
→ Daily.co webhook → Backend cập nhật session status
```

#### Step 4: Nộp Review (Sau phỏng vấn)

```
POST /api/application-details/mentor-review/submit
Body:
{
  applicationId: number,       // ✅ Application ID
  roundId: number,            // ✅ Round ID
  sessionId: number,          // Session ID (có thể = 0)
  mentorId: number,           // Mentor ID
  userId: number,             // User ID (ứng viên)
  rating: number,             // 1-5 sao
  situationNote?: string,     // STAR: Hoàn cảnh
  taskNote?: string,         // STAR: Nhiệm vụ
  actionNote?: string,        // STAR: Hành động
  resultNote?: string,        // STAR: Kết quả
  strength?: string,          // Điểm mạnh
  weakness?: string,          // Điểm cần cải thiện
  improve?: string            // Gợi ý cải thiện
}
→ Backend cập nhật ApplicationDetail.mentorReview
```

> ⚠️ **Validation**: Backend yêu cầu `rating > 0` HOẶC ít nhất 1 trường STAR.

---

### 3.2 Frontend Implementation

**File**: `src/pages/User/ApplicationHistory/ApplicationMentorReviewPage.tsx`

```typescript
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCurrentRound } from "@/hooks/useRound";
import { applicationDetailManager } from "@/services/application-detail.manager";
import type { ApplicationDetail } from "@/services/application-detail.manager";
import { toast } from "sonner";
import { StarRating, Textarea, Button, Card, ... } from "@/components/ui/...";

export function ApplicationMentorReviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);

  const applicationId = Number(searchParams.get("applicationId"));
  const roundIdParam = searchParams.get("roundId");
  const roundId = roundIdParam ? Number(roundIdParam) : undefined;

  // Step 1: Lấy round config (mentor info)
  const { data: currentRound } = useCurrentRound(applicationId, !!applicationId);
  const mentorInfo = (currentRound?.configData as { mentorInterview?: { ... } })
    ?.mentorInterview;

  // Step 2: Kiểm tra đã submit chưa
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

  // Step 3: Form state
  const [rating, setRating] = useState<number>(0);
  const [situationNote, setSituationNote] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [resultNote, setResultNote] = useState("");
  const [strength, setStrength] = useState("");
  const [weakness, setWeakness] = useState("");
  const [improve, setImprove] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    rating > 0 &&
    (situationNote.trim().length > 0 ||
      taskNote.trim().length > 0 ||
      actionNote.trim().length > 0 ||
      resultNote.trim().length > 0);

  // Step 4: Submit review
  const handleSubmit = useCallback(async () => {
    if (!applicationId || !roundId || !user?.id || !canSubmit) return;

    setIsSubmitting(true);
    try {
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
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData?.message ?? t("common.anErrorHasOccurred"));
      }
    } catch {
      toast.error(t("common.anErrorHasOccurred"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    applicationId, roundId, user, mentorInfo, rating,
    situationNote, taskNote, actionNote, resultNote,
    strength, weakness, improve, canSubmit, navigate, t
  ]);

  // ... render UI
}
```

**Data flow**:

```
┌──────────────────────────────────────────────────────────┐
│  ApplicationMentorReviewPage mount                        │
│  useEffect → Lấy round config (mentor info)            │
│  useEffect → Kiểm tra đã submit chưa                   │
├──────────────────────────────────────────────────────────┤
│  Chưa submit → Hiển thị form STAR rating              │
│  Đã submit → Hiển thị thông báo "Đã nộp"              │
├──────────────────────────────────────────────────────────┤
│  User điền form → Submit                               │
│  POST /api/application-details/mentor-review/submit     │
│  Body: { applicationId, roundId, ...review fields }   │
├──────────────────────────────────────────────────────────┤
│  Success → toast.success → navigate(-1)                  │
│  Backend tự động update ApplicationDetail               │
└──────────────────────────────────────────────────────────┘
```

---

### 3.3 Hiển thị form đã nộp

```typescript
// Kiểm tra đã submit chưa
const isAlreadySubmitted = !!existingDetail?.mentorReview;

// Trong form:
<Button
  disabled={!canSubmit || isSubmitting || isAlreadySubmitted}
  ...>
  {isAlreadySubmitted
    ? t("userApplicationhistory.reviewAlreadySubmitted")
    : t("common.submit")}
</Button>

// Hiển thị thông báo đã nộp
{isAlreadySubmitted && (
  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
    <p>{t("userApplicationhistory.reviewAlreadySubmitted")}</p>
  </div>
)}
```

---

## §4 — Mã nguồn tham chiếu

### Hooks

| Hook                   | File                    | Mô tả                                     |
| ---------------------- | ----------------------- | ----------------------------------------- |
| `useCurrentRound`      | `src/hooks/useRound.ts` | Lấy round hiện tại theo application order |
| `useSetupRoundsForJd`  | `src/hooks/useRound.ts` | Setup rounds cho JD                       |
| `useUpdateRoundsForJd` | `src/hooks/useRound.ts` | Update rounds cho JD                      |

### Managers

| Manager                    | File                                         | Mô tả                                |
| -------------------------- | -------------------------------------------- | ------------------------------------ |
| `applicationDetailManager` | `src/services/application-detail.manager.ts` | CRUD ApplicationDetail               |
| `sessionManager`           | `src/services/session.manager.ts`            | Session/Payment cho Mentor Interview |

### Pages

| Page                          | Route                                             | Mô tả                         |
| ----------------------------- | ------------------------------------------------- | ----------------------------- |
| `ApplicationAIInterviewPage`  | `/user/application/:appId/ai-interview`           | Vòng AI Interview             |
| `ApplicationMentorReviewPage` | `/user/application/:appId/mentor-review?roundId=` | Vòng Mentor Review            |
| `AIInterviewSessionPage`      | `/user/ai-interview/session?sessionKey=`          | AI Interview (reused)         |
| `AIInterviewResultPage`       | `/user/ai-interview/result/:id`                   | Kết quả AI Interview (reused) |

### Routes

```typescript
// App.tsx
<Route path="/user/application/:applicationId/ai-interview" element={<ApplicationAIInterviewPage />} />
<Route path="/user/application/:applicationId/mentor-review" element={<ApplicationMentorReviewPage />} />
```

---

## §5 — Known Issues & Gotchas

### 5.1 AI Interview — `application_id` bắt buộc

Khi tạo session cho vòng Application, **phải truyền `application_id`** để BE:

- Liên kết session với application
- Tự động cập nhật `ApplicationDetail` khi kết thúc

```typescript
// ❌ Sai — thiếu application_id
{ user_id: user.id, candidate_profile: {...}, ... }

// ✅ Đúng — có application_id
{
  user_id: user.id,
  application_id: applicationId,  // ✅ Bắt buộc
  candidate_profile: null,
  ...
}
```

### 5.2 Mentor Review — Submit endpoint khác với Mock Interview

| Context                  | Endpoint                                             | Body                                   |
| ------------------------ | ---------------------------------------------------- | -------------------------------------- |
| Application (tuyển dụng) | `POST /api/application-details/mentor-review/submit` | `{ applicationId, roundId, ... }`      |
| Mock Interview (tự do)   | `POST /api/mentor-reviews`                           | `{ sessionId, mentorId, userId, ... }` |

### 5.3 Mentor Review — Check đã submit trước khi hiển thị form

```typescript
// Lấy ApplicationDetail để kiểm tra đã submit chưa
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

// Nếu đã submit → hiển thị thông báo, disable form
const isAlreadySubmitted = !!existingDetail?.mentorReview;
```

### 5.4 AI Interview — Reuse AIInterviewSessionPage

Vòng AI Interview trong Application **tái sử dụng** `AIInterviewSessionPage` (cùng route `/user/ai-interview/session`). Điểm khác biệt:

| Context                  | Return URL                  | Khác                                       |
| ------------------------ | --------------------------- | ------------------------------------------ |
| AI Interview thường      | `/user?tab=aiInterview`     | Không có application context               |
| AI Interview Application | `/user/application-history` | Có `application_id` trong session creation |

### 5.5 Round Type — `MENTROR_REVIEW` vs `MENTOR_REVIEW`

Backend dùng **`MENTROR_REVIEW`** (có chữ R ở giữa: MENT**R**OR_REVIEW), không phải `MENTOR_REVIEW`.

```typescript
// ❌ Sai
roundType === "MENTOR_REVIEW";

// ✅ Đúng
roundType === "MENTROR_REVIEW";
```

### 5.6 Datetime Timezone

Khi tạo session cho Mentor Interview (nếu cần scheduling):

```typescript
import { localDatetimeLocalToUtc } from "@/lib/formatting";
// hoặc
import { formatToVietnamISOString } from "@/lib/utils";
```

### 5.7 Thứ tự Round — Dùng `useCurrentRound`

`useCurrentRound(applicationId)` trả về round **hiện tại** (theo thứ tự trong application). Không cần filter theo `roundType` nếu chỉ cần lấy round cần làm tiếp theo.
