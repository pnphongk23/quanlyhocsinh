# iOS-28 · Smoke UI phụ huynh trên staging (chỉ đọc) sau sửa số buổi + has_pdf

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (HEAD `f2041a3`, cây sạch: kiểm đầu tiên). Dùng `srcwalk`. Một build/một simulator iPhone 16 một lúc. KHÔNG sửa mã app, KHÔNG ghi/đổi dữ liệu staging. Chỉ commit `ios/docs/report-i28.md` và ảnh sạch trong `ios/docs/screens/i28/`.

## Quy tắc đăng nhập (LƯỢT MỚI)
Tài khoản phụ huynh HAI CON (mục "Phụ huynh (2 con…)" trong `~/.config/qlh/staging-demo.txt`; KHÔNG dùng mục giáo viên hay đa vai trò). Tối đa **2 lần đăng nhập thành công** (1 API lấy token đối chiếu + 1 UI); không lặp khi lỗi. Cách đọc creds ĐÃ CHẠY ĐƯỢC (lead dùng, trả 200): `B=$(sed -n '/Phụ huynh/,/Multi-role/p' FILE | sed '$d'); P=$(echo "$B" | awk '/phone/{print $NF; exit}'); W=$(echo "$B" | awk '/password/{print $NF; exit}')` rồi curl/Maestro trong CÙNG lệnh (không in, `unset` sau). Số nội địa 9 chữ số (bỏ tiền tố 84) khi nhập UI (ô SĐT cắt đầu vào), bàn phím che nút "Đăng nhập" ⇒ cuộn/vuốt lên; Maestro `--no-reinstall-driver`. Nếu API trả khác 200 ⇒ DỪNG, báo mã HTTP + `error.code`, không thử lại. Không in SĐT/mật khẩu/token/tên/nội dung nhận xét; ảnh lưu CHỈ nếu không có SĐT.

Đọc `ios/docs/report-i18.md` (build ký ad-hoc, Maestro), `report-i24.md`, `report-i26.md`.

## Việc
1. Build Staging ký ad-hoc (`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`, `-derivedDataPath /tmp/qlh-dd-i28`), erase simulator iPhone 16, cài, mở.
2. Token API (1 lần, dùng lại) để đối chiếu GET: số buổi (class_session không hủy của lớp 6A, theo (date,start_time) ⇒ số buổi kỳ vọng: 14/10 = Buổi 1, 16/10 = Buổi 2…), điểm danh từng con (2 dòng/con: 14/10 và 16/10), slip (nhận xét) mỗi con, publication tháng 10 (con có `publication_count` ≥ 4: bản mới nhất #4).
3. Đăng nhập UI phụ huynh (1 lần). Với MỖI con (đổi bằng chip): chụp **Tổng quan**, **Điểm danh** (tháng 10), **Báo cáo** (tháng 10). Xác nhận bằng ảnh + đối chiếu số liệu GET: (a) Tổng quan KHÔNG còn "Đi học 0/0" (đúng số buổi đã diễn ra có điểm danh), nhận xét mới nhất ghi "Buổi N" ĐÚNG N (không "Buổi 0"); (b) Điểm danh liệt kê đúng 14/10 và 16/10 với trạng thái khớp GET; (c) Báo cáo: con CÓ publication hiện nội dung báo cáo tháng 10 (không còn "Cô chưa phát hành báo cáo tháng này"), số liệu chuyên cần/điểm/BTVN (excellent/done/not_done) khớp bản #4; con KHÔNG có publication thì "Cô chưa phát hành…" là đúng.
4. Ghi lại mọi sai lệch còn lại (số liệu, "Buổi N" sai, định dạng điểm dấu chấm, tab, v.v.) — chỉ GHI, không sửa.
5. Dọn: xoá ảnh/artifact chứa SĐT, erase + shutdown simulator, xoá `/tmp/qlh-dd-i28`.
6. `ios/docs/report-i28.md`: từng bước → kết quả (bảng: màn, con, kỳ vọng từ GET, hiển thị thực, khớp/lệch), số lần đăng nhập, ảnh sạch trong `ios/docs/screens/i28/` (chỉ file không lộ SĐT). Commit `docs(ios): guardian staging UI smoke after session number and publication fixes` (conventional, tiếng Anh, không nhắc AI); chỉ add file report + ảnh. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
