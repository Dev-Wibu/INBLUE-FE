# Bug Report: Code Review Submit Fails with Status Constraint Violation

## Ngày báo cáo

2026-07-17

## Mức độ nghiêm trọng

**CRITICAL** - Blocking bug, ứng viên không thể submit Code Review

---

## 1. Tóm tắt lỗi

Khi ứng viên submit Code Review, API trả về lỗi 500 Internal Server Error với message constraint violation. Backend đang cố insert row mới vào bảng `ApplicationDetail` với `status = "AWAITING_MENTOR"` - một giá trị không được phép theo check constraint của database.

---

## 2. Thông tin Endpoint

| Thông tin        | Chi tiết                                             |
| ---------------- | ---------------------------------------------------- |
| **URL**          | `POST /api/application-details/code-review/evaluate` |
| **Base URL**     | `https://api.kdz.asia`                               |
| **Content-Type** | `application/json`                                   |

---

## 3. Request Details

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-Id: 1784282466378-pmympdgcr
```

### Request Body (CHUẨN - từ Frontend gửi lên)

```json
{
  "applicationId": 56,
  "roundId": 238,
  "submissions": [
    {
      "filename": "src/main/java/com/example/dto/UserDto.java",
      "lineNumber": 8,
      "severity": "WARNING",
      "message": "Variable 'userDto' could be final",
      "suggestion": "Add 'final' keyword"
    }
  ]
}
```

### Giải thích các trường:

| Trường                     | Kiểu    | Bắt buộc | Mô tả                                             |
| -------------------------- | ------- | -------- | ------------------------------------------------- |
| `applicationId`            | integer | ✅       | ID của application ( ví dụ: 56 )                  |
| `roundId`                  | integer | ✅       | ID của round Code Review ( ví dụ: 238 )           |
| `submissions`              | array   | ✅       | Danh sách các comments từ code review             |
| `submissions[].filename`   | string  | ✅       | Đường dẫn file được review                        |
| `submissions[].lineNumber` | integer | ✅       | Số dòng được review                               |
| `submissions[].severity`   | string  | ✅       | Mức độ nghiêm trọng: "WARNING" / "ERROR" / "INFO" |
| `submissions[].message`    | string  | ✅       | Nội dung comment                                  |
| `submissions[].suggestion` | string  | ❌       | Gợi ý sửa lỗi                                     |

---

## 4. Response lỗi

### HTTP Status: `500 Internal Server Error`

```json
{
  "traceId": "6a59fd62431af19eed9ce1386baadf2b",
  "error": "could not execute statement [ERROR: new row for relation \"applicationdetail\" violates check constraint \"applicationdetail_status_check\"\n  Detail: Failing row contains (78, null, null, 56, null, 2026-07-17 10:01:13.905153, null, null, null, null, 239, 2026-07-17 10:01:13.90518, AWAITING_MENTOR, null, 2026-07-17 10:01:13.90519, null, null, null, null, {\"endTime\": 1784282473904, \"sessionId\": null, \"startTime\": 17842...}).] [insert into ApplicationDetail (aiFeedback,aiScore,applicationId,bookingId,completedAt,createdAt,finalResult,finalScore,hrNote,hrScore,mentorId,mentor_review_id,roundId,sessionId,sessionInfo,startedAt,status,submissionData,updatedAt) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)]; SQL [insert into ApplicationDetail (aiFeedback,aiScore,applicationId,bookingId,completedAt,createdAt,finalResult,finalScore,hrNote,hrScore,mentorId,mentor_review_id,roundId,sessionInfo,startedAt,status,submissionData,updatedAt) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)]; constraint [applicationdetail_status_check]"
}
```

---

## 5. Phân tích nguyên nhân

### Lỗi cụ thể:

```
constraint [applicationdetail_status_check]
```

### Giá trị bị từ chối:

```
status: "AWAITING_MENTOR"
```

### Vấn đề:

Backend đang gán **sai giá trị status** khi insert row mới cho Code Review:

- **Giá trị sai:** `"AWAITING_MENTOR"` (dành cho Mentor Review workflow mới)
- **Giá trị đúng:** Nên là `"COMPLETED"` hoặc giá trị phù hợp với Code Review workflow

### Logic bị sai:

1. Endpoint nhận request submit Code Review ✅
2. Backend parse submissions data ✅
3. Backend cố tạo row mới trong `ApplicationDetail` ❌
4. Backend gán `status = "AWAITING_MENTOR"` cho Code Review ❌ (**SAI**)
5. Database reject vì constraint không cho phép giá trị này ❌

---

## 6. Expected Response (sau khi fix)

Backend nên trả về:

```json
{
  "success": true,
  "data": {
    "applicationDetailId": 78,
    "status": "COMPLETED",
    "finalScore": 85.5,
    "feedback": "..."
  }
}
```

---

## 7. Cách test trên Swagger

### Bước 1: Truy cập Swagger

Mở trình duyệt và truy cập:

```
https://api.kdz.asia/swagger-ui.html
```

### Bước 2: Authenticate

1. Tìm endpoint **POST /api/auth/login** hoặc **/api/auth/login/admin**
2. Đăng nhập để lấy JWT token
3. Click nút **Authorize** 🔒 ở góc trên bên phải
4. Nhập: `Bearer <YOUR_JWT_TOKEN>`

### Bước 3: Tìm và test endpoint

1. Tìm section **Application Details** hoặc search `code-review`
2. Click vào endpoint: `POST /api/application-details/code-review/evaluate`
3. Click nút **Try it out**

### Bước 4: Điền Request Body

```json
{
  "applicationId": 56,
  "roundId": 238,
  "submissions": [
    {
      "filename": "src/main/java/com/example/dto/UserDto.java",
      "lineNumber": 8,
      "severity": "WARNING",
      "message": "Variable 'userDto' could be final",
      "suggestion": "Add 'final' keyword"
    },
    {
      "filename": "src/main/java/com/example/service/UserService.java",
      "lineNumber": 42,
      "severity": "ERROR",
      "message": "Potential NullPointerException",
      "suggestion": "Add null check before accessing"
    }
  ]
}
```

### Bước 5: Execute

1. Click **Execute**
2. Xem response ở phần **Response body**

---

## 8. Các giá trị `status` hợp lệ

Dựa vào lỗi và frontend integration guide, các status valid cho `ApplicationDetail`:

| Status            | Mô tả                                  | Sử dụng                      |
| ----------------- | -------------------------------------- | ---------------------------- |
| `AWAITING_MENTOR` | Chờ Admin gán mentor                   | Mentor Review (WORKFLOW MỚI) |
| `PENDING`         | Mentor gán rồi, chờ ứng viên chọn lịch | Mentor Review                |
| `SLOT_PICKED`     | Ứng viên chọn slot online              | Mentor Review                |
| `COMPLETED`       | Vòng thi hoàn thành                    | Tất cả các vòng              |

---

## 9. Yêu cầu fix từ Frontend

1. **Backend cần sửa logic** trong endpoint `/api/application-details/code-review/evaluate` để không gán `AWAITING_MENTOR` cho Code Review
2. **Backend nên update** row hiện có thay vì insert row mới (hoặc insert với status đúng)
3. **Sau khi fix**, response nên trả về `success: true` với data của submission

---

## 10. Liên hệ

- **Frontend Dev:** Đã xác nhận request body gửi lên đúng format
- **Backend Dev:** Cần kiểm tra logic insert/update trong `CodeReviewEvaluateService`
- **Database Admin:** Có thể cần xem lại constraint `applicationdetail_status_check`
