# Hướng dẫn Test End-to-End — Vòng Mentor Review

> **Last updated**: 2026-07-03
> **Backend Base**: `https://api.kdz.asia`

---

## Tổng quan luồng Mentor Review Round

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ứng viên thấy: "Mentor Interview" + nút [Enter Room]                      │
│  (roundType = MENTOR_REVIEW, status = PENDING)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ Bấm [Enter Room]
                                    ▼
                    ┌─────────────────────────────────────┐
                    │  Bước 1: Thanh toán                  │
                    │  Kiểm tra đã thanh toán chưa?         │
                    └─────────────────────────────────────┘
                        │                          │
                   Đã thanh toán             Chưa thanh toán
                        │                          │
                        ▼                          ▼
        ┌──────────────────────┐    ┌────────────────────────────┐
        │  Bước 2: Vào phòng  │    │  Thanh toán → PayOS      │
        │  Daily.co call       │    │  → Callback             │
        │  Mentor + Ứng viên   │    │  → Session PAID         │
        └──────────────────────┘    └────────────────────────────┘
                        │                          │
                        │   Call kết thúc          │
                        ▼                          ▼
        ┌──────────────────────────────────────────────┐
        │  Bước 3: Đánh giá Mentor                     │
        │  Form STAR rating + submit                     │
        │  POST /api/application-details/mentor-review/submit │
        └──────────────────────────────────────────────┘
```

---

## Luồng chi tiết từng bước

### Bước 1: Từ Application History → Enter Room

1. Vào `/user/application-history`
2. Chọn 1 application đang ở vòng Mentor Interview
3. Thấy timeline hiển thị "Mentor Interview" với nút **[Enter Room]**
4. Bấm **[Enter Room]**

→ Nhảy sang `/user/application/:applicationId/mentor-review?roundId=:roundId`

### Bước 2: Kiểm tra trạng thái

**Trên `ApplicationMentorReviewPage`**:

1. Lấy round config từ `useCurrentRound(applicationId)` → lấy `mentorInterview` info
2. Kiểm tra đã submit review chưa bằng `applicationDetailManager.getByApplicationId(applicationId)`
3. Hiển thị 1 trong 3 trạng thái:

| Trạng thái                    | UI hiển thị                                    |
| ----------------------------- | ---------------------------------------------- |
| **Chưa phỏng vấn**            | Thông tin mentor + nút "Đặt lịch / Thanh toán" |
| **Đã phỏng vấn, chưa review** | Form STAR rating + nút Submit                  |
| **Đã review**                 | Thông báo "Bạn đã đánh giá mentor này"         |

---

### Bước 2A: Chưa thanh toán

→ Hiển thị card thông tin mentor + nút "Thanh toán"

→ Ứng viên bấm "Thanh toán"
→ Gọi `sessionManager.makePayment(sessionId)` → PayOS redirect
→ Sau khi thanh toán thành công → session.status = PAID

### Bước 2B: Đã thanh toán → Vào phòng

→ Hiển thị thông tin mentor + nút "Vào phòng phỏng vấn"
→ Ứng viên bấm "Vào phòng phỏng vấn"
→ Nhảy sang `/user/mock-interview/room/:sessionId` (Daily.co video call)
→ Mentor cũng vào cùng phòng → Daily.co webhook cập nhật session ONGOING
→ Khi call kết thúc → session COMPLETED

### Bước 3: Đánh giá Mentor (Sau phỏng vấn)

→ Ứng viên quay lại `ApplicationMentorReviewPage`
→ Thấy form STAR rating để đánh giá mentor
→ Điền: rating (1-5 sao) + STAR fields (S/T/A/R) + strength/weakness/improve
→ Bấm **Submit**

→ Gọi API:

```
POST /api/application-details/mentor-review/submit
Body: {
  applicationId: number,
  roundId: number,
  sessionId: number,
  mentorId: number,
  userId: number,
  rating: number,           // 1-5
  situationNote?: string,     // STAR
  taskNote?: string,         // STAR
  actionNote?: string,       // STAR
  resultNote?: string,       // STAR
  strength?: string,
  weakness?: string,
  improve?: string
}
```

→ Backend cập nhật `ApplicationDetail.mentorReview`
→ Ứng viên thấy thông báo "Đã đánh giá mentor thành công"
→ Quay về Application History

---

## Hướng dẫn test E2E

### Điều kiện tiên quyết

1. Có 1 Application đang ở vòng Mentor Interview (roundOrder đã advance đến MENTOR_REVIEW)
2. Backend đã assign mentor cho vòng này (có `mentorInterview` trong round config)

### Test Case 1: Chưa thanh toán

1. Login với tài khoản ứng viên đã nộp đơn
2. Vào `/user/application-history`
3. Chọn application đang ở vòng Mentor Interview
4. Bấm **[Enter Room]**
5. **Kiểm tra**: Thấy thông tin mentor + nút "Thanh toán" (hoặc nút "Vào phòng" nếu đã thanh toán)

### Test Case 2: Thanh toán

1. Tiếp tục từ Test 1
2. Bấm "Thanh toán"
3. **Kiểm tra**: Redirect đến PayOS, thanh toán thành công
4. Quay về app → thấy nút "Vào phòng phỏng vấn"

### Test Case 3: Vào phòng phỏng vấn

1. Tiếp tục từ Test 2
2. Bấm "Vào phòng phỏng vấn"
3. **Kiểm tra**: Nhảy sang `/user/mock-interview/room/:sessionId`
4. Thấy video call interface (Daily.co)
5. Mentor join cùng phòng (dùng tài khoản mentor khác)
6. **Kiểm tra**: Cả 2 có thể thấy nhau trên video call
7. Mentor leave call → call kết thúc

### Test Case 4: Đánh giá Mentor

1. Sau khi call kết thúc, quay lại app
2. Vào `/user/application-history`
3. Chọn application → bấm **[Enter Room]** vòng Mentor Interview
4. **Kiểm tra**: Thấy form STAR rating
5. Điền: Rating 5 sao + các trường STAR
6. Bấm **Submit**
7. **Kiểm tra**:
   - Toast "Đánh giá đã được gửi thành công"
   - Quay về Application History
   - Thấy vòng Mentor Interview đã hoàn thành (có icon ✓)

### Test Case 5: Đã đánh giá rồi

1. Bấm [Enter Room] vòng Mentor Interview đã đánh giá
2. **Kiểm tra**: Thấy thông báo "Bạn đã đánh giá mentor này"
3. Form bị disabled, không cho submit lại

---

## Backend API endpoints cần có

### 1. Tạo Session cho Mentor Review Round

```
POST /api/sessions/create-session
Body: {
  userId: number,
  mentorId: number,
  duration: number,
  totalPrice: number,
  // ...
}
```

### 2. Thanh toán Session

```
GET /api/sessions/make-payment?sessionId=:sessionId
→ PayOS URL
```

### 3. Cập nhật trạng thái thanh toán

```
GET /api/sessions/update-status?sessionId=:sessionId&isApproved=true
→ session.status = PAID
```

### 4. Join Session (Daily.co)

```
POST /api/sessions/join-session
Body: {
  sessionId: number,
  isMentor: boolean  // true cho mentor, false cho user
}
```

### 5. Submit Mentor Review

```
POST /api/application-details/mentor-review/submit
Body: {
  applicationId: number,
  roundId: number,
  sessionId: number,
  mentorId: number,
  userId: number,
  rating: number,
  situationNote?: string,
  taskNote?: string,
  actionNote?: string,
  resultNote?: string,
  strength?: string,
  weakness?: string,
  improve?: string
}
```

---

## Fix cần thực hiện trên FE

### Issue: Khi bấm Enter Room MENTOR_REVIEW → Hiển thị đánh giá Mentor ngay

**Hiện tại**: `ApplicationMentorReviewPage` hiển thị form STAR rating ngay khi mount, không kiểm tra trạng thái phỏng vấn.

**Fix cần làm**: Thêm trạng thái hiển thị:

```typescript
// Trạng thái 1: Chưa thanh toán
// → Hiển thị thông tin mentor + nút "Thanh toán"

// Trạng thái 2: Đã thanh toán, chưa phỏng vấn
// → Hiển thị thông tin mentor + nút "Vào phòng phỏng vấn"

// Trạng thái 3: Đã phỏng vấn, chưa review
// → Hiển thị form STAR rating

// Trạng thái 4: Đã review
// → Hiển thị thông báo "Đã đánh giá mentor"
```

### Issue: Chưa có luồng tạo Session cho MENTOR_REVIEW

Khi vào `ApplicationMentorReviewPage` lần đầu (chưa có session), cần tạo session trước:

```typescript
useEffect(() => {
  // Kiểm tra đã có session chưa
  if (!existingSession) {
    // Tạo session mới
    sessionManager.create({
      userId: user.id,
      mentorId: mentorInfo.mentorId,
      duration: mentorInfo.duration,
      totalPrice: mentorInfo.totalPrice,
    });
  }
}, [applicationId, mentorInfo]);
```

### Issue: Chưa có nút thanh toán

Nếu `session.status === "SCHEDULED"` (chưa thanh toán), hiển thị nút thanh toán:

```tsx
{
  session?.status === "SCHEDULED" && <Button onClick={handlePayment}>Thanh toán</Button>;
}
```

### Issue: Chưa có nút vào phòng

Nếu `session?.status === "PAID"`, hiển thị nút vào phòng:

```tsx
{
  session?.status === "PAID" && (
    <Button onClick={() => navigate(`/user/mock-interview/room/${session.id}`)}>
      Vào phòng phỏng vấn
    </Button>
  );
}
```
