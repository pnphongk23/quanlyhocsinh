# Review Codex r1 — UI feedback 24/10

Candidate: mvp-web `2c4a6f36b6d7d7c539e6710300fb53adcba39fc5` (HEAD); prototype/design snapshot hiện tại.
Verdict: CHANGES_REQUIRED

| Mức | F | File:dòng | Mô tả và bằng chứng | Đề xuất sửa |
|---|---|---|---|---|
| Cao (REQUIRED) | F8, hệ trạng thái | `src/features/classes/EditClassModal.tsx:37-40`; `src/features/class-space/AddSessionModal.tsx:70-72`; `src/features/scores/TestScoresPage.tsx:467-470` | Khi lưu thành công, các form gọi `onClose()` ngay sau `action.submit()`. Hook chỉ đặt `justSaved` sau thời gian loading tối thiểu 400 ms; modal/sheet đóng ngay trong continuation đó nên nút `done` bị unmount trước khi có nhịp hiển thị. Prototype có cùng pattern; `savedPeek` chỉ được dùng trong CommentTicketSheet và hai luồng BTVN (kết quả `srcwalk discover 'savedPeek' --as text --scope src/features`). | Chờ 800 ms sau lưu thành công rồi mới đóng các form lưu-đóng, dùng chung helper; xác minh chữ “Đã lưu” được paint trước khi đóng. |
| Cao (REQUIRED) | F1/F4/F7, tokens | `src/features/scores/ScoreGridDesktop.module.css:83-84`; `src/features/scores/scoreColumns.ts:14`; `src/shared/ui/EmptyState.tsx:7-8` | Diff thêm kích thước ngoài token: viền focus `2px`/offset `-2px`, fallback cột `140/280/240/8`, cỡ mascot `96/56`. Quy tắc cấm ghi cứng giá trị màu/cỡ/khoảng cách mới; state contract đã có `--state-focus-ring` và token kích thước tương ứng. Bằng chứng: `git diff --unified=0 f31150e..2c4a6f3 -- ':!src/data/**' | rg '^\+[^+].*(px|#[0-9a-fA-F]{3,8}|rgb\(|font-size)'`. | Dùng token focus ring và bỏ các bản sao số ở component/fallback; chỉ định nghĩa literal trong nguồn token. |

## Kiểm chứng

- Web: `npm run typecheck` pass; `npm test`: 56 file pass, 1 skip; 412 test pass, 1 skip.
- Prototype: `npm run typecheck` pass; `npx vitest run`: 60 file, 573 test pass. Lần đầu Vitest bị EPERM khi ghi file tạm trong `node_modules/.vite-temp`; chạy lại được cấp quyền và pass.
- `git diff --check f31150e..2c4a6f3 -- ':!src/data/**'`: pass.
- Token parity: `design/tokens/{tokens.css,tokens.json,ios-mapping.md}` giống hệt thư mục chính; khối `:root` trong `src/shared/styles/tokens.css` khớp các token đã thêm.
- Đã xem ảnh after F1 sidebar 1280, F4 bảng điểm 1280, F7 empty Nhận xét 390, F9 nhập điểm mobile 390. Không phát hiện mục Chặn khác trong các bằng chứng này.

Kết luận: danh sách Chặn/Cao: hai mục Cao ở trên; review chưa thể kết luận “Không còn Chặn/Cao” cho đến khi có candidate sửa và review lại.

## Bất định

- Prototype/design là working tree có nhiều thay đổi chưa commit, không có hash snapshot riêng; chỉ xét các màn F1–F9 và thành phần trạng thái liên quan.
- Tôi không chạy lại `test:state`, `test:save`, `test:click`; kết quả V cuối đã có trong artifacts của gói.
