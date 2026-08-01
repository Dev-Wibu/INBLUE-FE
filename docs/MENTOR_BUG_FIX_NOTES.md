# Fix bug Mentor Role — Sessions / Students / Reviews / Response Received

> **Tác giả**: FE team · **Ngày**: 2026-08-02 · **Commit**: (xem git log)
> **Liên quan**: [BE_RESPONSE_MENTOR_BUG.md](./BE_RESPONSE_MENTOR_BUG.md) — root cause analysis từ backend.

---

## 🎯 TL;DR

| Trang | Triệu chứng (trước fix) | Root cause | Fix |
|---|---|---|---|
| `/mentor/sessions` | Tab "Interview Session" trống | `useUserSessions()` trả `[]` cho test user (BE filter `userId OR userId2` không cover case `userId == userId2`) | Revert về `useSessions()` (admin endpoint, permitAll) |
| `/mentor/students` | "List of students" trống dù có session COMPLETED | Filter `isSessionMentor(s, user.id)` không match khi `Mentor.id ≠ User.id` | Filter bằng `Mentor.id` (resolved qua email) |
| `/mentor/students` (tab "Reviews sent") | Trống | `useMentorReviewsByMentor(user.id)` — endpoint filter theo `Mentor.id` | Truyền `Mentor.id` thay vì `User.id` |
| `/mentor/students` (tab "Response received") | "No response yet" | `useMentorFeedbacksByMentor(user.id)` — BE filter theo `Mentor.id`, trả `[]` | Dùng `useMentorFeedbacksForCurrentUser()` (resolve Mentor.id qua email trước) |
| `/mentor/feedback` (GivenFeedbackListPage) | "No response yet" | Same as above | Đổi sang `useMentorFeedbacksForCurrentUser()` |
| `/mentor` (Overview) | Calendar / Sessions trống | `useUserSessions()` trả `[]` | Revert về `useSessions()` + filter bằng Mentor.id |

**Root cause chính**: `Mentor.id` (PK bảng `mentor`) KHÁC `User.id` (JWT `sub`). Tất cả endpoint BE `/api/mentor-feedbacks/mentor/{id}`, `/api/mentor-reviews/by-mentor/{id}` filter theo `Mentor.id`, KHÔNG phải `User.id`. Khi FE truyền `User.id` thầm lặng trả `[]`.

---

## 🔑 Bài học cốt lõi (đọc trước khi đụng code)

```
┌──────────────────────────────────────────────────────────────────────┐
│  Mentor.id (bảng mentor PK)  ≠  User.id (JWT sub)                  │
│                                                                      │
│  - Khi user đăng nhập role MENTOR:                                  │
│      User (id=15)  +  Mentor (id=5, user_id=15)                    │
│                                                                      │
│  - BE endpoints filter theo Mentor.id:                              │
│      GET /api/mentor-feedbacks/mentor/{Mentor.id}                  │
│      GET /api/mentor-reviews/by-mentor/{Mentor.id}                  │
│                                                                      │
│  - FE phải resolve Mentor.id từ User.id trước khi gọi.             │
│    Cách hiện tại: email lookup (useCurrentMentorProfile).           │
│    Cách BE có thể làm: thêm /api/mentors/by-user/{userId}.          │
└──────────────────────────────────────────────────────────────────────┘
```

**Đối với `/api/sessions/**`:**
- BE SecurityConfig hiện tại `permitAll()` → không có 401/403 cho role MENTOR.
- Endpoint `GET /api/sessions/{userId}/by-user` filter `userId OR userId2` → **NHƯNG** thực tế trả `[]` cho case test data `userId == userId2` (BE chưa confirm, cần test riêng).
- An toàn nhất: dùng `GET /api/sessions` (admin) cho các trang mentor — permitAll, trả full list, FE filter bằng `isSessionMentor(s, Mentor.id)`.

---

## 📋 Hướng dẫn sửa từng trang

### 1. `/mentor/sessions` (MentorSessionsPage)

**File**: `src/pages/Mentor/Sessions/MentorSessionsPage.tsx`

**Trước**:
```tsx
import { useUpdateSessionStatus, useUserSessions } from "@/hooks/useSession";

const { data: allSessions = [], ... } = useUserSessions();
// → trả [] cho test data userId == userId2
```

**Sau**:
```tsx
import { useSessions, useUpdateSessionStatus } from "@/hooks/useSession";

// Admin endpoint, permitAll cho role MENTOR.
// FE filter bằng isSessionMentor(s, mentorPk || user.id).
const { data: allSessions = [], ... } = useSessions();
```

**Filter logic** (giữ nguyên — đã làm đúng từ trước):
```tsx
const mentorSessions = useMemo(() => {
  const userId = user?.id;
  const mentorProfileId = currentMentorProfile?.id;
  // Match session có userId/userId2/mentorId thuộc candidates
  return allSessions.filter((s) => {
    const candidates = [userId, mentorProfileId]
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id));
    if (candidates.length === 0) return false;
    const sessionIds = [s.userId, s.userId2, s.mentorId]
      .filter((id): id is number => typeof id === "number")
      .map(String);
    return candidates.some((id) => sessionIds.includes(String(id)));
  });
}, [allSessions, user, currentMentorProfile]);
```

---

### 2. `/mentor/students` (StudentsListPage)

**File**: `src/pages/Mentor/Students/StudentsListPage.tsx`

**Trước**:
```tsx
import { useUserSessions } from "@/hooks/useSession";

const { data: allSessions = [] } = useUserSessions();  // [] cho test data
const { data: feedbacks = [] } = useMentorFeedbacksByMentor(user?.id || 0);  // [] vì user.id ≠ Mentor.id
const { data: reviews = [] } = useMentorReviewsByMentor(user?.id || 0);  // cùng lý do

const mentorSessions = allSessions.filter((s) => isSessionMentor(s, user?.id));
```

**Sau**:
```tsx
import { useSessions } from "@/hooks/useSession";
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviewsByMentor } from "@/hooks/useMentorReview";

// Resolve Mentor.id qua email lookup (BE chưa có /by-user endpoint)
const { data: mentorProfile } = useCurrentMentorProfile();
const mentorId = (mentorProfile as { id?: number } | null)?.id ?? 0;

// Admin endpoint, permitAll
const { data: allSessions = [] } = useSessions();

// Mentor.id (resolved) — KHÔNG phải user.id
const { data: feedbacks = [] } = useMentorFeedbacksByMentor(mentorId);
const { data: reviews = [] } = useMentorReviewsByMentor(mentorId || user?.id || 0);

// Filter session bằng Mentor.id (BE populate s.mentorId = Mentor.id)
const mentorSessions = allSessions.filter((s) =>
  isSessionMentor(s, mentorId || user?.id)
);
```

---

### 3. `/mentor/feedback` (GivenFeedbackListPage — tab "Response Received")

**File**: `src/pages/Mentor/Feedback/GivenFeedbackListPage.tsx`

**Trước**:
```tsx
import { useMentorFeedbacksByMentor } from "@/hooks/useMentorFeedback";

const { data: feedbacks = [] } = useMentorFeedbacksByMentor(user?.id || 0);
// → BE filter theo Mentor.id, trả [] khi user.id ≠ Mentor.id
```

**Sau**:
```tsx
import { useMentorFeedbacksForCurrentUser } from "@/hooks/useMentorFeedback";

// Hook này resolve Mentor.id qua email trước, rồi gọi endpoint đúng.
const { data: feedbacks = [] } = useMentorFeedbacksForCurrentUser();
```

---

### 4. `/mentor` (MentorOverviewPage)

**File**: `src/pages/Mentor/Overview/MentorOverviewPage.tsx`

**Trước**:
```tsx
import { useUserSessions } from "@/hooks/useSession";
import { useMentorReviewsByMentor } from "@/hooks/useMentorReview";

const mentorId = user?.id;
const { data: allSessions = [] } = useUserSessions();  // [] cho test data
const { data: reviews = [] } = useMentorReviewsByMentor(mentorId || 0);
```

**Sau**:
```tsx
import { useCurrentMentorProfile } from "@/hooks/useMentor";
import { useMentorReviewsByMentor } from "@/hooks/useMentorReview";
import { useSessions } from "@/hooks/useSession";

const { data: mentorProfile } = useCurrentMentorProfile();
const mentorPk = (mentorProfile as { id?: number } | null)?.id ?? 0;

const { data: allSessions = [] } = useSessions();
const { data: reviews = [] } = useMentorReviewsByMentor(mentorPk || user?.id || 0);

const mentorSessions = useMemo(() => {
  if (!mentorPk && !user?.id) return [];
  return allSessions.filter((s) => isSessionMentor(s, mentorPk || user?.id));
}, [allSessions, mentorPk, user]);
```

---

### 5. `/mentor/students/:id` (StudentDetailPage)

**File**: `src/pages/Mentor/Students/StudentDetailPage.tsx`

Đổi `useUserSessions` → `useSessions` (cùng lý do: `by-user` endpoint trả `[]` cho test case).

```tsx
// Trước:
const { data: allSessions = [], ... } = useUserSessions();

// Sau:
const { data: allSessions = [], ... } = useSessions();
```

---

## 🪝 Hook mới: `useMentorFeedbacksForCurrentUser`

**File**: `src/hooks/useMentorFeedback.ts`

Thêm wrapper này — resolve `Mentor.id` qua email trước, rồi gọi `useMentorFeedbacksByMentor`:

```ts
/**
 * Convenience hook that resolves the current user's `Mentor.id` (bảng
 * mentor PK — different from `User.id` returned by JWT) and then fetches
 * feedbacks for that mentor. Use this instead of `useMentorFeedbacksByMentor`
 * on mentor pages so we don't silently hit
 * `/api/mentor-feedbacks/mentor/{userId}` which always returns `[]` when
 * `Mentor.id ≠ User.id`.
 */
export const useMentorFeedbacksForCurrentUser = () => {
  const { data: profile } = useCurrentMentorProfile();
  const mentorId = (profile as { id?: number } | null)?.id ?? 0;
  return useMentorFeedbacksByMentor(mentorId);
};
```

`useCurrentMentorProfile` (đã có sẵn trong `src/hooks/useMentor.ts`):
```ts
export const useCurrentMentorProfile = () => {
  const email = useAuthStore((state) => state.user?.email ?? "");
  return useQuery({
    queryKey: MENTOR_QUERY_KEYS.byEmail(email),
    queryFn: async (): Promise<Mentor | null> => {
      if (!email) return null;
      return await mentorManager.findByEmail(email);  // list + filter theo email
    },
    enabled: !!email,
    staleTime: 5 * 60_000,
  });
};
```

---

## ⚠️ Những chỗ KHÔNG nên đụng

1. **`useMentorReviewsByMentor`** — hiện tại đã có fallback `session.userId2` trong `getReviewMentorId` (do BE trả `mentor: null`), nên với test data `userId == userId2` vẫn match. **Không cần** đổi logic hook.

2. **`isSessionMentor`** helper (src/lib/session-mentor.ts) — đã check đủ `userId`, `userId2`, `mentorId`. Không cần sửa.

3. **SecurityConfig** — không can thiệp, vì BE permitAll. Nếu BE thêm `@PreAuthorize` sau, sẽ phải revisit.

---

## 🔍 Cách debug khi gặp lại bug tương tự

1. **Mở DevTools → Network**, filter theo `/api/`.
2. Tìm endpoint bị trả `[]` hoặc 4xx.
3. Check 2 thứ:
   - **URL có chứa `User.id` hay `Mentor.id`?** Nếu FE gửi `User.id` cho endpoint BE filter theo `Mentor.id` → sửa hook ngay.
   - **Endpoint có phải admin-only?** Check bằng cách gọi từ Postman với token user.
4. Trace ngược: từ trang UI → hook → manager → endpoint.
5. Nếu cần, mở file này + `BE_RESPONSE_MENTOR_BUG.md` để xem context đầy đủ.

---

## 📌 Đề xuất cho BE (gửi kèm khi có thể)

```java
// Option A: thêm helper endpoint (5 phút code)
@GetMapping("/by-user/{userId}")
public Mentor getMentorByUserId(@PathVariable int userId) {
    return mentorRepository.findByUserId(userId)
        .orElseThrow(() -> new CustomException("Mentor not found", HttpStatus.NOT_FOUND));
}

// Option B: auto-resolve mentorId trong getAllByMentor
@GetMapping("/mentor/{mentorId}")
public ResponseEntity<List<MentorFeedback>> getAllByMentor(
        @PathVariable int mentorId,
        @AuthenticationPrincipal UserDetails user) {
    if (user.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_MENTOR"))) {
        Mentor mentor = mentorRepository.findByUserId(user.getId())
            .orElseThrow(() -> new CustomException("...", HttpStatus.NOT_FOUND));
        mentorId = mentor.getId();
    }
    return ResponseEntity.ok(mentorFeedbackService.getAllByMentor(mentorId));
}
```

→ FE có thể bỏ `useCurrentMentorProfile` và dùng thẳng `user.id`.

---

## ✅ Checklist khi gặp lại bug mentor

- [ ] Tab "Interview Session" trống → check `useSessions` vs `useUserSessions` (dùng `useSessions`).
- [ ] Tab "List of students" trống → check `isSessionMentor(s, mentorId)` filter, dùng `Mentor.id` (resolved).
- [ ] Tab "Reviews sent" trống → check `useMentorReviewsByMentor(mentorId)`, dùng `Mentor.id` (resolved).
- [ ] Tab "Response received" trống → dùng `useMentorFeedbacksForCurrentUser()`.
- [ ] Tab "Overview" calendar trống → check `useSessions` + filter `mentorPk`.

Nếu tất cả các filter trên vẫn trống → kiểm tra `mentorProfile.id` có thực sự populate (console.log hook return value).
