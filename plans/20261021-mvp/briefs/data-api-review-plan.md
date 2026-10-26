# Review kế hoạch Dữ liệu + API (đọc-only, vòng 1/2)

Bạn là reviewer độc lập. KHÔNG sửa file nào, KHÔNG gọi staging, KHÔNG in secret. Trả lời trực tiếp trong tin nhắn cuối.

Đọc: `plans/20261021-mvp/briefs/66-lead-data-api.md` (yêu cầu), `plans/20261021-mvp/data-api/{diagnosis,plan,inventory,measure-before}.md`, `docs/spec.md` mục 4 và 5.3, `plans/20261021-mvp/backend/{api-spec,offline-plan}.md` (repo chính `/Users/phamnhuphong/Git/quanlyhocsinh`). Mã: web `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/src/data/**`, `src/app/routes.tsx`; backend `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend/worker/**`.

Kiểm:
1. Chẩn đoán có đúng với mã/bằng chứng không (đặc biệt A1 Worker xa D1 theo colo, A2 loader, A3 snapshot tuần tự, B1–B6)? Thiếu nguyên nhân gốc nào?
2. Kế hoạch có phải cách ĐƠN GIẢN NHẤT mà đạt chỉ số mục tiêu không? Hạng mục nào thừa, hạng mục nào thiếu để đạt mục tiêu (tab < 100 ms không mạng chặn, chọn vai < 1 s 4G, B thấy trong ≤ 1 lần đồng bộ)?
3. Rủi ro đúng đắn: H2 (`/me` không chặn) có phá hành vi thu hồi quyền/đăng xuất/test hiện có không; H3 song song + cursor; H5 ghi Dexie sau REST; H6 `id` tuỳ chọn (idempotency đúng chưa, quyền, workspace, xung đột với trigger/change_log, iOS tương thích ngược); Smart Placement trên gói Free với D1.
4. Ranh giới file giữa DA-4/5/6 có chồng nhau/thiếu file không; test đề ra có đủ bắt lỗi (gồm test 2 thiết bị) không.
5. Mục "Ảnh hưởng iOS" đủ và đúng chưa.

Kết quả: danh sách phát hiện, mỗi mục gắn nhãn REQUIRED (phải sửa trước khi làm) hoặc OPTIONAL, kèm bằng chứng file:dòng và đề xuất sửa cụ thể. Ngắn gọn. Kết thúc: `Verdict: APPROVE | APPROVE_WITH_CHANGES | REJECT`.
