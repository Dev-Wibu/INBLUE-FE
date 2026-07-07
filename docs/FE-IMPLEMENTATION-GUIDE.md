# Backend Changes Document - FE Implementation Guide

**Generated:** 2026-07-07
**Backend Branch:** master (commit: 9762a1a)

---

## Mục lục

1. [Application Detail - Auto Update Status & Completion Time](#1-application-detail---auto-update-status--completion-time)
2. [User Update - Allow Role Change](#2-user-update---allow-role-change)
3. [Security Refactor - Exception Handling & Protected Routes](#3-security-refactor---exception-handling--protected-routes)
4. [Mentor Interview DTO - New Model](#4-mentor-interview-dto---new-model)

---

## 1. Application Detail - Auto Update Status & Completion Time

### Mô tả

Khi mentor/system chấm điểm ứng viên cho một vòng phỏng vấn, backend sẽ tự động:

- Set `completedAt` = thời gian hiện tại
- Set `status` = `COMPLETED`
- Sau đó tự động chuyển ứng viên sang vòng tiếp theo

### File thay đổi

- `src/main/java/fpt/org/inblue/service/impl/ApplicationDetailServiceImpl.java`

### Code thay đổi

Thêm vào method `updateFinalScore` (dòng 43-44):

```java
applicationDetail.setCompletedAt(LocalDateTime.now());
applicationDetail.setStatus(ApplicationDetailStatus.COMPLETED);
```

### FE Cần làm gì?

#### 1.1. Cập nhật Interface/Type cho ApplicationDetail

**TypeScript:**

```typescript
// src/types/application.ts (hoặc file tương ứng)

enum ApplicationDetailStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  // thêm các status khác nếu có
}

interface ApplicationDetail {
  id: number;
  applicationId: number;
  roundId: number;
  status: ApplicationDetailStatus;
  completedAt: string | null; // ISO date string
  finalScore: number | null;
  finalResult: "PASSED" | "FAILED" | null;
  // ... các field khác
}
```

#### 1.2. Cập nhật UI khi hiển thị Application Detail

- Khi hiển thị danh sách vòng phỏng vấn, hiển thị `status` badge:
  - `PENDING` → Màu xám, chưa bắt đầu
  - `IN_PROGRESS` → Màu vàng, đang diễn ra
  - `COMPLETED` → Màu xanh, đã hoàn thành

- Hiển thị `completedAt` nếu có giá trị (format: dd/MM/yyyy HH:mm)

- Khi `finalResult = 'PASSED'` → Hiển thị badge màu xanh
- Khi `finalResult = 'FAILED'` → Hiển thị badge màu đỏ

#### 1.3. API Endpoint liên quan

**Endpoint:** `POST /api/application-details/{id}/score`
(Hoặc endpoint chấm điểm tương ứng - check lại với backend)

**Request Body:**

```json
{
  "score": 85,
  "isPass": true
}
```

**Response (mới):**

```json
{
  "id": 1,
  "applicationId": 10,
  "roundId": 1,
  "status": "COMPLETED",
  "completedAt": "2026-07-07T19:30:00",
  "finalScore": 85,
  "finalResult": "PASSED"
}
```

---

## 2. User Update - Allow Role Change

### Mô tả

Khi admin cập nhật thông tin user, bây giờ có thể thay đổi luôn `role` của user đó.

### File thay đổi

- `src/main/java/fpt/org/inblue/service/impl/UserServiceImpl.java`

### Code thay đổi

Thêm dòng 82 trong method update user:

```java
updateUser.setRole(user.getRole());
```

### FE Cần làm gì?

#### 2.1. Cập nhật Form Update User

Thêm field `role` vào form chỉnh sửa user (nếu chưa có):

**TypeScript:**

```typescript
interface UpdateUserRequest {
  name: string;
  email: string;
  role: "ADMIN" | "STAFF" | "MENTOR" | "USER";
  // password có thể optional
  password?: string;
}
```

#### 2.2. UI cho phép chọn Role

- Thêm dropdown/Select để chọn role mới
- Các role có thể có:
  - `ADMIN` - Quản trị hệ thống
  - `STAFF` - Nhân viên
  - `MENTOR` - Mentor
  - `USER` - Người dùng thường

```tsx
<select value={formData.role} onChange={handleRoleChange}>
  <option value="ADMIN">Admin</option>
  <option value="STAFF">Staff</option>
  <option value="MENTOR">Mentor</option>
  <option value="USER">User</option>
</select>
```

#### 2.3. API Endpoint

**Endpoint:** `PUT /api/users/{id}` (hoặc `/api/users/me`)

**Request Body:**

```json
{
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "role": "STAFF"
}
```

**Response:**

```json
{
  "id": 1,
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "role": "STAFF",
  "updatedAt": "2026-07-07T19:30:00"
}
```

---

## 3. Security Refactor - Exception Handling & Protected Routes

### Mô tả

Backend đã refactor security:

1. Thêm `HttpStatusEntryPoint` - trả về HTTP 401 cho unauthorized requests
2. Thêm protected route `/api/applications/me` - chỉ user có role `STAFF` được truy cập
3. Comment out whitelist check trong JwtAuthenticationFilter

### File thay đổi

- `src/main/java/fpt/org/inblue/security/SecurityConfig.java`
- `src/main/java/fpt/org/inblue/security/JwtAuthenticationFilter.java`

### Security Rules mới

```java
.exceptionHandling(exception -> exception
    .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
)
// ...
.requestMatchers("/api/applications/me").hasRole("STAFF")
.anyRequest().permitAll()
```

### FE Cần làm gì?

#### 3.1. Xử lý HTTP 401 Unauthorized

Thêm interceptor/handler cho response 401:

```typescript
// src/utils/apiInterceptor.ts

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

#### 3.2. Protected Route `/api/applications/me`

Endpoint này **chỉ Staff mới được truy cập**.

**Endpoint:** `GET /api/applications/me`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (thành công - Staff):**

```json
{
  "applications": [
    {
      "id": 1,
      "userId": 10,
      "jobDescriptionId": 5,
      "status": "IN_PROGRESS",
      "createdAt": "2026-07-01T10:00:00"
    }
  ]
}
```

**Response (không phải Staff - 403 Forbidden):**

```json
{
  "error": "Access Denied",
  "message": "You don't have permission to access this resource"
}
```

#### 3.3. Cập nhật Role Guard

```typescript
// src/components/ProtectedRoute.tsx

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Usage
<ProtectedRoute requiredRole="STAFF">
  <StaffDashboard />
</ProtectedRoute>
```

---

## 4. Mentor Interview DTO - New Model

### Mô tả

Backend tạo DTO mới `MentorInterviewDto` để truyền thông tin phỏng vấn mentor.

### File mới

- `src/main/java/fpt/org/inblue/model/MentorInterviewDto.java`

### DTO Structure

```java
@Data @Builder
public class MentorInterviewDto {
    private Integer userId;       // ID ứng viên
    private Integer mentorId;     // ID mentor phỏng vấn
    private Integer duration;     // Thời lượng (phút)
    private Integer totalPrice;   // Tổng chi phí
}
```

### FE Cần làm gì?

#### 4.1. Tạo TypeScript Interface

```typescript
// src/types/mentor.ts (hoặc file tương ứng)

interface MentorInterviewDto {
  userId: number; // ID của ứng viên
  mentorId: number; // ID của mentor phỏng vấn
  duration: number; // Thời lượng phỏng vấn (phút)
  totalPrice: number; // Tổng chi phí
}
```

#### 4.2. UI cho Mentor Interview

**Trang tạo lịch phỏng vấn mentor:**

```tsx
interface CreateMentorInterviewForm {
  userId: number;
  mentorId: number;
  duration: number; // input number, min=15, step=15
  totalPrice: number; // input number
}

const MentorInterviewForm = () => {
  const [form, setForm] = useState<CreateMentorInterviewForm>({
    userId: 0,
    mentorId: 0,
    duration: 30,
    totalPrice: 0,
  });

  const handleSubmit = async () => {
    const response = await api.post("/api/mentor-interviews", form);
    // xử lý response
  };

  return (
    <form>
      <select value={form.userId} onChange={(e) => setForm({ ...form, userId: +e.target.value })}>
        <option value="">Chọn ứng viên</option>
        {/* render options từ danh sách users */}
      </select>

      <select
        value={form.mentorId}
        onChange={(e) => setForm({ ...form, mentorId: +e.target.value })}>
        <option value="">Chọn mentor</option>
        {/* render options từ danh sách mentors */}
      </select>

      <input
        type="number"
        value={form.duration}
        min={15}
        step={15}
        onChange={(e) => setForm({ ...form, duration: +e.target.value })}
        placeholder="Thời lượng (phút)"
      />

      <input
        type="number"
        value={form.totalPrice}
        onChange={(e) => setForm({ ...form, totalPrice: +e.target.value })}
        placeholder="Tổng chi phí"
      />

      <button type="submit">Tạo lịch phỏng vấn</button>
    </form>
  );
};
```

#### 4.3. API Endpoints (推测 - check với backend)

**Tạo phỏng vấn:**

```
POST /api/mentor-interviews
Content-Type: application/json

{
  "userId": 10,
  "mentorId": 5,
  "duration": 45,
  "totalPrice": 500000
}
```

**Lấy danh sách phỏng vấn:**

```
GET /api/mentor-interviews
```

**Lấy chi tiết:**

```
GET /api/mentor-interviews/{id}
```

---

## Checklist Implement FE

- [ ] **1. Application Detail Status**
  - [ ] Cập nhật `ApplicationDetailStatus` enum
  - [ ] Thêm `completedAt` field vào interface
  - [ ] Hiển thị status badge trên UI
  - [ ] Format `completedAt` date

- [ ] **2. User Role Update**
  - [ ] Thêm `role` field vào form update user
  - [ ] Cập nhật `UpdateUserRequest` interface
  - [ ] UI dropdown chọn role

- [ ] **3. Security Handling**
  - [ ] Thêm interceptor xử lý 401
  - [ ] Cập nhật route guard cho Staff
  - [ ] Xử lý 403 Forbidden

- [ ] **4. Mentor Interview**
  - [ ] Tạo `MentorInterviewDto` interface
  - [ ] Tạo form tạo lịch phỏng vấn
  - [ ] Tạo trang/component hiển thị danh sách

---

## Liên hệ Backend

Nếu có thắc mắc về API endpoints hoặc request/response format, liên hệ:

- **Backend Team** - Kiểm tra chính xác endpoint URLs và body format

---

_Document tự động generated từ backend commits_
