# ⏱️ Hướng Dẫn Frontend: Tracking Thời Gian Tham Gia Phòng Mentor Interview (Online)

> **File chuyên đề** đi kèm `frontend_integration_mentor_interview_end_to_end.md`. Tài liệu này **CHỈ TẬP TRUNG** vào cách Frontend ghi nhận và hiển thị thời gian tham gia phòng (4 field: `startTime1`, `endTime1`, `startTime2`, `endTime2` + 2 field `durationSeconds1`, `durationSeconds2`).
>
> **Đối tượng:** Frontend Developer đang tích hợp vòng **Mentor Interview (Mentor Review)** qua Daily.co.

---

## 📋 Mục Lục

1. [Tổng Quan — 4 Field Thời Gian Là Gì](#1-tổng-quan--4-field-thời-gian-là-gì)
2. [Cơ Chế Hoạt Động — 2 Luồng Tracking Song Song](#2-cơ-chế-hoạt-động--2-luồng-tracking-song-song)
3. [API #1: POST /api/sessions/join-session (FE chủ động gọi)](#3-api-1-post-apisessionsjoin-session-fe-chủ-động-gọi)
4. [Webhook Daily.co (FE KHÔNG cần gọi — Backend tự xử lý)](#4-webhook-dailyco-fe-không-cần-gọi--backend-tự-xử-lý)
5. [Code React/TypeScript Hoàn Chỉnh cho Student](#5-code-reacttypescript-hoàn-chỉnh-cho-student)
6. [Code React/TypeScript Hoàn Chỉnh cho Mentor](#6-code-reacttypescript-hoàn-chỉnh-cho-mentor)
7. [Hiển Thị Lịch Sử Tham Gia](#7-hiển-thị-lịch-sử-tham-gia)
8. [Helper: Format Timestamp Vietnam (UTC+7)](#8-helper-format-timestamp-vietnam-utc7)
9. [Polling Status Session COMPLETED](#9-polling-status-session-completed)
10. [Edge Cases Tracking](#10-edge-cases-tracking)
11. [Debug Checklist](#11-debug-checklist)

---

## 1. Tổng Quan — 4 Field Thời Gian Là Gì

### 1.1 Bảng Field

| Field              | Type      | Lưu khi nào               | Lưu bởi ai                        | Ai được track    | Format                      |
| ------------------ | --------- | ------------------------- | --------------------------------- | ---------------- | --------------------------- |
| `joinTime`         | Timestamp | Lúc student đặt lịch      | FE request (lúc tạo session)      | —                | `"yyyy-MM-dd HH:mm:ss.SSS"` |
| `startTime1`       | Timestamp | **Student join phòng**    | FE gọi `/join-session` (cơ chế 1) | Student (userId) | `"yyyy-MM-dd HH:mm:ss.SSS"` |
| `endTime1`         | Timestamp | **Student leave phòng**   | Daily.co webhook (cơ chế 2)       | Student (userId) | `"yyyy-MM-dd HH:mm:ss.SSS"` |
| `startTime2`       | Timestamp | **Mentor join phòng**     | FE gọi `/join-session` (cơ chế 1) | Mentor (userId2) | `"yyyy-MM-dd HH:mm:ss.SSS"` |
| `endTime2`         | Timestamp | **Mentor leave phòng**    | Daily.co webhook (cơ chế 2)       | Mentor (userId2) | `"yyyy-MM-dd HH:mm:ss.SSS"` |
| `durationSeconds1` | Long      | **Sau khi student leave** | Backend tự tính (cơ chế 2)        | Student          | seconds (giây)              |
| `durationSeconds2` | Long      | **Sau khi mentor leave**  | Backend tự tính (cơ chế 2)        | Mentor           | seconds (giây)              |

### 1.2 Mapping với Entity

```typescript
// Java Entity: fpt.org.inblue.model.Session
interface Session {
    // ... các field khác
    private int userId;                    // Student ID (giữ nguyên tên trong DB)
    private String participantId1;         // Daily.co session_id của student
    private Timestamp startTime1;          // ★ LÚC STUDENT JOIN
    private Timestamp endTime1;            // ★ LÚC STUDENT LEAVE
    private Long durationSeconds1;         // ★ durationSeconds1 = (endTime1 - startTime1) / 1000

    private int userId2;                   // Mentor ID (DB column)
    private String participantId2;         // Daily.co session_id của mentor
    private Timestamp startTime2;          // ★ LÚC MENTOR JOIN
    private Timestamp endTime2;            // ★ LÚC MENTOR LEAVE
    private Long durationSeconds2;         // ★ durationSeconds2 = (endTime2 - startTime2) / 1000
}
```

> ⚠️ **Lưu ý:** Trong DB column tên là `userId2` (không phải `mentorId`). Nhưng khi trả về qua API, response field là `mentorId` (xem `convertToDetailResponse`).

### 1.3 Đặc điểm Quan Trọng

1. **Tất cả thời gian đều ở timezone Việt Nam (UTC+7)** — Backend dùng `helperConvertToVietNamTime()` = `currentTimeMillis() + 7*60*60*1000`.
2. **Tất cả thời gian KHÔNG có timezone suffix trong response** — Frontend phải tự thêm `+07:00` khi parse.
3. **Cả 2 bên đều leave → Session COMPLETED** — Trước đó status là `ONGOING`.
4. **Nếu 1 bên chưa leave → Session giữ ONGOING** → Mentor chưa thể đánh giá (lỗi 400).

---

## 2. Cơ Chế Hoạt Động — 2 Luồng Tracking Song Song

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CƠ CHẾ 1 (FE chủ động)         CƠ CHẾ 2 (Daily.co webhook tự động)   │
│  ──────────────────────         ────────────────────────────────────    │
│                                                                          │
│  [Student/Mentor]                  [Daily.co]                            │
│       │                                │                                 │
│       │ join()                         │                                 │
│       ▼                                │                                 │
│  Daily.co 'joined-meeting'             │                                 │
│       │                                │                                 │
│       │ FE lấy participantId           │                                 │
│       │ FE gọi POST /join-session      │                                 │
│       │                                │                                 │
│       ▼                                │                                 │
│  Backend set:                          │                                 │
│   • participantId1/2                   │                                 │
│   • startTime1/2  ★                    │                                 │
│   • status = ONGOING                   │                                 │
│                                                                          │
│       ... cuộc phỏng vấn diễn ra ...                                   │
│                                                                          │
│       │                                │                                 │
│       │ leave()                        │                                 │
│       ▼                                ▼                                 │
│                  [Daily.co gọi webhook]                                 │
│                       POST /api/sessions/webhooks/dailyco              │
│                       { type: "participant.left",                      │
│                         payload: { room, session_id } }                 │
│                              │                                           │
│                              ▼                                           │
│                  Backend set:                                            │
│                   • endTime1/2  ★                                       │
│                   • durationSeconds1/2 ★                                │
│                   • status = COMPLETED (nếu cả 2 đã leave)             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Tóm Tắt Vai Trò Frontend

| Hành động              | Ai làm                              | Khi nào                                 | Gọi API nào                                             |
| ---------------------- | ----------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Ghi nhận student join  | **FE** (lắng nghe `joined-meeting`) | Sau khi Daily.co xác nhận user đã vào   | `POST /api/sessions/join-session` với `isMentor: false` |
| Ghi nhận mentor join   | **FE** (lắng nghe `joined-meeting`) | Sau khi Daily.co xác nhận mentor đã vào | `POST /api/sessions/join-session` với `isMentor: true`  |
| Ghi nhận student leave | **Daily.co** (webhook tự động)      | Khi user rời phòng                      | (FE không cần làm gì)                                   |
| Ghi nhận mentor leave  | **Daily.co** (webhook tự động)      | Khi mentor rời phòng                    | (FE không cần làm gì)                                   |
| Biết Session COMPLETED | **FE** (polling)                    | Sau khi 2 bên leave                     | `GET /api/sessions/{id}` định kỳ                        |

---

## 3. API #1: POST /api/sessions/join-session (FE chủ động gọi)

### 3.1 Endpoint

```
POST /api/sessions/join-session
Authorization: Bearer {student_token HOẶC mentor_token}
Content-Type: application/json
```

### 3.2 Request Body

```json
{
  "sessionName": "session-1721234567890", // ← BẮT BUỘC, lấy từ session.roomName
  "userId": 5, // ← BẮT BUỘC, ID của user đang join
  "participantId": "xyz123abc-def456-789", // ← BẮT BUỘC, Daily.co session_id
  "isMentor": false // ← BẮT BUỘC, true cho mentor, false cho student
}
```

| Field           | Type    | Required | Mô tả chi tiết                                                                                                                                             |
| --------------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sessionName`   | string  | ✅       | Tên phòng (không phải URL). Lấy từ `session.roomName` trong response của `GET /api/sessions/{id}`. Format: `"session-{timestamp}"` hoặc `"OFFLINE-{uuid}"` |
| `userId`        | int     | ✅       | ID của student (`session.userId`) nếu `isMentor=false`. ID của mentor (`session.userId2`) nếu `isMentor=true`                                              |
| `participantId` | string  | ✅       | Daily.co session_id của participant. Lấy từ `call.participants().local.session_id`                                                                         |
| `isMentor`      | boolean | ✅       | `false` cho student, `true` cho mentor                                                                                                                     |

### 3.3 Response

**Thành công (200 OK):** (no body)

**Lỗi 404 Not Found:**

```json
{
  "message": "Không tìm thấy phòng họp !!"
}
```

> Xảy ra khi `sessionName` không match bất kỳ session nào trong DB.

**Lỗi 409 Conflict:**

```json
{
  "message": "Phòng họp chưa được duyệt"
}
```

> Xảy ra khi `session.status === "DRAFT"`. (Vòng Mentor Interview KHÔNG bao giờ ở DRAFT, lỗi này không xảy ra trong luồng Mentor Interview.)

**Lỗi 403 Forbidden:**

```json
{ "message": "Mentor ID không khớp với Session" }
```

> Xảy ra khi `isMentor=true` nhưng `userId` truyền lên không phải `session.userId2`.

```json
{ "message": "User ID không khớp với Session" }
```

> Xảy ra khi `isMentor=false` nhưng `userId` truyền lên không phải `session.userId`.

### 3.4 Sau Khi Gọi Thành Công — Field Session Cập Nhật

**Trường hợp Student join (lần đầu):**

```json
{
  "participantId1": "xyz123abc-def456-789", // ← MỚI
  "startTime1": "2026-07-20 10:05:23.456", // ← MỚI (giờ VN)
  "status": "ONGOING", // ← ĐỔI: SCHEDULED → ONGOING
  "endTime1": null, // ← Vẫn null (chưa leave)
  "durationSeconds1": null // ← Vẫn null
}
```

**Trường hợp Mentor join (lần đầu):**

```json
{
  "participantId2": "abc789xyz-123abc-456", // ← MỚI
  "startTime2": "2026-07-20 10:06:00.123", // ← MỚI (giờ VN)
  "status": "ONGOING", // ← Giữ nguyên (đã ONGOING từ student)
  "endTime2": null, // ← Vẫn null
  "durationSeconds2": null // ← Vẫn null
}
```

### 3.5 Logic Backend Tham Khảo

```java
// SessionServiceImpl.saveJoinRecord()
public void saveJoinRecord(JoinSessionDtoRequest request) {
    Session session = sessionRepository.findByRoomName(request.getSessionName());
    if (session == null) {
        throw new CustomException("Không tìm thấy phòng họp !!", HttpStatus.NOT_FOUND);
    } else if (session.getStatus().equals(SessionStatus.DRAFT)) {
        throw new CustomException("Phòng họp chưa được duyệt", HttpStatus.CONFLICT);
    }

    if (request.isMentor()) {
        // ★ Mentor
        if (session.getUserId2() == request.getUserId()) {
            session.setParticipantId2(request.getParticipantId());
            if (session.getStartTime2() == null) {                     // ← CHỈ SET LẦN ĐẦU
                session.setStartTime2(helperConvertToVietNamTime());   // ← GHI NHẬN GIỜ JOIN
            }
        } else {
            throw new CustomException("Mentor ID không khớp với Session", HttpStatus.FORBIDDEN);
        }
    } else {
        // ★ Student
        if (session.getUserId() == request.getUserId()) {
            session.setParticipantId1(request.getParticipantId());
            session.setStatus(SessionStatus.ONGOING);                  // ← CHUYỂN STATUS
            if (session.getStartTime1() == null) {                     // ← CHỈ SET LẦN ĐẦU
                session.setStartTime1(helperConvertToVietNamTime());   // ← GHI NHẬN GIỜ JOIN
            }
        } else {
            throw new CustomException("User ID không khớp với Session", HttpStatus.FORBIDDEN);
        }
    }
    sessionRepository.save(session);
}
```

> 🔑 **Insight quan trọng:** Field `startTime1/2` chỉ set **lần đầu tiên** user join (check `if (startTime1 == null)`). Nếu user refresh trang và join lại, `startTime` giữ nguyên giá trị cũ → đảm bảo tracking chính xác.

---

## 4. Webhook Daily.co (FE KHÔNG cần gọi — Backend tự xử lý)

### 4.1 Endpoint (Daily.co → Backend)

```
POST /api/sessions/webhooks/dailyco
Content-Type: application/json
```

> ⚠️ Daily.co tự động gọi endpoint này. **FRONTEND KHÔNG CẦN LÀM GÌ**.

### 4.2 Payload Daily.co Gửi

```json
{
  "type": "participant.left",
  "payload": {
    "room": "session-1721234567890", // ← roomName
    "session_id": "xyz123abc-def456-789", // ← participantId (Daily.co session_id)
    "recording_id": null
  }
}
```

### 4.3 Backend Xử Lý

```java
// SessionController.handleDailyCoWebhook()
@PostMapping(value = "webhooks/dailyco")
public ResponseEntity<Void> handleDailyCoWebhook(@RequestBody DailyWebHookPayload payload) {
    if ("participant.left".equals(payload.getEvent())) {
        sessionService.updateLeaveRecord(payload);
    }
    return ResponseEntity.ok().build();
}

// SessionServiceImpl.updateLeaveRecord()
public void updateLeaveRecord(DailyWebHookPayload payload) {
    if (payload == null || payload.getPayload() == null) return;

    String roomName = payload.getPayload().getRoomName();
    String participantId = payload.getPayload().getParticipantId();

    Session session = sessionRepository.findByRoomName(roomName);
    if (session == null) {
        System.err.println("Webhook Alert: Không tìm thấy Session cho room: " + roomName);
        return;                                                // ← Trả 200 cho Daily.co để ko retry
    }

    if (participantId.equals(session.getParticipantId1())) {
        // ★ Student leave
        session.setEndTime1(helperConvertToVietNamTime());      // ← GHI NHẬN GIỜ LEAVE
        if (session.getStartTime1() != null) {
            long duration = (session.getEndTime1().getTime() - session.getStartTime1().getTime()) / 1000L;
            session.setDurationSeconds1(duration);              // ← TÍNH DURATION (giây)
        }
    } else if (participantId.equals(session.getParticipantId2())) {
        // ★ Mentor leave
        session.setEndTime2(helperConvertToVietNamTime());       // ← GHI NHẬN GIỜ LEAVE
        if (session.getStartTime2() != null) {
            long duration = (session.getEndTime2().getTime() - session.getStartTime2().getTime()) / 1000L;
            session.setDurationSeconds2(duration);              // ← TÍNH DURATION (giây)
        }
    }

    // ★ KHI CẢ 2 BÊN ĐỀU LEAVE → COMPLETED
    if (session.getEndTime1() != null && session.getEndTime2() != null) {
        session.setStatus(SessionStatus.COMPLETED);
    }
    sessionRepository.save(session);
}
```

### 4.4 Sau Khi Webhook Xử Lý — Field Cập Nhật

**Sau khi Student leave:**

```json
{
  "participantId1": "xyz123abc-def456-789",
  "startTime1": "2026-07-20 10:05:23.456", // ← Giữ nguyên
  "endTime1": "2026-07-20 10:35:12.789", // ← MỚI (giờ VN)
  "durationSeconds1": 1789, // ← MỚI (≈ 29 phút 49 giây)
  "status": "ONGOING" // ← Vẫn ONGOING (đợi mentor leave)
}
```

**Sau khi Mentor leave (cả 2 xong):**

```json
{
  "participantId2": "abc789xyz-123abc-456",
  "startTime2": "2026-07-20 10:06:00.123", // ← Giữ nguyên
  "endTime2": "2026-07-20 10:35:30.456", // ← MỚI (giờ VN)
  "durationSeconds2": 1770, // ← MỚI (≈ 29 phút 30 giây)
  "status": "COMPLETED" // ← ĐỔI: ONGOING → COMPLETED
}
```

### 4.5 Field Cuối Cùng Sau Khi Hoàn Thành

```json
{
  "id": 50,
  "roomName": "session-1721234567890",
  "userId": 5, // Student ID
  "userId2": 3, // Mentor ID
  "participantId1": "xyz123abc-def456-789", // Daily.co ID của student
  "participantId2": "abc789xyz-123abc-456", // Daily.co ID của mentor
  "startTime1": "2026-07-20 10:05:23.456", // ★ Student join
  "endTime1": "2026-07-20 10:35:12.789", // ★ Student leave
  "durationSeconds1": 1789, // ★ Student tham gia 1789s (29m49s)
  "startTime2": "2026-07-20 10:06:00.123", // ★ Mentor join
  "endTime2": "2026-07-20 10:35:30.456", // ★ Mentor leave
  "durationSeconds2": 1770, // ★ Mentor tham gia 1770s (29m30s)
  "joinTime": "2026-07-20 10:00:00.000", // Lúc đặt lịch
  "status": "COMPLETED", // ★ CẢ 2 ĐÃ LEAVE
  "duration": 60, // Thời lượng đặt lịch (phút)
  "roomUrl": "https://inblue.daily.co/session-1721234567890",
  "recordUrl": null, // Sau khi xử lý recording sẽ có URL
  "mentorReview": null, // Sẽ fill sau khi mentor đánh giá
  "mentorFeedback": null
}
```

---

## 5. Code React/TypeScript Hoàn Chỉnh cho Student

### 5.1 Custom Hook: `useDailyTracking`

```typescript
// hooks/useDailyTracking.ts
import { useEffect, useRef, useState } from "react";
import DailyIframe from "@daily-co/daily-js";

interface UseDailyTrackingParams {
  roomUrl: string; // session.roomUrl
  roomName: string; // session.roomName (không phải URL)
  userId: number; // session.userId (student)
  token: string; // JWT token
  isMentor?: boolean; // false cho student, true cho mentor
}

export function useDailyTracking({
  roomUrl,
  roomName,
  userId,
  token,
  isMentor = false,
}: UseDailyTrackingParams) {
  const callRef = useRef<any>(null);
  const [joinedAt, setJoinedAt] = useState<Date | null>(null);
  const [leftAt, setLeftAt] = useState<Date | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [trackedParticipantId, setTrackedParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomUrl || roomUrl === "OFFLINE") return;

    const call = DailyIframe.createCallObject({
      url: roomUrl,
      // Room public nên không cần token
    });
    callRef.current = call;

    // ★ EVENT 1: Join thành công → gọi API track
    call.on("joined-meeting", async () => {
      const local = call.participants().local;
      const participantId = local.session_id;

      console.log("✅ Daily joined-meeting", { participantId, isMentor });

      try {
        const response = await fetch("/api/sessions/join-session", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionName: roomName,
            userId,
            participantId,
            isMentor,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          const msg = err.message || "Lỗi không xác định";
          console.error("❌ join-session failed:", msg);
          setJoinError(msg);
          return;
        }

        console.log("✅ Backend đã ghi nhận startTime");
        setTrackedParticipantId(participantId);
        setJoinedAt(new Date()); // local estimate
      } catch (err: any) {
        console.error("❌ join-session exception:", err);
        setJoinError(err.message);
      }
    });

    // ★ EVENT 2: Leave (Daily.co đã tự gọi webhook rồi, FE chỉ log)
    call.on("left-meeting", () => {
      console.log("👋 Daily left-meeting. Backend đã tự ghi nhận endTime qua webhook.");
      setLeftAt(new Date()); // local estimate
    });

    // ★ EVENT 3: Bị kick / disconnect
    call.on("error", (error: any) => {
      console.error("❌ Daily error:", error);
    });

    // Auto join
    call.join();

    return () => {
      call.destroy();
    };
  }, [roomUrl, roomName, userId, token, isMentor]);

  return {
    joinedAt,
    leftAt,
    joinError,
    trackedParticipantId,
    leave: () => callRef.current?.leave(),
  };
}
```

### 5.2 Component: `StudentOnlineRoom`

```tsx
// components/StudentOnlineRoom.tsx
import { useEffect, useState } from "react";
import { useDailyTracking } from "../hooks/useDailyTracking";

interface Props {
  sessionId: number;
  token: string;
  studentId: number;
}

export function StudentOnlineRoom({ sessionId, token, studentId }: Props) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Lấy session detail (chứa roomUrl, roomName, userId, userId2)
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSession(data);
        setLoading(false);
      });
  }, [sessionId, token]);

  // 2. Track thời gian khi vào phòng
  const { joinedAt, leftAt, joinError, leave } = useDailyTracking({
    roomUrl: session?.roomUrl,
    roomName: session?.roomName,
    userId: studentId,
    token,
    isMentor: false,
  });

  if (loading) return <Spin tip="Đang tải phòng..." />;

  // Kiểm tra nếu session OFFLINE
  if (session.roomUrl === "OFFLINE") {
    return <Alert type="warning" message="Phòng này là OFFLINE, không thể vào đây" />;
  }

  return (
    <Card title={`Phòng phỏng vấn: ${session.roomName}`}>
      {joinError && <Alert type="error" message={`Lỗi tracking: ${joinError}`} />}

      <Descriptions column={2} bordered>
        <Descriptions.Item label="Lúc đặt lịch">
          {session.joinTime ? formatVN(session.joinTime) : "-"}
        </Descriptions.Item>
        <Descriptions.Item label="Thời lượng đặt lịch">{session.duration} phút</Descriptions.Item>
        <Descriptions.Item label="Bạn vào phòng">
          {joinedAt ? formatDateTime(joinedAt) : "Đang chờ..."}
        </Descriptions.Item>
        <Descriptions.Item label="Bạn rời phòng">
          {leftAt ? formatDateTime(leftAt) : "Chưa rời"}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Space>
        <Button danger onClick={leave} disabled={!leftAt && !joinedAt}>
          Rời phòng
        </Button>
        <Text type="secondary">Thời gian tham gia sẽ được ghi nhận tự động</Text>
      </Space>
    </Card>
  );
}

function formatDateTime(d: Date) {
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
```

---

## 6. Code React/TypeScript Hoàn Chỉnh cho Mentor

### 6.1 Component: `MentorOnlineRoom`

```tsx
// components/MentorOnlineRoom.tsx
import { useDailyTracking } from "../hooks/useDailyTracking";

interface Props {
  session: any; // SessionDetail từ API
  token: string;
  mentorId: number; // session.userId2
}

export function MentorOnlineRoom({ session, token, mentorId }: Props) {
  const { joinedAt, leftAt, joinError, leave } = useDailyTracking({
    roomUrl: session.roomUrl,
    roomName: session.roomName,
    userId: mentorId, // ← Lấy từ session.userId2
    token,
    isMentor: true, // ← TRUE cho mentor
  });

  if (session.roomUrl === "OFFLINE") {
    return <OfflineScheduleConfirm session={session} />;
  }

  return (
    <Card title={`Phỏng vấn: ${session.roomName}`}>
      {joinError && <Alert type="error" message={`Lỗi tracking: ${joinError}`} />}

      <Descriptions column={2} bordered>
        <Descriptions.Item label="Lúc đặt lịch">{formatVN(session.joinTime)}</Descriptions.Item>
        <Descriptions.Item label="Bạn vào phòng">
          {joinedAt ? formatDateTime(joinedAt) : "Đang chờ..."}
        </Descriptions.Item>
        <Descriptions.Item label="Bạn rời phòng">
          {leftAt ? formatDateTime(leftAt) : "Chưa rời"}
        </Descriptions.Item>
        <Descriptions.Item label="Student ID">{session.userId}</Descriptions.Item>
      </Descriptions>

      <Button danger onClick={leave}>
        Rời phòng
      </Button>
    </Card>
  );
}
```

### 6.2 Component: `MentorSessionListWithTracking`

```tsx
// components/MentorSessionListWithTracking.tsx
import { useEffect, useState } from "react";

export function MentorSessionListWithTracking({
  mentorId,
  token,
}: {
  mentorId: number;
  token: string;
}) {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/sessions/${mentorId}/by-user`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSessions(data.filter((s: any) => s.userId2 === mentorId)));
  }, [mentorId, token]);

  return (
    <Table
      dataSource={sessions}
      rowKey="id"
      columns={[
        { title: "Phòng", dataIndex: "roomName" },
        { title: "Lúc đặt", dataIndex: "joinTime", render: formatVN },
        {
          title: "Bạn vào",
          dataIndex: "startTime2",
          render: (t: string) => (t ? formatVN(t) : <Tag>Chưa</Tag>),
        },
        {
          title: "Bạn rời",
          dataIndex: "endTime2",
          render: (t: string) => (t ? formatVN(t) : <Tag>Chưa</Tag>),
        },
        {
          title: "Thời lượng",
          dataIndex: "durationSeconds2",
          render: (s: number | null) => (s != null ? formatSeconds(s) : "-"),
        },
        {
          title: "Student",
          dataIndex: "userId",
        },
        {
          title: "Trạng thái",
          dataIndex: "status",
          render: (s: string) => <Tag color={statusColor(s)}>{s}</Tag>,
        },
      ]}
    />
  );
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function statusColor(s: string): string {
  if (s === "COMPLETED") return "green";
  if (s === "ONGOING") return "blue";
  if (s === "SCHEDULED") return "gold";
  return "default";
}
```

---

## 7. Hiển Thị Lịch Sử Tham Gia

### 7.1 Component: `SessionTimeline`

```tsx
// components/SessionTimeline.tsx
interface Props {
  session: any;
}

export function SessionTimeline({ session }: Props) {
  const studentStarted = session.startTime1;
  const studentLeft = session.endTime1;
  const mentorStarted = session.startTime2;
  const mentorLeft = session.endTime2;

  const isStudentCompleted = studentStarted && studentLeft;
  const isMentorCompleted = mentorStarted && mentorLeft;

  return (
    <Card title="📊 Lịch sử tham gia phòng">
      <Timeline>
        <Timeline.Item color="green">
          <Text strong>Lúc đặt lịch:</Text> {formatVN(session.joinTime)}
        </Timeline.Item>

        <Timeline.Item color={studentStarted ? "green" : "gray"}>
          <Text strong>Student vào:</Text>{" "}
          {studentStarted ? formatVN(studentStarted) : <Tag>Chưa vào</Tag>}
        </Timeline.Item>

        <Timeline.Item color={mentorStarted ? "green" : "gray"}>
          <Text strong>Mentor vào:</Text>{" "}
          {mentorStarted ? formatVN(mentorStarted) : <Tag>Chưa vào</Tag>}
        </Timeline.Item>

        <Timeline.Item color={studentLeft ? "green" : "gray"}>
          <Text strong>Student rời:</Text>{" "}
          {studentLeft ? formatVN(studentLeft) : <Tag>Chưa rời</Tag>}
          {isStudentCompleted && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Tham gia {formatSeconds(session.durationSeconds1)}
            </Tag>
          )}
        </Timeline.Item>

        <Timeline.Item color={mentorLeft ? "green" : "gray"}>
          <Text strong>Mentor rời:</Text> {mentorLeft ? formatVN(mentorLeft) : <Tag>Chưa rời</Tag>}
          {isMentorCompleted && (
            <Tag color="blue" style={{ marginLeft: 8 }}>
              Tham gia {formatSeconds(session.durationSeconds2)}
            </Tag>
          )}
        </Timeline.Item>

        <Timeline.Item color={session.status === "COMPLETED" ? "green" : "orange"}>
          <Text strong>Trạng thái:</Text>{" "}
          <Tag color={statusColor(session.status)}>{session.status}</Tag>
        </Timeline.Item>
      </Timeline>
    </Card>
  );
}
```

### 7.2 Helper Format Seconds

```typescript
// utils/formatDuration.ts
export function formatSeconds(s: number | null | undefined): string {
  if (s == null) return "-";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} giờ ${m} phút ${sec} giây`;
  if (m > 0) return `${m} phút ${sec} giây`;
  return `${sec} giây`;
}

// Ví dụ:
// formatSeconds(1789) → "29 phút 49 giây"
// formatSeconds(3661) → "1 giờ 1 phút 1 giây"
```

---

## 8. Helper: Format Timestamp Vietnam (UTC+7)

### 8.1 Vấn Đề Timezone

Backend lưu `Timestamp` theo giờ VN (UTC+7) nhưng **response là string không có timezone suffix**:

```json
"startTime1": "2026-07-20 10:05:23.456"
```

Nếu FE dùng `new Date("2026-07-20 10:05:23.456")` không có TZ → browser sẽ interpret theo local timezone → **sai** ở các máy khác timezone.

### 8.2 Helper Functions

```typescript
// utils/timezone.ts

/**
 * Parse timestamp string từ Backend (giờ VN, không có TZ suffix) → Date object.
 */
export function parseVN(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null;
  // "2026-07-20 10:05:23.456" → "2026-07-20T10:05:23.456+07:00"
  return new Date(timestamp.replace(" ", "T") + "+07:00");
}

/**
 * Format Date object → string giờ VN hiển thị cho user.
 */
export function formatVN(timestamp: string | null | undefined): string {
  const date = parseVN(timestamp);
  if (!date) return "-";
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Format chỉ giờ:phút:giây
 */
export function formatVNTime(timestamp: string | null | undefined): string {
  const date = parseVN(timestamp);
  if (!date) return "-";
  return date.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Format chỉ ngày
 */
export function formatVNDate(timestamp: string | null | undefined): string {
  const date = parseVN(timestamp);
  if (!date) return "-";
  return date.toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Tính duration giữa 2 timestamp
 */
export function getDurationSec(startTs: string | null, endTs: string | null): number | null {
  const start = parseVN(startTs);
  const end = parseVN(endTs);
  if (!start || !end) return null;
  return Math.floor((end.getTime() - start.getTime()) / 1000);
}

/**
 * Format seconds → human readable (VD: "1 giờ 30 phút 45 giây")
 */
export function formatSecondsVN(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} giờ ${m} phút ${s} giây`;
  if (m > 0) return `${m} phút ${s} giây`;
  return `${s} giây`;
}
```

### 8.3 Sử Dụng

```tsx
import { formatVN, getDurationSec, formatSecondsVN } from '../utils/timezone';

// Hiển thị thời gian
<Typography.Text>
    Student vào: {formatVN(session.startTime1)}
</Typography.Text>

// Tính duration
const duration = getDurationSec(session.startTime1, session.endTime1);
<Typography.Text>
    Thời lượng: {formatSecondsVN(duration)}
</Typography.Text>

// Hoặc dùng durationSeconds1 có sẵn từ backend
<Typography.Text>
    Thời lượng (BE tính): {formatSecondsVN(session.durationSeconds1)}
</Typography.Text>
```

---

## 9. Polling Status Session COMPLETED

Vì FE không nhận được webhook Daily.co, cần polling để biết khi nào cả 2 bên đều leave.

### 9.1 Custom Hook Polling

```typescript
// hooks/useSessionPolling.ts
import { useEffect, useState } from "react";

interface UseSessionPollingParams {
  sessionId: number;
  token: string;
  intervalMs?: number; // mặc định 10s
  maxWaitMs?: number; // mặc định 3 giờ
  stopWhen?: (s: any) => boolean;
}

export function useSessionPolling({
  sessionId,
  token,
  intervalMs = 10_000,
  maxWaitMs = 3 * 60 * 60 * 1000,
  stopWhen,
}: UseSessionPollingParams) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let timer: any;
    const startTime = Date.now();

    const poll = async () => {
      const elapsedMs = Date.now() - startTime;
      if (elapsedMs > maxWaitMs) {
        console.warn("Polling timeout");
        return;
      }

      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSession(data);
        setElapsed(elapsedMs);

        if (stopWhen?.(data)) {
          setLoading(false);
          return;
        }

        timer = setTimeout(poll, intervalMs);
      } catch (err) {
        console.error("Polling error:", err);
        timer = setTimeout(poll, intervalMs);
      }
    };

    poll();

    return () => clearTimeout(timer);
  }, [sessionId, token, intervalMs, maxWaitMs]);

  return { session, loading, elapsed };
}
```

### 9.2 Sử Dụng: Mentor Đợi Session COMPLETED

```tsx
// Trong MentorDashboardPage.tsx
function MentorReviewTrigger({ sessionId, token }: { sessionId: number; token: string }) {
  // Polling mỗi 10s, dừng khi status === 'COMPLETED'
  const { session, loading, elapsed } = useSessionPolling({
    sessionId,
    token,
    intervalMs: 10_000,
    stopWhen: (s) => s.status === "COMPLETED",
  });

  if (loading) return <Spin tip="Đang chờ phỏng vấn kết thúc..." />;

  // Kiểm tra đầy đủ điều kiện
  const canReview =
    session.status === "COMPLETED" && !session.mentorReview && !session.mentorFeedback;

  if (canReview) {
    return (
      <Card>
        <Title>✅ Phỏng vấn đã kết thúc</Title>
        <Text>Student tham gia: {formatSecondsVN(session.durationSeconds1)}</Text>
        <Text>Bạn tham gia: {formatSecondsVN(session.durationSeconds2)}</Text>
        <Button type="primary" onClick={() => navigate(`/mentor/review/${sessionId}`)}>
          Đánh giá ứng viên
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <Text>Session vẫn đang diễn ra. Trạng thái: {session.status}</Text>
      <Text>Đã chờ: {Math.floor(elapsed / 1000)}s</Text>
    </Card>
  );
}
```

### 9.3 Hiển Thị Realtime Tracking (Optional)

```tsx
function LiveTrackingDisplay({ session, isMentor }: { session: any; isMentor: boolean }) {
  const myField = isMentor ? "startTime2" : "startTime1";
  const started = !!session[myField];

  if (!started) {
    return <Tag color="default">Bạn chưa vào phòng</Tag>;
  }

  // Realtime elapsed since join
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = parseVN(session[myField])!.getTime();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [session[myField]]);

  return <Tag color="green">⏱️ Đã vào phòng {formatSecondsVN(elapsed)}</Tag>;
}
```

---

## 10. Edge Cases Tracking

### 10.1 User Refresh Trang / Join Lần 2

**Hành vi Backend:**

```java
if (session.getStartTime1() == null) {                     // ★ Chỉ set lần đầu
    session.setStartTime1(helperConvertToVietNamTime());
}
// Nếu đã có startTime1 → giữ nguyên giá trị cũ
```

**Hành vi FE:**

- `participantId1` bị overwrite bằng session_id mới (đúng, vì participant mới)
- `startTime1` giữ nguyên (đúng, vì tracking thời gian thực tế)
- `endTime1` sẽ được set khi leave (nếu user mới rời → set lại)

### 10.2 User Mất Mạng / Tab Đóng Đột Ngột

**Hành vi Daily.co:**

- Daily.co tự động phát hiện user disconnect sau ~30s
- Daily.co tự gọi webhook `participant.left` với session_id của user

**→ Backend vẫn tracking được**, không cần FE xử lý.

### 10.3 1 Bên Vào Trước, 1 Bên Sau

```
10:00:00 Student join
10:00:00 student.startTime1 = 10:00:00, session.status = ONGOING
10:05:00 Mentor join
10:05:00 mentor.startTime2 = 10:05:00, status vẫn ONGOING
```

→ Cả 2 field đều được track riêng biệt. OK.

### 10.4 Mentor Vào Trước Student

```
10:00:00 Mentor join
10:00:00 mentor.startTime2 = 10:00:00, session.status giữ SCHEDULED (chưa có student)
                     ★ LƯU Ý: status KHÔNG chuyển ONGOING khi mentor vào trước
10:05:00 Student join
10:05:00 student.startTime1 = 10:05:00, session.status = ONGOING
```

→ Vẫn track đúng. Status chỉ chuyển ONGOING khi student join.

### 10.5 1 Bên Leave, Bên Kia Chưa Leave

```
10:30:00 Student leave
10:30:00 student.endTime1 = 10:30:00, durationSeconds1 = 1800
          session.endTime2 vẫn null → status vẫn ONGOING
```

→ `status` không đổi sang COMPLETED. Nếu lúc này gọi `/api/mentor-reviews`:

- Lỗi 400: "Cannot review mentor for a session that is not completed"

### 10.6 Cả 2 Leave Cùng Lúc (Hiếm)

- Daily.co gọi 2 webhook liên tiếp
- Backend xử lý tuần tự → set endTime1, endTime2, status = COMPLETED

### 10.7 Session OFFLINE

- `session.roomUrl = "OFFLINE"` → KHÔNG dùng Daily.co, KHÔNG có tracking phòng
- `session.status = "COMPLETED"` ngay từ lúc tạo
- `startTime1/2`, `endTime1/2`, `durationSeconds1/2` → TẤT CẢ = `null`
- Mentor có thể đánh giá ngay

### 10.8 Session Quá Hạn Daily.co (`exp`)

- Backend set `exp = joinTime + 1 giờ` (xem `SessionServiceImpl.createSession`)
- Sau khi quá `exp`, không ai join được nữa
- Nếu user đang trong phòng → vẫn ở đó đến khi leave

### 10.9 Gọi `/join-session` Với Sai `userId`

- Lỗi 403: "Mentor ID không khớp với Session" hoặc "User ID không khớp với Session"
- **Fix FE:** Luôn lấy `userId` từ `session.userId` (student) hoặc `session.userId2` (mentor), KHÔNG hardcode.

### 10.10 Gọi `/join-session` 2 Lần Liên Tiếp

- `participantId1` bị overwrite (không quan trọng)
- `startTime1` giữ nguyên nếu đã set
- `status` giữ nguyên (đã ONGOING)
- **Không lỗi**, idempotent.

---

## 11. Debug Checklist

Khi tracking không hoạt động, kiểm tra theo thứ tự:

### ✅ Checklist cho Student FE

- [ ] `session.roomUrl` có đúng URL Daily.co (không phải "OFFLINE")?
- [ ] `session.roomName` được truyền đúng (không phải roomUrl)?
- [ ] `userId` truyền đúng là `session.userId` (không phải `session.userId2`)?
- [ ] `isMentor: false` đúng chưa?
- [ ] Event `joined-meeting` có fire không? (Log ra `call.participants().local.session_id`)
- [ ] `local.session_id` có phải string không null?
- [ ] API `/join-session` trả 200 OK?
- [ ] Backend response có set `startTime1` không?

### ✅ Checklist cho Mentor FE

- [ ] `userId` truyền đúng là `session.userId2` (KHÔNG phải `session.userId`)?
- [ ] `isMentor: true` đúng chưa?
- [ ] Event `joined-meeting` có fire không?
- [ ] API `/join-session` trả 200 OK?
- [ ] Backend response có set `startTime2` không?

### ✅ Checklist cho Backend Tracking (endTime)

- [ ] Daily.co webhook có được gọi không? (Kiểm tra log backend)
- [ ] `participantId1/2` đã được set trước đó chưa? (Webhook cần match participantId)
- [ ] Webhook payload có đúng format `type: "participant.left"` không?
- [ ] Webhook chỉ xử lý event `participant.left` (bỏ qua các event khác)
- [ ] Sau cả 2 leave, `status` có chuyển `COMPLETED` không?
- [ ] `endTime1/2` và `durationSeconds1/2` đã được set?

### ✅ Test Cases Quan Trọng

| Test Case                                    | Expected                                                        |
| -------------------------------------------- | --------------------------------------------------------------- |
| Student join rồi leave, mentor chưa join     | status=ONGOING, endTime1 có, durationSeconds1 có, endTime2=null |
| Mentor join trước, student join sau          | startTime2 có, startTime1 có sau, status=ONGOING                |
| Cả 2 leave đúng thứ tự                       | endTime1/2 có, durationSeconds1/2 có, status=COMPLETED          |
| Student refresh trang 2 lần                  | startTime1 giữ nguyên (set lần đầu), participantId1 đổi         |
| Mentor gọi join-session với `isMentor=false` | Lỗi 403                                                         |
| Student gọi join-session với `isMentor=true` | Lỗi 403                                                         |
| Session OFFLINE                              | status=COMPLETED ngay, các field thời gian = null               |

---

## 🎯 TL;DR cho FE Agent

**Để track thời gian tham gia phòng Mentor Interview:**

1. **Khi user vào phòng:** Lắng nghe Daily.co `joined-meeting` → gọi `POST /api/sessions/join-session` với:
   - `sessionName = session.roomName`
   - `userId = session.userId` (student) hoặc `session.userId2` (mentor)
   - `participantId = call.participants().local.session_id`
   - `isMentor = false | true`

2. **Khi user rời phòng:** KHÔNG cần làm gì — Daily.co tự gọi webhook để backend ghi `endTime`.

3. **Để biết Session COMPLETED:** Polling `GET /api/sessions/{id}` mỗi 10s, check `status === "COMPLETED"`.

4. **Để hiển thị:** Parse timestamp với timezone `+07:00` (xem helper `parseVN`/`formatVN`).

5. **Để hiển thị thời lượng:** Dùng `durationSeconds1/2` (BE đã tính sẵn) hoặc tự tính `(endTime - startTime) / 1000`.

---

✅ **File này là tài liệu chuyên đề đầy đủ 100% về tracking thời gian. FE Agent có thể implement trực tiếp mà không cần đọc thêm docs nào khác.**
