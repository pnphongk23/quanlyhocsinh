# Báo cáo: đồng bộ `docs/architecture.md` với spec backend đã review

Ngày: 2026-10-21 · Brief: đồng bộ theo 15 điểm ở `plans/20261021-mvp/backend/report-b1.md` (review tổng thể `APPROVED`, `review-overall-r1.md`). Chỉ sửa `docs/architecture.md`; `docs/spec.md` **không sửa**. Không git checkout/reset/stash/commit/push; thay đổi chưa commit sẵn có trong working tree (kể cả `docs/spec.md`) giữ nguyên.

## Đã sửa theo từng điểm

| # | Điểm trong report-b1 | Sửa ở đâu trong `docs/architecture.md` |
|---|---|---|
| 1 | Phiên + băm mật khẩu + `must_change_password` + điều kiện cấp mật khẩu tạm | Mục 2 hàng **Đăng nhập**: phiên = token ngẫu nhiên 32 byte, D1 chỉ lưu băm SHA-256 (`auth_sessions`), không token ký, `Authorization: Bearer` cho cả hai client (không cookie); PBKDF2-HMAC-SHA256, Cloudflare chặn trên 100.000 vòng, số vòng vận hành **chưa chốt (Q8)**; `must_change_password` chặn mọi endpoint trừ đổi mật khẩu/đăng xuất/`/me`; cấp mật khẩu tạm chỉ khi tài khoản đích không có membership nhân sự ở bất kỳ workspace nào và mọi membership là phụ huynh trong chính workspace gọi, ngược lại từ chối không ghi gì (ghi "đề xuất 2026-10-21, chờ xác nhận"). Mục 4 (Tài khoản và mật khẩu) lặp lại cùng quy tắc. |
| 2 | PDF phát qua Worker thay link ký (Q9) | Mục 2 hàng **Lưu file**: PDF báo cáo stream qua Worker, kiểm quyền mỗi lần tải, nêu lý do R2 binding không tạo được presigned URL; tệp bài giảng chưa làm ở MVP. |
| 3 | Drizzle chỉ lúc thiết kế, runtime SQL thuần | Mục 2 thêm hàng **Truy vấn, ORM** (`env.DB.prepare/batch`, `import type`, kèm số đo bundle 14,7/47,5/133,9 KiB gzip, link `stack-and-cpu.md` 3.3, 6); hàng **Cơ sở dữ liệu** ghi migration `wrangler d1 migrations apply`. |
| 4 | Push FCM HTTP v1, FCM → APNs, không VAPID/APNs trực tiếp | Mục 2 hàng **Push**: FCM HTTP v1, iOS đi **FCM → APNs** bằng SDK Firebase Messaging, web dùng FCM web token, OAuth RS256 từ secret + cache D1 ~50 phút, payload chỉ loại + mã tham chiếu. Đã **bỏ hẳn** câu "Web Push VAPID tự gửi" và "Worker gọi APNs trực tiếp" khỏi cột Loại bỏ. |
| 5 | Bảng đồng bộ mới, đổi tên `sessions` → `class_sessions`, khoá tự nhiên cho 4 "ô" | Mục 4 thêm 2 bullet: bullet "Bảng chính" (khoảng 29 bảng, có `change_log`, `applied_commands`, `sync_conflicts`, `memberships.scope_epoch`, `workspaces.change_floor`; `class_sessions` để không nhầm `auth_sessions`, cột vẫn `session_id`) và bullet khoá tự nhiên (`session_id+student_id`, `test_id+student_id`, `section_id+student_id`; UUID do client sinh cho bài kiểm tra/phần BTVN). |
| 6 | Ràng buộc cùng lớp (B-04) | Mục 4 thêm bullet `UNIQUE (class_id, id)` trên `students`, `class_sessions`, `tests`, `homework_sections` + khoá ngoại phức hợp `(class_id, …)`, hệ quả "một em một lớp", đổi `class_id` bị chặn, chuyển lớp thuộc "Làm sau" (cần bảng ghi danh). Sửa bullet hồ sơ nghỉ học (bỏ cách nói như thể chuyển lớp đã có ở MVP). |
| 7 | Vòng đời đăng ký token (C-01/R-01) | Mục 4 bullet **Push**: thêm hai loại upsert — làm mới cùng binding chỉ `updated_at`, không bump `registration_version`, không đổi `bound_at`; đổi binding bump version + đặt `bound_at` + huỷ deliveries cũ trong cùng `batch`. |
| 8 | Fanout có trần (R-02 + C3-01) | Mục 4 bullet inbox/fanout: freeze bằng CAS theo `event_version` + `ready_at`, keyset `delivery_cursor`, **phân trang trước, lọc sau** trong projection, trần 5 inbox/20 đăng ký (**chưa đo**), điều kiện quyền nhóm theo loại sự kiện (`comments_reports`/`scores`) + `guardian_student`, sender kiểm lại trước mỗi lần gửi. |
| 9 | Ranh giới atomic (B-02) | Mục 5 bullet **Lệnh trong hàng đợi**: mỗi lệnh một `batch` D1 riêng, lô HTTP 50 lệnh không atomic, lệnh đã áp dụng không hoàn lại, lệnh bị từ chối không chặn lệnh khác, client xoá từng lệnh theo xác nhận riêng và gửi lại cả lô nhận `duplicate`; kèm link `api-spec.md` 6.1 và `offline-plan.md`. Đồng bộ lại hàng **Cơ sở dữ liệu** (mục 2) và bullet rủi ro "mất hoặc sai dữ liệu khi đồng bộ" (mục 7). |
| 10 | Retention `change_log` (B-03) | Mục 5 thêm bullet **Dọn `change_log` và tải đầu lại**: `created_at` giây Unix do trigger ghi, chỉ mục theo tuổi, cron xoá > 120 ngày theo lô ≤ 500 dòng/lô và ≤ 4 lô/lần, cập nhật `change_floor`; cursor cũ nhận `409 snapshot_required`, `epoch` lệch là `409 resync_required`. Mục 3 (`cron.ts`) ghi thêm việc dọn dẹp. |
| 11 | Phạm vi `/calendar` của phụ huynh (B-05) | Mục 4 bullet D1/phân quyền: `/calendar` của phụ huynh chỉ trả buổi của lớp có con được liên kết, không `note`, không buổi hay lớp khác. |
| 12 | `report_id`/`test_id` trong inbox (RQ-03) | Mục 4 thêm bullet **Inbox trong app** (`GET /notifications`): `report_id` chỉ cho `report_published`, `test_id` chỉ cho `score_updated`, loại khác `null`; không trả nội dung nhận xét/điểm/sao/SĐT; ID không phải quyền truy cập. |
| 13 | Phạm vi không làm ở MVP | Mục 4 thêm bullet **MVP không làm** (bài giảng chỉ là dòng quyền, học phí, lương, mời nhân sự, OTP/SMS, màn nhân sự/role, xác minh SĐT) + link `api-spec.md` mục 10. Mục 3 quy ước: thư mục/bảng bài giảng thuộc "Làm sau"; bullet bài giảng ở mục 4 mở đầu bằng "(Làm sau, xem phạm vi cuối mục này)". |
| 14 | Số đo ở mục 9 | Mục 9: PBKDF2 100.000 vòng ≈ 29 ms CPU trung vị (18–45), 25.000 ≈ 7 ms; `batch` 100 câu SQL thuần ≈ 1–2 ms CPU (chờ D1 20–70 ms không tính CPU); bundle 14,7/47,5/133,9 KiB; ghi rõ **chưa đo** 50 lô đồng bộ nhỏ, RS256/gửi FCM, trần 5/20, dọn `change_log` trên D1. |
| 15 | Rủi ro ở mục 7 | Sửa dòng rủi ro chiếm tài khoản (thêm điều kiện cấp lại, nêu Q1/Q2/Q3 còn chờ); sửa dòng "băm mật khẩu" từ "phiên dài bằng token ký" sang token ngẫu nhiên tra D1; thêm 2 dòng: cảnh báo "vắng 2 buổi liên tiếp" tính ở client (chờ Q15) và không có đường tự phục vụ khi quên mật khẩu giáo viên/Admin + chưa xác minh SĐT (Q1/Q3). Rủi ro "push đã hiện trước ack không thu hồi được" đã có sẵn, giữ nguyên. |

Ngoài 15 điểm, chỉ thêm 3 chỗ nối tiếp bắt buộc để không mâu thuẫn: câu dẫn đầu tài liệu trỏ tới 5 file backend và nói rõ tài liệu chỉ giữ mức kiến trúc; `/me` + "không cookie" đi cùng hàng Đăng nhập; điểm số ghi "cho nhập thập phân hay không **chưa chốt** (Q6)".

## Bỏ qua / không sửa

- **`docs/spec.md`: không sửa.** Không điểm nào trong 15 điểm yêu cầu sửa spec, trừ điểm 15 có điều kiện "nếu người dùng chốt Q15" — Q15 chưa chốt nên không đụng. File này đang có thay đổi chưa commit từ trước, không phải của lượt này.
- **Q16 (cách đánh số buổi): không sửa spec.** Spec mục 4 ghi "số buổi chỉ đếm buổi đã diễn ra", prototype/thiết kế đánh số mọi buổi chưa hủy. Đây là mâu thuẫn đang mở: kiến trúc ghi "**chưa chốt** (Q16)" thay vì chọn một bên; sửa spec thuộc quyết định của người dùng.
- **Không nhúng chi tiết từng cột/endpoint vào kiến trúc.** Mọi chỗ cần chi tiết đều trỏ link `plans/20261021-mvp/backend/*.md` (data-model: bảng/cột/chỉ mục/trigger; api-spec: endpoint, mã lỗi, lệnh, push; authz-matrix; stack-and-cpu; offline-plan).
- **Không đổi mục 8 Lộ trình**: cấp mật khẩu tạm vẫn ghi "đề xuất, chờ xác nhận"; bài giảng vẫn ở giai đoạn 3 ("Làm sau").
- **Không xoá thiết kế bài giảng** ở mục 4 (spec vẫn để "đề xuất, chờ duyệt" và "Làm sau"), chỉ đánh dấu phạm vi để không đọc thành MVP.
- Các giá trị **chưa đo** giữ nguyên nhãn "chưa đo": trần 5/20, RS256/FCM, CPU 50 lô đồng bộ nhỏ, chi phí chỉ mục B-04, dọn `change_log` trên D1.

## Kiểm chứng sau khi sửa

- `srcwalk discover "VAPID"|"Web Push"|"APNs trực tiếp" --as text --scope docs/architecture.md` → **0 match** cả ba.
- `srcwalk discover "OTP"|"mời"|"trung bình"` → chỉ còn câu phủ định ("bỏ luồng mời/OTP", "không SMS, không OTP", "MVP không làm … mời nhân sự", "Không có điểm trung bình ở bất kỳ đâu (spec mục 3.1)").
- `srcwalk discover "token ký"|"cookie"|"link ký"` → "token ký" chỉ còn trong câu "**không** dùng token ký" (mục 2, mục 7); "link ký" chỉ còn ở dòng rủi ro tệp bài giảng đã ghi "(bài giảng thuộc Làm sau)", không áp cho PDF báo cáo.
- Link nội bộ: 16 link, 6 đích khác nhau (`spec.md`, 5 file backend) — kiểm bằng script, **0 hỏng**.
- Đối chiếu bằng `srcwalk`/đọc lại chéo với backend: xác thực (Bearer, `must_change_password`, băm 100.000, điều kiện B-01 = `api-spec.md` 0, 4, Q2; `data-model.md` 2.1), push FCM (api-spec 7, data-model 2.7, stack-and-cpu 9), đồng bộ (api-spec 6.1/6.3, offline-plan, data-model 2.8), số đo (stack-and-cpu 3, 4, 6), số buổi/Q15/Q16 (api-spec 5.4, Q15, Q16; data-model 2.2), phiên (api-spec 0, 4) — không còn câu nào mâu thuẫn.
- Không sửa `docs/spec.md`; `git status` chỉ thêm `docs/architecture.md` và file báo cáo này vào phần thay đổi của lượt này.

## Lo ngại

- **Q16 là mâu thuẫn thật giữa spec mục 4 và prototype/thiết kế**; kiến trúc đang ghi "chưa chốt" nên hai client sẽ phải chờ quyết định trước khi làm màn Buổi học.
- **Q1/Q2/Q3/Q8 vẫn chặn implement đăng nhập**: kiến trúc chỉ ghi trạng thái chưa chốt, không tự chọn phương án (thủ công/mã khôi phục/email, `registration_code`/Turnstile, số vòng băm).
- **Tệp bài giảng** (spec mục 4) vẫn mô tả "link ký ngắn hạn" trong khi PDF báo cáo nay phát qua Worker. Không mâu thuẫn ở MVP (bài giảng thuộc "Làm sau") nhưng phải chốt lại cơ chế tải tệp khi làm bài giảng, vì R2 binding không tạo được presigned URL.

Status: DONE_WITH_CONCERNS
Summary: Đã đồng bộ `docs/architecture.md` theo đủ 15 điểm (xác thực/phiên, PDF qua Worker, ORM thiết kế, FCM → APNs, bảng đồng bộ + khoá tự nhiên, ràng buộc cùng lớp, vòng đời token, fanout 5/20, atomic từng lệnh, retention 120 ngày, `/calendar` phụ huynh, `report_id`/`test_id`, phạm vi không làm, số đo CPU, rủi ro) và chỉ để chi tiết ở 5 file backend qua link, không sửa spec. Kiểm bằng srcwalk: không còn VAPID/Web Push/APNs trực tiếp, OTP–mời–trung bình chỉ còn câu phủ định, 16 link nội bộ không hỏng; còn lo ngại Q16 (cách đánh số buổi) đang mâu thuẫn spec với prototype và Q1/Q2/Q3/Q8 chưa chốt nên chưa thể implement đăng nhập.
