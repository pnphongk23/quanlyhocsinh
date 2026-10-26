# iOS-24 · Smoke staging CHỈ ĐỌC: phụ huynh + giáo viên (sau sửa giải mã publication)

Worker: MỘT agent (codex luna high), workspace `wks_835c3a721a27f564`, worktree `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios`, nhánh `mvp-ios` (kiểm `git status` sạch và `git log` có commit iOS-23 sửa `ScoresFeatureStore` trước khi bắt đầu; nếu chưa có → `NEEDS_CONTEXT`). Dùng `srcwalk`. Một build/một simulator iPhone 16 một lúc. KHÔNG sửa mã app, KHÔNG ghi/đổi dữ liệu staging (chỉ đọc). Không in SĐT/mật khẩu/token ở terminal/log/file/ảnh lưu lại/báo cáo.

Đọc: `ios/docs/report-i18.md` (mục 2 và 5: cách build ký ad-hoc, nhập số nội địa 9 chữ số bỏ tiền tố 84, bàn phím che nút "Đăng nhập" ⇒ cuộn/vuốt lên, Maestro `--no-reinstall-driver`), `ios/docs/report-i22.md`, `ios/docs/report-i23.md`.

## Việc
1. Build Staging ký ad-hoc (`CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`, `-derivedDataPath /tmp/qlh-dd-i24`), erase simulator iPhone 16 sạch, cài, mở.
2. Creds: `~/.config/qlh/staging-demo.txt`, mục Giáo viên và mục Phụ huynh. Đọc NGẦM bằng lệnh không in (biến môi trường truyền vào Maestro `-e`). **Khoá tạm 15 phút sau 5 lần sai: đăng nhập mỗi tài khoản TỐI ĐA 2 lần**; nếu 2 lần đều lỗi → dừng, `BLOCKED` kèm chẩn đoán (mã HTTP, không đoán mò, không thử thêm).
3. Phụ huynh: đăng nhập → dashboard tải được (KHÔNG còn "Không tải được dữ liệu của con"); mở tab điểm danh và tab báo cáo (bản tháng mới nhất, publication_count 3 trên staging); nếu có hai con, đổi con; chụp ảnh từng màn (xem rồi xoá hoặc lưu CHỈ nếu không lộ SĐT thật; ảnh bằng chứng đặt ở `ios/docs/screens/i24/` chỉ khi sạch). Đối chiếu số liệu hiển thị (điểm danh, tổng excellent/done/not_done) với GET riêng (curl, token ngầm, không in).
4. Đăng xuất bằng UI, đăng nhập giáo viên: mở màn Điểm (danh sách bài, lưới điểm) và màn Báo cáo tháng (xem trước báo cáo tháng có publication) — xác nhận KHÔNG còn "Không tải được dữ liệu đã lưu"; chụp ảnh như trên. Không nhập điểm, không phát hành, không đổi gì.
5. Dọn: xoá ảnh/artifact chứa SĐT, erase + shutdown simulator, xoá `/tmp/qlh-dd-i24`.
6. `ios/docs/report-i24.md`: từng bước → kết quả (thấy/không thấy lỗi), số liệu đối chiếu, mã HTTP, số lần đăng nhập mỗi tài khoản, điểm chưa làm được + lý do. Commit CHỈ file docs/ảnh sạch: `docs(ios): record read-only staging smoke after publication decode fix`. KHÔNG push/merge/stash/reset.

Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
