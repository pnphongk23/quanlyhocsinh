# backend-12: điểm số lẻ bước 0,5

Worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-backend` (nhánh mvp-backend), làm trong `worker/`. Đọc `AGENTS.md`, `plans/20261021-mvp/briefs/71-decisions-20261022.md` mục 6. Dùng `srcwalk`.

## Việc
`score.set` (sync, `src/db/sync.ts` ~dòng 211-214) hiện chấp nhận số thực ≥ 0 và ≤ max. Đổi: `value` là `null` hoặc số hữu hạn trong [0, max] và là bội của 0,5 (`value*2` là số nguyên); số âm/không hữu hạn/không phải số giữ `invalid_score`; số trong khoảng nhưng không bội 0,5 (vd 7,3) bị `rejected` với mã `invalid_score_step` (validation error, cùng khuôn với `invalid_score`); `score_above_max` giữ. Kiểm `max` của bài kiểm tra (`test.create/update`): `max` > 0 và cũng phải là bội 0,5 nếu hiện đang cho số lẻ khác (nếu hiện là số nguyên thì giữ nguyên, không nới). Kiểm cột `scores.value` trong `migrations/0001_schema.sql` (REAL, giữ; KHÔNG sửa migration đã áp dụng, nếu muốn thêm CHECK ở DB thì thôi). Kiểm chỗ khác ghi điểm/đọc điểm (sync-read, reports, `db/tests-scores.ts`) làm tròn hay ép số nguyên sai: 7,5 phải đi và về nguyên vẹn (pull, snapshot, báo cáo tháng).
Test (`tests/sync.test.ts`, đỏ→xanh): 7,5 applied và pull trả 7,5; 0,5 và max applied; 7,3 rejected `invalid_score_step`; 7,25 rejected; max+0,5 rejected `score_above_max`; âm rejected.

## Ranh giới file
Sở hữu: `src/db/sync.ts` (chỉ phần score), `src/db/tests-scores.ts`, `tests/sync.test.ts`, `tests/tests-scores.test.ts`. KHÔNG đụng auth/crypto/types/vitest.config/README và các doc `plans/.../*.md` (lead sửa). Worker khác (backend-11) đang sửa auth song song, `typecheck` có thể đỏ tạm do file của họ: chỉ chạy test file của mình (`npx vitest run tests/sync.test.ts ...`) và báo.

## Xong khi
Test liên quan xanh, `npm run typecheck` không lỗi từ file của bạn. Commit tập trung conventional, không nhắc AI/plan; không push, không deploy. Kết thúc: `Status: ...` + 2 câu + mã lỗi mới.
