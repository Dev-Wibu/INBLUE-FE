# Hướng dẫn Tích hợp Frontend (FE) - Luồng Kiosk Scheduling & Mentor Interview

Tài liệu này cung cấp danh sách tuần tự các API Endpoint, Request Body và Sample Response cần thiết để Frontend tích hợp luồng đặt lịch phỏng vấn và truy cập phòng phỏng vấn tại trạm Kiosk vật lý.

---

## BƯỚC 1: Admin tạo Kiosk vật lý

Khi cấu hình trạm phỏng vấn vật lý mới tại văn phòng.

- **API URL**: `POST /api/kiosks`
- **Mô tả**: Tạo một trạm Kiosk mới.
- **Request Body**:
  ```json
  {
    "name": "Kiosk A - Phòng 101",
    "location": "Tầng 1 - Khu A",
    "isActive": true
  }
  ```

---

## BƯỚC 2: Admin thiết lập lịch làm việc định kỳ của Kiosk

Admin cấu hình giờ mở cửa, đóng cửa và độ dài của mỗi slot phỏng vấn tại trạm Kiosk này.

- **API URL**: `POST /api/kiosks/schedule`
- **Mô tả**: Thiết lập giờ mở/đóng cửa và độ dài slot của Kiosk theo từng ngày trong tuần.
- **Request Body**:
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

---

## BƯỚC 3: Hiển thị các slots còn trống cho Ứng viên chọn lịch

Ứng viên truy cập để đặt lịch phỏng vấn.

### 3.1. Lấy danh sách các Kiosk đang hoạt động

- **API URL**: `GET /api/kiosks`
- **Sample Response**:
  ```json
  [
    {
      "id": 1,
      "name": "Kiosk A - Phòng 101",
      "location": "Tầng 1 - Khu A",
      "isActive": true
    }
  ]
  ```

### 3.2. Lấy slots trống trong ngày được chọn

Khi ứng viên chọn một Kiosk và một ngày phỏng vấn (ví dụ: ngày `2026-07-10`).

- **API URL**: `GET /api/kiosks/{kioskId}/slots?date=YYYY-MM-DD`
  - _Ví dụ_: `GET /api/kiosks/1/slots?date=2026-07-10`
- **Mô tả**: Trả về danh sách tất cả các slot trong ngày. Các slot trống và có thể bấm chọn sẽ có trạng thái `"available": true`. Mỗi slot kế tiếp đã tự động được cộng thêm **15 phút nghỉ giữa các giờ**.
- **Sample Response**:
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

---

## BƯỚC 4: Ứng viên thực hiện đặt lịch (Book slot)

Ứng viên bấm chọn một slot phỏng vấn bất kỳ đang trống (`available = true`).

- **API URL**: `POST /api/mentor-bookings/pick-slot`
- **Mô tả**: Đặt slot đã chọn cho vòng phỏng vấn của ứng viên.
- **Request Body**:
  ```json
  {
    "applicationDetailId": 12,
    "kioskId": 1,
    "scheduledStart": "2026-07-10T10:00:00",
    "scheduledEnd": "2026-07-10T10:45:00"
  }
  ```

---

## BƯỚC 5: Admin duyệt và gán Mentor (Hệ thống tự động tạo phòng)

Admin vào kiểm tra các lịch hẹn đang chờ và thực hiện gán Mentor cho buổi phỏng vấn.

- **API URL**: `POST /api/admin/mentor-bookings/{bookingId}/assign-mentor`
  - _Ví dụ_: `POST /api/admin/mentor-bookings/55/assign-mentor`
- **Mô tả**: Admin gán Mentor. Hệ thống sẽ tự động gọi Daily.co API tạo phòng, sinh ra mã xác thực `sessionKey` (UUID) và gửi thông báo Notification cho ứng viên.
- **Request Body**:
  ```json
  {
    "mentorId": 5,
    "notes": "Phỏng vấn chuyên môn React & Spring Boot"
  }
  ```

---

## BƯỚC 6: Xác thực tại Kiosk để lấy link phòng phỏng vấn

Đến ngày hẹn phỏng vấn, ứng viên đứng trước máy Kiosk vật lý và nhập mã `sessionKey` đã nhận từ notification.

- **API URL**: `POST /api/kiosk/enter`
- **Mô tả**: Kiosk gửi mã xác thực. Hệ thống kiểm tra thời gian hợp lệ (trong vòng ±15 phút so với giờ hẹn) và trả về đường dẫn phòng họp trực tuyến của Daily.co.
- **Request Body**:
  ```json
  {
    "sessionKey": "e0e2d148-8df0-4bbf-b75b-ec86b5b5ee24",
    "kioskId": 1
  }
  ```
- **Sample Response**:
  ```json
  {
    "roomUrl": "https://inblue.daily.co/booking-55-1719875412"
  }
  ```
- **Hành động của FE**: Lấy `roomUrl` này và nhúng vào Daily.co iframe trên Kiosk để ứng viên tham gia cuộc họp.

---

## BƯỚC 7: Ghi nhận người dùng tham gia phòng họp (Join Record)

Khi ứng viên hoặc mentor kết nối thành công vào phòng họp Daily.co.

- **API URL**: `POST /api/sessions/join-session`
- **Mô tả**: Gọi API này khi FE bắt được sự kiện tham gia thành công vào Daily.co room của ứng viên hoặc mentor để ghi nhận trạng thái vào CSDL.
- **Request Body**:
  ```json
  {
    "sessionName": "booking-55-1719875412",
    "userId": 12,
    "participantId": "p_abc123xyz",
    "isMentor": false
  }
  ```
