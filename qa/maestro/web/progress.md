# Tiến độ QA web · 2026-10-25

## A · RPT-020 / PRM-004 / PRM-005 · 2026-10-25 12:58 ICT

- Đọc brief chung; dung lượng còn 2.5 GiB. Không chạy đăng ký phụ huynh và không gọi API: các `staging-smoke*.txt` hiện có chỉ cung cấp giáo viên ở workspace khác, không có thông tin giáo viên cho `smoke-qa-prm`. Vì không thể xác minh fixture thuộc workspace được yêu cầu, RPT-020 và PRM-004/005 bị chặn; không dùng demo, không thay đổi dữ liệu. Không có đăng ký PH nào tiêu thụ quota.

- Đã đọc brief web/chung, qa/README.md, toàn bộ 11 testcase, open-questions.md, spec mục 8 và tham chiếu UI automation.
- 155 testcase thuộc nền tảng Web/Cả hai; 70 P0. `status.tsv`: 25 P0 pass, 3 P0 fail, 42 P0 chặn/thủ công, 0 P0 chưa phân loại. P1 tổng 62: 4 pass, 54 chặn/thủ công, 4 chờ chạy lại sau sửa flow selector; P2 chưa phân loại. TC-CLS-017 tự động-pass sau deploy.
- Maestro 2.2.0 mở URL staging và assert chữ được; `takeScreenshot` trả PNG 1×1. Probe chọn/nhập của Maestro treo nên web flow dùng Playwright/Node fallback theo brief. Giới hạn đã ghi trong `README.md`.
- P0 pass: TC-AUTH-001/002/003/007/008/019; TC-ATT-003/010; TC-CLS-001/006/009/015/016; TC-HW-001; TC-PRM-003/006; TC-STU-001; TC-TST-001/003/004/005/008/009; TC-OFF-003. Từng flow có chi tiết và JUnit trong thư mục kết quả.
- TC-STU-001 pass sau khi kiểm tra ba biến thể theo lead: bỏ trống SĐT phụ huynh, SĐT 10 số có số 0 đầu, và tên ngắn chỉ chữ. Cả ba lưu thành công; WEB-001 đã gỡ. Đối chiếu read-only `mvp-backend/worker/src/db/students.ts` cho thấy `parent_phone` không bắt buộc; `lib/phone.ts` chấp nhận `0` + 9 chữ số và chuẩn hoá sang `+84`.
- Workspace được tạo theo brief: `smoke-qa-prm` (đã ghi vào mục Workspace QA trong `qa/README.md`). Tài khoản bootstrap dùng fixture ngẫu nhiên trong tiến trình, không lưu credentials.
- TC-CLS-006 và TC-CLS-009 pass với buổi lẻ tương lai trong lớp QA. TC-CLS-007 có flow nhưng hiện bị chặn ở thao tác menu hủy.
- TC-CMT-012 theo cập nhật lead: kỳ vọng nút gửi bị khoá khi offline; đã thử fallback buổi hôm qua nhưng không dựng được fixture (xem cập nhật cuối).
- TC-AUTH-003 selector đã đổi sang `getByRole('alert')`, khớp DOM `LoginPage` (`role="alert"`); chạy lại một submit sai và pass.
- Flow assertion viết cho TC-CMT-012, TC-RPT-008, TC-RPT-017 và TC-OFF-008 trong `offline-contracts.mjs`; đều tự động-chưa-chạy. TC-RPT-013 vẫn thủ công do hộp thoại tải PDF của hệ điều hành; không kiểm ảnh/PDF bằng ảnh chụp màn hình.
- TC-CLS-016 và TC-ATT-003 pass trong cùng một lượt Chromium headless: chuyển tab Điểm danh của buổi tương lai, không có nút Lưu điểm danh, trạng thái bị khoá, hint chỉ xem/hủy và menu có Hủy buổi. JUnit: `class-future-session-junit.xml`. Không tạo ảnh lỗi.
- TC-AUTH-008 pass với tài khoản phụ huynh/số giả phát sinh trong lượt: đăng ký thành công và trang `/ph` hiện “Chưa có con nào được liên kết”. Lượt đầu selector nhắm role button thay vì role tab; đã sửa theo `Segmented` của web và chạy lại pass. JUnit: `guardian-no-student-junit.xml`.
- TC-PRM-003 pass: tài khoản phụ huynh QA được tạo trong flow, mở trực tiếp URL chi tiết lớp giáo viên rồi bị điều hướng khỏi `/lop/`; không hiện điều hướng Mục của lớp. JUnit: `guardian-teacher-denied-junit.xml`.
- TC-AUTH-007 pass: giáo viên thêm học sinh vào lớp QA với số phụ huynh giả 10 chữ số bắt đầu bằng 0; đăng ký phụ huynh cùng số trên context thứ hai trong một Chromium; tên học sinh hiện ở nội dung trang phụ huynh. Hai lượt ban đầu chỉ phơi ra số test thiếu số 0 đầu và locator trùng tên; không ghi bug app. JUnit: `guardian-links-student-junit.xml`.
- TC-HW-001 pass: tạo lớp T2 QA, thêm buổi lẻ hôm nay, mở Bài tập về nhà → Bài tập hôm nay, lưu phần Luyện từ vựng; không có input tệp. JUnit: `homework-today-junit.xml`.
- WEB-002 ban đầu được xác nhận qua 4 lần tạo lớp chỉ chọn CN và probe riêng; API trả `validation_error`. Sau deploy, TC-CLS-017 pass với profile/context mới; kết quả và JUnit được ghi ở cập nhật ngày 2026-10-25.
- TC-AUTH-009 bị chặn trước bước kiểm tra vì staging từ chối đăng ký tài khoản tiếp theo do giới hạn thử quá nhiều; chưa kết luận lỗi liên kết. Không tạo thêm parent account trong các lượt tiếp theo.
- TC-ATT-001/002 fail xác nhận là lỗi app, không phải selector: JUnit ghi locator đã resolve nút Có mặt nhưng nút disabled (aria-pressed=true); ảnh cũng hiện hint chỉ xem/hủy cho buổi địa phương 25/10 khi UTC còn 24/10. JUnit `attendance-four-states-junit.xml`, ảnh `attendance-four-states-failure.png`, bug WEB-003.
- Trước mọi lượt chạy tiếp theo kiểm tra lại dung lượng theo ngưỡng lead 1,5 GiB; các P0 chưa chạy/chặn được liệt kê trong `status.tsv`.
- 2026-10-25: nhóm điểm kiểm tra pass TC-TST-001 (điểm tối đa mặc định 15) và TC-TST-009 (xác nhận xoá hẳn bài chưa có điểm, bài biến mất). Flow `scores-create-delete.mjs`, JUnit `scores-create-delete-junit.xml`; ảnh tạm của lượt locator lỗi đã dọn. Lượt chạy cuối dùng một Chromium headless; còn 6,8 GiB sau chạy.
- 2026-10-25: mở rộng lượt buổi tương lai để xác minh ba tab ngang hàng; TC-ATT-010 pass cùng TC-CLS-016 và TC-ATT-003. JUnit `class-future-session-junit.xml`; không phát sinh ảnh lỗi.
- 2026-10-25: lead báo bundle WEB-002 mới đã lên staging. Chromium chạy với profile/context mới và chặn service worker; TC-CLS-017 pass, lớp CN tạo thành công và trang Buổi học hiện buổi Chủ Nhật lúc 18:00. JUnit `sunday-class-validation-junit.xml`; `qa/bugs.md` WEB-002 chuyển Đã sửa trên staging. Lượt đầu sau deploy chỉ sai locator (buổi nằm ở thẻ Buổi hiện tại); đã sửa assertion và chạy lại pass.
- 2026-10-25: TC-CLS-007 flow được viết với lớp smoke mới, buổi lặp và hai buổi lẻ. Năm lượt dừng ở menu thao tác của buổi: menu được mở nhưng mục hủy không được locator; chưa xác định lỗi UI hay trạng thái menu. Đã đánh dấu chặn, không ghi bug; JUnit `class-cancel-renumber-junit.xml`, ảnh locator tạm đã dọn.
- 2026-10-25: TC-TST-015 flow đã thử trên lớp smoke. Lớp không có học sinh; thêm một học sinh qua UI nhưng bảng điểm vẫn không có ô nhập để vào bước offline sau ba lượt. Đã dừng theo ngưỡng brief, đánh dấu chặn, chưa kết luận lỗi app; JUnit `scores-offline-sync-junit.xml`.
- 2026-10-25: TC-AUTH-019 pass trên Chromium headless: Cài đặt → Đăng xuất đưa về Đăng nhập; mở lại `/lop` vẫn chuyển về Đăng nhập. JUnit `auth-logout-junit.xml`; screenshot tạm của lần đầu có regex URL quá chặt đã dọn.
- 2026-10-25: TC-OFF-003 pass: lớp QA không cần roster; mở dialog tạo bài kiểm tra, chuyển Chromium offline, tạo bài và xác nhận bài còn trong danh sách. Sau khi nối mạng, POST /sync/push thành công và bài vẫn hiện. Flow offline-test-create.mjs; JUnit offline-test-create-junit.xml; ảnh lỗi từ các lượt định tuyến đã dọn.
- 2026-10-25: TC-CMT-012 chưa tới bước kiểm nút gửi offline. Lượt đầu mở buổi ngày 26/10; lượt sau chọn buổi ngày 25/10. Kiểm tra online xác nhận sao đánh giá đã disabled trước khi ngắt mạng, nên fixture không cho sửa nhận xét; khả năng liên quan lệch ngày WEB-003 đang mở. Đánh dấu chặn thay vì lỗi CMT; JUnit ghi skipped, ảnh cuối comments-offline-send-failure.png.

## Chẩn đoán mở chi tiết bài kiểm tra · 2026-10-25

- Ưu tiên WEB-005: hai lượt Chromium headless context mới, `serviceWorkers: block`, đều xác nhận bundle `index-Cp4GJ8XB.js`. Bài vừa tạo từ giao diện mở được cả hai lần; không thấy “Không thể mở màn hình” hoặc trang trắng. JSON/JUnit: `test-detail-open-triage-d8edba.*` và `test-detail-open-triage-d20280.*` trong `plans/20261021-mvp/qa/runs/2026-10-25/web/`; diagnostics không ghi console error, page error, HTTP error hay request thất bại. Không tái hiện WEB-005, chưa mở bug và không chụp ảnh lỗi.
- Bài cũ: đã rà 29 lớp QA qua giao diện nhưng không tìm được fixture bài `Score-Step`/legacy; ghi `fixture-not-found`, không coi là lỗi app. Bài lưu trữ: kiểm tra tab danh sách bài kiểm tra của lớp QA, UI không có link/nút lưu trữ hiển thị (0 control; 4 link bài QA đang hoạt động), nên không có bài lưu trữ để mở qua UI.
- Flow chẩn đoán riêng: `qa/maestro/web/test-detail-open-triage.mjs`; probe UI lưu trữ: `qa/maestro/web/archive-list-ui-probe.mjs`. Không giữ profile Chromium; không có ảnh tạm cần dọn. TC-TST-001 được cập nhật pass theo spec mới; tiếp tục các flow TST còn lại.
- Nhóm điểm: TC-TST-002/003 pass trên bundle hiện tại sau khi flow tự dựng lớp và 4 học sinh QA qua UI. Đã xác nhận biên 0..1000, bước 0,5, từ chối các giá trị ngoài biên/sai bước, lưu 0/1000/0,5 và 12,5/0/15 qua tải lại; JUnit `scores-step-validation-junit.xml`, không có ảnh lỗi.
- TC-TST-008 pass trên bundle hiện tại: tạo fixture lớp + 2 học sinh qua UI; điểm 20 và 100 lưu được, còn sau tải lại, bảng không hiện `/15`. JUnit `scores-max-ceiling-junit.xml`; không có ảnh lỗi.
- TC-TST-007 pass sau khi sửa selector của flow: chi tiết bài giữ nguyên, nên tên mới được kiểm bằng nội dung trong `main` thay vì tìm link ở danh sách; mã web cho thấy trang chi tiết tiếp tục hiển thị tên bài trong card. Điểm 15 còn nguyên sau sửa tên/ngày và không có `/15`. JUnit `scores-edit-preserve-junit.xml`; lần đầu chỉ fail do selector link sai, không phải lỗi app.
- TC-TST-018 pass trên bundle mới: xác nhận huỷ không đổi điểm; xác nhận lần nữa ghi đè mọi em đang hiện thành 15; học sinh đã đánh dấu nghỉ không xuất hiện trong bảng; tải lại vẫn 15. Lần chạy đầu dùng nhãn xác nhận sai; đọc `ConfirmDialog` cho thấy nhãn thật “Gán 15 điểm”, sửa flow và chạy lại pass. JUnit `scores-default-assignment-junit.xml`; không có bug app.
- TC-TST-019 pass trên bundle mới: gán điểm lúc offline, nhãn “Đã lưu trên máy · sẽ đồng bộ khi có mạng” xuất hiện ở trạng thái đang hiển thị, reconnect nhận POST `/sync/push` 2xx, tải lại vẫn thấy điểm 15. Hai lượt đầu chỉ vấp locator nhãn responsive ẩn/hiện; đã giới hạn selector vào status đang hiển thị, không phải lỗi app. JUnit `scores-default-assignment-offline-junit.xml`; tiếp tục kiểm báo cáo cũ và CLS-004.
- TC-CLS-004 phần lưu trữ + điểm: trên bundle hiện tại, lớp đã lưu trữ không còn trong danh sách hoạt động; buổi giữ trạng thái Có mặt. Bài kiểm tra vẫn hiện trong lớp lưu trữ với `1/1 em` có điểm, nhưng khi mở URL chi tiết ứng dụng quay về danh sách bài kiểm tra nên không đọc được chính xác giá trị 20 sau lưu trữ. JUnit `p1-class-edit-archive-junit.xml` ghi một phần/skipped cho xác minh giá trị; ảnh cuối `p1-class-edit-archive-failure.png` cho thấy test row còn lại. Chưa đủ bằng chứng lỗi app.
- Báo cáo cũ có điểm tối đa: chưa mở được vì fixture legacy không có trong lớp smoke mà UI liệt kê; 29 lớp QA đã kiểm tra không có bài `Score-Step`/`Max-Ceiling` để mở lại. Không ghi nhận pass/fail về `/max` trên báo cáo cũ; cần fixture report cũ để hoàn tất ca này. Các bài mới trên bundle brief 89 không có hậu tố `/15` trong TC-TST-008.
- Tổng nhóm đã chạy sau xác nhận bundle: TC-TST-001/002/003/007/008/018/019 đều pass; WEB-005 không tái hiện ở bài mới (hai lần). WEB-005 không được thêm vào `qa/bugs.md`; chưa có lỗi app mới xác nhận.
- 2026-10-25: phân loại TC-ATT-001/002: không phải selector; JUnit locator resolve nút Có mặt nhưng DOM disabled, ảnh hiện hint chỉ xem/hủy; lỗi WEB-003 xác nhận.
- 2026-10-25: hạn mức đăng ký phụ huynh mở lại, TC-AUTH-009 chạy tới bước tải lại trang phụ huynh sau khi giáo viên lưu số khớp; trang báo “Bạn không có quyền thực hiện thao tác này”. Đánh dấu lỗi web WEB-004, JUnit guardian-late-link-junit.xml.
- 2026-10-25: nhóm điểm số pass TC-TST-003: các điểm 12,5 / 0 / 15 lưu và còn sau khi tải lại; 12,3 / 16 / -1 hiện lỗi phạm vi/bước. Lượt đầu lưu thành công nhưng assertion sai dấu phẩy thập phân; đã chuẩn hoá rồi chạy lại pass. JUnit scores-step-validation-junit.xml.
- 2026-10-25: nhóm điểm số không phụ thuộc buổi học pass TC-TST-004/005 trên lớp fixture QA: ô điểm mới để trống, hiển thị “Chưa có điểm”, không có lựa chọn “Vắng thi” và không thấy điểm trung bình trong bảng. Flow `scores-blank-average.mjs`; JUnit `scores-blank-average-junit.xml`; Chromium headless, không phát sinh ảnh lỗi.
- 2026-10-25: TC-TST-008 pass: khi điểm cao nhất là 15, hạ thang xuống 14 bị từ chối; thang 16 lưu được và sau đó hạ về đúng 15 lưu được. JUnit `scores-max-ceiling-junit.xml`; ảnh tạm của lượt flow đầu đã xoá sau khi điều chỉnh thứ tự cập nhật fixture và xác nhận pass.
- 2026-10-25: thử fallback TC-CMT-012 bằng buổi hôm qua theo lead. Fixture lớp QA không có buổi lịch sử; khi chọn ngày hôm qua, nút “Lưu buổi học” bị khoá nên không tạo được fixture để kiểm tra nút gửi/soạn offline. Chặn theo WEB-003, không kết luận riêng về hành vi offline; JUnit ghi skipped, không giữ ảnh tạm.
- 2026-10-25: nhóm BTVN thử TC-HW-007/008 trên lớp QA. Flow không dựng được ca N/N+1 sạch: sau lượt setup Luyện đọc, danh sách session thứ hai không mở bằng history; chuyển sang URL list trực tiếp thì lựa chọn loại Luyện đọc không xuất hiện trong fixture đã có phần cùng loại. Chặn do fixture/selector, không kết luận lỗi app; JUnit ghi skipped.
- 2026-10-25: nhóm báo cáo thử điều kiện TC-RPT P0. Trang Báo cáo hiện trạng thái “Báo cáo cần ít nhất một buổi đã diễn ra.”; fixture `QA-Web-241025B-Class` chưa có buổi đã diễn ra, nút Thêm báo cáo không xuất hiện. Chặn riêng RPT-001/002/006/007/008/009/010/012 do thiếu lịch sử/bản nháp/bản phát hành; JUnit `report-default-range-junit.xml` ghi skipped, không ghi bug app.
- 2026-10-25: PRM-001 pass trên smoke workspace: tạo thêm lớp thành công và lớp mới hiện trong danh sách cùng lớp QA trước. JUnit `permissions-admin-workspace-junit.xml`. PRM-003 và bước 1 của PRM-006 đã pass từ các flow/JUnit trước; không lặp lại. PRM-004/005 bị chặn vì cần PH-A token hợp lệ để gọi API trực tiếp; PRM-007 cần tài khoản workspace thứ hai, fixture hiện không có.
- 2026-10-25: TC-GRD-010 pass: phụ huynh mới chưa liên kết thấy trạng thái rỗng và mở được Cài đặt; JUnit `guardian-no-student-junit.xml` cập nhật thêm testcase này cùng TC-AUTH-008.
- 2026-10-25: TC-TST-012: xác minh học sinh thêm hôm nay vẫn có ô điểm và “Chưa có điểm” ở bài hôm qua; nhập 10, lưu và tải lại còn 10. Chặn phần báo cáo/phụ huynh vì lớp không có buổi đã diễn ra/guardian fixture; JUnit `scores-late-enrollment-junit.xml` ghi skipped phần còn lại.
- 2026-10-25: TC-TST-010: dialog xác nhận rõ lưu trữ; xác minh lưu trữ thành công và bài biến mất khỏi danh sách đang hoạt động. Chặn kiểm ẩn khỏi báo cáo/phụ huynh do thiếu fixture phát hành; JUnit `scores-archive-graded-junit.xml` ghi skipped phần còn lại.

- 2026-10-25: tiếp tục nhóm P0 còn trạng thái chưa chạy. TC-HW-003 thử hai lần: lượt đầu fixture mở buổi không có nút thêm Luyện từ vựng; lượt hai dựng lớp + học sinh + buổi lẻ nhưng staging từ chối đăng ký PH bằng cảnh báo “Bạn thử đăng nhập quá nhiều lần. Hãy chờ rồi thử lại.” nên chưa kiểm được màn phụ huynh. Flow `homework-parent-immediate.mjs`, JUnit skipped. Không ghi nội dung/credential vào artefact.
- 2026-10-25: phân loại từng P0 còn lại trong `status.tsv`: 70 tổng, 25 pass, 3 fail (WEB-003/004), 42 chặn/thủ công, 0 chưa phân loại. Buổi đã tới ngày bị khoá theo bằng chứng ATT-001/002 (WEB-003); RPT thiếu buổi đã diễn ra; BTVN/phiếu/phụ huynh thiếu chuỗi fixture hoặc signup đang bị rate limit; PRM trực tiếp cần token/fixture quyền mà QA không giữ; OFF-004 cần fixture vận hành. TC-GRD-008/009 chỉ có kiểm tra một phần ở tổng quan/nhận xét, nên JUnit đã đổi hai ca thành skipped thay vì pass.


## P1 web QA · 2026-10-25

- ATT: ATT-004/006/007/013 chặn theo WEB-003 hoặc thiếu buổi hủy; ATT-012 thủ công vì cần hai phiên đồng thời, nền buổi hiện bị khóa. Ghi từng lý do trong `status.tsv`.
- CLS: chạy `p1-class-edit-archive.mjs` headless hai lượt, mỗi lượt một Chromium. Lượt đầu không thấy nút “Thêm tùy chọn”; lượt sau không thấy link lớp mới. Đây là lỗi định vị/điều hướng của flow, chưa phải bug app; CLS-003/004/008/010/011/012/013 chặn với bằng chứng riêng.
- STU: TC-STU-003 dùng kết quả diagnostic đã chạy trước đó: thêm không SĐT phụ huynh thành công; STU-006/007 chặn vì cần buổi lịch sử.
- CMT: CMT-002/004/005/010/011/013 chặn vì không có buổi có thể sửa; CMT-012 tiếp tục chặn theo WEB-003. Không tạo parent mới.
- HW: `p1-homework-kinds-delete.mjs` chạy ba lượt, mỗi lượt một Chromium; luồng dừng ở guard “Bài tập chưa lưu” trước assertion đủ loại/xóa, chưa quy lỗi app. HW-002/005 chặn; HW-003/004/009/010/014 được chặn riêng theo PH hoặc N/N+1.
- TST: TST-016 pass cùng bằng chứng OFF-003: bài kiểm tra tạo offline, còn trong danh sách, POST đồng bộ thành công. TST-002/006/007/011 chặn vì flow chưa có roster/bài editable ổn định; TST-013 thiếu báo cáo phát hành.
- RPT: RPT-003/005/011/014/015/016/017 chặn; trang báo cáo yêu cầu ít nhất một buổi đã diễn ra, fixture chưa có buổi lịch sử.
- OFF: OFF-002 và OFF-006 thủ công (cần throttle mạng/điều phối hai phiên); OFF-008 chặn vì cần draft báo cáo và PH; OFF-009 thủ công do cần inbox/cron và Q-08.
- PRM: PRM-002 chặn vì luồng P1 không tới được chi tiết lớp để duyệt menu/Cài đặt; PRM-004/005/007 vẫn theo fixture/token trước.
- AUTH: AUTH-005/006/010 chặn do đăng ký phụ huynh bị HTTP 429, AUTH-011 thủ công vì đổi credential smoke, AUTH-012/013/014/016/017/018 chặn theo fixture/mailbox/outbox.
- GRD: GRD-003/004/011/012 cần PH; lần signup cuối bị “Bạn thử đăng nhập quá nhiều lần” vào khoảng 08:44 ICT ngày 25/10. Theo lead không thử lại; gom các ca này chờ một lượt sau khi cửa sổ 429 hết.


## Rà soát flow bị chặn bằng mã nguồn · 2026-10-25

- Không chạy browser/Playwright/flow; chỉ đọc source bằng `srcwalk` tại `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-web/src`. Không có ca nào đủ bằng chứng để nghi lỗi app.
- TC-CLS-003/004: **lỗi flow (đã sửa selector/điều hướng)**. `ClassDesktopHeader.tsx:147-165` đặt nút tên truy cập `Thêm tùy chọn` và menu item; `Modal.tsx:35-50` đặt dialog `aria-label` theo title (`Sửa lớp`), nút đóng `Đóng`; `EditClassModal.tsx:59-99` có label `Tên lớp`, nút `Lưu thay đổi`; `ConfirmDialog.tsx:45-67` dùng `role=dialog`, `aria-label=title`, và nhãn nút theo action; `ArchiveClassDialog.tsx:46-55` đặt title “Lưu trữ lớp …?” với nút `Lưu trữ`. Flow bỏ lần điều hướng dư qua `/lop`, chờ route chi tiết, navigation “Mục của lớp” và heading rồi mới mở menu. Không suy diễn việc thiếu nút trước đây thành lỗi quyền/app vì flow chưa chờ DOM chi tiết.
- TC-HW-002/005: **lỗi flow (đã sửa selector/thứ tự thao tác)**. `HomeworkDesktop.tsx:194-205,216-219` chỉ mở guard khi editor còn dirty; `:610-635` dùng dialog `aria-label="Bài tập chưa lưu"` với nút `Lưu`, `Bỏ thay đổi`, `Ở lại`; `:487-520` đặt aria-label nút xóa `Xoá phần <loại>`; `:638-676` xác nhận qua dialog `Xoá phần “<tiêu đề>”?` và nút `Xoá phần`; `:782-869` cho loại phần dạng button có accessible label, tiêu đề `#hw-desktop-title`, nút `Lưu phần`. Flow trước bấm “Bỏ thay đổi” dù guard không hiện, rồi thao tác tiếp khi form chưa đóng. Flow mới xử lý guard theo đúng dialog `Bài tập chưa lưu` nếu nó xuất hiện; nếu không thì tiếp tục form thêm sạch, chọn loại thiếu, lưu và đợi editor rời DOM; xóa dùng tên dialog và nút xác nhận thực của app.
- JUnit cho bốn ca trên chuyển sang skipped/chờ lượt chạy; `status.tsv` chuyển chúng về `tự động-chưa-chạy`. Ca còn lại không đổi. Source review là bằng chứng selector/label tĩnh, chưa xác minh hành vi runtime; cần lượt browser tiếp theo để xác nhận.

## Cập nhật flow điểm theo spec 2026-10-25

- Chỉ sửa `qa/`: flow tạo bài không còn khẳng định điểm tối đa 15; kiểm tra form không có trường điểm tối đa và bài mới hiện trạng thái `Chưa có điểm` (`scores-create-delete.mjs`).
- TC-TST-002/003 dùng chung `scores-step-validation.mjs`: kiểm tra chấp nhận 0, 1000, 0,5; từ chối 1000,5, 1001, 0,25, −0,5; bỏ thông báo/trần 0..15.
- TC-TST-007 thêm `scores-edit-preserve.mjs`: tạo bài, lưu 15, sửa tên/ngày, xác nhận form không có điểm tối đa và điểm cũ còn nguyên.
- TC-TST-008 cập nhật `scores-max-ceiling.mjs`: nhập 20 và 100, lưu/tải lại, xác nhận không hiển thị hậu tố điểm tối đa.
- Thêm `scores-default-assignment.mjs` cho TC-TST-018 (hủy xác nhận không đổi dữ liệu; xác nhận ghi đè các hàng đang hiện bằng 15; tải lại) và `scores-default-assignment-offline.mjs` cho TC-TST-019 (thực hiện offline, thông báo lưu cục bộ, chờ POST sync sau khi nối mạng).
- `status.tsv` đã gắn flow cho TC-TST-002/007/008/018/019; giữ trạng thái `tự động-chưa-chạy` chờ triển khai. Không chạy browser/Playwright/flow theo yêu cầu; chưa xác minh runtime, đặc biệt nhãn và nội dung hộp xác nhận của nút mới.

## Chạy lại các ca chờ · 2026-10-25 10:39 ICT

- TC-ATT-001/002: pass lúc 10:39 ICT trước deploy, rồi **pass lần nữa lúc 10:44 ICT trên bundle `index-DHOAdBrF.js`**; đủ bốn trạng thái lưu/đọc lại và sửa Vắng → Có mặt. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/attendance-four-states-junit.xml`. WEB-003 chuyển sang đã sửa trên staging.
- TC-CMT-012: **chặn, chưa kết luận app**. Chạy flow với buổi cũ cho thấy WEB-003 vẫn khoá sao; chuyển flow sang tạo buổi hôm nay nhưng không xác định được route/link của buổi vừa lưu, nên chưa tới bước offline. JUnit hiện có: `plans/20261021-mvp/qa/runs/2026-10-25/web/comments-offline-send-junit.xml`. Cần sửa fixture/định vị rồi chạy lại; không ghi bug CMT từ lần này.
- TC-CLS-003: **pass**. Flow sửa route sau tạo lớp (staging quay về `/lop`, cần mở lớp từ danh sách); đổi tên rồi thấy tên mới ở chi tiết. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/p1-class-edit-archive-junit.xml`.
- TC-CLS-004: **một phần**. Xác nhận lưu trữ nêu dữ liệu được giữ và lớp biến mất khỏi danh sách hoạt động; chưa có điểm danh/điểm trong lớp mới để kiểm tra giữ dữ liệu. JUnit đánh dấu phần này skipped, không ghi bug app.
- TC-HW-002/005: **pass**. Flow đã sửa selector/thứ tự guard: tạo đủ bốn loại phần, xác nhận loại trùng bị khoá và nút thêm biến mất; xoá phần BTVN chưa chấm thành công. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/p1-homework-kinds-delete-junit.xml`.
- TC-AUTH-009: **pass** lúc 10:43 ICT sau khi xác nhận tài nguyên `assets/index-DHOAdBrF.js` trong Chromium mới, service worker bị chặn. Đã dùng một tài khoản phụ huynh smoke: đăng ký trước, giáo viên thêm học sinh có số khớp, phụ huynh tải lại và thấy học sinh. WEB-004 chuyển sang đã sửa trên staging; JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/guardian-late-link-junit.xml`. Không gặp 429, không thử signup lại.
- TC-CMT-012: một phần pass trên bundle mới lúc khoảng 10:45 ICT, Chromium mới/service worker bị chặn: phiếu lưu cục bộ, hint cần mạng, nút gửi bị khoá offline và enabled trở lại khi online. Chưa gửi thật/kiểm tra phụ huynh nhận nên giữ chặn một phần; JUnit skipped ghi rõ phần còn thiếu: `plans/20261021-mvp/qa/runs/2026-10-25/web/comments-offline-send-junit.xml`.
- TC-HW-007/008: chạy trên bundle mới lúc 10:48 ICT, profile mới/service worker bị chặn. Flow tự dựng lớp, 3 học sinh, hai buổi tương lai và phần Luyện đọc ở N; nhưng không định vị/render được N+1 từ danh sách theo ngày, chưa kiểm được tab buổi trước/bảng chấm. Chặn theo fixture/route, chưa kết luận app. JUnit và ảnh: `plans/20261021-mvp/qa/runs/2026-10-25/web/homework-previous-session-junit.xml`, `homework-previous-session-failure.png`.
- TC-GRD-008/009 (kèm TC-AUTH-007): pass trên bundle mới với tài khoản phụ huynh thứ hai trong hạn mức 2 tài khoản; trang tổng quan chỉ hiện học sinh liên kết, Nhận xét không có control chỉnh sửa. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/guardian-links-student-junit.xml`. Không gặp 429.
- Smoke mở bài kiểm tra: Chromium mới/service worker bị chặn xác nhận bundle `index-DHOAdBrF.js`; mở bài kiểm tra smoke trong lớp QA và màn hình render, không trắng/crash. Không nhập/sửa điểm. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/scores-page-smoke-junit.xml`.

## Chạy lại HW/CMT/CLS · 2026-10-25

- Mỗi lượt dùng một Chromium headless riêng, context mới, `serviceWorkers: 'block'`, xác nhận bundle `index-DHOAdBrF.js`; trước mỗi lượt `df -h /` báo còn 5,2 GiB.
- TC-HW-007/008: flow đã sửa định vị N+1 bằng URL lấy từ nút “Xem buổi” ngay sau khi tạo buổi, do `SessionsDesktop.tsx` chỉ hiện buổi hiện tại và buổi lẻ gần nhất. Lượt chạy vẫn chặn: sau khi giao BTVN ở N, mở lại URL N+1 không hiển thị ngày N+1; JUnit skipped ở `homework-previous-session-junit.xml`, ảnh chẩn đoán ở cùng thư mục. Chưa kết luận lỗi app; cần fixture/route ổn định hơn.
- TC-CMT-012: flow tự tạo lớp/học sinh QA và buổi hôm nay. Pass các bước soạn offline, giữ nháp, khóa gửi + hint cần mạng; sau reconnect, gửi phiếu thành công và trạng thái “Đã gửi” xuất hiện. Chưa thể xác minh phía phụ huynh vì lớp cô lập không có tài khoản PH liên kết; JUnit đánh dấu skipped phần đó ở `comments-offline-send-junit.xml`.
- TC-CLS-003 pass; TC-CLS-004 một phần: flow tạo học sinh, lưu điểm danh Có mặt, lưu trữ lớp, xác nhận lớp không còn trong danh sách hoạt động; sau đó mở lại buổi và điểm danh vẫn là Có mặt. Chưa kiểm chứng dữ liệu điểm số; JUnit skipped phần còn thiếu ở `p1-class-edit-archive-junit.xml`.
- Không phát hiện lỗi app mới trong nhóm này; `qa/bugs.md` giữ nguyên WEB-003/004 đã sửa trên staging.

## HW source review và HTTP quyền máy chủ · 2026-10-25

- Đối chiếu `qa/testcases/homework.md:79-94` và `docs/spec.md:59`: cần mở buổi N+1 để có tab Bài tập buổi trước và chấm phần của N.
- Kết luận nguyên nhân định vị ban đầu: **lỗi flow (sửa selector/điều hướng)**. `SessionsDesktop.tsx:80-99` chỉ đặt link cho buổi hiện tại và buổi lẻ gần nhất; `SchedulePage.tsx:67-71, 100-119` lấy các buổi và liệt kê upcoming trong 14 ngày, còn `:94-112` tạo link chi tiết cho từng session. Flow đã chuyển sang điều hướng `/lich` để mở N+1. Chạy lại trên bundle `index-DHOAdBrF.js` nhưng `/lich` render màn trắng; JUnit skipped, ảnh `homework-previous-session-failure.png`. Chưa phân biệt được lỗi route runtime hay fixture; chưa ghi bug app.
- Lượt trước đã ghi nhận parser sai định dạng khiến nội dung file credential demo lọt vào tool output. Từ khi nhận quy tắc mới, không mở hay dò file đó; các request HTTP phía dưới chỉ dùng staging-smoke*.txt, không có request nào dùng credential demo.
- Tại thời điểm ghi mục này, PRM/OFF HTTP đang dừng; kết quả các ca chưa chạy khi đó được cập nhật tại phần chẩn đoán mới bên dưới. PRM-006 giữ kết quả tự động-pass 401 từ lượt trước.

## Chẩn đoán HW và kiểm quyền workspace · 2026-10-25 11:04 ICT

- Chạy lại `homework-previous-session.mjs` trên bundle `index-DHOAdBrF.js` với Chromium mới, service worker bị chặn. Flow tới `/lich` nhưng không tìm thấy buổi N+1 (fixture_missing). Diagnostics ghi 273 event: 0 console error, 0 page error, 0 HTTP error và 0 request thất bại; log đã loại query/token/body. Bằng chứng không xác nhận lỗi app; HW-007/008 vẫn chặn vì N+1 không có trong lịch và chưa tới màn chấm. Chưa thêm WEB-005.
- Smoke config chỉ cung cấp hai tài khoản giáo viên ở workspace khác nhau; không có PH-A credential. Vì vậy PRM-004/005 không gửi request; không đọc hay dùng file demo.
- `permissions-http-prm007.mjs`: đăng nhập hai giáo viên HTTP 200; roster của lớp smoke đọc được bởi chủ workspace HTTP 200, giáo viên workspace khác bị HTTP 404. PRM-007 đạt kiểm tra đọc; kiểm tra ghi chặn để không gửi payload có thể sửa dữ liệu. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/permissions-http-prm007-junit.xml`.
- PRM-008/OFF-004 chặn vì không có role bị thu quyền ghi trong smoke fixtures; không đổi role qua công cụ ngoài. Không phát hiện lỗi bảo mật trong phần đã chạy; chưa thêm bug.

## Dựng lại HW-007/008 trên bundle mới · 2026-10-25 11:09 ICT

- Lượt đầu chỉ kiểm tra được bundle vì staging đã đổi từ `index-DHOAdBrF.js` sang `index-Cp4GJ8XB.js`; xác nhận qua request script, không có lỗi console/HTTP. Cập nhật `staging-bundle-check.mjs`, bỏ ảnh tạm của lượt preflight.
- Flow tạo lớp/học sinh QA, hai buổi lẻ N (28/10) và N+1 (29/10), rồi giao phần Luyện đọc qua giao diện. Trên đúng bundle mới, `/lich` hiện ít nhất một link của lớp nhưng các link đó không dẫn tới chi tiết khớp ngày N+1. Diagnostics ghi 535 event, 0 console error, 0 page error, 0 HTTP error, 0 request thất bại; chưa đủ bằng chứng quy lỗi cho app. HW-007/008 chặn tại bước định vị N+1; JUnit skipped, ảnh chụp màn lỗi trắng được lưu trong thư mục run.
- PRM-008/OFF-004 được chuyển sang `thủ công/ngoài phạm vi bản đầu`: role tuỳ chỉnh thuộc Làm sau; kiểm tra mã UI chỉ thấy đổi membership/vai trò, không thấy màn thu quyền. Không chỉnh trực tiếp D1 hay dùng công cụ vận hành. PRM-004/005 tiếp tục chờ lane iOS đăng ký PH.


## Kiểm fixture legacy điểm và báo cáo · 2026-10-25

- Dùng Chromium headless context/profile mới, service worker bị chặn; bundle xác nhận `index-Cp4GJ8XB.js`. Qua UI smoke, lớp `ede75178…` và hai bài legacy do backend gửi không hiển thị; bốn report fixture thuộc hai lớp khác cũng không hiển thị trong workspace smoke. Kết quả JSON/JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/legacy-score-fixture-check.json` và `legacy-score-fixture-check-junit.xml`; không có console/network diagnostics vì fixture không truy cập được. Không thử tài khoản khác.
- TC-TST-006 vẫn chặn: không thể sửa tên/ngày bài legacy mà không truy cập được; không có thay đổi dữ liệu. TC-CLS-004 vẫn chặn một phần: lượt lưu trữ trước xác nhận điểm danh còn và hàng bài kiểm tra 1/1 em có điểm, nhưng giá trị 20 chưa xác minh; fixture điểm legacy backend gửi cũng ngoài workspace smoke. TC-RPT-012 và TC-RPT-011 không kiểm được vì báo cáo không hiển thị; TC-RPT-013/014 không liên quan đến các report fixture này và giữ trạng thái hiện có.


## Chạy lại HW-007/008 · 2026-10-25

- Sửa flow để nếu /lich không mở N+1 thì quay về danh sách Buổi học của lớp và tìm qua link “Xem buổi”; `node --check` đạt. Chạy một Chromium headless mới, service worker bị chặn; staging xác nhận bundle `index-Cp4GJ8XB.js`.
- Sau khi dựng lớp, học sinh, buổi N/N+1 và giao BTVN ở N, cả /lich lẫn danh sách Buổi học của lớp đều không mở chi tiết ngày 29/10. Diagnostics: 0 console errors, 0 page errors, 0 HTTP errors, 0 failed requests. TC-HW-007/008 vẫn chặn ở fixture/điều hướng, chưa tới bảng chấm; không kết luận lỗi app. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/web/homework-previous-session-junit.xml`; ảnh/bằng chứng: `homework-previous-session-failure.png`, diagnostics đã khử dữ liệu nhạy cảm trong `homework-previous-session-diagnostics.json`.
- Chromium đã đóng sau lượt; giữ PNG làm bằng chứng lỗi định vị, không giữ profile tạm. Dung lượng sau lượt: 6.5 GiB khả dụng.


## Kiểm SW sau deploy DMd61nmq · 2026-10-25

- Chạy bằng profile Chromium mới, SW bật tự nhiên. Xác nhận bundle `index-DMd61nmq`; SW active và controlling. Hai normal reload đều pass, bundle đúng, không lỗi console/page/network. Lượt đầu UI hiện 0 lớp; lượt sạch tiếp theo tìm được lớp/bài kiểm tra qua UI và mở detail `/lop/{id}/bai-kiem-tra/{id}` thành công, không hiện “Không thể mở màn hình”.
- Khi đang ở detail, reload với `context.setOffline(true)` không render app shell. Console báo `Unable to preload CSS` ở `index-DMd61nmq.js:13:30121`; lượt cuối ghi 92 request asset thất bại (`net::ERR_FAILED`/`net::ERR_INTERNET_DISCONNECTED`), gồm CSS/JS chunks và `/v1/me`. Bật mạng lại, reload recovery pass trên bundle mới, không lỗi. WEB-005 còn lỗi ở app shell offline. JUnit: 6 checks, 5 pass, 1 fail; JSON và ảnh trong `plans/20261021-mvp/qa/runs/2026-10-25/web/sw-deploy-recovery-*`.
- Không kiểm được đường nâng cấp từ SW cũ: staging không còn bundle `Cp4GJ8XB`; cần người dùng xác nhận trên browser đang giữ SW cũ.


## SW offline sau brief 90 · bundle BhzpF4oY

- Dùng Chromium headless profile sạch, SW không bị chặn. Bundle `index-BhzpF4oY.js` được xác nhận; SW active và controlling. Đã làm ấm cache online qua `/`, `/lop`, `/lop/{id}/diem`, chi tiết bài kiểm tra smoke; hai reload thường pass, detail mở được, không có “Không thể mở màn hình” hay lỗi chunk/dynamic import.
- Reload offline trên cả bốn route đều mở app shell; online recovery sau từng route pass. 12/12 checks pass. Diagnostics offline chỉ ghi API `/v1/me` và `/v1/sync/pull` mất mạng, không có lỗi asset chunk; JUnit/JSON: `plans/20261021-mvp/qa/runs/2026-10-25/web/sw-deploy-recovery-junit.xml`, `sw-deploy-recovery.json`. WEB-005 chuyển đã sửa trên staging; chưa xác minh upgrade từ SW cũ vì bundle Cp4GJ8XB không còn ở staging. Ảnh lỗi của bundle DMd61nmq được giữ tại `sw-deploy-recovery-DMd61nmq-offline-failure.png`.


## Kiểm nút Lưu điểm ghim đáy · bundle BhzpF4oY

- Tạo lớp QA bằng giao diện với 10 học sinh và một bài kiểm tra; không dùng dữ liệu ngoài workspace smoke. Flow recheck tái sử dụng fixture đó sau khi selector lớp được đổi sang tìm kiếm UI.
- Desktop 1440×900: `Lưu điểm` ghim trong viewport và click/lưu thành công, nhưng phủ hàng cuối (button y=812..864, row y=848.75..906.25). Ghi WEB-006 còn lỗi. Mobile 390×844: nút trong viewport, click/lưu thành công, hàng cuối kết thúc y=687.94, nút bắt đầu y=703.94; pass.
- JUnit 4 assertions: 3 pass, 1 fail; JSON/ảnh trong `plans/20261021-mvp/qa/runs/2026-10-25/web/scores-save-sticky-recheck-*`. Dung lượng sau lượt cần kiểm trước lượt tiếp theo.

## Xoá báo cáo · bundle BhzpF4oY

- Chạy lại một Chromium headless trên workspace smoke, không đăng ký phụ huynh. Bundle `index-BhzpF4oY.js` được xác nhận. RPT-019/021/022: 3/3 pass, JUnit `plans/20261021-mvp/qa/runs/2026-10-25/web/report-batch-delete-junit.xml`, JSON `report-batch-delete.json`.
- RPT-019: huỷ hộp thoại giữ nguyên; xác nhận làm cả đợt biến mất. Fixture có 4 học sinh (4 nháp), trong khi testcase mô tả 3; kết quả xác nhận hành vi xoá cả đợt nhưng giữ lưu ý lệch số lượng.
- RPT-021: offline mục xoá bị khoá và hiện hint “Cần mạng”; báo cáo vẫn còn trước và sau khi kết nối lại. Chỉ có lỗi mạng dự kiến ở `/v1/sync/pull`.
- RPT-022: xoá A, thêm C; B vẫn hiện và nội dung trước/sau giống nhau. A biến mất khỏi danh sách.
- UI staging vẫn dùng chọn khoảng buổi với 9 lựa chọn, chưa có chọn theo tháng (brief 91 chưa lên). Không phát hành báo cáo và không đăng ký PH.

## Kiểm bundle C8aXCZci · 2026-10-25

- A (RPT-020/PRM-004/005): chặn trước khi đăng ký/gọi API vì các credential smoke hiện có không thuộc workspace `smoke-qa-prm`; không đăng ký PH, không gọi API và không ghi dữ liệu. Trạng thái từng ca ở `status.tsv`.
- B: profile Chromium sạch, service worker bật. `assets/index-C8aXCZci.js` khớp; sau khi SW sẵn sàng đã reload một lần và xác nhận page do SW điều khiển. WEB-006 đạt khi cuộn hết vùng nội dung: desktop 1440×900 (`scrollTop=235`), mobile 390×844; hàng cuối không bị nút che, nút Lưu đang bật. Không lưu điểm thử.
- Danh sách buổi và BTVN của fixture QA không có nhãn `Buổi N` (0/0); bài tập tạo qua UI với dữ liệu QA. Danh sách báo cáo: lượt đầu thấy 4 dòng, lượt kiểm lại không thấy dòng nào nên không kết luận nhãn; form thêm báo cáo vẫn chọn khoảng buổi, brief 91 chưa triển khai. RPT label check giữ trạng thái skipped vì thiếu dòng ổn định để xác minh; không tạo/phát hành báo cáo mới.
- JUnit: `brief90-regression-junit.xml` (5 pass, 1 skipped, 0 fail), `brief90-report-list-check-junit.xml` (1 skipped). JSON tương ứng trong `plans/20261021-mvp/qa/runs/2026-10-25/web/`. WEB-006 đóng trên bundle C8; chưa kiểm bản bundle cũ.
  - Sau lượt cuối `df -h /` còn 353 MiB (<1.5 GiB), nên dừng mọi lượt Chromium. Không có profile lưu riêng hoặc ảnh tạm từ các lượt này; context/browser đã đóng.

## RPT-020 + PRM-004/005 bootstrap attempt · 2026-10-25

- Đĩa trước lượt: 3.5 GiB. `report-parent-permission-smoke.mjs` đã qua `node --check`, chạy một tiến trình Node với một Chromium headless, bundle staging quan sát được là `index-C8aXCZci.js`.
- Flow trước dừng ở bước đăng ký giáo viên; kết quả request không xác định. Theo cập nhật GL, không tạo workspace hay tài khoản mới; lượt hiện tại dùng duy nhất các tài khoản đã có trong smoke fixture.
- Lượt trước chưa thêm lớp/học sinh, chưa tạo/phát hành/xoá báo cáo và chưa gọi endpoint PRM. Workspace QA không đổi.
- Chromium/context đã đóng; không tạo ảnh hoặc profile lưu riêng. Không thể xác minh các testcase do bước bootstrap chưa hoàn tất.

## RPT-020 + PRM-004/005 dùng tài khoản smoke hiện có · 2026-10-25

- Lần thử đầu dừng do disk gate. Sau khi GL cung cấp định dạng credential, script dùng mật khẩu chung và chuẩn hoá SĐT trong bộ nhớ, không in giá trị.
- Lượt Chromium tiếp theo: dung lượng trước chạy 2.0 GiB, bundle `index-C8aXCZci.js`; đăng nhập GV HTTP 200 và PH HTTP 200, mỗi tài khoản đúng một lần. Flow dừng sau hai đăng nhập trước khi ghi kết quả testcase; artefact không giữ bước lỗi cụ thể. Không đăng nhập lại và không đăng ký tài khoản mới.
- RPT-020, PRM-004, PRM-005 đều skipped; không có kết luận về quyền đọc/ghi hay xoá báo cáo. JUnit `parent-report-permission-smoke-junit.xml` ghi hai login pass HTTP 200 và ba ca chặn. Chromium/context đóng, không có ảnh; `df -h /` sau lượt còn 2.0 GiB.
- Cần lượt tiếp theo với chẩn đoán phase rõ hơn; chưa xác minh testcase hoạt động.

## Chẩn đoán phase HTTP PRM · 2026-10-25

- Thêm `permissions-http-prm004-005.mjs` (không dùng Chromium) và bọc các phase login GV, login PH, PRM-004, PRM-005; lỗi ghi tên phase, loại lỗi và message đã lọc vào stderr/JUnit. `--dry-run` pass, không đọc creds và không gửi mạng.
- Lượt thật dừng tại `login GV`: HTTP 401. PH chưa đăng nhập; PRM-004/005 skipped, RPT-020 chưa vào UI. Không thử lại GV theo giới hạn đăng nhập. JUnit `permissions-http-prm004-005-junit.xml` ghi phase cụ thể.
- Không khởi chạy Chromium. Lúc bắt đầu lần chạy vừa rồi dung lượng báo 631 MiB do GL chưa dọn xong; sau đó GL xác nhận 13 GiB. Không tạo profile/ảnh. Cần xác minh lại thông tin đăng nhập GV từ lead trước lượt mới.

## Brief 91 · phần phụ huynh và trạng thái chặn GV · 2026-10-25

- Đọc common brief và comments/reports/guardian/scores testcase. Thêm TC-CMT-016 cho quan sát dáng Mít riêng theo 0–5 sao, theo spec:235; testcase để thủ công vì cần đánh giá hình ảnh.
- HTTP PRM: dry-run không mạng pass; lượt thật HTTP 401 tại login GV, không thử lại và chưa gửi login PH hay endpoint testcase. PRM-004/005 blocked. RPT-020 blocked trước UI. JUnit `permissions-http-prm004-005-junit.xml` và `parent-report-permission-smoke-junit.xml` lưu phase.
- Một Chromium headless dùng duy nhất login PH (HTTP 200). Bundle `index-C48oeJFZ.js` khớp, service worker ready; mở `/ph` và reload thường một lần. Không xác minh được phiếu/báo cáo vì không có fixture UI khả dụng và locator Báo cáo ban đầu sai; không ghi lỗi app. Không xác nhận được `controller` SW vì flow chỉ kiểm `ready`.
- JUnit `brief91-guardian-smoke-junit.xml`. Không có ảnh vì chưa có mascot/form nhận xét hiển thị. Không phát sinh dữ liệu, không đăng ký, không thử login lần nữa. Disk trước/sau lượt PH: 13 GiB.
- CMT-001..006/008..014 và báo cáo tháng cần phiên GV; chưa chạy trên bundle C48 do login GV HTTP 401 và giới hạn lượt. RPT-019/021/022 pass cũ chỉ còn bằng chứng bundle BhzpF4oY, chưa tái xác nhận C48.
- Source review cho biết tab PH là “Nhận xét của cô”; Báo cáo mở ở `/ph/bao-cao`, không có tab Báo cáo trong `GuardianShell.tsx`. Đã sửa flow dùng route trực tiếp; chưa chạy lại do lượt login PH đã dùng. Đây là lỗi flow selector/điều hướng, không phải bằng chứng lỗi app.

## Brief 91 · phần GV smoke chính và HTTP phone · 2026-10-25

- Cập nhật bundle helper sang `index-C48oeJFZ.js` sau khi xác nhận trang staging trả HTTP 200 và asset C48; lần chạy đầu dừng trước khi submit login do helper còn mong C8a. Sửa helper, chạy lại 1 Chromium headless, một lần login GV qua UI thành công, không retry.
- Flow `brief91-teacher-smoke.mjs` bị chặn ngay sau login: không tìm thấy lớp QA có học sinh trong danh sách lớp của workspace smoke. Vì chưa có fixture xác định nên không chạy nhận xét/báo cáo, không tạo/xóa dữ liệu, không ghi nhận lỗi app. CMT-001..006/008..014, RPT-001..003/005..010/019 và CMT-016 cập nhật blocked trong `status.tsv`; PH-side chưa chạy.
- JUnit/JSON: `brief91-teacher-smoke-junit.xml`, `brief91-teacher-smoke.json`. Không có ảnh Mít vì flow chưa tới phiếu.
- Sửa `permissions-http-prm004-005.mjs`: HTTP phone chuẩn hoá `+84` + 9 số nội địa; UI tiếp tục dùng 9 số. Thêm quy ước vào `qa/README.md`; dry-run không mạng/không login pass. Lượt HTTP thật chạy ở phần tiếp theo.
- Dung lượng trước các lượt Chromium: 13 GiB; profile đóng khi script kết thúc.

## PRM HTTP fb2 · 2026-10-25

- Dry-run sau sửa phone pass. Một tiến trình HTTP thật đăng nhập GV HTTP 200 và PH HTTP 200 (mỗi tài khoản một lần); không in dữ liệu xác thực và không lưu token.
- PRM-004 blocked: workspace không có học sinh QA chưa liên kết; PRM-005 blocked: không có bài kiểm tra QA cùng học sinh QA liên kết để dựng lệnh `score.set` hợp lệ. JUnit `permissions-http-prm004-005-junit.xml`.
- Lượt HTTP kết thúc nên token trong bộ nhớ đã mất; không đăng nhập lần nữa. PH brief 91 và RPT-020 blocked vì chưa có phiên UI/fixture báo cáo đã phát hành; cần gộp các phase vào cùng tiến trình trước lượt auth mới. Không có bug quyền được xác nhận.
- Selector lớp ban đầu chưa chờ hydration và chưa bám anchor route thật. Đã chỉnh flow theo source `ClassListPage.tsx` (`a[href^="/lop/"][href$="/buoi-hoc"]`) và chờ danh sách/empty state; không rerun vì giới hạn một login GV smoke chính đã dùng.

## Brief 91 · lượt fb2 gộp UI + quyền · 2026-10-25

- Một tiến trình duy nhất đăng nhập GV fb2 và PH fb2 đúng một lần/tài khoản qua HTTP (`+84` + 9 số); cả hai trả HTTP 200. Bundle `index-C48oeJFZ.js` xác nhận. Không đăng ký tài khoản mới, không ghi token.
- GV tạo lớp và hai HS QA qua UI. HS có SĐT PH vẫn không xuất hiện trong PH fb2 sau khi mở trang nhận xét; flow dừng ở phase `UI class and students` (timeout chờ HS). Nguồn UI chỉ cho nhập/sửa SĐT phụ huynh; không thấy thao tác liên kết membership PH có sẵn. Không dùng API/DB để bịa liên kết.
- PRM-004/005, RPT-020 và PH CMT view đều chặn do thiếu membership PH gắn với fixture; chưa phát hành/xoá báo cáo, không kết luận lỗi app. JUnit/JSON: `brief91-fb2-unified-junit.xml`, `brief91-fb2-unified.json`.
- Mã UI `StudentsDesktop.tsx` cho phép thêm/sửa SĐT phụ huynh, nhưng thao tác này không đủ để xác nhận membership liên kết; lần chạy quan sát PH không thấy HS. Không tái đăng nhập trong lượt này.

## Brief 91 · GV smoke chính · lượt 1 · 2026-10-25

- Một Chromium headless, bundle C48 xác nhận, GV đăng nhập thành công một lần. Dựng lớp QA, hai HS QA và buổi qua UI; lưu một HS Vắng. Dung lượng đĩa trước lượt 13 GiB.
- Pass: CMT-001 (5 tiêu chí mặc định 5 sao + câu mặc định), CMT-004 (lọc), CMT-014 (Dùng câu mặc định), RPT-001 (tên Tháng 10/2026), RPT-005 (tạo đợt tháng). Mít đã chụp element để QA xem thủ công.
- CMT-003/006 fail lần đầu: hộp gửi cả lớp không khớp số 1 gửi/1 bỏ qua dự kiến. Đây mới là lần đầu, chưa ghi bug app. Đối chiếu `CommentsDesktop.tsx` cho thấy danh sách gửi dựa vào `comment !== null || attended`; lượt sau ghi riêng hai số trong hộp xác nhận để phân loại.
- Nhãn buổi Chủ nhật làm regex cũ fail; đã sửa matcher cho `CN · ngày/tháng` (lỗi flow). Báo cáo dừng vì flow tìm nút Thêm báo cáo tại màn chi tiết; đã sửa điều hướng qua Tất cả báo cáo nhưng chưa chạy lại được.
- JUnit/JSON lượt đầu được giữ riêng: `brief91-teacher-smoke-run1-junit.xml`, `brief91-teacher-smoke-run1.json`. Flow cập nhật thêm bài/điểm QA để chuẩn bị dữ liệu báo cáo và sửa phân loại JUnit, chờ lượt xác minh.

## Brief 91 · GV smoke chính · lượt xác minh cuối · 2026-10-25

- Một Chromium headless mới, bundle C48 và đăng nhập GV thành công. Flow dựng thêm lớp/HS QA, buổi có HS Vắng và bài kiểm tra/điểm QA; bước lưu điểm pass.
- Lượt dừng ở phase tạo fixture điểm vì sau lưu bài, flow cố truy cập điều hướng lớp vẫn chưa có trên trang chi tiết bài KT. Đã sửa flow quay về `/lop/{classId}/buoi-hoc` sau lưu điểm. Không thể xác minh sửa đổi này trong lượt hiện tại.
- Nhận xét gửi cả lớp và báo cáo tháng thứ hai/xoá báo cáo vẫn chưa chạy lại. CMT-003/006 mới có một lần fail, chưa đủ bằng chứng kết luận bug app. Không mở thêm đăng nhập vì đã dùng hết ba tiến trình được cấp; cần lead cấp lượt mới để tiếp tục xác minh.
- JUnit/JSON cuối: `brief91-teacher-smoke-junit.xml`, `brief91-teacher-smoke.json`; cả login, bundle và fixture điểm đã ghi nhận, phase dừng được ghi skipped.

## Brief 91 · xác minh late link fb2 theo chỉ đạo mới · 2026-10-25

- Lượt 1/2 mới: một Chromium headless, GV fb2 đăng nhập HTTP 200, bundle C48; flow đã nhập SĐT PH bằng 9 số trên UI như spec. Sau bấm Lưu, tên HS QA không hiện trong danh sách và flow dừng ở phase `UI class and students`; PH chưa đăng nhập, nên không khẳng định WEB-004. Kết quả ở `brief91-fb2-unified.json` và JUnit cùng tên.
- Đã sửa `addStudent` để phân biệt modal đóng (đã lưu), validation alert và danh sách chưa cập nhật sau reload. Không đăng nhập lại fb2 trong tiến trình này; quyền/PH/RPT-020 chưa chạy. Chỉ ghi WEB-004 nếu lượt được phép tiếp theo xác nhận hồ sơ đã lưu đúng mà PH vẫn không thấy con.

## Brief 91 · lượt smoke chính theo chỉ đạo mới · 2026-10-25

- Lượt 2/2: Chromium headless, bundle C48, GV smoke đăng nhập một lần. Tạo lớp/2 HS QA, lưu một HS Vắng và bài kiểm tra có điểm.
- Pass: session label, CMT-001, CMT-004, CMT-014, RPT-001. CMT-003/006 tái hiện fail lần hai: hộp gửi cả lớp là 2 phiếu/0 bỏ qua, kỳ vọng 1/1; bấm Quay lại, không gửi phiếu. Đã ghi WEB-008 vào `qa/bugs.md`.
- Mít: ảnh element lưu tại `plans/20261021-mvp/qa/runs/2026-10-25/web/TC-CMT-016-mascot.png`, chờ người QA xem thủ công. Hai đợt Tháng 10/2026 được tạo; publish bị chặn do thiếu dữ liệu sẵn sàng. Hộp Huỷ và hành động xoá nháp đã chạy, nhưng JUnit hiện chưa kiểm postcondition số đợt; đã tăng cường flow và trạng thái vẫn chưa chạy.
- JUnit/JSON: `brief91-teacher-smoke-junit.xml`, `brief91-teacher-smoke.json`. Không còn tiến trình đăng nhập được cấp; không kết luận WEB-004 vì lượt fb2 chưa xác nhận save HS và chưa đăng nhập PH.

## Brief 91 · chẩn đoán fb2 trên bundle l7 · 2026-10-25

- Chromium headless, đăng nhập GV fb2 HTTP 200; bundle `index-l7_C4kqA.js` có ngay lần tải đầu và vẫn đúng sau reload cho SW nhận bản mới. Tìm được học sinh QA liên kết.
- Lượt dừng ở bước sửa/xác minh hồ sơ: ô SĐT có dữ liệu, nhưng flow coi dạng hiển thị 11 chữ số là không khớp, nhập lại 9 số rồi chờ dialog đóng; dialog vẫn mở đến timeout. HTTP GET danh sách chưa chạy; PH chưa đăng nhập. Đây là lỗi flow/không đủ bằng chứng, không kết luận WEB-004 và không tạo bug.
- JUnit/JSON: `brief91-fb2-diagnosis-junit.xml`, `brief91-fb2-diagnosis.json`. Điều chỉnh artefact JSON để không ghi nhầm rằng PH đã được kiểm; `parentSeesStudent` để null.
- Đã sửa flow chẩn đoán sau lượt: chuẩn hoá dạng hiển thị có mã quốc gia về 9 số để so khớp trong bộ nhớ, chỉ đọc hồ sơ và không tự sửa số; GET chỉ lấy trường điện thoại phụ huynh trong bộ nhớ. Sửa này chưa chạy lại nên TC-AUTH-009 và các bước PH/quyền/báo cáo vẫn cần lượt xác minh mới.

## Brief 91 · GV smoke chính trên bundle l7 · 2026-10-25

- Một Chromium headless, đăng nhập smoke một lần; bundle `index-l7_C4kqA.js` xác nhận sau reload, SW bật. Tạo lớp QA mới, hai học sinh, buổi lẻ và lưu Có mặt/Vắng; tạo bài kiểm tra và lưu điểm.
- Pass: nhãn buổi; CMT-001, CMT-004, CMT-014; hộp xác nhận CMT-003/006 hiện 1 phiếu/1 bỏ qua; không gửi phiếu (đã bấm Quay lại). Tuy nhiên flow đã mở dòng đầu và sửa câu/ghi chú trước hộp xác nhận, nên kết quả 1/1 chưa dùng để kết luận WEB-008; làm lượt clean riêng theo chỉ đạo mới.
- Mít: ảnh phần tử đã lưu để QA xem tay; không khẳng định trực quan dáng đúng. Báo cáo tháng: tên tháng, hai đợt Tháng 10/2026 cùng tồn tại, Huỷ giữ đợt và xoá nháp giảm số đợt đều pass. Báo cáo phát hành/xoá bị chặn vì không có hàng đủ dữ liệu để phát hành.
- JUnit/JSON: `brief91-teacher-smoke-processB-junit.xml`, `brief91-teacher-smoke-processB.json`; ảnh Mít: `TC-CMT-016-mascot.png`.

## WEB-008 · xác minh fixture sạch · 2026-10-25

- Sau Process B, chạy flow riêng trên Chromium headless, bundle `index-l7_C4kqA.js` đã xác nhận sau reload, SW bật. Hai lớp/buổi QA mới; mỗi lượt lưu rõ một HS Có mặt và một HS Vắng, không mở dòng nhận xét/phiếu, không nhập câu/ghi chú trước khi mở hộp gửi.
- Cả hai hộp đều hiện 1 phiếu / 1 em chưa chọn sao; bấm Quay lại, không gửi. WEB-008 đóng là lỗi flow QA cũ, không phải lỗi app. JUnit/JSON: `web008-clean-recheck-junit.xml`, `web008-clean-recheck.json`; ảnh: `web008-confirm-1.png`, `web008-confirm-2.png`.
- Đã sửa `brief91-teacher-smoke.mjs`: fixture luôn tạo lớp mới, đánh dấu Có mặt và Vắng tường minh, chụp/đọc hộp xác nhận trước khi sửa câu hoặc ghi chú; không gửi phiếu.

## Brief 91 · lượt fb2 cuối · 2026-10-25

- Disk trước lượt: 11 GiB trống. Một tiến trình Chromium headless, bundle `index-l7_C4kqA.js` xác nhận trước/sau reload; GV fb2 login HTTP 200.
- Chẩn đoán định dạng cũ: JUnit lượt l7 trước chỉ giữ độ dài 11 chữ số, không giữ dạng tiền tố; lượt này không tìm thấy fixture QA cũ để đọc qua UI. Không ghi số điện thoại vào log.
- Chặn: khi tạo lớp/học sinh QA mới, sau bấm “Lưu học sinh” dialog không đóng trong 15 giây. Không xác nhận được hồ sơ đã lưu/điện thoại phụ huynh, không có student ID; PH không đăng nhập, nên không kết luận WEB-004/WEB-009. Dừng, không thử lại.
- JUnit/JSON: `brief91-fb2-final-junit.xml`, `brief91-fb2-final.json`. Ảnh timeout chưa được tạo trong lượt này: selector ảnh theo tên HS không tìm thấy phần tử, và wrapper đã chuyển timeout thành Error tổng quát; đã sửa điều kiện capture và lọc ANSI/escape XML trong flow cho lượt tương lai. Không chạy lại theo giới hạn lượt cuối.
- PRM-004/005 không chạy và status của hai ca không đổi; backend đã báo pass.
