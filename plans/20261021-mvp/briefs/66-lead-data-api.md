# Domain Lead · Dữ liệu + API đầu-cuối (backend + lớp dữ liệu web)

Người giao: GL `5c0868ed-278b-4fa3-9fd5-3e8bbf5df5b1`. Lead MỚI (thay hướng sửa vá của lead cũ). Đọc `briefs/72-new-domain-lead.md` (riêng mảng này worker = `claude/claude-sonnet-5-5`, mode bypassPermissions, thinking medium, theo yêu cầu người dùng), `briefs/71`, `74`, `76`, `AGENTS.md`, `docs/spec.md` (mục 5.3 Offline), `docs/architecture.md` (mục 2, 4, 5), `plans/20261021-mvp/backend/{api-spec,data-model,offline-plan,authz-matrix,stack-and-cpu}.md`, `backend/handoff-lead.md`, `backend/handback.md`, `web/handback.md`.

## Phạm vi sở hữu
- Backend: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (`worker/`, nhánh `mvp-backend`, workspace `wks_a9cc7bd377b6447a`).
- Lớp dữ liệu web: worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web` CHỈ `src/data/**` (API client, Dexie, outbox, sync, repositories) + test của chúng. KHÔNG sửa UI (`src/features`, `src/roles`, `src/shared/ui`) — lead UI `a6d1bd53-d87d-4b91-a33c-b17ba2735c3a` đang sửa nút Lưu; cần đổi hợp đồng repository thì báo GL để phối hợp.
- Không sửa app iOS (ghi lại hệ quả hợp đồng cho iOS).

## Vấn đề người dùng gặp trên web staging (2026-10-23)
1. Vào một buổi học, chuyển tab Điểm danh / Nhận xét / Bài tập về nhà: gọi API rất chậm. Chọn vai trò cũng chậm.
2. Thêm học sinh ở thiết bị A, sang thiết bị B không thấy. Nghi web còn dùng dữ liệu cục bộ / không đồng bộ đúng. Rà soát TẤT CẢ: đã tích hợp API chuẩn chưa.

## Cách làm (bắt buộc theo thứ tự, không ngại công)
1. **Rà soát + đo** (worker sonnet, song song được): (a) mỗi thao tác đọc/ghi của web: đi đường nào (REST, `sync/push`, `sync/pull`, `snapshot`, chỉ Dexie), khi nào kéo dữ liệu mới, có thiết bị thứ hai thấy không — lập bảng `plans/20261021-mvp/data-api/inventory.md`; (b) đo thật trên staging (Chrome DevTools/Playwright + `wrangler tail`): số request và thời gian khi mở buổi học, chuyển 3 tab, chọn vai trò, mở lớp; CPU/thời gian D1 từng endpoint; (c) kịch bản 2 thiết bị (2 phiên trình duyệt cùng tài khoản) cho từng loại dữ liệu: lớp, học sinh, buổi, điểm danh, bài kiểm tra, điểm, phiếu, BTVN, báo cáo. Tài khoản demo: `~/.config/qlh/staging-demo.txt` (đọc không in; tối đa 2 lần đăng nhập/tài khoản mỗi lượt; khoá 15 phút sau 5 lần sai); kịch bản ghi dữ liệu dùng workspace riêng đăng ký bằng SĐT giả.
2. **Chẩn đoán gốc** `data-api/diagnosis.md`: nguyên nhân chậm, nguyên nhân mất đồng bộ, bằng chứng.
3. **Kế hoạch** `data-api/plan.md`: tiêu chí ĐƠN GIẢN NHẤT mà HIỆU QUẢ NHẤT; được phép đập đi xây lại lớp dữ liệu web và/hoặc endpoint đọc nếu thiết kế cũ là gốc lỗi (ví dụ: một nguồn đọc duy nhất là Dexie + pull theo cursor khi mở app/focus/định kỳ/sau mỗi push; ghi qua outbox; endpoint gộp dữ liệu buổi học một lần thay vì mỗi tab một lần; `/me` nhẹ). Giữ quyết định đã chốt (Worker + D1, tới-sau-thắng, offline 5 thao tác, chỉ hiện lỗi). Nêu chỉ số mục tiêu: chuyển tab buổi học không gọi mạng chặn giao diện (< 100 ms hiển thị từ cache), chọn vai trò < 1 s trên 4G, thiết bị B thấy thay đổi của A trong ≤ 1 lần đồng bộ (mở/focus/≤ 60 s).
4. **Review kế hoạch** bởi reviewer độc lập (`codex/gpt-6-luna` high, đọc-only, tối đa 2 vòng) TRƯỚC khi sửa mã. Báo GL kế hoạch + kết quả review; GL xác nhận (hỏi người dùng nếu đổi quyết định đã chốt).
5. **Thực hiện** bằng worker sonnet, ranh giới file rõ, test đỏ→xanh (gồm test 2 thiết bị), deploy staging backend + web (web deploy qua lead UI hoặc phối hợp GL để tránh đè), đo lại cùng kịch bản bước 1, so số trước/sau.
6. **Review tổng thể** sau khi làm (codex luna high, tối đa 2 vòng). Cập nhật api-spec/offline-plan; ghi hệ quả cho iOS.

Báo GL ở mỗi mốc ≤ 12 dòng kèm bằng chứng; khi worker xong thì đi tiếp ngay trong cùng lượt. Không push/merge main, không production, không in secret/SĐT. Status + 2 câu.
