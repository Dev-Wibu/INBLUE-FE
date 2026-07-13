# 🐛 Backend Bug Report — Mentor Review Flow (v2 — sau khi đối chiếu code BE)

**Ngày test**: 13/07/2026
**Môi trường**: `https://api.kdz.asia` (Production)
**Test accounts**: student `mcneildavidson4970564@gmail.com`, mentor `b@fpt.com`, admin `thuson@gmail.com`

---

## ✅ FE thừa nhận hiểu sai / thiếu bước (KHÔNG phải bug BE)

Sau khi đối chiếu với code thực tế, FE nhận thấy **6/7 bug trong báo cáo v1 là do FE hiểu sai spec** hoặc **FE chưa trigger đủ flow**. Tóm tắt:

| BUG cũ                                                    | Sau đối chiếu                                                                                                                                                          | Hành động của FE                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **#1** App 36 detail trả `[]`                             | ✅ ĐÚNG legacy data — app tạo 03/07/2026 trước commit `ffa9814` (12/07). JD 19 chỉ có 1 round MENTROR_REVIEW → `moveToNextRound` không bao giờ chạy → detail không tạo | FE đã dùng app 35 round 174 để test thay (createdAt 02/07, đã qua moveToNextRound → có detail 45) |
| **#2** Không có `leave-session` endpoint                  | ✅ ĐÚNG design — leave chỉ qua **Daily.co webhook** `participant.left`. FE tự bịa endpoint                                                                             | FE cập nhật flow, không gọi leave-session nữa                                                     |
| **#3** `update-status?isApproved=true` set về `SCHEDULED` | ✅ ĐÚNG theo code — đây là admin duyệt booking pre-payment. Naming confusing nhưng không phải bug                                                                      | FE thông báo để BA confirm ngữ nghĩa                                                              |
| **#4** `join-session` body rỗng                           | ✅ ĐÚNG design — `ResponseEntity.ok().build()` cố ý. FE polling là hợp lệ                                                                                              | FE cập nhật UI: optimistic update sau join                                                        |
| **#5** Booking không advance                              | ✅ ĐÚNG một nửa — FE chưa gọi `POST /api/mentor-reviews` (bước cuối). Đã verify: **gọi mentor-reviews thì booking + session + detail đều advance COMPLETED**           | FE fix UI: thêm mentor review form trigger submit                                                 |
| **#6** `GET /api/mentor-bookings/{id}` không tồn tại      | ✅ ĐÚNG — BE workaround qua `GET /api/application-details/{detailId}` (response có `bookingId` + `sessionId`)                                                          | FE refactor lấy bookingId từ application-details thay vì gọi GET booking                          |

→ **6 bug cũ → fix ở FE**, không phải bug BE.

---

## 🐛 BUG THẬT — BUG #7 (cũ) confirmed lại: DailyWebHookPayload schema sai

**Ai làm gì**: Daily.co gửi webhook `participant.left` khi user rời room. BE nhận webhook để set `endTime1`/`endTime2` + `durationSeconds1/2` cho session. **Nhưng endTime không bao giờ được set khi user thực sự leave qua Daily.co.**

**TraceID các test webhook (BE đã track ở `MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md`)**:

```
Schema test trong session 49 (roomName=session-1783880181338, participantId1=p_xyz789_st, participantId2=m_join_mn):

| Payload thử | Schema                                              | endTime1 set? |
| ----------- | --------------------------------------------------- | ------------- |
| Flat A      | {event, session.id, participant.user_id}            | ❌ Không      |
| Nested B    | Daily.co thực: {type, payload:{participant.participant_id, room, session_id}} | ❌ Không      |
| Nested C    | {type, payload:{session_id=participant_pid, room}}  | ✅ Có (BE đang map session_id → participantId theo code cũ) |
| Nested D    | {type, payload:{session_id=mentor_pid, room}}       | ✅ Có endTime2=2026-07-13T01:42:41Z, durationSeconds2=1412 |
```

**Gọi endpoint**: `POST /api/sessions/webhooks/dailyco`

**Request format mà BE đang chấp nhận (theo code)**:

```json
{
  "type": "participant.left",
  "payload": {
    "session_id": "p_xyz789_st", // ← BE map thành participantId
    "room": "session-1783880181338"
  }
}
```

**Request format Daily.co thực sự gửi** (từ Daily.co docs):

```json
{
  "version": "1.0.0",
  "type": "participant.left",
  "payload": {
    "session_id": "<daily_meeting_session_id>", // ← Đây là meeting ID, KHÔNG phải participant
    "room": "session-1783880181338",
    "participant": {
      "user_id": "p_xyz789_st",
      "user_name": "student",
      "participant_id": "78fea256-e3ff-4091-b661-3dbc3d522d7f" // ← Đây mới là participant
    }
  }
}
```

**Kết quả mong đợi**:

- Gửi Daily.co format thực tế → BE đọc được `payload.participant.participant_id` → set đúng `endTime1/endTime2`
- Hiện tại `endTime1/endTime2/durationSeconds1/2` chỉ set được nếu payload sai format (trùng tên trường)

**Sai chỗ nào**:

- `DailyWebHookPayload.java` đang map `payload.session_id` thành `participantId`
- Theo code BE phản hồi (`fpt/org/inblue/model/dto/dailyco/DailyWebHookPayload.java`):
  ```java
  @Data
  public class PayloadData {
      @JsonProperty("room") private String roomName;
      @JsonProperty("session_id") private String participantId;   // ← SAI
      private String recording_id;
  }
  ```
- Daily.co thực sự không gửi `participantId` ở `payload.session_id` — đó là meeting session id
- `payload.participant.participant_id` mới là participant id

**Verify trên session 49 (sau test)**:

```
Trace ID get session 49: 6a53e005e7e2c35859629c7ff4461aee
participantId1=p_xyz789_st, startTime1=2026-07-13T01:17:13Z
Sau khi gửi webhook Schema C (payload.session_id="p_xyz789_st"):
  endTime1=2026-07-13T01:42:15Z ✅ set
  durationSeconds1=1502 ✅ set
Sau khi gửi webhook Schema D (payload.session_id="m_join_mn"):
  endTime2=2026-07-13T01:42:41Z ✅ set
  durationSeconds2=1412 ✅ set
```

→ Webhook chỉ hoạt động khi `payload.session_id` TRÙNG VỚI `participantId` thực tế. **Real Daily.co webhook không bao giờ trigger được logic này** (vì Daily.co gửi `session_id` là meeting ID, không phải participant ID).

→ Khi user thật sự leave trong phòng Daily.co, BE không nhận được `endTime`/`duration`. Đây là root cause của issue "session không bao giờ COMPLETED khi user leave thật".

**Đề xuất fix BE** (anh/chị đã track ở investigation file):

```java
public static class PayloadData {
    @JsonProperty("room") private String roomName;
    @JsonProperty("session_id") private String dailySessionId;
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

---

## 🐛 BUG PHỤ (mới tìm) — `finalScore` nhân 10x sai khi mentor review

**Ai làm gì**: Mentor submit `POST /api/mentor-reviews` body `rating=85` (điểm 0-100).

**TraceID**: `6a53df96e79080b3a39cbf891d18ea27` (POST mentor-reviews)

**Gọi endpoint**: `POST /api/mentor-reviews`

**Request**:

```json
{
  "sessionId": 49,
  "mentorId": 4,
  "userId": 30,
  "rating": 85,
  "situationNote": "...",
  "taskNote": "...",
  "actionNote": "...",
  "resultNote": "...",
  "strength": "...",
  "weakness": "...",
  "improve": "..."
}
```

**Response**:

```json
{
  "id": 49,
  "rating": 85,
  "session": { ... },
  ...
}
```

**Check ApplicationDetail 45 sau review** (`GET /api/application-details/45` traceId `6a53df978662f1787f425d7f82c3852e`):

```json
{
  "id": 45,
  "applicationId": 35,
  "roundId": 174,
  "status": "COMPLETED",
  "finalScore": 850.0,     ← ⚠️ rating=85 NHƯNG finalScore=850 (×10)
  ...
}
```

**Sai chỗ nào**: BE đang nhân rating với 10. rating=85 → finalScore=850.

Sau khi HR override qua `POST /api/application-details/hr-score?applicationDetailId=45&isPass=false&note=Test+fail&score=40`:

- finalScore đổi 850 → 40 (đúng = 40)

→ **HR-score dùng score raw**, nhưng **mentor-reviews nhân 10**. Không consistent.

**Câu hỏi**:

1. Rating scale đúng là gì (0-10 hay 0-100)?
2. Có nên nhân 10 không? Nếu rating là 0-10 thì BE nhân 10 để về 0-100 (hợp lý), nhưng cần document rõ.
3. Field `rating` trong request có bị giới hạn int max không? Nếu nhập rating=100 sẽ ra finalScore=1000 (vượt maxScore round)?

→ **BUG THẬT** nhưng severity thấp. Cần BE clarify convention.

---

## 🐛 BUG PHỤ (mới tìm) — mentor-reviews duplicate key khi submit lần 2

**Ai làm gì**: Mentor hoặc HR submit mentor review 2 lần cho cùng 1 session.

**TraceID**: `6a53df9887695bf28dab785582b2cf19`

**Gọi endpoint**: `POST /api/mentor-reviews`

**Request lần 2**:

```json
{
  "sessionId": 49,
  "mentorId": 4,
  "userId": 30,
  "rating": 90,
  "strength": "Second submit",
  ...
}
```

**Response**:

```json
{
  "traceId": "6a53df9887695bf28dab785582b2cf19",
  "error": "could not execute statement [ERROR: duplicate key value violates unique constraint \"mentorreview_pkey\"\n  Detail: Key (session_id)=(49) already exists.] [insert into MentorReview ...]"
}
```

**Kết quả mong đợi**: PUT update (đã có endpoint `PUT /api/mentor-reviews` với schema `UpdateMentorReviewRequest`) HOẶC return 409 Conflict với message rõ ràng "Mentor review already submitted for this session".

**Sai chỗ nào**: BE để lộ raw SQL error từ PostgreSQL ra ngoài response → lộ thông tin DB schema (table name, column name). Ngoài ra, nên có cơ chế update hoặc reject duplicate gracefully.

**Câu hỏi**:

1. Có endpoint update không? (`PUT /api/mentor-reviews` đã có trong OpenAPI, test được không?)
2. Nên wrap SQL exception thành `409 Conflict` + message thân thiện?

---

## ✅ Test steps đã chạy đúng flow (sau khi điều chỉnh theo BE phản hồi)

### Test 1: Verify BUG #1 là legacy data

- `GET /api/applications/36` → `createdAt=2026-07-03T08:52:16` → **legacy, trước commit `ffa9814`** ✅
- `GET /api/application-details/application/38` → có detail 48 (COMPLETED, JD 8 createdAt 07/07) ✅
- `GET /api/application-details/application/35` → có detail 45 (JD 18, app createdAt 02/07, qua moveToNextRound) ✅

### Test 2: Verify flow đầy đủ với session 49 + booking 13

| Bước              | API call                                                                                             | TraceID                            | Kết quả                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Pick-slot         | `POST /api/mentor-bookings/pick-slot` (detail 45)                                                    | `6a53d9d5070c86890fa5532862f442f1` | booking 13 AWAITING_MENTOR ✅                                                                   |
| Admin assign      | `POST /api/admin/mentor-bookings/13/assign-mentor` (mentor 4)                                        | `6a53d9f544aff787fdadda3a7c85965b` | session 49 SCHEDULED, booking 13 ROOM_CREATED ✅                                                |
| Student join      | `POST /api/sessions/join-session`                                                                    | `6a53da84da29e83d80c53b01b0fa5a8a` | participantId1 set, status ONGOING ✅                                                           |
| Mentor join       | `POST /api/sessions/join-session`                                                                    | `6a53da9c3289920855771ebe9ac2cc11` | participantId2 set ✅                                                                           |
| **Mentor review** | `POST /api/mentor-reviews` (rating=85)                                                               | `6a53df96e79080b3a39cbf891d18ea27` | **booking 13 → COMPLETED, session 49 → COMPLETED, detail 45 → COMPLETED + finalScore=850.0** ✅ |
| HR override       | `POST /api/application-details/hr-score?applicationDetailId=45&isPass=false&note=Test+fail&score=40` | (trống)                            | **finalScore override 850 → 40** ✅                                                             |

### Test 3: Verify BE workaround cho `GET /api/mentor-bookings/{id}`

- `GET /api/application-details/45` → response có field `bookingId=13, sessionId=49` ✅
- FE có thể dùng endpoint này thay cho GET booking detail

### Test 4: Verify DailyWebHookPayload schema bug

- Gửi 4 schema khác nhau qua `POST /api/sessions/webhooks/dailyco`
- **Chỉ schema sai (BE map nhầm session_id → participantId) mới trigger set endTime**
- Schema đúng Daily.co (`payload.participant.participant_id`) → BE bỏ qua

---

## 📊 Tổng hợp bug cần BE xử lý

| Bug                                    | Severity | Mô tả ngắn                                                      | Đã track ở đâu                                      |
| -------------------------------------- | -------- | --------------------------------------------------------------- | --------------------------------------------------- |
| DailyWebHookPayload schema sai         | 🔴 P0    | Real Daily.co webhook không set được endTime                    | `MENTOR_LEAVE_TIME_BUG_INVESTIGATION_2026-07-12.md` |
| `finalScore` nhân 10x                  | 🟡 P1    | Mentor rating 85 → finalScore 850 (maxScore vòng là 100)        | Mới phát hiện trong test này                        |
| Mentor review duplicate key expose SQL | 🟢 P2    | POST /api/mentor-reviews 2 lần cho cùng session → raw SQL error | Mới phát hiện trong test này                        |

---

## 📎 TraceID index cho BE grep log

```
# BUG #1 legacy data verification
6a53df396d0ed117e8d1682844300402  | GET app 36 (createdAt=2026-07-03, legacy)
6a53df39e9ee0cbbb9995228f2c4f15f  | GET app 38 details (1 detail OK)
6a53df3a7d8b2e8c5334d804f8021138  | GET app 35 details (1 detail OK)

# Flow đúng (booking 13 / session 49)
6a53d9d5070c86890fa5532862f442f1  | POST pick-slot (booking 13)
6a53d9f544aff787fdadda3a7c85965b  | POST assign-mentor (session 49)
6a53da84da29e83d80c53b01b0fa5a8a  | GET session 49 after student join
6a53da9c3289920855771ebe9ac2cc11  | GET session 49 after mentor join
6a53df96e79080b3a39cbf891d18ea27  | POST mentor-reviews (COMPLETED)
6a53df978662f1787f425d7f82c3852e  | GET application-detail 45 after review

# Daily.co webhook
6a53e005e7e2c35859629c7ff4461aee  | GET session 49 (current state)
(webhook POSTs return empty body, không có traceID riêng trong response)

# HR score
(no traceID returned, response empty)

# Duplicate mentor review
6a53df9887695bf28dab785582b2cf19  | POST mentor-reviews 2nd time (duplicate key)
```
