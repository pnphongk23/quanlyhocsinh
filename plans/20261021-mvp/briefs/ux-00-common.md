# Chung cho worker UX v2 (lead `c906ed27`)

- Thư mục: `/Users/phamnhuphong/Git/quanlyhocsinh/design/prototype` (cây làm việc chung, nhiều người đang sửa). KHÔNG commit, KHÔNG `git checkout/reset/stash/restore`, không xoá file ngoài phạm vi.
- Đọc trước: `AGENTS.md`, `design/ux-v2/rules.md`, `design/ux-v2/audit.md` (ảnh `design/prototype-shots/ux-v2/before/`). Spec `docs/spec.md` thắng khi lệch; không đổi nghiệp vụ, dữ liệu, repository, chuỗi chữ ngoài phạm vi.
- CHỈ sửa file trong "Phạm vi file" của brief. Cần sửa file khác: dừng, ghi vào báo cáo, không tự sửa. `Mascot.tsx` thuộc lead Mascot: không sửa. Giữ Mít ở đúng chỗ hiện có.
- CSS thuần, không thêm thư viện. Mọi chuyển động dùng token `--dur-*`/`--ease-*` và tắt theo `prefers-reduced-motion`.
- Kiểm: `npm test` (baseline 540 xanh) + `npm run build` xanh. Sửa test chỉ khi test đang khẳng định hành vi cũ đã được đổi có chủ đích theo brief; ghi rõ.
- Ảnh sau: chạy dev server cổng riêng (ghi trong brief), chụp bằng Playwright Python (`python3 -I`), điều hướng trong SPA: mở `/chon-vai-tro`, bấm "Giáo viên"/"Phụ huynh", rồi `history.pushState` + `PopStateEvent` (tải lại trang sẽ reset vai trò). Tham khảo `/tmp/ux-shots/shoot.py`. Lưu ảnh vào thư mục brief chỉ định. Tắt dev server khi xong.
- Không in SĐT thật/mật khẩu. Báo cáo cuối: file `<brief>.report.md` cạnh brief: thay đổi theo file, lệnh kiểm + kết quả, ảnh, việc còn lại; mục "Cho web/iOS" liệt kê quy tắc/chi tiết cần làm theo. Kết thúc: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT` + 2 câu.
