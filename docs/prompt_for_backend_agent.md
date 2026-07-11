# Prompt cho Backend Agent — Luồng Mentor Interview trong Application

## Yêu cầu

Bạn là backend developer. Tôi (frontend developer) cần bạn cung cấp tài liệu đầy đủ về luồng **MENTOR_INTERVIEW** (vòng phỏng vấn mentor) bên trong hệ thống **Application/Ứng tuyển**.

Hiện tại hệ thống có 2 luồng mentor interview:

1. **Kiosk Interview** — luồng độc lập, student đặt kiosk → admin gán mentor → mentor vào phòng từ dashboard
2. **Application Mentor Interview** — vòng phỏng vấn nằm TRONG pipeline ứng tuyển (Application), có nhiều vòng như CV Screening → Email Simulator → Quiz → Coding → **Mentor Interview** → AI Interview

Tôi cần tài liệu MD đầy đủ để tự implement 100% phía frontend.

---

## Câu hỏi cụ thể

### 1. Tên chính xác của round type

- Tên chính xác trong database: `MENTOR_INTERVIEW` hay `MENTOR_REVIEW` hay `MENTROR_REVIEW` (có typo)?
- Giá trị enum trong code backend là gì?

### 2. Cấu trúc JD Round config cho MENTOR_INTERVIEW

- Trong `configData` của JD Round có những trường gì cho vòng này?
  - Có `mentorId` không? Hay mentor được assign động?
  - Có `mentorName`, `mentorAvatar`, `mentorExpertise` không?
  - Có `duration` (thời lượng phỏng vấn) không?
  - Có `totalPrice` (phí) không?
  - Hay **không có gì** — mentor được gán riêng qua bảng trung gian?

### 3. Mentor được assign như thế nào?

- Khi student bước vào vòng MENTOR_INTERVIEW:
  - Mentor đã có sẵn trong `configData` của JD Round?
  - Hay BE tự động assign mentor nào đó?
  - Hay cần frontend gọi API để lấy thông tin mentor trước?

### 4. Có bước thanh toán không?

- Trong luồng Application Mentor Interview, có bước thanh toán không?
  - Nếu có: student phải thanh toán trước khi vào phòng?
  - Nếu không: phỏng vấn miễn phí, vào thẳng phòng?
- Nếu có thanh toán:
  - Endpoint thanh toán là gì?
  - Flow: tạo payment → redirect → webhook → cập nhật session status?

### 5. Session trong Application vs Kiosk

- Khi student vào vòng MENTOR_INTERVIEW trong Application:
  - Có tạo `Session` record không?
  - Hay dùng chung bảng `Session` với Kiosk?
  - `sessionKey`, `kioskId` có được tạo không?
  - Session status nào thì student được vào phòng?

### 6. Các API endpoints liên quan

Liệt kê TẤT CẢ các endpoint liên quan đến luồng MENTOR_INTERVIEW trong Application:

| Method   | Endpoint                          | Mục đích                              | Request Body | Response |
| -------- | --------------------------------- | ------------------------------------- | ------------ | -------- |
| vd: POST | /api/sessions                     | Tạo session?                          | ?            | ?        |
| vd: GET  | /api/sessions/{id}                | Lấy thông tin session?                | -            | ?        |
| vd: POST | /api/sessions/payment             | Thanh toán?                           | ?            | ?        |
| vd: GET  | /api/mentors                      | Lấy danh sách mentor?                 | -            | ?        |
| vd: GET  | /api/application/{id}/mentor-info | Lấy thông tin mentor cho application? | -            | ?        |
| ...      | ...                               | ...                                   | ...          | ...      |

### 7. ApplicationDetail cho MENTOR_INTERVIEW

- Sau khi phỏng vấn xong, có tạo `ApplicationDetail` record không?
- `ApplicationDetail` lưu những gì?
  - `mentorReview` (review của mentor về student)?
  - `studentFeedback` (feedback của student về mentor)?
  - `rating` (sao đánh giá)?
  - `STAR` notes (situation, task, action, result)?
  - `strength`, `weakness`, `improve`?

### 8. Frontend cần làm gì — mô tả step-by-step

Từ góc nhìn frontend, mô tả chính xác từng bước student phải làm khi đến vòng MENTOR_INTERVIEW:

```
Bước 1: Student vào Application History → chọn application → bấm "Enter Room" vòng Mentor Interview
Bước 2: Frontend gọi API [...] → nhận về [...] → hiển thị [...]
Bước 3: [Có/Không] bước thanh toán? → gọi API [...] → redirect [...]
Bước 4: Student bấm "Vào phòng" → navigate đến [...] → component [...]
Bước 5: Mentor vào từ dashboard → kết nối video call
Bước 6: Phỏng vấn xong → cả 2 rời phòng → chuyển status session
Bước 7: Student viết feedback (STAR) → gọi API [...] → body: [...]
Bước 8: [Có/Không] mentor viết review về student? → API nào?
```

### 9. So sánh với Kiosk Interview

| Khía cạnh                | Kiosk Interview                          | Application Mentor Interview |
| ------------------------ | ---------------------------------------- | ---------------------------- |
| Mentor assign            | Admin gán trong Kiosk Booking Management | ?                            |
| Thanh toán               | ?                                        | ?                            |
| Session tạo khi nào      | Khi student đặt kiosk                    | ?                            |
| Session key              | Có                                       | ?                            |
| Kiosk ID                 | Có                                       | ?                            |
| ApplicationDetail record | Không                                    | ?                            |

### 10. Code reference

- Đường dẫn file controller/service/entity liên quan:
  - `SessionController.java` hoặc tương đương?
  - `MentorInterviewService.java`?
  - `ApplicationDetail` entity?
  - `Session` entity?
  - `Mentor` entity hoặc DTO?

---

## ⚠️ BUG/GAP CẦN SỬA (Frontend bị block — vui lòng ưu tiên)

### GAP 1: Student không thể lấy `mentorId` để submit review

**Triệu chứng (Frontend):**

- Student vào `/user/application/{id}/mentor-review` sau khi phỏng vấn xong
- Frontend gọi `POST /api/mentor-reviews` với body:
  ```json
  {
    "sessionId": 123,
    "mentorId": ???,   // ← Frontend KHÔNG CÓ cách lấy
    "userId": ???,     // ← Frontend KHÔNG CÓ cách lấy
    "rating": 8,
    "situationNote": "...",
    ...
  }
  ```
- Backend trả **500 — "The data submitted is invalid"** vì thiếu `mentorId`/`userId`.

**Nguyên nhân:**

1. `GET /api/mentor-bookings/{bookingId}` **không tồn tại** — schema OpenAPI chỉ declare `DELETE` (admin hoặc owner cancel). Frontend không có cách fetch booking.
2. `GET /api/application-details/application/{applicationId}` response **không include `mentorId`** và **`applicantUserId`** (chỉ trả `id`, `roundId`, `status`, `bookingId`, `sessionId`, `mentorReview`).
3. `Session` entity có `userId` (mentee) + `userId2` (mentor) nhưng frontend không có endpoint nào để student fetch session theo `applicationDetailId`/`bookingId`.

**Yêu cầu fix — chọn 1 trong 3 option (khuyến nghị A):**

#### ✅ Option A (KHUYẾN NGHỊ — ít thay đổi nhất)

Backend tự derive `mentorId` + `userId` từ `sessionId` trong `MentorReviewService.create()`:

```java
@Service
public class MentorReviewServiceImpl {
    public MentorReview create(CreateMentorReviewRequest req) {
        Session session = sessionRepository.findById(req.getSessionId())
            .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        // Derive from session — frontend không cần gửi 2 field này nữa
        req.setUserId(session.getUserId());    // mentee (student)
        req.setMentorId(session.getUserId2());  // mentor

        // ... rest of create logic
    }
}
```

**Đồng thời cập nhật DTO `CreateMentorReviewRequest`** để bỏ required check 2 field `mentorId` + `userId`:

```java
public class CreateMentorReviewRequest {
    @NotNull
    private Long sessionId;

    private Long mentorId;    // ← optional, derived from session if null
    private Long userId;      // ← optional, derived from session if null

    @NotNull @Min(1) @Max(10)
    private Integer rating;

    private String situationNote;
    private String taskNote;
    private String actionNote;
    private String resultNote;
    private String strength;
    private String weakness;
    private String improve;
}
```

Frontend chỉ cần gửi `{ sessionId, rating, situationNote, ... }` — không cần `mentorId`/`userId`.

#### Option B (Nếu muốn giữ body schema)

Thêm endpoint mới cho student:

```
GET /api/mentor-bookings/by-application-detail/{applicationDetailId}
→ Returns full MentorInterviewBooking (mentorId, applicantUserId, sessionId, status, sessionKey, ...)
```

Auth check: chỉ trả booking nếu `booking.applicantUserId == currentUser.id`.

#### Option C (Ít thay đổi backend nhất)

Include 2 field trong response của `GET /api/application-details/application/{id}`:

```java
// ApplicationDetailResponse.java
private Long mentorId;         // null nếu chưa assign
private Long applicantUserId;  // = application.userId
```

Frontend sẽ tự lấy từ đây.

**→ Vui lòng chọn 1 option và cho biết option nào được implement.**

---

### GAP 2 (nhỏ): Polling review-status

Sau khi student submit review thành công, frontend cần re-fetch ApplicationDetail để cập nhật `mentorReview` (hiển thị "Reviewed" thay vì form). Hiện tại frontend navigate `-1` ngay sau submit → OK, nhưng nếu user F5 lại trang detail vẫn phải thấy status mới. Confirmed backend đã update ApplicationDetail.mentorReview khi POST /api/mentor-reviews thành công — không cần fix thêm.

---

## Output format

Trả về file Markdown đầy đủ, cấu trúc rõ ràng, có code example cho request/response body của TỪNG API endpoint. Tôi cần đọc file này là tự implement được 100% phía frontend.
