# Quy tắc chung cho worker UI Web (W-2, W-3, W-4)

Worktree DUY NHẤT: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` (nhánh `mvp-web`). Thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` CHỈ ĐỌC (ngoại lệ: file báo cáo của bạn trong `plans/20261021-mvp/web/`). Không push/merge/checkout/reset/stash ở thư mục chính. Dùng `srcwalk`. Không tạo agent. Commit trên `mvp-web` (tiếng Anh, conventional, không nhắc AI) khi xanh; chỉ `git add` file của bạn.

## Quy tắc UI (bắt buộc, người dùng yêu cầu)

Giao diện phải ĐÚNG NHƯ PROTOTYPE đã duyệt (`/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype`, chạy bằng `npm run dev` trong thư mục đó; mã ở `design/prototype/src`). Prototype là nguồn chuẩn: bố cục, thứ tự, khoảng cách, màu/token, kiểu chữ, chữ tiếng Việt từng ký tự, nhãn, trạng thái (rỗng, lỗi, tải, khoá, nháp/đã gửi), thứ tự tab, tương tác, luồng điều hướng. Ảnh `design/round-4/`, `design/auth-r4/` chỉ phụ; lệch thì theo prototype và báo Lead. KHÔNG sáng tạo, thêm, bớt, "cải tiến" UI. SAO CHÉP file `.tsx` và `.module.css` từ prototype (giữ cấu trúc component, tên class), chỉ sửa: đường dẫn import, nối dữ liệu qua `src/data` (repositories của W-1), bỏ phần ngoài MVP (lương, học phí, nhân sự, phân công, bài giảng, mời/OTP, điểm trung bình, "Vắng thi"), cờ trong `shared/features.ts` nếu cần. Mọi khác biệt hình thức khác phải được Lead/General Lead duyệt.

## Nền có sẵn (W-1 đợt A, commit d439eb3)

Đọc `src/README.md`. Điểm ghép: thay `lazy: placeholderRoute("...")` trong `src/roles/{staff,guardian,account}/routes.ts` bằng `lazy: () => import("../../features/...")` (mỗi trang tải lười). Repositories/`useStore` hiện là stub đọc rỗng; ghi chưa cài (ném `FoundationUnavailableError`). W-1 đợt B sẽ nối API/Dexie/outbox mà KHÔNG đổi chữ ký repository; đừng sửa `src/data`, `src/shared`, `src/app`. Cần thêm gì ở file của W-1: ghi vào báo cáo mục "Cần W-1", đừng tự sửa. Với test, dùng dữ liệu dựng cục bộ trong test của bạn (không PII thật), không sửa seed chung.

## Kiểm đối chiếu bắt buộc trước DONE

Chạy prototype (cổng khác 5173 nếu bận) và bản web thật, chụp từng màn của gói ở 390×844 (mobile) và/hoặc 1360×934 (desktop) (Chrome DevTools MCP hoặc playwright/ chrome headless), lưu vào `plans/20261021-mvp/web/shots/<gói>/` (`proto-*.png`, `real-*.png`), lập bảng khác biệt (màn, khác gì, đã sửa/chưa, lý do) trong báo cáo. Vì repositories còn stub, màn có thể hiển thị rỗng: ghi rõ; nếu cần, dựng dữ liệu mẫu qua máy chủ giả/harness trong `src/test` hoặc `?`-fixture của bạn CHỈ trong test/dev (không vào bundle prod). Chỉ báo DONE khi `npm run typecheck`, `npm test`, `npm run build` xanh (dán kết quả) và không còn khác biệt nhìn thấy ngoài danh sách đề xuất để duyệt.

Kết thúc bằng: Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT + 2 câu.
