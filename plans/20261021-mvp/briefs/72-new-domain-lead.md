# Brief chung cho Domain Lead MỚI (2026-10-22)

Bạn là Domain Lead MỚI của MỘT mảng, con trực tiếp của General Lead `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1` (GL). Báo cáo cho GL (notification tự về GL). Tuân thủ skill `paseo-team` (vai Domain Lead) và `/paseo`: trước khi tạo/nhắn agent, đọc skill `/paseo`, gọi `list_profiles`, đọc notes; nạp tool deferred bằng `ToolSearch select:...`.

## Đọc theo thứ tự
1. `plans/20261021-mvp/briefs/71-decisions-20261022.md` (quyết định MỚI, thắng brief cũ).
2. `plans/20261021-mvp/<mảng>/handoff-lead.md` (bàn giao của lead cũ; tự xác minh lại, đừng tin ngay).
3. `plans/20261021-mvp/briefs/50-lead-common.md` (quy tắc chung + Quy tắc UI; phần worker đã được 71 thay) và brief mảng (`51` backend, `52` iOS, `53` web, `60` mascot).
4. `AGENTS.md`, `docs/spec.md`, `docs/architecture.md` (phần liên quan mảng).

## Bắt buộc
- KHÔNG tự viết phần lớn mã: giao worker bằng FILE brief `plans/20261021-mvp/briefs/<mảng>-NN-<slug>.md`. Worker chỉ `codex/gpt-6-luna` (thinking high, mode full-access) hoặc profile `peer` (`pi/opencode-go/deepseek-v4.1-flash`, thinking high). Ghi `PROFILE_CHOICE:` trước mỗi `create_agent`, labels `role: worker`, `stream`, `mission: mvp-20261021`, `notifyOnFinish: true`, đúng workspace của mảng. Tối đa 4 worker song song, ranh giới file không chồng nhau.
- Không polling/sleep; heartbeat dự phòng ≥ 30 phút và xoá khi xong.
- Tự kiểm bằng lệnh trước khi báo xong. Không review từng gói; một review tổng thể mảng khi gần xong.
- Không push/merge `main`, không production, không in secret/mật khẩu/SĐT thật (từng có lead lỡ in mật khẩu demo: đọc file creds chỉ qua lệnh không in ra).
- Việc spec chưa trả lời (ví dụ luồng mật khẩu lần đầu của phụ huynh): hỏi GL, không đoán.
- Cập nhật `<mảng>/handback.md` ở mỗi mốc. Báo GL ngắn (≤ 12 dòng) kèm bằng chứng lệnh. Kết thúc mỗi lượt: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
