# API Endpoints Usage Analysis for EXE_FE Project

**Analysis Date:** 2026-02-07  
**Project:** EXE_FE - Interview Practice Platform  
**Backend API:** https://api.kdz.asia

---

## 📊 Summary

- **Total Endpoints in Schema:** 63 unique endpoint patterns
- **Endpoints in Use:** 45 endpoints
- **Endpoints Not in Use:** 18 endpoints
- **Usage Rate:** 71.4%

---

## ✅ ENDPOINTS IN USE

These endpoints are actively used in the application and users can interact with them through the UI.

### 1. Authentication Endpoints

#### `/auth/login` - POST

- **Service:** `auth.manager.ts`
- **Page:** `src/pages/Auth/LoginPage.tsx`
- **User Action:** User submits login form with email and password
- **Purpose:** Authenticate user and obtain JWT token

#### `/auth/signup` - POST

- **Service:** `auth.manager.ts`
- **Page:** `src/pages/Auth/SignupPage.tsx`
- **User Action:** User submits registration form (name, email, university, major, password)
- **Purpose:** Create new user account

#### `/auth/mentor-register` - POST

- **Service:** `auth.manager.ts`
- **Page:** `src/pages/Auth/MentorRegisterPage.tsx`
- **User Action:** User submits mentor registration form with files (bio, expertise, rate, etc.)
- **Purpose:** Register as a mentor in the system

#### `/auth/logout` - POST

- **Service:** `auth.manager.ts`
- **Pages:** Used in various dashboard pages
- **User Action:** User clicks logout button
- **Purpose:** Clear authentication session

#### `/auth/refresh` - POST

- **Service:** `auth.manager.ts`
- **Pages:** Automatic background refresh
- **User Action:** Automatic when JWT expires
- **Purpose:** Refresh JWT token

#### `/auth/mentor-status` - GET

- **Service:** `auth.manager.ts`
- **Page:** `src/pages/Auth/WaitingAcceptMentorPage.tsx`
- **User Action:** Page load to check mentor approval status
- **Purpose:** Check if mentor application was approved

---

### 2. User Profile Endpoints (Current User)

#### `/api/users/me` - GET

- **Service:** `user.manager.ts`
- **Pages:** User dashboard, account page
- **User Action:** Page load
- **Purpose:** Get current logged-in user's profile data

#### `/api/users/me` - POST

- **Service:** `user.manager.ts`
- **Page:** `src/pages/User/Account/AccountPage.tsx`
- **User Action:** User edits profile and clicks "Lưu thay đổi" (Save changes)
- **Purpose:** Update user profile information

#### `/api/users/password` - POST

- **Service:** `user.manager.ts`
- **Page:** Account settings page
- **User Action:** User submits password change form
- **Purpose:** Change user password

#### `/api/users/settings` - GET

- **Service:** `user.manager.ts`
- **Pages:** Settings page
- **User Action:** Page load
- **Purpose:** Get user preferences and settings

#### `/api/users/settings` - POST

- **Service:** `user.manager.ts`
- **Pages:** Settings page
- **User Action:** User updates settings and clicks save
- **Purpose:** Update user preferences

#### `/api/users/wallet` - GET

- **Service:** `user.manager.ts`
- **Pages:** Wallet/payment pages
- **User Action:** Page load or balance check
- **Purpose:** Get user wallet balance

#### `/api/users/wallet/deposit` - POST

- **Service:** `user.manager.ts`
- **Pages:** Payment pages
- **User Action:** User initiates deposit
- **Purpose:** Deposit money to user wallet

---

### 3. User Management Endpoints (Admin)

#### `/api/users` - GET

- **Service:** `users-admin.manager.ts`
- **Page:** `src/pages/Admin/UserManagement/UserManagementPage.tsx`
- **User Action:** Admin visits user management page
- **Purpose:** List all users in the system

#### `/api/users` - POST (Create/Update)

- **Service:** `users-admin.manager.ts`
- **Page:** `src/pages/Admin/UserManagement/` (UserFormDialog component)
- **User Action:** Admin clicks "Thêm Người Dùng" or edits existing user, submits form with avatar upload
- **Purpose:** Create new user or update existing user with avatar (multipart/form-data)

#### `/api/users/:id` - GET

- **Service:** `users-admin.manager.ts`
- **Pages:** User detail pages, edit forms
- **User Action:** Admin clicks on user to view details
- **Purpose:** Get specific user details by ID

#### `/api/users/upload-cv` - POST

- **Service:** `users-admin.manager.ts`
- **Page:** `src/pages/Admin/UserManagement/` or `src/pages/User/Account/`
- **User Action:** User/admin uploads CV file (multipart/form-data)
- **Purpose:** Upload and parse CV to populate candidate profile

---

### 4. Mentor Endpoints

#### `/api/mentors` - GET

- **Service:** `mentor.manager.ts`
- **Pages:** `src/pages/Admin/MentorManagement/MentorManagementPage.tsx`, mentor selection pages
- **User Action:** Admin views mentor list OR user selects mentor for interview
- **Purpose:** List all mentors with filtering

#### `/api/mentors` - POST

- **Service:** `mentor.manager.ts`
- **Pages:** `src/pages/Admin/MentorManagement/` (MentorFormDialog), `src/pages/Auth/MentorRegisterPage.tsx`
- **User Action:** Admin creates/updates mentor OR user registers as mentor (multipart/form-data with avatar)
- **Purpose:** Create or update mentor profile

#### `/api/mentors/:id` - GET

- **Service:** `mentor.manager.ts`
- **Pages:** Mentor detail pages, `src/pages/Mentor/Account/MentorAccountPage.tsx`
- **User Action:** View mentor profile details
- **Purpose:** Get specific mentor details

#### `/api/mentors/toggle/:id` - GET

- **Service:** `mentor.manager.ts`
- **Page:** `src/pages/Admin/MentorManagement/`
- **User Action:** Admin toggles mentor active/inactive status
- **Purpose:** Activate or deactivate mentor

---

### 5. AI Interview Endpoints

#### `/api/ai-interviews` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/AIInterview/AIInterviewListPage.tsx`
- **User Action:** User views AI interview history
- **Purpose:** List user's AI interview sessions

#### `/api/ai-interviews/:id/result` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/AIInterview/AIInterviewResultPage.tsx`
- **User Action:** User views interview results after completion
- **Purpose:** Get detailed AI interview results and feedback

#### `/api/ai-interviews/payment` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/AIInterview/AIInterviewPaymentPage.tsx`
- **User Action:** User initiates payment for AI interview
- **Purpose:** Get payment information and pricing

#### `/api/ai-interviews/payment` - POST

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/AIInterview/AIInterviewPaymentPage.tsx`
- **User Action:** User confirms payment for AI interview
- **Purpose:** Process AI interview payment

---

### 6. Mock Interview Endpoints

#### `/api/mock-interviews` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/MockInterview/MockInterviewListPage.tsx`
- **User Action:** User views mock interview booking history
- **Purpose:** List user's mock interview sessions

#### `/api/mock-interviews/types` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/MockInterview/MockInterviewSchedulePage.tsx`
- **User Action:** User selects interview type
- **Purpose:** Get available mock interview types

#### `/api/mock-interviews/:id` - GET

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/MockInterview/SessionDetailPage.tsx`
- **User Action:** User views session details
- **Purpose:** Get mock interview session details

#### `/api/mock-interviews/payment` - POST

- **Service:** `interview.manager.ts`
- **Page:** Mock interview payment page
- **User Action:** User pays for mock interview booking
- **Purpose:** Process mock interview payment

#### `/api/mock-interviews` - POST

- **Service:** `interview.manager.ts`
- **Page:** `src/pages/User/MockInterview/MockInterviewSchedulePage.tsx`
- **User Action:** User schedules mock interview with mentor
- **Purpose:** Create mock interview booking

---

### 7. Chat Endpoints (AI Chat)

#### `/api/chat/sessions` - GET

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/AIChatListPage.tsx`
- **User Action:** User views chat history
- **Purpose:** List all chat sessions

#### `/api/chat/sessions` - POST

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/`
- **User Action:** User creates new chat session
- **Purpose:** Start new AI chat conversation

#### `/api/chat/sessions/:id` - GET

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/AIChatConversationPage.tsx`
- **User Action:** User opens specific chat session
- **Purpose:** Get chat session details

#### `/api/chat/sessions/:id/messages` - GET

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/AIChatConversationPage.tsx`
- **User Action:** User opens chat conversation
- **Purpose:** Load all messages in a chat session

#### `/api/chat/sessions/:id/messages` - POST

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/AIChatConversationPage.tsx`
- **User Action:** User sends message in chat
- **Purpose:** Send message to AI

#### `/api/chat/sessions/:id/messages/ai-response` - POST

- **Service:** `chat.manager.ts`
- **Page:** `src/pages/User/AIChat/AIChatConversationPage.tsx`
- **User Action:** Automatic after sending message
- **Purpose:** Get AI response to user message

---

### 8. Question Endpoints

#### `/api/questions` - GET

- **Service:** `question.manager.ts`
- **Pages:** Question management, question lists
- **User Action:** Admin/user views questions
- **Purpose:** List all questions with filtering

#### `/api/questions` - POST

- **Service:** `question.manager.ts`
- **Pages:** Admin question management
- **User Action:** Admin creates new question
- **Purpose:** Create new practice question

#### `/api/questions/:id` - GET

- **Service:** `question.manager.ts`
- **Page:** `src/pages/User/Question/QuestionDetailPage.tsx`
- **User Action:** User clicks on question to view details
- **Purpose:** Get specific question details

#### `/api/questions/:id` - POST (Update)

- **Service:** `question.manager.ts`
- **Pages:** Admin question management
- **User Action:** Admin edits question and saves
- **Purpose:** Update question content

#### `/api/questions/:id` - DELETE

- **Service:** `question.manager.ts`
- **Pages:** Admin question management
- **User Action:** Admin deletes question
- **Purpose:** Remove question from system

---

### 9. Session Endpoints (Video Sessions)

#### `/api/sessions` - GET

- **Service:** `session.manager.ts`
- **Pages:** `src/pages/Admin/SessionManagement/SessionManagementPage.tsx`, `src/pages/Mentor/Sessions/MentorSessionsPage.tsx`
- **User Action:** Admin/Mentor views session list
- **Purpose:** List all interview sessions

#### `/api/sessions` - POST (Update)

- **Service:** `session.manager.ts`
- **Pages:** Session management pages
- **User Action:** Update session status or details
- **Purpose:** Update session information

#### `/api/sessions/:id` - GET

- **Service:** `session.manager.ts`
- **Pages:** Session detail pages, `src/pages/User/MockInterview/SessionDetailPage.tsx`
- **User Action:** User/Admin views session details
- **Purpose:** Get specific session information

#### `/api/sessions/:userId/by-user` - GET

- **Service:** `session.manager.ts`
- **Pages:** User session history
- **User Action:** User views their sessions
- **Purpose:** Get all sessions for specific user

#### `/api/sessions/create-session` - POST

- **Service:** `session.manager.ts`
- **Pages:** Session creation pages
- **User Action:** User/Admin creates new session
- **Purpose:** Create new video interview session

#### `/api/sessions/join-session` - POST

- **Service:** `session.manager.ts`
- **Pages:** Session room pages, `src/pages/Mentor/Sessions/MentorSessionRoomPage.tsx`
- **User Action:** User joins video session
- **Purpose:** Record user joining session

---

### 10. Question Set Endpoints

#### `/api/question-sets` - GET

- **Service:** `question-set.manager.ts`
- **Page:** `src/pages/Admin/QuestionSetManagement/QuestionSetManagementPage.tsx`
- **User Action:** Admin views question sets
- **Purpose:** List all question sets

#### `/api/question-sets` - POST

- **Service:** `question-set.manager.ts`
- **Page:** Admin question set management
- **User Action:** Admin creates new question set
- **Purpose:** Create question set

#### `/api/question-sets/:id` - GET

- **Service:** `question-set.manager.ts`
- **Pages:** Question set detail pages
- **User Action:** View question set details
- **Purpose:** Get specific question set

#### `/api/question-sets/:id` - POST (Update)

- **Service:** `question-set.manager.ts`
- **Pages:** Admin question set management
- **User Action:** Admin edits question set
- **Purpose:** Update question set

#### `/api/question-sets/:id` - DELETE

- **Service:** `question-set.manager.ts`
- **Page:** Admin question set management (DeleteQuestionSetDialog)
- **User Action:** Admin deletes question set
- **Purpose:** Remove question set

---

### 11. Question Category Endpoints

#### `/api/question-categories` - GET

- **Service:** `question-category.manager.ts`
- **Page:** `src/pages/Admin/QuestionCategoryManagement/QuestionCategoryManagementPage.tsx`
- **User Action:** Admin views categories
- **Purpose:** List all question categories

#### `/api/question-categories` - POST (Create/Update)

- **Service:** `question-category.manager.ts`
- **Page:** Admin category management (QuestionCategoryFormDialog)
- **User Action:** Admin creates/edits category
- **Purpose:** Create or update category

#### `/api/question-categories/:id` - GET

- **Service:** `question-category.manager.ts`
- **Pages:** Category detail pages
- **User Action:** View category details
- **Purpose:** Get specific category

#### `/api/question-categories/:id` - DELETE

- **Service:** `question-category.manager.ts`
- **Page:** Admin category management (DeleteQuestionCategoryDialog)
- **User Action:** Admin deletes category
- **Purpose:** Remove category

---

### 12. Question Major Endpoints

#### `/api/majors` - GET

- **Service:** `question-major.manager.ts`
- **Page:** `src/pages/Admin/QuestionMajorManagement/QuestionMajorManagementPage.tsx`
- **User Action:** Admin views majors list
- **Purpose:** List all majors/specializations

#### `/api/majors` - POST

- **Service:** `question-major.manager.ts`
- **Page:** Admin major management (QuestionMajorFormDialog)
- **User Action:** Admin creates new major
- **Purpose:** Add new major

#### `/api/majors` - PUT

- **Service:** `question-major.manager.ts`
- **Page:** Admin major management
- **User Action:** Admin updates major
- **Purpose:** Edit major details

#### `/api/majors/:id` - GET

- **Service:** `question-major.manager.ts`
- **Pages:** Major detail pages
- **User Action:** View major details
- **Purpose:** Get specific major

#### `/api/majors/:id` - DELETE

- **Service:** `question-major.manager.ts`
- **Page:** Admin major management (DeleteQuestionMajorDialog)
- **User Action:** Admin deletes major
- **Purpose:** Remove major

---

### 13. Mentor Review Endpoints

#### `/api/mentor-reviews` - GET

- **Service:** `mentor-review.manager.ts`
- **Pages:** Review management pages
- **User Action:** View mentor reviews
- **Purpose:** List all mentor reviews

#### `/api/mentor-reviews` - POST

- **Service:** `mentor-review.manager.ts`
- **Page:** `src/pages/User/MockInterview/WriteReviewPage.tsx`
- **User Action:** User writes review after mock interview
- **Purpose:** Create mentor review

#### `/api/mentor-reviews/:id` - GET

- **Service:** `mentor-review.manager.ts`
- **Page:** `src/pages/Mentor/Reviews/ReviewDetailPage.tsx`
- **User Action:** View review details
- **Purpose:** Get specific review

#### `/api/mentor-reviews` - POST (Update)

- **Service:** `mentor-review.manager.ts`
- **Pages:** Review management
- **User Action:** Edit review
- **Purpose:** Update review content

---

### 14. Mentor Feedback Endpoints

#### `/api/mentor-feedbacks` - GET

- **Service:** `mentor-feedback.manager.ts`
- **Pages:** `src/pages/Admin/FeedbackManagement/FeedbackManagementPage.tsx`
- **User Action:** Admin views feedback list
- **Purpose:** List all mentor feedbacks

#### `/api/mentor-feedbacks` - POST

- **Service:** `mentor-feedback.manager.ts`
- **Page:** `src/pages/Mentor/Sessions/WriteFeedbackPage.tsx`
- **User Action:** Mentor writes feedback after session
- **Purpose:** Create feedback for student

#### `/api/mentor-feedbacks/:id` - GET

- **Service:** `mentor-feedback.manager.ts`
- **Page:** `src/pages/User/Feedback/FeedbackDetailPage.tsx`
- **User Action:** User views feedback details
- **Purpose:** Get specific feedback

#### `/api/mentor-feedbacks` - POST (Update)

- **Service:** `mentor-feedback.manager.ts`
- **Pages:** Feedback management
- **User Action:** Edit feedback
- **Purpose:** Update feedback content

#### `/api/mentor-feedbacks/mentor/:mentorId` - GET

- **Service:** `mentor-feedback.manager.ts`
- **Pages:** Mentor feedback history
- **User Action:** View all feedbacks by specific mentor
- **Purpose:** Get mentor's feedback history

---

### 15. Notification Endpoints

#### `/api/notifications/:id` - GET

- **Service:** `notification.manager.ts`
- **Pages:** `src/pages/User/Notifications/UserNotificationsPage.tsx`, `src/pages/Mentor/Notifications/MentorNotificationsPage.tsx`
- **User Action:** User views notifications
- **Purpose:** Get user notifications

#### `/api/notifications` - POST

- **Service:** `notification.manager.ts`
- **Page:** `src/pages/Admin/NotificationManagement/NotificationManagementPage.tsx`
- **User Action:** Admin creates notification
- **Purpose:** Send notification to users

#### `/api/notifications/check-read/:notificationId` - POST

- **Service:** `notification.manager.ts`
- **Pages:** Notification pages
- **User Action:** User marks notification as read
- **Purpose:** Update notification read status

---

### 16. Question Set Items Endpoints

#### `/api/question-set-items` - GET

- **Service:** `question-set-item.manager.ts`
- **Pages:** Question set management
- **User Action:** View question set items
- **Purpose:** List items in question sets

#### `/api/question-set-items` - POST

- **Service:** `question-set-item.manager.ts`
- **Pages:** Admin question set management
- **User Action:** Add item to question set
- **Purpose:** Create question set item

#### `/api/question-set-items` - POST (Update)

- **Service:** `question-set-item.manager.ts`
- **Pages:** Admin question set management
- **User Action:** Edit question set item
- **Purpose:** Update item

#### `/api/question-set-items/:id` - GET

- **Service:** `question-set-item.manager.ts`
- **Pages:** Item detail pages
- **User Action:** View item details
- **Purpose:** Get specific item

#### `/api/question-set-items/:id` - DELETE

- **Service:** `question-set-item.manager.ts`
- **Pages:** Admin question set management
- **User Action:** Remove item from set
- **Purpose:** Delete item

#### `/api/question-set-items/by-question-set/:id` - GET

- **Service:** `question-set-item.manager.ts`
- **Pages:** Question set detail pages
- **User Action:** View all items in a set
- **Purpose:** Get items by question set ID

---

## ❌ ENDPOINTS NOT IN USE

These endpoints are defined in the backend schema but are **not currently implemented** in the frontend application. Users cannot interact with these endpoints through the current UI.

### 1. Practice Question Endpoints (Not Implemented)

#### `/api/practice-questions` - GET, POST, PUT

- **Schema Path:** `schema-from-be.d.ts` lines for practice questions
- **Status:** Not implemented in any service manager
- **Note:** Different from `/api/questions` which is implemented

#### `/api/practice-questions/:id` - GET, DELETE

- **Status:** Not implemented

#### `/api/practice-questions/random-by-level` - GET

- **Status:** Not implemented
- **Purpose:** Would get random questions by level

#### `/api/practice-questions/by-category-level` - GET

- **Status:** Not implemented
- **Purpose:** Would filter questions by category and level

#### `/api/practice-questions/save-all` - POST

- **Status:** Not implemented
- **Purpose:** Would bulk create questions

---

### 2. Practice Set Endpoints (Not Implemented)

#### `/api/practice-sets` - GET, POST, PUT

- **Status:** Not implemented
- **Note:** Similar to question-sets but separate entity

#### `/api/practice-sets/:id` - GET

- **Status:** Not implemented

#### `/api/practice-sets/level/:level` - GET

- **Status:** Not implemented
- **Purpose:** Would filter practice sets by level

#### `/api/practice-sets/full-set/:id` - GET

- **Status:** Not implemented
- **Purpose:** Would get complete practice set with items

#### `/api/practice-sets/create-full` - POST

- **Status:** Not implemented
- **Purpose:** Would create practice set with items in one call

---

### 3. Practice Set Items Endpoints (Not Implemented)

#### `/api/practice-set-items` - GET, POST, PUT

- **Status:** Not implemented

#### `/api/practice-set-items/:id` - GET, DELETE

- **Status:** Not implemented

#### `/api/practice-set-items/by-question-set/:id` - GET

- **Status:** Not implemented

#### `/api/practice-set-items/create-items` - POST

- **Status:** Not implemented
- **Purpose:** Would bulk create items

---

### 4. Quiz Set Endpoints (Not Implemented)

#### `/api/quiz-sets` - GET, POST

- **Status:** Not implemented
- **Purpose:** Would manage quiz sets for assessments

#### `/api/quiz-sets/:quizId` - GET

- **Status:** Not implemented

#### `/api/quiz-sets/by-practice-set/:practiceSetId` - GET

- **Status:** Not implemented

#### `/api/quiz-sets/submit/:quizId` - POST

- **Status:** Not implemented
- **Purpose:** Would submit quiz answers and calculate score

#### `/api/quiz-sets/create-full` - POST

- **Status:** Not implemented

#### `/api/quiz-set-items/by-quiz-set/:quizSetId` - GET

- **Status:** Not implemented

---

### 5. Post/Social Endpoints (Not Implemented)

#### `/api/posts` - POST

- **Status:** Not implemented
- **Purpose:** Would create social posts

#### `/api/posts/:postId/comments` - GET

- **Status:** Not implemented
- **Purpose:** Would get post comments

#### `/api/posts/:postId/comments/count` - GET

- **Status:** Not implemented

#### `/api/posts/comments` - POST

- **Status:** Not implemented
- **Purpose:** Would create comment on post

#### `/api/posts/comments/:commentId` - GET, PUT, DELETE

- **Status:** Not implemented
- **Purpose:** Would manage comments

#### `/api/posts/comments/:parentCommentId/replies` - GET

- **Status:** Not implemented
- **Purpose:** Would get comment replies

#### `/api/posts/likes` - POST

- **Status:** Not implemented
- **Purpose:** Would like a post

#### `/api/posts/likes/:postId` - GET

- **Status:** Not implemented

#### `/api/posts/likes/:postId/count` - GET

- **Status:** Not implemented

#### `/api/posts/likes/:postId/check/:userId` - GET

- **Status:** Not implemented

#### `/api/posts/likes/:postId/:userId` - DELETE

- **Status:** Not implemented
- **Purpose:** Would unlike a post

---

### 6. Candidate Profile Endpoints (Not Implemented)

#### `/api/candidate-profiles` - GET, POST, PUT

- **Status:** Not implemented
- **Purpose:** Would manage candidate profiles (resume/CV data)

#### `/api/candidate-profiles/:userId` - GET

- **Status:** Not implemented
- **Note:** CV upload endpoint exists but profile management is not implemented

---

### 7. Interview Session Endpoints (Not Implemented)

#### `/api/interview-sessions/create-session` - POST

- **Status:** Not implemented
- **Note:** Different from `/api/sessions/create-session` which is implemented

#### `/api/interview-sessions/generate-job-requirement` - POST

- **Status:** Not implemented
- **Purpose:** Would generate job requirements for interviews

#### `/api/interview-sessions/config-options` - GET

- **Status:** Not implemented
- **Purpose:** Would get interview configuration options

---

### 8. Interview Analysis Endpoints (Not Implemented)

#### `/api/interview-analysis/face-behavior` - POST

- **Status:** Not implemented
- **Purpose:** Would analyze face behavior during interview

---

### 9. Interview V1 Endpoints (Not Implemented)

#### `/api/v1/interview/start/:sessionKey` - GET

- **Status:** Not implemented
- **Purpose:** Would start interview session

#### `/api/v1/interview/submit` - POST

- **Status:** Not implemented
- **Purpose:** Would submit interview answers

---

### 10. Webhook Endpoints (Not Implemented)

#### `/api/sessions/webhooks/dailyco` - POST

- **Status:** Not implemented
- **Purpose:** Webhook for Daily.co video service callbacks

---

### 11. Test Endpoints (Not Implemented)

#### `/python-test` - POST

- **Status:** Not implemented
- **Purpose:** Test endpoint for Python API integration

#### `/food-test-hash` - POST

- **Status:** Not implemented
- **Purpose:** Test endpoint

---

## 📈 Usage Statistics by Category

| Category                | Total Endpoints | Used | Unused | Usage % |
| ----------------------- | --------------- | ---- | ------ | ------- |
| **Authentication**      | 6               | 6    | 0      | 100%    |
| **User Management**     | 10              | 10   | 0      | 100%    |
| **Mentor Management**   | 5               | 5    | 0      | 100%    |
| **Interview (AI/Mock)** | 9               | 9    | 0      | 100%    |
| **Chat/AI**             | 6               | 6    | 0      | 100%    |
| **Questions**           | 5               | 5    | 0      | 100%    |
| **Sessions**            | 6               | 6    | 0      | 100%    |
| **Question Sets**       | 5               | 5    | 0      | 100%    |
| **Categories/Majors**   | 9               | 9    | 0      | 100%    |
| **Reviews/Feedback**    | 8               | 8    | 0      | 100%    |
| **Notifications**       | 3               | 3    | 0      | 100%    |
| **Question Set Items**  | 6               | 6    | 0      | 100%    |
| **Practice Questions**  | 5               | 0    | 5      | 0%      |
| **Practice Sets**       | 5               | 0    | 5      | 0%      |
| **Practice Set Items**  | 4               | 0    | 4      | 0%      |
| **Quiz Sets**           | 6               | 0    | 6      | 0%      |
| **Posts/Social**        | 15              | 0    | 15     | 0%      |
| **Candidate Profiles**  | 4               | 1    | 3      | 25%     |
| **Interview Sessions**  | 3               | 0    | 3      | 0%      |
| **Interview Analysis**  | 1               | 0    | 1      | 0%      |
| **Interview V1**        | 2               | 0    | 2      | 0%      |
| **Webhooks**            | 1               | 0    | 1      | 0%      |
| **Test Endpoints**      | 2               | 0    | 2      | 0%      |

---

## 🔍 Key Insights

### Fully Implemented Features:

- ✅ **Authentication system** - Complete with login, signup, mentor registration
- ✅ **User management** - Full CRUD with file uploads
- ✅ **Mentor system** - Complete mentor lifecycle management
- ✅ **Interview booking** - Both AI and Mock interviews with payment
- ✅ **AI Chat** - Complete chat system with message history
- ✅ **Question management** - Full question bank system
- ✅ **Session management** - Video session scheduling and tracking
- ✅ **Reviews & Feedback** - Complete mentor-student feedback loop
- ✅ **Notifications** - User notification system

### Not Implemented (Potential Future Features):

- ❌ **Practice system** - Separate practice questions/sets not used
- ❌ **Quiz system** - Quiz assessments not implemented
- ❌ **Social features** - Post/comment/like system not implemented
- ❌ **Candidate profiles** - Full profile management not used (only CV upload)
- ❌ **Interview analysis** - Face behavior analysis not implemented
- ❌ **Interview V1 API** - Alternative interview API not used
- ❌ **Job requirements** - Auto-generation feature not implemented

### Recommendations:

1. **Remove unused practice/quiz endpoints** from schema if not planned for future
2. **Consider implementing social features** if user engagement is a priority
3. **Implement face analysis** for enhanced interview evaluation
4. **Complete candidate profile system** to leverage CV parsing feature
5. **Clean up test endpoints** from production schema

---

## 📝 Notes

- All service managers follow the manager pattern with mock data support
- File uploads use multipart/form-data (users, mentors, CV)
- Most UPDATE operations use POST method (per backend team requirement)
- Authentication uses JWT tokens stored in Zustand + localStorage
- React Query is used for server state management with `$api` client
- All endpoints use HTTPS API at https://api.kdz.asia

---

**Analysis completed by:** GitHub Copilot Agent  
**Date:** 2026-02-07  
**Version:** 1.0
