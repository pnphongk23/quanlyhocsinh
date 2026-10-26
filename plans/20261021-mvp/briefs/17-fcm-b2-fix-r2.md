# FCM B2: sửa findings review vòng2 → candidate vòng3 cuối

Parent General Lead 9682fb5f-0e95-45f1-9e40-8dd05a9c931a, workspace wks_5d1bc443eaa9f683. Đọc hai backend/reviews/fcm-b2-r2-{correctness,risk}.md, snapshot r2 và các nguồn live tương ứng. General Lead CHẤP NHẬN cả 4 REQUIRED; không hỏi lại nghiệp vụ đã chốt. Review tối đa3 vòng theo lead-brief, r3 là vòng cuối. Không tự launch reviewer.

Write-set gọn: backend/data-model.md,api-spec.md,authz-matrix.md,stack-and-cpu.md,check-fcm-ddl.py; offline-plan/docs/spec/docs/architecture chỉ đổi nếu câu cũ mâu thuẫn trực tiếp4 fix; báo cáo backend/fcm-b2-fix-r2.md; candidate mới backend/candidates/fcm-b2-r3/ với9nguồn nhưr2+manifest. Không sửa r1/r2, reports reviewer/status/brief, iOS/prototype/auth business. Không code Worker/FCM thật, agent con, commit/push/merge/deploy/secret.

Sửa đúng4 điểm sau, không thêm dịch vụ/state/pipeline mới nếu predicate và query đủ:
1. C2-01: phân trang registrations của đúng workspace+membership+cursor trước lọc eligibility. LIMIT là phần ngân sách registrations còn lại, lấy cả đăng ký bị skip. Tính MỌI row lấy được vào trần 20; lọc quyền/binding/session sau lấy trang. Cursor tiến theo row cuối ĐÃ XÉT dù cả trang không đủ điều kiện. Hết trang bị skip nhưng còn dữ liệu không được đánh dấu done sớm; kết thúc chỉ khi đã cạn registrations của inbox. Query projection eligibility không được đẩy predicate vào WHERE trướcLIMIT. Dùng index sẵn có, không load cả membership vào RAM. Tổng≤20 rows và≤5 inbox/invocation.
2. R2-01: claim/freezing SQL cụ thể dùng CAS event_version mà caller vừa đọc, và kiểm ready_at<=now TẠI UPDATE. Điểm xen giữa select/claim dời ready_at/incrementversion phải khiến claim cũ trả0row, không freeze. Trạngthái frozen không được cậpnhật bởi scoreupsert mới. Nếu reclaim cần nhánh riêng thì phân biệt rõ initial/reclaim, không vô tình cho job chưa ready qua nhánh reclaim.
3. R2-02: Sender ngay trước MỖI gửi checks user active + membership active + đúngbinding/phiên-user-membership, phiên chưa hết/thu hồi, quyềncon/nhóm/version hiện hành; disable sau fanout =>skipped không call FCM. SQL mô phỏng identity check phải phản ánh membership/user active, không chỉ diễnvăn; không gọi đó test API thật.
4. R2-03: freeze timestamp khởi tạo chỉ khi NULL (COALESCE hoặc predicate tách), reclaim expired lease GIỮ nguyên expansion_started_at. Cả cập nhật cursor,insert delivery,mark complete chỉ áp bởi lease_id hiệnhành (CAS hoặc same batch guard), stale owner sau takeover khôngđược mutate; row claim phải được xác nhận trước dùng. Không có bulk INSERT unguarded rồi mới cursorCAS khiến stale owner còn ghi.

Kiểm cần chứngminh bằng script SQLite tái chạy:
- ≥25 registrations,20 đầu không đủ điều kiện: invocation 1 budget 20, cursor qua 20, chưa done, cron 2 xét 5 còn lại/gửi đúng không bỏ sót. Trường hợp5 rows/2 eligible: budget = 5, không 2; 6 inbox và quota tổng vẫn≤5/20.
- Select candidate → score commit dời hạn/tăng version → claim với old version:0 row/mốc NULL; tới hạn+đúng version claim thành công. Đây là interleaving tuần tự, KHÔNG chứng minh concurrency thật.
- Fanout xong → disable membership/user → sender identity check false/skipped; trường hợp hợp lệ vẫn true.
- Claim lần1 tại T1 → hết lease/takeover T2: mốc freeze = T1; owner cũ không ghi cursor/deliveries/complete; owner hiện hành tiếp tục được. Kết thúc đúng 1 lần/PK không trùng.
- Đối chứng âm tập trung trên bản sao tạm, chứng minh test fail khi bỏ predicate/index liên quan. Không sửa source để pháhoại. Giữ 47/78 ca cũ có ý nghĩa, tránh test đếm hàm y chang code mà không state assertion.

Chạy DDL/link/whitespace + snapshot 9/9 hash/cmp; ghi lệnh/exit/counts, mapping 4 findings, giới hạn runtime/CPU chưa đo. Mọi source chỉ sửa trước freeze. Handback <=400 từ + Status và Summary 2 câu, gồm candidate overall hash, checks/residual. Nếu cần kiến trúc mới vượt 4 predicate/query, báo BLOCKED_NEEDS_LEAD, không tự mở rộng.
