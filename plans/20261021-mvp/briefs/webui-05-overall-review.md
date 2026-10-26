# webui-05 · Review tổng thể đợt Web UI audit

Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web`. Phạm vi: `git log a11a28d..HEAD` (các commit fix(ui)/test của đợt UI audit). Bối cảnh: `plans/20261021-mvp/web/ui-audit/plan.md`, `fixes-{T,A,B,C}.md`, `design/tokens/README.md`.

## Kiểm
1. Hồi quy hành vi: luồng nghiệp vụ, router, đăng nhập/chọn vai (0/1/≥2 vai), lưu/đồng bộ, lỗi lưu, offline; không đổi chuỗi/nghiệp vụ ngoài phạm vi.
2. CSS: token dùng đúng (không biến chưa định nghĩa, `var()` thiếu fallback ở chỗ cần), z-index chỉ theo thang `--z-*`, mốc 1024, không còn `position: fixed` bị neo theo tổ tiên có transform/filter, safe-area, sticky footer trên tab dưới, không cuộn ngang ở 375/390/1024/1440.
3. Truy cập: vùng bấm ≥ 44 px mobile, focus thấy được, nút disabled đọc được, `aria-*` mới đúng.
4. Test mới có ý nghĩa (không chỉ khẳng định chi tiết cài đặt), không mock sai hợp đồng.
5. Không lộ SĐT thật/secret trong mã, fixture, ảnh (`plans/20261021-mvp/web/shots/ui-audit/**`), log.
Có thể chạy app cục bộ (cổng 5186) và `scripts/ui-audit-capture.mjs` để kiểm bằng mắt.

## Ra
`/Users/phamnhuphong/Git/quanlyhocsinh/plans/20261021-mvp/web/ui-audit/review-ui-r1.md`: bảng `ID | Mức (Chặn/Cao/Vừa/Thấp) | File:dòng | Vấn đề | Bằng chứng | Đề xuất`. Chỉ đọc/chạy, KHÔNG sửa mã, không commit, không in secret/SĐT.

Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: số mục theo mức
```
