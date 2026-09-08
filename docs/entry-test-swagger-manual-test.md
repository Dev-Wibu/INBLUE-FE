# Entry Test - Huong dan test thu cong tren Swagger

Tai lieu nay dung de test Candidate flow end-to-end tren backend hien tai. Base URL mac dinh cua FE local la `http://localhost:8080`. Swagger thuong o `http://localhost:8080/swagger-ui/index.html`; neu BE deploy host khac, thay host nhung giu nguyen path.

## 0. Dieu kien truoc khi test

- Co tai khoan role `USER` va biet email/password.
- Backend co Entry Test active, question bank du theo tung section va coding problem EASY.
- Backend co Level Scale active phu hop. Neu thieu scale, Submit rollback va tra `400 Level scale is not configured for this score`.
- Khong bam `Execute` hai lan cho Start hoac Submit. Hai endpoint nay khong idempotent va FE cung khong auto-retry.

## 1. Dang nhap va gan Bearer token

Mo `POST /api/auth/login`, request:

```json
{
  "email": "<email USER>",
  "password": "<password>"
}
```

Ket qua dung: `200 OK`, body la JWT string. Swagger schema hien tai khai bao response la `string`, khong phai `{ "data": ... }`.

Nhan nut **Authorize** tren Swagger, nhap token theo form ma Swagger yeu cau. Thuong chi can JWT; neu UI khong tu them prefix thi nhap `Bearer <JWT>`. Tu buoc nay tat ca request deu phai co header:

```http
Authorization: Bearer <JWT>
```

## 2. Kiem tra career preference

### 2.1 GET `/api/me/career-preference/exists`

Khong co body. Ket qua dung la `200 OK` voi body boolean truc tiep:

```json
false
```

Neu `true`, goi tiep GET o buoc 2.2 de xem du lieu cu.

### 2.2 GET `/api/me/career-preference`

Khong co body. Ket qua dung khi da co preference:

```json
{
  "userId": 7,
  "targetRole": "FE",
  "languagesJson": ["REACT", "TYPESCRIPT"],
  "careerGoal": "Frontend Engineer",
  "targetLevel": "JUNIOR",
  "needRetest": true,
  "isActive": true,
  "createdAt": "2026-08-31T10:00:00",
  "updatedAt": "2026-08-31T10:00:00"
}
```

`404 Career preference not found` la dung neu user moi chua tung luu.

### 2.3 PUT `/api/me/career-preference`

Request mau cho Frontend:

```json
{
  "targetRole": "FE",
  "languagesJson": ["REACT", "TYPESCRIPT"],
  "careerGoal": "Frontend Engineer",
  "targetLevel": "JUNIOR"
}
```

Ket qua dung: `200 OK`, object truc tiep, `targetRole = FE`, languages dung array va `needRetest = true` neu role/languages vua thay doi. Nen sap xep `languagesJson` on dinh; BE so sanh ca thu tu array.

Enum role hop le: `BE`, `FE`, `QA_QC`, `BA`, `DEVOPS`, `DATA`. Enum level hop le: `INTERN`, `FRESHER`, `JUNIOR`, `MIDDLE`.

## 3. Start Entry Test

Mo `POST /api/entry-tests/start`. Khong co body. Chi bam **Execute mot lan**.

Ket qua dung: `200 OK` va object truc tiep:

```json
{
  "attemptId": 102,
  "entryTestId": 3,
  "timeLimitMinutes": 60,
  "selectedLanguagesJson": ["REACT", "TYPESCRIPT"],
  "sectionConfigs": [
    {
      "sectionType": "COMMON_QUIZ",
      "itemType": "QUESTION_BANK",
      "itemCount": 1,
      "totalScore": 30,
      "scorePerItem": 2,
      "displayOrder": 1
    }
  ],
  "commonQuizItemsJson": [
    {
      "itemId": "COMMON-1",
      "questionBankId": 11,
      "questionText": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "maxScore": 2,
      "displayOrder": 1
    }
  ],
  "specificQuizItemsJson": [],
  "specificCodingItemsJson": []
}
```

Ghi lai `attemptId` va tat ca `itemId` trong response. Khong tu dat ID. Response dung khong duoc co `correctAnswer` hay hidden tests.

Loi co y nghia:

- `400 Career preference not found`: quay lai buoc 2.3.
- `400 Not enough items for ...`: BE/question bank chua du de sinh de; khong bam Start lai lien tuc.
- `500` sau Skip voi role null: gap hien tai cua BE; phai PUT role truoc khi Start.

## 4. Run code voi visible examples

Chi lam buoc nay neu Start tra coding item. Mo `POST /api/entry-tests/{attemptId}/coding/run`, dien `attemptId` da luu. Request phai dung `itemId` va language co trong `codeStubs`:

```json
{
  "itemId": "CODING-1",
  "language": "JAVA",
  "sourceCode": [
    "class Solution {",
    "    public int[] twoSum(int[] nums, int target) {",
    "        return new int[] {0, 1};",
    "    }",
    "}"
  ]
}
```

Ket qua dung:

```json
{
  "status": "COMPLETED",
  "passedTestCases": 1,
  "totalTestCases": 1,
  "executionTimeMs": 24,
  "errorMessage": null,
  "testCases": [
    {
      "index": 0,
      "status": "PASSED",
      "input": "[[2,7,11,15],9]",
      "expectedOutput": "[0,1]",
      "actualOutput": "[0,1]",
      "executionTimeMs": 20,
      "errorMessage": null
    }
  ]
}
```

Run chi test visible examples, khong ghi diem. `502` nghia la sandbox loi; code van co the giu va retry thu cong sau.

## 5. Submit toan bo bai

Mo `POST /api/entry-tests/{attemptId}/submit`, dung cung attempt. Request mau:

```json
{
  "answers": [
    {
      "itemId": "COMMON-1",
      "answerJson": { "selectedOption": "B" }
    },
    {
      "itemId": "SPECIFIC-1",
      "answerJson": { "selectedOption": "A" }
    },
    {
      "itemId": "CODING-1",
      "answerJson": {
        "language": "JAVA",
        "sourceCode": ["class Solution {", "    // code", "}"]
      }
    }
  ]
}
```

Quy tac bat buoc:

- Quiz gui `A/B/C/D`, khong gui ca noi dung option.
- Moi `itemId` xuat hien toi da mot lan va phai den tu Start response.
- Coding gui `sourceCode` dang array dong.
- Khong gui `score`, `isCorrect`, `testResult`, hidden tests hoac diem tu Run.
- Co the bo item chua tra loi; BE cham item do 0.

Chi bam **Execute mot lan**. Ket qua dung: `200 OK`, `status = GRADED`, co `submittedAt`, diem tung phan, `finalScore` va `resultLevel`:

```json
{
  "id": 102,
  "status": "GRADED",
  "commonQuizScore": 26,
  "specificQuizScore": 25,
  "specificCodingScore": 32,
  "finalScore": 83,
  "resultLevel": "JUNIOR",
  "submittedAt": "2026-08-31T11:05:02"
}
```

Coding co the duoc diem mot phan du `answersJson[].isCorrect = false`; diem authoritative la `score`/`specificCodingScore` backend tra ve.

Neu Swagger timeout/5xx, khong Submit lai ngay. Lam buoc 6 truoc de biet transaction da commit hay chua.

## 6. Xac minh result

Mo `GET /api/entry-tests/attempts/{attemptId}/result`.

- `status = GRADED`: Submit da thanh cong; tuyet doi khong Submit lai.
- `status = IN_PROGRESS`: transaction Submit chua commit; sua loi cau hinh/payload roi moi can nhac Submit lai.
- `403`: attempt thuoc user khac; ownership protection dang dung.
- `404`: attempt ID khong ton tai.

Endpoint co the tra moi status. Chi coi la ket qua cuoi khi `status = GRADED`.

## 7. Xac minh competency

Mo `GET /api/me/competency`. Ket qua dung sau Submit:

```json
{
  "userId": 7,
  "targetRole": "FE",
  "languagesJson": ["REACT", "TYPESCRIPT"],
  "currentLevel": "JUNIOR",
  "currentScore": 83,
  "commonQuizScore": 26,
  "specificQuizScore": 25,
  "specificCodingScore": 32,
  "lastEntryTestAttemptId": 102,
  "lastEvaluatedAt": "2026-08-31T11:05:02"
}
```

Kiem tra `lastEntryTestAttemptId` bang attempt vua submit, `currentScore` bang `finalScore`, va career preference sau do co `needRetest = false`. User chua tung duoc cham nhan `404 User competency not found`; day la empty state hop le.

## 8. Checklist ket luan flow dung

- Exists/Get/PUT/Start/Run/Submit/Result/Competency deu dung cung JWT USER.
- Start response khong lo dap an dung hay hidden tests.
- `attemptId` va `itemId` trong request lay nguyen tu response backend.
- Submit chi gui mot request va ket thuc `GRADED`.
- Result va Competency co cung diem/attempt moi nhat.
- Sau Submit, GET career preference tra `needRetest = false`.
- Neu co `traceId` trong error, ghi lai status + endpoint + traceId de BE tra log; khong gui JWT hay toan bo source code vao log/chat.
