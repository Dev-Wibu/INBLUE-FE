# Tài liệu Tích hợp Frontend (Guidelines for Frontend)

## Quy trình Hẹn gặp & Đánh giá Vòng Mentor Review

Tài liệu này hướng dẫn cách tích hợp giao diện Frontend (Ứng viên, Mentor, Admin) theo luồng nghiệp vụ mới được cập nhật ở Backend cho vòng thi **Mentor Review**.

---

## 1. Tổng quan Luồng Nghiệp vụ Mới (Workflow)

```
        Vòng Mentor Review bắt đầu
                    │
                    ▼
   ApplicationDetail.status = AWAITING_MENTOR
    (Giao diện ứng viên: Chờ Admin gán mentor)
                    │
          [Admin gán mentor] (1)
                    │
                    ▼
       ApplicationDetail.status = PENDING
   (Giao diện ứng viên: Chọn lịch phỏng vấn)
                    │
         [Ứng viên chọn hình thức] (2)
                    │
         ┌──────────┴──────────┐
         ▼ (ONLINE)            ▼ (OFFLINE)
    Tạo phòng Daily.co      Không tạo Daily.co
    status = SLOT_PICKED   status = PENDING
                    │          │
                    └────┬─────┘
                         ▼
        Tiến hành phỏng vấn (Online/Offline)
                         │
        [Mentor submit Review + Feedback] (3)
                         │
                         ▼
    Tự động hoàn thành vòng & tính điểm (4)
      ApplicationDetail.status = COMPLETED
```

---

## 2. Các Thay đổi trong Cấu trúc Dữ liệu (Data Structure Changes)

Trường thông tin trả về của `ApplicationDetail` có thay đổi quan trọng như sau:

- **Loại bỏ** trường `deadline` ở lớp ngoài cùng của `ApplicationDetail`.
- **Bổ sung** trường JSON `sessionInfo` trong `ApplicationDetail` với định dạng:
  ```json
  "sessionInfo": {
    "sessionId": 12,       // ID của session được tạo sau khi ứng viên chọn lịch
    "meetingType": "ONLINE", // Hoặc "OFFLINE" (chỉ có sau khi chọn lịch)
    "startTime": "2026-07-17 13:00:00.000", // Thời gian bắt đầu vòng thi (chỉ có sau khi gán mentor, ban đầu là null)
    "endTime": "2026-07-20 13:00:00.000"   // Hạn chót/deadline hoàn thành vòng thi (chỉ có sau khi gán mentor, ban đầu là null)
  }
  ```
- **Bổ sung** trường `mentorId` (Integer) trực tiếp ở cấp ngoài cùng của `ApplicationDetail`.

---

## 3. Hướng dẫn Tích hợp API theo từng vai trò (Roles & APIs)

### A. Vai trò ADMIN: Gán Mentor cho Ứng viên (1)

Khi ứng viên ở trạng thái `status === "AWAITING_MENTOR"`, Admin thực hiện gán mentor qua API:

- **Method**: `PUT`
- **URL**: `/api/application-details/{applicationDetailId}/assign-mentor`
- **Query Parameter**: `mentorId` (int)
- **Hành động**: Sau khi gọi thành công, trạng thái của `ApplicationDetail` sẽ chuyển sang `PENDING`.

---

### B. Vai trò ỨNG VIÊN: Chọn Lịch hẹn & Hình thức (2)

Khi ứng viên ở trạng thái `status === "PENDING"` và `sessionInfo.meetingType` là `null`, ứng viên chọn lịch hẹn (`joinTime`) và hình thức phỏng vấn (`ONLINE` hoặc `OFFLINE`).

Gọi API sau để xác nhận:

- **Method**: `POST`
- **URL**: `/api/sessions/create-for-round`
- **Request Body (JSON)**:
  ```json
  {
    "applicationDetailId": 10, // ID của ApplicationDetail hiện tại
    "joinTime": "2026-07-18T10:00:00.000+07:00", // Thời gian hẹn gặp (Timestamp ISO-8601)
    "duration": 60, // Thời lượng buổi hẹn (phút, mặc định 60)
    "offline": false // true = OFFLINE, false = ONLINE
  }
  ```
  _(Lưu ý: Không cần truyền `mentorId` trong Body, Backend sẽ tự động lấy thông tin Mentor đã gán từ `ApplicationDetail`)_

#### Xử lý kết quả trả về:

- **Nếu chọn ONLINE (`offline: false`)**:
  - Backend tự tạo phòng họp qua Daily.co.
  - `ApplicationDetail.status` chuyển thành `SLOT_PICKED`.
  - Frontend hiển thị nút **"Tham gia phỏng vấn online"** dẫn tới URL phòng Daily.co (nằm trong session trả về).
- **Nếu chọn OFFLINE (`offline: true`)**:
  - Backend không tạo phòng Daily.co mà tạo Session offline giả lập để Mentor chấm điểm sau này.
  - `ApplicationDetail.status` giữ nguyên là `PENDING`.
  - Frontend hiển thị thông báo: **"Hình thức phỏng vấn: OFFLINE. Vui lòng gặp mentor theo thời gian đã hẹn tại văn phòng công ty"**.

---

### C. Giai đoạn Phỏng vấn kết thúc & Mentor chấm điểm (3)

Sau khi phỏng vấn xong:

1. Mentor gửi **Review** qua API: `POST /api/mentor-reviews`
2. Mentor gửi **Feedback** qua API: `POST /api/mentor-feedbacks`

_(Hai API trên giữ nguyên cấu trúc cũ, sử dụng `sessionId` để liên kết)_

---

### D. Tự động Hoàn thành vòng thi (4)

Ngay khi nhận đủ cả **Review** và **Feedback** từ Mentor, Backend sẽ:

- Tính điểm trung bình dựa trên rating của Review.
- Chuyển `ApplicationDetail.status` sang `COMPLETED`.
- Tự động gọi chuyển tiếp sang vòng thi tiếp theo (`moveToNextRound`).

---

## 4. Bảng Tra cứu Trạng thái Giao diện (UI State Mapping)

| Trạng thái `status`   | `sessionInfo.meetingType` | Giao diện hiển thị cho Ứng viên                                                                                       | Giao diện hiển thị cho Mentor/Admin                                                     |
| :-------------------- | :------------------------ | :-------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| **`AWAITING_MENTOR`** | Bất kỳ / Null             | Hiển thị: "Đang chờ Admin phân công Mentor phỏng vấn..."                                                              | Admin: Hiển thị nút "Gán Mentor"                                                        |
| **`PENDING`**         | `null`                    | Hiển thị form chọn **Thời gian hẹn gặp** và **Hình thức phỏng vấn**                                                   | Chờ ứng viên chọn lịch                                                                  |
| **`PENDING`**         | `"OFFLINE"`               | Hiển thị: "Lịch hẹn phỏng vấn Offline đã được xác nhận vào lúc [Thời gian]. Vui lòng gặp mentor tại địa chỉ công ty." | Mentor: Hiển thị thông tin lịch hẹn Offline và nút "Đánh giá ứng viên" sau khi gặp xong |
| **`SLOT_PICKED`**     | `"ONLINE"`                | Hiển thị: "Lịch hẹn phỏng vấn Online đã được xác nhận. Vào phòng họp tại đây [Link Daily.co]"                         | Mentor/Ứng viên: Nút "Vào phòng họp" hoạt động                                          |
| **`COMPLETED`**       | Bất kỳ                    | Vòng thi kết thúc. Hiển thị điểm số và nhận xét của Mentor.                                                           | Hiển thị kết quả đã đánh giá.                                                           |
