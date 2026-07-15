# Hướng Dẫn Xử Lý Interview Rounds - Dành Cho Frontend

## Mục Lục

1. [Tổng Quan Vấn Đề](#tổng-quan-vấn-đề)
2. [Các Loại Round Trong Hệ Thống](#các-loại-round-trong-hệ-thống)
3. [Luồng Xử Lý Chi Tiết](#luồng-xử-lý-chi-tiết)
4. [Endpoint và Request/Response](#endpoint-và-requestresponse)
5. [Các Trường Hợp Cần Tránh](#các-trường-hợp-cần-tránh)
6. [Mẫu Code Ví Dụ](#mẫu-code-ví-dụ)

---

## Tổng Quan Vấn Đề

### Biểu Hiện Lỗi

- VD: Vòng 3 = Quiz, Vòng 4 = Coding
- Sau khi ứng viên làm Quiz xong và HR chấm điểm vòng Coding
- **Kết quả**: Bị skip vòng 4 (Coding), nhảy thẳng sang vòng 5

### Nguyên Nhân Gốc Rễ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LUỒNG SAI (HIỆN TẠI)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Ứng viên làm Quiz (Vòng 3)                                         │
│         │                                                           │
│         ▼                                                           │
│  Backend QuizRoundProcessor.process()                                │
│         │                                                           │
│         ├──► Tự động chấm điểm ✓                                   │
│         ├──► Tự động set PASS/FAIL ✓                               │
│         └──► Tự động gọi moveToNextRound() ⚠️                       │
│                  │                                                  │
│                  ▼                                                  │
│         Application đã ở Vòng 4 (Coding)                            │
│         │                                                           │
│         ▼                                                           │
│  HR chấm điểm vòng Coding (Vòng 4)                                  │
│         │                                                           │
│         ▼                                                           │
│  Backend hrScore()                                                  │
│         │                                                           │
│         ├──► Lưu điểm HR ✓                                         │
│         ├──► Lưu PASS/FAIL ✓                                       │
│         └──► Gọi moveToNextRound() ⚠️⚠️⚠️ (NHẢY THÊM 1 VÒNG!)        │
│                  │                                                  │
│                  ▼                                                  │
│         Application nhảy sang Vòng 5 (THÀNH CÔNG BỊ MISS!)          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Kết luận**: Backend Quiz đã tự động chuyển vòng, nên khi HR gọi `hr-score` cho vòng tiếp theo, hệ thống chuyển thêm 1 lần nữa → BỊ NHẢY 2 VÒNG!

---

## Các Loại Round Trong Hệ Thống

| Round Type        | HR Score Cần Thiết? | Backend Tự Động Chuyển Vòng?       | Xử Lý FE               |
| ----------------- | ------------------- | ---------------------------------- | ---------------------- |
| `CV_SCREENING`    | ❌ Không            | ✅ Có (sau khi AI đánh giá)        | Không cần gọi hr-score |
| `EMAIL_SIMULATOR` | ❌ Không            | ✅ Có (sau khi AI đánh giá)        | Không cần gọi hr-score |
| `QUIZ`            | ❌ Không            | ✅ Có (tự động chấm điểm)          | Không cần gọi hr-score |
| `CODING`          | ✅ Có               | ❌ Không                           | **Cần gọi hr-score**   |
| `CODE_REVIEW`     | ❌ Không            | ✅ Có (sau khi AI đánh giá)        | Không cần gọi hr-score |
| `MENTROR_REVIEW`  | ✅ Có               | ❌ Không                           | **Cần gọi hr-score**   |
| `AI_INTERVIEW`    | ❌ Không            | ✅ Có (sau khi kết thúc interview) | Không cần gọi hr-score |

---

## Luồng Xử Lý Chi Tiết

### Luồng 1: Round Cần HR Chấm Điểm (MENTOR_REVIEW, CODING)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROUND CẦN HR CHẤM ĐIỂM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FE: Hiển thị nội dung round cho ứng viên                         │
│         │                                                           │
│         ▼                                                           │
│  2. Ứng viên hoàn thành bài (Coding/Phỏng vấn)                      │
│         │                                                           │
│         ▼                                                           │
│  3. FE: Gọi GET /api/application-details/reviewer                    │
│         │                                                           │
│         │   Response: Danh sách ApplicationDetail cần review        │
│         ▼                                                           │
│  4. HR xem kết quả và bấm "Chấm điểm"                               │
│         │                                                           │
│         ▼                                                           │
│  5. FE: Gọi POST /api/application-details/hr-score                  │
│         │                                                           │
│         │   Request Body:                                            │
│         │   - applicationDetailId: ID của ApplicationDetail          │
│         │   - isPass: true/false                                    │
│         │   - note: Ghi chú HR                                      │
│         │   - score: Điểm số (0-100)                                │
│         │                                                           │
│         ▼                                                           │
│  6. Backend:                                                        │
│         - Lưu hrScore, hrNote                                       │
│         - Set finalScore = score                                     │
│         - Set finalResult = PASSED/FAILED                            │
│         - Set status = COMPLETED                                    │
│         - Gọi moveToNextRound() ✅                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Luồng 2: Round Tự Động (QUIZ, CV_SCREENING, etc.)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ROUND TỰ ĐỘNG (KHÔNG CẦN HR)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Ứng viên làm bài (Quiz/CV/SQL/etc)                              │
│         │                                                           │
│         ▼                                                           │
│  2. FE: Gọi POST /api/application-details/submit                    │
│         │                                                           │
│         ▼                                                           │
│  3. Backend:                                                       │
│         - Chấm điểm tự động (AI/Matching)                          │
│         - Set finalScore, finalResult                                │
│         - TỰ ĐỘNG gọi moveToNextRound() ✅                          │
│         - KHÔNG cần HR can thiệp                                    │
│         │                                                           │
│         ▼                                                           │
│  4. FE: Nhận response → Tự động chuyển sang round TIẾP THEO       │
│         (KHÔNG cần gọi hr-score!)                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint và Request/Response

### 1. Endpoint HR Chấm Điểm

```
POST /api/application-details/hr-score
```

#### Request Parameters (Query Parameters)

| Parameter             | Type    | Required | Description                               |
| --------------------- | ------- | -------- | ----------------------------------------- |
| `applicationDetailId` | int     | ✅ Có    | ID của ApplicationDetail cần chấm điểm    |
| `isPass`              | boolean | ✅ Có    | `true` = PASSED, `false` = FAILED         |
| `note`                | String  | ✅ Có    | Ghi chú của HR (có thể empty string `""`) |
| `score`               | double  | ✅ Có    | Điểm số (thường 0-100)                    |

#### Request Example

```javascript
// Ví dụ với fetch
fetch(
  "/api/application-details/hr-score?applicationDetailId=123&isPass=true&note=Good+performance&score=85",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
    },
  }
);

// Ví dụ với axios
axios.post("/api/application-details/hr-score", null, {
  params: {
    applicationDetailId: 123,
    isPass: true,
    note: "Good performance",
    score: 85,
  },
});
```

#### Response

```json
// Success (200 OK)
{
  // Empty body - chỉ cần check HTTP status
}
```

#### Lưu Ý Quan Trọng

> ⚠️ **CHỈ gọi endpoint này cho các round cần HR chấm điểm!**
>
> - ✅ Gọi cho: `MENTOR_REVIEW`, `CODING` (khi HR muốn chấm điểm thủ công)
> - ❌ KHÔNG gọi cho: `QUIZ`, `CV_SCREENING`, `EMAIL_SIMULATOR`, `CODE_REVIEW`, `AI_INTERVIEW`

---

### 2. Endpoint Lấy Danh Sách Cần Review

```
GET /api/application-details/reviewer
```

#### Response

```json
[
  {
    "id": 123,
    "applicationId": 456,
    "roundId": 789,
    "status": "PENDING",
    "finalScore": null,
    "hrScore": null,
    "hrNote": null,
    "finalResult": null,
    "startedAt": "2026-07-15T10:00:00",
    "completedAt": null
    // ... các trường khác
  }
]
```

#### Trường `status` trong Response

| Status         | Ý Nghĩa           | Hành Động FE                          |
| -------------- | ----------------- | ------------------------------------- |
| `PENDING`      | Chờ HR chấm điểm  | Hiển thị nút "Chấm điểm"              |
| `COMPLETED`    | Đã chấm điểm xong | Hiển thị kết quả (không cho chấm lại) |
| `AI_EVALUATED` | AI đã đánh giá    | Hiển thị kết quả AI                   |

---

### 3. Endpoint Submit Bài (Dùng Chung)

```
POST /api/application-details/submit
Content-Type: multipart/form-data
```

#### Request Fields (Form Data)

| Field           | Type                | Required | Description                                        |
| --------------- | ------------------- | -------- | -------------------------------------------------- |
| `applicationId` | Long                | ✅ Có    | ID của Application                                 |
| `roundType`     | String              | ✅ Có    | Loại round: `QUIZ`, `CODING`, `CV_SCREENING`, etc. |
| `textContent`   | String              | ❌       | Nội dung text (cho vòng tự luận)                   |
| `file`          | File                | ❌       | File upload (cho vòng CV, Code)                    |
| `quizAnswers`   | String (JSON Array) | ❌       | JSON array các đáp án quiz                         |

#### Quiz Answers Format

```json
// quizAnswers field - là JSON string của array
"[{\"selectedAnswer\": \"A\"}, {\"selectedAnswer\": \"C\"}, {\"selectedAnswer\": \"B\"}]"
```

#### Response

```json
{
  "status": "COMPLETED",
  "message": "Nộp bài thành công",
  "applicationDetailId": 123,
  "roundResult": "PASSED"
}
```

---

### 4. Endpoint Lấy Chi Tiết ApplicationDetail

```
GET /api/application-details/{id}
```

#### Response

```json
{
  "id": 123,
  "applicationId": 456,
  "roundId": 789,
  "status": "COMPLETED",
  "finalScore": 85.0,
  "aiScore": null,
  "hrScore": 85.0,
  "hrNote": "Good performance",
  "finalResult": "PASSED",
  "submissionData": {
    // Dữ liệu bài nộp tùy loại round
  },
  "startedAt": "2026-07-15T10:00:00",
  "completedAt": "2026-07-15T10:30:00"
}
```

---

## Các Trường Hợp Cần Tránh

### ❌ SAI: Gọi hr-score cho vòng Quiz

```javascript
// ❌ SAI - KHÔNG LÀM THEO
// Sau khi ứng viên nộp Quiz
const response = await axios.post("/api/application-details/hr-score", null, {
  params: {
    applicationDetailId: 123, // Đây là ApplicationDetail của Quiz
    isPass: true,
    note: "",
    score: 80,
  },
});
// Kết quả: Bị nhảy 2 vòng!
```

### ❌ SAI: Gọi hr-score 2 lần cho cùng 1 round

```javascript
// ❌ SAI - KHÔNG LÀM THEO
// Lần 1: Gọi khi HR bấm "Chấm điểm"
await axios.post("/api/application-details/hr-score", null, {
  params: { applicationDetailId: 123, isPass: true, note: "OK", score: 80 },
});

// Lần 2: Gọi lại khi FE tự động chuyển trang
await axios.post("/api/application-details/hr-score", null, {
  params: { applicationDetailId: 123, isPass: true, note: "", score: 80 },
});
// Kết quả: Bị nhảy 2 vòng!
```

### ❌ SAI: Không kiểm tra round type trước khi gọi

```javascript
// ❌ SAI - KHÔNG LÀM THEO
// Lấy danh sách cần review
const pendingList = await axios.get("/api/application-details/reviewer");

// Gọi hr-score cho TẤT CẢ các item mà không kiểm tra round type
for (const item of pendingList.data) {
  await axios.post("/api/application-details/hr-score", null, {
    params: {
      applicationDetailId: item.id,
      isPass: true,
      note: "",
      score: 80,
    },
  });
}
// Kết quả: Quiz rounds bị nhảy 2 vòng!
```

---

## Mẫu Code Ví Dụ

### Vue 3 / JavaScript - Hàm Chấm Điểm HR

```javascript
// services/interviewService.js

/**
 * Lấy danh sách các vòng cần HR review
 * @returns {Promise<Array>} Danh sách ApplicationDetail
 */
async function getPendingReviews() {
  const response = await axios.get("/api/application-details/reviewer");
  return response.data;
}

/**
 * Kiểm tra xem round có cần HR chấm điểm không
 * @param {string} roundType - Loại round
 * @returns {boolean}
 */
function requiresHrScoring(roundType) {
  // Chỉ MENTOR_REVIEW và CODING cần HR chấm điểm
  const hrRequiredRounds = ["MENTOR_REVIEW", "CODING"];
  return hrRequiredRounds.includes(roundType);
}

/**
 * Lấy thông tin round type từ application detail
 * @param {number} applicationId
 * @returns {Promise<string>} Round type
 */
async function getRoundType(applicationId) {
  const response = await axios.get(`/api/rounds/find-by-application-order/${applicationId}`);
  return response.data.roundType;
}

/**
 * Chấm điểm HR cho một vòng
 * @param {Object} params
 * @param {number} params.applicationDetailId
 * @param {boolean} params.isPass
 * @param {string} params.note
 * @param {number} params.score
 */
async function submitHrScore({ applicationDetailId, isPass, note, score }) {
  const response = await axios.post("/api/application-details/hr-score", null, {
    params: {
      applicationDetailId,
      isPass,
      note: note || "",
      score,
    },
  });
  return response;
}

/**
 * Submit bài quiz (tự động chấm điểm, không cần HR)
 * @param {Object} params
 */
async function submitQuiz(params) {
  const formData = new FormData();
  formData.append("applicationId", params.applicationId);
  formData.append("roundType", "QUIZ");
  formData.append("quizAnswers", JSON.stringify(params.quizAnswers));

  const response = await axios.post("/api/application-details/submit", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response;
}
```

### Vue 3 Component - Màn Hình Review HR

```vue
<template>
  <div class="hr-review-panel">
    <h2>Danh Sách Cần Review</h2>

    <div v-for="item in pendingList" :key="item.id" class="review-card">
      <div class="card-header">
        <span class="round-name">{{ item.roundName || "Vòng #" + item.roundId }}</span>
        <span :class="['status-badge', item.status]">{{ item.status }}</span>
      </div>

      <div class="card-body">
        <p>Application ID: {{ item.applicationId }}</p>
        <p>Started: {{ formatDate(item.startedAt) }}</p>
      </div>

      <!-- Chỉ hiển thị nút chấm điểm khi status là PENDING -->
      <div v-if="item.status === 'PENDING'" class="card-actions">
        <button @click="openScoringModal(item)" class="btn-score">Chấm Điểm</button>
      </div>

      <!-- Hiển thị kết quả đã chấm -->
      <div v-else-if="item.finalResult" class="result-summary">
        <p><strong>Điểm:</strong> {{ item.finalScore }}</p>
        <p><strong>Kết quả:</strong> {{ item.finalResult }}</p>
        <p v-if="item.hrNote"><strong>Ghi chú:</strong> {{ item.hrNote }}</p>
      </div>
    </div>

    <!-- Modal Chấm Điểm -->
    <div v-if="showScoringModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>Chấm Điểm HR</h3>

        <div class="form-group">
          <label>Điểm số (0-100)</label>
          <input v-model.number="scoringForm.score" type="number" min="0" max="100" />
        </div>

        <div class="form-group">
          <label>Kết quả</label>
          <select v-model="scoringForm.isPass">
            <option :value="true">PASSED - Đạt</option>
            <option :value="false">FAILED - Không đạt</option>
          </select>
        </div>

        <div class="form-group">
          <label>Ghi chú</label>
          <textarea v-model="scoringForm.note" rows="3"></textarea>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn-cancel">Hủy</button>
          <button @click="submitScore" class="btn-submit" :disabled="isSubmitting">
            {{ isSubmitting ? "Đang xử lý..." : "Xác Nhận" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getPendingReviews, submitHrScore } from "@/services/interviewService";

const pendingList = ref([]);
const showScoringModal = ref(false);
const isSubmitting = ref(false);
const currentItem = ref(null);

const scoringForm = ref({
  score: 0,
  isPass: true,
  note: "",
});

onMounted(async () => {
  try {
    pendingList.value = await getPendingReviews();
  } catch (error) {
    console.error("Lỗi khi lấy danh sách review:", error);
  }
});

function openScoringModal(item) {
  currentItem.value = item;
  scoringForm.value = {
    score: item.finalScore || 0,
    isPass: item.finalResult !== "FAILED",
    note: item.hrNote || "",
  };
  showScoringModal.value = true;
}

function closeModal() {
  showScoringModal.value = false;
  currentItem.value = null;
}

async function submitScore() {
  if (!currentItem.value) return;

  isSubmitting.value = true;

  try {
    await submitHrScore({
      applicationDetailId: currentItem.value.id,
      isPass: scoringForm.value.isPass,
      note: scoringForm.value.note,
      score: scoringForm.value.score,
    });

    // Cập nhật lại danh sách sau khi chấm điểm
    pendingList.value = await getPendingReviews();

    closeModal();

    alert("Chấm điểm thành công!");
  } catch (error) {
    console.error("Lỗi khi chấm điểm:", error);
    alert("Có lỗi xảy ra khi chấm điểm");
  } finally {
    isSubmitting.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("vi-VN");
}
</script>

<style scoped>
.hr-review-panel {
  padding: 20px;
}

.review-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.PENDING {
  background: #fff3cd;
  color: #856404;
}

.status-badge.COMPLETED {
  background: #d4edda;
  color: #155724;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-score {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-submit {
  background: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancel {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### Vue 3 - Xử Lý Submit Quiz (Tự Động)

```vue
<template>
  <div class="quiz-container">
    <h2>Bài Quiz - Vòng {{ currentRound }}</h2>

    <div v-for="(question, index) in questions" :key="index" class="question-card">
      <p class="question-text">{{ question.text }}</p>

      <div class="options">
        <label v-for="(option, optIndex) in question.options" :key="optIndex">
          <input
            type="radio"
            :name="'question-' + index"
            :value="option.label"
            v-model="answers[index]" />
          {{ option.label }}. {{ option.text }}
        </label>
      </div>
    </div>

    <button @click="submitQuiz" :disabled="isSubmitting" class="btn-submit">
      {{ isSubmitting ? "Đang nộp..." : "Nộp Bài" }}
    </button>

    <!-- Hiển thị kết quả sau khi nộp -->
    <div v-if="result" class="result-panel">
      <h3>Kết Quả</h3>
      <p>Điểm: {{ result.score }}%</p>
      <p>Trạng thái: {{ result.status }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { submitQuiz } from "@/services/interviewService";

const props = defineProps({
  applicationId: {
    type: Number,
    required: true,
  },
  questions: {
    type: Array,
    required: true,
  },
});

const answers = ref([]);
const isSubmitting = ref(false);
const result = ref(null);

async function handleSubmitQuiz() {
  if (answers.value.length !== props.questions.length) {
    alert("Vui lòng trả lời tất cả câu hỏi");
    return;
  }

  isSubmitting.value = true;

  try {
    // Format answers: chỉ cần gửi selectedAnswer
    const quizAnswers = answers.value.map((answer) => ({
      selectedAnswer: answer,
    }));

    const response = await submitQuiz({
      applicationId: props.applicationId,
      quizAnswers: quizAnswers,
    });

    result.value = {
      score: response.data.score || 80,
      status: response.data.roundResult,
    };

    // ✅ QUAN TRỌNG: KHÔNG gọi hr-score ở đây!
    // Backend QuizRoundProcessor đã tự động:
    // 1. Chấm điểm
    // 2. Set PASS/FAIL
    // 3. Gọi moveToNextRound()

    // FE chỉ cần chuyển sang màn hình tiếp theo
    setTimeout(() => {
      // Chuyển sang round tiếp theo
      router.push(`/interview/${props.applicationId}/next-round`);
    }, 2000);
  } catch (error) {
    console.error("Lỗi khi nộp quiz:", error);
    alert("Có lỗi xảy ra khi nộp bài");
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

### React - Hàm Tiện Ích

```typescript
// utils/interviewHelpers.ts

/**
 * Kiểm tra xem round type có cần HR scoring không
 */
export const HR_REQUIRED_ROUNDS = ["MENTOR_REVIEW", "CODING"];

export function requiresHrScoring(roundType: string): boolean {
  return HR_REQUIRED_ROUNDS.includes(roundType);
}

/**
 * Kiểm tra xem round type có tự động chấm điểm không
 */
export function isAutoGradedRound(roundType: string): boolean {
  const autoGradedRounds = [
    "QUIZ",
    "CV_SCREENING",
    "EMAIL_SIMULATOR",
    "CODE_REVIEW",
    "AI_INTERVIEW",
  ];
  return autoGradedRounds.includes(roundType);
}

/**
 * Xử lý submit quiz - KHÔNG gọi hr-score
 */
export async function handleQuizSubmit(
  applicationId: number,
  quizAnswers: { selectedAnswer: string }[]
) {
  const formData = new FormData();
  formData.append("applicationId", String(applicationId));
  formData.append("roundType", "QUIZ");
  formData.append("quizAnswers", JSON.stringify(quizAnswers));

  const response = await axios.post("/api/application-details/submit", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // ✅ KHÔNG gọi hr-score!
  // Backend tự động xử lý và chuyển round

  return response.data;
}

/**
 * Xử lý HR scoring - CHỈ gọi cho các round cần HR
 */
export async function handleHrScoring(
  applicationDetailId: number,
  score: number,
  isPass: boolean,
  note: string = ""
) {
  // Validate trước khi gọi
  if (score < 0 || score > 100) {
    throw new Error("Điểm phải từ 0 đến 100");
  }

  const response = await axios.post("/api/application-details/hr-score", null, {
    params: {
      applicationDetailId,
      isPass,
      note,
      score,
    },
  });

  return response.data;
}
```

---

## Checklist Cho FE Developer

### ✅ Làm Được

- [ ] Gọi `POST /api/application-details/hr-score` **CHỈ** cho `MENTOR_REVIEW` và `CODING`
- [ ] KHÔNG gọi `hr-score` cho `QUIZ`, `CV_SCREENING`, `EMAIL_SIMULATOR`, `CODE_REVIEW`, `AI_INTERVIEW`
- [ ] Kiểm tra `status` của ApplicationDetail trước khi hiển thị nút chấm điểm
- [ ] Disable nút chấm điểm sau khi đã chấm (status = `COMPLETED`)
- [ ] Hiển thị thông báo thành công sau khi chấm điểm HR

### ❌ Cần Tránh

- [ ] KHÔNG gọi `hr-score` cho vòng Quiz
- [ ] KHÔNG gọi `hr-score` 2 lần cho cùng 1 ApplicationDetail
- [ ] KHÔNG tự động gọi `hr-score` khi FE chuyển trang
- [ ] KHÔNG loop qua tất cả pending items và gọi `hr-score` mà không kiểm tra round type

---

## Tóm Tắt Quy Tắc Vàng

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUY TẮC VÀNG                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Quiz → KHÔNG gọi hr-score (Backend tự động chuyển)             │
│                                                                      │
│  2. CODING / MENTOR_REVIEW → CẦN gọi hr-score (1 lần duy nhất)    │
│                                                                      │
│  3. Sau khi submit Quiz → FE tự động chuyển trang (không chờ)     │
│                                                                      │
│  4. Sau khi HR chấm điểm → Backend tự động chuyển round           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Liên Hệ Backend Nếu Cần Hỗ Trợ

Nếu gặp vấn đề khác về luồng xử lý interview, liên hệ backend team để xác nhận:

1. Round type hiện tại là gì?
2. Backend có tự động gọi `moveToNextRound()` sau khi xử lý không?
3. Có cần FE gọi thêm endpoint nào khác không?
