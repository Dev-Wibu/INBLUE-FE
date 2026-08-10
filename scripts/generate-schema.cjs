const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
let apiBaseUrl = ""; // 1. Xóa URL mặc định để bảo mật, không sợ lộ trong lịch sử Git
let username = "";
let password = "";

// Đọc URL từ file .env nếu file này tồn tại
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const urlMatch = envContent.match(/^VITE_API_BASE_URL=(.+)$/m);
  if (urlMatch && urlMatch[1]) {
    apiBaseUrl = urlMatch[1].replace(/['"]/g, "").trim();
  }

  const userMatch = envContent.match(/^SWAGGER_USERNAME=(.+)$/m);
  const passMatch = envContent.match(/^SWAGGER_PASSWORD=(.+)$/m);

  if (userMatch && passMatch && userMatch[1] && passMatch[1]) {
    username = userMatch[1].replace(/['"]/g, "").trim();
    password = passMatch[1].replace(/['"]/g, "").trim();
  }
}

// 2. XỬ LÝ CHO HUSKY: Nếu không có URL API, bỏ qua và KHÔNG báo lỗi
if (!apiBaseUrl) {
  console.log("⚠️  VITE_API_BASE_URL không tồn tại. Bỏ qua bước tạo TS Schema.");
  process.exit(0); // Trả về 0 để Husky hiểu là "Hợp lệ" và cho phép tiếp tục commit
}

console.log(`🚀 Đang tải schema từ Backend...`); // Ẩn bớt URL cụ thể khi log nếu muốn bảo mật tuyệt đối

async function fetchAndGenerate() {
  try {
    const headers = {};
    if (username && password) {
      headers["Authorization"] =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    const response = await fetch(`${apiBaseUrl}/v3/api-docs`, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }
    const data = await response.text();

    // Save to temp file
    const tempFile = path.join(__dirname, "../temp-schema.json");
    fs.writeFileSync(tempFile, data);

    // Run openapi-typescript on the local file
    const command = `pnpm exec openapi-typescript temp-schema.json -o ./schema-from-be.d.ts`;
    execSync(command, { stdio: "inherit" });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    console.log("✅ Schema generated successfully!");

    // POST-PROCESS: Thêm các field cần thiết mà backend chưa có trong OpenAPI spec
    patchSchema();
  } catch (error) {
    console.error("❌ Failed to generate schema:", error.message);
    process.exit(0);
  }
}

// Hàm patch schema để thêm các field cần thiết cho FE
function patchSchema() {
  const schemaPath = path.join(__dirname, "../schema-from-be.d.ts");
  if (!fs.existsSync(schemaPath)) return;

  let content = fs.readFileSync(schemaPath, "utf8");

  // Field cần thêm vào RoundConfigDto (dùng cho request payload)
  // Backend đã xử lý codeReviewIds nhưng chưa expose trong OpenAPI spec
  const fieldToAdd = "            codeReviewIds?: number[];";

  // Tìm RoundConfigDto và thêm field nếu chưa có
  const roundConfigDtoRegex = /RoundConfigDto:\s*\{([^}]+)\}/g;
  content = content.replace(roundConfigDtoRegex, (match, body) => {
    // Kiểm tra đã có codeReviewIds chưa
    if (body.includes("codeReviewIds")) return match;
    // Thêm vào sau codingProblemsId
    return match.replace(/(codingProblemsId\?:\s*number\[\];)/, `$1\n${fieldToAdd}`);
  });

  // Field cần thêm vào ApplicationDetail (dùng cho list response của /reviewer)
  // Backend đã trả về applicationName/userName ở response nhưng OpenAPI spec chưa cập nhật.
  const applicationDetailFieldsToAdd = [
    { name: "applicationName", line: "            applicationName?: string;" },
    { name: "userName", line: "            userName?: string;" },
  ];

  // Find the start of ApplicationDetail schema and balance nested braces to find the end.
  const adStartPattern = /ApplicationDetail:\s*\{/g;
  let adMatch;
  while ((adMatch = adStartPattern.exec(content)) !== null) {
    const openBraceIdx = adMatch.index + adMatch[0].length - 1; // index of `{`
    let depth = 1;
    let i = openBraceIdx + 1;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    const closeBraceIdx = i - 1; // index of closing `}`
    const body = content.slice(openBraceIdx, closeBraceIdx + 1);
    let updatedBody = body;
    for (const field of applicationDetailFieldsToAdd) {
      if (!updatedBody.includes(field.name)) {
        updatedBody = updatedBody.replace(
          /(updatedAt\?:\s*string;)/,
          `$1\n${field.line}`
        );
      }
    }
    content =
      content.slice(0, openBraceIdx) + updatedBody + content.slice(closeBraceIdx + 1);
    break; // only patch first occurrence
  }

  fs.writeFileSync(schemaPath, content);
  console.log("✅ Schema patched with FE-required fields!");
}

fetchAndGenerate();
