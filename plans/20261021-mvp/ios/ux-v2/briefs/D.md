# Brief D — Chẩn đoán: đăng nhập app iOS Staging ở lại form (luna, chỉ chẩn đoán)

Đọc: `b-common.md` (khoá build, creds, an toàn), `verify.md` mục "Phát hiện".

## Hiện tượng
Build HEAD 114646a (ad-hoc, Staging): iPhone 16 và iPhone SE 3 bấm "Đăng nhập" với tài khoản GV demo → ở lại form, không banner lỗi, không khoá. Bằng chứng ngoài app: cùng tài khoản gọi thẳng `POST /v1/auth/login` bằng curl từ máy Mac → HTTP 200 (token, memberships, active_membership_id) — API và tài khoản đều ổn; lead đã dùng 1 lượt đăng nhập, KHÔNG gọi thêm bằng sai mật khẩu. Lượt audit trước (af8082a) trên iPhone 16 vào được app, trên SE từng báo "lỗi kết nối". Cần biết: lỗi nằm ở app (hồi quy), ở simulator/mạng, hay ở cách Maestro tap.

## Việc (chỉ chẩn đoán; KHÔNG sửa worktree)
Write-set: `ux-v2/diagnosis-login.md`, `/tmp/qlh-d-*`. Có thể sửa MÃ TRONG BẢN SAO `/tmp/qlh-d-src` (thêm log) để chẩn đoán; không commit.
1. Snapshot HEAD vào `/tmp/qlh-d-src`; build ad-hoc (khoá build owner "D"); cài vào iPhone 16.
2. Tay (không Maestro): xcrun simctl launch; tap vào ô SĐT/mật khẩu bằng Maestro `tapOn: point` hoặc `simctl` không đủ ⇒ dùng Maestro nhưng ghi rõ từng bước + ảnh. Đúng 1 lượt đăng nhập thật (đọc creds không in, theo b-common). Đồng thời stream log: `xcrun simctl spawn <UDID> log stream --level debug --predicate 'process == "QuanLyLop"'` ra file; trích dòng lỗi (URLSession, Keychain/SecItem, APIFailure, auth) — bỏ mọi giá trị nhạy cảm.
3. Phân loại: (a) request có tới server không (log có `auth/login`? mã trả về?) (b) lưu token/Keychain lỗi (-34018 ad-hoc?) (c) `prepareStore` lỗi sau khi login ok (SQLite/migration) (d) UI không chuyển màn dù model.screen đổi (e) Maestro tap lệch (nút bị bàn phím che).
4. Nếu (a)–(c): chỉ ra file:dòng nguyên nhân + đề xuất sửa 1–3 dòng (ghi diff đề xuất vào diagnosis, không áp vào worktree). Nếu do snapshot/ký ad-hoc/simulator: nêu cách chạy đúng (lệnh) và xác nhận vào được app chính + 1 ảnh gv-classes.
5. Nếu vào được: tiếp bước 2 của C.md? KHÔNG — dừng, báo lead.

Dọn: nhả khoá, xoá /tmp/qlh-d-*, tắt simulator. Handback ≤150 từ: nguyên nhân (a–e), file:dòng, lệnh/diff đề xuất; chi tiết ở diagnosis-login.md.
