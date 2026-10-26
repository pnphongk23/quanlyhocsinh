# Kế hoạch: trạng thái nút lưu/gửi/tạo (2026-10-23)

Nguồn: phản hồi người dùng qua GL sau khi thử staging. Lead: Domain Lead Web UI audit.

## Yêu cầu (áp cho MỌI hành động lưu/gửi/tạo/phát hành/đổi trên web, đồng bộ prototype nếu khác)
1. Disabled khi chưa có thay đổi so với dữ liệu gốc, hoặc dữ liệu chưa hợp lệ.
2. Đang lưu: chặn bấm lần 2 (khoá ngay lần bấm đầu, kể cả khi lưu đồng bộ cục bộ); hành động cần mạng (gửi nhận xét, phát hành báo cáo, đăng nhập, đăng ký, đổi mật khẩu) hiện trạng thái đang xử lý (`aria-busy`).
3. Lưu thành công: dữ liệu gốc = giá trị vừa lưu, nút về disabled.
4. Spec 5.3: KHÔNG hiện chip "Đã lưu"/"Đã đồng bộ"/"Chưa lưu"; chỉ hiện lỗi. Spec mục 4 (bảng): cảnh báo khi rời màn còn nhập dở chưa bấm Lưu (điều hướng trong app + đóng tab/tải lại).
5. Một mẫu dùng chung trong `src/shared` (hook + component), không sửa lẻ từng màn theo cách riêng.

## Ranh giới
- KHÔNG sửa `src/data/**` (lead Data+API đang rà). Cần đổi hợp đồng repository (vd hàm lưu trả Promise) → báo lead, lead hỏi GL.
- Deploy staging: phối hợp GL trước.

## Mẫu chung (Team T, sonnet 72da24c6) — `src/shared`
- `useSaveAction({ baseline, value, isEqual?, validate?, save })` → `{ dirty, valid, saving, canSave, submit, reset }`. `submit` khoá re-entry bằng ref, `saving` đúng trong lúc chờ (save đồng bộ hay Promise), thành công thì baseline = value; lỗi giữ dirty để thử lại.
- `useLeaveGuard(dirty)`: `useBlocker` + `beforeunload`, dùng `UnsavedChangesDialog` chung (chuyển từ `features/scores` sang `src/shared/ui`, giữ API cũ qua re-export để màn đang dùng không vỡ).
- `Button` có `loading` (disabled + `aria-busy` + chỉ báo nhẹ, không đổi bề rộng). `ActionFooter` hỗ trợ dòng gợi ý lý do disabled (vd "Chưa có thay đổi để lưu") theo mẫu đã có ở màn nhập điểm.
- Test hành vi bằng Testing Library.

## Đội
| Bước | Ai | Việc |
|---|---|---|
| Chụp | T-shot luna `e90d9824` | Liệt kê MỌI hành động lưu/gửi/tạo (từ mã + UI) → `save-actions-inventory.md`; chụp 4 trạng thái mỗi hành động (chưa sửa / đã sửa / đang lưu (mock chậm) / sau lưu) + không hợp lệ, 390 và 1440 → `shots/ui-audit/save-states/before/` |
| Audit | 3 haiku (A, B, C) | Đối chiếu yêu cầu 1–4 → `findings-save-<team>.md` |
| Mẫu chung | T-fix sonnet `72da24c6` | Làm song song với chụp/audit |
| Sửa | A-fix `50ccff5b`, B-fix `cc33ec2d`, C-fix `24509570` (sonnet) | Áp mẫu vào màn trong ranh giới file của team (như `plan.md`) → `fixes-save-<team>.md` |
| Kiểm | T-shot | Ảnh sau + so sánh; lead chạy typecheck/test/build |
| Prototype | lead | So hành vi prototype, đồng bộ mẫu nếu khác |
