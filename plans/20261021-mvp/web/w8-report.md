# W-8 — staging UI E2E

Date: 2026-10-23  
Target: https://qlh-staging-web.pages.dev
Deployment: https://4973d94b.qlh-staging-web.pages.dev (project qlh-staging-web, branch main)  
Harness: Node.js + Playwright / Chrome 155, separate persistent profiles under ignored artifacts/w8-browser-state/. Form sends recorded: teacher 1 (limit 2), guardian 2 (limit 2); this run reused both profiles and sent 0 login forms.

## Access and stored session

| Account | Result | Sends this run | Total sends |
|---|---|---:|---:|
| Teacher | authenticated; reused persistent authenticated profile; localStorage token=true; IndexedDB=qlh-web; sessionStorage keys=0 | 0 | 1 |
| Guardian | authenticated; reused persistent authenticated profile; localStorage token=true; IndexedDB=qlh-web; sessionStorage keys=0 | 0 | 2 |

Prior successful form submissions were HTTP 200. No credentials, phone numbers, tokens, or raw comment text are in this report. The persistent profiles are excluded from git.

## Screenshots and layout measures

Captured for teacher and guardian at 390×844 and 1440×900; child A/B details and print preview use mobile. Session tab images: teacher-mobile-session-diem-danh.png, teacher-mobile-session-nhan-xet.png, teacher-mobile-session-bai-tap-ve-nha.png; print preview: teacher-mobile-report-print-preview.png.

| Role | Viewport | Route | Heading | scrollWidth/viewport | Content width | Image |
|---|---|---|---|---:|---:|---|
| teacher | mobile | `/lop` | Lớp của tôi | 390/390px | 390px | `shots/w8/teacher-mobile-lop-all-classes.png` |
| teacher | mobile | `/lop/moi` | Tạo lớp mới | 390/390px | 390px | `shots/w8/teacher-mobile-lop-moi-create-class.png` |
| teacher | mobile | `/lich` | Lịch | 390/390px | 390px | `shots/w8/teacher-mobile-lich-schedule.png` |
| teacher | mobile | `/cai-dat` | Cài đặt | 390/390px | 390px | `shots/w8/teacher-mobile-cai-dat-settings.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc` | 6A | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-buoi-hoc-sessions.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra` | 6A | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-bai-kiem-tra-tests.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/diem` | 6A | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-diem-scores.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/hoc-sinh` | 6A | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-hoc-sinh-students.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bao-cao` | 6A | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-bao-cao-reports.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc/65265e6a-0114-4fe7-9ef0-dfe3aab887da` | Buổi 1 · 14/10 | 390/390px | 390px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-buoi-hoc-65265e6a-0114-.png` |
| teacher | desktop | `/lop` | Tất cả lớp | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-all-classes.png` |
| teacher | desktop | `/lop/moi` | Tạo lớp mới | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-moi-create-class.png` |
| teacher | desktop | `/lich` | Lịch | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lich-schedule.png` |
| teacher | desktop | `/cai-dat` | Tài khoản của tôi | 1440/1440px | 1160px | `shots/w8/teacher-desktop-cai-dat-settings.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc` | 6A | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-buoi-hoc-sessions.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra` | 6A | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-bai-kiem-tra-tests.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/diem` | 6A | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-diem-scores.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/hoc-sinh` | 6A | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-hoc-sinh-students.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bao-cao` | 6A | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-bao-cao-reports.png` |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc/65265e6a-0114-4fe7-9ef0-dfe3aab887da` | Buổi 1 · Thứ Tư, 14 tháng 10 · 18:00 | 1440/1440px | 1160px | `shots/w8/teacher-desktop-lop-81396407-9638-4a03-82f8-270fe5a65525-buoi-hoc-65265e6a-0114-.png` |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra/1bf6d757-93a6-46f8-a549-a0ac30d0b3b0` | Điểm số | 1440/1440px | 1160px | `shots/w8/teacher-mobile-lop-81396407-9638-4a03-82f8-270fe5a65525-bai-kiem-tra-1bf6d757-9.png` |
| guardian | mobile | `/ph` | 6A | 390/390px | 390px | `shots/w8/guardian-mobile-ph-class.png` |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | Buổi bù · Thứ Năm 3/12 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-buoi-5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9-session.png` |
| guardian | mobile | `/ph/nhan-xet` | Nhận xét của cô | 390/390px | 390px | `shots/w8/guardian-mobile-ph-nhan-xet-comments.png` |
| guardian | mobile | `/ph/diem` | Điểm số | 390/390px | 390px | `shots/w8/guardian-mobile-ph-diem-scores.png` |
| guardian | mobile | `/ph/bao-cao` | Báo cáo tháng 10 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-bao-cao-report.png` |
| guardian | mobile | `/cai-dat` | Cài đặt | 390/390px | 390px | `shots/w8/guardian-mobile-cai-dat-settings.png` |
| guardian | mobile | `/ph` | 6A | 390/390px | 390px | `shots/w8/guardian-mobile-ph-child-a-class.png` |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | Buổi bù · Thứ Năm 3/12 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-buoi-5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9-child-a-session.png` |
| guardian | mobile | `/ph/nhan-xet` | Nhận xét của cô | 390/390px | 390px | `shots/w8/guardian-mobile-ph-nhan-xet-child-a-comments.png` |
| guardian | mobile | `/ph/diem` | Điểm số | 390/390px | 390px | `shots/w8/guardian-mobile-ph-diem-child-a-scores.png` |
| guardian | mobile | `/ph/bao-cao` | Báo cáo tháng 10 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-bao-cao-child-a-report.png` |
| guardian | mobile | `/ph` | 6A | 390/390px | 390px | `shots/w8/guardian-mobile-ph-child-b-class.png` |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | Buổi bù · Thứ Năm 3/12 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-buoi-5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9-child-b-session.png` |
| guardian | mobile | `/ph/nhan-xet` | Nhận xét của cô | 390/390px | 390px | `shots/w8/guardian-mobile-ph-nhan-xet-child-b-comments.png` |
| guardian | mobile | `/ph/diem` | Điểm số | 390/390px | 390px | `shots/w8/guardian-mobile-ph-diem-child-b-scores.png` |
| guardian | mobile | `/ph/bao-cao` | Báo cáo tháng 10 | 390/390px | 390px | `shots/w8/guardian-mobile-ph-bao-cao-child-b-report.png` |
| guardian | desktop | `/ph` | 6A | 1440/1440px | 960px | `shots/w8/guardian-desktop-ph-class.png` |
| guardian | desktop | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | Buổi bù · Thứ Năm 3/12 | 1440/1440px | 960px | `shots/w8/guardian-desktop-ph-buoi-5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9-session.png` |
| guardian | desktop | `/ph/nhan-xet` | Nhận xét của cô | 1440/1440px | 960px | `shots/w8/guardian-desktop-ph-nhan-xet-comments.png` |
| guardian | desktop | `/ph/diem` | Điểm số | 1440/1440px | 960px | `shots/w8/guardian-desktop-ph-diem-scores.png` |
| guardian | desktop | `/ph/bao-cao` | Báo cáo tháng 10 | 1440/1440px | 960px | `shots/w8/guardian-desktop-ph-bao-cao-report.png` |
| guardian | desktop | `/cai-dat` | Tài khoản của tôi | 1440/1440px | 960px | `shots/w8/guardian-desktop-cai-dat-settings.png` |

Teacher staging summary: {"className":"6A","classCount":3,"sessionCount":21,"activeStudentCount":8,"testsCount":2}. Page errors: teacher 0, guardian 0.

### Minimum visible hit target

| Role | Viewport | Route | Smallest measured target | Check (44px mobile / 36px desktop) |
|---|---|---|---:|---|
| teacher | mobile | `/lop` | 56px | PASS |
| teacher | mobile | `/lop/moi` | 44px | PASS |
| teacher | mobile | `/lich` | 44px | PASS |
| teacher | mobile | `/cai-dat` | 56px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/diem` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/hoc-sinh` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bao-cao` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc/65265e6a-0114-4fe7-9ef0-dfe3aab887da` | 44px | PASS |
| teacher | desktop | `/lop` | 60px | PASS |
| teacher | desktop | `/lop/moi` | 44px | PASS |
| teacher | desktop | `/lich` | 44px | PASS |
| teacher | desktop | `/cai-dat` | 40px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc` | 44px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra` | 44px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/diem` | 44px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/hoc-sinh` | 44px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bao-cao` | 44px | PASS |
| teacher | desktop | `/lop/81396407-9638-4a03-82f8-270fe5a65525/buoi-hoc/65265e6a-0114-4fe7-9ef0-dfe3aab887da` | 44px | PASS |
| teacher | mobile | `/lop/81396407-9638-4a03-82f8-270fe5a65525/bai-kiem-tra/1bf6d757-93a6-46f8-a549-a0ac30d0b3b0` | 44px | PASS |
| guardian | mobile | `/ph` | 44px | PASS |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | —px | no visible controls |
| guardian | mobile | `/ph/nhan-xet` | 44px | PASS |
| guardian | mobile | `/ph/diem` | 44px | PASS |
| guardian | mobile | `/ph/bao-cao` | —px | no visible controls |
| guardian | mobile | `/cai-dat` | 56px | PASS |
| guardian | mobile | `/ph` | 44px | PASS |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | —px | no visible controls |
| guardian | mobile | `/ph/nhan-xet` | 44px | PASS |
| guardian | mobile | `/ph/diem` | 44px | PASS |
| guardian | mobile | `/ph/bao-cao` | —px | no visible controls |
| guardian | mobile | `/ph` | 44px | PASS |
| guardian | mobile | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | —px | no visible controls |
| guardian | mobile | `/ph/nhan-xet` | 44px | PASS |
| guardian | mobile | `/ph/diem` | 44px | PASS |
| guardian | mobile | `/ph/bao-cao` | 52px | PASS |
| guardian | desktop | `/ph` | 44px | PASS |
| guardian | desktop | `/ph/buoi/5b50f18f-8c2f-490b-ab7f-5cf9d77fd7e9` | 44px | PASS |
| guardian | desktop | `/ph/nhan-xet` | 44px | PASS |
| guardian | desktop | `/ph/diem` | 44px | PASS |
| guardian | desktop | `/ph/bao-cao` | 44px | PASS |
| guardian | desktop | `/cai-dat` | 40px | PASS |

Horizontal overflow: 0 of 43 captured routes. Desktop content limits: teacher ≤1200px, guardian ≤960px.

## Teacher functional checks

| Check | Result | Evidence |
|---|---|---|
| Score parsing | PASS | 7,5 accepted=true; 7.5 accepted=true; 7,3 rejected=true; original restored without save=true. |
| Offline attendance | PASS | Offline cell changed=true; sync applied=true; reloaded status persisted=true; original status restored=true; permanent sync chip=false. |
| Sync push | HTTP 200, 200; applied=true | One attendance cell changed offline, reloaded, then restored and synced. |
| Print preview / upload | PASS | Print media rendered report content only=true; non-GET requests=0. |
| Motion | Page animation 0.2s; reduced=0s | reduced-motion media applied=true. |

## Guardian child signatures

- 1. {"studentId":"9c375f61-f417-44c2-80d4-970de090eb6e","studentName":"Bảo Nam","className":"6A","sessionCount":3,"recentSessions":[{"id":"32541ea7-e8e9-44ef-bb23-18baabd9034f","date":"2026-10-22","attendance":null,"stars":null},{"id":"f7ac2d0b-931f-40c1-b3ef-adbab8904600","date":"2026-10-16","attendance":"present","stars":2},{"id":"65265e6a-0114-4fe7-9ef0-dfe3aab887da","date":"2026-10-14","attendance":"present","stars":2}],"comments":[{"stars":2,"noteLength":47}],"scores":[{"testId":"1bf6d757-93a6-46f8-a549-a0ac30d0b3b0","value":82},{"testId":"6d9a08c9-a6eb-4cc3-9110-420f9d13ac45","value":12.5}],"reportMonths":[],"relationCounts":{"attendance":2,"slips":2,"scores":2,"reports":0,"homeworkGrades":1},"ownershipClean":true,"otherCachedChildRows":8,"childCount":2}
- 2. {"studentId":"9c375f61-f417-44c2-80d4-970de090eb6e","studentName":"Bảo Nam","className":"6A","sessionCount":3,"recentSessions":[{"id":"32541ea7-e8e9-44ef-bb23-18baabd9034f","date":"2026-10-22","attendance":null,"stars":null},{"id":"f7ac2d0b-931f-40c1-b3ef-adbab8904600","date":"2026-10-16","attendance":"present","stars":2},{"id":"65265e6a-0114-4fe7-9ef0-dfe3aab887da","date":"2026-10-14","attendance":"present","stars":2}],"comments":[{"stars":2,"noteLength":47}],"scores":[{"testId":"1bf6d757-93a6-46f8-a549-a0ac30d0b3b0","value":82},{"testId":"6d9a08c9-a6eb-4cc3-9110-420f9d13ac45","value":12.5}],"reportMonths":[],"relationCounts":{"attendance":2,"slips":2,"scores":2,"reports":0,"homeworkGrades":1},"ownershipClean":true,"otherCachedChildRows":8,"childCount":2}
- 3. {"studentId":"334c8845-48b4-4a60-aac3-d0c4dd2a78bf","studentName":"Minh Anh","className":"6A","sessionCount":3,"recentSessions":[{"id":"32541ea7-e8e9-44ef-bb23-18baabd9034f","date":"2026-10-22","attendance":null,"stars":null},{"id":"f7ac2d0b-931f-40c1-b3ef-adbab8904600","date":"2026-10-16","attendance":"present","stars":3},{"id":"65265e6a-0114-4fe7-9ef0-dfe3aab887da","date":"2026-10-14","attendance":"present","stars":3}],"comments":[{"stars":3,"noteLength":45}],"scores":[{"testId":"1bf6d757-93a6-46f8-a549-a0ac30d0b3b0","value":85},{"testId":"6d9a08c9-a6eb-4cc3-9110-420f9d13ac45","value":14}],"reportMonths":[],"relationCounts":{"attendance":2,"slips":2,"scores":2,"reports":0,"homeworkGrades":2},"ownershipClean":true,"otherCachedChildRows":7,"childCount":2}
- 4. {"studentId":"9c375f61-f417-44c2-80d4-970de090eb6e","studentName":"Bảo Nam","className":"6A","sessionCount":3,"recentSessions":[{"id":"32541ea7-e8e9-44ef-bb23-18baabd9034f","date":"2026-10-22","attendance":null,"stars":null},{"id":"f7ac2d0b-931f-40c1-b3ef-adbab8904600","date":"2026-10-16","attendance":"present","stars":2},{"id":"65265e6a-0114-4fe7-9ef0-dfe3aab887da","date":"2026-10-14","attendance":"present","stars":2}],"comments":[{"stars":2,"noteLength":47}],"scores":[{"testId":"1bf6d757-93a6-46f8-a549-a0ac30d0b3b0","value":82},{"testId":"6d9a08c9-a6eb-4cc3-9110-420f9d13ac45","value":12.5}],"reportMonths":[],"relationCounts":{"attendance":2,"slips":2,"scores":2,"reports":0,"homeworkGrades":1},"ownershipClean":true,"otherCachedChildRows":8,"childCount":2}
- 5. {"studentId":"9c375f61-f417-44c2-80d4-970de090eb6e","studentName":"Bảo Nam","className":"6A","sessionCount":3,"recentSessions":[{"id":"32541ea7-e8e9-44ef-bb23-18baabd9034f","date":"2026-10-22","attendance":null,"stars":null},{"id":"f7ac2d0b-931f-40c1-b3ef-adbab8904600","date":"2026-10-16","attendance":"present","stars":2},{"id":"65265e6a-0114-4fe7-9ef0-dfe3aab887da","date":"2026-10-14","attendance":"present","stars":2}],"comments":[{"stars":2,"noteLength":47}],"scores":[{"testId":"1bf6d757-93a6-46f8-a549-a0ac30d0b3b0","value":82},{"testId":"6d9a08c9-a6eb-4cc3-9110-420f9d13ac45","value":12.5}],"reportMonths":[],"relationCounts":{"attendance":2,"slips":2,"scores":2,"reports":0,"homeworkGrades":1},"ownershipClean":true,"otherCachedChildRows":8,"childCount":2}

Picker options=2; A→B selected ID changed=true; return-to-A unchanged=true. Signatures include child name, class, held-session count and last three held sessions, attendance/stars, one feedback's length/stars (no comment text), per-test scores, report months, and child-owned row counts.

## Difference table vs prototype references

| Screen / check | Difference | Type | Disposition |
|---|---|---|---|
| Teacher classes, create, schedule, settings | Staging includes Today/unfinished-task cards and extra Smoke classes absent from prototype seed. | UI structure + staging data | Captured; data differences retained. |
| Teacher class tabs and session list | Staging has 6A, 21 sessions, 8 active students, 2 tests, and a Sắp tới group absent from the reference. | Staging data | Captured at both viewports; seed difference retained. |
| Guardian class, session, comments, scores, report, picker | Two children share class 6A; attendance, feedback, scores, session dates, and report publication differ from prototype seed. | Staging data | A→B→A ownership signatures and per-child screenshots recorded above. |
| Layout and hit targets | Before fix: schedule 39px, report rows 41px, desktop row menus 28–32px; after fix all pass. | UI | Fixed schedule chips to 44px, report rows to 44px, and desktop row-menu targets to 44px; after deployment 0 controls fell below minimum and 0 routes overflow. |
| Score input | 7,5 accepted=true; 7.5 accepted=true; 7,3 rejected=true; original restored without save=true. | Data / UI | PASS; unsaved edit discarded by reload. |
| Offline sync | Offline cell changed=true; sync applied=true; reloaded status persisted=true; original status restored=true; permanent sync chip=false. | Data / sync | PASS; original attendance restored. |
| Print / upload | Print media rendered report content only=true; non-GET requests=0. | Print / network | PASS. |

## Run result

Machine result: [w8-results.json](../../../../../.paseo/worktrees/0fvr24l0/mvp-web/artifacts/w8-results.json). CSS fixes were committed as 29b1bf3 and deployed to https://4973d94b.qlh-staging-web.pages.dev.
