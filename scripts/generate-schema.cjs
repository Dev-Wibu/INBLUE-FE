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
} catch (error) {
  // 3. TÙY CHỌN: Nếu Backend sập hoặc mất mạng, bạn có muốn Husky chặn commit không?
  // Nếu KHÔNG muốn chặn (cho commit tiếp): Đổi thành process.exit(0);
  // Nếu MUỐN chặn (bắt buộc tải được mới cho commit): Giữ nguyên process.exit(1);
  console.error("❌ Failed to generate schema:", error.message);
  process.exit(0);
}
