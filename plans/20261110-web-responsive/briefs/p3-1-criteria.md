# Packet P3-1 · Bộ tiêu chí nhận xét (mẫu MasterDetailPage)

Đọc trước `briefs/p3-common.md`. Làm trước P3-2/P3-3: đây là màn chuẩn mẫu, cách làm ở đây được ghi vào lessons.md.

Màn mock: `criteria`, `criteria-editing`, `criteria-empty`, `criteria-long`.

## Write-set
- `src/features/comments/CriteriaSetSettingsPage.tsx`, `criteriaSetSettings.module.css`, `CustomCriteriaFields*` nếu editor cần, test của chúng.
- `src/shared/layout/**` nếu MasterDetailPage/PageShell thiếu khả năng (kèm test).
- `src/test/layoutAllowlist.ts` (dòng của các file trên).

## Yêu cầu (theo mock đã duyệt)
- PageShell: breadcrumb "Cài đặt / Bộ tiêu chí nhận xét" (desktop/tablet), mobile nút quay lại `backTo="/cai-dat"`; tiêu đề + mô tả; nút "Thêm tiêu chí" cùng hàng tiêu đề (desktop/tablet), mobile theo mock.
- MasterDetailPage: master = bảng/danh sách tiêu chí, cột chỉ "Mặc định: <mức>"; detail = editor. Desktop 2 cột panel sticky; tablet sheet phải full-height (scrim phủ rail); mobile sheet đáy trên tab bar. Bỏ mọi căn giữa `margin-inline:auto`/`min(100%, --form-max)` của `.listPanel`.
- Sắp xếp: tay kéo + menu "…" có "Lên"/"Xuống" (thay 2 nút mũi tên nhỏ đang dưới 44px). Vùng bấm 44 (36 chỉ `pointer:fine`). Giữ hành vi sắp xếp hiện có + a11y nhãn.
- Footer editor: Huỷ/Lưu nằm ngang, căn phải, rộng theo nội dung ở tablet/desktop; mobile ghim đáy sheet, nền đặc, safe-area. (Ảnh gộp Pha 2 tablet đang xếp dọc và quá nhỏ.)
- EmptyState căn giữa trong khối, không kéo giãn. Tên dài xuống dòng, không tràn. Quy tắc tối đa 1 tiêu chí BTVN giữ nguyên.
- Bỏ `useIsDesktop`/so khổ trong màn; dùng `useLayout()` chỉ cho placement.

## Nghiệm thu
Theo p3-common; G2 `/cai-dat/bo-tieu-chi` 5 trạng thái × 3 khổ = 0 vi phạm. Ảnh `/tmp/qlh-evidence/ql-004/p3/criteria/`.
