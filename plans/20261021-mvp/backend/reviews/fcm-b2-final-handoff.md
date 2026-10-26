# FCM B2 — handoff sau3vòng review

Trạng thái: CHANGES_REQUIRED — DỪNG theo lead-brief.md giới hạn3vòng, không implement/deploy.
Candidate cuối bất biến: backend/candidates/fcm-b2-r3, SHA256(manifest)=9621026a28fdc9a545222f11bd255fbdcdd34df8482636996823920365e2eaa7. Parent và hai reviewer đã kiểm hash/9file.

## Kết quả độc lập

- Correctness4ac36528: CHANGES_REQUIRED, C3-01 REQUIRED. Contract API yêu cầu fanout eligibility có quyền nhóm và liên kết con; SQL FANOUT_PAGE_SQL chỉ kiểm binding/session/user/membership, SENDER_OK_SQL mới kiểm quyền/link. Script và lời hứa hợp đồng còn lệch. Report fcm-b2-r3-correctness.md.
- Security/operational72e91b10: CLEAR trong lens riêng, không finding actionable. Report fcm-b2-r3-risk.md. CLEAR của một lens không xoá finding của lens khác.

General Lead chấp nhận C3-01 là thiếu coverage/consistency thật: quyền/liên kết được kiểm tại sender nên reviewer risk không coi đó là lỗi gửi trái quyền, nhưng điều đó không thoả contract yêu cầu cả fanout. Cách sửa nhỏ có thể làm khi người dùng chỉ đạo mở lại: giữ contract hiện tại, thêm quyền/link vào eligibility projection (không đẩy vào WHERE trướcLIMIT), thêm ca revoked-before-fanout vẫn chiếm budget/cursor nhưng không delivery, và kiểm sender vẫn từ chối revoked-after-fanout. Không tự mở vòng4 hoặc đổi contract chỉ để pass.

## Evidence và giới hạn

Worker báo script101/101,5mutation bắt đúng lỗi, link181refs/0hỏng, whitespace0, r3manifest9/9/cmp sạch. Đây là SQL tuần tự/schema-plan, không D1/Worker/API/cron concurrent/FCM thực hay CPU RS256. 5inbox/20registrations/5delivery/2connections là ngân sách chưa đo; F13–F19 runtime chưa chạy. Chưa cấu hình Firebase, chưa có service account/FCM token thật. Không tuyên bố push hoạt động.

Ngoài packet: RQ-03 inbox report_id/test_id còn mở, B-01..B-05 review backend B1 còn mở, auth/mật khẩu tạm/Q1/Q2/Q3/Q8 tiếp tục CHỜ theo người dùng. Backend tổng thể chưa được qua review để triển khai. iOS nền kết quả cũ giữ nguyên, A có export auth browser-check chưa được review và chưa có round3 Chi tiết lớp.

## Đã hoàn tất của lượt tiếp quản

- Tài liệu D1+FCM, checklist Firebase, token lifecycle/ack, deliveries/fanout/cache contracts và kiểm SQL tái chạy được.
- Giữ snapshots r1/r2/r3, reports hai lens mỗi vòng, decisions/briefs/hash và status/ledger.
- Không commit/push/merge/deploy production; Worker RS256 thử từ phiên trước đã dọn và có evidence code10007 không tồn tại.

Status: DONE_WITH_CONCERNS
Summary: Lượt sửa/review FCM B2 đã dừng theo giới hạn3vòng, lens bảo mật CLEAR nhưng hợp đồng còn C3-01 REQUIRED. B2 chưa được chấp nhận để implement; evidence chỉ SQL tuần tự, runtime/FCM/CPU và các quyết định auth vẫn còn chờ.
