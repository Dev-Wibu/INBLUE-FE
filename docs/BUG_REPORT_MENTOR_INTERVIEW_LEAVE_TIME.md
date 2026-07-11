# [BUG REPORT] Mentor Interview — Session Leave Time không bao giờ được ghi nhận

| Thuộc tính            | Giá trị                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| **Reporter**          | Frontend Team (User side)                                                                       |
| **Date**              | 2026-07-11                                                                                      |
| **Environment**       | Production (`https://api.kdz.asia`)                                                             |
| **Severity**          | 🔴 **CRITICAL** — Chặn toàn bộ luồng Mentor Interview Review (không bao giờ chuyển `COMPLETED`) |
| **Affected endpoint** | `GET /api/sessions/{id}`, `POST /api/sessions/webhooks/dailyco`                                 |
| **Affected entity**   | `Session` (fields `endTime1`, `endTime2`, `durationSeconds1`, `durationSeconds2`, `status`)     |

---

## 1. Tóm tắt sự cố (TL;DR)

**Session KHÔNG BAO GIỜ có `endTime` sau khi user/mentor rời phòng**, dẫn đến:

- `durationSeconds1/2` = `null` mãi mãi
- `status` mãi mãi `ONGOING`, không bao giờ chuyển `COMPLETED`
- FE không thể trỏ user sang flow `Mentor Review Submission` (điều kiện `session.status = COMPLETED`)

**Nguyên nhân nghi vấn cao nhất:** Daily.co webhook `participant.left` không bắn được tới BE, hoặc BE không xử lý được payload.

---

## 2. Bằng chứng thực tế (Production data)

### 2.1 Query thực hiện

```bash
GET https://api.kdz.asia/api/sessions/{userId}/by-user
Authorization: Bearer <user_30_token>
```

### 2.2 Kết quả 5 sessions của user 30

| Session ID | `startTime1` (UTC)  | `startTime2` (UTC)  | `endTime1` | `endTime2` | `durationSeconds1` | `durationSeconds2` | `status`   | Tuổi session          |
| ---------- | ------------------- | ------------------- | ---------- | ---------- | ------------------ | ------------------ | ---------- | --------------------- |
| **48**     | 2026-07-11 20:01:07 | 2026-07-11 20:02:18 | `null`     | `null`     | `null`             | `null`             | `ONGOING`  | ~2 giờ                |
| **47**     | 2026-07-11 15:30:10 | 2026-07-11 15:51:16 | `null`     | `null`     | `null`             | `null`             | `ONGOING`  | ~6.7 giờ              |
| **46**     | 2026-07-09 19:55:55 | `null`              | `null`     | `null`     | `null`             | `null`             | `ONGOING`  | **~51 giờ (2+ ngày)** |
| 45         | `null`              | `null`              | `null`     | `null`     | `null`             | `null`             | `REJECTED` | -                     |
| 44         | `null`              | `null`              | `null`     | `null`     | `null`             | `null`             | `REJECTED` | -                     |

### 2.3 Sample response (Session 48)

```json
{
  "id": 48,
  "roomName": "session-1783773216424",
  "userId": 30,
  "participantId1": "78fea256-e3ff-4091-b661-3dbc3d522d7f",
  "startTime1": "2026-07-11T20:01:07.205Z",
  "endTime1": null,
  "durationSeconds1": null,
  "userId2": 4,
  "participantId2": "dac3f9fd-6ffb-4854-903f-c855b434e8df",
  "startTime2": "2026-07-11T20:02:18.327Z",
  "endTime2": null,
  "durationSeconds2": null,
  "joinTime": "2026-07-11 20:00:00.000",
  "status": "ONGOING",
  "duration": 30
}
```

### 2.4 Bằng chứng then chốt

**Session 46:**

- User join lúc **09/07/2026 19:55:55 UTC** (= 02:55 sáng UTC+7 ngày 10/07)
- Tính đến hiện tại (11/07/2026 22:23 UTC+7 = 15:23 UTC) → **đã 51 giờ trôi qua**
- `endTime1` vẫn = `null`, `status` vẫn = `ONGOING`

→ **Không thể giải thích bằng "chưa ai leave"** — không ai có thể ngồi trong phòng Daily.co liên tục 51 giờ.
→ **Kết luận:** User/mentor đã leave, nhưng BE không nhận được tín hiệu để ghi `endTime`.

---

## 3. Hướng điều tra đề xuất (checklist cho Backend)

### 3.1 Daily.co Webhook configuration

Vào [Daily.co Dashboard](https://dashboard.daily.co/) → Webhooks:

- [ ] URL webhook đã config = `https://api.kdz.asia/api/sessions/webhooks/dailyco` chưa?
- [ ] Event `participant.left` đã subscribe chưa? (Có thể có nhiều event khác nhưng quan trọng nhất là `participant.left`)
- [ ] Signing secret đã set trên Daily.co dashboard **và** trong application properties của BE chưa?

### 3.2 Daily.co Webhook logs

Vào Daily.co Dashboard → Webhooks → Logs:

- [ ] Filter theo timestamp **09/07/2026 19:55:55 UTC đến 10/07/2026 00:00 UTC** (khoảng thời gian session 46 diễn ra)
- [ ] Filter theo `roomName = session-1783600432561` (room của session 46)
- [ ] Có request nào POST tới BE không?
  - **Nếu KHÔNG có log** → Webhook chưa config / event chưa subscribe / URL sai
  - **Nếu CÓ log** → Lỗi ở phía BE, cần check payload schema

### 3.3 Nếu webhook có gửi nhưng BE không update

Check theo thứ tự:

1. **Payload schema match không?** — `DailyWebHookPayload` hiện tại theo schema:

   ```json
   {
     "type": "string",
     "payload": {
       "recording_id": "string",
       "room": "string",
       "session_id": "string"
     }
   }
   ```

   ⚠️ **Schema hiện KHÔNG có field `participant_id`!** Daily.co `participant.left` event payload thực tế chứa:

   ```json
   {
     "type": "participant.left",
     "payload": {
       "session_id": "...",
       "room": "...",
       "participant": {
         "user_id": "...",
         "user_name": "...",
         "participant_id": "..."  ← cái này cần để match session.participantId1/2
       }
     }
   }
   ```

   → **Cần confirm với backend team: schema đang dùng có field `participant.participant_id` không, hay BE đang dùng cách khác để match?**

2. **Code `handleDailyCoWebhook` / `updateLeaveRecord()` có throw exception không?**
   - Check log server tại thời điểm session 46/47/48 xảy ra
   - Search log cho: `handleDailyCoWebhook`, `updateLeaveRecord`, `participant.left`
   - Nếu có exception bị `catch + log.warn` thì BE đã im lặng nuốt lỗi

3. **`roomName` vs `room` field mapping:**
   - Session trong DB có `roomName = "session-1783773216424"`
   - Daily.co webhook payload `payload.room` thường = `inblue.daily.co/session-1783773216424` hoặc chỉ `session-1783773216424`
   - Cần confirm code BE đang extract `roomName` từ field nào

### 3.4 Nếu webhook hoàn toàn không hoạt động

Khả năng cao: Webhook URL chưa được config trên Daily.co dashboard. Cần:

1. Đăng nhập Daily.co dashboard
2. Vào Webhooks section
3. Add endpoint: `https://api.kdz.asia/api/sessions/webhooks/dailyco`
4. Subscribe event: `participant.left` (ưu tiên), `participant.joined`, `recording.started`, `recording.completed`
5. Set signing secret (copy từ application properties BE)
6. Save & test bằng nút "Send test event" trên dashboard

---

## 4. Logic nghiệp vụ cần bổ sung (BLOCKER #2)

Ngay cả khi webhook chạy đúng, BE **chưa có logic chuyển `status = COMPLETED`** — theo như Backend Leader đã xác nhận trong nhóm chat.

### 4.1 Vấn đề

```java
// Hiện tại — updateLeaveRecord() chỉ set endTime + duration, KHÔNG đụng status
if (participantId.equals(session.getParticipantId1())) {
    session.setEndTime1(helperConvertToVietNamTime());
    session.setDurationSeconds1((endTime1 - startTime1) / 1000L);
}
// ... tương tự cho participantId2
```

### 4.2 Đề xuất fix

```java
// Pseudocode
public void updateLeaveRecord(DailyWebHookPayload payload) {
    Session session = findByRoomName(payload.payload.room);
    if (session == null) return;

    String participantId = extractParticipantId(payload);
    Instant now = helperConvertToVietNamTime();

    if (participantId.equals(session.getParticipantId1())) {
        session.setEndTime1(now);
        if (session.getStartTime1() != null) {
            session.setDurationSeconds1(
                Duration.between(session.getStartTime1(), now).getSeconds()
            );
        }
    } else if (participantId.equals(session.getParticipantId2())) {
        session.setEndTime2(now);
        if (session.getStartTime2() != null) {
            session.setDurationSeconds2(
                Duration.between(session.getStartTime2(), now).getSeconds()
            );
        }
    }

    // ★ NEW: Auto-complete khi cả 2 đã leave
    boolean bothJoined = session.getStartTime1() != null
                      && session.getStartTime2() != null;
    boolean bothLeft   = session.getEndTime1() != null
                      && session.getEndTime2() != null;
    if (bothJoined && bothLeft) {
        session.setStatus(SessionStatus.COMPLETED);
        // ★ NEW: Trigger ApplicationDetail → AI_EVALUATED
        applicationDetailService.markAiEvaluated(session.getApplicationDetailId());
    }

    sessionRepository.save(session);
}
```

### 4.3 Lưu ý edge case

- **Mentor rời trước user:** `endTime2` có thể set trước `endTime1` → logic "cả 2 leave" vẫn đúng khi user rời sau.
- **User đóng tab đột ngột (không qua nút Leave):** Daily.co vẫn gửi `participant.left` sau timeout → vẫn được ghi nhận.
- **Cùng 1 user reconnect:** participantId1 không đổi, endTime1 sẽ bị overwrite — nên check `endTime1 == null` trước khi set (chỉ ghi lần leave đầu).

---

## 5. Bug phụ (BLOCKER #3)

### 5.1 API booking không tìm thấy endpoint

```bash
GET https://api.kdz.asia/api/mentor-interview-bookings/12
Authorization: Bearer <user_token>
```

**Response:**

```json
{
  "traceId": "...",
  "error": "No static resource api/mentor-interview-bookings/12 for request '/api/mentor-interview-bookings/12'."
}
```

→ Endpoint không tồn tại tại URL này. Cần confirm URL đúng là gì. Có thể là:

- `/api/mentor-interview-bookings/{bookingId}` với path khác?
- `/api/booking/{id}`?
- Hoặc endpoint đang bị ẩn / typo?

Tạm thời FE đang gọi qua endpoint khác (qua `application-detail`), nên không ảnh hưởng luồng chính, nhưng cần confirm để debug trong tương lai.

---

## 6. Acceptance Criteria — Fix xong khi

| #        | Tiêu chí                                                                                               | Cách verify                                   |
| -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **AC-1** | Sau khi user + mentor rời phòng, `endTime1` và `endTime2` đều có giá trị                               | GET session → check field ≠ null              |
| **AC-2** | `durationSeconds1/2` được tính đúng (giây, dương, hợp lý)                                              | GET session → check > 0, ≤ 7200 (2 tiếng max) |
| **AC-3** | `status` tự động chuyển `COMPLETED` khi cả 2 leave                                                     | GET session → check `status == "COMPLETED"`   |
| **AC-4** | Daily.co webhook config đúng trên dashboard, có log request                                            | Daily.co dashboard → Webhooks → Logs          |
| **AC-5** | Session 46/47/48 cũ (legacy) được backfill endTime + status                                            | Migration script hoặc admin endpoint          |
| **AC-6** | Luồng FE: User vào Mentor Review Page thấy nút "Submit Review" sau khi mentor leave (status COMPLETED) | Manual test trên FE                           |

---

## 7. Reproduce steps (cho QA / Backend)

### 7.1 Reproduce join (đã chạy OK)

```bash
# User join
curl -X POST https://api.kdz.asia/api/sessions/join-session \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session-test-123", "userId": 30, "participantId": "test-pid-1", "mentor": false}'

# Mentor join
curl -X POST https://api.kdz.asia/api/sessions/join-session \
  -H "Authorization: Bearer <mentor_token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionName": "session-test-123", "userId": 30, "participantId": "test-pid-2", "mentor": true}'

# Verify startTime
curl -X GET https://api.kdz.asia/api/sessions/{sessionId} \
  -H "Authorization: Bearer <user_token>"
# → startTime1, startTime2 có giá trị ✅
```

### 7.2 Reproduce leave (FAIL)

**Bước 1:** Từ FE, vào trang Mentor Interview Room với session mới → click "Rời phòng" / đóng tab browser.

**Bước 2:** Đợi 60 giây (Daily.co webhook thường trigger trong vòng 30s).

**Bước 3:** Gọi lại:

```bash
curl -X GET https://api.kdz.asia/api/sessions/{sessionId} \
  -H "Authorization: Bearer <user_token>"
```

**Expected:**

```json
{
  "endTime1": "2026-07-11T...",
  "durationSeconds1": <số giây > 0>,
  "endTime2": "2026-07-11T...",
  "durationSeconds2": <số giây > 0>,
  "status": "COMPLETED"
}
```

**Actual:**

```json
{
  "endTime1": null,
  "durationSeconds1": null,
  "endTime2": null,
  "durationSeconds2": null,
  "status": "ONGOING"
}
```

---

## 8. Phụ lục: Query đã dùng để thu thập data

### 8.1 Lấy session của user

```powershell
curl.exe -sS -X GET "https://api.kdz.asia/api/sessions/30/by-user" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzMCIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3ODM3ODU5MDgsImV4cCI6MTc4Mzc4OTUwOH0.5zf9JNKxyQ3Dh3deoLoIBlz3uqFWk6ccYCx6ZZ6SBug" `
  -H "Accept: application/json"
```

### 8.2 Lấy chi tiết session

```powershell
curl.exe -sS -X GET "https://api.kdz.asia/api/sessions/48" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzMCIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3ODM3ODU5MDgsImV4cCI6MTc4Mzc4OTUwOH0.5zf9JNKxyQ3Dh3deoLoIBlz3uqFWk6ccYCx6ZZ6SBug" `
  -H "Accept: application/json"
```

### 8.3 Application detail (lấy sessionId)

```powershell
curl.exe -sS -X GET "https://api.kdz.asia/api/application-details/application/35" `
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIzMCIsInJvbGVzIjpbIlJPTEVfVVNFUiJdLCJpYXQiOjE3ODM3ODU5MDgsImV4cCI6MTc4Mzc4OTUwOH0.5zf9JNKxyQ3Dh3deoLoIBlz3uqFWk6ccYCx6ZZ6SBug" `
  -H "Accept: application/json"
```

---

## 9. Tags

`bug` `critical` `mentor-interview` `session` `dailyco-webhook` `leave-time` `production` `blocker`
