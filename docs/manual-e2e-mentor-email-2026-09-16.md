# Hướng dẫn test thủ công lần 2: Mentor Review và Email

Tài liệu này dùng với backend `https://api.kdz.asia` và frontend local. Thay toàn bộ giá trị dạng `<...>` bằng ID/token thật lấy trong lần test.

## 1. Chuẩn bị trên Swagger

1. Mở `https://api.kdz.asia/swagger-ui/index.html`.
2. Đăng nhập từng tài khoản Candidate, Mentor, Admin và Staff trên frontend hoặc gọi `POST /api/auth/login`:

```json
{
  "email": "<EMAIL_THEO_ROLE>",
  "password": "<PASSWORD>"
}
```

3. Sao chép access token trong response hoặc Local Storage, bấm **Authorize** trên Swagger và nhập `Bearer <TOKEN>`.
4. Không dùng cùng một token cho các bước khác role. Đăng nhập lại/Authorize lại trước mỗi nhóm test.
5. Ghi sẵn các biến: `<APPLICATION_ID>`, `<APPLICATION_DETAIL_ID>`, `<CANDIDATE_USER_ID>`, `<MENTOR_ID>`, `<SESSION_ID>`.

## 2. Test luồng duyệt lịch ONLINE

### Bước A - Admin gán mentor

Role: `ADMIN`.

Gán thẳng một mentor:

```http
PUT /api/application-details/<APPLICATION_DETAIL_ID>/assign-mentor?mentorId=<MENTOR_ID>
Authorization: Bearer <ADMIN_TOKEN>
```

Kỳ vọng: HTTP 200, `status = "PENDING"`, `mentorId = <MENTOR_ID>` và chưa có `sessionId`.

Hoặc đề xuất nhiều mentor:

```http
PUT /api/application-details/<APPLICATION_DETAIL_ID>/assign-mentors
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "mentorIds": [<MENTOR_ID_1>, <MENTOR_ID_2>]
}
```

Kỳ vọng: HTTP 200, `status = "AWAITING_CANDIDATE_SELECT_MENTOR"`, `mentorId = null`.

### Bước B - Candidate chọn mentor nếu Admin gán nhiều

Role: `USER` của đúng hồ sơ.

```http
GET /api/application-details/<APPLICATION_DETAIL_ID>/assigned-mentors
Authorization: Bearer <CANDIDATE_TOKEN>
```

Chọn một ID đúng trong response:

```http
PUT /api/application-details/<APPLICATION_DETAIL_ID>/select-mentor?mentorId=<MENTOR_ID>
Authorization: Bearer <CANDIDATE_TOKEN>
```

Kỳ vọng: HTTP 200, `status = "PENDING"`, `mentorId` có giá trị. Test âm thêm một ID không nằm trong danh sách, kỳ vọng HTTP 400.

### Bước C - Candidate đề xuất lịch ONLINE

Role: `USER`. Chọn giờ tương lai và giữ offset `+07:00`.

```http
POST /api/sessions/create-for-round
Authorization: Bearer <CANDIDATE_TOKEN>
Content-Type: application/json

{
  "applicationDetailId": <APPLICATION_DETAIL_ID>,
  "joinTime": "2026-09-20T14:00:00+07:00",
  "duration": 45,
  "offline": false
}
```

Kỳ vọng response HTTP 200 là placeholder: `id = 0`, `status = null`. Không dùng ID này làm session thật.

Đọc nguồn sự thật:

```http
GET /api/application-details/<APPLICATION_DETAIL_ID>
Authorization: Bearer <CANDIDATE_TOKEN>
```

Kỳ vọng:

- `status = "AWAITING_MENTOR_SCHEDULE_APPROVAL"`.
- `sessionId` và `sessionInfo.sessionId` chưa có ID dương.
- `sessionInfo.pendingJoinTime` đúng giờ vừa gửi.
- `sessionInfo.pendingDurationMinutes = 45`.
- UI Candidate hiển thị bước “Chờ mentor duyệt lịch”, nút **Làm mới** và **Đổi lịch đề xuất**.

Gửi lại cùng endpoint với giờ khác trước khi mentor xử lý. Kỳ vọng pending time bị ghi đè, không tạo session.

### Bước D1 - Mentor duyệt

Role: `MENTOR` đang được gán. Endpoint không nhận `mentorId`.

```http
GET /api/application-details/mentor/pending-schedules
Authorization: Bearer <MENTOR_TOKEN>
```

Kỳ vọng item có `applicationDetailId`, candidate, `proposedJoinTime`, `proposedDurationMinutes`. UI Mentor Overview phải hiện cùng item.

```http
POST /api/application-details/<APPLICATION_DETAIL_ID>/schedule-decision
Authorization: Bearer <MENTOR_TOKEN>
Content-Type: application/json

{
  "approved": true
}
```

Kỳ vọng HTTP 200:

- Detail trở về `status = "PENDING"`.
- Có `sessionId` dương ở top-level hoặc `sessionInfo.sessionId`.
- `pendingJoinTime` và `pendingDurationMinutes` bị xóa.
- Item biến mất khỏi hàng chờ Mentor.

Đọc session thật:

```http
GET /api/sessions/<SESSION_ID>
Authorization: Bearer <CANDIDATE_TOKEN>
```

Kỳ vọng `status = "SCHEDULED"`, `roomName`/`roomUrl` có giá trị, `joinTime` đúng giờ. UI Candidate chuyển sang bước chờ vào phòng.

### Bước D2 - Mentor từ chối (chạy trên hồ sơ/lần gán khác)

```http
POST /api/application-details/<APPLICATION_DETAIL_ID>/schedule-decision
Authorization: Bearer <MENTOR_TOKEN>
Content-Type: application/json

{
  "approved": false,
  "reason": "Mình bận khung giờ này, bạn chọn giúp buổi tối trong tuần nhé"
}
```

Kỳ vọng:

- Không tạo session.
- `mentorId = null`.
- Có `sessionInfo.mentorRejectReason`, `mentorRejectedAt`, `rejectedMentorId`.
- Còn mentor khác: status `AWAITING_CANDIDATE_SELECT_MENTOR`.
- Hết mentor khác: status `AWAITING_MENTOR`, xuất hiện lại trong hàng chờ Admin.
- UI Candidate hiển thị banner lý do từ chối.

Test lỗi bắt buộc:

```json
{ "approved": false, "reason": "   " }
```

Kỳ vọng HTTP 400. Gửi reason dài hơn 1000 ký tự cũng phải nhận HTTP 400. Dùng token mentor khác phải nhận HTTP 403.

## 3. Test sau buổi phỏng vấn

Join Candidate:

```http
POST /api/sessions/join-session
Authorization: Bearer <CANDIDATE_TOKEN>
Content-Type: application/json

{
  "sessionName": "<ROOM_NAME>",
  "userId": <CANDIDATE_USER_ID>,
  "participantId": "<DAILY_PARTICIPANT_ID>",
  "isMentor": false
}
```

Join Mentor:

```json
{
  "sessionName": "<ROOM_NAME>",
  "userId": <MENTOR_ID>,
  "participantId": "<DAILY_PARTICIPANT_ID>",
  "isMentor": true
}
```

Sau khi cả hai rời phòng và webhook cập nhật, `GET /api/sessions/<SESSION_ID>` phải trả `status = "COMPLETED"`.

Mentor chấm Candidate:

```http
POST /api/mentor-reviews
Authorization: Bearer <MENTOR_TOKEN>
Content-Type: application/json

{
  "sessionId": <SESSION_ID>,
  "mentorId": <MENTOR_ID>,
  "userId": <CANDIDATE_USER_ID>,
  "rating": 85,
  "situationNote": "Ứng viên hiểu đúng bối cảnh",
  "taskNote": "Xác định đúng mục tiêu",
  "actionNote": "Trình bày cách xử lý rõ ràng",
  "resultNote": "Kết quả đáp ứng yêu cầu",
  "strength": "Giao tiếp mạch lạc",
  "weakness": "Thiếu ví dụ định lượng",
  "improve": "Bổ sung số liệu và trade-off"
}
```

Candidate chấm Mentor:

```http
POST /api/mentor-feedbacks
Authorization: Bearer <CANDIDATE_TOKEN>
Content-Type: application/json

{
  "sessionId": <SESSION_ID>,
  "mentorId": <MENTOR_ID>,
  "userId": <CANDIDATE_USER_ID>,
  "rating": 5,
  "comment": "Mentor giải thích rõ và đưa phản hồi hữu ích"
}
```

Sau request đầu tiên, detail chưa được phép tự coi là hoàn tất. Sau khi có đủ cả hai, `GET /api/application-details/<APPLICATION_DETAIL_ID>` phải có `status = "COMPLETED"`, `finalScore` và `finalResult`.

## 4. Test luồng OFFLINE

Tạo một detail khác ở trạng thái `PENDING`, đã có mentor:

```json
{
  "applicationDetailId": <APPLICATION_DETAIL_ID>,
  "joinTime": "2026-09-21T09:00:00+07:00",
  "duration": 60,
  "offline": true
}
```

Kỳ vọng tạo session thật ngay, `sessionInfo.meetingType = "OFFLINE"`, session `COMPLETED`; không xuất hiện trong hàng chờ duyệt lịch. Không bấm submit hai lần vì backend hiện chưa chặn tạo OFFLINE trùng.

## 5. Test nút vận hành Email

Role: `ADMIN` hoặc `STAFF`. Trên trang Chấm ứng viên, kiểm tra cụm nút nhỏ **Quét hộp thư** và **Chấm email**.

1. Gửi email thật vào mailbox với subject chứa `[INBLUE-APP-<APPLICATION_ID>]`.
2. Bấm **Quét hộp thư** hoặc gọi:

```http
POST /api/email-submissions/fetch
Authorization: Bearer <ADMIN_OR_STAFF_TOKEN>
```

Request không có body/query. Response là text, không phải JSON. Sau đó:

```http
GET /api/email-submissions
Authorization: Bearer <ADMIN_OR_STAFF_TOKEN>
```

Kỳ vọng email mới có `status = "PENDING"`. Subject thiếu token phải thành `IGNORED`.

3. Bấm **Chấm email** hoặc gọi:

```http
POST /api/email-submissions/process-pending
Authorization: Bearer <ADMIN_OR_STAFF_TOKEN>
```

Request không có body/query. Không retry ngay nếu timeout. Đọc lại `GET /api/email-submissions`:

- Thành công: email thường `PROCESSED`.
- Lỗi AI/data: email `ERROR` và có `errorMessage`.
- Backend xử lý cả `PENDING` và `ERROR`.

4. Xác minh kết quả bằng `GET /api/application-details/application/<APPLICATION_ID>`. Tìm đúng detail có `submissionData.emailSubmissionId = <EMAIL_ID>`, `status = "AI_EVALUATED"`, có `aiScore`/`structuredAiFeedback`.
5. Kiểm tra UI ở Candidate, Staff và Admin: `improvementAdvice` hiển thị thành danh sách; tên metric ưu tiên `metricResults[].name`, dữ liệu cũ dạng chuỗi vẫn hiển thị được.

## 6. Checklist kết thúc

- Không endpoint nào dùng session ID `0`.
- Không có polling 5/30 giây trong Network; chỉ refetch khi focus, action hoặc bấm làm mới.
- Hàng chờ Admin không chứa `AWAITING_MENTOR_SCHEDULE_APPROVAL`.
- Mentor chỉ thấy đề xuất của chính token đang đăng nhập.
- Candidate không thấy nút fetch/process email.
- Sau mỗi mutation, GET nguồn sự thật trả đúng status trước khi kết luận pass.
- Khi lỗi có `traceId`, ghi lại cùng thời gian, role, endpoint và request body để đối chiếu backend.
