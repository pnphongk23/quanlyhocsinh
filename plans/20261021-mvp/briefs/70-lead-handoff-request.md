# Yêu cầu bàn giao cho Domain Lead cũ (2026-10-22)

Người dùng yêu cầu: mỗi mảng có Domain Lead MỚI do General Lead `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1` trực tiếp quản lý. Bạn (lead cũ) chỉ bàn giao CHÍNH XÁC, không nhận việc mới, không giao worker mới.

## Việc
1. Viết `plans/20261021-mvp/<mảng>/handoff-lead.md` (mảng: `backend`, `ios`, `web`, `design/mascot`), ≤ 120 dòng, sự thật kiểm được, gồm:
   - Mục tiêu mảng và brief gốc (đường dẫn).
   - Trạng thái thật: nhánh, worktree, HEAD, file chưa commit; cái gì ĐÃ tự kiểm (lệnh + kết quả) và cái gì CHỈ theo báo cáo.
   - Worker ĐANG chạy (id đầy đủ, model, brief, việc, file đang sửa) và worker cũ đáng nhớ.
   - Việc còn lại theo thứ tự ưu tiên, kèm brief sẵn có.
   - Câu hỏi đang chờ người dùng/GL; quyết định đã chốt riêng của mảng.
   - Lệnh tự kiểm chuẩn (test/build/deploy/smoke), tài nguyên staging, cạm bẫy đã gặp.
   - Không chứa secret, mật khẩu, token, SĐT thật.
2. Đọc `briefs/71-decisions-20261022.md` (quyết định mới) và ghi trong handoff những chỗ của mảng bị ảnh hưởng.
3. Nếu có worker đang chạy: KHÔNG huỷ. Khi worker đó báo xong, ghi kết quả của nó (nguyên văn Status/Summary + đường dẫn báo cáo) vào cuối handoff, rồi gửi `send_agent_prompt` tới GL `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1` một dòng: "<mảng>: worker <id> xong, đã ghi vào handoff-lead.md". Không tự kiểm hay giao việc tiếp.

Kết thúc: Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT + 2 câu, kèm đường dẫn handoff.
