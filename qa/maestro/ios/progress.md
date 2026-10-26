# iOS Maestro progress — 2026-10-24 run

- Read `briefs/ios.md`, `briefs/common.md`, QA README, open questions, testcase files, spec scope, iOS flow sample, and iOS source configuration.
- Created a dedicated iPhone 16 simulator `iPhone 16` (UDID `21E43252-4FD1-4F15-9FE9-7904D2D6C035`). Cloning the already booted iPhone 16 was rejected by CoreSimulator; created a separate iPhone 16 device without stopping the existing simulator.
- Copied iOS source to `/tmp/qlh-qa-ios-20261024`, generated the Xcode project in that copy, and built the Staging app with ad-hoc signing and the staging API URL. Build succeeded.
- Installed and launched `com.study.teacherthu` on `iPhone 16`; normal app launch used (no demo-screen environment flag).
- `TC-AUTH-002` passed on the second run with the smoke account. The first run did not submit because the smoke file uses lower-case keys (`phone`, `password`); the successful flow loads these in-process and passes them through Maestro without printing their values.
- The first Maestro startup hit a full disk while writing logs; after the runner exited, available space recovered to 3.1 GiB. I removed only the QA `/tmp` source/build copies. The retry produced JUnit output.
- The app reached the login screen and the successful run verified `Lớp của tôi`; required identifiers are runtime-confirmed.
- Run artifacts go under `plans/20261021-mvp/qa/runs/2026-10-24/ios/`.

## Login attempt

- Maestro reached the live login screen, but its XCTest runner could not write `~/.maestro/tests/.../maestro.log` (`No space left on device`). No login submit was confirmed; no testcase is marked pass/fail from this attempt. Captured the current screen at `plans/20261021-mvp/qa/runs/2026-10-24/ios/auth-login-blocked.png`.
- Disk availability was 384 MiB before the attempt and decreased during runner setup; I removed only this run’s copied source and derived build folder after app installation.
- JUnit output was not produced. I will retry only after confirming the runner has exited and there is writable space.

## Class creation

- The first class flow created `QA-iOS-1025-A` and verified it appeared, but then failed on an incorrect `Buổi học` visibility assumption. This was a selector/flow issue, not an app failure.
- Updated the flow to check the class schedule and generated next-session indicator. `TC-CLS-001` passed for `QA-iOS-1025-B`; result: `plans/20261021-mvp/qa/runs/2026-10-24/ios/class-create-retry.junit.xml`.
- No app bug confirmed. Remaining P0 flows are still pending or marked manual/blocked in `status.tsv`.

## Session shell

- The first numbering attempt failed because the text selector expected `Buổi 1` as an exact label; the app exposes the full row text. Added a scroll to the target class and a regex text selector.
- `TC-ATT-010` passed: the session detail showed the three peer tabs `Điểm danh`, `Nhận xét`, and `Bài tập về nhà`, and no save error. JUnit: `plans/20261021-mvp/qa/runs/2026-10-24/ios/session-tabs.junit.xml`.
- The run also confirmed a generated session numbered `Buổi 1`, but did not verify every session number in the class; `TC-CLS-006` remains unrun.
- Applied the QA lead's updated `TC-CMT-012` requirement: draft saves while offline, class-wide send must be disabled with a network-required message. No offline run yet.

- `TC-CLS-006` passed against `QA-iOS-1025-B`: the flow expanded the 15 upcoming sessions and verified every generated session from Buổi 1 through Buổi 16 is consecutively numbered. JUnit: `plans/20261021-mvp/qa/runs/2026-10-24/ios/session-numbering-full.junit.xml`.


## Huỷ buổi và dừng vì dung lượng

- `TC-CLS-007` trước đó không qua được selector menu ở ba lượt (hai selector chữ và một tọa độ), không có bằng chứng lỗi app. Theo yêu cầu mới của lead, selector đã đổi sang regex `/Hủy/`; flow được chuyển về `tự động-chưa-chạy` vì chưa được phép chạy lại. JUnit cũ: `plans/20261021-mvp/qa/runs/2026-10-24/ios/cancel-session-renumbers-final.junit.xml` (selector cũ).
- Dọn các log, ảnh và thư mục XCTest runner tạm đã hoàn tất thuộc lượt QA này trong `/tmp`/`$TMPDIR`. Không xoá artefact của lượt khác hay artefact trong lượt đang chạy.
- Sau dọn, `df -h /` báo còn 312 MiB (<500 MiB). Đã dừng mọi lượt test tiếp theo theo yêu cầu GL. Các TC chưa chạy, gồm cập nhật offline `TC-CMT-012`, giữ trạng thái chưa chạy.
- Tổng kết lượt chạy trước: 4 TC pass (`TC-AUTH-002`, `TC-CLS-001`, `TC-ATT-010`, `TC-CLS-006`); selector cũ của `TC-CLS-007` fail. Chưa chạy hết phạm vi P0; không xác nhận được toàn bộ iOS suite.


## Authoring update — no simulator or Maestro execution

- Theo chỉ đạo lead mới, không mở simulator, build, chạy Maestro, hoặc tạo run artifact cho tới khi lead cho phép; dung lượng đĩa vẫn là điều kiện dừng.
- Đổi selector của `TC-CLS-007` sang regex `/Hủy/`; chưa chạy xác minh. TC được để `tự động-chưa-chạy`.
- Đã thêm flow draft cho các testcase iOS P0/P1 còn thiếu và bổ sung status rows cho TC mới/TC bị thiếu. Các file mới ghi rõ tiền điều kiện, bước và kết quả từ testcase, nhưng hiện chỉ là shell `launchApp` với TODO; interaction/selector/assertion thực tế chưa hoàn thiện hoặc xác minh. Giữ trạng thái `tự động-chưa-chạy`.
- Đọc lại thay đổi testcase: `TC-RPT-008` (nhận xét chung cần mạng; preview popup/sheet), `TC-RPT-013` (chỉ PDF; thao tác OS ngoài tầm Maestro, để thủ công), `TC-RPT-017` (offline không lưu, báo cần mạng và giữ nội dung), `TC-CMT-012` (soạn phiếu lưu offline nhưng gửi lớp bị khoá), `TC-OFF-008` (các thao tác cần mạng bị chặn). Flow draft/comment và trạng thái khớp các yêu cầu này; chưa có run.
- Cập nhật `required-ids.md` với các ID cần cho luồng còn lại, đánh dấu rõ đây là đề xuất chưa runtime-verified.
- Các ca thủ công trong `status.tsv` có lý do cụ thể; riêng `TC-RPT-013` nêu giới hạn OS share sheet. Không xác nhận lỗi app mới.

- Tổng cộng đã tạo 115 flow draft cho các testcase P0/P1 iOS còn thiếu. Kiểm tra tĩnh xác nhận không thiếu status row P0/P1 iOS/Cả hai và không có đường dẫn flow gãy; không chạy test/build/simulator trong bước này.


## TC-CLS-017 — tạo lớp chỉ học Chủ nhật

- Đọc testcase `qa/testcases/classes-schedule.md`; đã thêm flow `classes/create-sunday-class.yaml` và status `tự động-chưa-chạy`.
- Flow chọn ngày `CN` (mã iOS 7 theo source), đặt giờ 18:00, tạo lớp và kiểm tra lịch `CN · 18:00` cùng chỉ báo buổi tới. Đây là kiểm tra tạo lớp ở iOS nhằm đối chiếu lỗi WEB-002.
- Chưa chạy theo lệnh lead; không mở simulator, không chạy Maestro, không tạo JUnit/ảnh.


## iOS resumed run — 2026-10-25

- Confirmed `df -h /` before the test runs; free space stayed at 4.4–4.5 GiB (above the 1.5 GiB stop threshold). Used the existing `iPhone 16` simulator only. No app source changes.
- Built from the current `mvp-ios` HEAD snapshot with ad-hoc signing, installed `com.study.teacherthu`, and removed the temporary build copy after install. `TC-AUTH-002` login passed; JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth-login.junit.xml`. One login submission this run.
- `TC-CLS-001`: two current-run attempts failed on selectors (`T2 · T5 · 18:30`, then `Buổi học`). Screenshots show normal app UI after relaunch; no app defect confirmed. Historical pass remains in prior run notes, while `status.tsv` records this latest flow failure.
- `TC-CLS-017`: first retries failed because Maestro could not select wheel values `00`/`18:00`. Screenshots confirmed `CN` selected and the picker visually at `18:00`. The final flow submitted the class, but its expected `CN · 18:00` list selector did not match; hierarchy at failure showed no matching iOS class row. Treat as inconclusive selector/data visibility, not a confirmed app bug. JUnit and screenshots are in `cls017-sunday-class-*.junit.xml` and corresponding output folders.
- `TC-CLS-007`: initial updated regex `/Hủy/` did not match the visible confirmation action. A coordinate confirmation allowed the cancel action to complete; failure screenshot visibly shows `Buổi học · 29/10` and `Buổi này đã hủy`. The flow stopped at a selector assertion before verifying renumbering, so the testcase is not a pass. Evidence: `cancel-session-renumbers-current.junit.xml` and `cancel-session-renumbers-coord.junit.xml`, with output screenshots.
- No iOS bug was filed: observed failures are selector/flow mismatches or insufficient evidence. Most other P0 status rows still point to draft flows (`launchApp`/TODO) or manual blockers, so they were not represented as meaningful passes. Guardian registration was not run because it is last in the sequence and the remaining P0 suite was not executable as authored.
- The staging account's visible workspace contains existing `QA-Web-*` data; a fresh isolated QA workspace was not established. This leaves possible cross-lane data interference and is recorded as a coverage concern. No phone numbers or comment text were written to reports.


## Auth P0 group — resumed QA 2026-10-25

- `TC-AUTH-002` passed again on the current app; JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth-p0.junit.xml` and `auth-p0-retry.junit.xml`. The current session is back in the smoke teacher workspace.
- `TC-AUTH-001` now has real UI steps for teacher signup, but the two attempts did not verify the expected class-list landing: first attempt stopped on a text selector that Maestro could not resolve; the coordinate retry reached the submit/result assertion but `Lớp của tôi` was not visible. No app bug filed without a confirmed result screen.
- `TC-AUTH-003` has a real wrong-password flow drafted, but did not submit: its attempt started while the prior registration flow had failed and was still on the auth screen, so its precondition assertion failed. It remains unrun. No wrong-password submission occurred.
- Count for this group: 1 pass, 1 failed/inconclusive registration flow, 1 unrun. Two successful smoke login submissions total across these auth attempts; no further login submit will be made this run. Guardian registration cases remain deferred to the final group per lead order.
- Maestro login/register link text was visible in the UI but not exposed to the text selector; requested `login.registerTeacher` and `register.submit` IDs in `required-ids.md`.


## CLS P0 group — first authored run 2026-10-25

- Ran five flows (`TC-CLS-001`, `TC-CLS-006`, `TC-CLS-016`, `TC-CLS-007`, plus required Sunday case `TC-CLS-017`) on the assigned `iPhone 16`; free space was 4.2 GiB before the group. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/cls-p0.junit.xml`.
- All five stopped at class-card discovery. The anchored exact-name selector did not match the SwiftUI card’s aggregated accessibility text; `TC-CLS-001` also waited on the class name before confirming the form had left. These are flow/selector failures, not confirmed app defects.
- Updated the flows to first confirm return to the class list and scroll to the fixture from the top; target the class card through its unique schedule text/plain fixture text. Next run will use a new `QA-iOS-` fixture name.
- `required-ids.md` now requests stable class card/schedule and session row IDs; the app source does not currently assign these IDs. The Sunday time wheel has no value ID (only a localized button label), so its selection remains coordinate-based.


## CLS P0 group — selector retry R3 — 2026-10-25

- JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/cls-p0-r3.junit.xml`; 5/5 flows failed at the “Buổi học” assertion. Available space was 3.8 GiB before and 3.6 GiB after.
- Failure screenshots show the app remained on the persistent `Lịch` tab after `launchApp`; the flows assumed the `Lớp` tab. This is a navigation setup/selector issue, not evidence of an app regression. Added an explicit `Lớp` tab step and changed the fixture for the next class attempt.
- `TC-CLS-017` prior screenshot from the R2 run visibly showed the created fixture card with `CN · 18:00` and “Buổi tới: Chủ Nhật 25/10 · 18:00”; the retry also needs to enter class detail and inspect the session. No app bug filed.


## CLS P0 group — selector retry R4 — 2026-10-25

- JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/cls-p0-r4.junit.xml`; 5/5 flows reached class detail and expanded upcoming sessions, then failed to find the first session.
- Failure screenshots show the session list was scrolled to entries 11–16 after the flow searched downward for Buổi 1/2. The class/detail navigation and disclosure tap worked; this is an initial-scroll direction issue, not a confirmed app bug. Reset the detail list to the top before checking numbered sessions for the next retry.
- Available space after the group: 3.4 GiB. The Sunday class card with `CN · 18:00` was already visually confirmed in R2; current flow now opens it in class detail as required.


## CLS P0 group — selector retry R5 — 2026-10-25

- JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/cls-p0-r5.junit.xml`; 5/5 flows failed. Pre-run free space was 3.4 GiB; after the run 3.1 GiB remained.
- CLS-001/006/016/007 reached the class detail and opened the upcoming-session list. Screenshots show the rows on screen, but Maestro cannot resolve the visible row labels (`Buổi 1`/`Buổi 2`) to text selectors, even after resetting scroll to the top. No app behavior bug is confirmed.
- CLS-017 still ends on the Calendar tab after its attempted navigation; the earlier R2 screenshot visually proves the QA-iOS Sunday card and `CN · 18:00`, but the latest flow did not prove the detail view. Do not count as pass.
- Repeated selector/navigation retries exhausted this CLS milestone. Requested stable `session.upcoming.toggle` and `session.row.<sessionId>` IDs are recorded in `required-ids.md`. No app files or QA-Web data were changed.

## P0 authoring follow-up — waiting for accessibility IDs — 2026-10-25

- Lead returned the iPhone 16 simulator to another lane and directed no further simulator/Maestro use. No simulator, build, or Maestro command was run for this update; only QA files were edited.
- Replaced all 55 P0 launchApp/TODO shells with interaction flows. The P0 inventory has 64 iOS/Cả hai cases: 63 now have concrete flows and assertions; TC-OFF-005 remains manual because the exact mid-sync network cut and second-device confirmation require coordinated operation. Eight P0 cases already had interaction flows; two remain recorded as previously passed (TC-AUTH-002 and TC-ATT-010).
- Added shared flows in `qa/maestro/common/` for teacher/guardian login, role entry, logout, and opening the QA-iOS shared class/session. Category flows use these shared subflows and fixture names prefixed `QA-iOS-`.
- Updated `status.tsv`: 61 automated P0 cases are `tự động-chưa-chạy (chờ id: …)` pending selectors GL has not added; the two verified cases retain `tự động-pass`; TC-OFF-005 is `thủ công` with its coordination reason. No test is marked pass based only on launchApp.
- Expanded `required-ids.md` with the selector names/patterns these flows consume. `TC-CLS-001/006/007/016` now wait for class/session IDs after the earlier selector failures; those historical runs remain documented above and no app bug was filed.
- Static validation parsed all 133 iOS/common Maestro YAML files and checked every `runFlow` file reference: 0 YAML errors, 0 broken references, 0 P0 draft shells, 0 missing P0 status rows. Runtime behavior remains unverified until GL adds the requested IDs and the simulator lane is available.


## Test score spec update — 2026-10-25

- Updated `TC-TST-001/002/003/007/008` flows for tests with no maximum score and valid values 0..1000 in increments of 0.5. Flows cover creating/editing tests without a maximum-score field, boundary/step validation, retaining score 15 after edit, and saving 20/100.
- Added interaction flows for `TC-TST-018` (cancel/confirm default 15, overwrite, visible roster, reload) and `TC-TST-019` (offline local save and sync). The second-session/server-history part of TC-TST-019 is explicitly left as a manual verification.
- Rewrote `TC-GRD-004` for raw scores 10 and 12, +20% change, ungraded/archived entries, and absence of class average and maximum-score presentation.
- Removed obsolete maximum-score selector requests; added proposed IDs for score range/step errors, default assignment confirmation, edit fields, and guardian score presentation. `status.tsv` keeps these cases unrun pending requested IDs/fixtures; TC-TST-019 also needs manual second-session verification.
- Static YAML parsing/reference checks only; no simulator, build, or Maestro execution was performed.


## P0 run attempt — 2026-10-25, mvp-ios 268cbd5

- Checked `/` before build/run; free space started at 5.2 GiB. Built the committed `ios/` source snapshot from HEAD `268cbd59b4ffc9ac0bc3741cf8a8c9f49052cfdf` in `/tmp`, copied the existing Xcode project definition into that copy, used Staging + ad-hoc signing, and build succeeded. Installed `com.study.teacherthu` on the existing `iPhone 16` simulator (`CF871F97-1789-4490-B3E3-0B5EFA39F23F`). Removed the temporary source and DerivedData after install; the four pre-existing modified worktree resources were not changed.
- Initial AUTH flow found the simulator already signed into the smoke teacher workspace, so its login-screen assertion failed before any submit. The visible `Cài đặt` → `Đăng xuất` selectors worked. Source/hierarchy comparison confirmed `login.phone`, `login.password`, `login.submit`; root settings and logout have no stable IDs, so `ios-logout.yaml` and dependent flows now use observed text. Parent signup uses `guardian.register.submit` and visible text `Tạo tài khoản phụ huynh`; `guardian.childSwitcher` is the actual source ID. Updated those known mismatches in flows and `required-ids.md`.
- Fresh teacher login with each of the two allowed smoke accounts returned the app's generic invalid-credentials response. Total login submits: 2; stopped without further auth attempts. No other P0 group could run without an authenticated session. This is treated as a staging-credential blocker, not an app bug; `qa/bugs.md` was not changed.
- `status.tsv`: 60 P0 cases are blocked by sign-in, TC-CLS-017 is also blocked as explicitly requested, TC-OFF-005 remains manual, and the four P0 TST cases named for this run remain skipped. No P0 case passed or failed as an app behavior this run. Other TST IDs explicitly excluded by the lead were not run.
- JUnit reports are under `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/`. Retained the initial-session screenshot; removed login screenshots with phone-field text and transient Maestro JSON/HTML/hierarchy artifacts after diagnosis. Sanitized text output to ensure no smoke phone/password remains. Removed seven completed XCTest runner temp directories created during this run.
- Static validation parsed 135 iOS/common YAML files and checked subflow references: 0 syntax or reference errors. Simulator/Maestro execution stopped at the auth blocker.
- Static comparison also found class-create selectors requested but absent in HEAD. Updated the class-creation flows to the visible labels confirmed by source/live hierarchy (`Tạo lớp mới`, `T2`, `T5`, `Tạo lớp`) and schedule text, and updated source-vs-request notes in `required-ids.md`. These selector changes were not runtime-verified because the credential blocker prevented reaching the teacher workspace.


## iOS P0 retry — blocked before login — 2026-10-25

- Lead returned the existing `iPhone 16`; confirmed it was booted, `com.study.teacherthu` was installed, and free disk space stayed above 4 GiB. No app rebuild was performed.
- Corrected `qa/maestro/ios/README.md` to parse the actual `key=value` credential files, normalize the phone to 9 digits, and target the existing simulator UDID. Static shell syntax check passed.
- Maestro 2.2.0 reported `0 devices connected`; with the simulator UDID it reported that the requested device was not connected. A no-credential login-screen probe reproduced the device-discovery block. The login flow did not execute; submits sent to the app: 0. No credential rejection was observed, and the second account was not attempted.
- No P0 case ran. Updated the previously sign-in-blocked rows in `status.tsv` to the current Maestro device-connection blocker. No app bug or screenshot was recorded. Detailed run note: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/maestro-device-connection-blocked.md`.


## AUTH P0 group — simulator access restored — 2026-10-25

- Used the lead-confirmed command shape `maestro --udid <UDID> test ...`. The first login-flow invocation found an existing teacher session and failed at the `login.phone` visibility assertion; command history confirms it stopped before input/submit. Hierarchy showed the teacher home screen.
- Ran shared logout flow successfully, then ran `auth/login.yaml` with the primary smoke account once. JUnit passed (1 test, 0 failures): `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/auth-login-primary-after-logout.junit.xml`. The valid-login submit cap for this account is now used.
- AUTH status: TC-AUTH-002 passed. TC-AUTH-003 is blocked by the one-submit limit; TC-AUTH-001 awaits valid QA fake-phone fixture/registration IDs; TC-AUTH-007/008 await backend confirmation for PH registration; TC-AUTH-009 depends on that PH account. Full TC-AUTH-019 is deferred until the end because it ends the active teacher session.
- No app bug recorded. App was not rebuilt. Updated README to use the confirmed global `--udid` argument.


## iOS P0 tiếp tục — kết nối đã xác nhận — 2026-10-25

- Chạy `df -h /` trước kiểm tra; dung lượng trống 3.2 GiB. `~/.maestro/bin/maestro --udid CF871F97-1789-4490-B3E3-0B5EFA39F23F hierarchy` chạy thành công trong 23.8 giây từ `/tmp`. Không build/cài lại app.
- Phiên teacher hiện hoạt động; `TC-AUTH-002` đã có JUnit pass trong lượt trước. Không gửi thêm đăng nhập cho tài khoản primary.
- Đối chiếu lại JUnit `cls-p0-r5.junit.xml`: 5/5 ca CLS chạy nhưng dừng ở selector/UI automation; TC-CLS-001/006/016 không xác minh được hàng buổi, TC-CLS-007 chưa xác minh được đánh số lại, TC-CLS-017 chưa chứng minh chi tiết lịch trong lượt mới. Ảnh lượt CLS trước từng cho thấy thẻ Chủ Nhật `CN · 18:00`; chưa tính TC-CLS-017 pass. Không có lỗi app đủ bằng chứng, `qa/bugs.md` không thêm mục mới.
- Hierarchy ở màn hiện tại không chứa các ID học sinh, gán điểm mặc định, PDF hoặc màn đăng nhập; đây chỉ là ảnh chụp hierarchy của màn hiện tại, không chứng minh ID vắng khỏi toàn app. Các suite STU/ATT/CMT/HW/TST/RPT/OFF/PRM/GRD cần fixture QA-iOS và ID/điều kiện tiền đề chưa được xác nhận; không chạy flow có thể sửa dữ liệu khi chưa có fixture thích hợp. Dòng status lỗi thời “Maestro không kết nối” đã được thay bằng trạng thái chưa chạy có lý do; dòng CLS ghi riêng lỗi selector.
- Ca PH cuối suite chưa chạy: chưa có xác nhận backend đã mở lượt đăng ký. Không chạy P1 hay các ca thủ công.


## iOS P0 CLS — resumed attempt — 2026-10-25

- Before the attempts, `/` had 2.8 GiB free. Existing teacher session remained active; no additional login submit.
- A UI fixture-create flow for `QA-iOS-P0-CLS001-20261025-R2` closed the form, but the class title did not appear to Maestro after 23 upward-content swipes; JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/classes/TC-CLS-001-current.junit.xml`, screenshot retained. This is inconclusive between list visibility and save, not a confirmed app bug.
- Hierarchy exposed `class.card.<uuid>` / `class.schedule.<uuid>` and actual schedule labels such as `T2 · 18:00` and `Buổi tới: …`; class names were exposed only for rows in the current viewport. A test referenced a dynamic card ID after the hierarchy changed; Maestro returned `Unknown error`. The follow-up label tap also returned `Unknown error`. No data-changing action was sent to QA-Web records.
- TC-CLS-001/006/007/016/017 remain blocked/inconclusive for selector/fixture access. JUnit evidence: `TC-CLS-001-hierarchy-retry.junit.xml`, `find-own-class.junit.xml`, `TC-CLS-017-open-sunday.junit.xml`, `TC-CLS-017-open-sunday-label.junit.xml`. No iOS bug filed because evidence does not distinguish list visibility from app behavior.


## iOS P0 dependency status — 2026-10-25

- Fixture attempts through the class form closed the form but did not produce a QA-iOS class title accessible in the list after long scroll. The failure screenshots show only other lanes’ rows; none were opened or modified. Without a verified QA-iOS class/session, STU/ATT/CMT/HW/TST/RPT/OFF flows would target missing preconditions, so each dependent P0 row now records a concrete blocked reason. No comment text was entered, no report/PDF was created, and no offline/network toggle was attempted.
- Parent/guardian cases remain blocked because the registration lane is actively using the backend window; no PH registration or login was attempted.
- Next independent P0 probe is PRM-001; no additional login submit will occur.


## iOS P0 — dừng theo ngưỡng dung lượng — 2026-10-25

- PRM-001 first run failed before any settings assertion because `class.create` was not in the live UI hierarchy. Updated the flow to use the hierarchy-confirmed visible label `Tạo lớp mới`. Before the retry, `df -h /` showed 1.4 GiB free (<1.5 GiB), so sent Ctrl-C immediately; no retry result is claimed. JUnit for the first run: `plans/20261021-mvp/qa/runs/2026-10-25/ios/permissions/TC-PRM-001.junit.xml`.
- No further simulator/Maestro commands after the disk threshold. P0 STU/ATT/CMT/HW/TST/RPT/OFF remain blocked on a verified QA-iOS class/session/roster fixture; PRM-001 retry is blocked by disk. PH registration/grading remains blocked because its lane is active. Existing `TC-AUTH-002` pass is unchanged. No app bug filed.


## iOS P0 resumed — PRM-001 — 2026-10-25

- Start-of-run disk check: 1.9 GiB free. Ran `TC-PRM-001.yaml` on the existing `iPhone 16` teacher session, without login. The hierarchy-confirmed `Tạo lớp mới` label worked and `class.name` became visible; the flow then failed at `assertVisible id: class.save`. JUnit: `plans/20261021-mvp/qa/runs/2026-10-25/ios/permissions/TC-PRM-001-selector-retry.junit.xml`; failure screenshot is retained at `plans/20261021-mvp/qa/runs/2026-10-25/ios/permissions/TC-PRM-001-selector-failure.png`; temporary hierarchy/command artifacts were cleaned. Mid-run disk check: 1.8 GiB free. Status is recorded as failure pending hierarchy check; no app bug filed yet.

- PRM hierarchy diagnosis: form exposes `class.name` and the submit control as accessibility text `Tạo lớp`; no `class.save` identifier is present. Corrected the flow selector to the observed label. One retry remains; no product bug inferred from the absent ID.


- Second PRM attempt was prevented by the required disk gate: immediately before invocation `df -h /` showed 749 MiB free (<1.2 GiB); sent Ctrl-C before Maestro actions. No additional simulator actions will run in this turn. Hierarchy confirmed the true form submit label `Tạo lớp`; `class.save` was an obsolete selector. The retry remains blocked, not an app failure. Updated remaining unrun STU/ATT/CMT/HW/TST/RPT/OFF rows to blocked with the shared fixture/disk reason; existing deliberate spec/manual waits remain unchanged.


## iOS P0 static preflight and plan — 2026-10-25

- No simulator, Maestro, xcodebuild, simctl, or Chromium command was run. Added `preflight.sh`: resolves the app bundle id through the app target in `ios/project.yml` and its Staging xcconfig include, requires a booted iPhone 16 at the supplied UDID, checks for at least 1.5 GiB, lists installed bundle IDs, removes non-Apple apps other than the target, and makes one login attempt after logging out an existing teacher session. Credentials and run artifacts are held in variables/private temp storage and are not printed.
- Audited 126 iOS YAML files. All use `com.study.teacherthu`; no old bundle id, `class.create`/`class.save` ID, or visible `Buổi 1/2` selector remains. Replaced stale session-number text selectors with weekday/date labels; Sunday flow checks the observed upcoming Sunday line and `CN · dd/mm` detail label. Static YAML parse passed.
- Added `p0-run-plan.md` for a 39-minute teacher smoke path plus a 4-minute parent reserve; parent cases remain blocked while the registration lane is occupied. Corrected TC-CLS-001 fixture name to match the shared-class opener and isolated TC-TST-018 data as `QA-iOS-P0-Test-Default`. `bash -n qa/maestro/ios/preflight.sh` passed.


## iOS P0 attempt — mvp-ios 0fbdf35 — 2026-10-25

- Start disk check: 11 GiB free (above the 4 GiB gate). The shared mvp-ios worktree was at another commit and already had modified resource files, so built from a clean `git archive` of `0fbdf358e3266d1bdd9035f4352c231c7214cfbb` in `/tmp`, Staging + ad-hoc signing. Build succeeded; verified bundle id `com.study.teacherthu`; installed on the assigned iPhone 16 UDID. Removed the temporary source copy and DerivedData after install.
- `preflight.sh` was adjusted so an already authenticated session is reused without logout or another login submit; `simctl listapps` output is OpenStep plist, so the first preflight stopped at parsing before login and was corrected to convert plist to JSON. The second preflight reached login, used the single allowed submit, then returned failure. Private output was discarded by the script; did not retry or run P0. This does not distinguish a staging credential rejection from a Maestro/login harness failure, so no app bug is filed.
- AUTH-002 is blocked for this run after the single failed preflight. Planned teacher P0 rows were marked blocked because no authenticated session/QA-iOS fixture was available. No P0 product pass/fail, screenshot, or JUnit was produced.
- Added TC-CMT-017 with synthetic 301-character input and a flow using source-confirmed `comment.sentence`, `comment.tooLong`, `comment.counter`, and `comment.save` IDs. Its runtime text-selection menu label and visual red counter remain unverified. Added TC-RPT-023; it is blocked because no PH availability was confirmed and the scenario needs a second concurrent client.
- Parsed both new Maestro YAML files with PyYAML, verified the synthetic value is exactly 301 characters, confirmed unique status IDs, and passed `bash -n` for preflight. Disk remained 12 GiB free. Shut down the assigned simulator with `xcrun simctl shutdown`; no build tree, screenshots, or private preflight artifacts remain.


## iOS P0 preflight diagnostic retry — 2026-10-25

- Continued within the original 45-minute window (about 10 minutes elapsed at stop). Disk was 12 GiB free; booted only assigned iPhone 16 and confirmed `com.study.teacherthu` remained installed from the previously built clean `0fbdf35` snapshot.
- Updated `preflight.sh` to retain only filtered Maestro error/step lines, redact `inputText`, digit sequences of nine or more, and the password from error lines; it then records only hierarchy flags. `bash -n` passed.
- The one additional primary-account preflight submit failed. Sanitized artifact: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/preflight-diag.txt`. Flags: login.phone=yes; saveStatus.error=no; login_error_label=no; home_Lop_cua_toi=no. Maestro emitted only a failed-flow summary, so there is no failing step detail to report. No retry or P0 flow was run.
- Shut down the assigned simulator. No app bug inferred; the remaining evidence does not distinguish credential rejection from harness behavior.


## Static login-flow diagnosis hardening — 2026-10-25

- Added `hideKeyboard` before submit and conditional scrolling only when `login.submit` is not visible; removed the fixed swipe from `auth/login.yaml`. Applied the same keyboard/conditional-scroll handling to `common/ios-teacher-login.yaml`.
- Both flows now use an `onFlowComplete` failure branch gated on visible `login.phone` and absent `Lớp của tôi`; it clears both credential fields, hides the keyboard, then takes a named screenshot. `preflight.sh` copies only that named screenshot into the auth run directory and records whether it was found. Its filtered hierarchy flags remain the diagnostic source.
- Static YAML parse and `bash -n` passed. No simulator, Maestro, xcodebuild, or simctl command was run.


## iOS P0 preflight — mvp-ios 5227fe8 — 2026-10-25

- Start disk check: 11 GiB free. Built Staging + ad-hoc from a clean archive of `5227fe8087cd29bd0e52c9673c6853069c6b240b`, verified `com.study.teacherthu`, installed on the assigned iPhone 16, then removed temporary source and DerivedData.
- Preflight ran once and its one login submit failed. Filtered artifact: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/preflight-diag.txt`; flags show login screen remains and no visible save/login error or home label. Maestro emitted only the failed-flow summary. No P0 flow ran.
- The failure hook did not produce its named PNG. A sanitize-only capture flow cleared both fields, then `hideKeyboard` failed; a direct screenshot showed a phone-shaped placeholder in the blank phone field. Deleted that image and retained no unsafe screenshot. No login submit occurred in the capture flow.
- Simulator shut down. No app bug filed; this run remains blocked at AUTH-002.


## iOS P0 final authorized attempt — signed 5227fe8 — 2026-10-25

- Start disk check: 10 GiB free. Built clean `5227fe8087cd29bd0e52c9673c6853069c6b240b` Staging simulator app with `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual`; `codesign` confirmed `Signature=adhoc` before and after install. Uninstalled the prior app, installed the new build on the assigned iPhone 16, and removed the temp source/DerivedData.
- Preflight signature gate passed; one login submit failed. Filtered artifact: `plans/20261021-mvp/qa/runs/2026-10-25/ios/auth/preflight-diag.txt`. Flags: hierarchy_available=no; login.phone=no; saveStatus.error=no; login_error_label=no; home_Lop_cua_toi=no. No named screenshot was produced. No retry and no P0 flow run.
- Shut down the simulator. No app bug filed; AUTH-002 remains blocked because the hierarchy is unavailable and the failure cannot be attributed to app behavior.

## Chốt lượt 2026-10-25

- iOS P0: blocked: cần đăng nhập tay hoặc XCUITest xác nhận. Ba lần preflight trên bản cài mới (kể cả ký ad-hoc) không vào được; lượt cuối `hierarchy_available=no`. 0 pass, 0 lỗi app.
- `preflight.sh` gỡ app non-Apple trên simulator theo yêu cầu GL (đã kiểm: chỉ trên UDID được truyền); reviewer đề nghị allowlist, giữ nguyên theo quyết định của GL.
- Artifact đăng nhập cũ có credential dạng chữ rõ đã bị xoá (không có trong git); đổi credential smoke là quyết định của GL.
