# Findings save-states · team C (đăng nhập, đăng ký, quên mật khẩu, chọn vai trò, cài đặt, đổi mật khẩu, phụ huynh, PWA)

Ngày: 2026-10-23 · HEAD worktree `mvp-web`: 1d8dc8e · Đánh giá bằng mã nguồn (`src/features/auth`, `src/features/settings`, `src/features/pwa`, `src/roles/guardian`, `src/roles/account`); ảnh bổ sung: `shots/ui-audit/save-states/before/C/`.

Kết quả chung: không màn C nào dùng mẫu chung từ `src/shared` (`useSaveAction`, `useLeaveGuard`, `Button loading`, `ActionFooter`). Grep xác nhận: không có `useSaveAction`, `useLeaveGuard`, `loading=`, `aria-busy` trong các thư mục trên. Các nút dùng `disabled={loading}` hoặc `disabled={busy}` trực tiếp.

Ghi chú: Y1 cho đăng nhập và đăng ký đánh giá theo "hợp lệ" (ô trống), không theo "đã sửa", theo brief. Banner "Lỗi lưu" trên ảnh là lỗi máy chủ giả, không tính.

## Bảng hành động

Ô ghi: Đạt / Thiếu / Không áp dụng (N/A) kèm bằng chứng.

| ID | Màn/route | Hành động | File:dòng | Cần mạng? | Y1 disabled khi chưa sửa | Y1 disabled khi không hợp lệ | Y2 chặn bấm 2 lần / đang xử lý | Y3 sau lưu về disabled | Y4 cảnh báo rời màn | Y4 không chip "Đã lưu" | Mức | Đề xuất áp mẫu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S-C01 | `/dang-nhap` (390, 1440) | Đăng nhập | `LoginPage.tsx:19-24` (submit), `:33` (nút) | Có | N/A (form không có baseline) | **Thiếu**: `:33` chỉ `disabled={loading}`; `submit` không kiểm ô trống (`:19-24`). Gửi rỗng vẫn gọi máy chủ. Bằng chứng: `390x844/095-login-form-validation-error.png` hiện "Không thể kết nối" khi ô trống | **Một phần**: `:33` `disabled={loading}`, nhãn "Đang đăng nhập…"; không `aria-busy`; không khoá bằng ref | N/A (điều hướng sau thành công, `:21`) | N/A (không lưu dữ liệu) | Đạt (không có chip) | **Vừa** | Dùng `useSaveAction` với `validate` (SĐT 9 số, mật khẩu không rỗng), `loading` trên `Button` (aria-busy). Lỗi "không kết nối" chỉ khi đã gửi thật |
| S-C02 | `/dang-ky` (390, 1440) | Tạo tài khoản / không gian làm việc | `RegisterPage.tsx:43-65` (submit), kiểm tra `:46-50`, `:103` (nút) | Có | N/A (form tạo mới) | **Thiếu**: `:103` chỉ `disabled={loading}`. Kiểm tra chỉ chạy khi bấm (`:46-50`), lỗi hiện ở banner `:84`. Bằng chứng: `390x844/098-register-form-validation-error.png` | **Một phần**: `:103` `disabled={loading}`, nhãn "Đang tạo…"; không `aria-busy`; `setLoading(true)` `:52` đồng bộ | N/A (điều hướng `:59`) | **Thiếu**: không có guard. Form có 5 trường (tên, tên không gian làm việc, SĐT, mật khẩu, nhập lại). Rời màn (nút quay lại `:70-72`, `Link`) mất hết dữ liệu nhập | Đạt | **Cao** (mất dữ liệu nhập dở khi rời màn, theo định nghĩa brief) | `validate` chạy liên tục để disable nút; `useLeaveGuard(action.dirty)` cho cả nút quay lại; `loading` trên `Button` |
| S-C03 | `/cai-dat/doi-mat-khau` (390, 375, 430) | Lưu mật khẩu mới | `ChangePasswordPage.tsx:27-43` (submit), `:25` (blocked), `:30-33` (khác hiện tại), `:34` (`setBusy`), `:83-85` (nút) | Có | Đạt (ô trống → `blocked`, `:25`) | **Một phần**: `:25` kiểm rỗng, độ dài 8, khớp, nhưng **không** kiểm "mới khác hiện tại" khi bật nút. Điều kiện này chỉ hiện lỗi sau khi bấm (`:30-33`). Bằng chứng: `390x844/105-change-password-form-validation-error.png` | **Một phần**: `:83` `disabled={blocked \|\| busy}`, nhãn "Đang lưu…"; `setBusy(true)` `:34` đồng bộ trước `await`; không `aria-busy`; không ref | N/A (điều hướng về `/cai-dat`, `:37`) | **Thiếu**: không có guard. Ba ô mật khẩu mất khi rời màn | Đạt | **Vừa** (chỉ ba ô mật khẩu, nhập lại nhanh; không lưu bản nháp mật khẩu vì lý do bảo mật) | Thêm điều kiện "khác hiện tại" vào `validate`; `loading` trên `Button` (aria-busy); `useLeaveGuard` |
| S-C04 | `/cai-dat` (desktop 1440) | Lưu mật khẩu mới (form cùng trang) | `SettingsPage.tsx:270-290` (savePassword), `:267-268` (invalid), `:278` (busy), `:281-284` (reset), `:473-477` (status), `:479-485` (nút) | Có | Đạt (`invalid` gồm rỗng, độ dài, khớp) | **Một phần**: `:267-268` không kiểm "khác hiện tại" (chỉ `:274-277` sau bấm). Cùng lỗi với S-C03 | **Một phần**: `:482` `disabled={invalid \|\| busy}`, nhãn "Đang lưu…"; không `aria-busy` | **Đạt**: `:281-284` xoá ba ô → `invalid` true → nút disabled | **Thiếu**: không có guard trên trang cài đặt | **Thiếu (nhẹ)**: có dòng `role="status"` "Đã lưu mật khẩu mới." (`:473-477`). Không phải chip đồng bộ, nhưng trái chữ "không hiện Đã lưu" trong yêu cầu 4 | **Vừa** (điều kiện "khác hiện tại", aria-busy, guard) + **Thấp** (dòng "Đã lưu") | Cùng mẫu S-C03. Quyết định lead: giữ dòng xác nhận mật khẩu (kết quả mạng) hay bỏ theo yêu cầu 4 |
| S-C05 | `/chon-vai-tro` (mọi viewport) | Chọn vai trò (đăng nhập vào vai trò) | `RolePickerPage.tsx:46-57` (choose), `:91` (`disabled={busy}`), `:29-31` (tự chọn khi một vai trò) | Có (`switchMembership`, PUT `/session/membership`) | N/A (không có form) | N/A | **Một phần**: `:91` `disabled={busy}` khoá mọi dòng; không `aria-busy`. `main.tsx` dùng `StrictMode`, effect `:29-31` chạy hai lần khi dev, gọi `switchMembership` hai lần | N/A (điều hướng `:51`) | N/A (không nhập dữ liệu) | Đạt | **Thấp** | Thêm `aria-busy` cho dòng đang chọn; chặn effect tự chọn bằng ref (chỉ chạy một lần) |
| S-C06 | `/cai-dat` (desktop) và `/cai-dat` (mobile) | Đổi vai trò (danh sách vai trò trong cài đặt) | `SettingsPage.tsx:390-405` (desktop), `:394` (`switchMembership`) | Có | N/A | N/A | **Một phần**: `:390` `disabled={busy}`; không `aria-busy` | N/A (điều hướng `:395-400`) | N/A | Đạt | **Thấp** | Cùng mẫu S-C05 |
| S-C07 | `/cai-dat` | Đăng xuất | Mobile `SettingsPage.tsx:139` (signOut); desktop `:292-300` (chặn khi còn lệnh chờ, `:294-299`), nút `:496-498` | Một phần (`logout`) | N/A | N/A | **Thiếu**: nút `:496-498` không có `disabled` khi đang đăng xuất. Không có trạng thái đang xử lý | N/A | N/A (chặn đăng xuất khi có lệnh chờ là đúng spec 5.3, đã có giải thích `:496-498`) | Đạt | **Thấp** | Thêm `loading` cho nút đăng xuất (không đổi logic chặn) |
| S-C08 | `/quen-mat-khau` | Không có hành động lưu (chỉ liên kết về đăng nhập) | `ForgotPasswordPage.tsx:16` | Không | N/A | N/A | N/A | N/A | N/A | N/A | — | Không áp dụng |
| S-C09 | `/ph/*` (phụ huynh) | Không có hành động ghi | `roles/guardian/*.tsx` (không có `save`/`send`/`publish` ngoài đọc báo cáo đã phát hành) | — | N/A | N/A | N/A | N/A | N/A | N/A | — | Không áp dụng (spec: phụ huynh chỉ xem) |
| S-C10 | `/pwa` | Không có hành động lưu | `features/pwa/*.ts(x)` | Không | N/A | N/A | N/A | N/A | N/A | N/A | — | Không áp dụng |

Tổng theo mức (theo hàng hành động): Cao 1 (S-C02) · Vừa 3 (S-C01, S-C03, S-C04) · Thấp 3 (S-C05, S-C06, S-C07). Ngoài ra S-C04 có thêm một mục Thấp về dòng "Đã lưu mật khẩu mới." (xem cột Y4 chip).

## Ghi chú dữ liệu (ngoài ranh giới team C)

- `src/data/auth/index.ts:24-27` (`changePassword`): máy chủ đổi mật khẩu xong, rồi `updateMe(GET /me)`. Nếu bước `GET /me` lỗi, hàm ném lỗi dù mật khẩu đã đổi. UI (`ChangePasswordPage.tsx:38-39`, `SettingsPage.tsx:285-286`) hiện lỗi, người dùng thử lại bằng mật khẩu cũ và bị từ chối. Đây là lỗi trong `src/data/**` (ranh giới lead Data+API). Báo lead, không sửa.

## Đã kiểm, đạt

- Y1 "khi không hợp lệ" đạt ở đổi mật khẩu (cả mobile `ChangePasswordPage.tsx:25` và desktop `SettingsPage.tsx:267-268`): nút disabled khi thiếu ô, dưới 8 ký tự, hoặc không khớp.
- Y3 đạt ở đổi mật khẩu desktop: sau lưu, ô bị xoá nên nút về disabled (`SettingsPage.tsx:281-284`).
- Không có chip "Đã lưu/Đã đồng bộ/Chưa lưu" trên màn C (ngoài dòng status ở S-C04).
- Phụ huynh không có hành động ghi (S-C09).

## Không chắc

1. **Ảnh trạng thái đang lưu và sau lưu:** bộ `save-states/before/C` chỉ có ảnh trạng thái lỗi (`095`, `098`, `105`, và bản 2xx). Không có ảnh đang lưu (mock chậm), ảnh sau lưu, hay ảnh "khác hiện tại". Các nhận định Y2 và Y3 dựa trên mã, chưa đối chiếu bằng ảnh.
2. **Ảnh đăng ký:** `098-register-form-validation-error.png` và `1440x900/123` chưa được đọc riêng trong báo cáo này. Đánh giá S-C02 dựa trên mã (`:46-50`, `:103`).
3. **Đăng nhập "Y4":** tôi xếp N/A vì đăng nhập không tạo dữ liệu. Nếu lead muốn áp Y4 cho mọi form nhập liệu thì S-C01 sẽ có thêm một dòng Thấp.
4. **Mức cho đổi mật khẩu (S-C03) và đăng ký (S-C02):** tôi áp định nghĩa brief ("mất dữ liệu khi rời màn" = Cao) cho đăng ký (năm trường, có tên và SĐT). Đổi mật khẩu là Vừa vì chỉ có ba ô mật khẩu. Lead có thể muốn áp cùng một mức cho cả hai.

Status: DONE_WITH_CONCERNS
Summary: 10 hàng hành động (7 có hành động thật). Cao 1 (đăng ký, Y4), Vừa 3 (đăng nhập Y1, đổi mật khẩu mobile và desktop Y1/Y2/Y4), Thấp 3 (đổi vai trò, đăng xuất, dòng "Đã lưu mật khẩu mới").
Concerns/Blockers: ảnh không có trạng thái đang lưu và sau lưu, nên Y2/Y3 đánh giá từ mã. Lỗi `changePassword` trong `src/data/auth` (đổi xong nhưng báo lỗi) cần lead Data xử lý. Không sửa mã, không commit.
