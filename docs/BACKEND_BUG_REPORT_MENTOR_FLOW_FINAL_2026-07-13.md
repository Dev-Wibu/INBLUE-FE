# 💬 Backend Bug Report — Mentor Review Flow (final, test 13/07/2026)

> Copy toàn bộ từ `--- BEGIN ---` đến `--- END ---` gửi cho BE qua Zalo.

---

## --- BEGIN MESSAGE ---

Xin chào BE team,

Sau khi hiểu flow đúng của BE, mình đã test lại toàn bộ từ đầu đến cuối bằng API thực tế. Báo cáo này chỉ ghi nhận bug + traceID thật, không đề xuất fix.

**Tài khoản test**: student `mcneildavidson4970564@gmail.com` (uid 30), mentor `b@fpt.com` (uid 4), admin `thuson@gmail.com` (uid 1).

---

### ✅ Flow đúng — KHÔNG phải bug

**Apply JD 22 (1 round Mentor, id 187)**
→ `POST /api/applications?jdId=22`
→ **App 46** tạo, traceId: `6a53eabb6653072fe09313a0cb25a633`
→ `GET /api/application-details/application/46`
→ **Detail 54** tự động tạo status PENDING, traceId: `6a53eacdddd7776fb01a19cae0c4bd86`

**Apply JD 18 (3 rounds, Mentor round id 175)**
→ `POST /api/applications?jdId=18`
→ **App 47** tạo, traceId: `6a53eae035249fb5324bfc2a593600e7`
→ `GET /api/application-details/application/47`
→ Trả `[]` (chưa có detail — đúng vì chưa submit round 1)
→ Submit round 1 (CODE_REVIEW): `POST /api/application-details/code-review/evaluate`
→ traceId: `6a53eb889a25c678cd2daf542b3e18a4`
→ `GET /api/application-details/application/47`
→ **Detail 55** (round 175 Mentor) tự động tạo status PENDING, traceId: `6a53eba2c4669dbb37b4c6745f6a562b`
→ → **moveToNextRound chạy đúng sau submit round trước**

**Pick slot (app 46 / detail 54)**
→ `POST /api/mentor-bookings/pick-slot`
→ Booking 14, status AWAITING_MENTOR, traceId: `6a53ec0dfae00efbe6358807979e6f37`

**Admin assign mentor**
→ `POST /api/admin/mentor-bookings/14/assign-mentor` body `{"mentorId":4}`
→ Booking 14 → status ROOM_CREATED, sessionId 50, sessionKey `7778b224-...`
→ traceId: `6a53ec39b9fde5350b56978b4dd351ca`

**Student join**
→ `POST /api/sessions/join-session` body `{"sessionName":"session-1783884857900","userId":30,"participantId":"participant_student_xyz","isMentor":false}`
→ traceId: `6a53ec972bdf4b34d5fdae19a17ffbb3`
→ Session 50: participantId1 set, status ONGOING ✅

**Mentor join**
→ `POST /api/sessions/join-session` body `{"sessionName":"session-1783884857900","userId":4,"participantId":"participant_mentor_xyz","isMentor":true}`
→ Session 50: participantId2 set ✅

**Mentor submit review (rating=5)**
→ `POST /api/mentor-reviews`
→ body: `{"sessionId":50,"mentorId":4,"userId":30,"rating":5,...}`
→ HTTP 200, traceId: `6a53ed701992442568b088ae8cbf66bb`
→ Session 50 → COMPLETED ✅
→ Detail 54 → status COMPLETED, finalScore=50.0 (đúng: 5/10×100=50) ✅

---

### 🐛 BUG #1 — Daily.co webhook format không set endTime (P0)

**Làm gì**: Gửi webhook `participant.left` với format Daily.co thực tế (có `payload.participant.participant_id`) sau khi student đã join session 50.

**Endpoint**: `POST /api/sessions/webhooks/dailyco`

**Request**:
```json
{
  "type": "participant.left",
  "payload": {
    "session_id": "session-1783884857900",
    "room": "session-1783884857900",
    "participant": {
      "user_id": "participant_student_xyz",
      "user_name": "student",
      "participant_id": "participant_student_xyz"
    }
  }
}
```

**Response**: HTTP 200 (empty body)

**Sau webhook, GET /api/sessions/50**:
```json
{
  "id": 50,
  "participantId1": "participant_student_xyz",
  "startTime1": "2026-07-13T02:35:31.064Z",
  "endTime1": null,
  "durationSeconds1": null,
  "status": "ONGOING"
}
```

→ `endTime1` KHÔNG set, vẫn null mãi

**So sánh — gửi schema SAI** (`session_id` = participant id thay vì nested):
```json
{
  "type": "participant.left",
  "payload": {
    "session_id": "participant_student_xyz",
    "room": "session-1783884857900"
  }
}
```
→ traceId: `6a53ed087b6f5f77a331f6f2de9f37b7`
→ `endTime1 = 2026-07-13T02:37:42.254Z`, `durationSeconds1 = 131` ✅

**traceId khi gửi format đúng**: `6a53ecebb53de36e78c1f576a98f5851`

---

### 🐛 BUG #2 — rating=85 → finalScore=850, không validate input (P1)

**Làm gì**: Mentor submit review cho session 51 (app 47 / detail 55) với rating=85.

**Endpoint**: `POST /api/mentor-reviews`

**Request**:
```json
{
  "sessionId": 51,
  "mentorId": 4,
  "userId": 30,
  "rating": 85,
  "situationNote": "Test rating scale",
  "taskNote": "Test rating scale",
  "actionNote": "Test rating scale",
  "resultNote": "Test rating scale",
  "strength": "Test",
  "weakness": "Test",
  "improve": "Test"
}
```

**Response**: HTTP 200

**Check `GET /api/application-details/55** (traceId: `6a53ee9aa639c8493799c26314131cdb`):
```json
{
  "id": 55,
  "status": "COMPLETED",
  "finalScore": 850.0,
  "finalResult": "PASSED",
  "mentorReview": { "rating": 85 }
}
```

→ `rating=85` → `finalScore=850.0`. maxScore round 175 = 100. Logic hiện tại: `(85/10)*100 = 850`.

→ HR override gửi `score=80` → `finalScore=80.0` đúng (không qua logic trên).

→ Field `rating` trong request không có giới hạn min/max. rating=100 → finalScore=1000, rating=-5 → finalScore=-50.

**traceId POST**: `6a53ee9aa639c8493799c26314131cdb`
**traceId GET detail**: `6a53ee9aa639c8493799c26314131cdb`

---

### 🐛 BUG #3 — Submit duplicate mentor review → raw SQL error (P2)

**Làm gì**: Mentor submit review lần 2 cho session 50 (đã có review rating=5).

**Endpoint**: `POST /api/mentor-reviews`

**Request**:
```json
{
  "sessionId": 50,
  "mentorId": 4,
  "userId": 30,
  "rating": 90,
  "situationNote": "Second attempt",
  "taskNote": "T",
  "actionNote": "T",
  "resultNote": "T",
  "strength": "T",
  "weakness": "T",
  "improve": "T"
}
```

**Response** (HTTP 500):
```json
{
  "traceId": "6a53edb4a18d3b9d1c17887d0571ae87",
  "error": "could not execute statement [ERROR: duplicate key value violates unique constraint \"mentorreview_pkey\"\n  Detail: Key (session_id)=(50) already exists.] [insert into MentorReview (actionNote,improve,mentor_id,rating,resultNote,situationNote,strength,taskNote,user_id,weakness,session_id) values (?,?,?,?,?,?,?,?,?,?,?)]; SQL [insert into MentorReview ...]; constraint [mentorreview_pkey]"
}
```

→ Lộ table name (`Mentorreview`), column name (`session_id`), constraint name (`mentorreview_pkey`), SQL syntax.

**traceId**: `6a53edb4a18d3b9d1c17887d0571ae87`

---

### 🐛 BUG #4 (PHỤ) — Endpoint admin accessible by ROLE_USER

**Làm gì**: Student (ROLE_USER, uid 30) gọi endpoint `GET /api/admin/mentor-bookings?status=COMPLETED` — endpoint này openapi ghi "chỉ dành cho Admin/Staff".

**Endpoint**: `GET /api/admin/mentor-bookings?status=COMPLETED`

**Request**: Authorization header chứa token student

**Response**: HTTP 200, body chứa full list booking (cùng data với admin):
```json
{
  "traceId": "6a53ef1ba50db8a4aafbaa9c11401636",
  "data": [
    {"id":13,"applicationDetailId":45,"applicantUserId":30,...},
    {"id":14,"applicationDetailId":54,"applicantUserId":30,...},
    {"id":15,"applicationDetailId":55,"applicantUserId":30,...}
  ]
}
```

→ Student nhìn thấy booking của chính mình (chấp nhận được) nhưng cũng nhìn thấy booking 13 của user khác (application 35). Endpoint ghi "Admin/Staff" nhưng không enforce authorization.

**traceId**: `6a53ef1ba50db8a4aafbaa9c11401636`

---

## 📎 TraceID tổng hợp (grep log)

```
# Application create
6a53eabb6653072fe09313a0cb25a633  | POST /api/applications (app 46, JD 22)
6a53eae035249fb5324bfc2a593600e7  | POST /api/applications (app 47, JD 18)

# Detail verify
6a53eacdddd7776fb01a19cae0c4bd86  | GET /api/application-details/application/46 (detail 54 created)
6a53eb0eacc41152c319146c2458b62c  | GET /api/application-details/application/47 (empty [])
6a53eb889a25c678cd2daf542b3e18a4  | POST /api/application-details/code-review/evaluate (app 47 round 1)
6a53eba2c4669dbb37b4c6745f6a562b  | GET /api/application-details/application/47 (detail 55 created)

# Booking flow (app 46 / detail 54 / session 50)
6a53ec0dfae00efbe6358807979e6f37  | POST /api/mentor-bookings/pick-slot (booking 14)
6a53ec39b9fde5350b56978b4dd351ca  | POST /api/admin/mentor-bookings/14/assign-mentor (session 50 created)
6a53ec972bdf4b34d5fdae19a17ffbb3  | GET /api/sessions/50 (after student join, ONGOING)
6a53ecebb53de36e78c1f576a98f5851  | POST /api/sessions/webhooks/dailyco (Daily.co real format, endTime NOT set)
6a53ed087b6f5f77a331f6f2de9f37b7  | POST /api/sessions/webhooks/dailyco (schema C wrong format, endTime SET)
6a53ed701992442568b088ae8cbf66bb  | POST /api/mentor-reviews (session 50, rating=5, finalScore=50 ✅)
6a53ed896b2b03c9bc88ae29f160b32e  | GET /api/application-details/54 (COMPLETED, finalScore=50)

# Booking flow (app 47 / detail 55 / session 51)
6a53edda7272978ab0410f08c813536a  | POST /api/mentor-bookings/pick-slot (booking 15)
6a53edf29d92eb63420ac49218799f97  | POST /api/admin/mentor-bookings/15/assign-mentor (session 51)
6a53ee9aa639c8493799c26314131cdb  | POST /api/mentor-reviews (session 51, rating=85, finalScore=850 ⚠️)
6a53eeebff1b6976a6f624e388ff8e37c  | POST /api/application-details/hr-score (override 80→80)

# BUG #3 duplicate review
6a53edb4a18d3b9d1c17887d0571ae87  | POST /api/mentor-reviews (session 50 lần 2, raw SQL error)

# BUG #4 admin endpoint by ROLE_USER
6a53ef1ba50db8a4aafbaa9c11401636  | GET /api/admin/mentor-bookings (student call admin-only endpoint)
```

--- END MESSAGE ---