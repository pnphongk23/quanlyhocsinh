# P5 — sửa theo review-sol

Worktree mvp-ios, base 2f2a5cb. Không push. Build/test ở /tmp/qlh-ux3-p5 (Staging, iPhone 16, ad-hoc): **160 tests, 1 skipped, 0 failures**.

## Mục / commit
- [x] V1 bảng điểm: header ngày + thang điểm hai dòng (cột 132, header 84), tên HS nghỉ tối đa 2 dòng, badge "Đã nghỉ" xuống dòng phụ, hàng 60 chung — `d7fec92`. Ảnh: iPhone16/SE3 `gv-diem-dau`, `gv-diem-cuoi`, `gv-diem-cuoi-ngang`. Dữ liệu staging có 2 cột (không có ≥4 cột, không có bài max 1000 ngoài 100): chưa kiểm ≥4 cột.
- [x] V2 PH: xoá classesPath/commentsPath khi selectedChildID đổi — `3d23fab`. Chưa thêm test đơn vị (logic nằm trong @State của View, không có chỗ test không hợp lý). Kiểm trên máy thật cả hai máy: mở phiếu của Bảo Nam (tab Nhận xét) → tab Lớp đổi sang Minh Anh → quay lại Nhận xét thấy danh sách gốc của Minh Anh (`ph-phieu`, `ph-doi-con-nhan-xet`). Cả hai con cùng lớp 6A; ca khác lớp chưa kiểm (không có dữ liệu).
- [x] V3 Tạo lớp chỉ hiện trạng thái lỗi — `6460485`. Ảnh `gv-tao-lop` hai máy: không có "Đã lưu".
- [x] V4 harness settings-teacher dùng isRootTab, flow 09 thêm `assertNotVisible: "Quay lại"` — `fa61c9e`. Case ảnh `class-detail-menu` bỏ (menu hệ thống không mở sẵn được trong harness), ghi chú trong TeacherDemoScreens; menu chụp từ app thật (`after-p3/*gv-menu-lop`). Chưa chạy lại flow Maestro 09 bằng run.sh (chỉ build + unit test).
- [x] Đổi mật khẩu GV push trong stack Cài đặt, tab bar hiện, back hệ thống — `d37782b` (AuthFlowView gộp main/settings/changePassword một nhánh; TeacherRootView theo screen). Ảnh `gv-doi-mat-khau` hai máy.
- [x] MonthlyReport lỗi → TeacherErrorBanner — `1dc9bfb`. Không tái hiện được lỗi trên máy: không có ảnh trạng thái lỗi.
- [x] T1 padding token (GuardianScroll, AuthSettingsView, Tạo lớp; thêm TeacherMetrics.sectionGap) — `3d23fab`, `6460485`, `d37782b`.
- [x] T2 hàng tab chi tiết lớp cuộn ngang, nhãn không cắt, cuộn theo tab chọn — `6460485`. SE3 `gv-lop-chi-tiet`, `gv-diem-dau`: đủ 5 nhãn, "Bài kiểm tra" nguyên vẹn.

## Ảnh (app thật) — shots/after-p5/
- iPhone 16 + SE 3, GV: lop (SE), lop-chi-tiet, bai-kiem-tra, diem-dau/cuoi/cuoi-ngang, bao-cao-dau/cuoi, doi-mat-khau, tao-lop.
- iPhone 16 + SE 3, PH: lop, nhan-xet, cai-dat, diem, bao-cao, phieu, doi-mat-khau, chon-con, doi-con-lop, doi-con-nhan-xet.
- Chưa chụp: iPhone16 `gv-lop` (thành công nhưng Maestro assert lỗi, ảnh không lưu; có ở after-p3), menu "…" lớp/buổi sau thay đổi (không đổi mã, dùng after-p3), bàn phím ở form mật khẩu, ảnh PH báo cáo có dữ liệu (staging chưa phát hành), Báo cáo GV trạng thái lỗi.
- Đăng nhập: SE lần đầu tap `login.submit` theo id không kích hoạt do bàn phím che; sau đó swipe xuống đóng bàn phím + tap theo toạ độ thì vào được ở cả hai vai. Tổng ≤2 submit/máy/vai.
