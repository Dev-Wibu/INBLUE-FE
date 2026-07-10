# Frontend API Guide — Luồng tạo Kiosk & Lịch Kiosk (Inblue Backend)

> File này là **tài liệu duy nhất** dành cho AI Front-end để tự động code 100% UI/UX cho luồng **Tạo Kiosk** và **Tạo Lịch (Schedule) cho Kiosk**. Mọi endpoint, request body, response body, enum, status, error đều được mô tả chính xác theo code backend `master` mới nhất.
>
> **Repo:** https://github.com/Kdz198/Inblue
> **Base URL (mặc định):** `http://localhost:8080` (dev) hoặc `https://api.kdz.asia` (prod)
> **Auth:** JWT Bearer Token (trừ các endpoint `/api/auth/**`, `/api/kiosks/**`, `/api/mentors`, `/api/users`, `/api/job-descriptions`, `/api/rounds`, `/api/companies`, `/api/posts`, `/api/payments/webhook/**` — xem chi tiết trong mục "Phân quyền").

---

## 0. Quy ước chung cho mọi API call

### 0.1. Header bắt buộc

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>      # Bắt buộc cho hầu hết API trừ permitAll
Accept: application/json
```

### 0.2. Format response thành công (do `SuccessResponseHandler` bọc lại)

Mọi response 2xx từ controller package `fpt.org.inblue.controller` sẽ được **bọc thêm `traceId`**.

- Nếu backend trả về **1 object** → response thành các field của object + 1 field `traceId` ở root:
  ```json
  {
    "id": 1,
    "name": "Kiosk A",
    "traceId": "abc-xyz-123"
  }
  ```
- Nếu backend trả về **List/Array** → response được bọc thành `{ traceId, data: [...] }`:
  ```json
  {
    "traceId": "abc-xyz-123",
    "data": [
      { "id": 1, "name": "Kiosk A" },
      { "id": 2, "name": "Kiosk B" }
    ]
  }
  ```
- String thuần / bytes → **không bọc**, trả về nguyên xi.

> ⚠️ Frontend **PHẢI** biết cách unwrap: với List thì đọc `.data`, với object thì đọc trực tiếp các field (kèm có `traceId` thừa).

### 0.3. Format response lỗi (do `GlobalExceptionHandler` trả về)

```json
{
  "error": "Mô tả lỗi bằng tiếng Anh / tiếng Việt",
  "traceId": "abc-xyz-123"
}
```

| HTTP Status               | Khi nào xảy ra                                                  |
| ------------------------- | --------------------------------------------------------------- |
| 400 BAD_REQUEST           | Validation fail, trùng slot, status không hợp lệ, sai thời gian |
| 401 UNAUTHORIZED          | Thiếu/không hợp lệ JWT, hoặc user gọi nhầm endpoint cần auth    |
| 403 FORBIDDEN             | User không đủ quyền (vd: USER gọi API admin)                    |
| 404 NOT_FOUND             | Không tìm thấy Kiosk / KioskSchedule / Booking theo id          |
| 409 CONFLICT              | Slot bị đặt, hoặc Mentor bị trùng lịch                          |
| 500 INTERNAL_SERVER_ERROR | Lỗi hệ thống (gọi Daily.co thất bại, …)                         |

### 0.4. Định dạng dữ liệu

- `LocalDate` (chỉ ngày): `yyyy-MM-dd` (vd: `2026-07-15`)
- `LocalTime` (chỉ giờ): `HH:mm:ss` hoặc `HH:mm` (vd: `09:00:00` hoặc `09:00`)
- `LocalDateTime` (ngày + giờ): `yyyy-MM-ddTHH:mm:ss` (vd: `2026-07-15T09:00:00`)
- `DayOfWeek` enum (gửi lên cho schedule): `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`
- `BookingStatus` enum: `AWAITING_MENTOR` | `MENTOR_ASSIGNED` | `ROOM_CREATED` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
- `Role` enum: `USER` | `MENTOR` | `STAFF` | `ADMIN`

### 0.5. Phân quyền (từ `SecurityConfig.java`)

| Endpoint                             | Cần auth?                      | Role tối thiểu              |
| ------------------------------------ | ------------------------------ | --------------------------- |
| `/api/auth/**`                       | ❌ Public                      | —                           |
| `/api/kiosks/**` (xem/sửa kiosk)     | ❌ Public (chưa có rule riêng) | —                           |
| `/api/mentors` (GET)                 | ❌ Public                      | —                           |
| `/api/mentor-bookings/pick-slot`     | ✅ Cần JWT                     | USER (lấy từ token)         |
| `/api/mentor-bookings/{id}` (DELETE) | ✅ Cần JWT                     | USER sở hữu / ADMIN / STAFF |
| `/api/admin/mentor-bookings/**`      | ✅ Cần JWT                     | ADMIN / STAFF               |
| `/api/kiosk/enter`                   | ❌ Public (kiosk vật lý)       | —                           |
| `/api/applications/me`               | ✅ Cần JWT                     | USER                        |
| `/api/application-details/**`        | ✅ Cần JWT                     | tuỳ endpoint                |

> Lưu ý thực tế: cấu hình hiện tại có `.anyRequest().permitAll()` nên về mặt kỹ thuật mọi API đều truy cập được nếu bỏ qua JWT, nhưng **CẦN gửi JWT** cho các endpoint yêu cầu `getCurrentUserId()` (vì nếu không có, server sẽ throw `Unauthorized` 401).

---

## 1. Tổng quan luồng tạo Kiosk & Lịch Kiosk

### 1.1. Sơ đồ tổng quan

```
┌──────────────────────────────────────────────────────────────────┐
│                    ADMIN TẠO KIOSK                              │
│  POST /api/kiosks          → tạo máy trạm vật lý                │
│  GET  /api/kiosks          → lấy danh sách kiosk đang active    │
│  PUT  /api/kiosks/{id}     → cập nhật tên / vị trí / trạng thái │
│                                                                  │
│              ↓ Sau khi có kiosk, ADMIN TẠO LỊCH                 │
│  POST /api/kiosks/schedule     → tạo lịch theo thứ             │
│  GET  /api/kiosks/{id}/schedules → lấy danh sách lịch         │
│  PUT  /api/kiosks/schedule/{id} → cập nhật lịch                │
│                                                                  │
│                  ↓ Sau đó ỨNG VIÊN dùng                         │
│  GET  /api/kiosks/{id}/slots?date=YYYY-MM-DD → lấy slot trống  │
│  POST /api/mentor-bookings/pick-slot  → đặt lịch               │
│  POST /api/kiosk/enter               → kiosk xác thực sessionKey│
└──────────────────────────────────────────────────────────────────┘
```

### 1.2. Thứ tự gọi API bắt buộc

1. **Bước 1 (Admin)**: Tạo Kiosk → `POST /api/kiosks`
2. **Bước 2 (Admin)**: Tạo Schedule cho Kiosk đó → `POST /api/kiosks/schedule`
3. **Bước 3 (Ứng viên)**: Lấy danh sách kiosk active → `GET /api/kiosks`
4. **Bước 4 (Ứng viên)**: Chọn kiosk + ngày → `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`
5. **Bước 5 (Ứng viên)**: Chọn 1 slot trống → `POST /api/mentor-bookings/pick-slot`
6. **Bước 6 (Admin)**: Gán mentor cho booking → `POST /api/admin/mentor-bookings/{id}/assign-mentor`
7. **Bước 7 (Ứng viên)**: Nhận notification có `sessionKey` (qua polling `GET /api/notifications/{userId}`)
8. **Bước 8 (Kiosk vật lý)**: Khi ứng viên đến kiosk, nhập `sessionKey` → `POST /api/kiosk/enter` → trả về `roomUrl` (link Daily.co) để vào phòng.

---

## 2. Model / Enum dùng chung

### 2.1. `Kiosk` (entity + response trả về)

```json
{
  "id": 1,
  "name": "Kiosk A - Tầng 1",
  "location": "FPT Software, Tầng 1, Tòa nhà A",
  "isActive": true,
  "createdAt": "2026-07-10T09:00:00"
}
```

| Field       | Type          | Bắt buộc khi POST/PUT? | Mô tả                                   |
| ----------- | ------------- | ---------------------- | --------------------------------------- |
| `id`        | Long          | Tự sinh                | ID tự tăng, bỏ qua khi tạo              |
| `name`      | String        | ✅ Có                  | Tên kiosk                               |
| `location`  | String        | ✅ Có                  | Vị trí đặt máy                          |
| `isActive`  | boolean       | ✅ Có                  | true = đang hoạt động, false = tạm dừng |
| `createdAt` | LocalDateTime | Tự sinh                | Thời gian tạo                           |

### 2.2. `KioskSchedule` (entity + response)

```json
{
  "id": 1,
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "09:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 60,
  "isActive": true,
  "createdAt": "2026-07-10T09:00:00"
}
```

| Field                 | Type                   | Bắt buộc? | Mô tả                                   |
| --------------------- | ---------------------- | --------- | --------------------------------------- |
| `id`                  | Long                   | Tự sinh   | ID tự tăng                              |
| `kioskId`             | Long                   | ✅ Có     | ID của kiosk (phải tồn tại)             |
| `dayOfWeek`           | `DayOfWeek` enum       | ✅ Có     | `MONDAY`..`SUNDAY`                      |
| `openTime`            | LocalTime (`HH:mm:ss`) | ✅ Có     | Giờ mở cửa                              |
| `closeTime`           | LocalTime              | ✅ Có     | Giờ đóng cửa                            |
| `slotDurationMinutes` | int                    | ✅ Có     | Độ dài 1 slot (phút) — ví dụ 30, 45, 60 |
| `isActive`            | boolean                | ✅ Có     | Lịch còn hiệu lực hay không             |
| `createdAt`           | LocalDateTime          | Tự sinh   | Thời gian tạo                           |

> ⚠️ Logic backend: trong `KioskServiceImpl.getAvailableSlots`, giữa 2 slot liên tiếp sẽ tự động có **15 phút nghỉ** (`current.plusMinutes(duration + 15)`). Frontend **KHÔNG cần tự thêm 15 phút nghỉ** — server đã lo.

### 2.3. `SlotDto` (response khi lấy slot trống)

```json
{
  "startTime": "2026-07-15T09:00:00",
  "endTime": "2026-07-15T10:00:00",
  "available": true
}
```

| Field       | Type          | Mô tả                                     |
| ----------- | ------------- | ----------------------------------------- |
| `startTime` | LocalDateTime | Giờ bắt đầu slot                          |
| `endTime`   | LocalDateTime | Giờ kết thúc slot                         |
| `available` | boolean       | true = còn trống, false = đã có người đặt |

### 2.4. `KioskEnterDtoRequest` (kiosk gửi khi xác thực)

```json
{
  "sessionKey": "550e8400-e29b-41d4-a716-446655440000",
  "kioskId": 1
}
```

### 2.5. `KioskEnterDtoResponse` (response trả về)

```json
{
  "roomUrl": "https://inblue.daily.co/abc-xyz-123"
}
```

### 2.6. `PickSlotDtoRequest` (ứng viên gửi khi đặt lịch)

```json
{
  "applicationDetailId": 10,
  "kioskId": 1,
  "scheduledStart": "2026-07-15T09:00:00",
  "scheduledEnd": "2026-07-15T10:00:00"
}
```

### 2.7. `MentorInterviewBooking` (response sau khi pickSlot thành công)

```json
{
  "id": 5,
  "applicationDetailId": 10,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-15T09:00:00",
  "scheduledEnd": "2026-07-15T10:00:00",
  "mentorId": null,
  "sessionId": null,
  "status": "AWAITING_MENTOR",
  "sessionKey": null,
  "notes": null,
  "createdAt": "2026-07-10T09:00:00",
  "updatedAt": "2026-07-10T09:00:00"
}
```

| Field        | Type            | Ý nghĩa theo trạng thái                                                             |
| ------------ | --------------- | ----------------------------------------------------------------------------------- |
| `status`     | `BookingStatus` | `AWAITING_MENTOR` → `ROOM_CREATED` → `IN_PROGRESS` → `COMPLETED` (hoặc `CANCELLED`) |
| `sessionKey` | String          | UUID, chỉ sinh sau khi admin assign mentor                                          |
| `sessionId`  | Integer         | ID bản ghi Session, sinh sau assign mentor                                          |
| `mentorId`   | Integer         | ID mentor, sinh sau assign mentor                                                   |

### 2.8. `AssignMentorDtoRequest`

```json
{
  "mentorId": 3,
  "notes": "Phỏng vấn vòng 2, tập trung vào system design"
}
```

---

## 3. CHI TIẾT ENDPOINT — LUỒNG TẠO KIOSK

### 3.1. `GET /api/kiosks` — Lấy danh sách kiosk đang hoạt động

**Ai dùng:** Public (Admin/Staff xem danh sách, Ứng viên xem để chọn)
**Auth:** ❌ Không bắt buộc
**Query:** Không có

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 1,
      "name": "Kiosk A",
      "location": "Tầng 1, Tòa A",
      "isActive": true,
      "createdAt": "2026-07-10T09:00:00"
    }
  ]
}
```

**Logic UI:** Lưu vào state, hiển thị dropdown / list card để user chọn.

---

### 3.2. `POST /api/kiosks` — Tạo Kiosk mới

**Ai dùng:** Admin
**Auth:** ❌ (nên gửi JWT nếu có để track)

**Request Body:**

```json
{
  "name": "Kiosk A - Tầng 1",
  "location": "FPT Software, Tầng 1, Tòa nhà A",
  "isActive": true
}
```

> Lưu ý: Field `isActive` dùng `boolean` (không phải `Boolean`), cần gửi đúng tên. Nếu dùng TypeScript:
>
> ```ts
> interface CreateKioskPayload {
>   name: string;
>   location: string;
>   isActive: boolean;
> }
> ```

**Response 200:**

```json
{
  "id": 1,
  "name": "Kiosk A - Tầng 1",
  "location": "FPT Software, Tầng 1, Tòa nhà A",
  "isActive": true,
  "createdAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi có thể gặp:**

- Không có lỗi validation cụ thể; chỉ fail nếu payload sai JSON.

---

### 3.3. `PUT /api/kiosks/{id}` — Cập nhật Kiosk

**Path param:** `id` (Long) — ID kiosk cần sửa
**Request Body:** (giống POST)

```json
{
  "name": "Kiosk A - Tầng 1 (đã đổi tên)",
  "location": "FPT Software, Tầng 1, Tòa nhà A",
  "isActive": false
}
```

**Response 200:**

```json
{
  "id": 1,
  "name": "Kiosk A - Tầng 1 (đã đổi tên)",
  "location": "FPT Software, Tầng 1, Tòa nhà A",
  "isActive": false,
  "createdAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi 404:** `"Kiosk not found with id: {id}"`

> ⚠️ Lưu ý: Backend **chỉ update** `name`, `location`, `isActive`. KHÔNG đụng vào `createdAt` và `id`.

---

## 4. CHI TIẾT ENDPOINT — LUỒNG TẠO LỊCH (SCHEDULE) CHO KIOSK

### 4.1. `POST /api/kiosks/schedule` — Tạo lịch hoạt động định kỳ

**Ai dùng:** Admin
**Auth:** ❌ (nên gửi JWT nếu có)

**Request Body:**

```json
{
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "09:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 60,
  "isActive": true
}
```

| Field                 | Kiểu TypeScript                            | Validate                                                                           |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `kioskId`             | `number`                                   | Phải tồn tại (ngược lại 404)                                                       |
| `dayOfWeek`           | `'MONDAY' \| 'TUESDAY' \| ... \| 'SUNDAY'` | Bắt buộc, đúng enum                                                                |
| `openTime`            | `string` (HH:mm:ss)                        | Bắt buộc, vd: `"09:00:00"`                                                         |
| `closeTime`           | `string` (HH:mm:ss)                        | Bắt buộc, **phải > openTime** (server không validate nhưng logic tạo slot sẽ rỗng) |
| `slotDurationMinutes` | `number`                                   | Bắt buộc, > 0                                                                      |
| `isActive`            | `boolean`                                  | Bắt buộc                                                                           |

**Response 200:**

```json
{
  "id": 1,
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "09:00:00",
  "closeTime": "17:00:00",
  "slotDurationMinutes": 60,
  "isActive": true,
  "createdAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi 404:** `"Kiosk not found with id: {kioskId}"` — phải tạo kiosk trước khi tạo schedule.

> 💡 Mẹo UI: Cho phép tạo nhiều schedule (1 cho mỗi thứ trong tuần). Server lấy schedule theo `dayOfWeek` tương ứng khi tính slot.

---

### 4.2. `GET /api/kiosks/{kioskId}/schedules` — Lấy danh sách lịch của 1 kiosk

**Path param:** `kioskId` (Long)

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 1,
      "kioskId": 1,
      "dayOfWeek": "MONDAY",
      "openTime": "09:00:00",
      "closeTime": "17:00:00",
      "slotDurationMinutes": 60,
      "isActive": true,
      "createdAt": "2026-07-10T09:00:00"
    },
    {
      "id": 2,
      "kioskId": 1,
      "dayOfWeek": "TUESDAY",
      "openTime": "09:00:00",
      "closeTime": "17:00:00",
      "slotDurationMinutes": 60,
      "isActive": true,
      "createdAt": "2026-07-10T09:00:00"
    }
  ]
}
```

---

### 4.3. `PUT /api/kiosks/schedule/{id}` — Cập nhật lịch

**Path param:** `id` (Long) — ID schedule
**Request Body:** (giống POST)

```json
{
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "08:00:00",
  "closeTime": "18:00:00",
  "slotDurationMinutes": 45,
  "isActive": true
}
```

**Response 200:**

```json
{
  "id": 1,
  "kioskId": 1,
  "dayOfWeek": "MONDAY",
  "openTime": "08:00:00",
  "closeTime": "18:00:00",
  "slotDurationMinutes": 45,
  "isActive": true,
  "createdAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi 404:** `"KioskSchedule not found with id: {id}"` hoặc `"Kiosk not found with id: {kioskId}"`

---

## 5. CHI TIẾT ENDPOINT — LUỒNG ỨNG VIÊN CHỌN SLOT (nối tiếp)

### 5.1. `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD` — Lấy slot trống

**Path param:** `kioskId` (Long)
**Query param:** `date` (LocalDate, bắt buộc, format `yyyy-MM-dd`)

**Ví dụ:**

```
GET /api/kiosks/1/slots?date=2026-07-15
```

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    { "startTime": "2026-07-15T09:00:00", "endTime": "2026-07-15T10:00:00", "available": true },
    { "startTime": "2026-07-15T10:15:00", "endTime": "2026-07-15T11:15:00", "available": true },
    { "startTime": "2026-07-15T11:30:00", "endTime": "2026-07-15T12:30:00", "available": false },
    { "startTime": "2026-07-15T13:45:00", "endTime": "2026-07-15T14:45:00", "available": true }
  ]
}
```

> ⚠️ **Quan trọng:** Server tự cộng `slotDurationMinutes + 15 phút nghỉ` giữa các slot. UI **chỉ cần hiển thị** `startTime` - `endTime` lấy từ server, **không tự tính**.

**Lỗi 404:** `"Kiosk not found with id: {kioskId}"` — Kiosk chưa tồn tại.
**Trả về rỗng (`data: []`):** nếu ngày đó không có schedule (`schedules.isEmpty()`).

---

### 5.2. `POST /api/mentor-bookings/pick-slot` — Ứng viên đặt slot

**Auth:** ✅ Cần JWT (lấy `userId` từ token)
**Request Body:**

```json
{
  "applicationDetailId": 10,
  "kioskId": 1,
  "scheduledStart": "2026-07-15T09:00:00",
  "scheduledEnd": "2026-07-15T10:00:00"
}
```

| Field                 | Bắt buộc | Mô tả                                                                               |
| --------------------- | -------- | ----------------------------------------------------------------------------------- |
| `applicationDetailId` | ✅       | Lấy từ `GET /api/applications/me` → `GET /api/application-details/application/{id}` |
| `kioskId`             | ✅       | ID kiosk                                                                            |
| `scheduledStart`      | ✅       | Lấy nguyên từ `SlotDto.startTime`                                                   |
| `scheduledEnd`        | ✅       | Lấy nguyên từ `SlotDto.endTime`                                                     |

**Response 200:**

```json
{
  "id": 5,
  "applicationDetailId": 10,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-15T09:00:00",
  "scheduledEnd": "2026-07-15T10:00:00",
  "mentorId": null,
  "sessionId": null,
  "status": "AWAITING_MENTOR",
  "sessionKey": null,
  "notes": null,
  "createdAt": "2026-07-10T09:00:00",
  "updatedAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi:**

- `404` `"ApplicationDetail not found"` — applicationDetailId sai
- `404` `"Kiosk not found"` — kioskId sai
- `409` `"Selected slot is already booked"` — có người vừa đặt trước (race condition)
- `401` `"Unauthorized"` — thiếu JWT

---

### 5.3. `GET /api/applications/me` — Lấy application của tôi (để lấy applicationDetailId)

**Auth:** ✅ Cần JWT

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 1,
      "userId": 7,
      "jdId": 3,
      "currentRoundOrder": 2,
      "status": "IN_PROGRESS",
      "overallScore": -1.0,
      "isDeleted": false,
      "createdAt": "2026-06-01T09:00:00",
      "updatedAt": "2026-07-10T09:00:00"
    }
  ]
}
```

### 5.4. `GET /api/application-details/application/{applicationId}` — Lấy các vòng thi

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 10,
      "applicationId": 1,
      "roundId": 5,
      "status": "PENDING",
      "finalScore": null,
      "aiScore": null,
      "hrScore": null,
      "hrNote": null,
      "finalResult": null,
      "sessionId": null,
      "bookingId": null,
      "startedAt": "2026-07-10T09:00:00",
      "completedAt": null
    }
  ]
}
```

> **Mẹo UI ứng viên:** Khi hiển thị form đặt lịch, lấy `applicationDetailId` từ `data` trả về (lọc theo vòng mà user được phép đặt kiosk).

---

## 6. CHI TIẾT ENDPOINT — LUỒNG ADMIN GÁN MENTOR + ỨNG VIÊN VÀO PHÒNG

### 6.1. `GET /api/admin/mentor-bookings?status=AWAITING_MENTOR` — Lấy danh sách booking theo trạng thái

**Auth:** ✅ Cần JWT (ADMIN/STAFF)
**Query param:** `status` (mặc định `AWAITING_MENTOR`, có thể bỏ qua)

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 5,
      "applicationDetailId": 10,
      "kioskId": 1,
      "applicantUserId": 7,
      "scheduledStart": "2026-07-15T09:00:00",
      "scheduledEnd": "2026-07-15T10:00:00",
      "mentorId": null,
      "sessionId": null,
      "status": "AWAITING_MENTOR",
      "sessionKey": null,
      "notes": null,
      "createdAt": "2026-07-10T09:00:00",
      "updatedAt": "2026-07-10T09:00:00"
    }
  ]
}
```

### 6.2. `POST /api/admin/mentor-bookings/{bookingId}/assign-mentor` — Gán mentor

**Auth:** ✅ Cần JWT (ADMIN)
**Path param:** `bookingId` (Long)
**Request Body:**

```json
{
  "mentorId": 3,
  "notes": "Phỏng vấn vòng 2"
}
```

**Response 200:** (toàn bộ object `MentorInterviewBooking` đã update)

```json
{
  "id": 5,
  "applicationDetailId": 10,
  "kioskId": 1,
  "applicantUserId": 7,
  "scheduledStart": "2026-07-15T09:00:00",
  "scheduledEnd": "2026-07-15T10:00:00",
  "mentorId": 3,
  "sessionId": 12,
  "status": "ROOM_CREATED",
  "sessionKey": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Phỏng vấn vòng 2",
  "createdAt": "2026-07-10T09:00:00",
  "updatedAt": "2026-07-10T09:00:00",
  "traceId": "abc-xyz-123"
}
```

**Lỗi:**

- `400` `"Booking is not in AWAITING_MENTOR status"` — booking đã được xử lý
- `409` `"Mentor has another interview booking at this time"` — mentor bận
- `500` `"Error creating Daily.co session: ..."` — lỗi gọi Daily.co

> Sau khi thành công, **server tự gửi Notification** cho ứng viên với message:
> `"Bạn đã được xếp lịch phỏng vấn tại Kiosk {kioskId} vào lúc {scheduledStart}. Session Key để vào phòng là: {sessionKey}"`

### 6.3. `GET /api/notifications/{userId}` — Ứng viên poll notification để lấy sessionKey

**Response 200:**

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 1,
      "user": { "id": 7, ... },
      "title": "Lịch phỏng vấn Mentor Interview",
      "message": "Bạn đã được xếp lịch phỏng vấn tại Kiosk 1 vào lúc 2026-07-15T09:00. Session Key để vào phòng là: 550e8400-e29b-41d4-a716-446655440000",
      "isRead": false,
      "createAt": "2026-07-10T09:00:00"
    }
  ]
}
```

> **Mẹo FE:** Parse `message` để extract `sessionKey` (regex: `Session Key.+là:\s*([a-f0-9-]+)`).

---

### 6.4. `POST /api/kiosk/enter` — Kiosk vật lý xác thực sessionKey

**Auth:** ❌ Public (kiosk vật lý gọi)
**Request Body:**

```json
{
  "sessionKey": "550e8400-e29b-41d4-a716-446655440000",
  "kioskId": 1
}
```

**Response 200:**

```json
{
  "roomUrl": "https://inblue.daily.co/abc-xyz-123",
  "traceId": "abc-xyz-123"
}
```

**Lỗi:**

- `400` `"Invalid session key"` — sessionKey không tồn tại
- `400` `"Booking has been cancelled"` — booking đã hủy
- `400` `"Session key is registered for Kiosk {kioskId}"` — kioskId không khớp
- `400` `"You can only enter the Kiosk within 15 minutes of your scheduled start time (...)"` — ngoài khung giờ ±15 phút
- `404` `"Booking not found for this session key"`

---

## 7. Các endpoint phụ trợ cần dùng

### 7.1. `POST /api/auth/login` — Đăng nhập (lấy JWT)

**Request Body:**

```json
{ "email": "user@example.com", "password": "password123" }
```

**Response 200:**

```json
"<chuỗi JWT token thuần>"
```

> Response trả về **chuỗi thuần**, **KHÔNG** bọc `{ traceId, data }` (vì là String).

**Header trả về:** `Authorization: Bearer <token>`

### 7.2. `GET /api/mentors` — Lấy danh sách mentor (admin dùng để gán)

**Response 200:** (List `MentorResponse`)

```json
{
  "traceId": "abc-xyz-123",
  "data": [
    {
      "id": 3,
      "name": "Nguyễn Văn A",
      "email": "a@example.com",
      "bio": "Senior Backend Engineer",
      "avatarUrl": "https://...",
      "expertise": "Java, Spring Boot",
      "yearsOfExperience": 8,
      "linkedInUrl": "https://linkedin.com/in/...",
      "currentCompany": "FPT",
      "totalSession": 120,
      "averageRating": 4.8,
      "pricePerMinute": 1000,
      "isActive": true,
      "role": "MENTOR"
    }
  ]
}
```

### 7.3. `DELETE /api/mentor-bookings/{bookingId}` — Hủy booking

**Auth:** ✅ Cần JWT (USER sở hữu hoặc ADMIN/STAFF)

**Response 200:** Empty body

**Lỗi:**

- `400` `"Cannot cancel booking in current state"` — booking đã COMPLETED/CANCELLED
- `401` `"Unauthorized to cancel this booking"` — không phải chủ booking

---

## 8. Bảng trạng thái & quy tắc UI

### 8.1. `BookingStatus` flow

```
AWAITING_MENTOR  (sau pickSlot)
       ↓  admin gọi assignMentor
ROOM_CREATED     (có sessionKey, có phòng Daily.co)
       ↓  kiosk xác thực enterKiosk (±15 phút)
IN_PROGRESS      (cuộc họp đang diễn ra)
       ↓  daily.co webhook participant.left
COMPLETED

Bất kỳ lúc nào (trừ COMPLETED/CANCELLED) → CANCELLED
```

### 8.2. UI gợi ý cho AI Frontend

| Màn hình                          | Endpoint chính                                       | Hành động                                                                                                                     |
| --------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Admin: Quản lý Kiosk**          | `GET /api/kiosks`                                    | Bảng liệt kê, có nút Edit (gọi `PUT`)                                                                                         |
| **Admin: Tạo Kiosk**              | `POST /api/kiosks`                                   | Form: name, location, isActive (toggle)                                                                                       |
| **Admin: Quản lý lịch Kiosk**     | `GET /api/kiosks/{id}/schedules`                     | Bảng theo `dayOfWeek`                                                                                                         |
| **Admin: Tạo lịch Kiosk**         | `POST /api/kiosks/schedule`                          | Form: kioskId (dropdown), dayOfWeek (select), openTime, closeTime (time picker), slotDurationMinutes (number input), isActive |
| **Ứng viên: Chọn Kiosk**          | `GET /api/kiosks`                                    | Card / dropdown                                                                                                               |
| **Ứng viên: Chọn ngày & slot**    | `GET /api/kiosks/{id}/slots?date=YYYY-MM-DD`         | Date picker + grid slot, slot `available: false` disabled                                                                     |
| **Ứng viên: Xác nhận đặt lịch**   | `POST /api/mentor-bookings/pick-slot`                | Modal confirm, sau khi OK thì show trạng thái "Đang chờ xếp Mentor"                                                           |
| **Admin: Gán Mentor**             | `POST /api/admin/mentor-bookings/{id}/assign-mentor` | Dropdown chọn mentor từ `GET /api/mentors`, ô notes                                                                           |
| **Ứng viên: Chờ notification**    | `GET /api/notifications/{userId}` (polling 10s)      | Lấy `sessionKey` từ message                                                                                                   |
| **Kiosk vật lý: Nhập sessionKey** | `POST /api/kiosk/enter`                              | Form: sessionKey (text), kioskId (auto-fill từ máy), sau khi OK thì mở `roomUrl` trong iframe/new tab                         |

---

## 9. Helper — gọi API từ Frontend (TypeScript mẫu)

```ts
// ===== TYPES =====
type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
type BookingStatus =
  | "AWAITING_MENTOR"
  | "MENTOR_ASSIGNED"
  | "ROOM_CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

interface Kiosk {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

interface KioskSchedule {
  id: number;
  kioskId: number;
  dayOfWeek: DayOfWeek;
  openTime: string; // "09:00:00"
  closeTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

interface SlotDto {
  startTime: string; // "2026-07-15T09:00:00"
  endTime: string;
  available: boolean;
}

interface MentorInterviewBooking {
  id: number;
  applicationDetailId: number;
  kioskId: number;
  applicantUserId: number;
  scheduledStart: string;
  scheduledEnd: string;
  mentorId: number | null;
  sessionId: number | null;
  status: BookingStatus;
  sessionKey: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationDetail {
  id: number;
  applicationId: number;
  roundId: number;
  status: "PENDING" | "SLOT_PICKED" | "SUBMITTED" | "AI_EVALUATED" | "COMPLETED" | "ERROR";
  bookingId: number | null;
  sessionId: number | null;
  // ... các field khác
}

// ===== FETCH HELPER =====
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("jwt");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  // Nếu response là List → unwrap data; nếu là object thì trả nguyên (có traceId thừa)
  const json = await res.json();
  return json && Array.isArray(json.data) ? json.data : json;
}

// ===== KIOSK APIs =====

// Admin: lấy tất cả kiosk (kể cả inactive nếu cần, nhưng GET public chỉ trả active)
export const getActiveKiosks = () => apiFetch<Kiosk[]>("/api/kiosks");

// Admin: tạo kiosk
export const createKiosk = (payload: { name: string; location: string; isActive: boolean }) =>
  apiFetch<Kiosk>("/api/kiosks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Admin: cập nhật kiosk
export const updateKiosk = (
  id: number,
  payload: { name: string; location: string; isActive: boolean }
) =>
  apiFetch<Kiosk>(`/api/kiosks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// Admin: tạo schedule
export const createSchedule = (payload: {
  kioskId: number;
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}) =>
  apiFetch<KioskSchedule>("/api/kiosks/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Lấy schedules theo kiosk
export const getSchedulesByKiosk = (kioskId: number) =>
  apiFetch<KioskSchedule[]>(`/api/kiosks/${kioskId}/schedules`);

// Cập nhật schedule
export const updateSchedule = (
  id: number,
  payload: {
    kioskId: number;
    dayOfWeek: DayOfWeek;
    openTime: string;
    closeTime: string;
    slotDurationMinutes: number;
    isActive: boolean;
  }
) =>
  apiFetch<KioskSchedule>(`/api/kiosks/schedule/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// Ứng viên: lấy slot trống theo ngày
export const getAvailableSlots = (kioskId: number, date: string /* YYYY-MM-DD */) =>
  apiFetch<SlotDto[]>(`/api/kiosks/${kioskId}/slots?date=${date}`);

// Ứng viên: đặt slot
export const pickSlot = (payload: {
  applicationDetailId: number;
  kioskId: number;
  scheduledStart: string;
  scheduledEnd: string;
}) =>
  apiFetch<MentorInterviewBooking>("/api/mentor-bookings/pick-slot", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Ứng viên: lấy applications của tôi
export const getMyApplications = () =>
  apiFetch<
    { id: number; userId: number; jdId: number; currentRoundOrder: number; status: string }[]
  >("/api/applications/me");

// Lấy application details
export const getApplicationDetails = (applicationId: number) =>
  apiFetch<ApplicationDetail[]>(`/api/application-details/application/${applicationId}`);

// Admin: lấy booking theo status
export const getBookingsByStatus = (status: BookingStatus = "AWAITING_MENTOR") =>
  apiFetch<MentorInterviewBooking[]>(`/api/admin/mentor-bookings?status=${status}`);

// Admin: gán mentor
export const assignMentor = (bookingId: number, payload: { mentorId: number; notes: string }) =>
  apiFetch<MentorInterviewBooking>(`/api/admin/mentor-bookings/${bookingId}/assign-mentor`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Kiosk: xác thực sessionKey
export const enterKiosk = (payload: { sessionKey: string; kioskId: number }) =>
  apiFetch<{ roomUrl: string }>("/api/kiosk/enter", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// Lấy mentors (cho dropdown gán)
export const getAllMentors = () =>
  apiFetch<{ id: number; name: string; email: string; bio?: string; avatarUrl?: string }[]>(
    "/api/mentors"
  );

// Ứng viên: lấy notification
export const getMyNotifications = (userId: number) =>
  apiFetch<{ id: number; title: string; message: string; isRead: boolean; createAt: string }[]>(
    `/api/notifications/${userId}`
  );
```

---

## 10. Checklist code Frontend cho AI

Khi AI nhận yêu cầu "code UI quản lý kiosk + lịch kiosk", AI cần làm theo đúng các bước sau:

1. **Setup base fetch** (xem Helper ở mục 9).
2. **Trang Admin → Kiosk**:
   - Bảng list (`getActiveKiosks`) + nút "Tạo Kiosk" mở modal form gọi `createKiosk`.
   - Mỗi row có nút "Sửa" mở form prefill gọi `updateKiosk`.
3. **Trang Admin → Schedule của 1 Kiosk**:
   - Bảng list (`getSchedulesByKiosk(kioskId)`) + nút "Tạo lịch" mở form.
   - Form: dropdown chọn `dayOfWeek`, time picker `openTime`/`closeTime`, number input `slotDurationMinutes`, toggle `isActive`. Submit gọi `createSchedule`.
   - Mỗi row có nút "Sửa" gọi `updateSchedule(id, ...)`.
4. **Trang Ứng viên → Đặt lịch phỏng vấn Mentor**:
   - Bước 1: Gọi `getMyApplications` → `getApplicationDetails(applicationId)` → lưu `applicationDetailId` cho vòng mà user được phép đặt.
   - Bước 2: Gọi `getActiveKiosks` → user chọn 1 kiosk.
   - Bước 3: Date picker → gọi `getAvailableSlots(kioskId, date)` → render grid slot (slot `available: false` disabled).
   - Bước 4: User click slot → confirm modal → gọi `pickSlot({ applicationDetailId, kioskId, scheduledStart, scheduledEnd })` → show trạng thái "Đang chờ xếp Mentor".
5. **Trang Admin → Gán Mentor**:
   - Bảng list `getBookingsByStatus('AWAITING_MENTOR')`.
   - Mỗi row có dropdown chọn mentor (từ `getAllMentors`) + ô notes → gọi `assignMentor(bookingId, { mentorId, notes })`.
6. **Trang Ứng viên → Lấy sessionKey** (polling 10s):
   - Gọi `getMyNotifications(userId)` → tìm notification có title "Lịch phỏng vấn Mentor Interview" → extract `sessionKey` từ message.
   - Hiển thị `sessionKey` cho ứng viên + hướng dẫn "Đem mã này đến kiosk".
7. **Trang Kiosk vật lý → Nhập sessionKey**:
   - Form: input `sessionKey`, `kioskId` (cố định trong config kiosk) → gọi `enterKiosk({ sessionKey, kioskId })` → nhận `roomUrl` → mở tab mới hoặc iframe để join Daily.co.

---

## 11. Lỗi thường gặp & cách xử lý

| Lỗi từ server                                         | HTTP | Cách xử lý UI                                 |
| ----------------------------------------------------- | ---- | --------------------------------------------- |
| `"Kiosk not found with id: {id}"`                     | 404  | Hiển thị "Kiosk không tồn tại" → refresh list |
| `"KioskSchedule not found with id: {id}"`             | 404  | Hiển thị "Lịch không tồn tại" → refresh       |
| `"ApplicationDetail not found"`                       | 404  | Hiển thị "Vòng thi không hợp lệ"              |
| `"Selected slot is already booked"`                   | 409  | Refresh lại slot, disable slot vừa chọn       |
| `"Booking is not in AWAITING_MENTOR status"`          | 400  | Refresh lại bảng booking                      |
| `"Mentor has another interview booking at this time"` | 409  | Hiển thị "Mentor bận, chọn mentor khác"       |
| `"Unauthorized"`                                      | 401  | Redirect về trang login                       |
| `"You can only enter the Kiosk within 15 minutes..."` | 400  | Hiển thị "Chưa đến giờ hoặc đã quá giờ"       |
| `"Invalid session key"`                               | 400  | Hiển thị "Mã không hợp lệ, kiểm tra lại"      |
| `"Booking has been cancelled"`                        | 400  | Hiển thị "Lịch đã bị hủy"                     |
| `"Session key is registered for Kiosk {kioskId}"`     | 400  | Hiển thị "Mã này không dành cho kiosk này"    |
| Lỗi `500` từ Daily.co                                 | 500  | Hiển thị "Lỗi hệ thống, thử lại sau"          |

---

## 12. Tóm tắt endpoint theo hành động

| Hành động                       | Method   | Endpoint                                        | Auth                |
| ------------------------------- | -------- | ----------------------------------------------- | ------------------- |
| Tạo kiosk                       | `POST`   | `/api/kiosks`                                   | ❌ (gửi JWT nếu có) |
| Lấy danh sách kiosk             | `GET`    | `/api/kiosks`                                   | ❌                  |
| Sửa kiosk                       | `PUT`    | `/api/kiosks/{id}`                              | ❌                  |
| Tạo lịch kiosk                  | `POST`   | `/api/kiosks/schedule`                          | ❌                  |
| Lấy lịch kiosk                  | `GET`    | `/api/kiosks/{kioskId}/schedules`               | ❌                  |
| Sửa lịch kiosk                  | `PUT`    | `/api/kiosks/schedule/{id}`                     | ❌                  |
| Lấy slot trống                  | `GET`    | `/api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`   | ❌                  |
| Đặt slot (USER)                 | `POST`   | `/api/mentor-bookings/pick-slot`                | ✅                  |
| Hủy booking (USER)              | `DELETE` | `/api/mentor-bookings/{bookingId}`              | ✅                  |
| Lấy booking theo status (ADMIN) | `GET`    | `/api/admin/mentor-bookings?status=...`         | ✅                  |
| Gán mentor (ADMIN)              | `POST`   | `/api/admin/mentor-bookings/{id}/assign-mentor` | ✅                  |
| Kiosk xác thực sessionKey       | `POST`   | `/api/kiosk/enter`                              | ❌                  |
| Lấy application của tôi         | `GET`    | `/api/applications/me`                          | ✅                  |
| Lấy application details         | `GET`    | `/api/application-details/application/{id}`     | ✅                  |
| Lấy danh sách mentor            | `GET`    | `/api/mentors`                                  | ❌                  |
| Đăng nhập                       | `POST`   | `/api/auth/login`                               | ❌                  |
| Lấy notification                | `GET`    | `/api/notifications/{userId}`                   | ✅                  |

---

## 13. Ghi chú kỹ thuật quan trọng cho AI

1. **Luôn unwrap `data`** nếu response là array, vì `SuccessResponseHandler` bọc list thành `{ traceId, data: [...] }`.
2. **Không unwrap** nếu response là object đơn — chỉ cần bỏ qua field `traceId` thừa.
3. **`isActive`** trong `Kiosk` và `KioskSchedule` dùng **snake_case JSON là `isActive`** (Lombok `@Data` tự sinh getter/setter `isActive()`/`setActive(...)` cho boolean). Khi gửi lên server cần JSON field là `isActive`. Nếu dùng TypeScript interface thì khai báo `isActive: boolean` là đúng.
4. **`dayOfWeek`** phải gửi đúng enum string `MONDAY`/`TUESDAY`/.../`SUNDAY` (uppercase).
5. **Thời gian**: ưu tiên dùng `HTMLInputElement type="time"` rồi pad `"HH:mm:00"` để ra `HH:mm:ss`.
6. **Đừng tự tính slot** — luôn lấy từ `GET /api/kiosks/{id}/slots` (server đã lo logic 15 phút nghỉ).
7. **Khi đặt slot**: gửi nguyên `startTime`/`endTime` từ `SlotDto` lên `pick-slot` (không tự sửa).
8. **Trong `application.properties`** không có `server.servlet.context-path` → base URL là `http://host:port/` (không có prefix).
9. **Khi nhận `sessionKey`** từ notification, dùng regex `Session Key.+là:\s*([a-f0-9-]{36})` để extract UUID.
10. **Phòng Daily.co** sau khi `enterKiosk` thành công sẽ có `roomUrl` — mở tab mới cho ứng viên join.

---

> **Tài liệu này được sinh tự động từ source code backend mới nhất trên branch `master` (commit `a01a57e`).** Nếu backend thay đổi endpoint, vui lòng cập nhật file này.
