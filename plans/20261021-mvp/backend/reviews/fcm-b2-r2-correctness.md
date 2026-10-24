# FCM B2 r2 — reviewer hợp đồng

Agent 78ea7113-0c36-4abf-9373-7b2b7b2cef8b. Candidate SHA256(manifest): 589d9769c6b76688c20d3a4ac8939f6ab182e86a4c91748dd4431bc0954531c4. Parent lưu finding từ finish notification, chưa sửa frozen source.

VERDICT: CHANGES_REQUIRED

- REQUIRED | plans/20261021-mvp/backend/check-fcm-ddl.py:240 (snapshot r2) | FANOUT_PAGE_SQL lọc phiên và membership không hợp lệ trước LIMIT; fanout_invocation chỉ cộng len(page) vào ngân sách. Kiểm tra dòng479–481 đếm2 thiết bị đủ điều kiện trong5 thiết bị seed. Không chứng minh/không khớp trần20 đăng ký được xét kể cả bị bỏ qua ở api-spec.md:397/data-model.md:530. | Phân trang toàn bộ đăng ký theo membership/cursor, tính từng đăng ký vào trần trước khi lọc điều kiện đủ; kiểm đăng ký bị bỏ qua chiếm ngân sách và cursor đi qua chúng.

Uncertainties:
- Script nói rõ không kiểm trigger/D1/Worker/FCM/concurrency; evidence chỉ SQL tuần tự.
- Reviewer đã xác nhận manifest hash khớp; không rerun nghi thức.

## Xử lý General Lead

Ghi C2-01, CHANGES_REQUIRED vòng2. Chờ lens risk của cùng snapshot, không đổi nguồn/candidate hay giao sửa giữa review. Sau đủ2 verdict mới lọc/gộp/giao sửa; tối đa3 vòng theo lead-brief do user chỉ định.
