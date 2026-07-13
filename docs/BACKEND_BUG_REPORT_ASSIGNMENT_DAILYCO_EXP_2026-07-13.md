# 💬 Backend Bug Report — Assign Mentor with past `exp` (Daily.co), test 13/07/2026

> Copy toàn bộ từ `--- BEGIN ---` đến `--- END ---` gửi cho BE qua Zalo.

---

## --- BEGIN MESSAGE ---

Xin chào BE team,

Phát hiện thêm 1 bug mới liên quan đến flow **assign mentor** mà hồi trước chưa gặp vì booking test cũ còn mới. Báo cáo này chỉ ghi nhận bug + traceID + repro steps, không đề xuất fix.

**Tài khoản test**: admin `thuson@gmail.com` (uid 1), student `mcneildavidson4970564@gmail.com` (uid 30), mentor `b@fpt.com` (uid 4).

---

### 🐛 BUG #5 — `assign-mentor` gửi `exp` ở quá khứ → Daily.co từ chối, HTTP 500

**Làm gì**: Admin mở trang Kiosk Booking Management → chọn 1 booking ở trạng thái `AWAITING_MENTOR` (booking 16) → bấm "Assign Mentor" → chọn mentor 4 → submit form.

**Endpoint**: `POST /api/admin/mentor-bookings/16/assign-mentor`

**Request**:

```json
{ "mentorId": 4, "notes": "" }
```

**Response**: HTTP 500

```json
{
  "traceId": "6a54ca31ffd89a64fa4f621c9288d05a",
  "message": "Error creating Daily.co session: 400 Bad Request on POST request for \"https://api.daily.co/v1/rooms\": {\"error\":\"invalid-request-error\",\"info\":\"exp was '1783915716', which is in the past rather than in the future\"}",
  "error": "...",
  "status": 500
}
```

**TraceID lần 2 (cùng bug)**: `6a54ca38d5bb6eda693443f80e99ccdc`

---

### 🔍 Phân tích (FE làm rõ để BE confirm)

**Decode `exp = 1783915716` (Unix seconds)**:

- `1783915716 / 86400 / 365.25 ≈ 56.6 năm` kể từ epoch
- Tương ứng: **2026-06-09 06:48:36 UTC+7**
- Hôm nay test: **2026-07-13**

→ `exp` bị **trong quá khứ ~34 ngày**. Daily.co reject ngay.

**Root cause khả dĩ** (BE confirm):

- BE đang tính `exp` từ `booking.scheduledEnd.getEpochSecond()` thay vì `now() + sessionDuration`.
- Vì booking 16 có `scheduledEnd = 2026-06-09 06:48:36` (user pick slot ngày 9/6, admin assign trễ vào ngày 13/7) → exp = quá khứ → Daily.co 400.
- So sánh với hồi trước test booking 14 thành công (traceId `6a53ec39b9fde5350b56978b4dd351ca`) → assign trong cùng ngày → `exp = scheduledEnd` còn ở tương lai → chạy được.

---

### 📋 Repro steps

1. User pick slot booking vào ngày D (ví dụ D=2026-06-09, scheduledStart/scheduledEnd trong ngày D) → booking status `AWAITING_MENTOR`.
2. Admin KHÔNG assign ngay, để booking ở trạng thái chờ qua ngày D+1 trở đi.
3. Admin vào trang Kiosk Booking Management → Assign mentor.
4. BE gọi Daily.co `POST /v1/rooms` với `properties.exp = booking.scheduledEnd.getEpochSecond()`.
5. Daily.co trả `400 invalid-request-error: exp was '...', which is in the past` (vì scheduledEnd < now).
6. BE wrap lỗi Daily.co thành HTTP 500 → FE nhận 500 → toast lỗi → booking vẫn ở `AWAITING_MENTOR`, không vào `MENTOR_ASSIGNED`.

### 🧪 Test xác nhận

| Booking    | scheduledEnd (UTC+7)         | Ngày assign      | exp nhận được   | Kết quả              |
| ---------- | ---------------------------- | ---------------- | --------------- | -------------------- |
| Booking 14 | 2026-07-13 02:35 (tương lai) | 2026-07-13 02:35 | trong tương lai | ✅ 200, ROOM_CREATED |
| Booking 16 | 2026-06-09 06:48 (quá khứ)   | 2026-07-13 18:21 | quá khứ         | ❌ 500, Daily.co 400 |
| Booking 15 | tương tự 14                  | cùng ngày        | trong tương lai | ✅ 200               |

→ Bug **time-dependent**: chỉ fail khi admin assign trễ, sau khi `scheduledEnd` đã trôi qua.

### 💥 Hệ quả

- Booking `AWAITING_MENTOR` bị **stuck** khi admin không assign ngay.
- Ứng viên đến kiosk ngày hôm sau (sau `scheduledEnd`) cũng không vào được (vì `create-session` cũng sẽ fail tương tự hoặc sessionKey không tồn tại).
- FE không thể bypass — API phải được sửa phía BE.

### 💡 Gợi ý (nếu BE muốn, không bắt buộc)

Có 2 hướng để BE không phải từ chối nữa:

**A. Sửa logic `exp`**:

- Đặt `exp = max(now + sessionDurationMinutes * 60, scheduledEnd.getEpochSecond() + buffer)`.
- Hoặc: nếu `scheduledEnd` ở quá khứ, **đặt `exp = now + durationMinutes * 60`** thay vì báo lỗi.

**B. Cho phép override khung giờ**:

- Khi admin assign mentor cho booking trễ, cho admin chọn lại `start/end` mới.
- Hoặc: auto-rotate `scheduledStart/scheduledEnd` lên `now() + duration` nếu đã quá hạn.

→ Hướng nào cũng ok, miễn Daily.co không bị gửi `exp` quá khứ.

### 📎 TraceID & Logs

```
# Failed assign
6a54ca31ffd89a64fa4f621c9288d05a  | POST /api/admin/mentor-bookings/16/assign-mentor (lần 1, HTTP 500, Daily.co 400)
6a54ca38d5bb6eda693443f80e99ccdc  | POST /api/admin/mentor-bookings/16/assign-mentor (lần 2, HTTP 500, cùng bug)

# Successful assign (for comparison)
6a53ec39b9fde5350b56978b4dd351ca  | POST /api/admin/mentor-bookings/14/assign-mentor (booking 14, scheduledEnd=tương lai → OK)
```

### 🔍 Stack trace từ FE console

```
kiosk-booking.manager.ts:86 [KioskBookingManager] assignMentor error:
  Error: Error creating Daily.co session: 400 Bad Request
  on POST request for "https://api.daily.co/v1/rooms":
  "{"error":"invalid-request-error","info":"exp was '1783915716', which is in the past rather than in the future"}"
      at toAppApiError (error-normalizer.ts:435:20)
      at Object.onResponse (api.ts:186:13)
      at async coreFetch (index.js:214:28)
      at async KioskBookingManager.assignMentor (kiosk-booking.manager.ts:69:24)
      at async handleAssign (KioskBookingManagementPage.tsx:143:24)
```

→ Lỗi gốc từ Daily.co, được BE catch & wrap thành 500.

---

## --- END MESSAGE ---
