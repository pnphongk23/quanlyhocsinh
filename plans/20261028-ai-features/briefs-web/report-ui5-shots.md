# UI5 web screenshots on staging

## Result: DONE

- Rebuilt worktree `mvp-web` at `e668ff8` with the staging API base and served it at `http://localhost:4173`. Build completed successfully.
- Used existing QA sessions only in the final run; no session was created and no attendance was saved.
- Attendance image uses `QA-Web-d2bc50-HW-Previous-Class`, session `1a5754cd` (28/10): all three students were `Chưa điểm danh`, the page showed `0 vắng mặt`, and `Lưu điểm danh` was disabled.
- Criteria image uses `QA-Web-24902e-Attendance-Class`, session `1ad5bd29` (25/10), which already had attendance. A = `QA-Web-24902e-Four` (present, first criterion not achieved); B = `QA-Web-24902e-One` (present, first criterion achieved); C = `QA-Web-24902e-Two` (unmarked, no slip). The first criterion showed all three states and badge `2 em chưa có phiếu`.
- Created/updated teacher-side slips only; no parent send action was used. The API models a slip by the composite `(student_id, session_id)` key, so shortened keys are `7fe6469f:1ad5bd29` (A) and `b9d51c73:1ad5bd29` (B). After the 15-second sync window and reload, both states remained; sync push returned 200.
- Saved and opened both screenshots to verify the displayed states. SĐT was scrubbed; neither image contains a phone number.
- Earlier authorized attempts had created two extra sessions (`AAA-QA97-IM-5355dc` and the 20:45 retry) before the latest instruction. They were not used for these screenshots; this final run created no sessions and did not modify their attendance or slips.

Artifacts:

- `plans/20261021-mvp/web/ui-feedback-30/attendance-unmarked-after-390-webkit.png`
- `plans/20261021-mvp/web/ui-feedback-30/criteria-three-states-after-390-webkit.png`
- `plans/20261028-ai-features/shots-web/ui5-qa-shots.mjs`

Status: DONE
Summary: Captured and visually verified both requested 390×844 WebKit viewport states on existing QA sessions. Attendance stayed untouched; two teacher-side slips synced successfully, and no parent send action was used.
