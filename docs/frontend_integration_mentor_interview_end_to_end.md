# 🚀 Tài Liệu Tích Hợp Frontend - Luồng End-to-End Vòng **Mentor Interview (tên gốc: Mentor Review)**

> **Lưu ý quan trọng:** Vòng này về bản chất là phỏng vấn với Mentor, **trong Backend đang được đặt tên nhầm là `MentorReview`** (xem `RoundType.MENTROR_REVIEW`, `MentorReview`, `MentorFeedback`). Frontend hiển thị cho người dùng với tên **"Mentor Interview"** hoặc **"Phỏng vấn với Mentor"**. Khi làm việc với API, code cần dùng đúng các key sau:
> - `RoundType = "MENTROR_REVIEW"` (đúng — typo từ backend, không được sửa)
> - `applicationDetails[].status = "AWAITING_MENTOR" | "PENDING" | "SLOT_PICKED" | "COMPLETED"`
> - `sessionInfo.meetingType = "ONLINE" | "OFFLINE"`

---

## 📋 Mục Lục

1. [Tổng Quan Luồng (Big Picture)](#1-tổng-quan-luồng-big-picture)
2. [Cơ Sở Dữ Liệu & Enum Quan Trọng](#2-cơ-sở-dữ-liệu--enum-quan-trọng)
3. [Auth — Đăng Nhập Chung](#3-auth--đăng-nhập-chung)
4. [Phase 1: Ứng Viên Apply Job](#4-phase-1-ứng-viên-apply-job)
5. [Phase 2: Ứng Viên Xem Danh Sách Vòng Của Mình](#5-phase-2-ứng-viên-xem-danh-sách-vòng-của-mình)
6. [Phase 3: Admin Xem & Gán Mentor](#6-phase-3-admin-xem--gán-mentor)
7. [Phase 4: Ứng Viên Chọn Lịch + Hình Thức](#7-phase-4-ứng-viên-chọn-lịch--hình-thức)
8. [Phase 5: Ứng Viên Vào Phòng Online](#8-phase-5-ứng-viên-vào-phòng-online-online-only)
9. [Phase 6: Mentor Xem Lịch & Vào Phòng](#9-phase-6-mentor-xem-lịch--vào-phòng)
10. [Phase 7: Mentor Đánh Giá (Review + Feedback)](#10-phase-7-mentor-đánh-giá-review--feedback)
11. [Phase 8: Hoàn Thành Vòng & Chuyển Vòng Tiếp](#11-phase-8-hoàn-thành-vòng--chuyển-vòng-tiếp)
12. [Bảng Trạng Thái Hoàn Chỉnh](#12-bảng-trạng-thái-hoàn-chỉnh)
13. [Luồng OFFLINE Riêng](#13-luồng-offline-riêng)
14. [Lỗi Thường Gặp & Edge Cases](#14-lỗi-thường-gặp--edge-cases)
15. [Bảng Endpoint Tổng Hợp](#15-bảng-endpoint-tổng-hợp)

---

## 1. Tổng Quan Luồng (Big Picture)

```
┌──────────────────────────────────────────────────────────────────┐
│  STUDENT (Ứng viên)         ADMIN            MENTOR              │
└──────────────────────────────────────────────────────────────────┘
        │                        │                  │
   [1] Apply Job                 │                  │
        │ POST /api/applications?jdId=X              │
        ▼                        │                  │
   status: IN_PROGRESS            │                  │
   (ApplicationDetail tự tạo:    │                  │
    status=AWAITING_MENTOR)       │                  │
        │                        │                  │
        ▼                        │                  │
   [2] Xem list ApplicationDetail │                  │
        │ GET /api/application-details/application/{appId}
        ▼                        │                  │
   Thấy status=AWAITING_MENTOR    │                  │
   → "Đợi admin gán mentor"      │                  │
        │                        │                  │
        │         [3] Admin gán mentor              │
        │              │ PUT /api/application-details/{detailId}/assign-mentor?mentorId=X
        │              ▼                             │
        │     status: AWAITING_MENTOR → PENDING      │
        │              │                             │
        │              ▼                             │
        │     Trong sessionInfo set startTime/endTime│
        │              │                             │
        ▼              ▼                             ▼
   [4] Student chọn lịch                          │
        │ POST /api/sessions/create-for-round        │
        │ {applicationDetailId, joinTime,           │
        │  duration, offline}                       │
        ▼                                           │
   ┌────────────────┐                               │
   │ ONLINE         │                               │
   │ status →       │                               │
   │ SLOT_PICKED    │                               │
   │ + tạo phòng    │                               │
   │   Daily.co     │                               │
   │ + status Ses-  │                               │
   │   sion=SCHEDULED│                              │
   └────────┬───────┘                               │
            │                                       │
   [5] Student click "Vào phòng"                    │
            │ FE lấy session.roomUrl                │
            │ + Join Daily.co iframe                │
            ▼                                       │
   [6] Mentor xem list sessions                    │
            │ GET /api/sessions/{mentorId}/by-user  │
            ▼                                       ▼
   [7] Mentor click vào session → Mở Daily iframe
            │                                       │
            ▼                                       ▼
   [8] Phỏng vấn diễn ra (video call)
            │
            ▼
   [9] Sau phỏng vấn - Daily.co webhook "participant.left"
       → status Session = COMPLETED
            │
            ▼
   [10] Mentor submit Review (POST /api/mentor-reviews)
            │
            ▼
   [11] Mentor submit Feedback (POST /api/mentor-feedbacks)
            │
            ▼
   [12] Backend tự động (checkAndCompleteRound):
        - status ApplicationDetail → COMPLETED
        - finalScore = (review.rating / 10) * maxScore
        - finalResult = PASSED | FAILED
        - moveToNextRound() → Application sang vòng tiếp theo
        - Nếu hết vòng → Application.status = PASSED | FAILED
```

---

## 2. Cơ Sở Dữ Liệu & Enum Quan Trọng

### 2.1 `ApplicationDetailStatus`
```java
public enum ApplicationDetailStatus {
    PENDING,          // Đang chờ ứng viên chọn hình thức (sau khi admin gán mentor)
    AWAITING_MENTOR,  // Vòng Mentor Interview - đang chờ Admin gán mentor
    SLOT_PICKED,      // Ứng viên đã chọn online, tạo phòng Daily, đang chờ vào phòng
    SUBMITTED,        // (không dùng cho Mentor Interview - là vòng khác)
    AI_EVALUATED,     // (không dùng cho Mentor Interview)
    COMPLETED         // HR/Backend đã chốt kết quả
}
```

### 2.2 `MeetingType`
```java
public enum MeetingType {
    ONLINE,   // Có tạo phòng Daily.co
    OFFLINE   // Không tạo phòng, gặp trực tiếp
}
```

### 2.3 `SessionStatus`
```java
public enum SessionStatus {
    DRAFT,       // Vừa tạo phòng (chưa có ai duyệt) - Mentor Interview KHÔNG dùng
    SCHEDULED,   // Phòng đã sẵn sàng, chờ join (status của Mentor Interview ONLINE)
    PAID,        // Đã thanh toán (không dùng cho Mentor Interview)
    REJECTED,    // Bị từ chối
    ONGOING,     // Đang trong phòng (sau khi user join)
    COMPLETED,   // Đã kết thúc (cả 2 bên đều rời phòng)
    CANCELED     // Bị hủy
}
```

### 2.4 `RoundType`
```java
public enum RoundType {
    CV_SCREENING,
    EMAIL_SIMULATOR,
    QUIZ,
    CODING,
    CODE_REVIEW,
    MENTROR_REVIEW,   // ← Vòng Mentor Interview (typo từ backend, để nguyên)
    AI_INTERVIEW
}
```

### 2.5 `ApplicationDetail` — Object quan trọng nhất
```typescript
interface ApplicationDetail {
    id: number;                              // PK
    applicationId: number;                   // FK → Application
    roundId: number;                         // FK → Round (roundType = MENTROR_REVIEW)
    status: 'PENDING' | 'AWAITING_MENTOR' | 'SLOT_PICKED' | 'SUBMITTED' | 'AI_EVALUATED' | 'COMPLETED';
    finalScore: number | null;               // Điểm cuối (sau khi COMPLETED)
    finalResult: 'PASSED' | 'FAILED' | null;
    mentorId: number | null;                 // ← ID mentor do admin gán (quan trọng!)
    sessionId: number | null;                // ← FK → Session
    sessionInfo: RoundSessionInfo | null;    // ← JSONB, chi tiết lịch hẹn
    startedAt: string;                       // ISO datetime
    completedAt: string | null;
    // ... các field khác (không liên quan Mentor Interview)
}

interface RoundSessionInfo {
    sessionId: number | null;                // null khi AWAITING_MENTOR
    meetingType: 'ONLINE' | 'OFFLINE' | null; // null khi AWAITING_MENTOR hoặc PENDING (chưa chọn)
    startTime: string | null;                // "yyyy-MM-dd HH:mm:ss.SSS" (TZ: Asia/Ho_Chi_Minh)
    endTime: string | null;
}
```

### 2.6 `Session` (Phòng Daily.co)
```typescript
interface Session {
    id: number;
    roomName: string;                        // VD: "session-1721234567890"
    userId: number;                          // ID student
    userId2: number;                         // ID mentor (lưu ý tên field = userId2, response = mentorId)
    roomUrl: string;                         // URL phòng Daily.co (response dùng để embed iframe)
    joinTime: string;                        // "yyyy-MM-dd HH:mm:ss.SSS" (TZ: Asia/Ho_Chi_Minh)
    status: 'DRAFT' | 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELED' | 'PAID' | 'REJECTED';
    duration: number | null;                 // phút
    recordUrl: string | null;                // URL recording (sau khi COMPLETED + processing)
    participantId1: string | null;           // Daily.co participant ID của student
    participantId2: string | null;           // Daily.co participant ID của mentor
    startTime1: string | null;               // Lúc student join
    endTime1: string | null;                 // Lúc student leave
    startTime2: string | null;               // Lúc mentor join
    endTime2: string | null;                 // Lúc mentor leave
    durationSeconds1: number | null;
    durationSeconds2: number | null;
    mentorReview: MentorReviewResponse | null;
    mentorFeedback: MentorFeedbackResponse | null;
    // các field khác (sessionKey, kioskId, transactionCode, totalPrice) - KHÔNG dùng cho Mentor Interview
}
```

---

## 3. Auth — Đăng Nhập Chung

> ⚠️ **Tất cả API (trừ các public endpoint) đều yêu cầu JWT Bearer Token trong header `Authorization`.**

### 3.1 Login (cho cả Student/Admin/Mentor)
```
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
    "email": "student@example.com",
    "password": "password123"
}
```

**Response 200 OK:**
```
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Body: "eyJhbGciOiJIUzI1NiJ9..."
```

**Response 401 Unauthorized:**
```json
{
    "timestamp": "2026-07-17T...",
    "status": 401,
    "error": "Unauthorized",
    "message": "Bad credentials"
}
```

### 3.2 JWT Payload (giải mã)
```json
{
    "sub": "student@example.com",
    "userId": 5,           // ← ID dùng cho mọi query
    "role": "USER",        // ← "USER" | "ADMIN" | "MENTOR" | "STAFF"
    "roles": ["ROLE_USER"],
    "email": "student@example.com",
    "name": "Nguyen Van A",
    "avatarUrl": "https://..."
}
```

> **Roles trong hệ thống:**
> - `ROLE_USER` / `USER` → Student (ứng viên)
> - `ROLE_ADMIN` / `ADMIN` → Admin (gán mentor)
> - `ROLE_MENTOR` / `MENTOR` → Mentor (xem lịch, đánh giá)
> - `ROLE_STAFF` / `STAFF` → Nhân viên HR (chấm điểm HR round)

---

## 4. Phase 1: Ứng Viên Apply Job

### Endpoint
```
POST /api/applications?jdId={jdId}
Authorization: Bearer {student_token}
```

### Luồng Backend quan trọng
```java
// ApplicationServiceImpl.applyForJob()
public Application applyForJob(Long jdId) {
    // 1. Lấy userId từ JWT
    int userId = jwtUtils.getUserIdFromToken(token);
    
    // 2. Tạo Application
    Application application = new Application();
    application.setUserId(userId);
    application.setJdId(jdId);
    application.setCurrentRoundOrder(1);  // Bắt đầu từ round 1
    application.setStatus(IN_PROGRESS);
    application = applicationRepository.save(application);
    
    // 3. TĂNG appliedCount của JobDescription
    jd.setAppliedCount(jd.getAppliedCount() + 1);
    
    // 4. ★ QUAN TRỌNG: Nếu round đầu là MENTROR_REVIEW
    //    → Tự động tạo ApplicationDetail với status=AWAITING_MENTOR
    Round firstRound = jd.getRounds().get(0);
    if (firstRound.getRoundType() == RoundType.MENTROR_REVIEW) {
        ApplicationDetail firstDetail = ApplicationDetail.builder()
            .applicationId(application.getId())
            .roundId(firstRound.getId())
            .status(AWAITING_MENTOR)        // ← Student đợi Admin gán mentor
            .sessionInfo(RoundSessionInfo.builder()
                .startTime(now())
                .endTime(now() + timeLimitMinutes)  // nếu round có config timeLimitMinutes
                .build())
            .build();
        applicationDetailRepository.save(firstDetail);
    }
    return application;
}
```

### Response 200 OK
```json
{
    "id": 42,                                  // ← applicationId
    "userId": 5,
    "jdId": 7,
    "currentRoundOrder": 1,
    "status": "IN_PROGRESS",
    "overallScore": -1.0,
    "isDeleted": false,
    "createdAt": "2026-07-17T22:00:00",
    "updatedAt": "2026-07-17T22:00:00"
}
```

### Response 404 Not Found (JD không tồn tại)
```json
{
    "message": "Job Description not found"
}
```

### Frontend Implementation
```typescript
// Sau khi login thành công, student vào trang job detail, click "Apply"
async function applyJob(jdId: number) {
    const response = await fetch(`/api/applications?jdId=${jdId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const application = await response.json();
    // application.id = 42 (lưu vào state để dùng cho phase sau)
    return application;
}
```

---

## 5. Phase 2: Ứng Viên Xem Danh Sách Vòng Của Mình

### Endpoint
```
GET /api/application-details/application/{applicationId}
Authorization: Bearer {student_token}
```

### Response 200 OK (Mảng các ApplicationDetail)
```json
[
    {
        "id": 100,                             // ← applicationDetailId
        "applicationId": 42,
        "roundId": 12,
        "status": "AWAITING_MENTOR",           // ← Student đang đợi Admin gán mentor
        "finalScore": null,
        "finalResult": null,
        "mentorId": null,                      // ← Chưa có mentor
        "sessionId": null,
        "sessionInfo": {                       // ← Đã có deadline từ lúc apply
            "sessionId": null,
            "meetingType": null,
            "startTime": "2026-07-17 22:00:00.000",
            "endTime": "2026-07-24 22:00:00.000"
        },
        "startedAt": "2026-07-17T22:00:00",
        "completedAt": null
    }
    // ... các vòng khác
]
```

### Frontend Implementation - Render UI theo status
```typescript
function renderApplicationDetail(detail: ApplicationDetail) {
    const { status, sessionInfo, mentorId } = detail;
    
    if (status === 'AWAITING_MENTOR') {
        return (
            <Card>
                <Title>Vòng Mentor Interview</Title>
                <Text type="secondary">
                    Đang chờ Admin phân công Mentor phỏng vấn.
                    Vui lòng quay lại sau.
                </Text>
                <DeadlineBadge endTime={sessionInfo?.endTime} />
            </Card>
        );
    }
    
    if (status === 'PENDING' && sessionInfo?.meetingType == null) {
        // Hiển thị form chọn lịch + ONLINE/OFFLINE (xem Phase 4)
        return <SchedulePicker applicationDetailId={detail.id} mentorId={mentorId} />;
    }
    
    if (status === 'PENDING' && sessionInfo?.meetingType === 'OFFLINE') {
        return (
            <Card>
                <Title>Phỏng vấn Offline đã xác nhận</Title>
                <Text>Thời gian: {formatDateTime(sessionInfo.startTime)}</Text>
                <Text>Vui lòng gặp mentor tại văn phòng công ty.</Text>
                <Text>Địa chỉ: [Địa chỉ công ty]</Text>
            </Card>
        );
    }
    
    if (status === 'SLOT_PICKED' && sessionInfo?.meetingType === 'ONLINE') {
        // Hiển thị nút "Vào phòng" (xem Phase 5)
        return <OnlineInterviewRoom applicationDetailId={detail.id} />;
    }
    
    if (status === 'COMPLETED') {
        return (
            <Card>
                <Title>Vòng đã hoàn thành</Title>
                <Text>Điểm: {detail.finalScore}</Text>
                <Text>Kết quả: {detail.finalResult === 'PASSED' ? 'Đạt' : 'Trượt'}</Text>
                {/* Hiển thị review/feedback */}
            </Card>
        );
    }
}
```

---

## 6. Phase 3: Admin Xem & Gán Mentor

### 6.1 Admin xem danh sách ApplicationDetail (đang chờ gán)
> **Lưu ý:** Hiện tại KHÔNG có endpoint filter theo `status=AWAITING_MENTOR`. Admin phải gọi `GET /api/application-details/application/{appId}` cho từng application, HOẶC tự filter client-side từ `GET /api/applications` rồi `GET /api/application-details/application/{appId}`.

**Endpoint 1:** Lấy tất cả Application
```
GET /api/applications
Authorization: Bearer {admin_token}
```

**Endpoint 2:** Lấy chi tiết các vòng của 1 Application
```
GET /api/application-details/application/{applicationId}
```

### 6.2 Admin xem danh sách Mentor
```
GET /api/mentors
```
**Không cần auth** (public endpoint - xem SecurityConfig).

**Response 200 OK:**
```json
[
    {
        "id": 3,
        "name": "Nguyen Van B",
        "email": "mentor1@example.com",
        "isActive": true,
        "bio": "Senior Backend Engineer at FPT",
        "avatarUrl": "https://...",
        "expertise": "Java, Spring Boot, Microservices",
        "yearsOfExperience": 8,
        "linkedInUrl": "https://linkedin.com/...",
        "currentCompany": "FPT Software",
        "rate": 0,                  // ← Field cũ, không dùng
        "totalSession": 12,
        "averageRating": 4.5,
        "pricePerMinute": 5000
    }
    // ...
]
```

### 6.3 Admin Gán Mentor
```
PUT /api/application-details/{applicationDetailId}/assign-mentor?mentorId={mentorId}
Authorization: Bearer {admin_token}
```

**Logic Backend:**
```java
// ApplicationDetailServiceImpl.assignMentor()
public ApplicationDetail assignMentor(long applicationDetailId, int mentorId) {
    ApplicationDetail applicationDetail = getApplicationDetailById(applicationDetailId);
    
    // Validate: chỉ assign được khi đang AWAITING_MENTOR
    if (applicationDetail.getStatus() != ApplicationDetailStatus.AWAITING_MENTOR) {
        throw new CustomException(
            "Application detail status is not AWAITING_MENTOR", 
            HttpStatus.BAD_REQUEST
        );
    }
    
    // Set mentorId và chuyển status
    applicationDetail.setMentorId(mentorId);
    applicationDetail.setStatus(ApplicationDetailStatus.PENDING);  // ← Chuyển sang PENDING
    return applicationDetailRepository.save(applicationDetail);
}
```

**Response 200 OK:**
```json
{
    "id": 100,
    "applicationId": 42,
    "roundId": 12,
    "status": "PENDING",              // ← Đã đổi từ AWAITING_MENTOR → PENDING
    "mentorId": 3,                    // ← Mentor vừa gán
    "sessionId": null,
    "sessionInfo": {
        "sessionId": null,
        "meetingType": null,
        "startTime": "2026-07-17 22:00:00.000",
        "endTime": "2026-07-24 22:00:00.000"
    },
    // ... các field khác
}
```

**Response 400 Bad Request (status không phải AWAITING_MENTOR):**
```json
{
    "message": "Application detail status is not AWAITING_MENTOR"
}
```

**Response 404 Not Found:**
```json
{
    "message": "Application Detail not found"
}
```

### Frontend Implementation
```typescript
async function assignMentor(applicationDetailId: number, mentorId: number) {
    const response = await fetch(
        `/api/application-details/${applicationDetailId}/assign-mentor?mentorId=${mentorId}`,
        {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        }
    );
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
    }
    return response.json();
}
```

---

## 7. Phase 4: Ứng Viên Chọn Lịch + Hình Thức

### Điều kiện tiên quyết
- `ApplicationDetail.status === "PENDING"`
- `ApplicationDetail.sessionInfo.meetingType === null` (chưa chọn)
- `ApplicationDetail.mentorId !== null` (đã có mentor)

### Endpoint
```
POST /api/sessions/create-for-round
Authorization: Bearer {student_token}
Content-Type: application/json
```

### Request Body
```json
{
    "applicationDetailId": 100,
    "mentorId": 3,
    "joinTime": "2026-07-20T10:00:00.000+07:00",
    "duration": 60,
    "offline": false
}
```

> ⚠️ **Lưu ý format `joinTime`:** Backend nhận `java.sql.Timestamp`. Jackson serialize ISO string. **Nên dùng ISO-8601 với offset timezone (`+07:00` cho VN)** để tránh nhầm lẫn. Nếu gửi UTC (`Z`), cần đảm bảo FE đã convert đúng.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `applicationDetailId` | Long | ✅ | - | ID của ApplicationDetail vòng Mentor Interview |
| `mentorId` | int | ✅ | - | ID mentor (đã gán bởi admin) |
| `joinTime` | string (Timestamp) | ✅ | - | ISO-8601, VD: `"2026-07-20T10:00:00.000+07:00"` |
| `duration` | int | ❌ | `60` | Thời lượng (phút) |
| `offline` | boolean | ✅ | - | `true` = OFFLINE, `false` = ONLINE |

### Logic Backend
```java
// SessionServiceImpl.createSessionForRound()
@Transactional
public SessionDetailResponse createSessionForRound(CreateRoundSessionRequest request) {
    ApplicationDetail appDetail = applicationDetailRepository
            .findById(request.getApplicationDetailId())
            .orElseThrow(() -> new CustomException("Application detail not found", NOT_FOUND));

    // Validate status
    if (appDetail.getStatus() != ApplicationDetailStatus.PENDING) {
        throw new CustomException("Application detail status is not PENDING", BAD_REQUEST);
    }

    // Validate mentor đã được gán
    if (appDetail.getMentorId() == null || appDetail.getMentorId() != request.getMentorId()) {
        throw new CustomException("Mentor has not been assigned or mismatch", BAD_REQUEST);
    }

    Application application = applicationRepository.findById(appDetail.getApplicationId())
            .orElseThrow(() -> new CustomException("Application not found", NOT_FOUND));

    int userId = application.getUserId();
    int mentorId = request.getMentorId();
    Timestamp startTime = request.getJoinTime();
    int duration = request.getDuration() != null ? request.getDuration() : 60;

    Session session;
    if (request.isOffline()) {
        // ════════════════════ OFFLINE ════════════════════
        // Tạo Session giả trong DB, KHÔNG gọi Daily.co
        session = new Session();
        session.setUserId(userId);
        session.setUserId2(mentorId);
        session.setRoomUrl("OFFLINE");                  // ← Đánh dấu là OFFLINE
        session.setRoomName("OFFLINE-" + UUID.randomUUID());
        session.setStatus(SessionStatus.COMPLETED);     // ← OFFLINE: set COMPLETED ngay
        session.setJoinTime(startTime);
        session.setDuration(duration);
        session = sessionRepository.save(session);

        ApplicationDetail.RoundSessionInfo sessionInfo = appDetail.getSessionInfo() != null
                ? appDetail.getSessionInfo()
                : new ApplicationDetail.RoundSessionInfo();
        sessionInfo.setSessionId(session.getId());
        sessionInfo.setMeetingType(MeetingType.OFFLINE);
        appDetail.setSessionInfo(sessionInfo);
        appDetail.setSessionId((long) session.getId());
        // Giữ status PENDING (vì chưa có review/feedback)
        applicationDetailRepository.save(appDetail);
    } else {
        // ════════════════════ ONLINE ════════════════════
        // Gọi Daily.co tạo phòng
        SessionCreationRequest sessionReq = new SessionCreationRequest();
        DailyCoCreationRequest dailyReq = new DailyCoCreationRequest();
        dailyReq.setPrivacy("public");
        DailyCoCreationRequest.Properties props = new DailyCoCreationRequest.Properties();
        props.setMax_participants(2);
        props.setStart_video_off(true);
        props.setStart_audio_off(true);
        props.setEnable_screenshare(true);
        props.setEnable_recording("cloud");
        // Daily.co expire = joinTime + 1 giờ
        long secondsUTC = startTime.toInstant().getEpochSecond();
        long exp = secondsUTC + 3600;
        props.setExp((int) exp);
        dailyReq.setProperties(props);
        
        sessionReq.setDailyCoCreationRequest(dailyReq);
        sessionReq.setUserId(userId);
        sessionReq.setMentorId(mentorId);
        sessionReq.setJoinTime(startTime);
        sessionReq.setDuration(duration);
        sessionReq.setTotalPrice(0);

        SessionResponse sessionResponse = createSession(sessionReq);  // ← Gọi Daily.co
        
        session = sessionRepository.findByRoomName(sessionResponse.getName());
        if (session == null) throw new CustomException("Failed to retrieve created session", INTERNAL_SERVER_ERROR);
        session.setStatus(SessionStatus.SCHEDULED);  // ← ONLINE: set SCHEDULED
        sessionRepository.save(session);

        ApplicationDetail.RoundSessionInfo sessionInfo = appDetail.getSessionInfo() != null
                ? appDetail.getSessionInfo()
                : new ApplicationDetail.RoundSessionInfo();
        sessionInfo.setSessionId(session.getId());
        sessionInfo.setMeetingType(MeetingType.ONLINE);
        appDetail.setSessionInfo(sessionInfo);
        appDetail.setSessionId((long) session.getId());
        appDetail.setStatus(ApplicationDetailStatus.SLOT_PICKED);  // ← ONLINE: chuyển sang SLOT_PICKED
        applicationDetailRepository.save(appDetail);
    }
    return convertToDetailResponse(session);
}
```

### Response 200 OK (ONLINE)
```json
{
    "id": 50,
    "roomName": "session-1721234567890",
    "userId": 5,
    "mentorId": 3,
    "roomUrl": "https://inblue.daily.co/session-1721234567890",  // ← URL Daily.co
    "joinTime": "2026-07-20 10:00:00.000",
    "status": "SCHEDULED",
    "duration": 60,
    "totalPrice": 0,
    "transactionCode": null,
    "sessionKey": null,
    "kioskId": null,
    "mentorReview": null,
    "mentorFeedback": null
}
```

> Sau khi gọi thành công, ApplicationDetail sẽ tự động chuyển sang `status=SLOT_PICKED`, `sessionInfo.meetingType=ONLINE`.

### Response 200 OK (OFFLINE)
```json
{
    "id": 51,
    "roomName": "OFFLINE-abc123-def456",
    "userId": 5,
    "mentorId": 3,
    "roomUrl": "OFFLINE",                          // ← Đánh dấu OFFLINE
    "joinTime": "2026-07-20 10:00:00.000",
    "status": "COMPLETED",                         // ← Đã COMPLETED ngay
    "duration": 60,
    "mentorReview": null,
    "mentorFeedback": null
}
```

> Sau khi gọi thành công, ApplicationDetail **giữ nguyên** `status=PENDING`, `sessionInfo.meetingType=OFFLINE`.

### Response 400 Bad Request
| Trường hợp | Message |
|---|---|
| Status không phải PENDING | `"Application detail status is not PENDING"` |
| Mentor chưa được gán hoặc sai | `"Mentor has not been assigned or mismatch"` |

### Response 404 Not Found
```json
{ "message": "Application detail not found" }
```

### Frontend Implementation - Form Chọn Lịch
```tsx
function SchedulePicker({ applicationDetailId, mentorId }: Props) {
    const [joinTime, setJoinTime] = useState<Date | null>(null);
    const [meetingType, setMeetingType] = useState<'ONLINE' | 'OFFLINE'>('ONLINE');
    const [duration, setDuration] = useState(60);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!joinTime) {
            alert('Vui lòng chọn ngày giờ');
            return;
        }
        setLoading(true);
        try {
            // Format ISO-8601 với timezone VN
            const tzOffset = 7 * 60;  // phút
            const localISOTime = new Date(
                joinTime.getTime() - tzOffset * 60 * 1000
            ).toISOString();
            // Hoặc đơn giản: joinTime.toISOString() nếu FE đã handle TZ đúng
            
            const response = await fetch('/api/sessions/create-for-round', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    applicationDetailId,
                    mentorId,
                    joinTime: joinTime.toISOString(),  // "2026-07-20T03:00:00.000Z" (UTC)
                    duration,
                    offline: meetingType === 'OFFLINE'
                })
            });
            
            if (!response.ok) {
                const err = await response.json();
                alert(err.message);
                return;
            }
            
            const sessionDetail = await response.json();
            // Thành công - reload lại trang hoặc navigate
            window.location.reload();
        } catch (e) {
            alert('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title="Chọn lịch phỏng vấn với Mentor">
            <Text>Mentor: {getMentorName(mentorId)}</Text>
            
            <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                value={joinTime}
                onChange={setJoinTime}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
            
            <Radio.Group value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
                <Radio.Button value="ONLINE">📹 Online (Daily.co)</Radio.Button>
                <Radio.Button value="OFFLINE">🏢 Offline (tại văn phòng)</Radio.Button>
            </Radio.Group>
            
            <InputNumber
                value={duration}
                onChange={setDuration}
                min={15}
                max={180}
                addonAfter="phút"
            />
            
            <Button type="primary" loading={loading} onClick={handleSubmit}>
                Xác nhận lịch hẹn
            </Button>
        </Card>
    );
}
```

---

## 8. Phase 5: Ứng Viên Vào Phòng Online (ONLINE only)

> ⚠️ **CHỈ áp dụng cho ONLINE.** Với OFFLINE, hiển thị thông báo + địa chỉ công ty.

### 8.1 Lấy thông tin Session (chứa roomUrl)
```
GET /api/sessions/{sessionId}
Authorization: Bearer {student_token}
```

**Hoặc dùng thông tin từ `ApplicationDetail.sessionInfo.sessionId`:**

```typescript
async function getSession(sessionId: number) {
    const response = await fetch(`/api/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
    // { id, roomName, roomUrl, joinTime, status, ... }
}
```

**Response 200 OK:**
```json
{
    "id": 50,
    "roomName": "session-1721234567890",
    "userId": 5,
    "userId2": 3,
    "roomUrl": "https://inblue.daily.co/session-1721234567890",
    "joinTime": "2026-07-20 10:00:00.000",
    "status": "SCHEDULED",
    "duration": 60,
    "mentorReview": null,
    "mentorFeedback": null
}
```

### 8.2 Embed Daily.co iframe
> **Cách 1 (khuyến nghị - dùng daily-js):**
```tsx
import DailyIframe from '@daily-co/daily-js';

function OnlineRoom({ sessionId }: { sessionId: number }) {
    const [session, setSession] = useState<SessionDetail | null>(null);
    const callRef = useRef<any>(null);

    useEffect(() => {
        getSession(sessionId).then(setSession);
        return () => {
            if (callRef.current) callRef.current.destroy();
        };
    }, [sessionId]);

    useEffect(() => {
        if (!session?.roomUrl) return;
        
        const call = DailyIframe.createCallObject({
            url: session.roomUrl,
            // Không cần token vì room là public
        });
        callRef.current = call;
        
        // Lắng nghe khi join thành công → gọi API track
        call.on('joined-meeting', () => {
            fetch('/api/sessions/join-session', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionName: session.roomName,
                    userId: session.userId,  // userId của student
                    participantId: call.participants().local.session_id,
                    isMentor: false
                })
            });
        });
        
        call.join();
        
        // Cleanup khi rời phòng
        return () => call.destroy();
    }, [session]);

    return <div id="daily-iframe-container" />;
}
```

### 8.3 Backend: Endpoint track khi join
```
POST /api/sessions/join-session
Authorization: Bearer {student_token hoặc mentor_token}
Content-Type: application/json
```

**Request Body:**
```json
{
    "sessionName": "session-1721234567890",   // ← Lấy từ session.roomName
    "userId": 5,                              // ← ID của student hoặc mentor
    "participantId": "xyz123abc",             // ← Daily.co participant ID
    "isMentor": false                         // ← true nếu là mentor, false nếu student
}
```

**Response 200 OK:** (no body)

**Logic Backend:**
```java
// SessionServiceImpl.saveJoinRecord()
public void saveJoinRecord(JoinSessionDtoRequest request) {
    Session session = sessionRepository.findByRoomName(request.getSessionName());
    if (session == null) {
        throw new CustomException("Không tìm thấy phòng họp !!", NOT_FOUND);
    } else if (session.getStatus().equals(SessionStatus.DRAFT)) {
        throw new CustomException("Phòng họp chưa được duyệt", CONFLICT);
    }
    if (request.isMentor()) {
        if (session.getUserId2() == request.getUserId()) {
            session.setParticipantId2(request.getParticipantId());
            if (session.getStartTime2() == null) {
                session.setStartTime2(helperConvertToVietNamTime());  // ← Lưu giờ join
            }
        } else {
            throw new CustomException("Mentor ID không khớp với Session", FORBIDDEN);
        }
    } else {
        if (session.getUserId() == request.getUserId()) {
            session.setParticipantId1(request.getParticipantId());
            session.setStatus(SessionStatus.ONGOING);  // ← Chuyển status ONGOING
            if (session.getStartTime1() == null) {
                session.setStartTime1(helperConvertToVietNamTime());
            }
        } else {
            throw new CustomException("User ID không khớp với Session", FORBIDDEN);
        }
    }
    sessionRepository.save(session);
}
```

### 8.4 Backend: Webhook khi rời phòng (tự động)
> ⚠️ **KHÔNG cần gọi từ FE.** Daily.co gọi thẳng webhook backend:
```
POST /api/sessions/webhooks/dailyco
```
Khi cả 2 bên đều leave → `status = COMPLETED`.

---

## 9. Phase 6: Mentor Xem Lịch & Vào Phòng

### 9.1 Mentor xem tất cả Sessions của mình
```
GET /api/sessions/{mentorId}/by-user
Authorization: Bearer {mentor_token}
```

> ⚠️ Lưu ý: `{mentorId}` là `userId` của mentor trong hệ thống (cũng chính là `mentor.id`).

**Response 200 OK:**
```json
[
    {
        "id": 50,
        "roomName": "session-1721234567890",
        "userId": 5,
        "userId2": 3,
        "roomUrl": "https://inblue.daily.co/session-1721234567890",
        "joinTime": "2026-07-20 10:00:00.000",
        "status": "SCHEDULED",
        "duration": 60,
        "mentorReview": null,
        "mentorFeedback": null
    }
    // ... các session khác
]
```

> **Lưu ý:** API trả về TẤT CẢ sessions (cả COMPLETED, CANCELED...). Mentor cần filter:
> - `status === "SCHEDULED" | "ONGOING"` → Sắp tới / đang diễn ra
> - `status === "COMPLETED"` → Đã xong, cần đánh giá
> - Filter thêm `userId2 === currentMentorId` để chỉ lấy session của mình

```typescript
async function getMySessions(mentorId: number) {
    const response = await fetch(`/api/sessions/${mentorId}/by-user`, {
        headers: { 'Authorization': `Bearer ${mentorToken}` }
    });
    const sessions: SessionDetail[] = await response.json();
    
    const upcoming = sessions.filter(s => 
        s.userId2 === mentorId && 
        ['SCHEDULED', 'ONGOING'].includes(s.status)
    );
    
    const needReview = sessions.filter(s => 
        s.userId2 === mentorId && 
        s.status === 'COMPLETED' && 
        (!s.mentorReview || !s.mentorFeedback)
    );
    
    return { upcoming, needReview };
}
```

### 9.2 Mentor vào phòng Online
> Tương tự Phase 5.2 nhưng:
> - `isMentor: true` khi gọi `/api/sessions/join-session`
> - `userId` trong body = `session.userId2` (= mentor.id)

```typescript
async function mentorJoinSession(session: SessionDetail) {
    const call = DailyIframe.createCallObject({ url: session.roomUrl });
    call.join();
    
    call.on('joined-meeting', () => {
        fetch('/api/sessions/join-session', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mentorToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionName: session.roomName,
                userId: session.userId2,        // ← ID của mentor
                participantId: call.participants().local.session_id,
                isMentor: true                  // ← true
            })
        });
    });
}
```

### 9.3 Mentor xem lịch OFFLINE
Với OFFLINE, `session.roomUrl = "OFFLINE"` (không vào phòng được). Hiển thị thông tin lịch:
```tsx
<Card title="Phỏng vấn Offline">
    <Text>Thời gian: {formatDateTime(session.joinTime)}</Text>
    <Text>Sinh viên: {getUserName(session.userId)}</Text>
    <Button onClick={() => navigateToReview(session.id)}>Đánh giá sau</Button>
</Card>
```

---

## 10. Phase 7: Mentor Đánh Giá (Review + Feedback)

### Điều kiện tiên quyết
- **Với ONLINE:** `Session.status === "COMPLETED"` (cả 2 bên đều đã rời phòng, Daily.co webhook đã cập nhật)
- **Với OFFLINE:** `Session.status === "COMPLETED"` (đã set ngay khi tạo)
- **BẮT BUỘC gửi cả 2 API:** Review (chi tiết) + Feedback (ngắn gọn)

### 10.1 Submit Review (Đánh giá chi tiết STAR)
```
POST /api/mentor-reviews
Authorization: Bearer {mentor_token}
Content-Type: application/json
```

**Request Body:**
```json
{
    "sessionId": 50,
    "mentorId": 3,
    "userId": 5,
    "rating": 8,
    "situationNote": "Mô tả tình huống ứng viên đã trải qua",
    "taskNote": "Nhiệm vụ được giao",
    "actionNote": "Cách ứng viên xử lý",
    "resultNote": "Kết quả đạt được",
    "strength": "Điểm mạnh của ứng viên",
    "weakness": "Điểm yếu cần cải thiện",
    "improve": "Đề xuất cải thiện"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | int | ✅ | ID Session (từ `applicationDetail.sessionInfo.sessionId`) |
| `mentorId` | int | ✅ | ID mentor (= `session.userId2`) |
| `userId` | int | ✅ | ID student (= `session.userId`) |
| `rating` | int | ✅ | **Thang 1-10** (Lưu ý: KHÔNG phải 1-5) |
| `situationNote` | string | ❌ | STAR method: Situation |
| `taskNote` | string | ❌ | STAR method: Task |
| `actionNote` | string | ❌ | STAR method: Action |
| `resultNote` | string | ❌ | STAR method: Result |
| `strength` | string | ❌ | Điểm mạnh |
| `weakness` | string | ❌ | Điểm yếu |
| `improve` | string | ❌ | Đề xuất cải thiện |

**Logic Backend:**
```java
// MentorReviewServiceImpl.mentorReview()
@Transactional
public MentorReview mentorReview(CreateMentorReviewRequest mentorReview) {
    Mentor mentor = mentorRepo.getMentorById(mentorReview.getMentorId());
    User user = userService.getById(mentorReview.getUserId());
    Session session = sessionRepo.findById(mentorReview.getSessionId()).orElse(null);
    if (session == null || user == null || mentor == null) {
        throw new CustomException("Session| Mentor| User not found", NOT_FOUND);
    }

    // ★ QUAN TRỌNG: Session PHẢI ở status COMPLETED
    if (!session.getStatus().equals(SessionStatus.COMPLETED)) {
        throw new CustomException(
            "Cannot review mentor for a session that is not completed", 
            BAD_REQUEST
        );
    }

    MentorReview review = mentorReviewMapper.toEntity(mentorReview);
    review.setSession(session);
    review = repo.save(review);

    // ★ Gọi checkAndCompleteRound để check xem có đủ review + feedback chưa
    checkAndCompleteRound(session.getId());

    return review;
}
```

**Response 200 OK:**
```json
{
    "id": 12,
    "session": { "id": 50, ... },
    "mentor": { "id": 3, ... },
    "user": { "id": 5, ... },
    "rating": 8,
    "situationNote": "...",
    "taskNote": "...",
    "actionNote": "...",
    "resultNote": "...",
    "strength": "...",
    "weakness": "...",
    "improve": "..."
}
```

**Response 400 Bad Request (Session chưa COMPLETED):**
```json
{
    "message": "Cannot review mentor for a session that is not completed"
}
```

### 10.2 Submit Feedback (Đánh giá ngắn gọn - BẮT BUỘC)
```
POST /api/mentor-feedbacks
Authorization: Bearer {mentor_token}
Content-Type: application/json
```

**Request Body:**
```json
{
    "sessionId": 50,
    "mentorId": 3,
    "userId": 5,
    "rating": 8,
    "comment": "Ứng viên có tư duy tốt, giao tiếp rõ ràng"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `sessionId` | int | ✅ | ID Session |
| `mentorId` | int | ✅ | ID mentor |
| `userId` | int | ✅ | ID student |
| `rating` | int | ✅ | **Thang 1-10** |
| `comment` | string | ❌ | Nhận xét ngắn gọn |

**Logic Backend:**
```java
// MentorFeedbackServiceImpl.createMentorFeedback()
public MentorFeedback createMentorFeedback(CreateMentorFeedbackRequest mentorFeedback) {
    Mentor mentor = mentorRepository.getMentorById(mentorFeedback.getMentorId());
    User user = userService.getById(mentorFeedback.getUserId());
    Session session = sessionRepository.findById(mentorFeedback.getSessionId()).get();
    
    // ★ QUAN TRỌNG: Session PHẢI ở status COMPLETED
    if (session != null && user != null && mentor != null 
        && session.getStatus().equals(SessionStatus.COMPLETED)) {
        MentorFeedback feedback = mentorFeedbackMapper.toEntity(mentorFeedback);
        feedback.setSession(session);
        feedback.setMentor(mentor);
        feedback.setUser(user);
        
        // Cập nhật stats cho mentor
        mentor.setTotalSession(mentor.getTotalSession() + 1);
        mentor.setAverageRating(calculateAverageRating(mentor.getId()));
        mentorRepository.save(mentor);
        
        MentorFeedback savedFeedback = mentorFeedbackRepository.save(feedback);
        
        // ★ Gọi checkAndCompleteRound
        mentorReviewService.checkAndCompleteRound(session.getId());
        
        return savedFeedback;
    } else {
        throw new CustomException(
            "Session| Mentor| User not found or session is not complete !!", 
            NOT_FOUND
        );
    }
}
```

**Response 200 OK:**
```json
{
    "id": 50,                      // ← Cùng ID với sessionId (1-1 với session)
    "session": { "id": 50, ... },
    "mentor": { "id": 3, ... },
    "user": { "id": 5, ... },
    "rating": 8,
    "comment": "Ứng viên có tư duy tốt, giao tiếp rõ ràng"
}
```

### 10.3 Frontend Implementation - Form Đánh Giá
```tsx
function MentorReviewForm({ session, studentName }: Props) {
    const [review, setReview] = useState({
        sessionId: session.id,
        mentorId: session.userId2,
        userId: session.userId,
        rating: 8,
        situationNote: '',
        taskNote: '',
        actionNote: '',
        resultNote: '',
        strength: '',
        weakness: '',
        improve: ''
    });
    const [feedback, setFeedback] = useState({
        sessionId: session.id,
        mentorId: session.userId2,
        userId: session.userId,
        rating: 8,
        comment: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Gọi Review trước
            await fetch('/api/mentor-reviews', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mentorToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(review)
            });
            
            // 2. Gọi Feedback
            await fetch('/api/mentor-feedbacks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${mentorToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedback)
            });
            
            alert('Đánh giá thành công!');
            navigate('/mentor/dashboard');
        } catch (e) {
            alert('Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title={`Đánh giá ứng viên: ${studentName}`}>
            <Text>Hình thức: {session.roomUrl === 'OFFLINE' ? 'Offline' : 'Online'}</Text>
            <Text>Thời gian: {formatDateTime(session.joinTime)}</Text>
            
            <Divider>Đánh giá chi tiết (Review)</Divider>
            <Rate value={review.rating} onChange={(v) => setReview({...review, rating: v})} count={10} />
            <Text>Tình huống:</Text>
            <TextArea value={review.situationNote} onChange={(e) => setReview({...review, situationNote: e.target.value})} />
            {/* ... các field STAR khác */}
            
            <Divider>Nhận xét nhanh (Feedback)</Divider>
            <Rate value={feedback.rating} onChange={(v) => setFeedback({...feedback, rating: v})} count={10} />
            <TextArea value={feedback.comment} onChange={(e) => setFeedback({...feedback, comment: e.target.value})} />
            
            <Button type="primary" loading={loading} onClick={handleSubmit}>
                Gửi đánh giá
            </Button>
        </Card>
    );
}
```

---

## 11. Phase 8: Hoàn Thành Vòng & Chuyển Vòng Tiếp

### Logic Backend tự động
```java
// MentorReviewServiceImpl.checkAndCompleteRound()
@Transactional
public void checkAndCompleteRound(int sessionId) {
    MentorReview review = repo.findBySession_Id(sessionId);
    MentorFeedback feedback = mentorFeedbackRepository.findBySession_Id(sessionId).orElse(null);

    // ★ CHỈ khi cả 2 (review + feedback) đều tồn tại → mới hoàn thành vòng
    if (review != null && feedback != null) {
        ApplicationDetail appDetail = 
            applicationDetailRepository.findBySessionId((long) sessionId).orElse(null);
        if (appDetail != null && appDetail.getStatus() != ApplicationDetailStatus.COMPLETED) {
            
            // 1. Cập nhật ApplicationDetail
            appDetail.setMentorReview(review);
            appDetail.setStatus(ApplicationDetailStatus.COMPLETED);
            appDetail.setCompletedAt(LocalDateTime.now());

            // 2. Tính điểm
            Round round = roundRepo.findById(appDetail.getRoundId()).orElse(null);
            double maxScore = 100.0;
            if (round != null && round.getConfigData() != null 
                && round.getConfigData().getMaxScore() != null) {
                maxScore = round.getConfigData().getMaxScore();
            }
            double score = (review.getRating() / 10.0) * maxScore;
            appDetail.setFinalScore(score);

            // 3. Xét đậu/trượt
            if (round != null && round.getPassThreshold() != null) {
                appDetail.setFinalResult(
                    score >= round.getPassThreshold() 
                        ? ApplicationDetail.RoundResult.PASSED 
                        : ApplicationDetail.RoundResult.FAILED
                );
            } else {
                appDetail.setFinalResult(ApplicationDetail.RoundResult.PASSED);
            }
            applicationDetailRepository.save(appDetail);

            // 4. ★ Chuyển sang vòng tiếp theo
            Application application = applicationService.getApplicationById(appDetail.getApplicationId());
            applicationService.moveToNextRound(application);
        }
    }
}

// ApplicationServiceImpl.moveToNextRound()
public void moveToNextRound(Application currentApplication) {
    JobDescription jd = jobDescriptionRepository.findById(currentApplication.getJdId()).orElse(null);
    if (jd != null) {
        List<Round> rounds = jd.getRounds();
        int currentRoundOrder = currentApplication.getCurrentRoundOrder();
        
        if (currentRoundOrder < rounds.size()) {
            // Còn vòng tiếp theo
            currentApplication.setCurrentRoundOrder(currentRoundOrder + 1);
            applicationRepository.save(currentApplication);

            // Tạo ApplicationDetail cho vòng tiếp theo
            Round nextRound = rounds.get(currentRoundOrder);
            if (nextRound.getRoundType() == RoundType.MENTROR_REVIEW
                || nextRound.getRoundType() == RoundType.AI_INTERVIEW) {
                ApplicationDetail nextDetail = ApplicationDetail.builder()
                    .applicationId(currentApplication.getId())
                    .roundId(nextRound.getId())
                    .status(MENTROR_REVIEW ? AWAITING_MENTOR : PENDING)
                    .sessionInfo(RoundSessionInfo.builder()
                        .startTime(now())
                        .endTime(now() + timeLimitMinutes)
                        .build())
                    .build();
                applicationDetailRepository.save(nextDetail);
            }
        } else {
            // Hết vòng → tính điểm tổng và chốt trạng thái Application
            List<ApplicationDetail> details = 
                applicationDetailRepository.findAllByApplicationId(currentApplication.getId());
            double totalEarnedScore = 0;
            double totalMaxScore = 0;
            boolean hasFailedRound = false;

            for (ApplicationDetail detail : details) {
                if (detail.getFinalScore() != null) {
                    totalEarnedScore += detail.getFinalScore();
                }
                if (detail.getFinalResult() == ApplicationDetail.RoundResult.FAILED) {
                    hasFailedRound = true;
                }
                // ... tính totalMaxScore
            }
            double overallScorePercentage = Math.round((totalEarnedScore / totalMaxScore) * 100.0);
            currentApplication.setOverallScore(overallScorePercentage);
            currentApplication.setStatus(hasFailedRound ? FAILED : PASSED);
            applicationRepository.save(currentApplication);
        }
    }
}
```

### Công thức tính điểm
```
finalScore = (review.rating / 10) × maxScore_của_round

Ví dụ:
- review.rating = 8, round.maxScore = 100 → finalScore = 80
- review.rating = 7, round.maxScore = 50 → finalScore = 35

Nếu finalScore >= passThreshold → finalResult = PASSED (Đạt)
Nếu finalScore <  passThreshold → finalResult = FAILED (Trượt)
```

### Frontend - Sau khi COMPLETED
> Không cần polling. Frontend chỉ cần:
> 1. Refresh data sau khi submit review/feedback (gọi lại `GET /api/sessions/{sessionId}`)
> 2. Hiển thị thông báo: "Vòng đã hoàn thành, hệ thống sẽ tự động chuyển sang vòng tiếp theo"
> 3. Sau vài giây, refresh danh sách `GET /api/application-details/application/{appId}` để thấy vòng mới

```typescript
async function submitReviewAndFeedback(review, feedback) {
    await fetch('/api/mentor-reviews', { method: 'POST', body: JSON.stringify(review) });
    await fetch('/api/mentor-feedbacks', { method: 'POST', body: JSON.stringify(feedback) });
    
    // Reload session để lấy mentorReview, mentorFeedback đã fill
    const updatedSession = await getSession(review.sessionId);
    if (updatedSession.mentorReview && updatedSession.mentorFeedback) {
        message.success('Đánh giá hoàn tất! Hệ thống sẽ tự động chuyển sang vòng tiếp theo.');
        navigate('/mentor/dashboard');
    }
}
```

---

## 12. Bảng Trạng Thái Hoàn Chỉnh

### ApplicationDetail.status timeline:
```
                    ┌──────────────────────────┐
                    │ AWAITING_MENTOR          │ ← Backend tạo khi apply
                    │ (chờ Admin gán mentor)   │
                    └────────────┬─────────────┘
                                 │ [Admin] PUT /api/application-details/{id}/assign-mentor
                                 ▼
                    ┌──────────────────────────┐
                    │ PENDING                  │
                    │ (chờ student chọn lịch)  │
                    └────────────┬─────────────┘
                                 │ [Student] POST /api/sessions/create-for-round
                  ┌──────────────┴───────────────┐
                  │ ONLINE (offline=false)       │ OFFLINE (offline=true)
                  ▼                              ▼
    ┌─────────────────────────┐    ┌──────────────────────────┐
    │ SLOT_PICKED             │    │ PENDING (giữ nguyên)     │
    │ + Session.status=       │    │ + Session.status=        │
    │   SCHEDULED             │    │   COMPLETED (ngay lập tức)│
    │ + có roomUrl Daily.co   │    │ + roomUrl = "OFFLINE"    │
    └────────────┬────────────┘    └──────────────┬───────────┘
                 │                                  │
                 │ [Daily.co webhook khi 2 bên leave]│
                 ▼                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │ Session.status = COMPLETED                          │
    └──────────────────────────┬───────────────────────────┘
                                │
                                │ [Mentor] POST /api/mentor-reviews
                                │ [Mentor] POST /api/mentor-feedbacks
                                ▼
                ┌───────────────────────────────────┐
                │ ApplicationDetail.status =        │
                │ COMPLETED (chỉ khi cả 2 đã gửi)  │
                │ + finalScore được tính            │
                │ + finalResult = PASSED|FAILED     │
                │ + moveToNextRound() tự động       │
                └───────────────────────────────────┘
```

---

## 13. Luồng OFFLINE Riêng

OFFLINE không cần phòng Daily, không cần webhook. Luồng đơn giản hơn:

```
[Student chọn offline=true]
    ↓
Backend tạo Session:
  - roomUrl = "OFFLINE"
  - roomName = "OFFLINE-{uuid}"
  - status = COMPLETED (ngay lập tức)
  - joinTime = joinTime student chọn
    ↓
ApplicationDetail:
  - status = PENDING (giữ nguyên)
  - sessionInfo.meetingType = "OFFLINE"
  - sessionInfo.sessionId = session.id
    ↓
[Sau buổi gặp trực tiếp]
    ↓
[Mentor] POST /api/mentor-reviews + POST /api/mentor-feedbacks
  - Vì Session.status = COMPLETED → thành công ngay
    ↓
[Backend] checkAndCompleteRound → ApplicationDetail.status = COMPLETED → moveToNextRound
```

### Frontend cho OFFLINE
```tsx
function OfflineScheduleConfirm({ applicationDetail }: Props) {
    const { sessionInfo } = applicationDetail;
    
    return (
        <Card>
            <Title>Phỏng vấn Offline đã xác nhận</Title>
            <Text>Thời gian: {formatDateTime(sessionInfo.startTime)}</Text>
            <Text>Mentor: {getMentorName(applicationDetail.mentorId)}</Text>
            <Alert 
                type="info" 
                message="Vui lòng đến văn phòng công ty đúng giờ"
                description={
                    <>
                        <div>📍 Địa chỉ: Tầng 5, Tòa nhà FPT, ...</div>
                        <div>📞 Liên hệ: 0123 456 789 (nếu cần)</div>
                    </>
                }
            />
            <Text type="secondary">
                Sau buổi phỏng vấn, mentor sẽ đánh giá và bạn sẽ nhận kết quả trong vài ngày.
            </Text>
        </Card>
    );
}
```

---

## 14. Lỗi Thường Gặp & Edge Cases

### 14.1 Lỗi 400: "Application detail status is not PENDING"
**Nguyên nhân:** Gọi `POST /api/sessions/create-for-round` khi ApplicationDetail không ở PENDING.
**Fix FE:** Check `status === "PENDING"` và `sessionInfo.meetingType === null` trước khi hiển thị form.

### 14.2 Lỗi 400: "Cannot review mentor for a session that is not completed"
**Nguyên nhân:** Gọi `POST /api/mentor-reviews` khi Session chưa COMPLETED.
**Fix FE:**
- Với ONLINE: Hiển thị nút "Đánh giá" **chỉ khi** `session.status === "COMPLETED"`. Có thể cần polling/refresh liên tục.
- Với OFFLINE: OK vì status = COMPLETED ngay.

### 14.3 Edge case: Backend Mentor Interview là vòng ĐẦU TIÊN
- Khi student apply JD mà round 1 là `MENTROR_REVIEW`, backend tự tạo `ApplicationDetail` với `status = AWAITING_MENTOR`.
- Student không cần "submit" gì, chỉ đợi admin gán mentor.

### 14.4 Edge case: Vòng Mentor Interview không phải vòng cuối
- Sau khi `moveToNextRound()`, nếu vòng tiếp theo cũng là `MENTROR_REVIEW` hoặc `AI_INTERVIEW` → tự tạo `ApplicationDetail` mới.
- Student phải quay lại Phase 2, refresh `GET /api/application-details/application/{appId}` để thấy vòng mới.

### 14.5 Edge case: 2 lần submit review/feedback
- `MentorReview.id == sessionId` (MapsId 1-1). Gọi lần 2 sẽ tạo record mới với id khác? **KHÔNG** - vì `MentorReview.id` cũng được set, có thể gây conflict.
- **Khuyến nghị FE:** Trước khi hiển thị form review, check `session.mentorReview && session.mentorFeedback`. Nếu đã có → ẩn form, hiển thị read-only.

### 14.6 Lỗi 404: "Session| Mentor| User not found"
**Nguyên nhân:** Truyền sai `sessionId`, `mentorId`, hoặc `userId` khi submit review/feedback.
**Fix FE:** Lấy chính xác từ `session.userId` (student) và `session.userId2` (mentor).

### 14.7 Daily.co token
- Room là **public** (xem `dailyReq.privacy = "public"`).
- **KHÔNG cần Daily.co meeting token** để join.
- Chỉ cần `roomUrl`.

### 14.8 Timezone
- `joinTime` request: dùng ISO-8601. Khuyến nghị gửi kèm timezone (`+07:00`) để tránh nhầm lẫn.
- `joinTime` response: format `"yyyy-MM-dd HH:mm:ss.SSS"` với timezone `Asia/Ho_Chi_Minh`.
- `startTime1`, `startTime2`, v.v. trong Session: lưu raw Java Timestamp (UTC ms). FE parse sang local time khi hiển thị.

### 14.9 Authorization Header
**BẮT BUỘC** cho mọi API trừ:
- `/api/auth/**` (login, register, forgot-password)
- `/api/mentors` (GET - public)
- `/api/job-descriptions` (public)
- `/api/users` (POST - register)
- `/api/rounds` (public)
- `/api/companies` (public)
- `/api/posts` (public)

### 14.10 Idempotency
- `POST /api/sessions/create-for-round` **KHÔNG idempotent**. Gọi 2 lần sẽ tạo 2 sessions. Cần check status trước khi cho phép gọi.

---

## 15. Bảng Endpoint Tổng Hợp

| Method | Endpoint | Auth | Role | Mô Tả |
|---|---|---|---|---|
| POST | `/api/auth/login` | ❌ | All | Đăng nhập |
| POST | `/api/applications?jdId={jdId}` | ✅ | Student | Apply job |
| GET | `/api/applications/me` | ✅ | Student | List applications của mình |
| GET | `/api/applications/{id}` | ✅ | All | Chi tiết application |
| GET | `/api/application-details/{id}` | ✅ | All | Chi tiết 1 vòng |
| GET | `/api/application-details/application/{appId}` | ✅ | All | List các vòng của 1 application |
| PUT | `/api/application-details/{detailId}/assign-mentor?mentorId={id}` | ✅ | Admin | **★ Gán mentor** |
| POST | `/api/sessions/create-for-round` | ✅ | Student | **★ Chọn lịch + ONLINE/OFFLINE** |
| GET | `/api/sessions` | ✅ | All | List tất cả sessions |
| GET | `/api/sessions/{id}` | ✅ | All | Chi tiết 1 session (chứa `roomUrl`) |
| GET | `/api/sessions/{mentorId}/by-user` | ✅ | Mentor | **★ List sessions của mentor** |
| POST | `/api/sessions/join-session` | ✅ | Student/Mentor | Track khi join Daily.co |
| GET | `/api/mentors` | ❌ | All | **List mentors (cho admin chọn)** |
| POST | `/api/mentor-reviews` | ✅ | Mentor | **★ Submit Review (STAR)** |
| PUT | `/api/mentor-reviews` | ✅ | Mentor | Update Review (cần `id`) |
| GET | `/api/mentor-reviews/{id}` | ✅ | All | Lấy review của session |
| POST | `/api/mentor-feedbacks` | ✅ | Mentor | **★ Submit Feedback (ngắn gọn)** |
| PUT | `/api/mentor-feedbacks` | ✅ | Mentor | Update Feedback (cần `id`) |
| GET | `/api/mentor-feedbacks/{id}` | ✅ | All | Lấy feedback của session |

---

## 🎯 Quick Start - Code cho Cursor Agent

### Bước 1: Detect role
```typescript
const jwt = parseJwt(token);
const role = jwt.role;  // "USER" | "ADMIN" | "MENTOR" | "STAFF"
```

### Bước 2: Student Flow
```typescript
// 1. Apply job
await fetch(`/api/applications?jdId=${jdId}`, { method: 'POST', headers: authHeader });

// 2. Xem vòng của mình
const details = await fetch(`/api/application-details/application/${applicationId}`, { headers: authHeader });

// 3. Khi status === 'PENDING' && meetingType === null → hiển thị form chọn lịch
// Submit:
await fetch('/api/sessions/create-for-round', {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationDetailId, mentorId, joinTime, duration, offline })
});

// 4. Khi status === 'SLOT_PICKED' && meetingType === 'ONLINE' → hiển thị nút "Vào phòng"
// Lấy session detail:
const session = await fetch(`/api/sessions/${sessionId}`, { headers: authHeader });
// Mở Daily iframe với session.roomUrl

// 5. Khi status === 'COMPLETED' → hiển thị điểm + kết quả
```

### Bước 3: Admin Flow
```typescript
// 1. List applications
const apps = await fetch('/api/applications', { headers: authHeader });

// 2. Với mỗi app, lấy details, filter status === 'AWAITING_MENTOR'
// 3. Hiển thị dropdown chọn mentor (lấy từ GET /api/mentors)
// 4. Khi admin chọn mentor:
await fetch(`/api/application-details/${detailId}/assign-mentor?mentorId=${mentorId}`, {
    method: 'PUT',
    headers: authHeader
});
```

### Bước 4: Mentor Flow
```typescript
// 1. List sessions của mình
const sessions = await fetch(`/api/sessions/${mentorId}/by-user`, { headers: authHeader });

// 2. Filter sessions cần đánh giá
const needReview = sessions.filter(s => 
    s.userId2 === mentorId && s.status === 'COMPLETED' && 
    (!s.mentorReview || !s.mentorFeedback)
);

// 3. Với ONLINE: mở Daily iframe với session.roomUrl
// 4. Sau phỏng vấn, hiển thị form đánh giá

// 5. Submit review + feedback
await fetch('/api/mentor-reviews', { method: 'POST', body: JSON.stringify(review) });
await fetch('/api/mentor-feedbacks', { method: 'POST', body: JSON.stringify(feedback) });
```

---

## 📝 Ghi Chú Quan Trọng

1. **Tên gốc vs tên hiển thị:**
   - Code Backend: `RoundType.MENTROR_REVIEW`, `MentorReview`, `MentorFeedback`
   - UI hiển thị: **"Mentor Interview"** hoặc **"Phỏng vấn với Mentor"**

2. **Không bao giờ** thay đổi tên enum Backend. Chỉ đổi label trên UI.

3. **Thang điểm rating:** Review/Feedback dùng **1-10**, KHÔNG phải 1-5.

4. **Điểm cuối cùng (finalScore):** = `(review.rating / 10) × maxScore`. Round config có field `maxScore` (default 100), `passThreshold` (ngưỡng đậu).

5. **Session.roomUrl = "OFFLINE"** đánh dấu đây là offline meeting. KHÔNG gọi Daily.co với room này.

6. **Để biết Session COMPLETED chưa (cho ONLINE):** Polling `GET /api/sessions/{id}` mỗi 10s sau khi user join. Hoặc implement webhook từ server backend → push notification.

7. **Hoàn thành vòng tự động:** Chỉ xảy ra khi **cả 2** (Review + Feedback) đều đã submit. Nếu chỉ submit 1 trong 2 → không có gì xảy ra.

---

✅ **File này là đầy đủ thông tin để FE AI Agent build UI tự động 100% mà không cần hỏi thêm.**