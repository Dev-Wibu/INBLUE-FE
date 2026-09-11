# Prompt cho AI: xây dựng Unit Test Backend theo chức năng Frontend đang dùng

Bạn là AI đang hỗ trợ viết Unit Test cho backend của dự án INBLUE. Hãy dùng file này như **phạm vi kiểm thử bắt buộc**. Mục tiêu là kiểm thử các nghiệp vụ backend mà frontend hiện tại thật sự gọi và người dùng có thể hoàn thành thành một luồng; không sinh test hàng loạt cho mọi controller, entity, enum hoặc endpoint còn sót trong backend.

## 1. Nguyên tắc bắt buộc

1. Frontend là nguồn sự thật về phạm vi sản phẩm đang dùng. Đọc route, component, hook, service/manager và payload ở frontend để xác nhận một chức năng có thật sự hoạt động.
2. Chỉ đưa một backend feature vào nhóm `ACTIVE` nếu frontend có ít nhất một trong các bằng chứng sau:
   - Có route production dẫn tới màn hình đó và route không phải preview/dev.
   - Có component production gọi API backend khi người dùng thao tác.
   - Có service/manager được import và dùng trong một flow hoàn chỉnh.
3. Không coi việc một endpoint xuất hiện trong OpenAPI, DTO, entity, `api.config`, service cũ hoặc test cũ là bằng chứng chức năng đang được sử dụng.
4. Trước khi viết test, lập bảng kiểm kê `frontend evidence -> backend endpoint -> use case -> role -> test file`.
5. Không sửa production code chỉ để làm test pass. Nếu contract backend không khớp frontend, ghi rõ `CONTRACT GAP` và tạo test phản ánh contract đúng mà frontend đang mong đợi.
6. Không dùng mock để che lỗi tích hợp cốt lõi. Unit test được mock DB/external provider, nhưng phải kiểm tra đầy đủ validation, authorization, mapping, trạng thái và side effect của service/use case.

## 2. Các nhóm chức năng ACTIVE cần ưu tiên

### A. Xác thực và tài khoản

- Đăng nhập tài khoản thường và Google OAuth callback nếu backend phụ trách callback.
- Đăng ký tài khoản, phân quyền USER / MENTOR / STAFF / ADMIN.
- Forgot password, reset password, đổi mật khẩu.
- Lấy/cập nhật profile, settings, subscription/usage.
- Upload CV và cập nhật candidate profile.
- Kiểm tra access control: user chỉ đọc/sửa dữ liệu của mình; staff/admin không bị nhầm quyền.

### B. Candidate: tìm việc, công ty và ứng tuyển

- Tìm kiếm job description, lọc job, xem chi tiết JD.
- Tìm kiếm công ty, xem chi tiết công ty và danh sách vị trí mở.
- Skill tags của JD: đọc, lưu khi tạo/cập nhật JD, tìm kiếm/recommendation nếu backend hỗ trợ.
- Job recommendation và ngưỡng recommendation.
- Ứng tuyển, xem danh sách application của bản thân, xem application detail.
- Không cho ứng tuyển JD không mở, JD không tồn tại, hoặc ứng tuyển trùng nếu nghiệp vụ không cho phép.
- Kiểm tra các trạng thái application được frontend xử lý: pending, completed, failed/soft-failed và các trạng thái tương ứng trong backend.

### C. Entry test và competency

Frontend production có các flow:

- Career preference: đọc preference, kiểm tra tồn tại, tạo/cập nhật, skip.
- Chọn direction/role, level, skill/language; `languagesJson` có thể chứa ngôn ngữ hệ thống đề xuất và ngôn ngữ người dùng tự nhập.
- Start entry test.
- Chạy code cho coding item.
- Submit bài, giữ đúng giới hạn attempt và trạng thái attempt.
- Xem kết quả attempt và competency của user.
- Kiểm tra validation: user không được nộp attempt của user khác; attempt hết hạn/đã submit không được chạy hoặc submit lại.

### D. AI interview đang được dùng

- Lấy config options.
- Generate job requirement từ dữ liệu JD/profile nếu flow frontend gọi.
- Tạo interview session, đọc session/cache, đọc danh sách session của user.
- Bắt đầu interview, submit câu trả lời, lưu và trả kết quả.
- Practice set/quiz liên kết với interview session nếu frontend thực sự gọi endpoint đó.
- Payment/gating chỉ test nếu frontend production thật sự chặn/mở flow bằng payment status.

**Không suy diễn rằng mọi tính năng có chữ AI đều đang active.** Chỉ test endpoint AI có caller production và có đường đi UI hoàn chỉnh.

### E. Mentor interview / mock interview

- Xem danh sách mentor, hồ sơ mentor, availability/schedule.
- Chọn mentor, chọn slot, tạo booking/session, thanh toán nếu flow yêu cầu.
- Join session, cập nhật session status, lấy room/session data.
- Candidate gửi mentor feedback; mentor/staff xem và xử lý feedback/review.
- Gán mentor, chọn mentor, reassign mentor nếu màn hình staff/admin hiện tại gọi các thao tác đó.
- Kiểm tra conflict slot, quyền xem session, trạng thái thanh toán và chuyển trạng thái hợp lệ.

### F. Community, chat và notification

- Posts/feed published, tạo/sửa/xóa/chuyển status theo role.
- Comment, reply, like/unlike, count/check like.
- Chat sessions, messages, contacts, gửi message/AI response nếu màn hình production đang dùng.
- Notifications: list, detail, mark read/check read.

### G. Admin/staff operations đang hiện diện trên dashboard

- Company CRUD và bật/tắt company.
- Job description CRUD, status, deadline, salary/price/currency, skillTags.
- Round của JD: đọc/cập nhật, tạo plan bằng AI chỉ khi endpoint được gọi từ Round Canvas production.
- Application management, application detail, HR score, reviewer assignment, code review evaluation.
- Question bank/category/lesson/major CRUD nếu màn hình admin đang dùng.
- Practice set, quiz set, coding problem, code review problem nếu có màn hình quản trị và API caller tương ứng.
- Entry test admin configuration và level scale.
- Interview template CRUD nếu admin route đang bật.
- Dashboard analytics chỉ test các aggregate query/permission mà dashboard thật sự gọi.
- TopDev import chỉ test search/import/categories nếu admin page production đang bật chức năng đó.

### H. Kiosk / Holobox production

Chỉ test các API được gọi bởi flow kiosk thật: kiosk list/detail, schedule/slot, booking, enter/join, history và competency result nếu backend đang phục vụ route production tương ứng. Phải tách rõ kiosk production với route preview.

## 3. Các chức năng phải loại khỏi scope mặc định

Không tự động viết unit test nghiệp vụ cho các nhóm sau. Chỉ đưa vào scope khi có bằng chứng frontend production mới được xác nhận và người phụ trách yêu cầu rõ:

- `/api/interview-analysis/face-behavior` và toàn bộ nhận diện biểu cảm/khuôn mặt/cảm xúc bằng computer vision. Frontend hiện chỉ có service/config tồn tại, không có caller trong flow interview production.
- Các ý tưởng vision/proctoring chưa tạo thành flow người dùng hoàn chỉnh. `/api/v1/proctoring/track` chỉ được test khi có màn hình production thực sự gửi event và có contract rõ.
- Holobox robot/3D preview, `/holobox/robot-preview`, `/kiosk-preview`, `/dev/playground` và các isolated preview/demo route.
- Landing page copy, mockup, animation, visual-only component không tạo request backend.
- Endpoint legacy, endpoint chỉ xuất hiện trong `api.config`/OpenAPI nhưng không có caller frontend.
- DTO/entity/repository getter/setter không chứa business rule.
- AI feature được quảng bá trên landing page nhưng chưa có route production + API caller hoàn chỉnh.

Nếu backend có code cho một mục loại trừ, ghi vào báo cáo `UNUSED_OR_UNVERIFIED`, không cố tạo test giả để tăng số lượng.

## 4. Chiến lược test và mức độ bao phủ

Không yêu cầu coverage 100%. Không có hệ thống thực tế nào cần test mọi dòng code. Ưu tiên:

- 100% các business rule quan trọng, authorization boundary và state transition.
- Happy path chính của mỗi flow ACTIVE.
- Negative path có rủi ro cao: 400/401/403/404/409/422, dữ liệu thiếu, sai role, resource khác user, duplicate action, stale state, timeout/expired state.
- Boundary values: số tiền bằng 0/âm, deadline quá khứ, score threshold, page size, empty list, string quá dài, array rỗng/trùng.
- Idempotency và transaction/rollback cho create/update/payment/submit/assign.
- Mapping response phải đúng field frontend cần, đặc biệt status, IDs, nested objects, `skillTags`, `languagesJson`, rounds và application details.

Có thể chấp nhận một số lỗi vặt hoặc nhánh hiếm chưa test nếu:

- Không ảnh hưởng authentication, authorization, tiền/thanh toán, dữ liệu cá nhân, application/assessment result.
- Không làm hỏng happy path production.
- Được ghi rõ trong báo cáo coverage gap và tạo issue follow-up.

Không được dùng tỷ lệ coverage cao để che việc bỏ sót các rule quan trọng. Coverage là tín hiệu phụ, không phải mục tiêu duy nhất.

## 5. Quy trình AI phải thực hiện

1. Quét frontend route production và lập danh sách role/flow.
2. Quét service/manager/hook/component để thu thập API caller thực tế.
3. Đối chiếu từng caller với backend controller/service/route.
4. Phân loại mỗi backend feature: `ACTIVE`, `PARTIAL`, `UNUSED_OR_UNVERIFIED`, `LEGACY`.
5. Chỉ sinh test cho `ACTIVE`; với `PARTIAL`, test phần đã có caller và ghi contract gap.
6. Viết test theo thứ tự: auth/permission -> core state transition -> data validation -> side effect/integration boundary -> edge cases.
7. Chạy test; không sửa test để khớp implementation sai nếu frontend contract chứng minh implementation sai.
8. Xuất báo cáo gồm:
   - feature/endpoint đã test;
   - frontend evidence dùng để đưa vào scope;
   - test case pass/fail;
   - feature bị loại và lý do;
   - contract gap;
   - coverage thực tế;
   - lỗi còn chấp nhận được và rủi ro chưa xử lý.

## 6. Format đầu ra mong muốn

Trước khi viết code, trả về bảng scope ngắn:

| Feature | Frontend evidence | Backend endpoint/service | Classification | Tests to write |
|---|---|---|---|---|

Sau đó mới tạo test. Mỗi test phải có tên mô tả hành vi, không đặt tên chung chung như `should work`. Không tạo test cho chức năng chỉ vì thấy class/controller tồn tại.

Khi không chắc một chức năng có dùng thật hay không, đánh dấu `UNVERIFIED` và dừng việc sinh test cho chức năng đó để hỏi người phụ trách hoặc yêu cầu thêm bằng chứng.

