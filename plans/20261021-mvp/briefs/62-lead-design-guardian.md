# Domain Lead · Design (màn phụ huynh + đăng ký phụ huynh) → prototype

Người giao: GL `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`. Đọc `briefs/72-new-domain-lead.md`, `briefs/71-decisions-20261022.md`, `briefs/74-decisions-20261022-b.md`, `docs/spec.md` mục 5.2 (phụ huynh) và 4 (Tài khoản; lưu ý 71/74 thắng spec cũ: không Cấp mật khẩu, phụ huynh tự đăng ký). Workspace thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (`wks_5d1bc443eaa9f683`). Dùng skill `claude-design-to-prototype` (đọc đầy đủ) cho chu trình.

## Mục tiêu
Màn PHỤ HUYNH (mobile) đủ phạm vi MVP và luồng PHỤ HUYNH TỰ ĐĂNG KÝ có thiết kế đã duyệt ở Claude Design, rồi prototype `design/prototype` cập nhật đúng thiết kế. Phạm vi phụ huynh MVP: đăng nhập, tự đăng ký (SĐT + mật khẩu tự đặt), chuyển giữa các con, tổng quan, điểm danh theo tháng, điểm từng bài (không trung bình), phiếu buổi học (sao + câu mẫu + ghi chú + kết quả BTVN), BTVN (đề + kết quả đã gửi), báo cáo tháng (xem trong app), cài đặt (đổi mật khẩu, đăng xuất), trạng thái rỗng/lỗi/mất mạng, màn "chưa có con nào được liên kết". Ngoài MVP không thiết kế.

## Việc
1. Kiểm Claude Design trong Chrome đã đăng nhập claude.ai (có extension Claude; người dùng cho phép). Artifact thiết kế: xem `docs/spec.md` mục 1 và `plans/20261021-mvp/design/decisions.md`. Liệt kê màn phụ huynh đã có/thiếu/lệch MVP vào `design/guardian/inventory.md`.
2. Thiếu hoặc lệch: viết brief vào `design/outbox/NN-<slug>.md` (theo mẫu outbox cũ), gửi Claude Design, chờ xong (heartbeat thưa, không polling), chụp màn (`~/.claude/skills/claude-design-to-prototype/scripts/{list_screens,shoot_screens}.py`), giao reviewer `codex/gpt-6-luna` high đối chiếu spec + 71/74, tối đa 2 vòng sửa. Ghi `design/decisions.md`.
3. Thiết kế DONE: giao worker cập nhật `design/prototype` (màn phụ huynh + đăng ký phụ huynh; bỏ dấu vết mật khẩu tạm còn lại), `npm test` + `npm run build` xanh, ảnh `design/prototype-shots/p4/`, danh sách chuỗi chữ mới `design/guardian/strings.md` cho iOS/web. Không commit, chưa deploy (GL báo).
4. Không sửa app iOS, `mvp-web`, backend, `docs/`. Lead Mascot có thể đưa mascot vào prototype sau: giữ ranh giới file, báo GL nếu đụng nhau.

## Ràng buộc
Worker chỉ `codex/gpt-6-luna` hoặc `pi/opencode-go/deepseek-v4.1-flash`, tối đa 4. Không in dữ liệu nhạy cảm. Nếu Chrome/Claude Design không truy cập được: BLOCKED, báo GL kèm lỗi, không tự đăng nhập. Khi worker xong thì đi tiếp ngay trong cùng lượt. Báo GL ở mỗi mốc ≤ 12 dòng. Status + 2 câu.
