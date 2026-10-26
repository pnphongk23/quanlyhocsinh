# Chung cho worker thực hiện (DA-4/5/6) · mảng Dữ liệu + API

- Đọc: `data-api-00-common.md` (quy tắc bí mật/staging), `plans/20261021-mvp/data-api/plan.md` (NGUỒN CHUẨN, GL đã duyệt 2026-10-23), `data-api/diagnosis.md`, phần liên quan `data-api/inventory.md`. Repo chính `/Users/phamnhuphong/Git/quanlyhocsinh` (chỉ sửa file plans được giao; KHÔNG git ở repo chính).
- Quyết định GL đã duyệt: gỡ "khôi phục buổi" (huỷ buổi không đảo ngược; lead UI gỡ nút, bạn KHÔNG sửa UI); kéo định kỳ 60 s chỉ khi trang hiển thị, ẩn/nền thì dừng, quay lại thì kéo ngay; `/me` chạy nền khi mở app (thu hồi có hiệu lực ở lần mở/đồng bộ kế tiếp, pull 403/409 vẫn ẩn cache).
- Chỉ sửa file trong ranh giới gói của bạn. Cần đổi file ngoài ranh giới: dừng, báo `NEEDS_CONTEXT` kèm lý do.
- Test đỏ → xanh: viết test hồi quy trước, chạy thấy đỏ, sửa, thấy xanh. Không làm yếu/xoá test cũ để xanh.
- Git: worktree dùng chung với người khác (có thay đổi chưa commit KHÔNG phải của bạn). Commit chỉ file của bạn bằng đường dẫn cụ thể (`git add <file>...`), CẤM `git add -A`/`.`, `stash`, `reset`, `checkout --`, `push`. Commit theo conventional commits, không nhắc AI/mã kế hoạch trong message/comment/tên test.
- Không deploy web (lead điều phối). Không production. Không polling/sleep chờ việc dài.
- Báo cáo `plans/20261021-mvp/data-api/impl-<gói>-report.md`: đã làm theo từng hạng mục, file đổi, commit, lệnh kiểm + kết quả (số test), test đỏ→xanh nào, rủi ro/còn lại.
- Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + Summary 1–2 câu + Concerns.
- (GL 2026-10-23) CẤM chạy `env`, `printenv`, `set`, hay in biến môi trường/file creds; chỉ đọc đúng biến cần qua đường không in.
- (GL 2026-10-24) CẤM `ps`, `pgrep -fl`, `pgrep -a`, `lsof` hay lệnh nào in dòng lệnh tiến trình (lộ khoá MCP); cần kiểm tiến trình chỉ dùng `pgrep -x <tên>`. Vẫn cấm `env`/`printenv`/`set`.
