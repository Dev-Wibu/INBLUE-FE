const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");
let apiBaseUrl = ""; // 1. Xóa URL mặc định để bảo mật, không sợ lộ trong lịch sử Git

// Đọc URL từ file .env nếu file này tồn tại
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^VITE_API_BASE_URL=(.+)$/m);
  if (match && match[1]) {
    // Làm sạch dấu nháy đơn/kép nếu có trong file .env
    apiBaseUrl = match[1].replace(/['"]/g, "").trim();
  }
}

// 2. XỬ LÝ CHO HUSKY: Nếu không có URL API, bỏ qua và KHÔNG báo lỗi
if (!apiBaseUrl) {
  console.log("⚠️  VITE_API_BASE_URL không tồn tại. Bỏ qua bước tạo TS Schema.");
  process.exit(0); // Trả về 0 để Husky hiểu là "Hợp lệ" và cho phép tiếp tục commit
}

const command = `pnpm exec openapi-typescript "${apiBaseUrl}/v3/api-docs" -o ./schema-from-be.d.ts`;
console.log(`🚀 Đang tải schema từ Backend...`); // Ẩn bớt URL cụ thể khi log nếu muốn bảo mật tuyệt đối

try {
  execSync(command, { stdio: "inherit" });
  console.log("✅ Schema generated successfully!");

  // POST-PROCESS: Thêm các field cần thiết mà backend chưa có trong OpenAPI spec
  patchSchema();
} catch (error) {
  // 3. TÙY CHỌN: Nếu Backend sập hoặc mất mạng, bạn có muốn Husky chặn commit không?
  // Nếu KHÔNG muốn chặn (cho commit tiếp): Đổi thành process.exit(0);
  // Nếu MUỐN chặn (bắt buộc tải được mới cho commit): Giữ nguyên process.exit(1);
  console.error("❌ Failed to generate schema:", error.message);
  process.exit(0);
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
    return match.replace(
      /(codingProblemsId\?:\s*number\[\];)/,
      `$1\n${fieldToAdd}`
    );
  });

  fs.writeFileSync(schemaPath, content);
  console.log("✅ Schema patched with FE-required fields!");
}
