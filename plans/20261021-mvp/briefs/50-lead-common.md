# Brief chung cho Domain Lead (MVP quản lý lớp tiếng Anh)

Người giao: General Lead `abdfe90c` (workspace `wks_5d1bc443eaa9f683`, thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh`). Người dùng yêu cầu: dựng thêm người cho nhanh, thay worker pi (quá chậm), tạo domain lead quản lý từng mảng. Bạn là Domain Lead của MỘT mảng (xem brief riêng). Tuân thủ skill `paseo-team`: bạn sở hữu kết quả của mảng, chia việc cho worker, hội tụ kết quả, KHÔNG tự viết phần lớn mã (việc nặng giao worker), không tạo Lead khác.

## Đọc trước

`AGENTS.md`, `docs/spec.md` (nguồn chuẩn; spec thắng), `docs/architecture.md`, `plans/20261021-mvp/lead-brief.md` mục 0, 1 (quyết định đã chốt), `plans/20261021-mvp/status.md` (trạng thái hiện hành, câu hỏi mở, quy tắc phạm vi), brief riêng của mảng bạn trong `plans/20261021-mvp/briefs/`. Dùng `srcwalk` thay `rg/grep/cat`.

## Phạm vi MVP đã được người dùng xác nhận

Lớp, học sinh (kèm SĐT phụ huynh), buổi học (lịch lặp, hủy, buổi lẻ, tab Lịch theo ngày/tháng), điểm danh 4 trạng thái, bài kiểm tra + điểm (điểm tối đa theo bài, mặc định 15, KHÔNG điểm trung bình, KHÔNG "Vắng thi"), nhận xét/phiếu buổi học (3 mức sao, câu mẫu cố định), BTVN theo phần (3 mức), báo cáo theo tháng (xem trước, phát hành, PDF), phụ huynh xem + chuyển giữa các con, đăng nhập SĐT + mật khẩu (giáo viên tự đăng ký workspace; phụ huynh tự liên kết theo SĐT; Cấp mật khẩu tạm là ĐỀ XUẤT chờ xác nhận, dùng mặc định tạm của `backend/api-spec.md` mục 10), phân quyền, push FCM, offline cho điểm danh/nhập điểm/tạo bài kiểm tra/soạn nhận xét/giao-chấm BTVN, iOS SwiftUI + web/PWA (desktop cho giáo viên: Chi tiết lớp). NGOÀI MVP (không làm, không hiện): nhân sự, phân công, lịch dạy, học phí, lương, bài giảng, vai trò, báo cáo điểm tổng hợp, mọi luồng mời/OTP, báo cáo 3 tháng, tiếng Anh, passkey, Zalo/SMS. Số buổi: buổi hủy không có số, các buổi còn lại đánh số liên tục theo `sessionNumber` của prototype (tạm, câu hỏi mở Q16).

## Cách làm việc

- **Worker (người mới):** KHÔNG dùng provider `pi` (người dùng thấy quá chậm). Tạo worker bằng `create_agent` với `provider: "codex/gpt-6-luna"`, `settings.thinkingOptionId: "high"`, `settings.modeId: "full-access"` cho việc thường; `codex/gpt-6.1-sol` (thinking `medium`) cho mô-đun khó (đồng bộ, phân quyền, luồng lõi). Đây là `profile-deviation` đã được người dùng yêu cầu (ghi vào sổ ở status/handback). Đặt `workspaceId` đúng workspace/worktree của mảng bạn, `labels` gồm `role: worker`, `stream`, `mission: mvp-20261021`, `notifyOnFinish: true`.
- **Song song:** tối đa 4 worker đồng thời mỗi lead; chia việc theo quyền sở hữu file KHÔNG chồng nhau (mỗi worker có danh sách file được sửa). Chỉ chia song song khi ranh giới rõ. Mỗi prompt worker truyền bằng FILE brief (`plans/20261021-mvp/briefs/<mảng>-NN-<slug>.md`: việc, file đọc, file được sửa, tiêu chí xong, ràng buộc, lệnh kiểm), không đoạn chat dài. Worker kết thúc bằng `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
- **Review:** người dùng muốn tiết kiệm: KHÔNG mở vòng review cho từng gói nhỏ. Chỉ MỘT review tổng thể cho cả mảng khi gần xong (reviewer `codex/gpt-6-luna` high, tối đa 2 vòng), tập trung phân quyền/rò dữ liệu/đúng spec. Tự kiểm bằng lệnh (test, build, ảnh chụp) là chính; không tin báo cáo worker khi chưa chạy lại lệnh quan trọng.
- **Chờ việc:** KHÔNG polling, không sleep. Dùng `notifyOnFinish`; nếu cần dự phòng dùng `create_heartbeat` thưa (≥ 30 phút).
- **Git:** làm trong worktree/thư mục được giao; commit trên nhánh của mảng (tiếng Anh, conventional, không nhắc AI). KHÔNG push, KHÔNG merge vào `main`, không `git checkout/reset/stash` ở thư mục chính (có thay đổi chưa commit của người dùng).
- **An toàn:** không in/ghi secret, token, service account, SĐT/mật khẩu thật, nội dung nhận xét thật vào log, fixture, báo cáo hay chat. Không đụng production. Deploy chỉ staging Cloudflare (đã có `wrangler login` với quyền d1/pages; không tự đăng nhập lại).
- **Quyết định:** việc spec không trả lời → ghi "Câu hỏi" ở handback, KHÔNG tự đoán; quyết định đã chốt không đảo.
- **Tiết kiệm token Claude:** bạn chỉ điều phối; đọc ít, giao việc bằng file, không dán lại tài liệu dài vào chat.

## Handback cho General Lead

Báo ngắn (≤ 12 dòng) ở các mốc: mỗi gói lớn xong (kèm bằng chứng lệnh), BLOCKED, câu hỏi cần người dùng. Cuối mảng ghi `plans/20261021-mvp/<mảng>/handback.md` (đã làm, bằng chứng, nhánh/commit, việc còn lại, rủi ro, sổ worker: id, vai, model, việc) và kết thúc bằng:

Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: hai câu.

## Quy tắc UI (bắt buộc, người dùng yêu cầu 2026-10-21)

Mọi phần giao diện phải THỰC HIỆN ĐÚNG NHƯ PROTOTYPE đã được người dùng duyệt (`design/prototype`, bản chạy được bằng `npm run dev` trong `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype`; mã nguồn ở `design/prototype/src`). Prototype là NGUỒN CHUẨN cho UI: bố cục, thứ tự thành phần, khoảng cách, màu (`#2F5BEA` và token trong `shared/styles/tokens.css`), kiểu chữ, nội dung chữ tiếng Việt từng ký tự, nhãn, trạng thái (rỗng, lỗi, tải, khoá, nháp/đã gửi), thứ tự tab, hành vi tương tác và luồng điều hướng. Ảnh Claude Design (`design/round-4/`, `design/auth-r4/`) chỉ là tham chiếu phụ khi prototype chưa có phần đó; lệch giữa ảnh và prototype thì theo prototype (và báo General Lead). Không tự sáng tạo, thêm, bớt hay "cải tiến" UI. Điều duy nhất được khác: hành vi hệ thống bản địa (cuộn, bàn phím, chọn ngày/giờ, cử chỉ quay lại của iOS) khi không đổi hình thức nhìn thấy; mọi khác biệt khác phải được General Lead duyệt trước.

Kiểm đối chiếu BẮT BUỘC trước khi báo xong từng gói UI: chạy prototype, chụp từng màn của gói ở cùng kích thước (mobile 390×844; desktop 1360×934; iOS dùng simulator iPhone cỡ gần nhất), đặt cạnh ảnh của bản triển khai, lập bảng khác biệt (màn, khác gì, đã sửa/chưa, lý do) trong báo cáo của worker; chỉ báo DONE khi không còn khác biệt nhìn thấy ngoài danh sách đã được duyệt. Phần prototype chưa hoàn tất (màn Tài khoản đang được hoàn thiện ở giai đoạn 0 của mảng Web) thì chờ bản cuối của prototype rồi mới làm/đối chiếu; trong lúc chờ có thể làm phần không phụ thuộc.
