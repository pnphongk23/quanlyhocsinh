# Việc B1: viết spec backend MVP (không viết code)

Người giao: General Lead. Bạn là lead viết spec. Thư mục làm việc: `/Users/phamnhuphong/Git/quanlyhocsinh` (thư mục chính, có thay đổi chưa commit của người dùng).

## Đọc trước

1. `AGENTS.md`, `docs/spec.md`, `docs/architecture.md`
2. `plans/20261021-mvp/lead-brief.md` mục 0, 1, 2.B (quyết định đã chốt; mục 1 thắng spec/architecture nếu còn lệch)
3. `plans/20261021-mvp/briefs/00-sync-docs.md`: một worker đang đồng bộ spec/architecture theo mục 1 song song với bạn. Khi bạn bắt đầu viết phần xác thực, đọc lại hai file docs để lấy bản mới; nếu chưa đồng bộ xong, theo `lead-brief.md` mục 1.
4. Mã mẫu giao diện/hành vi: `design/prototype/src` (chỉ tham chiếu hình dạng dữ liệu, spec thắng).

## Được ghi

Chỉ `plans/20261021-mvp/backend/`. KHÔNG sửa `docs/`, KHÔNG sửa mã, KHÔNG git checkout/reset/stash/commit/push. Dùng `srcwalk` thay `rg/grep/cat`. Việc đồng bộ vào `docs/architecture.md` làm sau khi spec qua review, bởi người khác.

## Cần ra

- `plans/20261021-mvp/backend/data-model.md`: mô hình dữ liệu D1: bảng, cột, khóa, chỉ mục, trigger lịch sử, ràng buộc workspace; lớp, học sinh (SĐT phụ huynh), buổi học (tự sinh theo lịch lặp, hủy, buổi lẻ), điểm danh 4 trạng thái, BTVN theo phần và chấm 3 mức, bài kiểm tra (`max` mỗi bài, mặc định 15, `archived`) và điểm, phiếu buổi học (sao 1..3, ghi chú, gửi), báo cáo tháng (nháp, phát hành, bản chụp), người dùng/mật khẩu/phiên, workspace/role/ma trận quyền/gán lớp (role mặc định cài sẵn), bảng lệnh đã áp dụng cho đồng bộ idempotent, `version` mỗi bản ghi. Chọn ORM nhẹ (đề xuất Drizzle cho schema và migration, truy vấn gần SQL thuần) và nêu lý do; kèm ước lượng kích thước bundle nếu đo được.
- `plans/20261021-mvp/backend/api-spec.md`: API chung cho iOS và web. Dạng markdown có ví dụ request/response (hoặc OpenAPI nếu gọn hơn). Gồm: đăng ký workspace, đăng nhập, đổi mật khẩu, cấp mật khẩu cho phụ huynh, quên mật khẩu (giáo viên cấp lại), phiên và đổi vai trò, các tài nguyên MVP, điểm vào đồng bộ (lệnh có UUID, `base_version`, xung đột giữ hai giá trị, cách kéo thay đổi), phân quyền theo vai trò và phạm vi, định dạng lỗi, phân trang, giới hạn tốc độ thử đăng nhập. Mỗi endpoint ghi rõ ai gọi được.
- `plans/20261021-mvp/backend/authz-matrix.md`: ma trận quyền theo từng vai trò (Admin, Giáo viên, Trợ giảng, Phụ huynh) × tài nguyên × hành động, để worker viết test.
- `plans/20261021-mvp/backend/stack-and-cpu.md`: stack (mặc định Hono + D1), khung đo CPU, và **kế hoạch đo băm mật khẩu**: PBKDF2 WebCrypto với số vòng lặp đề xuất, cách đo trên Worker staging (số liệu thật, không ước đoán), phương án dự phòng (chỉ băm khi đăng nhập, phiên dài bằng token ký HMAC, giảm số lần băm), và điều kiện nâng gói 5 USD/tháng. Nếu `wrangler whoami` cho thấy đã đăng nhập thì bạn có thể chạy đo trên một Worker staging tạm (tên có tiền tố `qlh-staging-`) rồi xóa; chưa đăng nhập thì ghi "chưa đo được vì chưa đăng nhập wrangler", KHÔNG tự đăng nhập, KHÔNG đụng production.
- Phần đề xuất về chạy offline cho từng client (thứ tự triển khai) ở `plans/20261021-mvp/backend/offline-plan.md`: ngắn, 1 trang: web (Dexie) và iOS (SwiftData hay SQLite) dùng chung hợp đồng đồng bộ thế nào, làm gì trước.

## Ràng buộc

- Cloudflare Worker gói free: 10 ms CPU mỗi request, 128 MB RAM; D1 là SQLite. Truy vấn phải có chỉ mục, tránh quét bảng, gom thay đổi vào `batch`.
- Phân quyền kiểm ở máy chủ, một tầng truy cập D1 duy nhất (`worker/src/db`).
- Phạm vi chỉ gồm "Bản đầu" ở spec mục 8 sau đồng bộ. Không thiết kế bài giảng, học phí, lương, mời, OTP.
- Spec mâu thuẫn hoặc chưa rõ: KHÔNG tự đoán. Ghi vào mục "Câu hỏi mở" ở cuối `api-spec.md` và nêu trong báo cáo.
- Không SĐT thật, mật khẩu thật, nội dung nhận xét thật trong ví dụ. Dùng giá trị giả rõ ràng (ví dụ `+84900000001`).

## Xong khi

Các file trên đầy đủ, nhất quán với nhau và với spec; mỗi endpoint có ví dụ và phân quyền; mỗi bảng có chỉ mục cho các truy vấn chính; có kế hoạch đo băm mật khẩu. Báo cáo ngắn (tóm tắt quyết định, câu hỏi mở, kết quả đo nếu có) ở `plans/20261021-mvp/backend/report-b1.md`. Kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.
