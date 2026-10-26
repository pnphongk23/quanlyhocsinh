# Review hẹp — Durable wave

Candidate: `mvp-web` HEAD `755cf8b2fca5171ca3c0c7e223920f4349939198`; chỉ xét lane UI được nêu, loại `src/data/**` và commit lane Data.

| Mức | F liên quan | File:dòng | Mô tả | Bằng chứng | Đề xuất sửa |
|---|---|---|---|---|---|
| Cao (REQUIRED) | F8 · chấm BTVN trên panel | `src/features/homework/HomeworkPanel.tsx:356-402` | Các nút chấm đọc `level` trực tiếp từ `row.grades`; handler gọi `act(() => setHomeworkGradeDurable(...))`. Khi ghi bền lỗi, `act` chỉ giữ thông báo lỗi (`:177-187`), không giữ lựa chọn trong state cục bộ. Theo hợp đồng Durable, lỗi ghi hoàn trạng thái bộ nhớ; lần render sau lựa chọn vừa bấm mất. Bài kiểm tra mới `gradeError.test.tsx` chỉ kiểm `HomeworkDesktop`, không kiểm panel này. | `srcwalk show` các dòng trên; hợp đồng `impl-da6-report.md` mục “Bổ sung: biến thể …Durable” (ghi lỗi hoàn bộ nhớ); test `gradeError.test.tsx:28-60`. | Giữ lựa chọn chấm trong draft cục bộ tới khi lưu thành công, hoặc dùng luồng `useSaveAction`; khi lỗi vẫn hiển thị mức vừa chọn và báo lỗi để thử lại. |
| Trung bình | Thao tác xoá bài tập/bài kiểm tra | `src/features/homework/HomeworkDesktop.tsx:652-658`; `src/features/scores/TestsDesktop.tsx:118-122`; `src/features/scores/TestScoresPage.tsx:222-226` | Khi ghi bền thao tác xoá lỗi, các catch đóng hộp xác nhận rồi báo lỗi ở ngoài. Bản ghi còn nguyên và có thể mở hộp lại để thử, nhưng không đáp ứng nghiêm yêu cầu giữ hộp thoại. | Trích mã các catch; hợp đồng Durable yêu cầu lỗi được đưa về UI. | Nếu áp dụng yêu cầu giữ hộp cho cả xác nhận xoá, giữ hộp mở và hiển thị lỗi tại đó. |

Đã rà: các callsite production đổi sang `…Durable`; chỗ được gọi qua `useSaveAction` hoặc handler async đều chờ Promise. `TicketEditor` gọi `void persist` nhưng `persist` tự await và catch lỗi để hiển thị `role="alert"`, giữ state sao/ghi chú. Không thấy literal màu/cỡ/khoảng cách mới trong phần thêm của diff UI (quét regex trên `src/features`, `src/app`, `src/roles/staff`). Root `/` redirect theo chưa đăng nhập / vai đơn / nhiều vai và vai đang chọn; test `rootRedirect.test.tsx` 6/6, artifact `durable-wave-results.md:18-20` không phát hiện nháy. Bỏ vá `StaffShell` vẫn giữ lớp: `routes.test.tsx` hydrate từ IndexedDB sau khi chọn lớp và xác nhận picker, 59/59 pass độc lập. Test double-click điểm danh `saveStatesDesktop.test.tsx` pass độc lập.

Kiểm tra: `npm run typecheck` đạt. Lần `npm test` toàn suite: 5 file lỗi, 9 test fail / 462 pass / 4 skip (đa số timeout; một test gửi phiếu chờ nút hết busy). Chạy riêng các suite liên quan: `durableErrors` 11/11, `gradeError` 2/2, `routes` 59/59, `saveStatesDesktop` 9/9, `rootRedirect` 6/6. Full suite chưa xanh; kết quả riêng cho thấy các lỗi song song có thể do tải, chưa xác nhận nguyên nhân.

Kết luận: còn mục Cao F8 nêu trên; không ghi “Không còn Chặn/Cao”.

## Xác nhận sau sửa (9da9626)

Candidate source `9da962618cb92e667fefb800e233b48d2f97321c`; HEAD tại lúc kiểm tra là `81abd0a`, chỉ thêm/cập nhật scripts ngoài `src` (`git diff 9da9626..HEAD -- src` rỗng).

Mục Cao đã đóng: `HomeworkPanel` lưu mức chấm lỗi trong `failedGrades`, hiện chip “Chưa lưu” và giữ lựa chọn khi thử lại; bulk retry cũng giữ các mức cho tới khi thành công (`HomeworkPanel.tsx:177-213,373-445`, test `panelGradeError.test.tsx`). Các hộp xoá ở HomeworkDesktop, TestsDesktop và TestScoresPage giữ mở, hiển thị lỗi trong hộp; TestsDesktop ẩn banner nền khi hộp xoá đang mở.

Không thấy Chặn/Cao mới ở `useSaveAction`: layout effect hủy RAF khi cleanup; fallback 200 ms luôn resolve mốc khi frame chưa chạy; continuation chỉ cập nhật state khi `mounted.current`, còn timer “Đã lưu” được clear khi unmount (`useSaveAction.ts:71-92,120-158`). Với unmount trước frame, fallback hữu hạn giải phóng Promise, không để RAF/timer treo vô hạn. Giới hạn test mới (async wait 5 s, `vi.waitFor` 10 s, test timeout 20 s) chỉ kéo dài thời gian báo fail; điều kiện kiểm tra không bị bỏ qua. Các test timing dùng fake timers tiếp tục khóa mốc 400 ms/1,6 s.

Kiểm tra: `npm run typecheck` đạt; `npx vitest run` đạt — 66 file passed, 2 skipped; 473 tests passed, 4 skipped.

Kết luận: Không còn Chặn/Cao.
