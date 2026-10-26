# Brief 90 · Xoá báo cáo

Ngày 2026-10-25. Cha: GL #4 `4350a256-dd3a-41d8-8827-4b118a422623`. Nguồn chuẩn: `docs/spec.md` mục Báo cáo ("Xoá báo cáo", commit main `b62ca8f`). Spec thắng nếu brief lệch.

## Quyết định người dùng
- Tab Báo cáo: giáo viên xoá được một báo cáo (một lần "Thêm báo cáo", gồm bản của mọi học sinh), cả nháp lẫn đã phát hành.
- Hỏi xác nhận; báo cáo đã phát hành thì hộp xác nhận nói rõ phụ huynh sẽ không còn thấy.
- Xoá mềm (ẩn với giáo viên và phụ huynh, giữ dữ liệu), cần mạng, không xếp hàng outbox.
- Làm cả web và iOS.

## Chia việc
- **Backend + hợp đồng** (lead backend): endpoint xoá mềm theo báo cáo/đợt (quyền như phát hành báo cáo), ẩn khỏi danh sách GV, danh sách PH, GET publication và sync pull; idempotent; ghi mục vào `plans/20261021-mvp/data-api/contract-changes.md`, chốt hợp đồng và báo GL trước khi code xong để web/iOS bắt đầu. Migration (nếu cần cột `deleted_at`) và deploy Worker staging xin GL như brief 89.
- **Web** (lead web): nút Xoá trong menu báo cáo ở tab Báo cáo + hộp xác nhận (2 nội dung nháp/đã phát hành), khoá khi mất mạng, gỡ khỏi danh sách và cache cục bộ. Deploy sau Worker.
- **iOS** (lead iOS): như web, trên app GV; app PH ẩn báo cáo đã xoá (kể cả cache offline). Chỉ simulator `iPhone 16`, xếp lượt với QA qua GL.
- **QA**: thêm testcase xoá báo cáo (nháp, đã phát hành → PH không thấy, offline bị khoá, quyền).

## Ràng buộc chung
Token + `design/ux-v2/rules.md` cho UI; cấm env/printenv/set/ps/pgrep -fl/lsof; không in creds; không đọc `staging-demo.txt`; chỉ staging, workspace smoke giả; không push. Báo GL ≤150 từ ở mốc.
