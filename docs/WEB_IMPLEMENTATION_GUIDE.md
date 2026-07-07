# EXE_FE Web — Implementation & Gap Guide

> **Mục đích:** FE AI Agent đọc vào tự implement 100% các phần còn thiếu mà không cần đoán.
> **Backend:** Spring Boot `D:\Capstone\Inblue-backend\Inblue`
> **Web tham chiếu:** `D:\Capstone\EXE_FE`

---

## 1. Trạng thái tổng quan

| Module                    | Trạng thái web   | Ghi chú                                                    |
| ------------------------- | ---------------- | ---------------------------------------------------------- |
| Auth + Login              | ✅ Done          | `src/pages/Auth/LoginPage.tsx`                             |
| User Dashboard shell      | ✅ Done          | `src/pages/User/UserDashboard/UserDashboardPage.tsx`       |
| AI Interview              | ✅ Done          | List/Setup/Room/Result đều có                              |
| Mock Interview + Mentor   | ✅ Done          | Schedule/Room/History/Feedback/Review đều có               |
| Notifications             | ✅ Done          | `src/pages/User/Notifications/`                            |
| **Change Password**       | ❌ **MISSING**   | Button tồn tại nhưng không có handler                      |
| **Settings page/modal**   | ❌ **MISSING**   | Chỉ có theme trong account settings sheet                  |
| **Mentor public reviews** | ❌ **MISSING**   | MentorDetailPage không có reviews section                  |
| Select Mentor stub        | ⚠️ Redirect only | `MockInterviewSelectMentorPage.tsx` redirect sang schedule |

---

## 2. Tech Stack & Conventions

### 2.1 Routing

- React Router 7 nested routes under `/user` with `UserDashboardPage` as shell
- Account page is standalone under `/user/account` with `UserAccountLayout`
- Pattern: `src/App.tsx` defines all routes

### 2.2 API Client

- **Primary:** `openapi-fetch` + `openapi-react-query` via `fetchClient` and `$api`
- **Secondary:** `fetchClient` direct calls for multipart or non-schema endpoints
- Base URL: `import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"`
- Auth: JWT Bearer auto-injected in `src/lib/api.ts` onRequest middleware
- 401 handling: auto clear auth + redirect `/login` in `src/lib/api.ts`

### 2.3 Service Managers

Location: `src/services/*.manager.ts`

- Singleton pattern: `export const xxxManager = new XxxManager();`
- Return shape: `Promise<ApiResponse<T>>` with `{ success, data, error }`
- Error normalization: `getNormalizedErrorMessage(error, defaultMessage)` from `src/lib/error-normalizer.ts`

### 2.4 State Management

- TanStack Query via `$api` hooks
- Zustand stores: `src/stores/authStore.ts`, `settingsStore.ts`, `themeStore.ts`, `notificationStore.ts`

### 2.5 UI Components

- shadcn/Radix components in `src/components/ui/`
- Sonner toasts: `import { toast } from "sonner"`
- Icons: `lucide-react`

---

## 3. Missing Feature 1: Change Password

### 3.1 Current UI Location

File: `D:\Capstone\EXE_FE\src\pages\User\Account\AccountPage.tsx`
Lines 531-548: "Change Password" button in sidebar — **no onClick handler**

```tsx
{
  /* Change Password */
}
<li>
  <button className="flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors hover:bg-[#eff4ff] dark:hover:bg-[#1a2a3a]">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400">
        <Lock className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-[#0b1c30] dark:text-white">
          {t("common.changePassword")}
        </p>
        <p className="text-xs text-[#45464d] dark:text-[#8f9099]">
          {t("common.updateYourSecuritySettings")}
        </p>
      </div>
    </div>
    <ChevronRight className="h-4 w-4 shrink-0 text-[#76777d]" />
  </button>
</li>;
```

### 3.2 What to implement

Add a password change form/modal/page when user clicks "Change Password".

### 3.3 Backend Endpoint

```
POST /api/users/password
Authorization: Bearer <JWT>
Content-Type: application/json
```

### 3.4 Request Body

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### 3.5 Response

- Success: `200 OK` with JSON `{ "message": "..." }` or empty
- Error: `400/401/500` with `{ "message": "..." }` or `{ "error": "..." }`

### 3.6 Frontend Service

File: `D:\Capstone\EXE_FE\src\services\user.manager.ts`
Method already exists: `updatePassword(currentPassword, newPassword)`

```typescript
// From user.manager.ts lines 85-117:
async updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const response = await fetchClient
      .POST(
        "/api/users/password",
        {
          body: {
            currentPassword,
            newPassword,
          },
        }
      )
      .then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("general.unableToUpdatePassword"),
    };
  }
}
```

Usage example:

```typescript
const result = await userManager.updatePassword(currentPwd, newPwd);
if (result.success) {
  toast.success(t("general.passwordUpdatedSuccessfully"));
} else {
  toast.error(result.error || t("general.unableToUpdatePassword"));
}
```

### 3.7 Implementation Steps

1. Create `src/pages/User/Account/ChangePasswordPage.tsx` or modal
2. Add route in `src/App.tsx`:
   ```tsx
   <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
     <Route element={<UserAccountLayout />}>
       <Route path="/user/account" element={<AccountPage />} />
       <Route path="/user/account/change-password" element={<ChangePasswordPage />} />
     </Route>
   </Route>
   ```
3. Update AccountPage sidebar button (line ~532):
   ```tsx
   <button onClick={() => navigate("/user/account/change-password")}>
   ```
4. Form fields:
   - Current password (`type="password"`)
   - New password (`type="password"`, min 6 chars)
   - Confirm new password (`type="password"`, must match)
5. Validation:
   - newPassword length >= 6
   - confirmPassword === newPassword
   - currentPassword not empty
6. On submit:
   - Call `userManager.updatePassword(currentPassword, newPassword)`
   - Show loading state on button
   - On success: toast + navigate back
   - On error: toast error message

### 3.8 Route to add in App.tsx

Add inside the `<ProtectedRoute allowedRoles={["USER"]}>` block for account:

```tsx
<Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
  <Route element={<UserAccountLayout />}>
    <Route path="/user/account" element={<AccountPage />} />
    <Route path="/user/account/change-password" element={<ChangePasswordPage />} />
  </Route>
</Route>
```

---

## 4. Missing Feature 2: Settings Page

### 4.1 Current State

- No dedicated settings page exists in web EXE_FE
- Only theme toggle in account page header/sidebar
- No notification preference controls
- No font size setting

### 4.2 What to implement

A dedicated Settings page at `/user/settings` with:

- Appearance: theme (light/dark/system), font size
- Notifications: mute sound, mute toast
- Account: change password link, logout

### 4.3 Backend Endpoints

```
GET /api/users/settings
POST /api/users/settings
Authorization: Bearer <JWT>
```

### 4.4 Request/Response

```json
// GET response example
{
  "theme": "light",
  "fontSize": "default",
  "muteSound": false,
  "muteToast": false
}

// POST body
{
  "theme": "dark",
  "fontSize": "large",
  "muteSound": true,
  "muteToast": false
}
```

### 4.5 Frontend Service

File: `D:\Capstone\EXE_FE\src\services\user.manager.ts`
Methods already exist:

- `getSettings(): Promise<ApiResponse<UserSettings>>`
- `updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>>`

```typescript
// From user.manager.ts lines 122-167:
async getSettings(): Promise<ApiResponse<UserSettings>> {
  try {
    const response = await fetchClient
      .GET("/api/users/settings", {})
      .then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("general.unableToLoadSettings"),
    };
  }
}

async updateSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
  try {
    const response = await fetchClient
      .POST("/api/users/settings", { body: settings })
      .then((res) => ({
        data: res.data,
        status: res.response?.status,
        headers: res.response?.headers,
      }));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("general.unableToUpdateSettings"),
    };
  }
}
```

### 4.6 Implementation Steps

1. Create `src/pages/User/Settings/SettingsPage.tsx`
2. Add route in `src/App.tsx`:
   ```tsx
   <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
     <Route path="/user/settings" element={<SettingsPage />} />
   </Route>
   ```
3. Extend `src/stores/settingsStore.ts`:
   - Keys: `theme`, `fontSize`, `muteSound`, `muteToast`
   - Persist to `localStorage`
4. Page tabs:
   - **Appearance**: theme selector (light/dark/system), font size (small/default/large)
   - **Notifications**: mute sound toggle, mute toast toggle
   - **Account**: change password link → `/user/account/change-password`, logout button
5. On mount: `userManager.getSettings()` + merge with local store
6. On change: update local store + `userManager.updateSettings()`
7. Apply theme via `themeStore.ts` or CSS class on `<html>`

### 4.7 Settings Store Location

File: `D:\Capstone\EXE_FE\src\stores\settingsStore.ts` — extend this

---

## 5. Missing Feature 3: Mentor Public Reviews on MentorDetailPage

### 5.1 Current State

File: `D:\Capstone\EXE_FE\src\pages\User\MentorDetail\MentorDetailPage.tsx`

- Shows hero, bio, highlights, similar mentors, action panel
- **No reviews section** from other students

Key components in render:

```tsx
<MentorDetailHero ... />
<MentorHighlights ... />
<SimilarMentors ... />
<MentorActionPanel ... />
```

### 5.2 What to implement

Add a "Reviews from students" section at the bottom of MentorDetailPage.

### 5.3 Backend Endpoint

```
GET /api/mentor-feedbacks/mentor/{mentorId}
Authorization: Bearer <JWT>
```

### 5.4 Response

```json
[
  {
    "id": 1,
    "session": { "id": 10, "roomName": "...", "status": "COMPLETED", "endTime1": "..." },
    "mentor": { "id": 2, "name": "...", "avatarUrl": "..." },
    "user": { "id": 3, "name": "...", "avatarUrl": "..." },
    "rating": 5,
    "comment": "Great mentor!",
    "createdAt": "2026-05-20T..."
  }
]
```

### 5.5 Frontend Service

File: `D:\Capstone\EXE_FE\src\services\mentor-feedback.manager.ts`
Method already exists: `getByMentorId(mentorId)`

```typescript
// From mentor-feedback.manager.ts lines 126-147:
async getByMentorId(mentorId: string | number): Promise<ApiResponse<MentorFeedback[]>> {
  try {
    const endpoint = buildEndpoint(API_ENDPOINTS.MENTOR_FEEDBACKS.BY_MENTOR, { mentorId });
    const response = await fetchClient.GET(endpoint, {}).then((res) => ({
      data: res.data,
      status: res.response?.status,
      headers: res.response?.headers,
    }));
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("general.unableToDownloadFeedbackAccording"),
    };
  }
}
```

Usage example:

```typescript
const result = await mentorFeedbackManager.getByMentorId(mentorId);
if (result.success && result.data) {
  // result.data is MentorFeedback[]
}
```

### 5.6 Implementation Steps

1. In `MentorDetailPage.tsx`, after loading mentor detail, also fetch feedbacks:
   ```tsx
   const { data: feedbacks, isLoading: feedbacksLoading } = useQuery({
     queryKey: ["mentor-feedbacks", "mentor", parsedMentorId],
     queryFn: () => mentorFeedbackManager.getByMentorId(parsedMentorId),
     enabled: !!mentor && isMentorIdValid,
   });
   ```
2. Add a new section below `<SimilarMentors>`:
   ```tsx
   <Card className="border-slate-200 bg-white/90 p-5 dark:border-slate-700/70 dark:bg-slate-900/60">
     <h2 className="text-lg font-bold text-slate-900 dark:text-white">
       {t("common.reviewsFromStudents")}
     </h2>
     {feedbacksLoading ? (
       <Skeleton className="mt-4 h-32" />
     ) : feedbacks && feedbacks.length > 0 ? (
       <div className="mt-4 space-y-3">
         {feedbacks.map((feedback) => (
           <div
             key={feedback.id}
             className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
             <div className="flex items-center gap-2">
               <Avatar className="h-8 w-8">
                 <AvatarImage src={feedback.user?.avatarUrl} />
                 <AvatarFallback>{feedback.user?.name?.charAt(0)}</AvatarFallback>
               </Avatar>
               <p className="font-medium">{feedback.user?.name}</p>
               <div className="ml-auto flex items-center gap-1">
                 <Star className="h-4 w-4 text-[#FFD700]" />
                 <span>{feedback.rating}/5</span>
               </div>
             </div>
             {feedback.comment && (
               <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{feedback.comment}</p>
             )}
           </div>
         ))}
       </div>
     ) : (
       <p className="mt-4 text-sm text-slate-500">{t("userFeedback.youHaveNotReceivedAny")}</p>
     )}
   </Card>
   ```
3. Import needed: `useQuery` from `@tanstack/react-query`, `mentorFeedbackManager` from `@/services`
4. Empty state: "Chưa có đánh giá nào"
5. Loading: Skeleton cards

### 5.7 Hook to create

File: `D:\Capstone\EXE_FE\src\hooks\useMentorFeedback.ts` — add:

```tsx
export const useMentorFeedbacksByMentor = (mentorId: number) => {
  return useQuery({
    queryKey: ["mentor-feedbacks", "mentor", mentorId],
    queryFn: () => mentorFeedbackManager.getByMentorId(mentorId),
    enabled: mentorId > 0,
  });
};
```

---

## 6. Missing Feature 4: Settings Modal in Account Page (Alternative to full page)

If full page is too heavy, at minimum add a Settings modal triggered from account header gear icon.

### 6.1 Current gear icon

File: `D:\Capstone\EXE_FE\src\pages\User\Account\AccountPage.tsx`
Line ~103-107:

```tsx
<IconButton
  tooltip: 'Cài đặt',
  icon: const Icon(Icons.settings_outlined),
  onPressed: () => showAccountSettingsSheet(context, ref),
)
```

### 6.2 What to add

Create `src/components/User/AccountSettingsModal.tsx` with tabs:

- **Giao diện**: Theme light/dark/system, font size
- **Thông báo**: Mute sound, mute toast
- **Bảo mật**: Change password button → navigate to change password page
- **Đăng xuất**: Logout button with confirm dialog

### 6.3 Implementation

```tsx
// In AccountPage.tsx, replace showAccountSettingsSheet with:
onPressed: () => showDialog(
  context: context,
  builder: (ctx) => const AccountSettingsModal(),
),

// AccountSettingsModal.tsx content:
// - Tab 1: Giao diện
//   - SegmentedButton<ThemeMode> for light/dark/system
//   - Dropdown for font size: small/default/large
// - Tab 2: Thông báo
//   - Switch for muteSound
//   - Switch for muteToast
// - Tab 3: Bảo mật
//   - Button → /user/account/change-password
// - Tab 4: Khác
//   - Button logout with confirm dialog
```

---

## 7. Account/Profile Soft Features — Verification Checklist

Even though some features exist, verify these work end-to-end:

### 7.1 Edit Profile + Avatar

- Route: `/user/account?subtab=profile`
- File: `src/pages/User/Account/AccountTabs/ProfileTab.tsx`
- API: `POST /api/users` multipart with `data` JSON + `avatar` file + `cvFile` placeholder
- Service: `usersAdminManager.update(id, data, avatar, cvFile)`
- **Verify:** After save, `avatarUrl` updates in UI and persists on reload

### 7.2 CV Upload

- Trigger: `CVUploadModal` in AccountPage
- API: `POST /api/users/upload-cv` multipart `userId` (JSON blob) + `cvFile` (PDF)
- Service: `usersAdminManager.uploadCv(userId, file)`
- **Verify:** PDF only accepted, shows preview after upload

### 7.3 Candidate Profile Editing

- Route: `/user/account?subtab=candidateProfile`
- File: `src/pages/User/Account/CandidateProfile/index.tsx`
- API:
  - `GET /api/candidate-profiles/{userId}`
  - `POST /api/candidate-profiles` (create)
  - `PUT /api/candidate-profiles` (update)
- Service: `candidateProfileManager`
- **Verify:** All sections save: basic info, skills, projects, experience, education

### 7.4 Logout

- Current: Account settings sheet has logout button
- Service: `authStore.clearAuth()`
- **Verify:** Token cleared from Zustand + localStorage, redirect to `/login`

---

## 8. Mentor Feedback & Review Flow — Full Reference

### 8.1 User writes feedback to mentor

- Route: `/user/mock-interview/history/:sessionId/feedback`
- File: `src/pages/User/MockInterview/WriteReviewPage.tsx`
- Guard: `session.status === "COMPLETED"` && `session.userId === currentUser.id`
- API: `POST /api/mentor-feedbacks`
- Request:
  ```json
  {
    "sessionId": 10,
    "mentorId": 2,
    "userId": 1,
    "rating": 5,
    "comment": "Excellent session"
  }
  ```
- Service: `mentorFeedbackManager.create(data)`
- Update: `mentorFeedbackManager.update(id, data)` via `PUT /api/mentor-feedbacks`

### 8.2 User views their mentor reviews

- Route: `/user?tab=feedback`
- File: `src/pages/User/Feedback/UserFeedbackListPage.tsx`
- API: `GET /api/mentor-reviews` (filter by user client-side)
- Hook: `useMentorReviewsByUser(userId)` in `src/hooks/useMentorReview.ts`
- Detail: `/user/feedback/:id` → `FeedbackDetailPage.tsx`

### 8.3 User views mentor review detail

- Route: `/user/feedback/:id`
- File: `src/pages/User/Feedback/FeedbackDetailPage.tsx`
- Access control: `review.session.userId === currentUser.id`
- Shows: STAR notes (situation/task/action/result), strength/weakness/improve, rating

### 8.4 Session detail shows both feedback + review

- Route: `/user/mock-interview/history/:sessionId`
- File: `src/pages/User/MockInterview/SessionDetailPage.tsx`
- Sections:
  - "Your feedback" → `useMentorFeedbackBySession(sessionId)`
  - "Reviews from mentors" → `useMentorReviewBySession(sessionId)`

### 8.5 Mentor writes review (mentor side, already exists)

- Route: `/mentor/sessions/:sessionId/review`
- File: `src/pages/Mentor/Reviews/WriteFeedbackPage.tsx`
- API: `POST /api/mentor-reviews`
- Request:
  ```json
  {
    "sessionId": 10,
    "mentorId": 2,
    "userId": 1,
    "rating": 5,
    "situationNote": "...",
    "taskNote": "...",
    "actionNote": "...",
    "resultNote": "...",
    "strength": "...",
    "weakness": "...",
    "improve": "..."
  }
  ```
- Service: `mentorReviewManager.create(data)` / `update(id, data)`

---

## 9. Session & Payment Flow — Exact Implementation

### 9.1 Create session

- Route: `/user/mock-interview/schedule`
- File: `src/pages/User/MockInterview/MockInterviewSchedulePage.tsx`
- API: `POST /api/sessions/create-session`
- Request:
  ```json
  {
    "userId": 1,
    "mentorId": 2,
    "joinTime": "2026-05-21T10:00:00.000Z",
    "duration": 60,
    "totalPrice": 300000,
    "dailyCoCreationRequest": {
      "name": "",
      "privacy": "public",
      "properties": {
        "max_participants": 2,
        "start_video_off": true,
        "start_audio_off": true,
        "enable_screenshare": true,
        "exp": 0,
        "enable_recording": "cloud"
      }
    }
  }
  ```
- Service: `sessionManager.create(requestData)`
- Response: `Session` object with `status: "DRAFT"`

### 9.2 Payment

- Route: `/user/mock-interview/history/:sessionId`
- File: `src/pages/User/MockInterview/SessionDetailPage.tsx`
- API: `GET /api/sessions/make-payment?sessionId={id}`
- Service: `sessionManager.makePayment(sessionId)`
- Response: URL string or nested object
- Extraction order: `checkoutUrl | paymentUrl | redirectUrl | link | url | data.*`
- After payment success callback: poll `GET /api/sessions/{id}` 12 times, 5s interval

### 9.3 Join session

- Route: `/user/mock-interview/room/:sessionId`
- File: `src/pages/User/MockInterview/SessionRoomPage.tsx`
- API: `POST /api/sessions/join-session`
- Request:
  ```json
  {
    "sessionName": "<roomName>",
    "userId": 1,
    "participantId": "<daily_local_participant_session_id>",
    "isMentor": false
  }
  ```
- Service: `sessionManager.joinSession(data)`
- **Gotcha:** Field is `isMentor` in web FE, OpenAPI says `mentor`. If backend rejects, try `mentor` field.

### 9.4 Cancel session

- Service: `sessionManager.delete(sessionId)`
- Sends `PUT /api/sessions` with `{ id, status: "REJECTED" }`
- Note: Uses REJECTED instead of CANCELED due to DB constraint

### 9.5 Sync PAID status

- Service: `sessionManager.markSessionAsPaidWithRetry(sessionId, transactionCode, 3)`
- Sends `PUT /api/sessions` with full session payload + `status: "PAID"`
- Retry: 3 attempts with 500ms backoff

---

## 10. Notification System

### 10.1 Endpoints

```
GET /api/notifications/{userId}
GET /api/notifications/check-read/{notificationId}
POST /api/notifications
```

### 10.2 Service

File: `src/services/notification.manager.ts`

### 10.3 Classification by title keywords

| Type      | Keywords                       |
| --------- | ------------------------------ |
| INTERVIEW | phỏng vấn, session, interview  |
| FEEDBACK  | phản hồi, feedback             |
| REVIEW    | đánh giá, review               |
| MENTOR    | mentor, duyệt mentor, học viên |
| SUCCESS   | thành công, success            |
| ERROR     | thất bại, từ chối, error, lỗi  |
| SYSTEM    | default                        |

### 10.4 Frontend behavior

- Poll every 45s when app foreground
- Mark read on click: `GET /api/notifications/check-read/{notificationId}`
- Local alert bus: `src/lib/notification-alert-bus.ts`
- Toast for new unread notifications

---

## 11. File Index — Where to Edit

| Feature                   | File to edit                                               |
| ------------------------- | ---------------------------------------------------------- |
| Routes                    | `src/App.tsx`                                              |
| Account page              | `src/pages/User/Account/AccountPage.tsx`                   |
| Profile tab               | `src/pages/User/Account/AccountTabs/ProfileTab.tsx`        |
| Account tabs index        | `src/pages/User/Account/AccountTabs/index.tsx`             |
| Account tabs types        | `src/pages/User/Account/AccountTabs/types.ts`              |
| Candidate profile         | `src/pages/User/Account/CandidateProfile/index.tsx`        |
| Change password           | **CREATE** `src/pages/User/Account/ChangePasswordPage.tsx` |
| Settings page             | **CREATE** `src/pages/User/Settings/SettingsPage.tsx`      |
| Mentor detail             | `src/pages/User/MentorDetail/MentorDetailPage.tsx`         |
| Session detail            | `src/pages/User/MockInterview/SessionDetailPage.tsx`       |
| Write review              | `src/pages/User/MockInterview/WriteReviewPage.tsx`         |
| Feedback list             | `src/pages/User/Feedback/UserFeedbackListPage.tsx`         |
| Feedback detail           | `src/pages/User/Feedback/FeedbackDetailPage.tsx`           |
| User manager              | `src/services/user.manager.ts`                             |
| Users admin manager       | `src/services/users-admin.manager.ts`                      |
| Session manager           | `src/services/session.manager.ts`                          |
| Mentor manager            | `src/services/mentor.manager.ts`                           |
| Mentor feedback manager   | `src/services/mentor-feedback.manager.ts`                  |
| Mentor review manager     | `src/services/mentor-review.manager.ts`                    |
| Candidate profile manager | `src/services/candidate-profile.manager.ts`                |
| Notification manager      | `src/services/notification.manager.ts`                     |
| API config                | `src/constants/api.config.ts`                              |
| API client                | `src/lib/api.ts`                                           |
| Auth store                | `src/stores/authStore.ts`                                  |
| Settings store            | `src/stores/settingsStore.ts`                              |
| Theme store               | `src/stores/themeStore.ts`                                 |
| Error normalizer          | `src/lib/error-normalizer.ts`                              |
| Hooks useMentorReview     | `src/hooks/useMentorReview.ts`                             |
| Hooks useMentorFeedback   | `src/hooks/useMentorFeedback.ts`                           |
| Hooks useSession          | `src/hooks/useSession.ts`                                  |

---

## 12. Implementation Priority Order

1. **Change Password** — smallest, 1 form + 1 API call
2. **Settings page/modal** — theme + notification preferences
3. **Mentor public reviews section** — add reviews to MentorDetailPage
4. **Verify avatar/CV/candidate profile flows** — test existing code
5. **Notification polling** — verify existing implementation

---

## 13. Testing Checklist for Each Feature

### Change Password

- [ ] Navigate to change password page
- [ ] Submit with empty current password → error
- [ ] Submit with new password < 6 chars → error
- [ ] Submit with mismatched confirm → error
- [ ] Submit valid → success toast
- [ ] Logout → login with new password → success

### Settings

- [ ] Open settings
- [ ] Change theme → app reloads with correct theme
- [ ] Change font size → text scales
- [ ] Toggle mute sound → persists after reload
- [ ] Toggle mute toast → persists after reload
- [ ] Click change password → navigates correctly
- [ ] Click logout → confirms → logs out

### Mentor Reviews Section

- [ ] Open mentor detail with existing feedbacks
- [ ] Reviews section displays list
- [ ] Each review shows: user name, rating, comment, date
- [ ] Empty state shows when no reviews
- [ ] Loading skeleton shows while fetching

---

## 14. Known Gotchas

1. **Multipart user update:** `POST /api/users` requires `data` as JSON Blob + `avatar` + `cvFile` fields. Always send placeholder empty files to avoid backend NullPointerException.
2. **Password in profile update:** If updating user without changing password, must include existing password or backend wipes it.
3. **Schema mismatches:** Many `@ts-expect-error: Backend Swagger schema mismatch` comments exist. Use runtime validation, don't trust types strictly.
4. **Change password endpoint:** `POST /api/users/password` — NOT `PUT`, NOT `/api/users/me/password`.
5. **Settings endpoints:** `GET/POST /api/users/settings` — may not be fully implemented in backend. Check BE first.
6. **Mentor feedback by mentor:** `GET /api/mentor-feedbacks/mentor/{mentorId}` exists in backend but web hasn't used it yet.
7. **Public_id required:** When updating avatar/CV, must send existing `public_id` or Cloudinary can't delete old file.

---

## 15. Backend Verification Commands

```bash
# Check if settings endpoints exist
curl -X GET http://localhost:8080/api/users/settings \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:8080/api/users/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark","fontSize":"default"}'

# Check mentor feedbacks by mentor
curl -X GET "http://localhost:8080/api/mentor-feedbacks/mentor/1" \
  -H "Authorization: Bearer $TOKEN"

# Check change password
curl -X POST http://localhost:8080/api/users/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"old","newPassword":"new123"}'
```

---

_Tạo lúc: 2026-07-06_
_Repo web: `D:\Capstone\EXE_FE`_
_Repo backend: `D:\Capstone\Inblue-backend\Inblue`_
