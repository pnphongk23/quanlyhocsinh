# UI save behavior check

Capture: local mock API at :5192; viewport 390×844 and 1440×900; base HEAD cc493a5. Verification included concurrent unstaged A-fix changes in src/features/classes/EditClassModal.tsx and src/features/homework/HomeworkPanel.tsx (not edited by this task). No staging credentials or production data used.

**158 pass · 0 fail · 24 info**

| Result | Type | Assertion / measurement | Evidence |
|---|---|---|---|
| PASS | — | Attendance opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm danh","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div role=\"group\" aria-describedby=\"_r_0_\" class=\"_actionFooter_1gasx_444 _stickyBar_1ji37_328\"><p id=\"_r_0_\" class=\"_actionHint_1gasx_499\">Chưa có thay đổi để lưu</p><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29\" disabled=\"\" aria-live=\"p"} |
| PASS | — | Attendance change enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu điểm danh","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444 _stickyBar_1ji37_328\"><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\">Lưu điểm danh</button></div>"} |
| PASS | — | Attendance 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Attendance 390 · double click counts | push=1; commands=8; outbox=0→8→8; direct writes=0 |
| PASS | — | Attendance 390 · one write request | expected one push request or 8 outbox command(s) for one logical write; push=1, commands=8, outbox delta=8 |
| PASS | — | Attendance 390 · aria-busy painted ≥350 ms | painted=true; duration=407.8 ms |
| PASS | — | Attendance 390 · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Attendance UI changed | changed status should remain visible after save |
| PASS | — | Dirty navigation shows confirmation | expected dialog 'Chưa lưu thay đổi' |
| PASS | — | Stay keeps URL | URL must remain unchanged after 'Ở lại' |
| PASS | — | Attendance leave URL unchanged | expected stay on session after confirmation |
| PASS | — | Attendance opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm danh","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionsRow_11vsb_278\"><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _secondary_1gasx_45\" aria-live=\"polite\">Tất cả có mặt</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23\" disabled=\"\" aria-live=\"polite\">Lưu đ"} |
| PASS | — | Attendance change enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu điểm danh","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionsRow_11vsb_278\"><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _secondary_1gasx_45\" aria-live=\"polite\">Tất cả có mặt</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23\" aria-live=\"polite\">Lưu điểm danh</bu"} |
| PASS | — | Attendance 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Attendance 1440 · double click counts | push=1; commands=8; outbox=0→8→0; direct writes=0 |
| PASS | — | Attendance 1440 · one write request | expected one push request or 8 outbox command(s) for one logical write; push=1, commands=8, outbox delta=8 |
| PASS | — | Attendance 1440 · aria-busy painted ≥350 ms | painted=true; duration=411.8 ms |
| PASS | — | Attendance 1440 · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Attendance UI changed | changed status should remain visible after save |
| PASS | — | Score entry opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\"><p class=\"_saveReason_149ms_357 _saveReasonMuted_149ms_363\">Chưa có thay đổi để lưu</p><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" disabled=\"\" aria-live=\"polite"} |
| PASS | — | Invalid half-point keeps save disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\"><p class=\"_saveReason_149ms_357\">Sửa 1 ô lỗi để lưu điểm</p><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" aria-live=\"polite\" disabled=\"\">Lưu điểm</button></div>"} |
| PASS | — | Invalid score guidance visible | expected half-step validation message |
| PASS | — | Valid score enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\"><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" aria-live=\"polite\">Lưu điểm</button></div>"} |
| PASS | — | Dirty navigation shows confirmation | expected dialog 'Chưa lưu thay đổi' |
| PASS | — | Stay keeps URL | URL must remain unchanged after 'Ở lại' |
| PASS | — | Score entry 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| PASS | — | Score entry 390 · success hold ends and original name returns | expected button name to return to 'Lưu điểm' after the 1.6 s hold |
| INFO | — | Score entry 390 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Score entry 390 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Score entry 390 · aria-busy painted ≥350 ms | painted=true; duration=414.4 ms |
| PASS | — | Score entry 390 · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Score entry opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_desktopSaveRow_149ms_368\"><p class=\"_saveReason_149ms_357 _saveReasonMuted_149ms_363\">Chưa có thay đổi để lưu</p><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" disabled=\"\" aria-live=\"poli"} |
| PASS | — | Invalid half-point keeps save disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_desktopSaveRow_149ms_368\"><p class=\"_saveReason_149ms_357\">Sửa 1 ô lỗi để lưu điểm</p><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" aria-live=\"polite\" disabled=\"\">Lưu điểm</button></div>"} |
| PASS | — | Invalid score guidance visible | expected half-step validation message |
| PASS | — | Valid score enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_desktopSaveRow_149ms_368\"><button type=\"button\" class=\"_button_1gasx_2 _lg_1gasx_29 _saveButton_149ms_379 _block_1gasx_35\" aria-live=\"polite\">Lưu điểm</button></div>"} |
| PASS | — | Dirty navigation shows confirmation | expected dialog 'Chưa lưu thay đổi' |
| PASS | — | Stay keeps URL | URL must remain unchanged after 'Ở lại' |
| PASS | — | Score entry 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| PASS | — | Score entry 1440 · success hold ends and original name returns | expected button name to return to 'Lưu điểm' after the 1.6 s hold |
| INFO | — | Score entry 1440 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Score entry 1440 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Score entry 1440 · aria-busy painted ≥350 ms | painted=true; duration=416.9 ms |
| PASS | — | Score entry 1440 · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Score grid opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_headerActions_11vsb_46\"><div class=\"_menuWrap_11vsb_74\"><button type=\"button\" class=\"_menuButton_11vsb_53\" aria-label=\"Thêm tùy chọn\" aria-haspopup=\"menu\" aria-expanded=\"false\"><svg class=\"_icon_1gasx_329\" width=\"20\" height=\"20\" viewBox="} |
| PASS | — | Score grid valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu điểm","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_headerActions_11vsb_46\"><div class=\"_menuWrap_11vsb_74\"><button type=\"button\" class=\"_menuButton_11vsb_53\" aria-label=\"Thêm tùy chọn\" aria-haspopup=\"menu\" aria-expanded=\"false\"><svg class=\"_icon_1gasx_329\" width=\"20\" height=\"20\" viewBox="} |
| PASS | — | Score grid · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| PASS | — | Score grid · success hold ends and original name returns | expected button name to return to 'Lưu điểm' after the 1.6 s hold |
| INFO | — | Score grid · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Score grid · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Score grid · aria-busy painted ≥350 ms | painted=true; duration=410.3 ms |
| PASS | — | Score grid · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Create class opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div role=\"group\" aria-describedby=\"_r_2_\" class=\"_actionFooter_1gasx_444\"><p id=\"_r_2_\" class=\"_actionHint_1gasx_499\">Nhập tên lớp và chọn ngày học để tạo lớp</p><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" "} |
| PASS | — | Create class valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\"><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" data-discover=\"true\">Huỷ</a><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\">Tạo lớp</button></di"} |
| PASS | — | Create class invalid disables save | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\" role=\"group\" aria-describedby=\"_r_2_\"><p id=\"_r_2_\" class=\"_actionHint_1gasx_499\">Nhập tên lớp và chọn ngày học để tạo lớp</p><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" "} |
| PASS | — | Create class invalid guidance visible | missing invalid helper |
| PASS | — | Create class 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Create class 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/classes |
| PASS | — | Create class 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Create class 390 · aria-busy painted ≥350 ms | painted=true; duration=417.6 ms |
| PASS | — | Create class 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Create class opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div role=\"group\" aria-describedby=\"_r_2_\" class=\"_actionFooter_1gasx_444\"><p id=\"_r_2_\" class=\"_actionHint_1gasx_499\">Nhập tên lớp và chọn ngày học để tạo lớp</p><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" "} |
| PASS | — | Create class valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\"><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" data-discover=\"true\">Huỷ</a><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\">Tạo lớp</button></di"} |
| PASS | — | Create class invalid disables save | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo lớp","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444\" role=\"group\" aria-describedby=\"_r_2_\"><p id=\"_r_2_\" class=\"_actionHint_1gasx_499\">Nhập tên lớp và chọn ngày học để tạo lớp</p><a class=\"_button_1gasx_2 _lg_1gasx_29 _surface_1gasx_49 _cancel_orejb_84\" href=\"/lop\" "} |
| PASS | — | Create class invalid guidance visible | missing invalid helper |
| PASS | — | Create class 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Create class 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/classes |
| PASS | — | Create class 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Create class 1440 · aria-busy painted ≥350 ms | painted=true; duration=416.3 ms |
| PASS | — | Create class 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Edit class opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu thay đổi","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_modalActions_orejb_140\"><button type=\"button\" class=\"_button_1gasx_2 _secondary_1gasx_45\" aria-live=\"polite\">Huỷ</button><button type=\"submit\" class=\"_button_1gasx_2\" disabled=\"\" aria-live=\"polite\">Lưu thay đổi</button></div>"} |
| PASS | — | Clean edit modal closes immediately | clean modal should close without a confirmation |
| PASS | — | Edit class change enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu thay đổi","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_modalActions_orejb_140\"><button type=\"button\" class=\"_button_1gasx_2 _secondary_1gasx_45\" aria-live=\"polite\">Huỷ</button><button type=\"submit\" class=\"_button_1gasx_2\" aria-live=\"polite\">Lưu thay đổi</button></div>"} |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| PASS | — | Edit class 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Edit class 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=PATCH /v1/classes/demo-6a |
| PASS | — | Edit class 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Edit class 390 · aria-busy painted ≥350 ms | painted=true; duration=417.8 ms |
| PASS | — | Edit class 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Edit class opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu thay đổi","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_modalActions_orejb_140\"><button type=\"button\" class=\"_button_1gasx_2 _secondary_1gasx_45\" aria-live=\"polite\">Huỷ</button><button type=\"submit\" class=\"_button_1gasx_2\" disabled=\"\" aria-live=\"polite\">Lưu thay đổi</button></div>"} |
| PASS | — | Clean edit modal closes immediately | clean modal should close without a confirmation |
| PASS | — | Edit class change enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu thay đổi","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_modalActions_orejb_140\"><button type=\"button\" class=\"_button_1gasx_2 _secondary_1gasx_45\" aria-live=\"polite\">Huỷ</button><button type=\"submit\" class=\"_button_1gasx_2\" aria-live=\"polite\">Lưu thay đổi</button></div>"} |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| PASS | — | Edit class 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Edit class 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=PATCH /v1/classes/demo-6a |
| PASS | — | Edit class 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Edit class 1440 · aria-busy painted ≥350 ms | painted=true; duration=418.8 ms |
| PASS | — | Edit class 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Add student opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu học sinh","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_dialogFooter_1gasx_377\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" disabled=\"\" aria-live=\"polite\" form=\"_r_0_\">Lưu học sinh</button></div>"} |
| PASS | — | Add student valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu học sinh","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_dialogFooter_1gasx_377\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\" form=\"_r_0_\">Lưu học sinh</button></div>"} |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| PASS | — | Add student 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Add student 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/classes/demo-6a/students |
| PASS | — | Add student 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Add student 390 · aria-busy painted ≥350 ms | painted=true; duration=417.5 ms |
| PASS | — | Add student 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Add student opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu học sinh","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_dialogFooter_1gasx_377\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" disabled=\"\" aria-live=\"polite\" form=\"add-student-form\">Lưu học sinh</button></div>"} |
| PASS | — | Add student valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu học sinh","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_dialogFooter_1gasx_377\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\" form=\"add-student-form\">Lưu học sinh</button></div>"} |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| PASS | — | Add student 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Add student 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/classes/demo-6a/students |
| PASS | — | Add student 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Add student 1440 · aria-busy painted ≥350 ms | painted=true; duration=417.2 ms |
| PASS | — | Add student 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| INFO | — | Comments ticket dirty-close tested | viewport=390 |
| PASS | — | Comments 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Comments 390 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Comments 390 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Comments 390 · aria-busy painted ≥350 ms | painted=true; duration=417.8 ms |
| PASS | — | Comments 390 · modal/form closes | expected original save button to detach after save |
| INFO | — | Comments 1440 send · double click counts | push=1; commands=2; outbox=1→2→2; direct writes=0 |
| PASS | — | Comments 1440 send · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=2, outbox delta=1 |
| PASS | — | Comments 1440 send · aria-busy painted ≥350 ms | painted=true; duration=4103.2 ms |
| PASS | — | Comments 1440 send · modal/form closes | expected original save button to detach after save |
| PASS | — | Homework opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu phần","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_sheet_1x4tb_404\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Thêm phần BTVN\"><span class=\"_grabber_1x4tb_417\" aria-hidden=\"true\"></span><h2 class=\"_sheetTitle_1x4tb_425\">Thêm phần BTVN</h2><div class=\"_kindField_1x4tb_454\"><p class=\"_lab"} |
| PASS | — | Homework valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu phần","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_sheet_1x4tb_404\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Thêm phần BTVN\"><span class=\"_grabber_1x4tb_417\" aria-hidden=\"true\"></span><h2 class=\"_sheetTitle_1x4tb_425\">Thêm phần BTVN</h2><div class=\"_kindField_1x4tb_454\"><p class=\"_lab"} |
| PASS | — | Dirty modal close asks for confirmation | expected unsaved close dialog |
| PASS | — | Homework sheet stays open after choosing stay | sheet should remain available after unsaved-close confirmation |
| PASS | — | Homework 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Homework 390 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Homework 390 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Homework 390 · aria-busy painted ≥350 ms | painted=true; duration=430.6 ms |
| PASS | — | Homework 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Homework desktop opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu phần","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_formActions_1ggx1_354\"><button type=\"button\" class=\"_button_1gasx_2 _neutral_1gasx_53\" aria-live=\"polite\">Hủy</button><button type=\"submit\" class=\"_button_1gasx_2 _flex14_1ggx1_364\" disabled=\"\" aria-live=\"polite\">Lưu phần</button></div>"} |
| PASS | — | Homework desktop valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu phần","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_formActions_1ggx1_354\"><button type=\"button\" class=\"_button_1gasx_2 _neutral_1gasx_53\" aria-live=\"polite\">Hủy</button><button type=\"submit\" class=\"_button_1gasx_2 _flex14_1ggx1_364\" aria-live=\"polite\">Lưu phần</button></div>"} |
| PASS | — | Homework desktop editor stays open after choosing stay | editor should remain after unsaved-close confirmation |
| PASS | — | Homework 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Homework 1440 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | Homework 1440 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | Homework 1440 · aria-busy painted ≥350 ms | painted=true; duration=425.1 ms |
| PASS | — | Homework 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | New test opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo bài và nhập điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444 _actions_149ms_584\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" disabled=\"\" aria-live=\"polite\">Tạo bài và nhập điểm</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _ghost_1gasx_61 _"} |
| PASS | — | New test valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo bài và nhập điểm","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444 _actions_149ms_584\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\">Tạo bài và nhập điểm</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _ghost_1gasx_61 _cancelButton"} |
| PASS | — | New test 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | New test 390 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | New test 390 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | New test 390 · aria-busy painted ≥350 ms | painted=true; duration=416.9 ms |
| PASS | — | New test 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | New test opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo bài và nhập điểm","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444 _actions_149ms_584\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" disabled=\"\" aria-live=\"polite\">Tạo bài và nhập điểm</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _ghost_1gasx_61 _"} |
| PASS | — | New test valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo bài và nhập điểm","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_actionFooter_1gasx_444 _actions_149ms_584\"><button type=\"submit\" class=\"_button_1gasx_2 _lg_1gasx_29\" aria-live=\"polite\">Tạo bài và nhập điểm</button><button type=\"button\" class=\"_button_1gasx_2 _md_1gasx_23 _ghost_1gasx_61 _cancelButton"} |
| PASS | — | New test 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | New test 1440 · double click counts | push=1; commands=1; outbox=0→1→0; direct writes=0 |
| PASS | — | New test 1440 · one write request | expected one push request or 1 outbox command(s) for one logical write; push=1, commands=1, outbox delta=1 |
| PASS | — | New test 1440 · aria-busy painted ≥350 ms | painted=true; duration=417.2 ms |
| PASS | — | New test 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Archive confirmation visible | expected class archive confirmation |
| INFO | — | Archive 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=PATCH /v1/classes/demo-6a |
| PASS | — | Archive 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Archive 390 · aria-busy painted ≥350 ms | painted=true; duration=4095.4 ms |
| PASS | — | Archive 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Archive confirmation visible | expected class archive confirmation |
| INFO | — | Archive 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=PATCH /v1/classes/demo-6a |
| PASS | — | Archive 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Archive 1440 · aria-busy painted ≥350 ms | painted=true; duration=4098.3 ms |
| PASS | — | Archive 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Change password opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu mật khẩu mới","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65 _formFill_a86vd_304\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"change-current\">Mật khẩu hiện tại</label><div class=\"_passwordBox_a86vd_86\"><input id=\"change-current\" class=\"_passwordInput_a86vd_114\" autocomple"} |
| PASS | — | Change password valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu mật khẩu mới","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65 _formFill_a86vd_304\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"change-current\">Mật khẩu hiện tại</label><div class=\"_passwordBox_a86vd_86\"><input id=\"change-current\" class=\"_passwordInput_a86vd_114\" autocomple"} |
| PASS | — | Change password 390 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Change password 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/auth/change-password |
| PASS | — | Change password 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Change password 390 · aria-busy painted ≥350 ms | painted=true; duration=417.0 ms |
| PASS | — | Change password 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Change password opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Lưu mật khẩu mới","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_formFooter_p02a3_255\"><button type=\"submit\" class=\"_button_1gasx_2 _md_1gasx_23\" disabled=\"\" aria-live=\"polite\">Lưu mật khẩu mới</button></div>"} |
| PASS | — | Change password valid enables save | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Lưu mật khẩu mới","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<div class=\"_formFooter_p02a3_255\"><button type=\"submit\" class=\"_button_1gasx_2 _md_1gasx_23\" aria-live=\"polite\">Lưu mật khẩu mới</button></div>"} |
| PASS | — | Change password 1440 · accessible success label | expected primary button accessible name to change to 'Đã lưu' during the success hold |
| INFO | — | Change password 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/auth/change-password |
| PASS | — | Change password 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Change password 1440 · aria-busy painted ≥350 ms | painted=true; duration=418.6 ms |
| PASS | — | Change password 1440 · save button returns disabled | expected save button disabled after success hold ended; enabled=false |
| PASS | — | Register opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo không gian làm việc","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"register-name\">Tên hiển thị</label><div class=\"_textBox_a86vd_87\"><input id=\"register-name\" class=\"_textInput_a86vd_115\" autocomplete=\"name\" placeholder=\"Cô Lan\" valu"} |
| PASS | — | Register valid enables submit | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo không gian làm việc","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"register-name\">Tên hiển thị</label><div class=\"_textBox_a86vd_87\"><input id=\"register-name\" class=\"_textInput_a86vd_115\" autocomplete=\"name\" placeholder=\"Cô Lan\" valu"} |
| INFO | — | Register 390 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/auth/register |
| PASS | — | Register 390 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Register 390 · aria-busy painted ≥350 ms | painted=true; duration=422.2 ms |
| PASS | — | Register 390 · modal/form closes | expected original save button to detach after save |
| PASS | — | Register opens disabled | disabled=true, expected true; DOM={"tag":"BUTTON","text":"Tạo không gian làm việc","disabled":true,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"register-name\">Tên hiển thị</label><div class=\"_textBox_a86vd_87\"><input id=\"register-name\" class=\"_textInput_a86vd_115\" autocomplete=\"name\" placeholder=\"Cô Lan\" valu"} |
| PASS | — | Register valid enables submit | disabled=false, expected false; DOM={"tag":"BUTTON","text":"Tạo không gian làm việc","disabled":false,"ariaDisabled":null,"ariaBusy":null,"parent":"<form class=\"_form_a86vd_65\" novalidate=\"\"><div class=\"_field_a86vd_70\"><label for=\"register-name\">Tên hiển thị</label><div class=\"_textBox_a86vd_87\"><input id=\"register-name\" class=\"_textInput_a86vd_115\" autocomplete=\"name\" placeholder=\"Cô Lan\" valu"} |
| INFO | — | Register 1440 · double click counts | push=0; commands=0; outbox=0→0→0; direct writes=POST /v1/auth/register |
| PASS | — | Register 1440 · single direct request | expected 1 endpoint request; observed 1 |
| PASS | — | Register 1440 · aria-busy painted ≥350 ms | painted=true; duration=419.1 ms |
| PASS | — | Register 1440 · modal/form closes | expected original save button to detach after save |
| PASS | — | Reload raises beforeunload dialog | dialog=beforeunload |

## Failed assertions

No failures.

## Notes

Success-label flows: attendance, score entry, score grid, homework, mobile comments-ticket save, create/edit class, add student, create test, and change password; close-after-save flows wait for accessible 'Đã lưu' before asserting closure. Exceptions without that label: ticket send confirmation, archive class, and registration.
Request totals aggregate across isolated scenarios; per-action request/outbox evidence is recorded in the measurements above. A network batch is counted as one `/sync/push` request and its individual commands are reported separately. Passwords and phone values are fake test inputs and are never printed.
