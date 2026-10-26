# backend-13: snapshot báo cáo tháng, khoá `homework` đúng api-spec

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend, HEAD a2d308a), làm trong `worker/`. Dùng `srcwalk`.

## Nguyên nhân đã xác minh
Không phải dữ liệu seed sai và máy chủ không nhận snapshot từ client: `src/db/reports.ts` tự dựng snapshot khi xem trước/phát hành. Truy vấn homework (~dòng 69) `GROUP BY hs.kind, g.level` trả hàng `{kind, level, count}` và gán thẳng `homework: homework.results` (~dòng 113). `plans/20261021-mvp/backend/api-spec.md` ~dòng 444 yêu cầu `homework: [ { "kind": "vocabulary", "excellent": 4, "done": 3, "not_done": 1 } ]` (một phần tử mỗi `kind`).

## Việc
1. Sửa nơi dựng báo cáo (dùng chung cho `report-preview` và phát hành) để `homework` gộp thành một phần tử mỗi `kind` với đúng bốn khoá `kind, excellent, done, not_done` (số nguyên, 0 nếu không có; `level` null không tính; không khoá thừa). Thứ tự `kind` ổn định (theo tên). Không đổi phần khác của snapshot. Chạy cả chỗ khác đọc `homework` của snapshot trong worker nếu có.
2. Test (đỏ→xanh, `tests/reports.test.ts`): preview và snapshot phát hành có đúng khoá; ví dụ 4 excellent/3 done/1 not_done của một kind, hai kind khác nhau; không có khoá `level`/`count`.
3. Chạy `npm run typecheck` và `npm test`. Commit conventional, không nhắc AI/plan; không push, KHÔNG deploy, KHÔNG đụng staging.
4. Chỉ sở hữu `src/db/reports.ts`, `tests/reports.test.ts`.
Kết thúc: `Status: ...` + 2 câu.
