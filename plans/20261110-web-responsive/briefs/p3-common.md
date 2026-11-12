# Pha 3 · phần chung (QL-004)

Đọc: `briefs/p2-common.md` (luật, cấm, kiểm chứng, handback vẫn áp dụng), `plan.md` mục 3–5 + "Chủ duyệt mock", `design/ux-v2/rules.md`, mock `design/responsive-mock/index.html` (ảnh: `/tmp/qlh-evidence/ql-004/mock/compare/`), mã khung `src/shared/layout/**`, component `src/shared/ui/**`, gate `src/test/layoutGate.test.ts`, `src/test/layoutAllowlist.ts`, `scripts/layout-gate.mjs`.

Đích: màn của luồng khớp mock đã duyệt ở 390/834/1440, đi qua mẫu trang trong `src/shared/layout`, không còn `@media` bề rộng / `useIsDesktop` / giá trị ghi cứng trong file của luồng.

Luật Pha 3:
- Màn chỉ chọn mẫu trang (PageShell/FormPage/MasterDetailPage) và truyền slot; khác biệt theo khổ chỉ ở layout (hoặc `useLayout()` cho HÀNH VI, ví dụ placement sheet / push vs sheet). Thiếu khả năng ở mẫu trang thì thêm vào `src/shared/layout/**` (có test), không vá trong màn.
- Không đổi nghiệp vụ, dữ liệu, API, nhãn chữ (trừ chỗ mock đã duyệt đổi). Test hành vi hiện có phải vẫn xanh; test kiểm CSS cũ được chuyển sang hợp đồng mới, không xoá/nới.
- Allowlist: gỡ mọi mục của file đã chuyển khỏi `layoutAllowlist.ts` (media, responsiveHook, hardcoded, routeTemplate). Chỉ sửa dòng của file mình.
- G2: `npm run test:layout` → các dòng route của luồng mình phải 0 vi phạm ở cả 3 khổ, mọi trạng thái. Không sửa luật đo để cho xanh; nghĩ luật đo sai thì BLOCKED kèm bằng chứng (ảnh + số đo) cho TL.
- Thêm `data-measure` (`title`, `content`, `block`, `row`, `status`, `detail`) theo plan mục 4 khi cần để gate đo đúng.
- Ảnh tự soi: `/tmp/qlh-evidence/ql-004/p3/<packet>/` (viewport, 3 khổ, gồm trạng thái sheet mở), nén trước khi xem, so với mock.
- Giữ hành vi (bắt buộc, gate hình học không thấy được): trước khi sửa, liệt kê hành vi hiện có của màn; sau khi sửa, thao tác thật bằng Playwright local từng mục và có test, ghi đạt/không vào handback:
  - lưu thành công / lưu lỗi: lỗi thì không rời màn, nháp còn, hộp "Chưa lưu thay đổi" chờ kết quả lưu thật;
  - nháp chưa lưu không mất khi đổi khổ 390↔834↔1440 hay chuyển tab: không chọn cây component khác nhau theo khổ cho phần có trạng thái;
  - tải lại: kéo-để-tải-lại gắn đúng vùng cuộn, desktop có nút "Tải lại" (architecture.md mục đồng bộ);
  - đang tải / lỗi (có thử lại) / offline / không có dữ liệu là 4 trạng thái khác nhau; chỉ hiện "không tìm thấy" sau khi tải thành công;
  - sheet/dialog: dùng Sheet/native dialog có sẵn (focus vào, giữ focus, nền inert, Escape, trả focus);
  - menu "…" trong bảng/vùng cuộn: mở ở hàng cuối không bị cắt.
- Nghiệm thu mỗi packet: `npm test` 0 fail, `npm run build` 0 fail, G2 dòng của luồng 0 vi phạm, `grep -nE "@media[^{]*(min|max)-width|useIsDesktop" <file của luồng>` rỗng.
- Commit conventional tiếng Anh, không nhắc AI, không push. Tối đa ~2 giờ; kẹt 3 lần cùng lỗi → BLOCKED.
