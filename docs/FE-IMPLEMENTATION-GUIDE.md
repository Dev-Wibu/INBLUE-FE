# Hướng dẫn Tích hợp Frontend (FE) - Luồng Kiosk Scheduling & Mentor Interview

Tài liệu này mô tả chi tiết tất cả API Endpoint, Request Body, Response mẫu, và **các điều kiện ràng buộc (validation rules)** từ phía backend để FE tích hợp đúng 100%.

---

## TỔNG QUAN LUỒNG DỮ LIỆU

```
Ứng viên chọn Kiosk → Chọn Slot → Tạo Booking (AWAITING_MENTOR)
       ↓
Admin duyệt danh sách Booking chờ → Gán Mentor → Tự động tạo Phòng Daily.co + Gửi Notification cho Ứng viên
       ↓
Ứng viên đến Kiosk vật lý → Nhập sessionKey → Nhận roomUrl → Vào phòng Daily.co
       ↓
Ứng viên & Mentor tham gia → FE gọi join-session → Daily.co webhook ghi nhận leave → Session hoàn tất
```

---

## CÁC TRẠNG THÁI (STATUS) TRONG HỆ THỐNG

### `BookingStatus` (trạng thái của lịch phỏng vấn)

| Giá trị | Ý nghĩa | Ghi chú |
|---|---|---|
| `AWAITING_MENTOR` | Đã đặt lịch, đang chờ Admin gán Mentor | |
| `MENTOR_ASSIGNED` | **Đã gán Mentor** | Hiện **KHÔNG được sử dụng** trong code |
| `ROOM_CREATED` | Đã tạo phòng Daily.co, đã gửi notification | |
| `IN_PROGRESS` | Ứng viên đã xác thực tại Kiosk | |
| `COMPLETED` | Cuộc họp kết thúc (cả 2 người đã rời phòng) | |
| `CANCELLED` | Đã hủy | |

### `ApplicationDetailStatus` (trạng thái vòng thi tuyển dụng)

| Giá trị | Ý nghĩa |
|---|---|
| `PENDING` | Ứng viên đang làm bài |
| `SLOT_PICKED` | Ứng viên đã chọn slot, đang chờ phỏng vấn / gán mentor |
| `SUBMITTED` | Đã nộp bài, hệ thống đang gọi AI |
| `AI_EVALUATED` | AI đã chấm điểm xong, đang chờ HR duyệt |
| `COMPLETED` | HR đã chốt kết quả |
| `ERROR` | Lỗi gọi AI |

---

## BƯỚC 1: Admin tạo Kiosk vật lý

**Quyền:** Admin

**API URL:** `POST /api/kiosks`

**Request Body:**

```json
{
  "name": "Kiosk A - Phòng 101",
  "location": "Tầng 1 - Khu A",
  "isActive": true
}
```

**Response mẫu (HTTP 200):**

```json
{
  "id": 1,
  "name": "Kiosk A - Phòng 101",
  "location": "Tầng 1 - Khu A",
  "isActive": true,
  "createdAt": "2026-07-08T10:30:00"
}
```

**Validation phía Backend:**
- `name` và `location`: Không được null hoặc empty.
- Không có ràng buộc unique trên name/location.

---

## BƯỚC 2: Admin thiết lập lịch làm việc định kỳ của Kiosk

**Quyền:** Admin

**API URL:** `POST /api/kiosks/schedule`

**Request Body:**

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

- `dayOfWeek`: Giá trị enum Java `DayOfWeek` - dùng string như `"MONDAY"`, `"TUESDAY"`, `"WEDNESDAY"`, `"THURSDAY"`, `"FRIDAY"`, `"SATURDAY"`, `"SUNDAY"`.
- `openTime` / `closeTime`: Format `HH:mm:ss` (LocalTime).
- `slotDurationMinutes`: Số phút cho mỗi slot (ví dụ: 45 phút).
- **Tự động cộng thêm 15 phút nghỉ** giữa các slot ở phía backend.

**Validation phía Backend:**
- `kioskId` phải tồn tại trong bảng `Kiosk`. Trả về `404 NOT_FOUND` nếu không tìm thấy.

**Response mẫu (HTTP 200):**

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

---

## BƯỚC 3: Hiển thị các Slots còn trống cho Ứng viên

### 3.1. Lấy danh sách các Kiosk đang hoạt động

**Quyền:** Công khai

**API URL:** `GET /api/kiosks`

**Response mẫu (HTTP 200):**

```json
[
  {
    "id": 1,
    "name": "Kiosk A - Phòng 101",
    "location": "Tầng 1 - Khu A",
    "isActive": true,
    "createdAt": "2026-07-08T10:30:00"
  },
  {
    "id": 2,
    "name": "Kiosk B - Phòng 202",
    "location": "Tầng 2 - Khu B",
    "isActive": true,
    "createdAt": "2026-07-08T10:31:00"
  }
]
```

### 3.2. Lấy danh sách Slots trống theo ngày

**Quyền:** Công khai

**API URL:** `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`

- Thay `{kioskId}` bằng ID thực tế của Kiosk.
- Format ngày: `YYYY-MM-DD` (ISO, ví dụ: `2026-07-10`).

**Validation phía Backend:**
- `kioskId` phải tồn tại. Trả về `404 NOT FOUND` nếu không tìm thấy.
- Nếu ngày đó Kiosk không có lịch hoạt động (không có `KioskSchedule` cho `dayOfWeek` tương ứng), trả về **mảng rỗng `[]`**.

**Response mẫu (HTTP 200):**

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

**Logic tính Slots (phía Backend):**

1. Đọc `KioskSchedule` của Kiosk cho thứ trong ngày (`dayOfWeek`).
2. Tạo slot từ `openTime`, mỗi slot kéo dài `slotDurationMinutes` phút.
3. **Tự động cộng thêm 15 phút nghỉ** giữa các slot: `current = current.plusMinutes(duration + 15)`.
4. Vòng lặp dừng khi `current + duration > closeTime`.
5. Slot `available = false` nếu thời gian slot **chồng chéo** với bất kỳ `MentorInterviewBooking` nào của Kiosk đó trong ngày (trừ status `CANCELLED`).

---

## BƯỚC 4: Ứng viên đặt lịch (Book Slot)

**Quyền:** Ứng viên (đã đăng nhập, lấy userId từ JWT token)

**API URL:** `POST /api/mentor-bookings/pick-slot`

**Request Body:**

```json
{
  "applicationDetailId": 12,
  "kioskId": 1,
  "scheduledStart": "2026-07-10T10:00:00",
  "scheduledEnd": "2026-07-10T10:45:00"
}
```

**Validation phía Backend (nhiều bước, rất quan trọng):**

| # | Điều kiện | HTTP Status khi lỗi |
|---|---|---|
| 1 | `applicationDetailId` phải tồn tại trong bảng `ApplicationDetail` | `404 NOT FOUND` |
| 2 | `kioskId` phải tồn tại trong bảng `Kiosk` | `404 NOT FOUND` |
| 3 | Slot không được trùng với booking đã tồn tại của Kiosk đó (trừ `CANCELLED`) | `409 CONFLICT` ("Selected slot is already booked") |

> **FE cần xử lý:** Luôn fetch lại danh sách slots ở Bước 3.2 trước khi gửi request pick-slot để tránh race condition (2 người cùng chọn 1 slot).

**Những gì xảy ra phía Backend khi thành công:**

1. Tạo `MentorInterviewBooking` mới với `status = AWAITING_MENTOR`.
2. Cập nhật `ApplicationDetail.bookingId = booking.id` (chỉ gán bookingId, **KHÔNG thay đổi status** của ApplicationDetail).
3. Trả về booking đã tạo.

**Response mẫu (HTTP 200):**

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

---

## BƯỚC 5: Admin duyệt và gán Mentor

**Quyền:** Admin (lấy thông tin từ SecurityContext - không cần truyền thêm)

### 5.1. Lấy danh sách Booking đang chờ gán Mentor

**API URL:** `GET /api/admin/mentor-bookings`

- Mặc định lọc theo `status = AWAITING_MENTOR`.
- Admin có thể thay đổi filter bằng query param: `GET /api/admin/mentor-bookings?status=ROOM_CREATED`

**Response mẫu (HTTP 200):**

```json
[
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
]
```

### 5.2. Gán Mentor cho Booking

**API URL:** `POST /api/admin/mentor-bookings/{bookingId}/assign-mentor`

**Request Body:**

```json
{
  "mentorId": 5,
  "notes": "Phỏng vấn chuyên môn React & Spring Boot"
}
```

> **Lưu ý quan trọng nhất:** `mentorId` là kiểu `int` (primitive). Nếu gửi `null` hoặc bỏ trống sẽ gây lỗi HTTP 400 hoặc 500 tùy cách gửi.

**Validation phía Backend (4 bước tuần tự):**

| # | Điều kiện | HTTP Status | Message |
|---|---|---|---|
| 1 | `bookingId` tồn tại | `404 NOT FOUND` | "Booking not found" |
| 2 | Booking phải có `status = AWAITING_MENTOR` | `400 BAD_REQUEST` | "Booking is not in AWAITING_MENTOR status" |
| 3 | Mentor không có booking trùng giờ (trừ `CANCELLED`) | `409 CONFLICT` | "Mentor has another interview booking at this time" |
| 4 | Gọi Daily.co tạo phòng phải thành công | `500 INTERNAL_SERVER_ERROR` | "Error creating Daily.co session: ..." |

**Những gì xảy ra phía Backend khi thành công (9 bước):**

```
1. Tạo Session trên Daily.co
   - Tên phòng: "session-" + timestamp (VD: "session-1752012345678")
   - privacy: "public"
   - max_participants: 2
   - start_video_off: true
   - start_audio_off: true
   - enable_screenshare: true
   - enable_recording: "cloud"
   - exp = scheduledEnd epoch + 3600 giây (1 giờ sau giờ kết thúc)

2. Lưu Session vào DB với status = DRAFT

3. Cập nhật Session: sessionKey = UUID.randomUUID(), kioskId, status = SCHEDULED

4. Cập nhật Booking: mentorId, sessionId, sessionKey, status = ROOM_CREATED, notes

5. Cập nhật ApplicationDetail: sessionId = session.id, status = SLOT_PICKED

6. Gửi Notification cho Ứng viên (async, không block)
```

**Response mẫu (HTTP 200):**

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

**Notification được gửi cho Ứng viên:**
- Title: `"Lịch phỏng vấn Mentor Interview"`
- Message: `"Bạn đã được xếp lịch phỏng vấn tại Kiosk {kioskId} vào lúc {scheduledStart}. Session Key để vào phòng là: {sessionKey}"`

---

## BƯỚC 6: Ứng viên xác thực tại Kiosk vật lý để lấy link phòng

**Quyền:** Ứng viên (hoặc người bất kỳ đứng trước máy Kiosk)

**API URL:** `POST /api/kiosk/enter`

**Request Body:**

```json
{
  "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
  "kioskId": 1
}
```

**Validation phía Backend (5 bước tuần tự):**

| # | Điều kiện | HTTP Status | Message |
|---|---|---|---|
| 1 | `sessionKey` phải tồn tại trong bảng Session | `400 BAD_REQUEST` | "Invalid session key" |
| 2 | `sessionKey` phải có booking tương ứng | `404 NOT FOUND` | "Booking not found for this session key" |
| 3 | Booking không được `CANCELLED` | `400 BAD_REQUEST` | "Booking has been cancelled" |
| 4 | `kioskId` phải khớp với `booking.kioskId` | `400 BAD_REQUEST` | "Session key is registered for Kiosk {booking.kioskId}" |
| 5 | Thời gian hiện tại phải trong khoảng **±15 phút** so với `scheduledStart` | `400 BAD_REQUEST` | "You can only enter the Kiosk within 15 minutes of your scheduled start time ({scheduledStart})" |

**Những gì xảy ra phía Backend khi thành công:**

1. Cập nhật `Session.status = ONGOING`, `Session.startTime1 = now`.
2. Cập nhật `Booking.status = IN_PROGRESS`.
3. Trả về `roomUrl`.

**Response mẫu (HTTP 200):**

```json
{
  "roomUrl": "https://inblue.daily.co/session-1752012345678"
}
```

> **Hành động của FE:** FE lấy `roomUrl` và nhúng vào Daily.co iframe để ứng viên tham gia cuộc họp. FE nên hiển thị thông báo lỗi rõ ràng nếu thời gian không trong ±15 phút.

---

## BƯỚC 7: Ghi nhận người dùng tham gia phòng họp (Join Record)

**Quyền:** Ứng viên hoặc Mentor

**API URL:** `POST /api/sessions/join-session`

**Khi nào gọi:** Khi FE bắt được sự kiện participant tham gia thành công vào Daily.co room. Thông tin `participantId` và `sessionName` (roomName) lấy từ event của Daily.co SDK.

**Request Body:**

```json
{
  "sessionName": "session-1752012345678",
  "userId": 7,
  "participantId": "p_abc123xyz",
  "isMentor": false
}
```

- `sessionName`: Là `roomName` của phòng (trả về trong `Session.roomName`, ví dụ: `"session-1752012345678"`).
- `isMentor = false`: Ứng viên tham gia.
- `isMentor = true`: Mentor tham gia.

**Validation phía Backend:**

| # | Điều kiện | HTTP Status | Message |
|---|---|---|---|
| 1 | `sessionName` phải tồn tại trong bảng Session | `404 NOT FOUND` | "Không tìm thấy phòng họp !!" |
| 2 | Session không được ở trạng thái `DRAFT` | `409 CONFLICT` | "Phòng họp chưa được duyệt" |
| 3 | Nếu `isMentor = true`: `userId` phải khớp với `session.userId2` (mentor ID) | `403 FORBIDDEN` | "Mentor ID không khớp với Session" |
| 4 | Nếu `isMentor = false`: `userId` phải khớp với `session.userId` (ứng viên ID) | `403 FORBIDDEN` | "User ID không khớp với Session" |

**Những gì xảy ra phía Backend:**

- Nếu là **ứng viên** (`isMentor = false`):
  - `session.participantId1 = participantId`
  - `session.status = ONGOING` (nếu chưa)
  - `session.startTime1 = now` (nếu chưa có)
- Nếu là **Mentor** (`isMentor = true`):
  - `session.participantId2 = participantId`
  - `session.startTime2 = now` (nếu chưa có)

**Response:** `HTTP 200` (Empty body, chỉ cần kiểm tra status code)

---

## BƯỚC 8: Khi người dùng rời phòng (Daily.co Webhook)

**Quyền:** Backend nhận webhook từ Daily.co (không cần auth)

**API URL:** `POST /api/sessions/webhooks/dailyco`

**Trigger:** Khi Daily.co phát sự kiện `participant.left`.

**Logic phía Backend:**
- Tìm Session theo `roomName` trong payload.
- Ghi nhận `endTime` và `durationSeconds` cho người vừa rời.
- **Nếu cả 2 người đều đã rời** (cả `endTime1` và `endTime2` đều khác null): `session.status = COMPLETED`, đồng thời publish event `FeatureUsageLogDto` để tính phí sử dụng tính năng `MENTOR_INTERVIEW`.

**FE không cần gọi API này** - đây là webhook server-to-server từ Daily.co.

---

## BƯỚC 9: Ứng viên hủy / đổi lịch phỏng vấn

**Quyền:** Ứng viên sở hữu booking, hoặc Admin/Staff

**API URL:** `DELETE /api/mentor-bookings/{bookingId}`

**Validation phía Backend:**

| # | Điều kiện | HTTP Status |
|---|---|---|
| 1 | Booking tồn tại | `404 NOT FOUND` |
| 2 | Nếu gọi bởi ứng viên: `applicantUserId` phải khớp với userId từ JWT | `401 UNAUTHORIZED` |
| 3 | Nếu gọi bởi người khác: phải có role ADMIN hoặc STAFF | `401 UNAUTHORIZED` |
| 4 | Booking không được `COMPLETED` hoặc `CANCELLED` | `400 BAD_REQUEST` |

**Những gì xảy ra phía Backend khi thành công:**

1. Nếu có `sessionId`: cập nhật `Session.status = CANCELED`, xóa phòng trên Daily.co.
2. Cập nhật `Booking.status = CANCELLED`.
3. Cập nhật `ApplicationDetail`: `status = PENDING`, `bookingId = null`, `sessionId = null`.

> **FE cần lưu ý:** Sau khi hủy, ứng viên có thể quay lại Bước 3 để chọn slot mới (ApplicationDetail đã được reset về `PENDING`).

**Response:** `HTTP 200` (Empty body)

---

## TÓM TẮT DANH SÁCH API ĐẦY ĐỦ

| # | Phương thức | URL | Quyền | Mô tả |
|---|---|---|---|---|
| 1 | `POST` | `/api/kiosks` | Admin | Tạo Kiosk |
| 2 | `GET` | `/api/kiosks` | Công khai | Lấy danh sách Kiosk hoạt động |
| 3 | `POST` | `/api/kiosks/schedule` | Admin | Tạo lịch hoạt động của Kiosk |
| 4 | `GET` | `/api/kiosks/{kioskId}/slots?date=YYYY-MM-DD` | Công khai | Lấy slots trống |
| 5 | `POST` | `/api/mentor-bookings/pick-slot` | Ứng viên | Đặt lịch phỏng vấn |
| 6 | `GET` | `/api/admin/mentor-bookings` | Admin | Lấy danh sách booking theo status |
| 7 | `POST` | `/api/admin/mentor-bookings/{bookingId}/assign-mentor` | Admin | Gán Mentor & tạo phòng |
| 8 | `DELETE` | `/api/mentor-bookings/{bookingId}` | Ứng viên / Admin | Hủy / đổi lịch |
| 9 | `POST` | `/api/kiosk/enter` | Công khai | Xác thực tại Kiosk, lấy roomUrl |
| 10 | `POST` | `/api/sessions/join-session` | Ứng viên / Mentor | Ghi nhận tham gia phòng |
| 11 | `POST` | `/api/sessions/webhooks/dailyco` | Daily.co webhook | Xử lý sự kiện rời phòng |

---

## CÁC LỖI THƯỜNG GẶP VÀ CÁCH XỬ LÝ

### Lỗi 1: `Booking is not in AWAITING_MENTOR status` (HTTP 400)

**Nguyên nhân:** Booking đã được assign mentor rồi (`status` đã là `ROOM_CREATED` hoặc cao hơn).

**Cách xử lý:**
- FE Admin: Refresh lại danh sách booking. Nếu booking đã chuyển sang `ROOM_CREATED`, tức là đã được assign trước đó bởi người khác.

### Lỗi 2: `Selected slot is already booked` (HTTP 409)

**Nguyên nhân:** Slot đã bị đặt bởi ứng viên khác (race condition).

**Cách xử lý:**
- FE: Luôn fetch lại slots trước khi hiển thị cho ứng viên. Khi ứng viên bấm đặt, hiển thị loading và disable nút. Nếu lỗi, hiển thị thông báo "Slot này vừa được đặt, vui lòng chọn slot khác" và fetch lại slots.

### Lỗi 3: `Mentor has another interview booking at this time` (HTTP 409)

**Nguyên nhân:** Mentor đã có booking khác trùng giờ (trừ các booking đã `CANCELLED`).

**Cách xử lý:**
- FE Admin: Hiển thị thông báo và đề xuất chọn mentor khác hoặc thời gian khác.

### Lỗi 4: `You can only enter the Kiosk within 15 minutes of your scheduled start time` (HTTP 400)

**Nguyên nhân:** Ứng viên đến sớm hơn 15 phút hoặc muộn hơn 15 phút so với giờ hẹn.

**Cách xử lý:**
- FE Kiosk: Hiển thị đồng hồ đếm ngược và giới hạn thời gian vào. Ví dụ: "Vui lòng đợi đến khi còn X phút nữa" hoặc "Bạn đã đến muộn, không thể vào phòng".

---

## BẢNG TRẠNG THÁI QUAN HỆ GIỮA CÁC BẢNG

| Stage | `MentorInterviewBooking.status` | `ApplicationDetail.status` | `Session.status` |
|---|---|---|---|
| `pickSlot` thành công | `AWAITING_MENTOR` | (unchanged) | n/a |
| `assignMentor` thành công | `ROOM_CREATED` | `SLOT_PICKED` | `SCHEDULED` |
| `enterKiosk` thành công | `IN_PROGRESS` | (unchanged) | `ONGOING` |
| Cả 2 người rời phòng | (unchanged) | (unchanged) | `COMPLETED` |
| `cancelBooking` | `CANCELLED` | `PENDING` | `CANCELED` + phòng Daily.co bị xóa |

---

## VỀ DAILY.CO EXPIRATION

| Giá trị `exp` | Ý nghĩa |
|---|---|
| `scheduledEnd epoch + 3600` | Phòng hết hạn 1 giờ sau giờ kết thúc dự kiến |

**Logic tính exp (trong `SessionServiceImpl.createSession`):**
```
exp = joinTime epoch + 3600 giây
```
Trong đó `joinTime` = `scheduledStart` (thời gian bắt đầu phỏng vấn) theo múi giờ Asia/Ho_Chi_Minh.

**FE cần lưu ý:** Phòng Daily.co sẽ tự động hết hạn sau 1 giờ tính từ thời điểm kết thúc slot. Nếu cuộc họp kéo dài quá, phòng vẫn hoạt động bình thường nhưng sẽ không thể tạo link mới sau khi exp.

---

## CÁC ENDPOINT HỖ TRỢ KHÁC (Admin)

### Cập nhật thông tin Kiosk

**API URL:** `PUT /api/kiosks/{id}`

```json
{
  "name": "Kiosk A - Phòng 101 (Đã nâng cấp)",
  "location": "Tầng 2 - Khu A",
  "isActive": true
}
```

### Lấy lịch hoạt động của Kiosk

**API URL:** `GET /api/kiosks/{kioskId}/schedules`

**Response mẫu:**
```json
[
  {
    "id": 1,
    "kioskId": 1,
    "dayOfWeek": "MONDAY",
    "openTime": "08:00:00",
    "closeTime": "17:00:00",
    "slotDurationMinutes": 45,
    "isActive": true
  }
]
```

### Cập nhật lịch hoạt động của Kiosk

**API URL:** `PUT /api/kiosks/schedule/{id}`

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
