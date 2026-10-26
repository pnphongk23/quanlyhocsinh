# P3 — phụ huynh + quét giáo viên

## Tiến độ
- [x] Phụ huynh: TabView hệ thống 3 tab (Lớp, Nhận xét, Cài đặt), mỗi tab một NavigationStack; chi tiết (phiếu, điểm, báo cáo) là màn con push, title inline; chọn con ở toolbar (sheet cũ); Cài đặt root tab (isRootTab); Đổi mật khẩu push (isPushed) có back hệ thống. Không thêm chuỗi mới.
- [x] Giáo viên: menu "…" lớp và buổi học → Menu hệ thống (bỏ TeacherOptionsMenu/TeacherMenuItem tự dựng); Tạo lớp: safeAreaInset + ẩn tab bar.
- [x] Test: 160 tests, 1 skipped, 0 failures (/tmp/qlh-ux3-p3, Staging, iPhone 16, ad-hoc).
- [x] Commit (không push): 9db003e phụ huynh, 57624f9 giáo viên.
- [x] Ảnh app thật `shots/after-p3/`: iPhone 16 — PH: lop, chon-con, diem, bao-cao, nhan-xet, phieu, cai-dat, doi-mat-khau (không submit); GV: gv-lop, gv-lich, gv-lop-chi-tiet, gv-menu-lop, gv-menu-buoi, gv-tao-lop. SE 3 — chỉ GV (lop, lich, lop-chi-tiet, menu-lop, tao-lop).
- [ ] CHƯA CÓ: ảnh SE 3 phía phụ huynh. Đăng nhập Maestro trên SE lỗi nhập mật khẩu (1 lần submit sai báo 'không đúng'), dừng để tránh khoá tài khoản (≤2 submit).

## Ghi chú
- Ảnh PH cài đặt có SĐT demo (900 000 002) hiện trên màn.
- Tạo lớp vẫn hiện 'Đã lưu trên máy' (saveStatus có sẵn, spec nói chỉ hiện khi lỗi) — ngoài phạm vi P3.
- teacherConfirmDialog (hộp xác nhận hủy buổi) vẫn overlay tự dựng; Đổi mật khẩu phía giáo viên vẫn là màn riêng có back tự dựng.
- Tab PH dùng nhãn tiêu đề cũ ('Lớp học của con', 'Nhận xét của cô'), chuỗi sẵn có, không thêm chuỗi.
- Chưa rà từng ảnh GV Students/Sessions trong P3 (P1 đã chụp).
