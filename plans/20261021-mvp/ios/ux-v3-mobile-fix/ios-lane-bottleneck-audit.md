# Audit nghẽn lane iOS, 2026-10-24 16:46 → 2026-10-25 18:20

Khổng Minh, chỉ đọc. Giờ ghi theo UTC+7, lấy từ `git log` mvp-ios, mtime file trong `plans/`, `createdAt` của agent.

**Bản sửa sau phản biện của người dùng.** Bản đầu của báo cáo này ước lượng build/test chiếm 30–35% thời gian và đề xuất "test tăng dần giảm 30–50%". Cả hai đều là phỏng đoán, không có số đo. Sau đó tôi đo từ transcript phiên của worker (`~/.claude/projects/*paseo-worktrees-0fvr24l0-*/*.jsonl`, có mốc thời gian từng lệnh và từng thông báo hoàn tất tác vụ nền) và đọc mã backend. Kết quả đo ở mục 2b **bác bỏ** hai con số đó; các mục dưới đã được sửa theo. Phần nào còn là ước đoán đều ghi rõ.

## 1. Tóm tắt

- Tổng 25,5 giờ đồng hồ. Trừ 2 khoảng chờ không phải việc (18:31–21:40 chờ góp ý người dùng; 02:54–10:28 lane idle) còn khoảng 14,7 giờ làm việc.
- 62 commit iOS (25 fix, 20 feat, 8 refactor, 6 test), 38 agent được tạo, 10 vòng sol review, 6 brief mới (84, 86, 88, 89, 90, 91) cộng góp ý trực tiếp (FAB).
- Mỗi lần sol chạy chỉ mất 4–10 phút (reviewer 21:59 → sol-4 lúc 22:03; sol-8 11:00 → 11:06; sol-10 16:40 → 16:50). Một chu kỳ sửa sau review đo được 73 phút ở vòng sol-10 (commit 16:55 → 18:08), nhưng **55,6 phút trong đó là một lệnh `xcodebuild test` bị treo** (mục 2b); phần việc thật chỉ khoảng 18 phút.
- Không có tiêu chí dừng. Từ vòng 7 trở đi cả 4 vòng đều CHƯA ĐẠT và mỗi bản sửa sinh ra phát hiện mới.

## 2. Dòng thời gian từng vòng

| # | Vòng | Bắt đầu → kết thúc | Thời lượng | Review sol | Ghi chú nghẽn |
|---|---|---|---|---|---|
| 1 | Brief 84, P1–P6 (khung màn, Grid điểm, PH TabView, cổng UI) | 10-24 16:46 → 18:31 | 1h45 | sol 1 (18:01) CHƯA ĐẠT, sol 2 (18:23) CHƯA ĐẠT, sol 3 (18:31) ĐẠT | Luna đăng nhập SE 3 qua clipboard GUI, bị từ chối; khóa 15 phút sau 5 lần sai. P2 kết thúc lượt khi test còn chạy, lead phải nhắc (lead log: "worker stopped mid-test"). Vòng gọn nhất. |
| – | Chờ góp ý người dùng | 18:31 → ~21:40 | ~3h10 | – | Không phải lỗi quy trình. |
| 2 | P7 chi tiết buổi (tab Điểm danh) | 21:45 → 22:28 | 45 phút | sol-4 (22:03) CHƯA ĐẠT, sol-5 (22:12) CHƯA ĐẠT, sol-6 (22:17) ĐẠT | 3 vòng cho 1 màn; vòng 5 và 6 chỉ vì thiếu ảnh SE 3 app thật (`review-sol-5.md`: "thiếu ảnh APP THẬT trên SE 3"). |
| 3 | Brief 86 (A chuẩn hoá, B theo màn, C Báo cáo theo khoảng buổi, D1 gửi phiếu cần mạng) | 23:40 → 01:31 (report) | ~1h50 | sol-7 (00:41) CHƯA ĐẠT: 3 Cao, 5 Vừa, 1 Thấp | **Sự cố đĩa**: còn 405 → 213 → 343 → 431 → 654 MiB. D1 và các sửa sol-7 được viết mà không biên dịch (`feedback-round2-report.md` dòng 64, 73). Verify sau (V1, worker F) tìm ra 2 lỗi thật: `device_id` không phải UUID khiến gửi phiếu luôn lỗi; chuỗi markdown. |
| 4 | Brief 88 (round 3 G1–G4) + gói H sửa review | 01:00 → 02:54 | 1h54 | sol (b143ba7) **lỗi**: hết hạn mức "đến 2:00 AM", chỉ còn bản nháp; sol re-review (1668b04) cũng không chạy | H chết vì lỗi mạng giữa chừng, lead phải kiểm lại. Lane sửa mà **không có review**. |
| – | Lane idle | 02:54 → 10:28 | ~7h35 | – | GL: "Lane iOS đang idle toàn bộ". Đồng thời sol đợi qua mốc 11:00. |
| 5 | Brief 89 bỏ điểm tối đa + FAB + J (5 lỗi sol-8) + K (chẩn đoán đăng nhập) | 10:28 → 12:36 | ~2h10 | sol-8 (11:06) CHƯA ĐẠT 4 Vừa + 1 Thấp; sol-9 (12:21) CHƯA ĐẠT 2 Vừa + 1 Thấp | K tốn nhiều lần thử đăng nhập vì flow Maestro dùng appId cũ `vn.quanlylop.app` trong khi bundle id đã đổi `com.study.teacherthu` ở 84c54a8 (`feedback-round3-report.md` mục L, dòng 76). |
| 6 | Brief 90 (xoá báo cáo) + 3 lỗi sol-9 | 11:39 → 12:35 (merge ed23487) | ~1h | (gộp sol-9) | Worker nhánh riêng, nhưng sau đó phải merge và sync pbxproj qua bản `/tmp` xcodegen (lead log). |
| 7 | Brief 91 (5 tiêu chí sao, báo cáo theo tháng, Mít 0–5) | 11:45 → 15:36 | ~3h50 | – | Mascot vẽ 3 lần (1 Sonnet SVG, 2 codex). Đây là làm lại phần báo cáo của brief 86 (xem điểm nghẽn 2). |
| 8 | L: FAB + test đầy đủ + smoke; sol-10 và sửa | 12:35 → 18:20 (L vẫn chạy) | ~5h45 | sol-10 (16:50) CHƯA ĐẠT 3 Vừa + 1 Thấp | 14 lần `xcodebuild` (9 `test` toàn bộ, 1 `-only-testing`, 4 `build`/`build-for-testing`) trong worker L (41d85590). Sửa 5 lỗi sol-10: 16:55 → 18:08 (73 phút), rồi smoke. |

## 2b. Số đo thật (transcript worker, từ 10-24 16:46)

Phương pháp: với mỗi lệnh Bash, thời lượng = mốc kết quả (lệnh chạy thẳng) hoặc mốc thông báo hoàn tất tác vụ nền (`<task-notification>`) trừ mốc bắt đầu. Phạm vi: các phiên trong 3 worktree `mvp-ios`, `ios-delete-report`, `ios-stars5`; chưa gồm phiên nằm ở thư mục `-private-tmp`. Script ở `/tmp/ks-audit/` (`xcb4.py`, `breakdown.py`, `gaps.py`).

**Build/test (`xcodebuild`)**: 61 lần chạy ≥10 giây, tổng 115 phút, trong đó 1 lần treo 55,6 phút. Bỏ lần treo còn khoảng 60 phút cho 60 lần. Trung vị mỗi lần dưới 1 phút.

| Loại | Số đo |
|---|---|
| Full test, DerivedData đã ấm, 156–194 test | 0,3–0,4 phút (18–25 giây) mỗi lần, giờ UTC 10-24: 10:10 (160 test), 11:04 (160), 16:18 (160), 17:15 (178), 18:17 (194) |
| Full test có biên dịch lại mã đổi | 2,6–3,9 phút (w92 09:11, w93 11:08 UTC) |
| `-only-testing` (cùng DerivedData, w93/w94) | 0,6–3,4 phút, trung bình ~1,5 phút, **không nhanh hơn full test ấm** |
| `build-for-testing` lạnh | 1,0–1,7 phút |

Hệ quả: thời gian chạy test thật chỉ là vài giây; chi phí nằm ở biên dịch mã vừa đổi và khởi động simulator, không phụ thuộc số test chọn chạy.

**Cơ cấu thời gian của các phiên worker** (không tính phiên lead): tổng đo được xcodebuild 2,1 giờ (1,2 giờ nếu bỏ lần treo), Maestro/simctl 1,8 giờ, công cụ khác 0,8 giờ, worker suy nghĩ/sửa mã ~2,9 giờ, và **~12,9 giờ là các khoảng không hoạt động >5 phút** giữa các lượt. Nghĩa là build + test chỉ khoảng 7–15% thời gian worker thực sự làm việc; tôi đã đánh giá quá cao ở bản đầu.

**Các khoảng chờ lớn nhất** (có mốc thời gian):
1. **Worker L chờ 198 phút** (12:38 → ~15:56): L kết thúc lượt với "Chưa chạy test và chưa smoke vì cả hai cần simulator iPhone 16 mà QA đang dùng". Phần việc bị chặn là một lần full test chỉ tốn 0,3–4 phút. Ngoài ra `build-for-testing` với `generic/platform=iOS Simulator` không cần simulator, nhưng `xcodebuild test` thì cần.
2. **Một lệnh `xcodebuild test` treo 55,6 phút** (17:10 → 18:05, worker L, brief 93). Lệnh đặt `timeout` 600000 ms nhưng kết quả chỉ trả về lúc 18:05 với thông báo "không hoàn tất trong 600s, đã chuyển nền"; xcodebuild thật sự xong lúc 18:07 (thông báo tác vụ nền). Nguyên nhân **chưa xác định** (nghi simulator bận hoặc máy tải nặng); không có log vì thư mục đã bị xoá.
3. **Worker H idle 361 phút** sau khi xong lúc 02:36 (không có brief mới, lane idle).
4. Hai lần worker H chặn 10 phút bằng `tail -f ... | grep -m1 EXIT` (01:56 và 08:41): đúng kiểu polling mà quy tắc cấm.
5. Phiên lead (c6067e41) dài 26 giờ, 25,4 giờ không có sự kiện, đúng mô hình chờ thông báo; không phải điểm nghẽn riêng nhưng cho thấy lead không bị chặn bởi việc của chính nó.

## 3. Điểm nghẽn, xếp theo tác động

### N1. Vòng review sol không có điểm dừng, mỗi bản sửa sinh phát hiện mới
- Kết quả: sol 1 CHƯA, 2 CHƯA, 3 ĐẠT, 4 CHƯA, 5 CHƯA, 6 ĐẠT, 7 CHƯA (9 phát hiện), 8 CHƯA (5), 9 CHƯA (3), 10 CHƯA (4). Hai lần ĐẠT đều là cổng "đủ ảnh", không phải "hết lỗi mã".
- Cùng loại lỗi lặp lại: "literal → token" ở `review-sol-8.md` #5, `review-sol-9.md` #3, `review-sol-10.md` #4 (3 vòng liên tiếp, mức Thấp, kiểm bằng grep được). "Gõ thêm bị ghi đè trong lúc chờ async" ở sol-8 #2 và sol-9 #1, rồi sol-10 #2 (kết quả tải đang bay ghi lại bản vừa xoá).
- Phát hiện mới đến từ chính bản sửa/tính năng mới: brief 90 (xoá báo cáo) gây sol-10 #1 và #2.
- Hệ quả: vòng 7–10 là 4 chu kỳ sửa–verify–review; thời lượng từng chu kỳ chưa đo đủ (chỉ đo được chu kỳ sol-10: 73 phút, trong đó 55,6 phút là lệnh test treo). Con số "4–5 giờ" ở bản đầu là ước đoán, đã bỏ.

### N2. Phạm vi liên tục đổi, báo cáo bị làm lại
- 6 brief trong 14 giờ (86 lúc 23:40, 88 lúc 01:00, 89 lúc 10:28, 90 lúc 11:39, 91 lúc 11:45) và reviewer luôn nhắm vào đích di động.
- Brief 86 mục C bỏ toàn bộ mã báo cáo theo tháng, đổi sang khoảng buổi (`feedback-round2-report.md` dòng 34: "Bỏ ... toàn bộ mã `MonthlyReport*`"). Brief 91 đưa báo cáo theo tháng trở lại và bỏ số buổi (`feedback-round3-report.md` mục O dòng 114: đợt `month`, "Tháng M/YYYY"). Cùng module `Reports/*` bị viết lại hai lần trong 14 giờ.
- Brief 89 bỏ điểm tối đa cũng chạm tab Điểm vừa sửa ở P2/FAB.

### N3. Đĩa đầy làm mất kiểm chứng rồi phải bù
- Đĩa còn 405 MiB lúc dọn (lead log), 213 MiB ở D2, 343 MiB, 431 MiB, 654 MiB. Mỗi worker tự build bản sao riêng trong `/tmp` (hiện còn 88 mục `qlh-*`; xoá hai bản `ux3-*` và `fb2-ab` mới giải phóng 2,3 GB). Đĩa hiện 95% dùng, còn 10 GiB.
- Hệ quả: D1 và các sửa sol-7 được commit không biên dịch; ~1h sau V1 mới build và tìm 2 lỗi thật. GL phải dọn đĩa và báo người dùng nhiều lần.

### N4. Một simulator, đăng nhập và harness mong manh
- iPhone 16 chia luân phiên giữa QA (slot ≤60 phút) và lane. Worker L bị cấm boot simulator cho đến khi GL báo lượt (prompt của lead cho L) và vì thế chờ 198 phút (đo ở mục 2b) cho một lần test tốn vài phút. **Đây là điểm nghẽn có số đo lớn nhất trong nhóm môi trường.**
- Nguyên nhân gốc của nhiều "đăng nhập thất bại" ở K: Maestro lái bản cài cũ do appId `vn.quanlylop.app` (mục L, dòng 76). Trước đó K đã thử nhiều lần (chạm theo id, chạm theo điểm, bỏ focus, log stream) tới hết số lần lead cho phép; phát hiện cuối là harness, không phải app. Cũng trong đợt đó: "Phải bấm Đăng nhập 2 lần vì lần đầu không phản hồi" (`feedback-round3-report.md` dòng 149).
- Ở P1/P7: đăng nhập SE 3 bằng clipboard GUI, khóa 15 phút; đăng ký PH bị 429 `retry_after` ~2100 giây (`feedback-round2-report.md` dòng 110), nên màn PH chưa bao giờ được chụp thật (còn trong "chưa xác minh" tới sol-10).
- pbxproj: file Swift mới phải sync qua bản copy `/tmp` có xcodegen (lead log "pbxproj needs to be synced ... via the /tmp copy").

### N5. Worker kết thúc lượt khi build nền còn chạy, lead phải đặt heartbeat và nhắc
- Lead tạo 38 agent và gửi 48 tin cho worker + 37 tin cho GL trong 25 giờ. Bằng chứng: P2 "kết thúc sớm khi test còn chạy" (lead prompt dòng 252); một worker kết thúc lượt sớm ở P7 (lead log dòng 1022); K kết thúc lượt giữa lúc build nền nhiều lần; K một mình cần 3 heartbeat 20 phút (`bc200d3f`, `f49de33f`, `76d7430e`); H chết vì lỗi mạng; thông báo kết thúc đến muộn gây hiểu nhầm ("stale wakeup", K idle nhưng còn chạy).
- Mỗi lần lỡ, độ trễ tối đa bằng chu kỳ heartbeat (15–20 phút), khoảng 6–8 lần trong lane.

### N6. Hạn mức sol
- sol-7 xong 00:41; sol 2 lượt tiếp (b143ba7 `error`, 1668b04) chạm hạn mức "đến 2:00 AM", nên gói H sửa mà không có review, và review kế tiếp (sol-8) chỉ chạy lúc 11:00. Phát hiện của sol-8 và sol-9 vì thế dồn lại cùng lúc.

## 4. Đề xuất (3–6 thay đổi)

Lưu ý: các con số "giờ tiết kiệm" dưới đây là ước đoán theo số vòng/lần chạy đếm được, chưa đo thời lượng thật.

1. **Điểm dừng review: tối đa 2 vòng cho mỗi lô giao.** Vòng 2 chỉ kiểm lại đúng danh sách phát hiện vòng 1 (đã làm ở "sol re-review 10 hẹp"); chỉ chặn nếu lỗi Cao hoặc Vừa tái hiện được từ phía người dùng. Lỗi Thấp ghi vào danh sách sau. Lợi ích: bỏ khoảng 2–3 chu kỳ, ≈ 3–4 giờ trên lane này. Rủi ro: lọt lỗi cạnh/đua; giảm bằng danh sách lớp lỗi ở mục 2.
2. **Cổng cơ học trước sol, thay cho việc sol bắt.** Một script `ios/scripts/check-ui-literals.sh` (grep literal kích thước/padding/radius trong `Features/**`) chạy cùng build; brief worker kèm checklist 3 lớp lỗi đã lặp: (a) giữ phần người dùng gõ khi ghi async, (b) khoá offline và 403 quyền chéo, (c) tải đang bay ghi lại thứ vừa xoá. Mỗi lớp có một test mẫu. Lợi ích: loại phát hiện lặp ở sol-8/9/10, ước 1–2 chu kỳ. Rủi ro: dương tính giả, cần allowlist.
3. **Đóng băng phạm vi theo lô, gom góp ý.** GL gom góp ý người dùng thành 2 lô/ngày; không mở brief mới khi lô đang trong review; trước khi code, xác nhận với người dùng quyết định nghiệp vụ dễ đảo (báo cáo theo khoảng buổi hay theo tháng, điểm tối đa, 5 sao). Lợi ích: tránh làm lại module Reports, ước 2–3 giờ. Rủi ro: người dùng thấy bản sửa muộn hơn.
4. **Bỏ đề xuất "test tăng dần giảm 30–50%".** Số đo (mục 2b) cho thấy full test ấm chỉ 18–25 giây, `-only-testing` không nhanh hơn (0,6–3,4 phút vì phần tốn là biên dịch và khởi động simulator). Không có lợi ích thời gian để đòi hỏi. Việc còn đáng làm, vì lý do đĩa chứ không phải thời gian: dùng chung một DerivedData cho lane thay cho 88 mục `/tmp/qlh-*`; full test sạch vẫn chạy một lần cuối lô.
5. **Hai việc về simulator, thay cho đề xuất 4 cũ (có bằng chứng đo):**
   a. **Cho lane một simulator riêng (clone iPhone 16) hoặc cho phép `xcodebuild test` chạy trên bản clone khi QA giữ máy chính.** Bằng chứng: worker L chờ 198 phút để chạy một lần test tốn 0,3–4 phút. Lợi ích đo được tối đa ≈ 3 giờ ở lần chờ này; rủi ro: clone tốn đĩa, QA và lane phải cài app khác nhau để không phá nhau.
   b. **Chặn treo lệnh test:** brief bắt buộc chạy `xcodebuild test` ở nền với đầu ra ra file và chờ bằng thông báo (không chạy thẳng trong lệnh có `timeout`), vì lệnh 17:10 đã khoá worker 55,6 phút trong khi `timeout` đặt 10 phút. Nguyên nhân treo chưa xác định nên đây chỉ là biện pháp giảm thiệt hại.
6. **Script tiền kiểm simulator, không cần đăng nhập.** `ios/scripts/sim-preflight.sh`: `simctl listapps` rồi gỡ bundle id lạ, đọc appId từ `project.yml` để mọi flow Maestro dùng chung một nguồn, boot, cài. Bước này **không gọi API đăng nhập nên không tốn lượt**. Bằng chứng giá trị: phiên K (123948bd) kéo dài 1,42 giờ, trong đó 0,51 giờ là Maestro/simctl, và nguyên nhân gốc cuối cùng là appId cũ. Lợi ích chắc chắn: loại lớp lỗi "Maestro lái bản cũ". Số giờ tiết kiệm không đo được chính xác.

   **Chi phí đăng nhập, chứng minh từ mã** (`worker/src/routes/auth.ts:318-357`, `worker/src/db/auth.ts:719-728`, nhánh worktree `mvp-backend`; giả định staging chạy cùng mã): mỗi lần gọi `/auth/login` đặt trước một lượt trong bộ đếm IP (giới hạn 20 lượt/15 phút, khóa 15 phút) rồi trong bộ đếm số điện thoại (5 lượt/15 phút, khóa 15 phút). **Đăng nhập đúng gọi `clearThrottle` cho SĐT và `refundThrottle` cho IP**, tức không tích lũy. Đăng nhập sai (`invalidCredentials`) giữ nguyên các lượt đã đặt: 5 lần sai cùng SĐT hoặc 20 lần sai cùng IP trong 15 phút thì bị khóa. Mọi agent chạy trên cùng một máy dùng chung bộ đếm IP. Đăng ký phụ huynh là bộ đếm riêng: 5 lượt/giờ theo IP (`REGISTER_IP_POLICY`), khớp với 429 `retry_after` ~2100 giây đã gặp. Kết luận: một lần đăng nhập đúng không tốn lượt; chỉ đăng nhập sai (sai appId, sai mật khẩu, nút không nhận chạm kèm gửi lại) mới tốn. Preflight nên kiểm bundle id trước khi đăng nhập để không đốt lượt vì lỗi harness.
7. **Giao thức lượt worker: không kết thúc lượt khi build nền còn chạy.** Brief ghi: build/test chạy foreground có `timeout` ≤ 10–15 phút hoặc dùng nền kèm chờ bằng thông báo; lead chỉ giữ **một heartbeat 10 phút cho cả lane** thay vì một cái cho mỗi worker. Reviewer dự phòng khi sol hết hạn mức (đổi sang kongming/codex khác) thay vì để lane tự sửa không review. Lợi ích: bỏ chừng 6–8 khoảng trễ 15–20 phút (≈ 2 giờ) và khoảng trống không review của gói H. Rủi ro: test dài hơn timeout, cần chia nhỏ.

## 5. Không kiểm được

- Cơ cấu thời gian ở mục 2b là số đo từ transcript worker; nó **không gồm** phiên lead (chỉ chờ) và phiên ở thư mục `-private-tmp`. Khoảng "không hoạt động >5 phút" gộp nhiều nguyên nhân (chờ lệnh của lead, chờ slot simulator, chờ thông báo, máy ngủ); chỉ ba khoảng chờ lớn nhất ở mục 2b được truy ra nguyên nhân.
- Nguyên nhân lệnh `xcodebuild test` treo 55,6 phút chưa xác định; log đã bị xoá.
- Phần chứng minh giới hạn đăng nhập đọc từ mã nhánh `mvp-backend`, chưa xác nhận bản đang chạy trên staging cùng commit.
- Con số "giờ tiết kiệm" ở các đề xuất 1–3 và 7 vẫn là ước đoán theo số vòng/lần chờ đếm được, chưa đo.
- Trong lúc làm bản sửa này tôi ghi file nháp ra `/tmp` (kết xuất log hoạt động và script ở `/tmp/ks-audit/`), ngoài file báo cáo; đã xoá kết xuất, giữ lại script.
- Mốc commit của vài commit sát nhau (ví dụ 11:06–11:11) lệch với `createdAt` của worker tương ứng, nên dùng khoảng gần đúng. Chưa đọc hoạt động của các worker đã archive ngoài L (41d85590), 91 (dcc5afa5), và phần lead ghi lại về chúng.
- Lead web (4a98689d) hiện làm nhiệm vụ khác (popup đóng khi bấm ngoài) nên không so trực tiếp; web có 31 commit từ 10-24 và 3 vòng `review-codex-r1..r3`, so với iOS 62 commit và 10 vòng sol.
- Không đọc `~/.config/qlh/*`, không chạy env/ps/lsof; không có thông tin đăng nhập, SĐT hay nội dung nhận xét trong báo cáo này.
