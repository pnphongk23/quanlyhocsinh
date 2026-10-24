# Domain Lead · iOS (SwiftUI native)

Đọc trước `briefs/50-lead-common.md` (quy tắc chung, bắt buộc). Mảng của bạn: app iOS `ios/` ở worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios` (workspace `wks_835c3a721a27f564`, nhánh `mvp-ios`; đang có nền: XcodeGen `project.yml`, xanh chính `#2F5BEA`, `Core/Networking` (APIClient protocol + stub), `Core/Storage` (LocalStore protocol), `Features/` thư mục rỗng, `ios/docs/storage-proposal.md`, `ios/README.md`; build Staging xanh). Đặt mọi worker vào workspace này.

## Mục tiêu

Dựng app iOS native đầy đủ MVP theo PROTOTYPE ĐÃ DUYỆT: màn hình, chữ, trạng thái và luồng khớp thiết kế (người dùng đã duyệt prototype/Claude Design). Hai vai trò trong cùng app: giáo viên và phụ huynh (chọn vai trò khi có nhiều membership).

## Nguồn thiết kế (đọc, đường dẫn tuyệt đối trong thư mục chính, chỉ đọc)

- Prototype React (hành vi, màn mobile): `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype/src` (đang được hoàn thiện ở mảng Web; đọc bản hiện có). Chạy được bằng `npm run dev` trong `design/prototype`.
- Ảnh Claude Design đã duyệt: `plans/20261021-mvp/design/auth-r4/` (01 đến 13 là mobile Tài khoản), `design/round-4/` (web desktop, tham khảo nghiệp vụ). Màn mobile giáo viên/phụ huynh (GV · …, PH · …) nằm trong `plans/20261021-mvp/design/source/round-4/Tat ca man hinh.dc.html`: chụp bằng `python3 ~/.claude/skills/claude-design-to-prototype/scripts/shoot_screens.py <html tuyệt đối> <thư mục ra> <targets.json>` (`list_screens.py` liệt kê tên màn). Worker tự chụp những màn cần cho gói của mình, lưu vào `ios/docs/design-ref/` (chỉ ảnh cần thiết).
- Nghiệp vụ: `docs/spec.md`; hợp đồng API: `plans/20261021-mvp/backend/api-spec.md`, `authz-matrix.md`, `offline-plan.md`.

## Gói việc (bạn chia worker, ranh giới file rõ)

1. **I-1 Lõi** (một worker, sở hữu `project.yml`, `Core/*`, design system): `APIClient` thật bằng `URLSession` (Bearer, lỗi theo `api-spec.md`), lưu token trong Keychain, mô hình `Codable` theo spec, kho cục bộ SQLite (theo `ios/docs/storage-proposal.md`) + hàng đợi lệnh idempotent (UUID, `base_version`, đồng bộ theo `api-spec.md` mục 6), design system SwiftUI (màu `#2F5BEA`, kiểu chữ, thành phần chung: nút, ô nhập, chip trạng thái, thẻ, sheet), môi trường Staging/Production qua xcconfig. Trước khi có API thật, client chạy được với `StubAPIClient`/fixtures khớp `api-spec.md`.
2. **I-2 Khung app + Tài khoản**: điều hướng theo vai trò (tab bar giáo viên/phụ huynh), Đăng nhập (+ sai thông tin, khoá tạm), Đăng ký giáo viên, Đổi mật khẩu bắt buộc, Quên mật khẩu, Chọn vai trò, Cài đặt tài khoản (đổi mật khẩu, đổi vai trò, đăng xuất bị chặn khi còn lệnh chờ).
3. **I-3 Giáo viên A**: Lớp (danh sách, tạo/sửa/lưu trữ), Học sinh (thêm kèm SĐT phụ huynh, sửa SĐT, đánh dấu nghỉ, Cấp mật khẩu: mật khẩu tạm hiện một lần), Buổi học + tab Lịch (ngày/tháng, hủy, buổi lẻ), Điểm danh.
4. **I-4 Giáo viên B**: Bài kiểm tra + nhập điểm (điểm tối đa theo bài, mặc định 15, không trung bình), BTVN (giao theo phần, chấm 3 mức), Nhận xét/phiếu buổi học (3 sao + câu mẫu cố định đúng nguyên văn spec mục 4, ghi chú, gửi cả lớp), Báo cáo tháng (xem trước, phát hành, PDF).
5. **I-5 Phụ huynh**: tổng quan, điểm danh theo tháng, điểm, phiếu buổi học, BTVN, báo cáo, chuyển giữa các con.
6. **I-6 Hoàn thiện**: offline UX (chỉ báo khi lỗi, không chip đồng bộ thường trực; chặn đăng xuất khi còn lệnh chờ), push FCM (abstraction `PushRegistrar`; tích hợp Firebase Messaging bằng Swift Package CHỈ khi người dùng đã cung cấp `GoogleService-Info.plist`, chưa có thì no-op và ghi rõ), localization tiếng Việt đầy đủ, icon/launch hiện có.

I-2..I-5 chạy song song sau khi I-1 xong phần giao diện lõi (Core + design system compile được): mỗi worker chỉ thêm file dưới `Features/<nhóm>/` của mình (XcodeGen tự quét thư mục), không sửa `project.yml` và `Core/*` (cần gì ở lõi thì xin I-1/lead). Cùng chạy build thì mỗi worker dùng `-derivedDataPath` RIÊNG (ví dụ `/tmp/qlh-dd-<worker>`) và simulator riêng nếu cần để khỏi giẫm nhau.

## Tiêu chí xong

- `xcodebuild … build` và `xcodebuild … test` (Swift 6, iOS 17+, `CODE_SIGNING_ALLOWED=NO`) xanh; không cảnh báo Swift mới.
- Test đơn vị cho mô hình, hàng đợi/đồng bộ, quy tắc nghiệp vụ trong app (điểm tối đa, sao, buổi hủy không có số, xoá hẳn/lưu trữ bài kiểm tra).
- Chạy trên simulator iPhone, chụp từng màn chính vào `ios/docs/screens/` và đối chiếu với ảnh thiết kế/prototype mobile; ghi bảng khác biệt còn lại.
- Không điểm trung bình, không "Vắng thi", không bài giảng/học phí/lương/nhân sự/mời/OTP; không SĐT/mật khẩu thật, không in token.
- Kết nối API thật chỉ khi staging sẵn sàng (General Lead sẽ báo URL); lúc đó đổi `API_BASE_URL` Staging và chạy một lượt thử đăng nhập thật.
- Một review tổng thể (codex ≤ 2 vòng) trước DONE.
