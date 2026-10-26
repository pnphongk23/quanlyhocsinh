# I-8A · Đối chiếu: Tài khoản + Phụ huynh
Đọc `briefs/ios-08-cmp-common.md` trước. Nhóm: `Features/Auth/**`, `Features/Guardian/**`; cũng được sửa `App/**` cho phần khung/điều hướng/Cài đặt. Báo cáo `ios/docs/report-i8a.md`, ảnh `ios/docs/screens/{auth,guardian}/`. Cổng prototype 5181.
Việc thêm: Cài đặt tài khoản — đăng xuất bị CHẶN khi còn lệnh chờ (`pendingCommandCount` > 0, hiện thông báo đúng chữ prototype), có test. Nút "Tải PDF về máy" của phụ huynh: nếu prototype có thì làm (tải qua endpoint PDF của api-spec, binary GET), nếu không thì giữ như prototype.
