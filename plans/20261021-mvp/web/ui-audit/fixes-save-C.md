# fixes-save-C: nút lưu/gửi/tạo, team C (2026-10-23)

Áp `useSaveAction` (src/shared) cho form tài khoản. Không sửa `src/data/**`, `src/shared/**`. Không commit.

| ID | File | Thay đổi | Kiểm |
|---|---|---|---|
| S-C01 đăng nhập | `features/auth/LoginPage.tsx` | `useSaveAction` (baseline rỗng; hợp lệ = SĐT đủ 9 số và mật khẩu không rỗng); nút `disabled={!canSave}`, `aria-busy` khi đang gửi; bấm 2 lần chỉ gửi 1; lỗi từ `action.error` qua `authFailureMessage`. Không cảnh báo rời màn (quyết định lead). | `saveStates.test.tsx` |
| S-C02 đăng ký | `features/auth/RegisterPage.tsx` | Như trên; hợp lệ = tên, tên không gian (giáo viên), SĐT 9 số, mật khẩu ≥ 8, nhập lại khớp. Bỏ các `setError` kiểm tra khi bấm. Nút disabled khi chưa hợp lệ; chặn đăng ký 2 lần. | test: nhập thiếu/lệch → disabled; bấm 2 lần → 1 lần `POST /auth/register` |
| S-C03 đổi mật khẩu mobile | `features/settings/ChangePasswordPage.tsx` | `useSaveAction`; hợp lệ thêm "mới khác hiện tại" (hàm `isPasswordFormValid`, dùng chung với desktop); dòng cảnh báo hiện ngay khi trùng, nút disabled; `aria-busy`; thành công điều hướng về `/cai-dat`. | test: trùng → disabled + cảnh báo; bấm 2 lần → 1 lần |
| S-C04 đổi mật khẩu desktop | `features/settings/SettingsPage.tsx` | Cùng hook/validate; thành công xoá ba ô, nút về disabled; giữ dòng "Đã lưu mật khẩu mới." theo quyết định lead (sẽ tắt khi sửa ô). Lỗi đổi vai trò tách thành `roleError`. | test desktop (matchMedia ≥ 1024) |
| S-C05 chọn vai trò | `features/auth/RolePickerPage.tsx` | `aria-busy` cho dòng đang chọn; tự chọn vai duy nhất chỉ chạy một lần (ref, tránh gọi 2 lần trong StrictMode). | typecheck, test auth |
| S-C06 đổi vai trò (desktop) | `SettingsPage.tsx` | `aria-busy` trên dòng vai trò khi `busy`. | |
| S-C07 đăng xuất | `SettingsPage.tsx` (mobile + desktop) | `signingOut`: nút disabled + `aria-busy`, chặn bấm lại; logic chặn khi còn lệnh chờ giữ nguyên. | |
| S-C08/09/10 | — | Không áp dụng. | |

Nhãn "Đang…" giữ nguyên trên nút auth (không dùng `Button loading` vì nút `.submit` của auth là kiểu riêng; vẫn có `aria-busy`).

## Ngoài ranh giới
- `src/data/auth/index.ts` `changePassword`: đổi xong nhưng `GET /me` lỗi thì vẫn ném lỗi. Lead báo GL. Không sửa.

## Kiểm
- Test mới `features/auth/saveStates.test.tsx` (4): đăng nhập disabled theo hợp lệ + gửi 1 lần; đăng ký disabled theo hợp lệ + bấm 2 lần chỉ 1 request; đổi mật khẩu mobile (trùng mật khẩu cũ, bấm 2 lần); desktop xoá ô và về disabled sau lưu.
- `npm run typecheck` xanh; `npx vitest run`: 41 file pass, 1 skipped; 306 test pass, 1 skipped; `npm run build` exit 0.
- Chưa chụp ảnh trạng thái loading/disabled; chưa kiểm trên trình duyệt thật sau thay đổi này.
