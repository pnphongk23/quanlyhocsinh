# iOS I-1 · Lõi (Core + design system)

Bạn là worker. Làm việc trong worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (nhánh `mvp-ios`), thư mục `ios/`. Dùng `srcwalk` thay `rg/grep/cat`. Không push, không merge, không đụng thư mục chính `/Users/phamnhuphong/Git/quanlyhocsinh` (chỉ đọc).

## Đọc trước
- `/Users/phamnhuphong/Git/quanlyhocsinh/AGENTS.md`, `docs/spec.md`, `docs/architecture.md`
- `/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/backend/api-spec.md` (hợp đồng API, mục 6 đồng bộ), `authz-matrix.md`, `offline-plan.md`, `data-model.md`
- `ios/docs/storage-proposal.md`, `ios/README.md`, `ios/QuanLyLop/Core/*`
- Prototype để lấy token giao diện: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src/shared` (màu, chữ, thành phần)

## Việc
1. `APIClient` thật bằng `URLSession` (async/await): Bearer token, ánh xạ lỗi theo `api-spec.md`, `base_version`/idempotency theo spec. Giữ `StubAPIClient` chạy bằng fixtures khớp spec (fixture không chứa SĐT/mật khẩu/nhận xét thật).
2. Token lưu trong Keychain (protocol + cài đặt thật + bản in-memory cho test). Không in token ra log.
3. Mô hình `Codable` cho các thực thể MVP theo `api-spec.md`/`data-model.md` (lớp, học sinh, buổi học, điểm danh 4 trạng thái, bài kiểm tra có `maxScore` mặc định 15, điểm, nhận xét/phiếu 3 mức sao, BTVN 3 mức, báo cáo tháng, membership/vai trò, phiên). Không có điểm trung bình, không "Vắng thi". Quy tắc: buổi hủy không có `sessionNumber`.
4. Kho cục bộ SQLite (module `SQLite3`, theo storage-proposal) cài `LocalStore` + hàng đợi lệnh idempotent (UUID, `base_version`, transaction gộp bản ghi + lệnh chờ, đồng bộ push/pull theo `api-spec.md` mục 6). Chặn đăng xuất khi còn lệnh chờ: cung cấp API `pendingCommandCount`.
5. Design system SwiftUI trong `Core/DesignSystem/`: màu chính `#2F5BEA`, kiểu chữ, nút, ô nhập, chip trạng thái (điểm danh/BTVN), thẻ, sheet, trạng thái rỗng/lỗi. Có bản xem trước (#Preview).
6. Môi trường Staging/Production qua xcconfig (đã có), `PushRegistrar` protocol + no-op (chưa Firebase).
7. Test đơn vị (target `QuanLyLopTests` trong `project.yml`): mã hoá/giải mã mô hình, hàng đợi (idempotent, thứ tự, retry), đồng bộ với stub, quy tắc buổi hủy/điểm tối đa.

## File được sửa
`ios/project.yml`, `ios/Config/*`, `ios/QuanLyLop/Core/**`, `ios/QuanLyLopTests/**`, `ios/README.md` (phần cấu trúc). KHÔNG sửa `Features/**`, `App/**` ngoài mức tối thiểu để compile.

## Tiêu chí xong
- `xcodegen generate` rồi `xcodebuild -scheme QuanLyLop -configuration Staging -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath /tmp/qlh-dd-i1 CODE_SIGNING_ALLOWED=NO build test` xanh, Swift 6, không cảnh báo mới.
- Core + design system compile được, đủ để I-2..I-5 chỉ thêm file dưới `Features/<nhóm>/`.
- Ghi `ios/docs/core-api.md` ngắn: các kiểu/protocol công khai để worker khác dùng.
- Commit trên nhánh `mvp-ios` (tiếng Anh, conventional, không nhắc AI), gói nhỏ rõ ràng. Có thể commit design system trước (mốc 1: Core + design system compile) rồi phần còn lại; nhắn lead ngay khi mốc 1 xong.

## Ràng buộc
- Spec mâu thuẫn/chưa rõ: ghi "Câu hỏi" ở báo cáo, không tự đoán. Chỉ tính năng MVP.
- Không SĐT/mật khẩu/token thật, không log nội dung nhận xét.
- Kết thúc: báo cáo ngắn `ios/docs/report-i1.md` (đã làm, lệnh + kết quả, câu hỏi) rồi `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.

## Quy tắc UI (bắt buộc, bổ sung)

Đọc `plans/20261021-mvp/briefs/ios-ui-rule.md` và làm đúng. Design system (màu, chữ, nút, ô nhập, chip, thẻ, sheet, trạng thái rỗng/lỗi) PHẢI suy ra từ `design/prototype/src/shared/styles/tokens.css`, `src/shared/ui` và CSS Modules tương ứng (số đo, bán kính, bóng, cỡ chữ, màu từng trạng thái), không từ ảnh hay phỏng đoán. Nếu phần đã làm chưa dựa trên prototype thì làm lại. Báo cáo kèm bảng token prototype → Swift (tên token, giá trị) và ảnh `#Preview`/simulator so với prototype cho từng thành phần.
