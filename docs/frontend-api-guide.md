# Backend API Guide for AI Frontend

> Mục tiêu: AI/FE đọc file này là hiểu luồng nghiệp vụ, biết endpoint, request body, response, quy tắc đặc biệt và tự code được 100% frontend mà không cần hỏi lại backend.

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Quy ước chung](#2-quy-ước-chung)
3. [Tổng quan luồng Kiosk Scheduling & Mentor Interview](#3-tổng-quan-luồng-kiosk-scheduling--mentor-interview)
4. [Enums quan trọng](#4-enums-quan-trọng)
5. [Models](#5-models)
6. [AUTH](#6-auth)
7. [KIOSK](#7-kiosk)
8. [MENTOR BOOKING](#8-mentor-booking)
9. [SESSION](#9-session)
10. [APPLICATION + SUBMISSION](#10-application--submission)
11. [JD + ROUND](#11-jd--round)
12. [USER + COMPANY](#12-user--company)
13. [POST/FEED](#13-postfeed)
14. [NOTIFICATION + MESSAGE](#14-notification--message)
15. [QUESTION BANK](#15-question-bank)
16. [MENTOR FEEDBACK](#16-mentor-feedback)
17. [PAYMENT](#17-payment)
18. [MAIL + EMAIL SUBMISSION](#18-mail--email-submission)
19. [INTERVIEW AI](#19-interview-ai)
20. [PROCTORING](#20-proctoring)
21. [TEST/DEBUG](#21-testdebug)
22. [Lỗi thường gặp](#22-lỗi-thường-gặp)
23. [Thứ tự build frontend](#23-thứ-tự-build-frontend)

---

## 1. Tổng quan hệ thống

| Thành phần | Chi tiết                      |
| ---------- | ----------------------------- |
| Framework  | Spring Boot 4.0.0, Java 21    |
| Database   | Spring Data JPA (PostgreSQL)  |
| Auth       | JWT + OAuth2 (Google)         |
| API style  | RESTful + WebSocket           |
| Docs       | Swagger UI `/swagger-ui.html` |
| Payment    | PayOS                         |
| Media      | Cloudinary                    |
| Video      | Daily.co                      |
| AI         | AnythingLLM + Python service  |
| Base path  | `/api/**`                     |

---

## 2. Quy ước chung

- **Header**: `Authorization: Bearer <token>` cho các request cần auth.
- Một số endpoint đang `permitAll` (không cần token) trong `SecurityConfig`.
- Thời gian: `LocalDateTime` ISO string. Backend dùng múi giờ `Asia/Ho_Chi_Minh`.
- `isDeleted` dùng để soft delete.
- Upload: nhiều endpoint dùng `multipart/form-data`, quy ước `data` = JSON, file riêng.
- Lỗi: trả về `CustomException` với message + HTTP status code.
- Validation lỗi trả về HTTP 400/404/409/500 kèm message mô tả rõ ràng.

---

## 3. Tổng quan luồng Kiosk Scheduling & Mentor Interview

### 3.1 Sơ đồ luồng

```
Ứng viên chọn Kiosk → Chọn Slot → Tạo Booking (AWAITING_MENTOR)
       ↓
Admin duyệt danh sách Booking chờ → Gán Mentor → Tự động tạo Phòng Daily.co + Gửi Notification
       ↓
Ứng viên đến Kiosk vật lý → Nhập sessionKey → Nhận roomUrl → Vào phòng Daily.co
       ↓
Ứng viên & Mentor tham gia → FE gọi join-session → Daily.co webhook ghi nhận leave → Session hoàn tất
```

### 3.2 Bảng trạng thái quan hệ giữa các bảng

| Stage                     | `MentorInterviewBooking.status` | `ApplicationDetail.status` | `Session.status`                   |
| ------------------------- | ------------------------------- | -------------------------- | ---------------------------------- |
| `pickSlot` thành công     | `AWAITING_MENTOR`               | (unchanged)                | n/a                                |
| `assignMentor` thành công | `ROOM_CREATED`                  | `SLOT_PICKED`              | `SCHEDULED`                        |
| `enterKiosk` thành công   | `IN_PROGRESS`                   | (unchanged)                | `ONGOING`                          |
| Cả 2 người rời phòng      | (unchanged)                     | (unchanged)                | `COMPLETED`                        |
| `cancelBooking`           | `CANCELLED`                     | `PENDING`                  | `CANCELED` + phòng Daily.co bị xóa |

### 3.3 Đã fix lỗi gì

- **Lỗi**: `violates check constraint "applicationdetail_status_check"` khi admin assign mentor.
- **Nguyên nhân**: backend thêm enum `SLOT_PICKED` vào `ApplicationDetailStatus` nhưng DB constraint chưa cập nhật.
- **Fix**: đã thêm `SLOT_PICKED` vào enum và áp dụng đúng trong `assignMentor()`.
- **Lưu ý**: cần đảm bảo DB đã migrate constraint để chấp nhận `SLOT_PICKED`.

---

## 4. Enums quan trọng

### 4.1 ApplicationDetailStatus

| Giá trị        | Ý nghĩa                                                |
| -------------- | ------------------------------------------------------ |
| `PENDING`      | Ứng viên đang làm bài                                  |
| `SLOT_PICKED`  | Ứng viên đã chọn slot, đang chờ phỏng vấn / gán mentor |
| `SUBMITTED`    | Đã nộp bài, hệ thống đang gọi AI                       |
| `AI_EVALUATED` | AI đã chấm điểm xong, đang chờ HR duyệt                |
| `COMPLETED`    | HR đã chốt kết quả                                     |
| `ERROR`        | Lỗi gọi AI                                             |

### 4.2 BookingStatus

| Giá trị           | Ý nghĩa                                            |
| ----------------- | -------------------------------------------------- |
| `AWAITING_MENTOR` | Đã đặt lịch, đang chờ Admin gán Mentor             |
| `MENTOR_ASSIGNED` | Đã gán Mentor (hiện KHÔNG được sử dụng trong code) |
| `ROOM_CREATED`    | Đã tạo phòng Daily.co, đã gửi notification         |
| `IN_PROGRESS`     | Ứng viên đã xác thực tại Kiosk                     |
| `COMPLETED`       | Cuộc họp kết thúc (cả 2 người đã rời phòng)        |
| `CANCELLED`       | Đã hủy                                             |

### 4.3 SessionStatus

`DRAFT`, `SCHEDULED`, `PAID`, `REJECTED`, `ONGOING`, `COMPLETED`, `CANCELED`

### 4.4 RoundType

`CODE`, `QUIZ`, `CODING_REVIEW`, `EMAIL_SIMULATION`, `DB_DESIGN`, `AI_INTERVIEW`, `MENTOR_INTERVIEW`

### 4.5 JobDescriptionStatus

`OPEN`, `CLOSED`, `DRAFT`

### 4.6 TargetLevel

`Intern`, `Fresher`, `Junior`, `Middle`, `Senior`

### 4.7 PostStatus

`PUBLISHED`, `DRAFT`, `ARCHIVED`

### 4.8 PaymentPurpose

`CV_SCREENING`, `EMAIL_SIMULATOR`, `QUIZ`, `DB_DESIGN`, `AI_INTERVIEW`, `FULLY_PAID`, `MENTOR_INTERVIEW`

---

## 5. Models

### 5.1 Kiosk

```json
{
  "id": 1,
  "name": "Kiosk A - Phòng 101",
  "location": "Tầng 1 - Khu A",
  "isActive": true,
  "createdAt": "2026-07-08T10:30:00"
}
```

### 5.2 KioskSchedule

```json
{
  "id": 1,
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "08:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 45,
  "isActive": true,
  "createdAt": "2026-07-08T10:35:00"
}
```

- `dayOfWeek`: enum Java `DayOfWeek` - dùng string như `"MONDAY"`, `"TUESDAY"`, `"WEDNESDAY"`, `"THURSDAY"`, `"FRIDAY"`, `"SATURDAY"`, `"SUNDAY"`.
- `openTime`/`closeTime`: format `HH:mm:ss` (LocalTime).

### 5.3 SlotDto

```json
{
  "startTime": "2026-07-10T08:00:00",
  "endTime": "2026-07-10T08:45:00",
  "available": true
}
```

- Logic backend: mỗi slot tự động cộng thêm **15 phút nghỉ** giữa các slot.
- Slot `available = false` nếu chồng chéo với booking đã tồn tại (trừ `CANCELLED`).

### 5.4 MentorInterviewBooking

```json
{
  "id": 55,
  "applicationDetailId": 12,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-10T10:00:00",
  "scheduledEnd": "2026-07-10T10:45:00",
  "mentorId": 5,
  "sessionId": 88,
  "status": "ROOM_CREATED",
  "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
  "notes": "Phỏng vấn chuyên môn React & Spring Boot",
  "createdAt": "2026-07-08T11:00:00",
  "updatedAt": "2026-07-08T11:30:00"
}
```

### 5.5 Session

```json
{
  "id": 88,
  "roomName": "session-1752012345678",
  "userId": 7,
  "participantId1": "p_abc123xyz",
  "startTime1": "2026-07-10T10:00:00.000",
  "endTime1": "2026-07-10T10:45:00.000",
  "durationSeconds1": 2700,
  "userId2": 5,
  "participantId2": "p_def456uvw",
  "startTime2": "2026-07-10T10:02:00.000",
  "endTime2": "2026-07-10T10:48:00.000",
  "durationSeconds2": 2760,
  "roomUrl": "https://inblue.daily.co/session-1752012345678",
  "joinTime": "2026-07-10T10:00:00.000",
  "recordUrl": null,
  "status": "COMPLETED",
  "duration": 45,
  "totalPrice": 0,
  "transactionCode": null,
  "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
  "kioskId": 1
}
```

- `userId` = ứng viên (mentee)
- `userId2` = mentor
- `participantId1`/`participantId2` = ID từ Daily.co
- `sessionKey` = UUID để ứng viên nhập tại Kiosk

### 5.6 ApplicationDetail

```json
{
  "id": 39,
  "applicationId": 12,
  "roundId": 5,
  "status": "SLOT_PICKED",
  "finalScore": 90,
  "submissionData": {
    "textContent": null,
    "fileUrl": null,
    "quizAnswers": null,
    "codeSubmissions": null,
    "codeReviewSubmissions": null,
    "emailSubmissionId": null
  },
  "aiScore": 90,
  "aiFeedback": {
    "generalComment": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "extraMetrics": {}
  },
  "hrScore": 100,
  "hrNote": "Văn hay chữ tốt",
  "finalResult": "PASSED",
  "startedAt": "2026-07-01T12:30:58.264745",
  "completedAt": "2026-07-01T12:40:20.828749",
  "mentorReview": null,
  "sessionId": 88,
  "bookingId": 43
}
```

### 5.7 Other models

- `User`: `id`, `name`, `email`, `password`, `role`, `isActive`, `avatarUrl`, `cvUrl`
- `Company`: `id`, `name`, `logoUrl`, `bannerUrl`, `description`, `status`, `isDeleted`
- `JobDescription`: `id`, `title`, `description`, `requirements`, `benefits`, `level`, `salaryMin`, `salaryMax`, `currency`, `status`, `deadlineAt`, `appliedCount`
- `Round`: `id`, `name`, `roundOrder`, `roundType`, `passThreshold`, `configData(jsonb)`, `reviewerId`, `isAuto`
- `Application`: `id`, `userId`, `jdId`, `currentRoundOrder`, `status`, `overallScore`
- `Payment`: `id`, `amount`, `description`, `user`, `status`, `createdAt`, `transactionCode`, `paymentPurpose`
- `Post`, `PostComment`, `PostLike`
- `Mentor`, `MentorFeedback`
- `QuestionBank`, `QuestionCategory`, `CodingProblem`, `CodeReviewProblem`
- `EmailSubmission`, `Notification`

---

## 6. AUTH

### 6.1 Login

- `POST /api/auth/login`
- Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- Response (HTTP 200): trả về JWT token string, kèm header `Authorization: Bearer <token>`

### 6.2 Google OAuth2

- `GET /api/auth/login-with-google` -> redirect `/oauth2/authorization/google`

### 6.3 Forgot/Reset password

- `POST /api/auth/forgot-password` body `{"email": "..."}`
- `POST /api/auth/reset-password` body `{"email":"...", "otp":"...", "newPassword":"..."}`

---

## 7. KIOSK

### 7.1 Tạo Kiosk (Admin)

- `POST /api/kiosks`
- Request:

```json
{
  "name": "Kiosk A - Phòng 101",
  "location": "Tầng 1 - Khu A",
  "isActive": true
}
```

- Response (HTTP 200):

```json
{
  "id": 1,
  "name": "Kiosk A - Phòng 101",
  "location": "Tầng 1 - Khu A",
  "isActive": true,
  "createdAt": "2026-07-08T10:30:00"
}
```

- Validation: `name` và `location` không được null/empty. Trả `404` nếu không tìm thấy.

### 7.2 Lấy danh sách Kiosk hoạt động

- `GET /api/kiosks`
- Response (HTTP 200):

```json
[
  {
    "id": 1,
    "name": "Kiosk A - Phòng 101",
    "location": "Tầng 1 - Khu A",
    "isActive": true,
    "createdAt": "2026-07-08T10:30:00"
  }
]
```

- **Quyền**: công khai (không cần token).

### 7.3 Tạo lịch hoạt động của Kiosk (Admin)

- `POST /api/kiosks/schedule`
- Request:

```json
{
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "08:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 45,
  "isActive": true
}
```

- Response (HTTP 200):

```json
{
  "id": 1,
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "08:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 45,
  "isActive": true,
  "createdAt": "2026-07-08T10:35:00"
}
```

- Validation: `kioskId` phải tồn tại. `dayOfWeek` dùng string enum Java (`MONDAY`...`SUNDAY`).

### 7.4 Lấy slots trống theo ngày

- `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`
- Ví dụ: `GET /api/kiosks/1/slots?date=2026-07-10`
- Response (HTTP 200):

```json
[
  {
    "startTime": "2026-07-10T08:00:00",
    "endTime": "2026-07-10T08:45:00",
    "available": true
  },
  {
    "startTime": "2026-07-10T09:00:00",
    "endTime": "2026-07-10T09:45:00",
    "available": false
  },
  {
    "startTime": "2026-07-10T10:00:00",
    "endTime": "2026-07-10T10:45:00",
    "available": true
  }
]
```

- **Quyền**: công khai.
- Logic: backend tạo slot từ `openTime`, mỗi slot dài `slotDurationMinutes`, tự động cộng **15 phút nghỉ** giữa các slot. Slot `available = false` nếu trùng booking có status khác `CANCELLED`. Nếu không có lịch hoạt động cho ngày đó, trả về `[]`.

### 7.5 Lấy lịch hoạt động của Kiosk

- `GET /api/kiosks/{kioskId}/schedules`
- Response (HTTP 200): `List<KioskSchedule>`

### 7.6 Cập nhật thông tin Kiosk (Admin)

- `PUT /api/kiosks/{id}`
- Request:

```json
{
  "name": "Kiosk A - Phòng 101 (Đã nâng cấp)",
  "location": "Tầng 2 - Khu A",
  "isActive": true
}
```

- Response (HTTP 200): `Kiosk`

### 7.7 Cập nhật lịch hoạt động (Admin)

- `PUT /api/kiosks/schedule/{id}`
- Request:

```json
{
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "09:00:00",
  "closeTime": "18:00:00",
  "slotDurationMinutes": 60,
  "isActive": true
}
```

- Response (HTTP 200): `KioskSchedule`

---

## 8. MENTOR BOOKING

### 8.1 Đặt lịch phỏng vấn (Ứng viên pick slot)

- `POST /api/mentor-bookings/pick-slot`
- **Quyền**: Ứng viên đã đăng nhập (userId được lấy từ JWT token).
- Request:

```json
{
  "applicationDetailId": 12,
  "kioskId": 1,
  "scheduledStart": "2026-07-10T10:00:00",
  "scheduledEnd": "2026-07-10T10:45:00"
}
```

- Response (HTTP 200):

```json
{
  "id": 55,
  "applicationDetailId": 12,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-10T10:00:00",
  "scheduledEnd": "2026-07-10T10:45:00",
  "mentorId": null,
  "sessionId": null,
  "status": "AWAITING_MENTOR",
  "sessionKey": null,
  "notes": null,
  "createdAt": "2026-07-08T11:00:00",
  "updatedAt": "2026-07-08T11:00:00"
}
```

- **Validation (4 bước)**:

| #   | Điều kiện                                       | HTTP Status     | Message                           |
| --- | ----------------------------------------------- | --------------- | --------------------------------- |
| 1   | `applicationDetailId` tồn tại                   | `404 NOT FOUND` | "ApplicationDetail not found"     |
| 2   | `kioskId` tồn tại                               | `404 NOT FOUND` | "Kiosk not found"                 |
| 3   | Slot không trùng booking khác (trừ `CANCELLED`) | `409 CONFLICT`  | "Selected slot is already booked" |

- **FE cần làm**: luôn fetch lại slots ở Bước 7.4 trước khi gửi pick-slot để tránh race condition.
- **Những gì xảy ra khi thành công**:
  1. Tạo `MentorInterviewBooking` với `status = AWAITING_MENTOR`.
  2. Cập nhật `ApplicationDetail.bookingId = booking.id` (chỉ gán bookingId, **KHÔNG thay đổi status** của ApplicationDetail).
  3. Trả về booking đã tạo.

### 8.2 Lấy danh sách Booking theo status (Admin)

- `GET /api/admin/mentor-bookings`
- Query param: `status` (mặc định `AWAITING_MENTOR`).
- Ví dụ: `GET /api/admin/mentor-bookings?status=ROOM_CREATED`
- Response (HTTP 200): `List<MentorInterviewBooking>`

### 8.3 Gán Mentor cho Booking (Admin)

- `POST /api/admin/mentor-bookings/{bookingId}/assign-mentor`
- **Quyền**: Admin.
- Request:

```json
{
  "mentorId": 5,
  "notes": "Phỏng vấn chuyên môn React & Spring Boot"
}
```

- Response (HTTP 200):

```json
{
  "id": 55,
  "applicationDetailId": 12,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-10T10:00:00",
  "scheduledEnd": "2026-07-10T10:45:00",
  "mentorId": 5,
  "sessionId": 88,
  "status": "ROOM_CREATED",
  "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
  "notes": "Phỏng vấn chuyên môn React & Spring Boot",
  "createdAt": "2026-07-08T11:00:00",
  "updatedAt": "2026-07-08T11:30:00"
}
```

- **Validation (4 bước)**:

| #   | Điều kiện                                           | HTTP Status                 | Message                                             |
| --- | --------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| 1   | `bookingId` tồn tại                                 | `404 NOT FOUND`             | "Booking not found"                                 |
| 2   | Booking phải có `status = AWAITING_MENTOR`          | `400 BAD_REQUEST`           | "Booking is not in AWAITING_MENTOR status"          |
| 3   | Mentor không có booking trùng giờ (trừ `CANCELLED`) | `409 CONFLICT`              | "Mentor has another interview booking at this time" |
| 4   | Gọi Daily.co tạo phòng thành công                   | `500 INTERNAL_SERVER_ERROR` | "Error creating Daily.co session: ..."              |

- **Những gì xảy ra khi thành công (9 bước)**:
  1. Tạo Session trên Daily.co (privacy: public, max_participants: 2, recording: cloud, exp = scheduledEnd + 3600s).
  2. Lưu Session vào DB với `status = DRAFT`.
  3. Cập nhật Session: `sessionKey = UUID.randomUUID()`, `kioskId`, `status = SCHEDULED`.
  4. Cập nhật Booking: `mentorId`, `sessionId`, `sessionKey`, `status = ROOM_CREATED`, `notes`.
  5. Cập nhật `ApplicationDetail`: `sessionId = session.id`, **`status = SLOT_PICKED`** (đây là bước đã được fix).
  6. Gửi Notification cho Ứng viên (async): title `"Lịch phỏng vấn Mentor Interview"`, message chứa `sessionKey`.

### 8.4 Hủy / đổi lịch (Ứng viên hoặc Admin)

- `DELETE /api/mentor-bookings/{bookingId}`
- **Quyền**: Ứng viên sở hữu booking HOẶC Admin/Staff.
- Response: HTTP 200 (empty body)
- Validation:

| #   | Điều kiện                                       | HTTP Status        |
| --- | ----------------------------------------------- | ------------------ |
| 1   | Booking tồn tại                                 | `404 NOT FOUND`    |
| 2   | Ứng viên: `applicantUserId` khớp userId từ JWT  | `401 UNAUTHORIZED` |
| 3   | Người khác: role phải là ADMIN hoặc STAFF       | `401 UNAUTHORIZED` |
| 4   | Booking không được `COMPLETED` hoặc `CANCELLED` | `400 BAD_REQUEST`  |

- **Những gì xảy ra khi thành công**:
  1. Nếu có `sessionId`: cập nhật `Session.status = CANCELED`, xóa phòng trên Daily.co.
  2. Cập nhật `Booking.status = CANCELLED`.
  3. Cập nhật `ApplicationDetail`: `status = PENDING`, `bookingId = null`, `sessionId = null`.
- **FE cần làm**: sau khi hủy, ứng viên có thể quay lại bước 7.4 để chọn slot mới.

### 8.5 Xác thực tại Kiosk để lấy link phòng

- `POST /api/kiosk/enter`
- **Quyền**: công khai.
- Request:

```json
{
  "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
  "kioskId": 1
}
```

- Response (HTTP 200):

```json
{
  "roomUrl": "https://inblue.daily.co/session-1752012345678"
}
```

- **Validation (5 bước)**:

| #   | Điều kiện                                                            | HTTP Status       | Message                                                                                          |
| --- | -------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| 1   | `sessionKey` tồn tại trong bảng Session                              | `400 BAD_REQUEST` | "Invalid session key"                                                                            |
| 2   | `sessionKey` có booking tương ứng                                    | `404 NOT FOUND`   | "Booking not found for this session key"                                                         |
| 3   | Booking không được `CANCELLED`                                       | `400 BAD_REQUEST` | "Booking has been cancelled"                                                                     |
| 4   | `kioskId` phải khớp với `booking.kioskId`                            | `400 BAD_REQUEST` | "Session key is registered for Kiosk {booking.kioskId}"                                          |
| 5   | Thời gian hiện tại trong khoảng **±15 phút** so với `scheduledStart` | `400 BAD_REQUEST` | "You can only enter the Kiosk within 15 minutes of your scheduled start time ({scheduledStart})" |

- **Những gì xảy ra khi thành công**:
  1. Cập nhật `Session.status = ONGOING`, `Session.startTime1 = now`.
  2. Cập nhật `Booking.status = IN_PROGRESS`.
  3. Trả về `roomUrl`.
- **FE cần làm**: lấy `roomUrl` nhúng vào Daily.co iframe để ứng viên tham gia. Hiển thị đồng hồ đếm ngược nếu chưa đến giờ.

---

## 9. SESSION

### 9.1 Lấy danh sách Session

- `GET /api/sessions` -> `List<Session>`

### 9.2 Lấy Session theo ID

- `GET /api/sessions/{id}` -> `Session`

### 9.3 Lấy Sessions theo userId

- `GET /api/sessions/{userId}/by-user` -> `List<Session>`

### 9.4 Cập nhật Session

- `PUT /api/sessions` body `Session` -> `Session`

### 9.5 Tạo Session

- `POST /api/sessions/create-session`
- Request:

```json
{
  "dailyCoCreationRequest": {
    "name": "",
    "privacy": "public",
    "properties": {
      "max_participants": 2,
      "start_video_off": true,
      "start_audio_off": true,
      "enable_screenshare": true,
      "exp": 120,
      "enable_recording": "cloud"
    }
  },
  "userId": 1,
  "mentorId": 1
}
```

- Response: `SessionResponse`

### 9.6 Ghi nhận tham gia phòng (Join Record)

- `POST /api/sessions/join-session`
- **Khi nào gọi**: Khi FE bắt được sự kiện participant tham gia thành công vào Daily.co room. Thông tin từ Daily.co SDK event.
- Request:

```json
{
  "sessionName": "session-1752012345678",
  "userId": 7,
  "participantId": "p_abc123xyz",
  "isMentor": false
}
```

- `sessionName`: là `roomName` của phòng (ví dụ: `"session-1752012345678"`).
- `isMentor = false`: ứng viên tham gia.
- `isMentor = true`: mentor tham gia.
- Response: HTTP 200 (empty body)
- **Validation**:

| #   | Điều kiện                                                   | HTTP Status     | Message                            |
| --- | ----------------------------------------------------------- | --------------- | ---------------------------------- |
| 1   | `sessionName` tồn tại trong bảng Session                    | `404 NOT FOUND` | "Không tìm thấy phòng họp !!"      |
| 2   | Session không được ở trạng thái `DRAFT`                     | `409 CONFLICT`  | "Phòng họp chưa được duyệt"        |
| 3   | Nếu `isMentor = true`: `userId` phải khớp `session.userId2` | `403 FORBIDDEN` | "Mentor ID không khớp với Session" |
| 4   | Nếu `isMentor = false`: `userId` phải khớp `session.userId` | `403 FORBIDDEN` | "User ID không khớp với Session"   |

- **Những gì xảy ra khi thành công**:
  - Ứng viên (`isMentor = false`): `session.participantId1`, `session.status = ONGOING` (nếu chưa), `session.startTime1 = now`.
  - Mentor (`isMentor = true`): `session.participantId2`, `session.startTime2 = now`.

### 9.7 Daily.co Webhook

- `POST /api/sessions/webhooks/dailyco`
- **Trigger**: Daily.co phát sự kiện `participant.left`.
- **FE không cần gọi** - đây là webhook server-to-server.
- Logic: tìm Session theo `roomName`, ghi nhận `endTime`, tính `durationSeconds`. Nếu cả 2 người đều đã rời -> `session.status = COMPLETED`, publish event tính phí `MENTOR_INTERVIEW`.

### 9.8 Cập nhật trạng thái Session

- `GET /api/sessions/update-status?sessionId=&isApproved=` -> HTTP 200

### 9.9 Tạo thanh toán Session

- `GET /api/sessions/make-payment?sessionId=` -> `String paymentUrl`

---

## 10. APPLICATION + SUBMISSION

### 10.1 Tạo Application (Ứng viên ứng tuyển JD)

- `POST /api/applications?jdId=...` -> `Application`

### 10.2 Lấy tất cả Application

- `GET /api/applications` -> `List<Application>`

### 10.3 Lấy Application theo ID

- `GET /api/applications/{id}` -> `Application`

### 10.4 Lấy Applications của user hiện tại

- `GET /api/applications/me` -> `List<Application>`
- **Quyền**: hiện đang `permitAll` (nhưng nên dùng JWT).

### 10.5 Nộp bài (Submit)

- `POST /api/application-details/submit` (multipart/form-data)
- Request:

| Part             | Kiểu                   | Mô tả                                                                                              |
| ---------------- | ---------------------- | -------------------------------------------------------------------------------------------------- |
| `applicationId`  | Long                   | Bắt buộc                                                                                           |
| `textContent`    | String                 | Dùng cho vòng tự luận, email                                                                       |
| `file`           | MultipartFile          | Optional, dùng cho vòng upload file                                                                |
| `quizAnswers`    | List\<String\>         | Dùng cho vòng QUIZ                                                                                 |
| `compileRequest` | List\<CompileRequest\> | Dùng cho vòng Coding, mỗi item: `{"problemId":1,"language":"JAVA","sourceCode":"...","test":true}` |

- Response: `SubmissionResult`
- **Lưu ý**: frontend nên gửi từng object JSON hoàn chỉnh trong `compileRequest`, không phụ thuộc Swagger reassemble.

### 10.6 Chấm bài Code Review

- `POST /api/application-details/code-review/evaluate`
- Request:

```json
{
  "applicationId": 1,
  "roundId": 1,
  "submissions": [
    {
      "filename": "Main.java",
      "lineNumber": 10,
      "severity": "CRITICAL",
      "description": "..."
    }
  ]
}
```

- Response: `ApplicationDetail`

### 10.7 HR chấm điểm

- `POST /api/application-details/hr-score?applicationDetailId=&isPass=&note=&score=`
- Response: HTTP 200

### 10.8 Lấy ApplicationDetail

- `GET /api/application-details/{id}` -> `ApplicationDetail`
- `GET /api/application-details/application/{applicationId}` -> `List<ApplicationDetail>`
- `GET /api/application-details/reviewer` -> `List<ApplicationDetail>` (lấy các vòng được gán cho staff hiện tại)

---

## 11. JD + ROUND

### 11.1 Job Description

#### Lấy tất cả JD

- `GET /api/job-descriptions` -> `List<JobDescription>`

#### Lấy JD theo ID

- `GET /api/job-descriptions/{id}` -> `JobDescription`

#### Lấy JD theo Company

- `GET /api/job-descriptions/company/{companyId}` -> `List<JobDescription>`

#### Tạo JD

- `POST /api/job-descriptions`
- Request:

```json
{
  "title": "Senior Java Developer",
  "description": "Mô tả công việc...",
  "requirements": "Yêu cầu...",
  "benefits": "Quyền lợi...",
  "level": "Senior",
  "salaryMin": 2000,
  "salaryMax": 4000,
  "currency": "USD",
  "status": "OPEN",
  "deadlineAt": "2026-12-31T23:59:59",
  "companyId": 1
}
```

- Response: `JobDescription` (HTTP 201)

#### Cập nhật JD

- `PUT /api/job-descriptions` body tương tự POST có `id`

#### Xóa mềm JD

- `DELETE /api/job-descriptions/{id}/soft` -> `{"message":"Xóa mô tả công việc thành công"}`

#### Tìm kiếm JD

- `GET /api/job-descriptions/search?titleKeyword=&status=&level=&salaryMin=&salaryMax=`

### 11.2 Round

#### Thiết lập Rounds cho JD

- `PUT /api/rounds/jd/{jdId}`
- Request:

```json
{
  "rounds": [
    {
      "name": "Technical Interview",
      "roundOrder": 1,
      "roundType": "CODE",
      "passThreshold": 70,
      "reviewerId": 1,
      "configData": {
        "instruction": "Hướng dẫn nộp bài",
        "submissionFormat": "text",
        "timeLimitMinutes": 60,
        "maxScore": 100,
        "aiSystemPrompt": "System prompt cho AI chấm điểm",
        "evaluationCriteria": "Tiêu chí đánh giá",
        "quizQuestions": [],
        "codingProblemsId": [1, 2],
        "codeReviewIds": [1]
      }
    }
  ]
}
```

#### Lấy danh sách RoundType

- `GET /api/rounds` -> `List<RoundType>`

#### Cập nhật Rounds

- `PUT /api/rounds/jd/{jdId}/update` body tương tự setup

#### Tạo câu hỏi whiteboard bằng AI

- `POST /api/rounds/generate-whiteboard-question` body: `string hrIdea` -> `WhiteboardQuestionDto`

#### Lấy Round theo application order

- `GET /api/rounds/find-by-application-order/{applicationId}` -> `Round`

---

## 12. USER + COMPANY

### 12.1 User

#### Lấy tất cả User

- `GET /api/users` -> `List<User>`

#### Lấy User theo ID

- `GET /api/users/{id}` -> `User`

#### Lấy UserResponse theo userId

- `GET /api/users/find-by-id/{userId}` -> `UserResponse`

#### Tạo/Cập nhật User (multipart)

- `POST /api/users` multipart:
  - `data`: JSON `UserInfo`
  - `avatar`: optional MultipartFile
- Tạo: không có `id` trong data. Cập nhật: có `id` trong data.

#### Upload CV

- `POST /api/users/upload-cv` multipart:
  - `userId`: int
  - `cvFile`: MultipartFile (optional)
- Response: `CandidateProfile`

### 12.2 Company

#### Tạo Company (multipart)

- `POST /api/companies`:
  - `data`: JSON
  - `logo`: optional MultipartFile
  - `banner`: optional MultipartFile
- Response: `Company`

#### Cập nhật Company

- `PUT /api/companies` multipart tương tự

#### Lấy Company

- `GET /api/companies/{id}` -> `Company`
- `GET /api/companies` -> `List<Company>`

#### Xóa Company

- `DELETE /api/companies/{id}` -> HTTP 204

---

## 13. POST/FEED

### 13.1 Tạo Post (multipart)

- `POST /api/posts`:
  - `title`: string
  - `content`: string
  - `summary`: string
  - `authorId`: int
  - `coverImg`: MultipartFile (optional)
  - `tags`: List\<String\>
  - `status`: `PUBLISHED` | `DRAFT` | `ARCHIVED`
- Response: `Post`

### 13.2 Lấy New Feed (có phân trang)

- `GET /api/posts/feed?page=0&size=10` -> `Page<PostResponse>`

### 13.3 Lấy Post theo ID

- `GET /api/posts/{postId}` -> `PostResponse`

### 13.4 Like Post

- `POST /api/posts/likes` body `{"postId":1,"userId":1}` -> `PostLike`

### 13.5 Unlike Post

- `DELETE /api/posts/likes/{postId}/{userId}` -> `{"message":"Unlike thành công"}`

### 13.6 Check liked

- `GET /api/posts/likes/{postId}/check/{userId}` -> `{"isLiked":"true"}`

### 13.7 Comment

- `POST /api/posts/comments` body:

```json
{
  "postId": 1,
  "userId": 1,
  "content": "Nội dung bình luận",
  "parentCommentId": null
}
```

- `parentCommentId = null`: comment gốc. Có giá trị: reply.
- Response: `PostComment`

### 13.8 Cập nhật / Xóa Comment

- `PUT /api/posts/comments/{commentId}` body `{"content":"..."}` -> `PostComment`
- `DELETE /api/posts/comments/{commentId}` -> HTTP 204

### 13.9 Lấy tất cả / Published Posts

- `GET /api/posts` -> `List<PostResponse>`
- `GET /api/posts/published` -> `List<PostResponse>`

### 13.10 Đổi trạng thái Post

- `GET /api/posts/change-status/{postId}?status=PUBLISHED` -> `{"message":"..."}`

---

## 14. NOTIFICATION + MESSAGE

### 14.1 Notification

- `GET /api/notifications/{userId}` -> `List<Notification>`
- `POST /api/notifications` body `Notification` -> `Notification`
- `GET /api/notifications/check-read/{notificationId}` -> `Boolean`

### 14.2 Message (Chat)

- `GET /api/messages/{currentFullId}/{recipientFullId}` -> `List<ChatMessage>`
- `GET /api/messages/contacts?myId=&role=` -> `List<Integer>`

### 14.3 WebSocket Chat

- `WebSocket /ws-chat/**`
- `MessageMapping /chat` payload `ChatDto`

---

## 15. QUESTION BANK

- `GET /api/question-banks` -> `List<QuestionBank>`
- `GET /api/question-banks/{id}` -> `QuestionBank`
- `POST /api/question-banks` body `CreateQuestionBankRequest` -> `QuestionBank`
- `PUT /api/question-banks/{id}` body `UpdateQuestionBankRequest` -> `QuestionBank`
- `DELETE /api/question-banks/{id}` -> HTTP 204
- `POST /api/question-banks/generate` body `QuestionGenerateRequest` -> `QuestionGenerateResponse`

---

## 16. MENTOR FEEDBACK

- `GET /api/mentor-feedbacks/{id}` -> `MentorFeedback`
- `GET /api/mentor-feedbacks` -> `List<MentorFeedback>`
- `GET /api/mentor-feedbacks/mentor/{mentorId}` -> `List<MentorFeedback>`
- `POST /api/mentor-feedbacks` body `CreateMentorFeedbackRequest` -> `MentorFeedback`
- `PUT /api/mentor-feedbacks` body `UpdateMentorFeedbackRequest` -> `MentorFeedback`

---

## 17. PAYMENT

- `POST /api/payments/pay?amount=&userId=&paymentPurpose=`
  - `paymentPurpose`: `CV_SCREENING`, `EMAIL_SIMULATOR`, `QUIZ`, `DB_DESIGN`, `AI_INTERVIEW`, `FULLY_PAID`, `MENTOR_INTERVIEW`
- `GET /api/payments/{id}` -> `Payment`
- `GET /api/payments` -> `List<Payment>`
- `GET /api/payments/cancel?transactionCode=` -> `Payment`
- `POST /api/payments/webhook` body PayOS `Webhook`

---

## 18. MAIL + EMAIL SUBMISSION

- `GET /api/mails/send?toEmail=&subject=&body=`
- `POST /api/mails/send-generic` body `GenericEmailRequest`
- `GET /api/email-submissions/{id}` -> `EmailSubmission`
- `GET /api/email-submissions` -> `List<EmailSubmission>`

---

## 19. INTERVIEW AI

### 19.1 Interview session

#### Tạo job requirement từ JD

- `POST /api/interview-sessions/generate-job-requirement` body: string JD -> `JobRequirementData`

#### Lấy config options

- `GET /api/interview-sessions/config-options` -> `Map<String, Object>`

#### Tạo Interview Session

- `POST /api/interview-sessions/create-session` body:

```json
{
  "user_id": 1,
  "candidate_profile": {},
  "job_requirement": {},
  "session_config": {}
}
```

- Response: `String sessionKey`

#### Lấy Sessions theo user

- `GET /api/interview-sessions/user/{userId}` -> `List<InterviewSession>`

#### Lấy Session từ Redis cache

- `GET /api/interview-sessions/cache/{sessionKey}` -> `InterviewSessionRedis`

#### Lấy Session theo ID

- `GET /api/interview-sessions/{sessionId}` -> `InterviewSession`

### 19.2 Chat interview

#### Bắt đầu / Lấy câu hỏi hiện tại

- `GET /api/v1/interview/start/{sessionKey}` -> `QuestionResponse`:

```json
{
  "sessionKey": "uuid",
  "isFinished": false,
  "phaseName": "Technical",
  "currentQuestionIndex": 1,
  "totalQuestionsInPhase": 10,
  "questionContent": "Câu hỏi...",
  "questionType": "BLUEPRINT"
}
```

#### Submit câu trả lời

- `POST /api/v1/interview/submit`
- Request:

```json
{
  "sessionKey": "uuid",
  "answer": "Câu trả lời của ứng viên"
}
```

- Response: `QuestionResponse`

---

## 20. PROCTORING

### 20.1 Track behavior

- `POST /api/v1/proctoring/track`
- Request:

```json
{
  "sessionKey": "uuid",
  "globalQuestionOrder": 1,
  "imageBase64": "base64..."
}
```

- Response: HTTP 200 hoặc 202 (empty body)
- **Lưu ý**: đây là fire-and-forget, backend chủ động return 200/202 nên FE cứ gọi mỗi 2-3 giây mà không cần chờ response.

---

## 21. TEST/DEBUG

- `GET /api/test/hello` -> `"Hello, Inblue!"`
- `GET /api/test/test` -> test traceId
- `GET /api/test/status` -> `"Application is running smoothly."`
- `GET /api/test/ping` -> `"pong"`
- `GET /api/test/health` -> `"OK"`
- `POST /api/test/food-test-hash` -> test Redis hash
- `POST /api/test/python-test` multipart: `file` -> `CVParserResponse`
- `POST /api/test/cv-evaluation-test` multipart: `cvFile`, `evaluationCriteria`, `jobDescription` -> `CvEvaluationResponse`

---

## 22. LỖI THƯỜNG GẶP

### Lỗi 1: `Booking is not in AWAITING_MENTOR status` (HTTP 400)

- **Nguyên nhân**: Booking đã được assign mentor rồi (`status` đã là `ROOM_CREATED`).
- **Xử lý**: FE Admin refresh lại danh sách booking. Nếu booking đã chuyển sang `ROOM_CREATED`, tức là đã được assign trước đó.

### Lỗi 2: `Selected slot is already booked` (HTTP 409)

- **Nguyên nhân**: Slot đã bị đặt bởi ứng viên khác (race condition).
- **Xử lý**: FE luôn fetch lại slots trước khi hiển thị. Khi ứng viên bấm đặt, hiển thị loading và disable nút. Nếu lỗi, hiển thị "Slot này vừa được đặt, vui lòng chọn slot khác" và fetch lại slots.

### Lỗi 3: `Mentor has another interview booking at this time` (HTTP 409)

- **Nguyên nhân**: Mentor đã có booking khác trùng giờ (trừ các booking đã `CANCELLED`).
- **Xử lý**: FE Admin hiển thị thông báo và đề xuất chọn mentor khác hoặc thời gian khác.

### Lỗi 4: `You can only enter the Kiosk within 15 minutes of your scheduled start time` (HTTP 400)

- **Nguyên nhân**: Ứng viên đến sớm hơn 15 phút hoặc muộn hơn 15 phút.
- **Xử lý**: FE Kiosk hiển thị đồng hồ đếm ngược và giới hạn thời gian vào. Ví dụ: "Vui lòng đợi đến khi còn X phút nữa" hoặc "Bạn đã đến muộn, không thể vào phòng".

### Lỗi 5: `violates check constraint "applicationdetail_status_check"` (SQL Error)

- **Nguyên nhân**: DB constraint chưa được migrate để chấp nhận giá trị `SLOT_PICKED`.
- **Xử lý**: Cần migrate DB thêm `SLOT_PICKED` vào CHECK constraint. Code backend đã đúng.

---

## 23. THỨ TỰ BUILD FRONTEND

1. **Auth + User** - Login, JWT, profile
2. **Company + JD + Round** - CRUD JD, thiết lập vòng phỏng vấn
3. **Application** - Ứng tuyển JD
4. **Submission + QuestionBank** - Nộp bài, ngân hàng câu hỏi
5. **Post/Feed** - Bài viết, bình luận, like
6. **Mentor/Booking/Kiosk** - Đặt lịch, gán mentor, xác thực Kiosk ← **LUỒNG ĐÃ FIX**
7. **Session + Payment** - Tạo phòng, thanh toán
8. **Interview AI + Proctoring** - Phỏng vấn AI, theo dõi hành vi
9. **Notification + Chat** - Thông báo, nhắn tin
10. **Mail/Email submission** - Gửi mail, nộp bài qua email

---

## FILE UPLOAD RULES

- Nhiều endpoint dùng `multipart/form-data`.
- Quy ước: `data` = JSON object, các file = `MultipartFile` riêng.
- Upload media qua Cloudinary.
- Max file size: 10MB.

## WEBHOOKS

- `POST /api/sessions/webhooks/dailyco` - Xử lý sự kiện rời phòng từ Daily.co
- `POST /api/payments/webhook` - Xử lý thanh toán PayOS

## DAILY.CO EXPIRATION

- `exp = scheduledEnd epoch + 3600 giây` (phòng hết hạn 1 giờ sau giờ kết thúc).
- Phòng sẽ tự động hết hạn sau 1 giờ tính từ thời điểm kết thúc slot.
