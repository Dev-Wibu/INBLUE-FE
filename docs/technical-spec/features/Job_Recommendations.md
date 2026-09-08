# Đặc tả triển khai frontend — Gợi ý Job Description

## 1. Mục tiêu

Frontend cần tích hợp đầy đủ hai luồng đã có ở backend:

1. User xem danh sách JD được gợi ý theo vector kỹ năng.
2. Admin cập nhật ngưỡng phần trăm matching toàn hệ thống.

Phạm vi này chỉ triển khai phía frontend. Không tính lại cosine similarity và không tự lọc theo ngưỡng ở trình duyệt.

## 2. API contract

### 2.1. Lấy danh sách JD gợi ý

- Method: `GET`
- URL: `/api/job-descriptions/recommendations`
- Quyền: `USER`
- Không có path param, query param hoặc request body.
- Bearer token đã được `fetchClient` tự động gắn từ `authStore`.
- Backend đã sắp xếp kết quả theo độ matching giảm dần.
- Backend không trả phần trăm matching.

Response HTTP thực tế trước middleware:

```json
{
  "traceId": "6aa0176215869962c7f4a43c2d78e870",
  "data": [
    {
      "id": 73,
      "title": "Junior Java Backend Engineer",
      "description": "...",
      "requirements": "...",
      "benefits": "...",
      "level": "JUNIOR",
      "salaryMin": 40000000,
      "salaryMax": 70000000,
      "price": 20000,
      "currency": "VND",
      "skillTags": ["Java", "Spring Boot", "PostgreSQL"],
      "companyName": "Example Company",
      "companyLogo": "https://...",
      "status": "OPEN",
      "deadlineAt": "2026-10-21T07:47:00",
      "appliedCount": 5
    }
  ]
}
```

Lưu ý quan trọng: middleware trong `src/lib/api.ts` tự bỏ `traceId` và unwrap trường `data`. Vì vậy component/hook nhận trực tiếp `JobRecommendation[]`, không nhận object `{ traceId, data }`.

Các trường hợp sau đều là thành công và trả mảng rỗng:

- User chưa có career preference.
- Career preference chưa có `skillEmbedding`.
- Admin chưa cấu hình ngưỡng.
- Không có JD nào đạt ngưỡng.

Frontend không thể phân biệt bốn nguyên nhân trên vì chúng có cùng response `200` với `[]`.

### 2.2. Admin cập nhật ngưỡng

- Method: `PUT`
- URL: `/api/admin/job-recommendation-threshold`
- Quyền: `ADMIN`

Request:

```json
{
  "thresholdPercent": 70.0
}
```

Response trước middleware:

```json
{
  "traceId": "...",
  "data": {
    "thresholdPercent": 70.0
  }
}
```

Sau middleware, frontend nhận trực tiếp:

```json
{
  "thresholdPercent": 70.0
}
```

Validation giống backend:

- Bắt buộc nhập.
- Từ `0` đến `100`.
- Tối đa hai chữ số thập phân.

Backend hiện chưa có endpoint `GET` để đọc ngưỡng đang lưu. Vì vậy frontend không được tự hiển thị một giá trị mặc định như thể đó là cấu hình hiện tại. Sau khi tải lại trang, nếu cần prefill đúng giá trị đang lưu thì backend phải bổ sung endpoint đọc cấu hình.

## 3. Vị trí tích hợp đề xuất

### 3.1. User

Tích hợp ngay trong màn hiện có:

- File chính: `src/pages/User/JobSearch/JobSearchTab.tsx`
- URL hiện tại: `/user?tab=jobSearch`
- Tái sử dụng `JobCard` và `JobDetailContainer`.

Thêm bộ chuyển chế độ ở đầu màn hình:

- `Tất cả việc làm`
- `Gợi ý cho bạn`

Lưu chế độ vào query string để refresh/back vẫn giữ trạng thái:

```text
/user?tab=jobSearch&mode=recommended
```

Không cần tạo route hoặc trang chi tiết mới. Khi người dùng chọn JD gợi ý, tiếp tục dùng `jobId` như luồng hiện tại:

```text
/user?tab=jobSearch&mode=recommended&jobId=73
```

### 3.2. Admin

Đặt nút `Cấu hình gợi ý` trong header của:

- `src/pages/Admin/JobDescriptionManagement/JobDescriptionManagementPage.tsx`

Nút mở dialog nhỏ để nhập ngưỡng. Không cần tạo thêm mục sidebar hay một trang quản trị riêng cho một trường cấu hình.

## 4. Các file cần thay đổi

### 4.1. Đồng bộ OpenAPI schema

Hiện `schema-from-be.d.ts` chưa chứa hai endpoint mới. Khởi động backend có Swagger mới rồi chạy:

```bash
npm run generate-schema
```

Sau khi sinh schema, xác nhận có hai path:

```text
/api/job-descriptions/recommendations
/api/admin/job-recommendation-threshold
```

Không thêm `@ts-expect-error` nếu có thể giải quyết bằng cách cập nhật schema.

### 4.2. Types

Trong `src/interfaces/schema.types.ts`, export các type sinh từ OpenAPI nếu generator đã tạo schema tương ứng:

```ts
export type JobRecommendation = components["schemas"]["JobRecommendationResponse"];
export type UpdateJobRecommendationThresholdRequest =
  components["schemas"]["UpdateJobRecommendationThresholdRequest"];
export type JobRecommendationThresholdResponse =
  components["schemas"]["JobRecommendationThresholdResponse"];
```

Nếu cần một kiểu dùng chung cho card, tạo interface hiển thị tối thiểu thay vì ép kiểu bằng `as JobDescription`. Kiểu đó cần các trường:

```ts
type JobCardData = {
  id?: number;
  title?: string | null;
  level?: JobDescriptionLevel | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  price?: number | null;
  currency?: string | null;
  companyName?: string | null;
  companyLogo?: string | null;
  status?: JobDescriptionStatus | null;
  deadlineAt?: string | null;
  appliedCount?: number | null;
  skillTags?: string[] | null;
};
```

Cho `JobCard` và `JobDetailContainer` nhận type phù hợp với dữ liệu hiển thị. Không yêu cầu recommendation response phải có `skillEmbedding`, `rounds` hoặc `isDeleted`.

### 4.3. API endpoints constant

Bổ sung vào `src/constants/api.config.ts`:

```ts
JOB_DESCRIPTIONS: {
  // giữ các endpoint cũ
  RECOMMENDATIONS: "/api/job-descriptions/recommendations",
},

ADMIN: {
  // giữ cấu hình cũ nếu đã có
  JOB_RECOMMENDATION_THRESHOLD: "/api/admin/job-recommendation-threshold",
},
```

### 4.4. Service/manager

Ưu tiên thêm vào `src/services/job-description.manager.ts`:

```ts
async getRecommendations(): Promise<ApiResponse<JobRecommendation[]>> {
  try {
    const { data } = await fetchClient.GET(
      "/api/job-descriptions/recommendations",
      {}
    );

    return { success: true, data: data ?? [] };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : i18n.t("errors.cannotLoadJobRecommendations"),
    };
  }
}
```

Tạo `src/services/job-recommendation-admin.manager.ts` cho thao tác admin:

```ts
async updateThreshold(
  thresholdPercent: number
): Promise<ApiResponse<JobRecommendationThresholdResponse>> {
  try {
    const { data } = await fetchClient.PUT(
      "/api/admin/job-recommendation-threshold",
      { body: { thresholdPercent } }
    );

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : i18n.t("common.updateFailed"),
    };
  }
}
```

Export manager mới từ `src/services/index.ts`.

### 4.5. Hooks

Sau khi schema đã được cập nhật, thêm vào `src/hooks/useJobDescription.ts`:

```ts
export const useJobRecommendations = (enabled = true) =>
  $api.useQuery(
    "get",
    "/api/job-descriptions/recommendations",
    undefined,
    { enabled }
  );

export const useUpdateJobRecommendationThreshold = () =>
  $api.useMutation("put", "/api/admin/job-recommendation-threshold");
```

Nếu tiếp tục dùng manager + TanStack Query thủ công trong màn hiện tại, query key đề xuất:

```ts
["job-descriptions", "recommendations"]
["admin", "job-recommendation-threshold"]
```

Chỉ bật query recommendation khi `mode === "recommended"` để tránh gọi API không cần thiết.

## 5. Luồng hiển thị cho User

### 5.1. Tất cả việc làm

- Giữ nguyên việc gọi `jobDescriptionManager.getAll()`.
- Giữ nguyên lọc search, level và max price.
- Có thể tiếp tục sắp xếp theo ID như hiện tại.

### 5.2. Gợi ý cho bạn

- Gọi `GET /api/job-descriptions/recommendations`.
- Không fallback sang danh sách tất cả khi API trả `[]`; mảng rỗng là kết quả nghiệp vụ hợp lệ.
- Không sắp xếp lại theo ID vì sẽ phá thứ tự matching từ backend.
- Có thể áp dụng bộ lọc search, level và max price trên danh sách recommendation, nhưng phải giữ nguyên thứ tự tương đối của các phần tử còn lại.
- Không hiển thị phần trăm matching vì API không trả trường này.
- Tái sử dụng `JobCard`, logo công ty, thông tin lương, deadline, số ứng viên và nút ứng tuyển.

Khi chọn một card, tìm `selectedJob` từ đúng nguồn dữ liệu của mode hiện tại:

```ts
const sourceJobs = mode === "recommended" ? recommendedJobs : allJobs;
const selectedJob = sourceJobs.find(
  (job) => job.id?.toString() === selectedJobId
);
```

### 5.3. Trạng thái UI

Loading:

- Dùng skeleton card đang có trong `JobSearchTab`.
- Không hiện empty state trong lúc request còn chạy.

Empty recommendation:

- Tiêu đề: `Chưa có gợi ý phù hợp`.
- Mô tả: `Hãy cập nhật kỹ năng và định hướng nghề nghiệp để hệ thống tìm công việc phù hợp hơn.`
- CTA: `Cập nhật hồ sơ` dẫn đến `/user/account?subtab=editProfile` hoặc đúng subtab career preference đang có trong dự án.
- Có nút phụ `Xem tất cả việc làm` để chuyển `mode=all`.

Error:

- `401`: middleware hiện tại tự xóa auth và chuyển về login.
- `403`: hiển thị thông báo không có quyền.
- Lỗi mạng hoặc `5xx`: hiển thị error state có nút `Thử lại`.
- Không biến lỗi hệ thống thành empty state.

## 6. Dialog cấu hình ngưỡng cho Admin

Tạo component gợi ý:

```text
src/pages/Admin/JobDescriptionManagement/components/RecommendationThresholdDialog.tsx
```

Thành phần:

- Label `Ngưỡng matching (%)`.
- Input số với `min=0`, `max=100`, `step=0.01`.
- Dòng giải thích: JD có điểm matching lớn hơn hoặc bằng ngưỡng sẽ được gợi ý.
- Nút `Hủy` và `Lưu cấu hình`.

Trước khi gửi request, kiểm tra:

```ts
const isValidThreshold =
  Number.isFinite(value) &&
  value >= 0 &&
  value <= 100 &&
  Math.round(value * 100) === value * 100;
```

Khi lưu thành công:

- Đóng dialog.
- Hiển thị toast: `Đã cập nhật ngưỡng gợi ý thành {value}%`.
- Giữ giá trị response trong state cho đến khi rời/tải lại trang.

Khi lưu thất bại:

- Giữ dialog mở.
- Hiển thị lỗi validation từ backend nếu có.
- Không ghi đè giá trị người dùng vừa nhập.

Do chưa có API đọc ngưỡng, lúc mở dialog lần đầu nên để input trống với placeholder `Nhập ngưỡng từ 0 đến 100`, không giả định `70%` hoặc bất kỳ giá trị nào.

## 7. i18n

Bổ sung cùng key cho `vi.json`, `en.json` và `ja.json`. Nhóm key đề xuất:

```json
{
  "jobRecommendations": {
    "tabTitle": "Gợi ý cho bạn",
    "emptyTitle": "Chưa có gợi ý phù hợp",
    "emptyDescription": "Hãy cập nhật kỹ năng và định hướng nghề nghiệp để hệ thống tìm công việc phù hợp hơn.",
    "viewAllJobs": "Xem tất cả việc làm",
    "updateProfile": "Cập nhật hồ sơ",
    "loadError": "Không thể tải danh sách việc làm gợi ý",
    "retry": "Thử lại"
  },
  "jobRecommendationThreshold": {
    "title": "Cấu hình gợi ý việc làm",
    "label": "Ngưỡng matching (%)",
    "description": "JD có điểm matching lớn hơn hoặc bằng ngưỡng sẽ được gợi ý.",
    "save": "Lưu cấu hình",
    "success": "Đã cập nhật ngưỡng gợi ý thành {{value}}%"
  }
}
```

Không chỉ dựa vào `defaultValue`; thêm key thật vào đủ ba locale theo quy ước hiện tại của dự án.

## 8. Kiểm thử

### Service/hook

- Request recommendation dùng `GET`, không gửi params/body.
- Bearer token được middleware gắn tự động.
- Wrapper `{ traceId, data }` được unwrap thành mảng.
- Response `[]` vẫn được xem là success.
- PUT threshold gửi đúng `{ thresholdPercent }`.
- Validation chặn rỗng, âm, lớn hơn `100` và quá hai chữ số thập phân.

### User UI

- Chuyển qua lại giữa `Tất cả việc làm` và `Gợi ý cho bạn`.
- Query recommendation chỉ chạy ở mode recommendation.
- Loading, empty, error và retry hiển thị đúng.
- Không thay đổi thứ tự recommendation backend trả về.
- Search/filter không thay đổi thứ tự tương đối của kết quả.
- Mở chi tiết đúng JD qua `jobId`.
- Nút apply và luồng thanh toán/apply tiếp tục hoạt động.
- Không hiển thị `skillEmbedding`, rounds hoặc matching percentage.

### Admin UI

- Chỉ admin nhìn thấy nút cấu hình.
- Giá trị `0`, `20`, `70.25`, `100` hợp lệ.
- `-1`, `100.01`, `70.123`, chuỗi rỗng không được gửi.
- Toast hiển thị đúng giá trị backend trả về.
- Lỗi backend không đóng dialog.

## 9. Tiêu chí hoàn thành

- User có thể xem JD gợi ý trong màn Việc làm bằng token hiện tại.
- Danh sách gợi ý giữ nguyên thứ tự matching do backend quyết định.
- Empty response không làm crash trang và không bị thay bằng danh sách tất cả.
- Admin có thể cập nhật ngưỡng từ `0` đến `100` với tối đa hai số thập phân.
- Không có giá trị threshold mặc định hard-code ở frontend.
- Typecheck, lint và test frontend đều chạy thành công.
- Không làm thay đổi luồng xem chi tiết, mua quyền apply và ứng tuyển hiện tại.

