# 💬 Backend Bug Report v3 — Zalo message (gọn, dễ đọc mobile)

> File này format cho copy-paste gửi BE qua Zalo. Mỗi bug theo format user yêu cầu:
> **[role] đang làm gì** → **traceId** → **endpoint** → **request** → **response** → **mong đợi vs thực tế** → **sai chỗ nào**

---

## 📊 Tóm tắt nhanh (5 giây đọc)

```
🔴 P0  Daily.co webhook bị nuốt → endTime không bao giờ set khi user leave thật
🟡 P1  finalScore = rating × maxScore/10 (rating 0-10 → ÷10 → 0-100) nhưng không validate
🟢 P2  MentorReview PK = session_id (1-1), submit 2 lần → 500 + lộ raw SQL error
```

→ **FE v2 đã được BE confirm 100% là 3 bug thật**. BE đã verify code trong `master` HEAD `3a290d5` và đồng ý đề xuất fix của FE. File này là recap ngắn cho Zalo.

---

## --- BEGIN MESSAGE ---

Xin chào BE team,

Cảm ơn a/c đã verify lại v2 — em xin lỗi đã làm a/c mất công review. Tin này em tóm tắt gọn 3 bug a/c vừa confirm + câu hỏi cần a/c quyết định trước khi fix.

**Test accounts**: student `mcneildavidson4970564@gmail.com` (uid 30), mentor `b@fpt.com` (uid 4), admin `thuson@gmail.com` (uid 1).

---

### 🐛 BUG #1 — Daily.co `participant.left` webhook bị nuốt

**[role] Ai làm gì**: Student user 30 và mentor user 4 join session 49 (room `session-1783880181338`), rồi rời room. Em mong `endTime1` + `durationSeconds1` của session sẽ set — nhưng **không bao giờ set** khi leave thật qua Daily.co.

**traceId**: `6a53e005e7e2c35859629c7ff4461aee` (session 49 final state)

**Endpoint**: `POST /api/sessions/webhooks/dailyco`

**Kết quả test 4 schema trên session 49**:

| Schema payload | participantId mà BE đọc | endTime set? |
|---|---|---|
| A) Flat `{event, session.id, participant.user_id}` | không map được | ❌ |
| B) Daily.co thật `{type, payload:{session_id, room, participant.participant_id}}` | `payload.session_id` = meeting id | ❌ |
| C) `{type, payload:{session_id="p_xyz789_st", room}}` (giả lập) | đúng vì `session_id === participantId1` | ✅ `endTime1=01:42:15Z`, `duration=1502s` |
| D) `{type, payload:{session_id="m_join_mn", room}}` (giả lập) | đúng vì `session_id === participantId2` | ✅ `endTime2=01:42:41Z`, `duration=1412s` |

→ **Chỉ schema sai (trùng tên trường) mới trigger được set endTime**. Real Daily.co webhook bị bỏ qua.

**Code BE sai** (`DailyWebHookPayload.java` PayloadData):
```java
@JsonProperty("room") private String roomName;
@JsonProperty("session_id") private String participantId;  // ← MAP NHẦM
private String recording_id;
```

**Response mong đợi vs thực tế**:
| | Mong đợi | Thực tế |
|---|---|---|
| Daily.co gửi `payload.participant.participant_id="p_xyz789_st"` | `endTime1` được set | `endTime1` = null mãi mãi |
| Daily.co gửi `payload.session_id="abc-def-meeting-id"` | BE chỉ log | BE đang dùng nó làm participantId |

**Sai chỗ nào**: `DailyWebHookPayload.java` map `payload.session_id` (Daily.co meeting session id) thành `participantId`. Daily.co thực sự không bao giờ gửi participant id ở `session_id` — cái đó là UUID của meeting room. Participant id nằm ở `payload.participant.participant_id`.

**Đề xuất fix** (a/c confirm PR ready):
```java
public static class PayloadData {
    @JsonProperty("room") private String roomName;
    @JsonProperty("session_id") private String dailySessionId;  // rename
    private ParticipantData participant;
    private String recording_id;
    
    @Data
    public static class ParticipantData {
        @JsonProperty("participant_id") private String participantId;
    }
}
```
Sau đó `SessionServiceImpl.updateLeaveRecord()`:
```java
String participantId = payload.getPayload().getParticipant() != null
    ? payload.getPayload().getParticipant().getParticipantId() : null;
```

**Hệ quả**: Block toàn bộ flow "user thật leave → set COMPLETED qua webhook". Hiện tại COMPLETED chỉ set qua `POST /api/mentor-reviews` (mentor submit). Nếu mentor quên submit → session kẹt ONGOING mãi.

→ **Severity**: 🔴 P0 — blocker thật của mentor interview lifecycle.

---

### 🐛 BUG #2 — `finalScore` không validate input, rating=85 ra finalScore=850

**[role] Ai làm gì**: Mentor user 4 submit review cho session 49 (đã đánh giá student user 30).

**traceId**: `6a53df96e79080b3a39cbf891d18ea27` (POST mentor-reviews), `6a53df978662f1787f425d7f82c3852e` (GET application-detail 45 sau)

**Endpoint**: `POST /api/mentor-reviews`

**Request**:
```json
{
  "sessionId": 49,
  "mentorId": 4,
  "userId": 30,
  "rating": 85,
  "situationNote": "...", "taskNote": "...", "actionNote": "...",
  "resultNote": "...", "strength": "...", "weakness": "...", "improve": "..."
}
```

**Response (POST thành công)**:
```json
{"id": 49, "rating": 85, "session": {...}, "traceId": "6a53df96..."}
```

**Check `GET /api/application-details/45`** (traceId `6a53df978662f1787f425d7f82c3852e`):
```json
{
  "id": 45,
  "status": "COMPLETED",
  "finalScore": 850.0,       // ← ⚠️ rating=85 nhưng lưu 850
  "aiScore": 80.0,
  "finalResult": "PASSED"
}
```

→ **HR override dùng score raw** (gửi `score=40` → `finalScore=40` đúng), **nhưng mentor-reviews thì ra 850**. Hai scale không consistent.

**Code BE** (`MentorReviewServiceImpl.java` line 79):
```java
double maxScore = 100.0;
if (round != null && round.getConfigData() != null
    && round.getConfigData().getMaxScore() != null) {
    maxScore = round.getConfigData().getMaxScore();
}
double score = (review.getRating() / 10.0) * maxScore;  // 85/10*100 = 850
appDetail.setFinalScore(score);
```

**Response mong đợi vs thực tế**:
| | Mong đợi | Thực tế |
|---|---|---|
| rating=85 với maxScore=100 | score=85 (1-1) hoặc score=8.5 (scale 0-10) | score=850 (×10+×10) |
| rating=100 | score=1000 (vượt max) | score=1000 (không giới hạn) |
| HR ghi đè `score=40` | finalScore=40 | finalScore=40 ✅ |

**Sai chỗ nào**: 
1. `MentorReviewServiceImpl:79` chia 10 × maxScore (÷10×100) — logic giả định rating scale 0-10. KHÔNG có validate input → rating=85 vẫn lọt qua.
2. `CreateMentorReviewRequest` field `rating` không có `@Min`/`@Max` → BE nhận bất kỳ int nào.

**Câu hỏi cần a/c quyết định trước khi fix**:
1. **Rating scale chuẩn là gì?** 0-10 hay 0-100? Em thấy:
   - Swagger doc mẫu: `"rating": 4` → scale 0-10
   - Code BE: `(rating/10) * maxScore` → chia 10 → scale 0-10
   - UI FE StarRating hiển thị 5 sao nhưng value 0-10
   → **Em đoán 0-10** — a/c confirm giúp?
2. **Nếu scale 0-10**: thêm `@Min(0) @Max(10)` ở `CreateMentorReviewRequest.rating` là đủ, không cần đổi logic.
3. **Nếu scale 0-100**: đổi code thành `score = review.getRating()` (không chia 10) + `@Min(0) @Max(100)`.

**Bonus inconsistency** a/c note:
- `MentorReview.rating` → 0-10 → `finalScore = (rating/10) * maxScore`
- `MentorFeedback.rating` → ? (raw, average = sum/count) → scale không rõ

Recommend: **chuẩn hóa rating 0-10 cho cả 2**, validate input, không cần nhân 10 trong display.

→ **Severity**: 🟡 P1 — không blocker nhưng gây data sai.

---

### 🐛 BUG #3 — `POST /api/mentor-reviews` duplicate key lộ raw SQL error

**[role] Ai làm gì**: Mentor submit review lần 2 cho cùng session (vd: submit nhầm, muốn sửa thành rating khác).

**traceId**: `6a53df9887695bf28dab785582b2cf19`

**Endpoint**: `POST /api/mentor-reviews`

**Request lần 2**:
```json
{
  "sessionId": 49, "mentorId": 4, "userId": 30, "rating": 90, "strength": "Edit"
}
```

**Response (HTTP 500)**:
```json
{
  "traceId": "6a53df9887695bf28dab785582b2cf19",
  "error": "could not execute statement [ERROR: duplicate key value violates unique constraint \"mentorreview_pkey\"\n  Detail: Key (session_id)=(49) already exists.] [insert into MentorReview (actionNote,improve,mentor_id,rating,resultNote,situationNote,strength,taskNote,user_id,weakness,session_id) values (?,?,?,?,?,?,?,?,?,?,?)]; SQL [insert into MentorReview ...]; constraint [mentorreview_pkey]"
}
```

**Response mong đợi vs thực tế**:
| | Mong đợi | Thực tế |
|---|---|---|
| Status code | 409 Conflict | 500 Internal Server Error |
| Error message | "Mentor review already exists. Use PUT to update." | Raw SQL lộ table `mentorreview`, column `session_id`, constraint `mentorreview_pkey` |

**Sai chỗ nào** (3 lỗi cộng lại):

1. **`MentorReviewServiceImpl.java` (line 34-99)** — không check `repo.existsBySession_Id(sessionId)` trước khi save → `save()` insert → DB ném `DataIntegrityViolationException`.

2. **`GlobalExceptionHandler.java:55`** — catch-all `@ExceptionHandler(Exception.class)` trả raw `ex.getMessage()`:
   ```java
   response.put("error", ex.getMessage());  // ← lộ SQL
   ```
   → Lộ info: table name, column name, constraint name, SQL syntax. Vi phạm info leak.

3. **Không wrap thành 409** — REST convention yêu cầu 409 Conflict cho duplicate resource.

**Note quan trọng**: `PUT /api/mentor-reviews` đã có sẵn (line 44 controller, nhận `UpdateMentorReviewRequest` có field `id`). Do `@MapsId` trên entity, `id` ở URL = `session_id`. Vậy `GET /api/mentor-reviews/{sessionId}` cũng có sẵn (dù naming hơi ambiguous — nó chính là `GET /{id}`).

→ FE có thể tự fix bằng cách:
1. Fetch existing review qua `GET /api/mentor-reviews/{sessionId}` trước khi submit
2. Nếu có → gọi `PUT /api/mentor-reviews` body có `id`
3. Nếu không → gọi `POST /api/mentor-reviews`

Nhưng vẫn nên fix BE cho user khác (mobile, external caller) không crash.

**Đề xuất fix Option A (recommend, BE có thể gộp vào PR #2)**:
```java
// MentorReviewServiceImpl.java — check trước
if (repo.findBySession_Id(mentorReview.getSessionId()) != null) {
    throw new CustomException(
        "Mentor review already submitted for this session. Use PUT to update.",
        HttpStatus.CONFLICT);
}

// GlobalExceptionHandler.java — handler cụ thể
@ExceptionHandler(DataIntegrityViolationException.class)
public ResponseEntity<...> handleDataIntegrity(DataIntegrityViolationException ex) {
    String msg = ex.getMostSpecificCause().getMessage();
    if (msg != null && msg.contains("duplicate key")) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(Map.of("error", "Resource already exists.", "traceId", getTraceId()));
    }
    return ResponseEntity.badRequest().body(...);
}

// Catch-all chỉ log + trả generic
@ExceptionHandler(Exception.class)
public ResponseEntity<...> handleGenericException(Exception ex) {
    log.error("Unhandled Exception: ", ex);  // log full stack server-side
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("error", "Internal server error. Please contact admin with traceId.", 
                     "traceId", getTraceId()));
}
```

→ **Severity**: 🟢 P2 (security/info leak) + 🟡 P1 (UX) — không blocker nhưng là hygiene issue.

---

## ✅ Đề xuất ưu tiên commit

| Priority | Bug | PR nào |
|---|---|---|
| P0 | #1 Daily.co webhook | PR độc lập — blocker mentor interview |
| P1 | #2 finalScore validate | PR #2 — gộp với hygiene |
| P2 | #3 duplicate + SQL leak | PR #2 — gộp hygiene |

Em đề xuất **2 PR**:
- **PR #1**: Fix `DailyWebHookPayload` (P0, fix độc lập)
- **PR #2**: Fix `finalScore` validation + `GlobalExceptionHandler` info leak + duplicate check (P1+P2 hygiene, cùng file `MentorReview`/exceptions)

---

## 📝 Notes chung

- File báo cáo chi tiết v2: `docs/BACKEND_BUG_REPORT_MENTOR_FLOW_V2_2026-07-13.md`
- File v3 này (Zalo format): `docs/BACKEND_BUG_REPORT_V3_ZALO_2026-07-13.md`
- Test thật đã tạo trong DB: booking 13, session 49, mentor review 49, detail 45. Nếu a/c muốn clean thì OK.
- A/c confirm lại đề xuất fix ở PR nào, em ghép lại spec chung rồi mở ticket.

Cảm ơn a/c!

--- END MESSAGE ---

---

## 📎 TraceID index (paste kèm nếu BE cần grep log)

```
# Flow đúng (booking 13 / session 49)
6a53df396d0ed117e8d1682844300402  | GET app 36 (createdAt=2026-07-03, legacy)
6a53df39e9ee0cbbb9995228f2c4f15f  | GET app 38 details (1 detail OK)
6a53df3a7d8b2e8c5334d804f8021138  | GET app 35 details (1 detail OK)
6a53d9d5070c86890fa5532862f442f1  | POST pick-slot (booking 13)
6a53d9f544aff787fdadda3a7c85965b  | POST assign-mentor (session 49)
6a53da84da29e83d80c53b01b0fa5a8a  | GET session 49 after student join
6a53da9c3289920855771ebe9ac2cc11  | GET session 49 after mentor join
6a53df96e79080b3a39cbf891d18ea27  | POST mentor-reviews (COMPLETED, finalScore=850)
6a53df978662f1787f425d7f82c3852e  | GET application-detail 45 after review
6a53e005e7e2c35859629c7ff4461aee  | GET session 49 final state (endTime set)
6a53df9887695bf28dab785582b2cf19  | POST mentor-reviews 2nd time (duplicate key)
```