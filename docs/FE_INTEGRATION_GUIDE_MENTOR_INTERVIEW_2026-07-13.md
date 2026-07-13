# Hướng Dẫn FE: Hoàn Thiện Flow Mentor Interview (Từ Join Room → Kết Thúc Vòng)

> **Tài liệu này dành cho FE Developer.** Đọc xong là code được 100%, copy prompt cuối file dán cho AI là xong.

---

## 0. BỐI CẢNH — FE ĐÃ LÀM ĐƯỢC ĐẾN ĐÂU?

### 0.1. Những phần FE đã hoàn thành (✅)

| #   | Bước                                | Endpoint                                                | Trạng thái                            |
| --- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------- |
| 1   | Student apply JD                    | `POST /api/applications?jdId=X`                         | ✅ Xong                               |
| 2   | Admin list bookings AWAITING_MENTOR | `GET /api/admin/mentor-bookings?status=AWAITING_MENTOR` | ✅ Xong                               |
| 3   | Admin assign mentor                 | `POST /api/admin/mentor-bookings/{id}/assign-mentor`    | ✅ Xong (đang fix bug `exp` Daily.co) |
| 4   | Student pick slot tại kiosk         | `POST /api/mentor-bookings/pick-slot`                   | ✅ Xong                               |
| 5   | Student vào kiosk                   | `POST /api/kiosk/enter` → nhận `roomUrl`                | ✅ Xong                               |
| 6   | Student + Mentor join Daily.co room | Daily.co SDK `daily.join()`                             | ✅ Xong                               |

### 0.2. Những phần FE CHƯA LÀM (❌ — đây là cái cần làm)

| #   | Bước                                 | Endpoint                                 | Mô tả                                                                           |
| --- | ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| 7   | Tracking participant join (BE log)   | `POST /api/sessions/join-session`        | Sau khi vào Daily.co room → gọi BE để track `participantId`                     |
| 8   | Mentor submit review (kết thúc vòng) | `POST /api/mentor-reviews`               | Mentor đánh giá STAR + rating → BE force complete session + booking + appDetail |
| 9   | HR chấm điểm (nếu vòng khác)         | `POST /api/application-details/hr-score` | Vòng MENTOR_REVIEW thì KHÔNG cần gọi cái này                                    |
| 10  | UI hiển thị "Đã hoàn thành vòng"     | Refetch `GET /api/applications/me`       | Refresh sau khi review xong                                                     |

### 0.3. Các thuật ngữ BỊ NHẦM trong code BE

> **Quan trọng**: Hai khái niệm này trong code BE là MỘT thực thể duy nhất, chỉ là đặt tên nhầm.

| Tên trong code BE                                | Tên nghiệp vụ đúng                | Vai trò                                        |
| ------------------------------------------------ | --------------------------------- | ---------------------------------------------- |
| Enum `RoundType.MENTROR_REVIEW` (typo "MENTROR") | **Mentor Interview**              | Vòng phỏng vấn live qua Daily.co               |
| Entity `MentorReview`                            | **Mentor Review (đánh giá STAR)** | Bản đánh giá mentor ghi sau khi phỏng vấn xong |

→ Backend confirm: **Vòng Mentor Interview KHÔNG cần HR chấm thêm**. Mentor submit review là ĐỦ.

### 0.4. Hai bug BE đã biết (FE cần work-around)

| Bug                                      | Mô tả                                                                                                                               | Work-around FE                                                                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Bug #1**: Webhook Daily.co sai field   | `DailyWebHookPayload` parse sai `session_id`/`participant_id` nên `endTime` không set được. Session không tự COMPLETED khi user out | BỎ QUA: không cần xử lý webhook, BE tự force complete trong `mentorReview()`                             |
| **Bug #2**: Daily.co `exp` past (đã sửa) | Khi `scheduledStart` ở quá khứ → `exp = joinTime + 3600` ở quá khứ → Daily.co 400                                                   | Đã sửa bằng cách dùng `scheduledEnd + 7200`. **NHƯNG cần đảm bảo booking `scheduledStart` ở tương lai.** |

---

## 1. FLOW TỔNG THỂ — DẠNG SƠ ĐỒ

```
[Student ứng tuyển] → [Apply xong → appDetail.status = PENDING]
         │
         ▼
[Student pick slot tại Kiosk] → POST /api/mentor-bookings/pick-slot
         │ → booking.status = AWAITING_MENTOR
         │ → appDetail.status = SLOT_PICKED
         ▼
[Admin assign mentor] → POST /api/admin/mentor-bookings/{id}/assign-mentor
         │ → session.status = SCHEDULED
         │ → booking.status = ROOM_CREATED
         │ → sessionKey được tạo + gửi notification cho student
         ▼
[Student vào Kiosk] → POST /api/kiosk/enter
         │ → session.status = ONGOING
         │ → booking.status = IN_PROGRESS
         │ → Trả về roomUrl
         ▼
[Student mở Daily.co room] → daily.join()
         │
         │  ※ Bước 7: Gọi /api/sessions/join-session để BE tracking
         ▼
[Mentor mở Daily.co room] → daily.join()
         │
         │  ※ Bước 7: Gọi /api/sessions/join-session để BE tracking
         ▼
[Phỏng vấn diễn ra — Mentor + Student nói chuyện]
         │
         │  (Hai bên out Daily.co — webhook bị bug, bỏ qua)
         ▼
[ Mentor mở UI Review Form ]
         │
         ▼
[Bước 8] POST /api/mentor-reviews  ─────────┐
         │                                    │
         │ BE tự động:                         │
         │  • session.status = COMPLETED       │
         │  • booking.status = COMPLETED       │
         │  • appDetail.status = COMPLETED     │
         │  • appDetail.finalScore = (rating/10) * maxScore
         │  • appDetail.finalResult = PASSED/FAILED
         │                                    │
         ▼                                    │
[Refresh /api/applications/me]  ─────────────┘
         │
         ▼
[Move sang vòng tiếp theo]
         │ BE không tự động gọi moveToNextRound() sau khi mentor review
         │ → Cần HR/Admin trigger hoặc BE fix
         │
         ▼ (Hiện tại: phải tự gọi hr-score nếu muốn move)
```

---

## 2. ENDPOINT #7 — `POST /api/sessions/join-session`

### 2.1. Mục đích

Khi student hoặc mentor **thực sự vào** Daily.co room (sau khi `daily.join()` thành công), FE phải gọi endpoint này để:

- BE lưu `participantId` của user
- BE lưu `startTime` của user
- Nếu là student → BE tự động set `session.status = ONGOING`

### 2.2. Request

**Method**: `POST`
**URL**: `/api/sessions/join-session`
**Headers**:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body** (`JoinSessionDtoRequest.java`):

```typescript
interface JoinSessionDtoRequest {
  sessionName: string; // Tên phòng Daily.co, lấy từ Session.roomName
  userId: number; // userId của người đang join
  participantId: string; // Daily.co participant_id, lấy từ event 'participant-joined'
  isMentor: boolean; // true nếu là mentor, false nếu là student
}
```

**Ví dụ cụ thể**:

```json
{
  "sessionName": "session-1752380000000",
  "userId": 5,
  "participantId": "abc-xyz-123-def-456",
  "isMentor": false
}
```

### 2.3. Cách lấy `participantId` từ Daily.co SDK

```javascript
import { DailyCall } from "@daily-co/daily-js";

const call = DailyCall.getCallInstance();

call.on("participant-joined", (event) => {
  // event.participant.user_id = Daily.co user_id (không phải userId của hệ thống)
  // event.participant.session_id = Daily.co session_id (ĐÂY LÀ participantId)

  fetch("https://api.kdz.asia/api/sessions/join-session", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionName: roomName, // lấy từ Session.roomName
      userId: currentUserId, // userId của student/mentor đang join
      participantId: event.participant.session_id,
      isMentor: isCurrentUserMentor, // true nếu role là MENTOR, false nếu STUDENT
    }),
  });
});
```

### 2.4. Response

**HTTP 200**, body rỗng (`Void`).

### 2.5. Response Error

| HTTP Code | Error Message                      | Khi nào xảy ra                                                    |
| --------- | ---------------------------------- | ----------------------------------------------------------------- |
| 404       | `Không tìm thấy phòng họp !!`      | `sessionName` không khớp `Session.roomName` trong DB              |
| 409       | `Phòng họp chưa được duyệt`        | Session đang ở status `DRAFT` (chưa admin approve)                |
| 403       | `Mentor ID không khớp với Session` | `userId` gửi lên không khớp `Session.userId2` khi `isMentor=true` |
| 403       | `User ID không khớp với Session`   | `userId` gửi lên không khớp `Session.userId` khi `isMentor=false` |

### 2.6. Side effects (BE tự động làm)

| Condition            | BE tự động set                                                             |
| -------------------- | -------------------------------------------------------------------------- |
| Student join lần đầu | `session.participantId1`, `session.startTime1`, `session.status = ONGOING` |
| Mentor join lần đầu  | `session.participantId2`, `session.startTime2`                             |
| Student join lần 2+  | Chỉ update `participantId1` (KHÔNG ghi đè `startTime1`)                    |
| Mentor join lần 2+   | Chỉ update `participantId2` (KHÔNG ghi đè `startTime2`)                    |

---

## 3. ENDPOINT #8 — `POST /api/mentor-reviews` (KẾT THÚC VÒNG)

### 3.1. Mục đích

> **ĐÂY LÀ ENDPOINT KẾT THÚC VÒNG MENTOR INTERVIEW.** Mentor submit review → BE tự động:
>
> - Force complete session + booking
> - Set appDetail.status = COMPLETED
> - Tính điểm từ rating
> - Set finalResult = PASSED/FAILED

### 3.2. Request

**Method**: `POST`
**URL**: `/api/mentor-reviews`
**Headers**:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body** (`CreateMentorReviewRequest.java`):

```typescript
interface CreateMentorReviewRequest {
  sessionId: number; // ID của Session (KHÔNG phải sessionName)
  mentorId: number; // ID của mentor đang review
  userId: number; // ID của student được review
  rating: number; // Rating từ 1-10
  situationNote: string; // STAR - Situation: Bối cảnh câu hỏi
  taskNote: string; // STAR - Task: Nhiệm vụ được giao
  actionNote: string; // STAR - Action: Hành động của ứng viên
  resultNote: string; // STAR - Result: Kết quả
  strength: string; // Điểm mạnh
  weakness: string; // Điểm yếu
  improve: string; // Góp ý cải thiện
}
```

**Ví dụ cụ thể**:

```json
{
  "sessionId": 16,
  "mentorId": 4,
  "userId": 5,
  "rating": 8,
  "situationNote": "Hỏi về thiết kế REST API cho hệ thống e-commerce",
  "taskNote": "Thiết kế endpoints, validate input, handle lỗi",
  "actionNote": "Ứng viên đề xuất RESTful, có versioning, JWT auth, có xử lý phân trang",
  "resultNote": "Trả lời tốt, có trade-off discussion",
  "strength": "Tư duy hệ thống tốt, biết cách cân nhắc trade-off",
  "weakness": "Chưa đề cập caching, rate limiting",
  "improve": "Nên tìm hiểu thêm về API security và performance"
}
```

### 3.3. Cách lấy các field cần thiết

| Field                       | Lấy từ đâu                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `sessionId`                 | Query `GET /api/sessions/{id}` hoặc `GET /api/admin/mentor-bookings?status=IN_PROGRESS` để lấy booking → `booking.sessionId` |
| `mentorId`                  | Lấy từ `Mentor` entity (FE đã biết khi login với role MENTOR)                                                                |
| `userId`                    | Lấy từ booking: `booking.applicantUserId`                                                                                    |
| `rating`                    | Input từ UI form (1-10)                                                                                                      |
| `situationNote`...`improve` | Input từ UI form (textarea)                                                                                                  |

### 3.4. Response

**HTTP 200**, trả về `MentorReview` entity vừa tạo:

```json
{
  "id": 1,
  "rating": 8,
  "situationNote": "Hỏi về thiết kế REST API...",
  "taskNote": "Thiết kế endpoints...",
  "actionNote": "Ứng viên đề xuất RESTful...",
  "resultNote": "Trả lời tốt...",
  "strength": "Tư duy hệ thống tốt...",
  "weakness": "Chưa đề cập caching...",
  "improve": "Nên tìm hiểu thêm..."
}
```

**Lưu ý**: Response KHÔNG trả về `session`, `mentor`, `user` object (chỉ trả primitive fields).

### 3.5. Response Error

| HTTP Code | Error Message                                              | Khi nào xảy ra                                            |
| --------- | ---------------------------------------------------------- | --------------------------------------------------------- | --------------- | ---------------------------------------------------- |
| 404       | `Session                                                   | Mentor                                                    | User not found` | `sessionId`, `mentorId`, hoặc `userId` không tồn tại |
| 400       | `Cannot review mentor for a session that is not completed` | Session chưa ở status COMPLETED VÀ không có Kiosk Booking |

### 3.6. Side effects (BE tự động làm — QUAN TRỌNG)

**Bước 1**: Nếu tìm thấy `MentorInterviewBooking` qua `sessionId`:

```java
session.setStatus(SessionStatus.COMPLETED);    // Force complete session
sessionRepo.save(session);

booking.setStatus(BookingStatus.COMPLETED);    // Force complete booking
bookingRepo.save(booking);
```

**Bước 2**: Tạo `MentorReview` entity (lưu DB):

```java
MentorReview review = mentorReviewMapper.toEntity(mentorReview);
review.setSession(session);
review = repo.save(review);
```

**Bước 3**: Update `ApplicationDetail`:

```java
appDetail.setMentorReview(review);
appDetail.setStatus(ApplicationDetailStatus.COMPLETED);
appDetail.setCompletedAt(LocalDateTime.now());

// Tính điểm
double maxScore = round.getConfigData().getMaxScore();  // hoặc 100.0 mặc định
double score = (review.getRating() / 10.0) * maxScore;
appDetail.setFinalScore(score);

// Quyết định pass/fail
if (round.getPassThreshold() != null) {
    appDetail.setFinalResult(score >= round.getPassThreshold() ? PASSED : FAILED);
} else {
    appDetail.setFinalResult(PASSED);  // Mặc định PASSED nếu không có threshold
}
```

### 3.7. ⚠️ LƯU Ý QUAN TRỌNG — Move to Next Round

> **Sau khi mentor review xong, BE KHÔNG tự động gọi `moveToNextRound()`.** Đây là bug BE.

File `MentorReviewServiceImpl.java:32-99` (chỉ save MentorReview + update appDetail, KHÔNG gọi `moveToNextRound`).

So sánh với các flow khác:

- `QuizRoundProcessor.java:79` → `applicationService.moveToNextRound(...)` ✅
- `SubmissionEventHandle.java:184` → `applicationService.moveToNextRound(...)` ✅
- `ApplicationDetailServiceImpl.java:49` → `applicationService.moveToNextRound(...)` (chỉ trong `hrScore()`) ✅

→ **Vòng MENTOR_REVIEW KHÔNG trigger moveToNextRound → Application.currentRoundOrder không tăng.**

**Work-around tạm thời**: Sau khi mentor submit review thành công, FE có thể gọi `POST /api/application-details/hr-score` để trigger moveToNextRound (vì flow này gọi `moveToNextRound`). Tuy nhiên cách này sẽ ghi đè `finalScore` và `finalResult` của mentor review → không nên.

**Khuyến nghị**: Báo BE sửa `MentorReviewServiceImpl.java` thêm dòng `applicationService.moveToNextRound(application)` cuối method.

---

## 4. ENDPOINT #9 — `POST /api/application-details/hr-score` (KHÔNG DÙNG cho vòng Mentor)

### 4.1. Mục đích

HR chấm điểm cuối cùng cho các vòng có AI chấm nhưng cần HR duyệt (như CV, Email).

> **KHÔNG dùng cho vòng MENTOR_REVIEW** (vòng này đã có mentor review rồi, không cần HR chấm thêm).

### 4.2. Request

**Method**: `POST`
**URL**: `/api/application-details/hr-score`
**Headers**:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Query Params**:

| Param                 | Type    | Required | Mô tả                             |
| --------------------- | ------- | -------- | --------------------------------- |
| `applicationDetailId` | int     | YES      | ID của ApplicationDetail cần chấm |
| `isPass`              | boolean | YES      | true = PASSED, false = FAILED     |
| `note`                | String  | YES      | HR note                           |
| `score`               | double  | YES      | Điểm cuối (0-maxScore)            |

**Ví dụ**:

```
POST /api/application-details/hr-score?applicationDetailId=45&isPass=true&note=Tốt&score=85.5
```

### 4.3. Response

**HTTP 200**, body rỗng.

### 4.4. Side effects

```java
appDetail.setHrScore(score);
appDetail.setHrNote(note);
appDetail.setFinalScore(score);
appDetail.setFinalResult(isPass ? PASSED : FAILED);
appDetail.setCompletedAt(LocalDateTime.now());
appDetail.setStatus(COMPLETED);

Application application = applicationService.getApplicationById(...);
applicationService.moveToNextRound(application);  // ← Move sang vòng tiếp theo
```

---

## 5. ENDPOINT #10 — `GET /api/applications/me` (REFRESH SAU REVIEW)

### 5.1. Mục đích

Sau khi mentor submit review thành công, FE gọi lại endpoint này để:

- Lấy danh sách applications mới nhất
- Hiển thị status mới của vòng Mentor Interview (vẫn là IN_PROGRESS vì BE chưa trigger moveToNextRound)
- Hiển thị finalScore mới

### 5.2. Request

**Method**: `GET`
**URL**: `/api/applications/me`

### 5.3. Response

Array `Application`:

```json
[
  {
    "id": 123,
    "userId": 5,
    "jdId": 42,
    "currentRoundOrder": 1, // Vẫn 1 vì chưa moveToNextRound
    "status": "IN_PROGRESS", // Vẫn IN_PROGRESS vì chưa hết tất cả rounds
    "overallScore": -1.0, // Chưa có vì chưa hết rounds
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

Để check chi tiết từng vòng, gọi:

```
GET /api/application-details/application/{applicationId}
```

Response:

```json
[
  {
    "id": 45,
    "applicationId": 123,
    "roundId": 10,
    "status": "COMPLETED", // ← Đây là vòng Mentor Interview đã complete
    "finalScore": 80.0, // ← Rating 8/10 * maxScore 100
    "finalResult": "PASSED",
    "startedAt": "...",
    "completedAt": "..."
  }
]
```

---

## 6. CODE MẪU ĐẦY ĐỦ

### 6.1. Service: `mentorInterview.service.ts`

```typescript
// File: services/mentorInterview.service.ts

import axios from "axios";

const API_BASE = "https://api.kdz.asia";

function getAuthHeaders() {
  const token = localStorage.getItem("jwt_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// === Bước 7: Join session ===
export async function joinSession(payload: {
  sessionName: string;
  userId: number;
  participantId: string;
  isMentor: boolean;
}) {
  const response = await axios.post(`${API_BASE}/api/sessions/join-session`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

// === Bước 8: Submit mentor review (kết thúc vòng) ===
export async function submitMentorReview(payload: {
  sessionId: number;
  mentorId: number;
  userId: number;
  rating: number;
  situationNote: string;
  taskNote: string;
  actionNote: string;
  resultNote: string;
  strength: string;
  weakness: string;
  improve: string;
}) {
  const response = await axios.post(`${API_BASE}/api/mentor-reviews`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

// === Bước 10: Lấy applications của tôi ===
export async function getMyApplications() {
  const response = await axios.get(`${API_BASE}/api/applications/me`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

// === Lấy chi tiết các vòng của 1 application ===
export async function getApplicationDetails(applicationId: number) {
  const response = await axios.get(
    `${API_BASE}/api/application-details/application/${applicationId}`,
    { headers: getAuthHeaders() }
  );
  return response.data;
}
```

### 6.2. Hook: `useMentorInterview.ts`

```typescript
// File: hooks/useMentorInterview.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as service from "../services/mentorInterview.service";

// === Bước 7: Hook join session ===
export function useJoinSession() {
  return useMutation({
    mutationFn: service.joinSession,
  });
}

// === Bước 8: Hook submit review ===
export function useSubmitMentorReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: service.submitMentorReview,
    onSuccess: () => {
      // Refresh danh sách applications
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["application-details"] });
    },
  });
}

// === Bước 10: Hook lấy my applications ===
export function useMyApplications() {
  return useQuery({
    queryKey: ["my-applications"],
    queryFn: service.getMyApplications,
  });
}

// === Hook lấy details của 1 application ===
export function useApplicationDetails(applicationId: number) {
  return useQuery({
    queryKey: ["application-details", applicationId],
    queryFn: () => service.getApplicationDetails(applicationId),
    enabled: !!applicationId,
  });
}
```

### 6.3. Component: Daily.co Join Handler

```typescript
// File: components/DailyCoJoinHandler.tsx
// Component xử lý Bước 7: Gọi join-session khi user vào Daily.co room

import { useEffect } from "react";
import { DailyCall } from "@daily-co/daily-js";
import { useJoinSession } from "../hooks/useMentorInterview";

interface Props {
  sessionName: string; // Từ Session.roomName
  userId: number;
  isMentor: boolean;
}

export function DailyCoJoinHandler({ sessionName, userId, isMentor }: Props) {
  const joinMutation = useJoinSession();

  useEffect(() => {
    const call = DailyCall.getCallInstance();
    if (!call) return;

    const handleParticipantJoined = (event: any) => {
      // Chỉ track khi CHÍNH user này join
      if (event.participant.user_id !== String(userId)) return;

      joinMutation.mutate({
        sessionName,
        userId,
        participantId: event.participant.session_id,
        isMentor,
      });
    };

    call.on("participant-joined", handleParticipantJoined);
    return () => {
      call.off("participant-joined", handleParticipantJoined);
    };
  }, [sessionName, userId, isMentor]);

  return null;
}
```

### 6.4. Component: Mentor Review Form

```typescript
// File: components/MentorReviewForm.tsx

import { useState } from 'react';
import { useSubmitMentorReview } from '../hooks/useMentorInterview';

interface Props {
  sessionId: number;
  mentorId: number;
  userId: number;       // studentId
  onSuccess?: () => void;
}

export function MentorReviewForm({ sessionId, mentorId, userId, onSuccess }: Props) {
  const submitMutation = useSubmitMentorReview();

  const [form, setForm] = useState({
    rating: 5,
    situationNote: '',
    taskNote: '',
    actionNote: '',
    resultNote: '',
    strength: '',
    weakness: '',
    improve: '',
  });

  const handleChange = (field: keyof typeof form, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    submitMutation.mutate(
      {
        sessionId,
        mentorId,
        userId,
        ...form,
      },
      {
        onSuccess: () => {
          alert('Đánh giá thành công! Vòng Mentor Interview đã kết thúc.');
          onSuccess?.();
        },
        onError: (err: any) => {
          alert(`Lỗi: ${err.response?.data?.message || err.message}`);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Đánh giá ứng viên (STAR Method)</h2>

      <div>
        <label>Rating (1-10):</label>
        <input
          type="number"
          min={1}
          max={10}
          value={form.rating}
          onChange={(e) => handleChange('rating', Number(e.target.value))}
          required
        />
      </div>

      <div>
        <label>Situation (Bối cảnh):</label>
        <textarea
          value={form.situationNote}
          onChange={(e) => handleChange('situationNote', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label>Task (Nhiệm vụ):</label>
        <textarea
          value={form.taskNote}
          onChange={(e) => handleChange('taskNote', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label>Action (Hành động):</label>
        <textarea
          value={form.actionNote}
          onChange={(e) => handleChange('actionNote', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label>Result (Kết quả):</label>
        <textarea
          value={form.resultNote}
          onChange={(e) => handleChange('resultNote', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <label>Điểm mạnh:</label>
        <textarea
          value={form.strength}
          onChange={(e) => handleChange('strength', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <label>Điểm yếu:</label>
        <textarea
          value={form.weakness}
          onChange={(e) => handleChange('weakness', e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <label>Góp ý cải thiện:</label>
        <textarea
          value={form.improve}
          onChange={(e) => handleChange('improve', e.target.value)}
          rows={2}
        />
      </div>

      <button type="submit" disabled={submitMutation.isPending}>
        {submitMutation.isPending ? 'Đang gửi...' : 'Hoàn tất đánh giá'}
      </button>
    </form>
  );
}
```

### 6.5. Component: Mentor Interview Page

```typescript
// File: pages/MentorInterviewPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DailyCall } from '@daily-co/daily-js';
import { DailyCoJoinHandler } from '../components/DailyCoJoinHandler';
import { MentorReviewForm } from '../components/MentorReviewForm';

export function MentorInterviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Lấy thông tin từ URL hoặc từ state sau khi admin assign mentor
  const sessionName = params.get('sessionName') || '';
  const sessionId = Number(params.get('sessionId')) || 0;
  const userId = Number(params.get('userId')) || 0;        // student ID
  const mentorId = Number(params.get('mentorId')) || 0;
  const roomUrl = params.get('roomUrl') || '';

  const [interviewStarted, setInterviewStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);

  // Lấy user hiện tại từ localStorage
  const currentUserId = Number(localStorage.getItem('user_id'));
  const isCurrentUserMentor = localStorage.getItem('user_role') === 'MENTOR';

  useEffect(() => {
    if (!roomUrl) return;
    const call = DailyCall.createCallObject({
      audioSource: true,
      videoSource: true,
    });
    call.join({ url: roomUrl }).then(() => {
      setInterviewStarted(true);
    });

    call.on('left-meeting', () => {
      setInterviewEnded(true);
    });

    return () => {
      call.destroy();
    };
  }, [roomUrl]);

  return (
    <div>
      <h1>Phỏng vấn Mentor Interview</h1>

      {!interviewStarted && <p>Đang kết nối phòng họp...</p>}

      {interviewStarted && !interviewEnded && (
        <>
          <p>Đang phỏng vấn...</p>

          {/* Bước 7: Tracking join */}
          <DailyCoJoinHandler
            sessionName={sessionName}
            userId={currentUserId}
            isMentor={isCurrentUserMentor}
          />
        </>
      )}

      {interviewEnded && isCurrentUserMentor && (
        <>
          {/* Bước 8: Mentor submit review */}
          <MentorReviewForm
            sessionId={sessionId}
            mentorId={mentorId}
            userId={userId}
            onSuccess={() => navigate('/mentor/dashboard')}
          />
        </>
      )}

      {interviewEnded && !isCurrentUserMentor && (
        <p>Cảm ơn bạn đã hoàn thành phỏng vấn. Mentor đang đánh giá...</p>
      )}
    </div>
  );
}
```

---

## 7. CHECKLIST TEST

### 7.1. Test Bước 7 (Join Session)

| Test case                                                               | Expected                           |
| ----------------------------------------------------------------------- | ---------------------------------- |
| Student vào room, gọi `join-session` với `isMentor=false`               | 200 OK, `session.status = ONGOING` |
| Mentor vào room, gọi `join-session` với `isMentor=true`                 | 200 OK                             |
| Gọi `join-session` với `sessionName` không tồn tại                      | 404 "Không tìm thấy phòng họp"     |
| Gọi `join-session` với session `status=DRAFT`                           | 409 "Phòng họp chưa được duyệt"    |
| Mentor gửi `isMentor=true` nhưng `userId` không khớp `Session.userId2`  | 403 "Mentor ID không khớp"         |
| Student gửi `isMentor=false` nhưng `userId` không khớp `Session.userId` | 403 "User ID không khớp"           |

### 7.2. Test Bước 8 (Submit Review)

| Test case                                                       | Expected                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Mentor submit review hợp lệ                                     | 200 OK, trả về MentorReview, session.status=COMPLETED, appDetail.status=COMPLETED |
| Mentor submit với `sessionId` không tồn tại                     | 404 "Session\| Mentor\| User not found"                                           |
| Submit review cho session KHÔNG qua Kiosk và chưa COMPLETED     | 400 "Cannot review mentor for a session that is not completed"                    |
| Submit review cho session QUA Kiosk (có MentorInterviewBooking) | 200 OK (BE force complete trước)                                                  |
| Sau khi submit, check appDetail.finalScore                      | = (rating / 10) \* maxScore                                                       |
| Sau khi submit, check appDetail.finalResult                     | PASSED nếu score >= passThreshold, ngược lại FAILED                               |

### 7.3. Test toàn flow

| Step | Action                         | Expected                                                                                   |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| 1    | Student apply JD               | appDetail = PENDING                                                                        |
| 2    | Student pick slot              | booking = AWAITING_MENTOR, appDetail = SLOT_PICKED                                         |
| 3    | Admin assign mentor            | booking = ROOM_CREATED, session = SCHEDULED                                                |
| 4    | Student vào kiosk              | session = ONGOING, booking = IN_PROGRESS                                                   |
| 5    | Student + Mentor join Daily.co | (gọi join-session)                                                                         |
| 6    | Mentor submit review           | session = COMPLETED, booking = COMPLETED, appDetail = COMPLETED, finalScore tính từ rating |
| 7    | Refetch applications/me        | (vẫn IN_PROGRESS, currentRoundOrder chưa tăng - bug BE)                                    |

---

## 8. BUG CẦN BÁO BE

### Bug #3: `moveToNextRound()` không được gọi sau khi mentor review

**File**: `MentorReviewServiceImpl.java:32-99`

**Hiện tại**: Sau khi `mentorReview()` set `appDetail.status = COMPLETED`, KHÔNG gọi `applicationService.moveToNextRound()`.

**Hậu quả**:

- `Application.currentRoundOrder` không tăng → user vẫn thấy đang ở vòng cũ
- Nếu vòng Mentor Interview là vòng cuối → `Application.status` không chuyển sang PASSED/FAILED

**Sửa**: Thêm cuối method `mentorReview()`:

```java
Application application = applicationService
        .getApplicationById(appDetail.getApplicationId());
applicationService.moveToNextRound(application);
```

---

## 9. TÓM TẮT NHANH

| Bước | Endpoint                                               | Method | Auth     | Body                                                                                                                  |
| ---- | ------------------------------------------------------ | ------ | -------- | --------------------------------------------------------------------------------------------------------------------- |
| 7    | `/api/sessions/join-session`                           | POST   | Required | `{sessionName, userId, participantId, isMentor}`                                                                      |
| 8    | `/api/mentor-reviews`                                  | POST   | Required | `{sessionId, mentorId, userId, rating, situationNote, taskNote, actionNote, resultNote, strength, weakness, improve}` |
| 10   | `/api/applications/me`                                 | GET    | Required | (no body)                                                                                                             |
| 10   | `/api/application-details/application/{applicationId}` | GET    | Required | (no body)                                                                                                             |

**Base URL**: `https://api.kdz.asia`

---

## 10. PROMPT DÁN CHO AI ĐỂ CODE 100%

```
Hãy đọc file docs/FE_INTEGRATION_GUIDE_MENTOR_INTERVIEW_2026-07-13.md và code theo đúng hướng dẫn.

Cần làm:

1. **File: services/mentorInterview.service.ts** — Wrap 4 API calls:
   - `joinSession(payload)` → POST /api/sessions/join-session
   - `submitMentorReview(payload)` → POST /api/mentor-reviews
   - `getMyApplications()` → GET /api/applications/me
   - `getApplicationDetails(applicationId)` → GET /api/application-details/application/{applicationId}

2. **File: hooks/useMentorInterview.ts** — TanStack Query hooks:
   - `useJoinSession()`: useMutation cho joinSession
   - `useSubmitMentorReview()`: useMutation, invalidate 'my-applications' & 'application-details' onSuccess
   - `useMyApplications()`: useQuery
   - `useApplicationDetails(applicationId)`: useQuery, enabled khi có applicationId

3. **File: components/DailyCoJoinHandler.tsx** — Component nhận props {sessionName, userId, isMentor}. Lắng nghe Daily.co event 'participant-joined', filter participant.user_id === props.userId, gọi useJoinSession() với {sessionName, userId, participantId: event.participant.session_id, isMentor}.

4. **File: components/MentorReviewForm.tsx** — Form với 9 fields:
   - rating (number 1-10)
   - situationNote, taskNote, actionNote, resultNote, strength, weakness, improve (textarea)
   - Props: {sessionId, mentorId, userId, onSuccess}
   - Submit gọi useSubmitMentorReview()
   - Validation: rating bắt buộc 1-10
   - Hiển thị loading state với submitMutation.isPending
   - onSuccess: alert "Đánh giá thành công" + gọi props.onSuccess()
   - onError: alert error message từ response

5. **File: pages/MentorInterviewPage.tsx** — Trang phỏng vấn:
   - Đọc params từ URL: sessionName, sessionId, userId, mentorId, roomUrl
   - Tạo Daily.co call object, join room
   - State: interviewStarted, interviewEnded
   - Lắng nghe Daily.co 'left-meeting' event → setInterviewEnded(true)
   - Lấy currentUserId từ localStorage('user_id')
   - Lấy isCurrentUserMentor từ localStorage('user_role') === 'MENTOR'
   - Hiển thị DailyCoJoinHandler khi đang phỏng vấn
   - Hiển thị MentorReviewForm khi interviewEnded && isCurrentUserMentor
   - Hiển thị "Mentor đang đánh giá..." khi interviewEnded && !isCurrentUserMentor

6. **File: pages/MyApplicationsPage.tsx** (optional) — Hiển thị danh sách applications:
   - Gọi useMyApplications()
   - Với mỗi application, gọi useApplicationDetails(application.id)
   - Hiển thị: id, jdId, status (mapping màu), currentRoundOrder
   - Với mỗi ApplicationDetail, hiển thị: roundId, status (mapping màu), finalScore, finalResult

7. **Routing**: Thêm route /mentor/interview và /applications/me vào router.

Yêu cầu:
- TypeScript strict
- Sử dụng TanStack Query (đã có sẵn trong codebase)
- Sử dụng Daily.co SDK (@daily-co/daily-js)
- Auth: lấy JWT token từ localStorage('jwt_token')
- Base URL: https://api.kdz.asia
- Xử lý error từ axios: alert error message
- Mapping status enum sang tiếng Việt:
  - IN_PROGRESS → "Đang thi"
  - PASSED → "Đậu"
  - FAILED → "Tạch"
  - COMPLETED → "Hoàn thành"
  - PENDING → "Đang chờ"
  - SLOT_PICKED → "Đã chọn slot"
  - SUBMITTED → "Đã nộp bài"
  - AI_EVALUATED → "AI đã chấm"

Code đầy đủ, không bỏ sót, test thử với data mẫu từ Postman.
```
