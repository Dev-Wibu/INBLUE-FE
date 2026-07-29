# PUT /api/candidate-profiles — BE Contract (confirmed 2026-07-29)

## TL;DR

- **PUT** → body **phải có `id`** (CandidateProfile id, không phải user id) và `user.id` (chỉ id, **không** gửi full User object).
- **POST** → body **phải bỏ field `id` hoàn toàn**. BE dùng Hibernate `IDENTITY` strategy tự generate id. Gửi `id: 0` có thể gây lỗi.
- **`user` field cả PUT và POST** → chỉ cần `{ id: <userId> }`. KHÔNG gửi full User object (password, avatarUrl, …).
- `targetRole` là **required**, các field còn lại đều optional (kể cả mảng rỗng).

## Vì sao fix Bug 4 cần thiết

Trước fix, `useCandidateProfileForm.ts` gửi `user: profile.user` (full nested object). Trên mạng nội bộ thường chạy, nhưng tăng payload, có nguy cơ vô tình ghi/đè các field nhạy cảm (đặc biệt `password`).

Trong commit `46a4a40`, fix ban đầu đã dùng `user: { id: userId }` đúng pattern của `useAIInterviewSetup.ts` — nhưng cả hai chỗ vẫn gửi `id: 0` cho POST, vi phạm contract BE.

## Các file đã sửa

- `src/pages/User/Account/CandidateProfile/useCandidateProfileForm.ts` — PUT dùng `id: profile.id`, POST bỏ `id`.
- `src/pages/User/AIInterview/AIInterviewSetup/useAIInterviewSetup.ts` — Build body conditionally: `{ id, ...baseBody }` cho PUT, chỉ `baseBody` cho POST.

## Payload mẫu mà BE chấp nhận

### PUT (Update)

```json
{
  "id": 2,
  "user": { "id": 9 },
  "targetRole": "Software Engineer (Java Backend)",
  "targetLevel": "Junior",
  "introduction": "Updated intro",
  "technicalSkills": ["Java", "Spring Boot"],
  "softSkills": ["Teamwork"],
  "tools": ["IntelliJ"],
  "projects": [],
  "workExperiences": [],
  "educations": [],
  "certifications": [],
  "achievements": []
}
```

### POST (Create)

```json
{
  "user": { "id": 9 },
  "targetRole": "Software Engineer (Java Backend)",
  "targetLevel": "Junior",
  "introduction": "My intro",
  "technicalSkills": ["Java"],
  "softSkills": [],
  "tools": [],
  "projects": [],
  "workExperiences": [],
  "educations": [],
  "certifications": [],
  "achievements": []
}
```

## Tại sao cả hai cách gửi `user` đều OK về mặt kỹ thuật

- BE chỉ gọi `candidateProfileRepository.save(profile)`.
- Jackson parse toàn bộ JSON thành entity graph.
- Hibernate dùng `user_id` từ quan hệ `@OneToOne` để UPDATE.
- Các field khác của `User` bị **bỏ qua** vì BE không đụng entity `User` khi update `CandidateProfile`.

Nhưng vẫn nên chỉ gửi `{ id }` để:

1. Giảm kích thước payload.
2. Không gửi `password` không cần qua network.
3. Pattern chuẩn, dễ audit.

## Phân tích FE tương ứng

- Sample response từ `GET https://api.kdz.asia/api/candidate-profiles` trả về `user` là **object User đầy đủ** (kể cả `password: "123"`) — đây là response, không phải input.
