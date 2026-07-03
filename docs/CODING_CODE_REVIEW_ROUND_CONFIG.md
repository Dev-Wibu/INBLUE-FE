# CODING & CODE_REVIEW Round Config — Giải thích đầy đủ

> Document dành cho FE/AI Agent đọc và implement. Câu hỏi được trả lời từng mục.

---

## 0. Xác nhận Server

- **Commit hash hiện tại:** `304b046477d576da5db63b5aaf8ca653146e0742`
- **Logic `codingProblemsId`:** ✅ Đã implement đầy đủ (từ commit đầu tiên)
- **Logic `codeReviewIds`:** ✅ Đã implement đầy đủ (thêm từ commit `304b046`)
- **Log debug:** ⚠️ Chỉ có log ở `setUpRoundForJd` (dòng 47, 125). **`updateRoundForJd` KHÔNG có log nhận payload** — đây là nguyên nhân khó debug bug FE báo.

---

## 1. `codingProblemsId` (CODING round)

### 1.1 Dùng khi nào?

Dùng khi:

- `roundType == CODING`
- Admin chọn bài tập lập trình từ **Kho đề bài Coding Problems**
- FE gửi danh sách ID bài coding muốn gán vào round này

### 1.2 Nằm trong schema nào?

| Schema                              | Tên field          | Vai trò          |
| ----------------------------------- | ------------------ | ---------------- |
| **Request DTO** (`RoundConfigDto`)  | `codingProblemsId` | FE gửi lên BE    |
| **Response Entity** (`RoundConfig`) | `codingProblems`   | BE trả về cho FE |

### 1.3 Request body mẫu — Tạo round mới (Setup)

`POST /api/rounds/jd/{jdId}/setup`

```json
{
  "rounds": [
    {
      "name": "Coding Round 1",
      "roundOrder": 2,
      "roundType": "CODING",
      "passThreshold": 7.0,
      "reviewerId": null,
      "configData": {
        "instruction": "Làm bài trong 90 phút. Chỉ nộp qua hệ thống.",
        "submissionFormat": "code",
        "timeLimitMinutes": 90,
        "maxScore": 100,
        "aiSystemPrompt": null,
        "evaluationCriteria": null,
        "quizQuestions": null,
        "codingProblemsId": [1, 2],
        "codeReviewIds": null
      }
    }
  ]
}
```

### 1.4 Request body mẫu — Cập nhật round (Update)

`PUT /api/rounds/jd/{jdId}/update`

```json
{
  "rounds": [
    {
      "id": 10,
      "name": "Coding Round 1",
      "roundOrder": 2,
      "roundType": "CODING",
      "passThreshold": 7.0,
      "reviewerId": null,
      "configData": {
        "instruction": "Làm bài trong 90 phút.",
        "submissionFormat": "code",
        "timeLimitMinutes": 90,
        "maxScore": 100,
        "aiSystemPrompt": null,
        "evaluationCriteria": null,
        "quizQuestions": null,
        "codingProblemsId": [1, 2, 3],
        "codeReviewIds": null
      }
    }
  ]
}
```

### 1.5 Response mẫu — Đúng (200 OK)

```json
[
  {
    "id": 10,
    "name": "Coding Round 1",
    "roundOrder": 2,
    "roundType": "CODING",
    "passThreshold": 7.0,
    "reviewerId": null,
    "isDeleted": false,
    "isAuto": false,
    "createdAt": "2024-01-15T10:00:00",
    "updatedAt": "2024-01-15T10:30:00",
    "configData": {
      "instruction": "Làm bài trong 90 phút. Chỉ nộp qua hệ thống.",
      "submissionFormat": "code",
      "timeLimitMinutes": 90,
      "maxScore": 100,
      "aiSystemPrompt": null,
      "evaluationCriteria": null,
      "quizQuestions": [],
      "codingProblems": [
        {
          "problemId": 1,
          "title": "Two Sum",
          "difficulty": "EASY",
          "problemStatement": "Given an array of integers...",
          "rulesAndConstraints": ["1 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
          "visibleExamples": [
            {
              "inputs": ["[2,7,11,15]", "9"],
              "output": "[0,1]",
              "explanation": "Because nums[0] + nums[1] == 9"
            }
          ],
          "executionTimeLimitMs": 2000,
          "memoryLimitMb": 256,
          "codeStubs": {
            "JAVA": "class Solution { public int[] twoSum(int[] nums, int target) { ... } }",
            "PYTHON": "class Solution: def twoSum(self, nums: List[int], target: int) -> List[int]: ..."
          }
        },
        {
          "problemId": 2,
          "title": "Reverse Linked List",
          "difficulty": "MEDIUM",
          "problemStatement": "Given the head of a singly linked list...",
          "rulesAndConstraints": ["The number of nodes in the list is in the range [0, 5000]"],
          "visibleExamples": [...],
          "executionTimeLimitMs": 2000,
          "memoryLimitMb": 256,
          "codeStubs": {...}
        }
      ],
      "codeReviewProblems": []
    }
  }
]
```

### 1.6 Khác nhau: `codingProblemsId` (request) vs `codingProblems` (response)

|                 | `codingProblemsId` (Request) | `codingProblems` (Response)                        |
| --------------- | ---------------------------- | -------------------------------------------------- |
| **Type**        | `List<Long>` — chỉ mảng ID   | `List<CodingProblemSnapshot>` — mảng object đầy đủ |
| **Nội dung**    | `[1, 2]` — 2 con số          | Mảng chứa **tất cả field** của bài gốc đã snapshot |
| **Mục đích**    | Input để BE query            | Output chứa data để ứng viên làm bài               |
| **Ai sinh ra?** | FE gửi lên                   | BE build từ DB và gửi lại                          |

**Giải thích snapshot:** Khi round được tạo, BE đọc bài gốc từ bảng `coding_problems` → build `CodingProblemSnapshot` → lưu vào `configData`. Nếu sau này admin sửa bài gốc trong kho, round đã tạo **vẫn giữ nguyên** nội dung cũ (snapshot).

### 1.7 Các case đúng/sai

#### ✅ Case đúng — `codingProblems` có data

```
FE gửi:  codingProblemsId: [1, 2]
DB có:    id=1, id=2 tồn tại trong bảng coding_problems
Kết quả: 200 OK
          codingProblems: [CodingProblemSnapshot, CodingProblemSnapshot]
```

#### ❌ Case lỗi — `codingProblems` rỗng dù gửi `codingProblemsId`

Có 3 nguyên nhân khả dụ:

1. **Request không gửi `codingProblemsId`** — gửi `null` hoặc không có field → BE không vào block `if != null` → `codingProblems` vẫn là `[]`
2. **Sai key name** — FE gửi `problemIds` thay vì `codingProblemsId` → Jackson deserialize thành `null` → BE không xử lý
3. **Commit chưa deploy** — code logic đã đúng nhưng server chưa restart

#### 🔴 Case 400 — ID không tồn tại

```
FE gửi:  codingProblemsId: [1, 999]
DB có:   id=1 tồn tại, id=999 KHÔNG tồn tại
Kết quả:
  setUpRoundForJd:  404 Not Found — "Coding problem không tồn tại với id: 999"
  updateRoundForJd: 400 Bad Request — "Coding Problem với id 999 không tồn tại"
```

---

## 2. `codeReviewIds` (CODE_REVIEW round)

### 2.1 Dùng khi nào?

Dùng khi:

- `roundType == CODE_REVIEW`
- Admin chọn bài tập review code từ **Kho đề bài Code Review Problems**
- FE gửi danh sách ID bài code review muốn gán vào round

### 2.2 Nằm trong schema nào?

| Schema                              | Tên field            | Vai trò          |
| ----------------------------------- | -------------------- | ---------------- |
| **Request DTO** (`RoundConfigDto`)  | `codeReviewIds`      | FE gửi lên BE    |
| **Response Entity** (`RoundConfig`) | `codeReviewProblems` | BE trả về cho FE |

### 2.3 Request body mẫu — Tạo round mới (Setup)

`POST /api/rounds/jd/{jdId}/setup`

```json
{
  "rounds": [
    {
      "name": "Code Review Round",
      "roundOrder": 3,
      "roundType": "CODE_REVIEW",
      "passThreshold": 7.0,
      "reviewerId": null,
      "configData": {
        "instruction": "Hãy review các đoạn code dưới đây và liệt kê lỗi bảo mật, code smell, vấn đề hiệu năng.",
        "submissionFormat": "json",
        "timeLimitMinutes": 45,
        "maxScore": 10,
        "aiSystemPrompt": null,
        "evaluationCriteria": null,
        "quizQuestions": null,
        "codingProblemsId": null,
        "codeReviewIds": [1, 2]
      }
    }
  ]
}
```

### 2.4 Request body mẫu — Cập nhật round (Update)

`PUT /api/rounds/jd/{jdId}/update`

```json
{
  "rounds": [
    {
      "id": 161,
      "name": "Code Review Round",
      "roundOrder": 3,
      "roundType": "CODE_REVIEW",
      "passThreshold": 7.0,
      "reviewerId": null,
      "configData": {
        "instruction": "Hãy review code và liệt kê lỗi.",
        "submissionFormat": "json",
        "timeLimitMinutes": 45,
        "maxScore": 10,
        "aiSystemPrompt": null,
        "evaluationCriteria": null,
        "quizQuestions": null,
        "codingProblemsId": null,
        "codeReviewIds": [2, 1]
      }
    }
  ]
}
```

### 2.5 Response mẫu — Đúng (200 OK)

```json
[
  {
    "id": 161,
    "name": "Code Review Round",
    "roundOrder": 3,
    "roundType": "CODE_REVIEW",
    "passThreshold": 7.0,
    "reviewerId": null,
    "isDeleted": false,
    "isAuto": false,
    "createdAt": "2024-01-15T10:00:00",
    "updatedAt": "2024-01-15T10:30:00",
    "configData": {
      "instruction": "Hãy review code và liệt kê lỗi.",
      "submissionFormat": "json",
      "timeLimitMinutes": 45,
      "maxScore": 10,
      "aiSystemPrompt": null,
      "evaluationCriteria": null,
      "quizQuestions": [],
      "codingProblems": [],
      "codeReviewProblems": [
        {
          "problemId": 1,
          "title": "Review Authentication Module",
          "difficulty": "HARD",
          "language": "Java",
          "problemStatement": "Hãy review module authentication sau...",
          "files": [
            {
              "filename": "src/main/java/com/example/security/AuthService.java",
              "content": "public class AuthService {\n    public User authenticate(String username, String password) {\n        // TODO: implement\n        return null;\n    }\n}",
              "language": "java"
            },
            {
              "filename": "src/main/java/com/example/security/UserController.java",
              "content": "@RestController\npublic class UserController {\n    @GetMapping(\"/users/{id}\")\n    public User getUser(@PathVariable Long id) {\n        return userRepository.findById(id).orElse(null);\n    }\n}",
              "language": "java"
            }
          ],
          "expectedIssues": [
            {
              "filename": "AuthService.java",
              "lineNumber": 3,
              "severity": "CRITICAL",
              "description": "Mật khẩu được truyền trực tiếp không hash. Cần sử dụng BCrypt hoặc Argon2."
            },
            {
              "filename": "UserController.java",
              "lineNumber": 5,
              "severity": "CRITICAL",
              "description": "Không có kiểm tra authorization. Bất kỳ ai cũng có thể truy cập dữ liệu user khác (IDOR vulnerability)."
            }
          ]
        },
        {
          "problemId": 2,
          "title": "Review Database Queries",
          "difficulty": "MEDIUM",
          "language": "Java",
          "problemStatement": "Hãy review các câu query sau...",
          "files": [...],
          "expectedIssues": [...]
        }
      ]
    }
  }
]
```

### 2.6 Khác nhau: `codeReviewIds` (request) vs `codeReviewProblems` (response)

|                 | `codeReviewIds` (Request)  | `codeReviewProblems` (Response)                                           |
| --------------- | -------------------------- | ------------------------------------------------------------------------- |
| **Type**        | `List<Long>` — chỉ mảng ID | `List<CodeReviewProblemSnapshot>` — mảng object đầy đủ                    |
| **Nội dung**    | `[1, 2]` — 2 con số        | Mảng chứa **tất cả field** đã snapshot: title, files, expectedIssues, ... |
| **Mục đích**    | Input để BE query          | Output chứa data để ứng viên làm bài review                               |
| **Ai sinh ra?** | FE gửi lên                 | BE build từ DB và gửi lại                                                 |

### 2.7 Các case đúng/sai

#### ✅ Case đúng — `codeReviewProblems` có data

```
FE gửi:  codeReviewIds: [1, 2]
DB có:   id=1, id=2 tồn tại trong bảng code_review_problems
Kết quả: 200 OK
          codeReviewProblems: [CodeReviewProblemSnapshot, CodeReviewProblemSnapshot]
```

#### ❌ Case lỗi — `codeReviewProblems` rỗng dù gửi `codeReviewIds`

Nguyên nhân tương tự `codingProblemsId`:

1. **FE không gửi `codeReviewIds`** — gửi `null` hoặc thiếu field → BE không vào block `if != null` → `codeReviewProblems` vẫn là `[]`
2. **Sai key name** — FE gửi `reviewProblemIds` thay vì `codeReviewIds` → Jackson deserialize thành `null`
3. **FE gửi cả `codeReviewProblems` (snapshot) trong request** — BE hoàn toàn ignore vì request DTO không có field `codeReviewProblems`
4. **Commit chưa deploy**

#### 🔴 Case 400 — ID không tồn tại

```
FE gửi:  codeReviewIds: [1, 999]
DB có:   id=1 tồn tại, id=999 KHÔNG tồn tại
Kết quả:
  setUpRoundForJd:  404 Not Found — "Code review problem không tồn tại với id: 999"
  updateRoundForJd: 400 Bad Request — "Code review problem với id 999 không tồn tại"
```

---

## 3. So sánh CODING vs CODE_REVIEW

### 3.1 Giống nhau

|                                | CODING                                           | CODE_REVIEW |
| ------------------------------ | ------------------------------------------------ | ----------- |
| Cơ chế                         | FE gửi ID list → BE query → snapshot → lưu JSONB | Y chang     |
| Repository query               | `findById(Long id)`                              | Y chang     |
| Null check                     | `if (ids != null)`                               | Y chang     |
| Exception khi ID không tồn tại | `orElseThrow()`                                  | Y chang     |
| Snapshot pattern               | `builder().field(problem.getField()).build()`    | Y chang     |
| Serialize                      | `@JdbcTypeCode(SqlTypes.JSON)` → JSONB           | Y chang     |

### 3.2 Khác nhau

|                          | CODING                                                                                                                               | CODE_REVIEW                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Bảng DB**              | `coding_problems`                                                                                                                    | `code_review_problems`                                                                                       |
| **Repository**           | `CodingProblemsRepository`                                                                                                           | `CodeReviewProblemsRepository`                                                                               |
| **Entity gốc**           | `CodingProblem`                                                                                                                      | `CodeReviewProblem`                                                                                          |
| **Snapshot class**       | `CodingProblemSnapshot`                                                                                                              | `CodeReviewProblemSnapshot`                                                                                  |
| **Fields snapshot**      | problemId, title, difficulty, problemStatement, rulesAndConstraints, visibleExamples, executionTimeLimitMs, memoryLimitMb, codeStubs | problemId, title, difficulty, language, problemStatement, files, expectedIssues                              |
| **Khác biệt quan trọng** | Có `codeStubs` (code stub để ứng viên điền)                                                                                          | Có `files` (danh sách file code để review) và `expectedIssues` (danh sách lỗi mẫu để AI đối chiếu chấm điểm) |

### 3.3 Hibernate JSONB serialization

**Hoàn toàn giống nhau.** Cả 2 đều:

```java
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")
private RoundConfig configData;
```

`RoundConfig` chứa `List<CodingProblemSnapshot>` và `List<CodeReviewProblemSnapshot>`. Hibernate dùng Jackson để serialize cả 2 list vào cùng 1 JSONB column. Không có sự khác biệt nào về cách Hibernate xử lý.

---

## 4. Code BE đối chiếu

### 4.1 Logic `codingProblemsId` — setUpRoundForJd (dòng 81–103)

```java
if (item.getConfigData().getCodingProblemsId() != null) {
    List<Round.CodingProblemSnapshot> codingProblems = new ArrayList<>();
    for (Long codingProblemId : item.getConfigData().getCodingProblemsId()) {
        CodingProblem cp = codingProblemsRepository
                .findById(codingProblemId)
                .orElseThrow(() -> new CustomException(
                        "Coding problem không tồn tại với id: " + codingProblemId, HttpStatus.NOT_FOUND));
        Round.CodingProblemSnapshot snapshot = Round.CodingProblemSnapshot.builder()
                .title(cp.getTitle())
                .codeStubs(cp.getCodeStubs())
                .difficulty(cp.getDifficulty())
                .executionTimeLimitMs(cp.getExecutionTimeLimitMs())
                .memoryLimitMb(cp.getMemoryLimitMb())
                .problemId(codingProblemId)
                .problemStatement(cp.getProblemStatement())
                .rulesAndConstraints(cp.getRulesAndConstraints())
                .visibleExamples(cp.getVisibleExamples())
                .build();
        codingProblems.add(snapshot);
    }
    roundConfig.setCodingProblems(codingProblems);
}
```

### 4.2 Logic `codeReviewIds` — setUpRoundForJd (dòng 104–123)

```java
if (item.getConfigData().getCodeReviewIds() != null) {
    List<Round.CodeReviewProblemSnapshot> codeReviewProblems = new ArrayList<>();
    for (Long codeReviewId : item.getConfigData().getCodeReviewIds()) {
        CodeReviewProblem problem = codeReviewProblemsRepository
                .findById(codeReviewId)
                .orElseThrow(() -> new CustomException(
                        "Code review problem không tồn tại với id: " + codeReviewId, HttpStatus.NOT_FOUND));
        Round.CodeReviewProblemSnapshot snapshot = Round.CodeReviewProblemSnapshot.builder()
                .title(problem.getTitle())
                .files(problem.getFiles())
                .language(problem.getLanguage())
                .expectedIssues(problem.getExpectedIssues())
                .problemStatement(problem.getProblemStatement())
                .problemId(problem.getId())
                .difficulty(problem.getDifficulty())
                .build();
        codeReviewProblems.add(snapshot);
    }
    roundConfig.setCodeReviewProblems(codeReviewProblems);
}
```

### 4.3 Logic `codingProblemsId` — updateRoundForJd (dòng 184–205)

```java
List<Round.CodingProblemSnapshot> codingProblems = new ArrayList<>();
if (item.getConfigData().getCodingProblemsId() != null) {
    for (Long codingProblemId : item.getConfigData().getCodingProblemsId()) {
        Optional<CodingProblem> cp = codingProblemsRepository.findById(codingProblemId);
        if (cp.isEmpty()) {
            throw new CustomException(
                    "Coding Problem với id " + codingProblemId + " không tồn tại", HttpStatus.BAD_REQUEST);
        }
        Round.CodingProblemSnapshot snapshot = Round.CodingProblemSnapshot.builder()
                .title(cp.get().getTitle())
                .codeStubs(cp.get().getCodeStubs())
                .difficulty(cp.get().getDifficulty())
                .executionTimeLimitMs(cp.get().getExecutionTimeLimitMs())
                .memoryLimitMb(cp.get().getMemoryLimitMb())
                .problemId(codingProblemId)
                .problemStatement(cp.get().getProblemStatement())
                .rulesAndConstraints(cp.get().getRulesAndConstraints())
                .visibleExamples(cp.get().getVisibleExamples())
                .build();
        codingProblems.add(snapshot);
    }
}
// ...
roundConfig.setCodingProblems(codingProblems);
```

### 4.4 Logic `codeReviewIds` — updateRoundForJd (dòng 207–226)

```java
List<Round.CodeReviewProblemSnapshot> codeReviewProblems = new ArrayList<>();
if (item.getConfigData().getCodeReviewIds() != null) {
    for (Long codeReviewId : item.getConfigData().getCodeReviewIds()) {
        CodeReviewProblem problem = codeReviewProblemsRepository
                .findById(codeReviewId)
                .orElseThrow(() -> new CustomException(
                        "Code review problem với id " + codeReviewId + " không tồn tại",
                        HttpStatus.BAD_REQUEST));
        Round.CodeReviewProblemSnapshot snapshot = Round.CodeReviewProblemSnapshot.builder()
                .title(problem.getTitle())
                .files(problem.getFiles())
                .language(problem.getLanguage())
                .expectedIssues(problem.getExpectedIssues())
                .problemStatement(problem.getProblemStatement())
                .problemId(problem.getId())
                .difficulty(problem.getDifficulty())
                .build();
        codeReviewProblems.add(snapshot);
    }
}
// ...
roundConfig.setCodeReviewProblems(codeReviewProblems);
```

---

## 5. Tổng hợp

### 5.1 Điểm giống/het khác code giữa 2 method

|                                | setUpRoundForJd                           | updateRoundForJd                                            |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------- |
| `codingProblemsId` null check  | `!= null` → query                         | `!= null` → query                                           |
| `codeReviewIds` null check     | `!= null` → query                         | `!= null` → query                                           |
| Exception khi ID không tồn tại | `404 NOT_FOUND`                           | `400 BAD_REQUEST` (coding) / `400 BAD_REQUEST` (codeReview) |
| Log nhận payload               | ✅ Có `System.out.println`                | ❌ KHÔNG có log                                             |
| Save                           | `jobDescriptionRepository.save(jd.get())` | `jobDescriptionRepository.save(jd)` (cùng logic)            |

### 5.2 Nhận xét cuối cùng về bug FE báo

**Bug: FE gửi `codeReviewIds: [2, 1]` nhưng response `codeReviewProblems: []`**

Xác suất nguyên nhân theo thứ tự:

1. **⚠️ 90% — FE không gửi đúng `codeReviewIds` trong request thực tế** — có thể key name sai, payload thực tế khác payload mẫu
2. **⚠️ 5% — Commit/fix chưa deploy lên môi trường test** — cần verify server đang chạy commit nào
3. **5% — ID không tồn tại trong DB** — nhưng FE báo API 200 OK nên không phải

**Hành động cần làm ngay:**

- BE thêm log vào `updateRoundForJd` để in ra `codeReviewIds` nhận được
- FE log ra payload gửi đi thực tế (không phải payload mẫu trong spec)
- Verify server đang chạy commit `304b046477d576da5db63b5aaf8ca653146e0742`

---

> **Document generated from source code - Commit: 304b046477d576da5db63b5aaf8ca653146e0742 - 2026-07-03**
