# 💬 Message gửi Backend — Mentor Review Flow Bug Report v2

> Copy toàn bộ nội dung bên dưới từ `--- BEGIN ---` đến `--- END ---` để gửi cho BE.

---

## --- BEGIN MESSAGE ---

Xin chào BE team,

Cảm ơn anh/chị đã review chi tiết bug report v1. Em đã đọc lại code controller + service + repository thực tế và test lại flow đúng theo spec của anh/chị. Báo cáo này là **v2 — em xin lỗi vì đã report nhiều bug không phải lỗi BE** (do em hiểu sai spec hoặc chưa trigger đủ flow).

**Tóm tắt**:

- **6/7 bug trong v1 là FE hiểu sai** → FE sẽ tự fix ở UI (không cần BE xử lý)
- **1 bug thật** (`DailyWebHookPayload` schema) → đã confirm lại, vẫn còn reproduce được
- **2 bug mới phát hiện** trong quá trình re-test → báo cáo bên dưới

**Tài khoản test**: student `mcneildavidson4970564@gmail.com` (userId=30), mentor `b@fpt.com` (userId=4), admin `thuson@gmail.com` (userId=1).

---

## ✅ Em thừa nhận hiểu sai (KHÔNG phải bug BE) — 6 items

| Bug cũ                                                | Em hiểu sai chỗ nào                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #1 App 36 detail trả `[]`                             | App 36 có `createdAt=2026-07-03T08:52:16` → **legacy data tạo trước commit `ffa9814` (12/07)**. JD 19 chỉ có 1 round MENTOR_REVIEW nên `moveToNextRound` không bao giờ chạy → detail không tạo. Em đã verify bằng cách check app 38 (createdAt 07/07) có detail OK, app 35 (createdAt 02/07 qua moveToNextRound) cũng có detail OK |
| #2 Không có `leave-session` endpoint                  | Đúng — design của BE là leave chỉ qua Daily.co webhook. Em đã bịa endpoint không tồn tại. Đã update UI, không gọi leave-session nữa                                                                                                                                                                                                |
| #3 `update-status?isApproved=true` set về `SCHEDULED` | Đúng theo code. Em hiểu nhầm `isApproved` là mentor review result, nhưng thực ra đây là admin duyệt booking pre-payment. Naming hơi confusing nhưng không phải bug                                                                                                                                                                 |
| #4 `join-session` body rỗng                           | Đúng design — `ResponseEntity.ok().build()` cố ý. FE cần optimistic update hoặc polling, không phải BE bug                                                                                                                                                                                                                         |
| #5 Booking không advance                              | Em **CHƯA trigger** `POST /api/mentor-reviews` (bước cuối). Đã verify: gọi mentor-reviews thì booking + session + detail đều advance COMPLETED                                                                                                                                                                                     |
| #6 `GET /api/mentor-bookings/{id}` không tồn tại      | Đúng — nhưng workaround đã có: `GET /api/application-details/{detailId}` response có `bookingId` + `sessionId`. FE sẽ refactor lấy từ application-details                                                                                                                                                                          |

Em cũng đã verify được `POST /api/application-details/hr-score?applicationDetailId=...&isPass=...&note=...&score=...` (endpoint HR override) hoạt động OK.

---

## 🐛 BUG #7 (v1) — DailyWebHookPayload schema sai (vẫn còn)

**Ai làm gì**: Daily.co thực sự gửi webhook `participant.left` khi user rời room. Em test 4 schema payload khác nhau để xem BE đọc đúng participant ID không.

**Gọi endpoint**: `POST /api/sessions/webhooks/dailyco`

**Schema Daily.co thực sự gửi** (từ Daily.co docs):

```json
{
  "version": "1.0.0",
  "type": "participant.left",
  "payload": {
    "session_id": "<daily_meeting_session_id>",
    "room": "session-1783880181338",
    "participant": {
      "user_id": "p_xyz789_st",
      "user_name": "student",
      "participant_id": "78fea256-e3ff-4091-b661-3dbc3d522d7f"
    }
  }
}
```

**Code BE hiện tại** (`DailyWebHookPayload.java`):

```java
public static class PayloadData {
    @JsonProperty("room") private String roomName;
    @JsonProperty("session_id") private String participantId;  // ← SAI — đây là meeting session_id
    private String recording_id;
}
```

**Kết quả test trên session 49** (`roomName=session-1783880181338`, `participantId1=p_xyz789_st`, `participantId2=m_join_mn`):

| Schema thử                                                                                | Payload key dùng làm participantId                      | endTime1 set?                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| Flat A `{event, session.id, participant.user_id}`                                         | (BE bỏ qua)                                             | ❌                                     |
| Nested B `{type, payload:{session_id, room, participant.participant_id}}` (Daily.co real) | payload.session_id (meeting id, không phải participant) | ❌                                     |
| Nested C `{type, payload:{session_id="p_xyz789_st", room}}`                               | payload.session_id                                      | ✅ Set endTime1 = 2026-07-13T01:42:15Z |
| Nested D `{type, payload:{session_id="m_join_mn", room}}`                                 | payload.session_id                                      | ✅ Set endTime2 = 2026-07-13T01:42:41Z |

**TraceID của session 49 sau webhook**:

- Trace sau Schema C: `6a53e005e7e2c35859629c7ff4461aee` — endTime1 set, durationSeconds1=1502 ✅
- Trace sau Schema D: endTime2=2026-07-13T01:42:41Z, durationSeconds2=1412 ✅

**Response mong đợi**: Gửi Daily.co format thực tế → BE đọc được `payload.participant.participant_id` → set đúng endTime1/endTime2.

**Sai chỗ nào**: BE đang map nhầm `payload.session_id` (Daily.co meeting session id) thành `participantId`. Daily.co thực sự không gửi participantId ở `payload.session_id`. Trường `payload.participant.participant_id` mới là participant id.

**Đề xuất fix**:

```java
public static class PayloadData {
    @JsonProperty("room") private String roomName;
    @JsonProperty("session_id") private String dailySessionId;  // ← đổi tên để rõ nghĩa
    private ParticipantData participant;
    private String recording_id;

    @Data
    public static class ParticipantData {
        @JsonProperty("participant_id") private String participantId;
    }
}
```

Sau đó update `SessionServiceImpl.updateLeaveRecord()`:

```java
String participantId = payload.getPayload().getParticipant() != null
    ? payload.getPayload().getParticipant().getParticipantId() : null;
```

→ Anh/chị đã track ở `MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md`, em note lại để confirm bug vẫn còn.

---

## 🐛 BUG MỚI #1 — `finalScore` nhân 10x sai khi mentor review

**Ai làm gì**: Mentor submit `POST /api/mentor-reviews` với body `rating=85` (điểm 0-100). Em check ApplicationDetail sau review thấy `finalScore` bị nhân 10.

**Gọi endpoint**: `POST /api/mentor-reviews`

**TraceID**: `6a53df96e79080b3a39cbf891d18ea27`

**Request**:

```json
{
  "sessionId": 49,
  "mentorId": 4,
  "userId": 30,
  "rating": 85,
  "situationNote": "Test situation",
  "taskNote": "Test task",
  "actionNote": "Test action",
  "resultNote": "Test result",
  "strength": "Good technical skills",
  "weakness": "Communication needs improvement",
  "improve": "Practice system design"
}
```

**Response**:

```json
{
  "id": 49,
  "rating": 85,
  "session": { ... },
  "traceId": "6a53df96e79080b3a39cbf891d18ea27"
}
```

**Check ApplicationDetail 45 sau review** (`GET /api/application-details/45` traceId `6a53df978662f1787f425d7f82c3852e`):

```json
{
  "id": 45,
  "applicationId": 35,
  "roundId": 174,
  "status": "COMPLETED",
  "finalScore": 850.0,         ← ⚠️ rating=85 nhưng finalScore=850 (×10)
  ...
}
```

**Sau khi HR override qua `POST /api/application-details/hr-score?applicationDetailId=45&isPass=false&note=Test+fail&score=40`**:

- finalScore đổi 850 → 40 (đúng = 40)

→ **HR-score dùng score raw**, nhưng **mentor-reviews nhân 10**. Không consistent.

**Câu hỏi**:

1. Rating scale đúng là gì (0-10 hay 0-100)?
2. Có nên nhân 10 không? Nếu rating là 0-10 thì BE nhân 10 để về 0-100 (hợp lý), nhưng cần document rõ.
3. Field `rating` trong request có bị giới hạn int max không? Nếu nhập rating=100 sẽ ra finalScore=1000 (vượt maxScore round thường là 100)?

---

## 🐛 BUG MỚI #2 — mentor-reviews duplicate key expose raw SQL error

**Ai làm gì**: Mentor submit mentor review 2 lần cho cùng 1 session (ví dụ: submit nhầm, muốn sửa).

**Gọi endpoint**: `POST /api/mentor-reviews`

**TraceID**: `6a53df9887695bf28dab785582b2cf19`

**Request lần 2**:

```json
{
  "sessionId": 49,
  "mentorId": 4,
  "userId": 30,
  "rating": 90,
  ...
}
```

**Response nhận được**:

```json
{
  "traceId": "6a53df9887695bf28dab785582b2cf19",
  "error": "could not execute statement [ERROR: duplicate key value violates unique constraint \"mentorreview_pkey\"\n  Detail: Key (session_id)=(49) already exists.] [insert into MentorReview (actionNote,improve,mentor_id,rating,resultNote,situationNote,strength,taskNote,user_id,weakness,session_id) values (?,?,?,?,?,?,?,?,?,?,?)]; SQL [insert into MentorReview (actionNote,improve,mentor_id,rating,resultNote,situationNote,strength,taskNote,user_id,weakness,session_id) values (?,?,?,?,?,?,?,?,?,?,?)]; constraint [mentorreview_pkey]"
}
```

**Kết quả mong đợi**: Một trong 2 cách:

- Trả về HTTP 409 Conflict với message: `"Mentor review already submitted for session 49"`
- HOẶC cho phép update qua `PUT /api/mentor-reviews` (endpoint này đã có trong OpenAPI với schema `UpdateMentorReviewRequest`)

**Sai chỗ nào**:

1. BE để lộ raw SQL error từ PostgreSQL → lộ thông tin DB schema (table `MentorReview`, column `session_id`, constraint `mentorreview_pkey`)
2. Không có cơ chế update hoặc reject duplicate gracefully

**Câu hỏi**:

1. Endpoint `PUT /api/mentor-reviews` có hoạt động không? Cần test với body theo schema `UpdateMentorReviewRequest`.
2. Nên wrap SQL exception thành `409 Conflict` + message thân thiện chứ?

---

## ✅ Test steps đã chạy đúng flow (sau khi điều chỉnh)

Em đã chạy lại flow đầy đủ trên session 49 + booking 13 + detail 45:

| Bước                      | API call                                              | TraceID                            | Kết quả                                            |
| ------------------------- | ----------------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| Verify BUG #1 legacy data | `GET /api/applications/36`                            | `6a53df396d0ed117e8d1682844300402` | createdAt=2026-07-03 → legacy ✅                   |
| Verify other apps OK      | `GET /api/application-details/application/38`         | `6a53df39e9ee0cbbb9995228f2c4f15f` | 1 detail OK ✅                                     |
| Pick-slot                 | `POST /api/mentor-bookings/pick-slot`                 | `6a53d9d5070c86890fa5532862f442f1` | booking 13 AWAITING_MENTOR ✅                      |
| Admin assign              | `POST /api/admin/mentor-bookings/13/assign-mentor`    | `6a53d9f544aff787fdadda3a7c85965b` | session 49 SCHEDULED, booking ROOM_CREATED ✅      |
| Student join              | `POST /api/sessions/join-session`                     | `6a53da84da29e83d80c53b01b0fa5a8a` | participantId1 set ✅                              |
| Mentor join               | `POST /api/sessions/join-session`                     | `6a53da9c3289920855771ebe9ac2cc11` | participantId2 set ✅                              |
| **Mentor review**         | `POST /api/mentor-reviews` (rating=85)                | `6a53df96e79080b3a39cbf891d18ea27` | booking 13 + session 49 + detail 45 → COMPLETED ✅ |
| HR override               | `POST /api/application-details/hr-score?...&score=40` | (no traceID)                       | finalScore override 850→40 ✅                      |
| Verify BE workaround      | `GET /api/application-details/45`                     | `6a53df978662f1787f425d7f82c3852e` | có bookingId=13, sessionId=49 ✅                   |
| Duplicate mentor review   | `POST /api/mentor-reviews` (lần 2)                    | `6a53df9887695bf28dab785582b2cf19` | Raw SQL duplicate key error ❌                     |

---

## 📝 Note phụ

- Em đã tạo data test thật trong DB (booking 13, session 49, mentor review 49) — nếu anh/chị muốn clean up thì OK.
- JD có 1 round duy nhất là MENTOR_REVIEW: **JD 19 (V6test)**, **JD 22 (HOT JOB)**. Student user 30 có application 36 (JD 19, createdAt 2026-07-03) → bị ảnh hưởng legacy data.
- App 35 (user 30, JD 18, createdAt 2026-07-02, currentRoundOrder=2) có detail 45 hợp lệ — em dùng app này để test flow.
- File báo cáo chi tiết: `BACKEND_BUG_REPORT_MENTOR_FLOW_V2_2026-07-13.md`

Cảm ơn anh/chị đã review kỹ!

--- END MESSAGE ---
