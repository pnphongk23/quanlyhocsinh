# Brief C — Mốc 3: kiểm HEAD, chụp after, chạy flow thật (luna, 1 worker)

Đọc trước: `b-common.md` (build/khoá/creds/an toàn), `plan.md`, `audit.md`, `handback-B2.md`, `handback-B3.md`, `screen-codes.md`, `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/briefs/81-lead-ios-ux-v2.md` mục 5 (tiêu chí đạt). Không sửa mã/docs ngoài write-set.

Write-set: `ux-v2/shots/after/**`, `ux-v2/verify.md`, `/tmp/qlh-c-*`. KHÔNG sửa Swift. Lỗi tìm thấy chỉ ghi verify.md (mức + file:dòng + ảnh) để lead giao sửa.

## Lần chạy lại (lượt 2) — đã biết
- Lượt 1: Staging build/test xanh trên HEAD 114646a (151 test, 2 skip, 0 lỗi) ⇒ BỎ qua Bước 1; chỉ chạy lại test nếu bạn phải sửa gì (bạn không được sửa Swift).
- Lượt 1 kẹt đăng nhập: chẩn đoán ở `diagnosis-login.md` ⇒ nhiều khả năng Maestro tap nút Đăng nhập khi bàn phím che. API và tài khoản đã kiểm: curl login = 200. DÙNG flow có sẵn đã chạy tốt ở lượt audit đầu: `ios/maestro/staging/01-login.yaml` (appId com.study.teacherthu; nhập SĐT, mật khẩu, scrollUntilVisible `login.submit`, swipe, tap, chờ "Lớp của tôi"; tham số `-e STAGING_PHONE` và `-e STAGING_PASSWORD`, SĐT 9 số nội địa). Sao chép vào /tmp, thêm bước chụp ảnh. Đúng 1 lượt đăng nhập mỗi tài khoản/máy; nếu vẫn kẹt: dừng, ghi ảnh + log, báo — không thử lặp.
- Ghi phát hiện UX mới vào verify.md: bàn phím che nút "Đăng nhập" (phím Enter có gửi form không?) — kiểm ô mật khẩu có `submitLabel`/`onSubmit` không (đọc AuthScreens.swift, AuthComponents.swift), mức Vừa.

## Bước 1 — test (1 lần)
Snapshot HEAD (nhánh mvp-ios, có commit 114646a trở đi) vào `/tmp/qlh-c-src` theo b-common; giữ khoá `/tmp/qlh-build.lock` (owner "C"); `xcodegen generate`; `xcodebuild ... Staging ... build test` (CODE_SIGNING_ALLOWED=NO). Ghi số test/skip/lỗi + từng test đỏ vào verify.md. Nếu có test đỏ hoặc build đỏ: dừng bước 2–3, báo ngay với tên test + thông báo lỗi (không sửa), nhả khoá.

## Bước 2 — chạy app thật (ký ad-hoc, iPhone 16 rồi SE 3)
Build ad-hoc (CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual), chụp `shots/after/p16-<mã>.png` cho MỌI mã trong screen-codes.md vào được (GV + PH, đủ mục audit Cao/Vừa) và `se-<mã>.png` cho: gv-classes, gv-session-attendance, gv-scores, ph-class, ph-comments. SE đăng nhập từng lỗi kết nối ở lượt A2: nếu lặp lại, ghi nguyên nhân (mạng/staging/khoá). Chụp bù theo audit: gv-state-error.

## Bước 3 — flow thật (Staging demo, hoàn tác sau)
Ghi kết quả đạt/chưa + ảnh vào verify.md, mỗi dòng 1 flow:
1. GV: chi tiết buổi có dòng ngày dạy "Thứ …, dd/MM · hh:mm–hh:mm" mọi buổi (kể cả buổi huỷ có thẻ + "đã huỷ").
2. GV: lưu điểm danh → thấy loading (≥400 ms: quay video `simctl io recordVideo` rồi trích khung, hoặc đo log thời gian) → "Đã lưu" (≈1,6 s) → về nút thường. Hoàn tác điểm danh về như cũ.
3. GV: lưu lỗi (build `API_BASE_URL='http:/$()/127.0.0.1:9/v1'`, cài đè cùng bundle KHÔNG uninstall): lưu điểm danh/điểm → lỗi, editor còn mở, dữ liệu còn; pill "Chờ đồng bộ"; ngoại tuyến "Đã lưu trên máy · sẽ đồng bộ khi có mạng". Sau đó cài lại build thường, xác nhận đẩy lên rồi hoàn tác.
4. GV: bảng điểm có dữ liệu (lớp 6A) đọc được ở 375/390 pt; điểm "82"/"7,5" (không ".0", không "/100").
5. PH: 2 tab, chip chọn con (tài khoản 2 con), avatar → Cài đặt → đổi mật khẩu (KHÔNG đổi thật: mở màn + kiểm lỗi mật khẩu cũ sai 1 lần), đăng xuất; màn "chưa có con" (nếu không có tài khoản không con: ghi "không kiểm được", không tạo tài khoản thật).
6. Empty có Mít: tìm ≥3 chỗ (lớp 0 học sinh "Smoke"/"ZZ-…", không có buổi hôm nay, lọc rỗng) — ảnh.
7. Selected = fill: tab bar, segmented, chip — ảnh cận.
8. Dynamic Type extra-extra-large: gv-classes + ph-class không cắt chữ (xong trả về cỡ mặc định).
9. Ô email KHÔNG hiện ở Cài đặt GV/PH.

## Dọn
Nhả khoá, xoá `/tmp/qlh-c-*`, xoá máy SE tạo thêm, trả dữ liệu demo về như cũ.

## Handback ≤200 từ
Số test/skip/lỗi; số ảnh; flow đạt/chưa (1 dòng/flow); danh sách lỗi theo mức; chi tiết ở `verify.md`.
