# Handback Ga

- Status: DONE_WITH_CONCERNS · commit `19a9ba8`.
- Attendance regression `testAttendanceDraftTreatsMissingRecordAsUnsavedAndExistingPresentAsUnchanged`: đỏ ở 2 assertion với predicate cũ, xanh sau sửa.
- Full Staging suite trên snapshot nền + thay đổi Ga: 154 passed, 2 skipped, 0 failed. Build snapshot của worktree chung ban đầu dừng ở lỗi biên dịch `GuardianPages.swift` (`appDynamicText`), ngoài write-set Ga.
- Sync: không thêm getter Core; dùng `SyncStatusCenter.rejectedCommandCount` hiện có để chỉ hiện lỗi khi máy chủ từ chối.
- Đã chuyển các form lưu rồi đóng trong Classes sang đóng sau `successHold`; token spacing/font, Dynamic Type và chuỗi gallery dùng token/catalog riêng.
- Chưa chụp ảnh sau; cần chụp khi tích hợp các lane và build worktree chung xanh.
