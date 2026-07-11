# Tài liệu Luồng Mentor Interview trong Application Pipeline

> **Cập nhật:** 2026-07-11  
> **Phiên bản Backend:** Latest (v062+)  
> **Mục đích:** Tài liệu đầy đủ cho Frontend Developer implement 100% tính năng

---

## TÓM TẮT NHANH

### 1. Tên chính xác của Round Type

| Nơi                       | Giá trị            | Ghi chú                              |
| ------------------------- | ------------------ | ------------------------------------ |
| `RoundType.java` (line 9) | `MENTROR_REVIEW`   | ⚠️ **CÓ TYPO** (2 chữ "R" liền nhau) |
| `PaymentPurpose.java`     | `MENTOR_INTERVIEW` | ✅ Đúng chính tả                     |
| `FeatureName.java`        | `MENTOR_INTERVIEW` | ✅ Đúng chính tả                     |

**Frontend gửi lên:** `"roundType": "MENTROR_REVIEW"`

### 2. Cấu trúc JD Round Config cho MENTOR_REVIEW

**Trong `Round.RoundConfig`:**

```java
// Round.java:85
MentorInterviewDto mentorInterview;
```

**MentorInterviewDto structure:**

```java
// MentorInterviewDto.java
@Data
public class MentorInterviewDto {
    private Integer userId;      // User ID (nullable)
    private Integer mentorId;    // Mentor ID (nullable - CHƯA GÁN)
    private Integer duration;    // Thời lượng phỏng vấn (phút)
    private Integer totalPrice;  // Phí (0 = miễn phí cho Kiosk)
}
```

**⚠️ QUAN TRỌNG:**

- `mentorInterview.mentorId = null` trong config — **CHƯA GÁN mentor cố định**
- Mentor được gán **ĐỘNG** khi Admin assign
- `duration` và `totalPrice` có thể được set từ config
- Hoặc `totalPrice = 0` (miễn phí) như trong code `assignMentor()`

### 3. Mentor được assign như thế nào?

```
┌─────────────────────────────────────────────────────────────────────┐
│  LUỒNG MENTOR ASSIGNMENT                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Student hoàn thành vòng trước (Quiz/Coding/etc)               │
│            ↓                                                        │
│  2. Backend tự động tạo ApplicationDetail cho vòng MENTOR_REVIEW  │
│     (ApplicationServiceImpl.java:79-95)                            │
│            ↓                                                        │
│  3. Student gọi POST /api/mentor-bookings/pick-slot               │
│     → Tạo Booking với status = AWAITING_MENTOR                     │
│            ↓                                                        │
│  4. Admin gọi POST /api/admin/mentor-bookings/{id}/assign-mentor   │
│     → Tạo Session (Daily.co room)                                 │
│     → Gán mentorId vào Booking                                    │
│     → Status = ROOM_CREATED                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4. Có bước thanh toán không?

| Trường hợp                       | Thanh toán  | Endpoint | Flow                                             |
| -------------------------------- | ----------- | -------- | ------------------------------------------------ |
| **Kiosk Interview (Practice)**   | ❌ Miễn phí | -        | Student chọn slot → Admin gán mentor → Vào phòng |
| **Application Mentor Interview** | ❌ Miễn phí | -        | Giống Kiosk, không có thanh toán                 |

**Code xác nhận (MentorInterviewBookingServiceImpl.java:171):**

```java
sessionReq.setTotalPrice(0);  // Luôn miễn phí
```

**Lưu ý:** Có API `GET /api/sessions/make-payment?sessionId={id}` nhưng hiện tại `totalPrice=0` nên không cần thanh toán.

### 5. Session trong Application vs Kiosk

| Khía cạnh               | Kiosk Interview | Application Mentor Interview          |
| ----------------------- | --------------- | ------------------------------------- |
| Tạo Session             | ✅ Có           | ✅ Có                                 |
| sessionKey              | ✅ Có (UUID)    | ✅ Có                                 |
| kioskId                 | ✅ Có           | ✅ Có                                 |
| ApplicationDetail link  | ❌ Không        | ✅ Có (`booking.applicationDetailId`) |
| Session status được vào | `ONGOING`       | `ONGOING`                             |

**Session Entity:**

```java
// Session.java
private String roomName;
private int userId;           // mentee (student)
private int userId2;          // mentor
private String sessionKey;    // UUID cho kiosk enter
private Long kioskId;
private String roomUrl;       // Daily.co URL
private SessionStatus status; // DRAFT → SCHEDULED → ONGOING → COMPLETED
```

---

## SƠ ĐỒ LUỒNG HOÀN CHỈNH

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LUỒNG MENTOR_REVIEW TRONG APPLICATION                 │
└─────────────────────────────────────────────────────────────────────────────┘

[User hoàn thành vòng trước - VD: Quiz/Coding]
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND: moveToNextRound() được gọi                                       │
│                                                                             │
│  • Tăng application.currentRoundOrder                                      │
│  • Tự động tạo ApplicationDetail với:                                      │
│    - applicationId = current application                                    │
│    - roundId = vòng MENTOR_REVIEW                                          │
│    - status = PENDING                                                       │
│  • Gửi notification cho user                                               │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND: Student xem Application History                                  │
│                                                                             │
│  GET /api/applications/me                                                  │
│  → Trả về list applications của user                                      │
│                                                                             │
│  GET /api/application-details/application/{applicationId}                  │
│  → Trả về tất cả ApplicationDetail                                        │
│  → Tìm detail có roundType = MENTOR_REVIEW                                │
│  → Nếu status = PENDING → Hiển thị màn hình chọn lịch                    │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Student chọn Kiosk và Slot                                        │
│                                                                             │
│  GET /api/kiosks                                                           │
│  → Lấy danh sách Kiosk hoạt động                                          │
│                                                                             │
│  GET /api/kiosks/{kioskId}/slots?date=2026-07-15                          │
│  → Lấy slots trống trong ngày                                             │
│  → Mỗi slot: {startTime, endTime, available}                              │
│                                                                             │
│  POST /api/mentor-bookings/pick-slot                                       │
│  Request:                                                                  │
│  {                                                                          │
│    "applicationDetailId": 456,           // ID ApplicationDetail vòng hiện tại│
│    "kioskId": 1,                                                              │
│    "scheduledStart": "2026-07-15T09:00:00",                                │
│    "scheduledEnd": "2026-07-15T09:30:00"                                   │
│  }                                                                          │
│                                                                             │
│  Response:                                                                  │
│  {                                                                          │
│    "id": 789,                                                               │
│    "applicationDetailId": 456,                                              │
│    "kioskId": 1,                                                           │
│    "applicantUserId": 42,                                                   │
│    "scheduledStart": "2026-07-15T09:00:00",                                │
│    "scheduledEnd": "2026-07-15T09:30:00",                                  │
│    "mentorId": null,                                                        │
│    "sessionId": null,                                                        │
│    "status": "AWAITING_MENTOR",                                             │
│    "sessionKey": null                                                       │
│  }                                                                          │
│                                                                             │
│  Backend:                                                                   │
│  • Tạo MentorInterviewBooking (status = AWAITING_MENTOR)                  │
│  • Cập nhật ApplicationDetail.bookingId = booking.id                       │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: Admin gán Mentor (từ Dashboard Admin)                            │
│                                                                             │
│  GET /api/admin/mentor-bookings?status=AWAITING_MENTOR                     │
│  → Danh sách bookings chờ gán mentor                                      │
│                                                                             │
│  GET /api/mentors                                                          │
│  → Danh sách mentors                                                       │
│                                                                             │
│  POST /api/admin/mentor-bookings/789/assign-mentor                        │
│  Request:                                                                  │
│  {                                                                          │
│    "mentorId": 5,                                                           │
│    "notes": "Chuẩn bị kỹ thuật Java, Spring Boot"                         │
│  }                                                                          │
│                                                                             │
│  Response:                                                                  │
│  {                                                                          │
│    "id": 789,                                                               │
│    "mentorId": 5,                                                           │
│    "sessionId": 123,                                                        │
│    "status": "ROOM_CREATED",                                               │
│    "sessionKey": "abc123-def456-ghi789"                                    │
│  }                                                                          │
│                                                                             │
│  Backend:                                                                   │
│  • Tạo Session (Daily.co room)                                             │
│  • Gán mentorId vào Booking                                               │
│  • Tạo sessionKey (UUID)                                                  │
│  • Cập nhật ApplicationDetail:                                            │
│    - sessionId = session.id                                                │
│    - status = SLOT_PICKED                                                  │
│  • Gửi notification cho student: "Mentor đã được gán"                     │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 3: Student vào phòng (Kiosk Enter)                                  │
│                                                                             │
│  ⚠️ Chỉ vào được trong khoảng ±15 phút so với giờ hẹn                   │
│                                                                             │
│  POST /api/kiosk/enter                                                     │
│  Request:                                                                  │
│  {                                                                          │
│    "sessionKey": "abc123-def456-ghi789",                                   │
│    "kioskId": 1                                                            │
│  }                                                                          │
│                                                                             │
│  Response (200 OK):                                                        │
│  {                                                                          │
│    "roomUrl": "https://inblue.daily.co/room_xyz",                         │
│    "sessionId": 123,                                                       │
│    "bookingStatus": "IN_PROGRESS"                                          │
│  }                                                                          │
│                                                                             │
│  Response (400 - Chưa đến giờ):                                           │
│  {                                                                          │
│    "error": "You can only enter the Kiosk within 15 minutes of your       │
│              scheduled start time (09:00:00)"                               │
│  }                                                                          │
│                                                                             │
│  Frontend: Navigate đến Daily.co với roomUrl                              │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 4: Phỏng vấn trên Daily.co                                          │
│                                                                             │
│  Student & Mentor join qua Daily.co SDK                                    │
│                                                                             │
│  Khi join: Gọi POST /api/sessions/join-session                            │
│  Request:                                                                  │
│  {                                                                          │
│    "sessionName": "room_xyz",        // roomName từ Session                │
│    "userId": 42,                                    │
│    "participantId": "participant_abc",                                   │
│    "mentor": false                    // true cho mentor                  │
│  }                                                                          │
│                                                                             │
│  Khi rời: Daily.co webhook participant.left                               │
│  Backend tự động cập nhật endTime1/endTime2                              │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 5: Kết thúc & Đánh giá Mentor                                      │
│                                                                             │
│  Backend tự động (khi cả 2 rời phòng):                                   │
│  • Session.status = COMPLETED                                              │
│  • Booking.status = COMPLETED                                              │
│  • ApplicationDetail.status = AI_EVALUATED                                 │
│  • Gửi notification: "Phỏng vấn kết thúc, hãy đánh giá mentor"          │
│                                                                             │
│  POST /api/mentor-reviews                                                  │
│  Request:                                                                  │
│  {                                                                          │
│    "sessionId": 123,                                                       │
│    "mentorId": 5,                                                          │
│    "userId": 42,                                                           │
│    "rating": 8,                          // 1-10                            │
│    "situationNote": "Được hỏi về dự án thực tế",                        │
│    "taskNote": "Giải thích kiến trúc hệ thống",                        │
│    "actionNote": "Trình bày rõ ràng, có demo",                           │
│    "resultNote": "Mentor feedback tích cực",                              │
│    "strength": "Kỹ năng trình bày tốt",                                  │
│    "weakness": "Cần deep dive hơn vào technical",                         │
│    "improve": "Practice thêm system design"                               │
│  }                                                                          │
│                                                                             │
│  Backend:                                                                   │
│  • Tạo MentorReview                                                       │
│  • Link vào ApplicationDetail.mentorReview                                │
│  • Tính finalScore = (rating/10) * maxScore                               │
│  • Xác định PASSED/FAILED dựa trên passThreshold                         │
│  • Cập nhật ApplicationDetail.status = COMPLETED                          │
│  • Gọi moveToNextRound() → Chuyển sang vòng tiếp theo (AI_INTERVIEW)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS ĐẦY ĐỦ

### A. Application & ApplicationDetail

| Method | Endpoint                                               | Mô tả                              |
| ------ | ------------------------------------------------------ | ---------------------------------- |
| GET    | `/api/applications/me`                                 | Lấy applications của user          |
| GET    | `/api/applications/{id}`                               | Lấy chi tiết application           |
| GET    | `/api/application-details/application/{applicationId}` | Lấy tất cả details của application |
| GET    | `/api/application-details/{id}`                        | Lấy chi tiết một detail            |

### B. Kiosk Management

| Method | Endpoint                                      | Mô tả                         |
| ------ | --------------------------------------------- | ----------------------------- |
| GET    | `/api/kiosks`                                 | Lấy danh sách Kiosk hoạt động |
| POST   | `/api/kiosks`                                 | Tạo Kiosk mới (Admin)         |
| PUT    | `/api/kiosks/{id}`                            | Cập nhật Kiosk (Admin)        |
| GET    | `/api/kiosks/{kioskId}/slots?date=YYYY-MM-DD` | Lấy slots trống               |
| GET    | `/api/kiosks/{kioskId}/schedules`             | Lấy lịch Kiosk                |
| POST   | `/api/kiosks/schedule`                        | Tạo lịch Kiosk (Admin)        |
| PUT    | `/api/kiosks/schedule/{id}`                   | Cập nhật lịch Kiosk (Admin)   |

### C. Mentor Interview Booking (Student)

| Method | Endpoint                           | Mô tả       | Request Body         |
| ------ | ---------------------------------- | ----------- | -------------------- |
| POST   | `/api/mentor-bookings/pick-slot`   | Chọn slot   | `PickSlotDtoRequest` |
| DELETE | `/api/mentor-bookings/{bookingId}` | Hủy booking | -                    |

### D. Mentor Booking Admin

| Method | Endpoint                                               | Mô tả              |
| ------ | ------------------------------------------------------ | ------------------ |
| GET    | `/api/admin/mentor-bookings?status=AWAITING_MENTOR`    | Danh sách bookings |
| POST   | `/api/admin/mentor-bookings/{bookingId}/assign-mentor` | Gán mentor         |

### E. Kiosk Enter

| Method | Endpoint           | Mô tả     | Request Body           |
| ------ | ------------------ | --------- | ---------------------- |
| POST   | `/api/kiosk/enter` | Vào phòng | `KioskEnterDtoRequest` |

### F. Session

| Method | Endpoint                                    | Mô tả                |
| ------ | ------------------------------------------- | -------------------- |
| GET    | `/api/sessions`                             | Tất cả sessions      |
| GET    | `/api/sessions/{id}`                        | Chi tiết session     |
| GET    | `/api/sessions/{userId}/by-user`            | Sessions của user    |
| POST   | `/api/sessions/join-session`                | Ghi nhận join        |
| GET    | `/api/sessions/make-payment?sessionId={id}` | Thanh toán (nếu cần) |
| PUT    | `/api/sessions`                             | Cập nhật session     |

### G. Mentor

| Method | Endpoint                   | Mô tả                  |
| ------ | -------------------------- | ---------------------- |
| GET    | `/api/mentors`             | Danh sách mentors      |
| GET    | `/api/mentors/{id}`        | Chi tiết mentor        |
| POST   | `/api/mentors`             | Tạo mentor (Admin)     |
| PUT    | `/api/mentors/toggle/{id}` | Bật/tắt mentor (Admin) |

### H. Mentor Review

| Method | Endpoint                   | Mô tả           |
| ------ | -------------------------- | --------------- |
| GET    | `/api/mentor-reviews`      | Tất cả reviews  |
| GET    | `/api/mentor-reviews/{id}` | Chi tiết review |
| POST   | `/api/mentor-reviews`      | Tạo review      |
| PUT    | `/api/mentor-reviews`      | Cập nhật review |

---

## REQUEST/RESPONSE EXAMPLES

### 1. Pick Slot - Chọn slot

**POST** `/api/mentor-bookings/pick-slot`

```json
// Request
{
    "applicationDetailId": 456,
    "kioskId": 1,
    "scheduledStart": "2026-07-15T09:00:00",
    "scheduledEnd": "2026-07-15T09:30:00"
}

// Response (201 Created)
{
    "id": 789,
    "applicationDetailId": 456,
    "kioskId": 1,
    "applicantUserId": 42,
    "scheduledStart": "2026-07-15T09:00:00",
    "scheduledEnd": "2026-07-15T09:30:00",
    "mentorId": null,
    "sessionId": null,
    "status": "AWAITING_MENTOR",
    "sessionKey": null,
    "notes": null,
    "createdAt": "2026-07-11T21:00:00",
    "updatedAt": "2026-07-11T21:00:00"
}
```

### 2. Assign Mentor - Gán mentor

**POST** `/api/admin/mentor-bookings/789/assign-mentor`

```json
// Request
{
    "mentorId": 5,
    "notes": "Chuẩn bị kỹ thuật Java, Spring Boot"
}

// Response (200 OK)
{
    "id": 789,
    "applicationDetailId": 456,
    "kioskId": 1,
    "applicantUserId": 42,
    "scheduledStart": "2026-07-15T09:00:00",
    "scheduledEnd": "2026-07-15T09:30:00",
    "mentorId": 5,
    "sessionId": 123,
    "status": "ROOM_CREATED",
    "sessionKey": "abc123-def456-ghi789",
    "notes": "Chuẩn bị kỹ thuật Java, Spring Boot",
    "createdAt": "2026-07-11T21:00:00",
    "updatedAt": "2026-07-11T21:05:00"
}
```

### 3. Kiosk Enter - Vào phòng

**POST** `/api/kiosk/enter`

```json
// Request
{
    "sessionKey": "abc123-def456-ghi789",
    "kioskId": 1
}

// Response (200 OK)
{
    "roomUrl": "https://inblue.daily.co/room_xyz",
    "sessionId": 123,
    "bookingStatus": "IN_PROGRESS",
    "sessionStatus": "ONGOING"
}

// Response (400 Bad Request - Chưa đến giờ)
{
    "error": "You can only enter the Kiosk within 15 minutes of your scheduled start time (2026-07-15T09:00:00)"
}
```

### 4. Join Session - Ghi nhận tham gia

**POST** `/api/sessions/join-session`

```json
// Request (Student)
{
    "sessionName": "room_xyz",
    "userId": 42,
    "participantId": "participant_student_abc",
    "mentor": false
}

// Request (Mentor)
{
    "sessionName": "room_xyz",
    "userId": 5,
    "participantId": "participant_mentor_xyz",
    "mentor": true
}
```

### 5. Create Mentor Review - Tạo review

**POST** `/api/mentor-reviews`

```json
// Request
{
    "sessionId": 123,
    "mentorId": 5,
    "userId": 42,
    "rating": 8,
    "situationNote": "Được hỏi về dự án thực tế đã làm",
    "taskNote": "Giải thích kiến trúc hệ thống, tech stack",
    "actionNote": "Trình bày rõ ràng, có demo source code",
    "resultNote": "Mentor feedback tích cực, gợi ý cải thiện",
    "strength": "Kỹ năng trình bày tốt, hiểu biết sâu về architecture",
    "weakness": "Cần deep dive hơn vào system design",
    "improve": "Practice thêm với system design questions"
}

// Response (201 Created)
{
    "id": 1,
    "session": {
        "id": 123,
        "roomName": "room_xyz",
        "status": "COMPLETED"
    },
    "mentor": {
        "id": 5,
        "name": "Nguyễn Văn Mentor"
    },
    "user": {
        "id": 42,
        "name": "Trần Văn Student"
    },
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

### 6. Get Available Slots - Lấy slots trống

**GET** `/api/kiosks/1/slots?date=2026-07-15`

```json
// Response
[
  {
    "startTime": "2026-07-15T08:00:00",
    "endTime": "2026-07-15T08:30:00",
    "available": true
  },
  {
    "startTime": "2026-07-15T08:45:00",
    "endTime": "2026-07-15T09:15:00",
    "available": false
  },
  {
    "startTime": "2026-07-15T09:30:00",
    "endTime": "2026-07-15T10:00:00",
    "available": true
  }
]
```

### 7. Get Application Details - Lấy chi tiết application

**GET** `/api/application-details/application/123`

```json
// Response
[
  {
    "id": 455,
    "applicationId": 123,
    "roundId": 10,
    "status": "COMPLETED",
    "finalScore": 85.0,
    "finalResult": "PASSED",
    "startedAt": "2026-07-10T10:00:00",
    "completedAt": "2026-07-10T10:45:00"
  },
  {
    "id": 456,
    "applicationId": 123,
    "roundId": 11,
    "status": "PENDING",
    "finalScore": null,
    "finalResult": null,
    "startedAt": null,
    "completedAt": null,
    "bookingId": null,
    "sessionId": null,
    "mentorReview": null
  }
]
```

### 8. Get All Mentors - Lấy danh sách mentor

**GET** `/api/mentors`

```json
// Response
[
  {
    "id": 5,
    "name": "Nguyễn Văn Mentor",
    "avatar": "https://example.com/avatar5.jpg",
    "expertise": ["Java", "Spring Boot", "System Design"],
    "rating": 4.8,
    "isActive": true
  },
  {
    "id": 6,
    "name": "Trần Thị Mentor",
    "avatar": "https://example.com/avatar6.jpg",
    "expertise": ["React", "Node.js", "DevOps"],
    "rating": 4.9,
    "isActive": true
  }
]
```

---

## FRONTEND STEP-BY-STEP

### Cho Student (Ứng viên)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Xem danh sách Application                                        │
│                                                                             │
│  Frontend: Student vào trang Application History                           │
│                                                                             │
│  API: GET /api/applications/me                                              │
│  → Lấy danh sách applications                                              │
│                                                                             │
│  API: GET /api/application-details/application/{applicationId}              │
│  → Lấy chi tiết tất cả rounds                                              │
│                                                                             │
│  Logic:                                                                    │
│  → Tìm round có roundType = "MENTROR_REVIEW"                              │
│  → Kiểm tra status:                                                        │
│    - PENDING → Hiển thị "Chọn lịch phỏng vấn"                            │
│    - SLOT_PICKED → Hiển thị "Chờ đến giờ vào phòng"                     │
│    - AI_EVALUATED → Hiển thị "Phỏng vấn kết thúc, đánh giá mentor"      │
│    - COMPLETED → Hiển thị kết quả                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: Chọn Kiosk và Slot (nếu status = PENDING)                        │
│                                                                             │
│  API: GET /api/kiosks                                                       │
│  → Hiển thị danh sách Kiosk để chọn                                       │
│                                                                             │
│  API: GET /api/kiosks/{kioskId}/slots?date=2026-07-15                     │
│  → Hiển thị lịch slots trong ngày                                          │
│  → Slots đã book: hiển thị disabled                                       │
│                                                                             │
│  UI: Student chọn slot → Bấm "Đặt lịch"                                   │
│                                                                             │
│  API: POST /api/mentor-bookings/pick-slot                                  │
│  Body:                                                                     │
│  {                                                                          │
│    "applicationDetailId": 456,           // ID từ Bước 1                     │
│    "kioskId": 1,                                                              │
│    "scheduledStart": "2026-07-15T09:00:00",                                │
│    "scheduledEnd": "2026-07-15T09:30:00"                                   │
│  }                                                                          │
│                                                                             │
│  UI: Hiển thị "Đã đặt lịch thành công. Đang chờ gán mentor..."          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 3: Chờ Admin gán Mentor                                             │
│                                                                             │
│  UI: Hiển thị màn hình chờ với thông tin:                                  │
│  - Ngày giờ đã đặt                                                         │
│  - Kiosk đã chọn                                                           │
│  - Status: "Đang chờ gán mentor..."                                        │
│                                                                             │
│  Backend sẽ gửi notification khi mentor được gán                           │
│  UI: Cập nhật status + Hiển thị thông tin mentor                          │
│  → Status: "SLOT_PICKED"                                                   │
│  → Mentor: Nguyễn Văn Mentor                                               │
│  → Giờ hẹn: 09:00 - 09:30                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 4: Vào phòng (trong khoảng ±15 phút)                                │
│                                                                             │
│  UI: Student bấm "Vào phòng" khi đến giờ                                 │
│                                                                             │
│  API: POST /api/kiosk/enter                                                │
│  Body:                                                                     │
│  {                                                                          │
│    "sessionKey": "abc123-def456-ghi789",                                   │
│    "kioskId": 1                                                            │
│  }                                                                          │
│                                                                             │
│  Response:                                                                  │
│  {                                                                          │
│    "roomUrl": "https://inblue.daily.co/room_xyz",                         │
│    "sessionId": 123                                                        │
│  }                                                                          │
│                                                                             │
│  UI: Navigate đến component Daily.co Video Call                            │
│  → Initialize Daily.co SDK với roomUrl                                    │
│  → Join meeting                                                            │
│                                                                             │
│  API: POST /api/sessions/join-session                                      │
│  Body: {sessionName, userId, participantId, mentor: false}                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 5: Phỏng vấn                                                        │
│                                                                             │
│  Video call diễn ra trên Daily.co                                           │
│                                                                             │
│  Khi Mentor join:                                                          │
│  API: POST /api/sessions/join-session (mentor: true)                        │
│                                                                             │
│  Backend tự động cập nhật khi có người rời (webhook)                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 6: Đánh giá Mentor (sau khi phỏng vấn kết thúc)                     │
│                                                                             │
│  UI: Hiển thị form đánh giá STAR:                                          │
│                                                                             │
│  API: POST /api/mentor-reviews                                              │
│  Body:                                                                     │
│  {                                                                          │
│    "sessionId": 123,                                                       │
│    "mentorId": 5,                                                          │
│    "userId": 42,                                                           │
│    "rating": 8,                          // 1-10                            │
│    "situationNote": "...",                                                 │
│    "taskNote": "...",                                                       │
│    "actionNote": "...",                                                     │
│    "resultNote": "...",                                                     │
│    "strength": "...",                                                       │
│    "weakness": "...",                                                       │
│    "improve": "..."                                                         │
│  }                                                                          │
│                                                                             │
│  Backend:                                                                   │
│  • Tạo MentorReview                                                        │
│  • Tính finalScore = (8/10) * maxScore                                   │
│  • Cập nhật ApplicationDetail                                             │
│  • Gọi moveToNextRound() → Chuyển sang vòng AI_INTERVIEW                 │
│                                                                             │
│  UI: Hiển thị "Cảm ơn bạn đã đánh giá. Kết quả sẽ được thông báo."       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Cho Admin (Dashboard)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 1: Xem danh sách Bookings chờ gán                                   │
│                                                                             │
│  API: GET /api/admin/mentor-bookings?status=AWAITING_MENTOR               │
│                                                                             │
│  Response:                                                                  │
│  [                                                                          │
│    {                                                                        │
│      "id": 789,                                                             │
│      "applicationDetailId": 456,                                            │
│      "applicantUserId": 42,                                                 │
│      "scheduledStart": "2026-07-15T09:00:00",                             │
│      "scheduledEnd": "2026-07-15T09:30:00",                               │
│      "status": "AWAITING_MENTOR"                                           │
│    }                                                                        │
│  ]                                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BƯỚC 2: Gán Mentor                                                        │
│                                                                             │
│  API: GET /api/mentors                                                      │
│  → Hiển thị danh sách mentors                                              │
│                                                                             │
│  UI: Admin chọn mentor → Bấm "Gán Mentor"                                 │
│                                                                             │
│  API: POST /api/admin/mentor-bookings/789/assign-mentor                    │
│  Body:                                                                     │
│  {                                                                          │
│    "mentorId": 5,                                                           │
│    "notes": "Chuẩn bị kỹ thuật Java, Spring Boot"                         │
│  }                                                                          │
│                                                                             │
│  Backend:                                                                   │
│  • Tạo Session (Daily.co room)                                            │
│  • Gửi notification cho student                                            │
│                                                                             │
│  UI: Hiển thị "Đã gán mentor thành công"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SO SÁNH KIOSK VS APPLICATION

| Khía cạnh                         | Kiosk Interview         | Application Mentor Interview          |
| --------------------------------- | ----------------------- | ------------------------------------- |
| **Round Type**                    | `MENTROR_REVIEW`        | `MENTOR_REVIEW`                       |
| **Trong Pipeline JD**             | ❌ Không                | ✅ Có                                 |
| **ApplicationDetail tự động tạo** | ❌ Không                | ✅ Có (khi moveToNextRound)           |
| **Có booking**                    | ✅ Có                   | ✅ Có                                 |
| **Mentor assign**                 | Admin gán               | Admin gán                             |
| **Thanh toán**                    | Miễn phí (totalPrice=0) | Miễn phí (totalPrice=0)               |
| **Session tạo khi**               | Admin gán mentor        | Admin gán mentor                      |
| **Session key**                   | ✅ Có                   | ✅ Có                                 |
| **Kiosk ID**                      | ✅ Có                   | ✅ Có                                 |
| **Link ApplicationDetail**        | ❌ Không                | ✅ Có                                 |
| **Kết quả lưu vào**               | Session + Booking       | Session + Booking + ApplicationDetail |

---

## CODE REFERENCE

### Key Files

| File                                     | Mô tả                           |
| ---------------------------------------- | ------------------------------- |
| `RoundType.java:9`                       | Enum `MENTROR_REVIEW` (có typo) |
| `MentorInterviewDto.java`                | Config cho vòng mentor          |
| `ApplicationServiceImpl.java:79-95`      | Tự động tạo ApplicationDetail   |
| `MentorInterviewBookingServiceImpl.java` | Luồng pick slot, assign, enter  |
| `SessionServiceImpl.java`                | Tạo session, join, leave        |
| `MentorReviewServiceImpl.java`           | Tạo review, tính score          |
| `MentorInterviewBooking.java`            | Entity booking                  |
| `Session.java`                           | Entity session                  |
| `MentorReview.java`                      | Entity review                   |
| `ApplicationDetail.java`                 | Entity application detail       |

### Key Enums

| Enum                      | Giá trị                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `RoundType`               | CV_SCREENING, EMAIL_SIMULATOR, QUIZ, CODING, CODE_REVIEW, **MENTROR_REVIEW**, AI_INTERVIEW |
| `BookingStatus`           | AWAITING_MENTOR, ROOM_CREATED, IN_PROGRESS, COMPLETED, CANCELLED                           |
| `SessionStatus`           | DRAFT, SCHEDULED, ONGOING, COMPLETED, CANCELED                                             |
| `ApplicationDetailStatus` | PENDING, SLOT_PICKED, SUBMITTED, AI_EVALUATED, COMPLETED, ERROR                            |

---

## CÁC BUG/GAP TRONG BACKEND

### Bug 1: Typo trong RoundType

**File:** `src/main/java/fpt/org/inblue/enums/RoundType.java:9`

```java
MENTROR_REVIEW  // TYPO: 2 chữ "R" liền nhau
```

**Nên sửa thành:** `MENTOR_REVIEW`

### Bug 2: BookingStatus.MENTOR_ASSIGNED không được sử dụng

Enum có `MENTOR_ASSIGNED` nhưng code set `ROOM_CREATED` trực tiếp.

### Bug 3: Session không có trường applicationDetailId

Session entity không có link trực tiếp đến ApplicationDetail. Link thông qua Booking.

---

## CHECKLIST FRONTEND IMPLEMENTATION

### Student (Ứng viên)

- [ ] **Xem Applications:** GET /api/applications/me
- [ ] **Xem Details:** GET /api/application-details/application/{id}
- [ ] **Kiểm tra Round:** Nếu `roundType === 'MENTROR_REVIEW'` → Mentor Interview flow
- [ ] **Xem Kiosks:** GET /api/kiosks
- [ ] **Xem Slots:** GET /api/kiosks/{id}/slots?date=YYYY-MM-DD
- [ ] **Chọn Slot:** POST /api/mentor-bookings/pick-slot
- [ ] **Vào Phòng:** POST /api/kiosk/enter
- [ ] **Join Meeting:** POST /api/sessions/join-session
- [ ] **Đánh giá Mentor:** POST /api/mentor-reviews
- [ ] **Xem kết quả:** GET /api/application-details/{id}

### Admin

- [ ] **Xem Bookings:** GET /api/admin/mentor-bookings?status=AWAITING_MENTOR
- [ ] **Xem Mentors:** GET /api/mentors
- [ ] **Gán Mentor:** POST /api/admin/mentor-bookings/{id}/assign-mentor
- [ ] **Quản lý Kiosks:** CRUD /api/kiosks
- [ ] **Quản lý Lịch:** CRUD /api/kiosks/schedule

### Mentor

- [ ] **Xem Bookings:** GET /api/admin/mentor-bookings?mentorId={id}
- [ ] **Vào Phòng:** POST /api/kiosk/enter
- [ ] **Join Meeting:** POST /api/sessions/join-session

---

## TIMELINE & NOTIFICATIONS

| Thời điểm         | Sự kiện                                   | Notification                           |
| ----------------- | ----------------------------------------- | -------------------------------------- |
| Xong vòng trước   | `moveToNextRound()` tạo ApplicationDetail | "Bạn đã đến vòng Mentor Interview"     |
| Sau pick slot     | Student chọn slot                         | -                                      |
| Sau assign mentor | Admin gán mentor                          | "Mentor đã được gán. Session key: xxx" |
| Khi vào phòng     | `enterKiosk()`                            | -                                      |
| Khi rời phòng     | Daily.co webhook                          | -                                      |
| Sau review        | `mentorReview()`                          | "Cảm ơn bạn đã đánh giá"               |

---

**Tài liệu tạo:** 2026-07-11  
**Backend Developer:** Kdz198
