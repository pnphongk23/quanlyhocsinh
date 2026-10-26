# So sánh UI trước/sau

HEAD khi chụp: `08a6423`. Ảnh before/v2 được giữ nguyên; after dùng local Vite cổng 5181 và fixture giả. After bổ sung viewport 1024×768. Xem [inventory before](inventory.md) và [inventory after](inventory-after.md).

Ghép được 204 cặp ảnh (before 204, after 280 ảnh chụp). Sai khác độ sáng tuyệt đối trung bình mỗi pixel: median 0.00/255, max 22.74/255. Viewport mới và scenario không có cặp before tương ứng.

## So sánh màn chính

| Team | Viewport | Route / màn | Before ↔ after | Quan sát ngắn |
|---|---:|---|---|---|
| A | 1024x768 | `/lich` · `schedule` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1334-schedule-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop` · `classes` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1331-classes-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/bai-kiem-tra` · `tests` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1345-tests-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1346-test-scores-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/bao-cao` · `reports` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1348-reports-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1335-class-sessions-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1349-session-detail-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/diem` · `score-grid` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1347-score-grid-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-6a/hoc-sinh` · `class-students` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1339-class-students-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/demo-empty/hoc-sinh` · `empty-students` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1343-empty-students-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1024x768 | `/lop/moi` · `create-class` | — ↔ [after](../shots/ui-audit/after/A/1024x768/v2/1332-create-class-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1440x900 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | — ↔ [after](../shots/ui-audit/after/A/1440x900/v2/1419-test-scores-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | — ↔ [after](../shots/ui-audit/after/A/1440x900/v2/1421-session-detail-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 1440x900 | `/lop/moi` · `create-class` | — ↔ [after](../shots/ui-audit/after/A/1440x900/v2/1423-create-class-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| A | 375x667 | `/lich` · `schedule` | [before](../shots/ui-audit/before/A/375x667/v2/1677-schedule-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1285-schedule-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop` · `classes` | [before](../shots/ui-audit/before/A/375x667/v2/1673-classes-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1281-classes-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 375x667 | `/lop/demo-6a/bai-kiem-tra` · `tests` | [before](../shots/ui-audit/before/A/375x667/v2/1690-tests-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1298-tests-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | [before](../shots/ui-audit/before/A/375x667/v2/1691-test-scores-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1299-test-scores-main.png) | Fixture theo bước 0,5; hết cảnh báo điểm giả. |
| A | 375x667 | `/lop/demo-6a/bao-cao` · `reports` | [before](../shots/ui-audit/before/A/375x667/v2/1693-reports-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1301-reports-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | [before](../shots/ui-audit/before/A/375x667/v2/1678-class-sessions-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1286-class-sessions-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | [before](../shots/ui-audit/before/A/375x667/v2/1694-session-detail-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1302-session-detail-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/demo-6a/diem` · `score-grid` | [before](../shots/ui-audit/before/A/375x667/v2/1692-score-grid-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1300-score-grid-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | [before](../shots/ui-audit/before/A/375x667/v2/1682-class-students-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1290-class-students-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 375x667 | `/lop/demo-empty/hoc-sinh` · `empty-students` | [before](../shots/ui-audit/before/A/375x667/v2/1688-empty-students-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1296-empty-students-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 375x667 | `/lop/moi` · `create-class` | [before](../shots/ui-audit/before/A/375x667/v2/1674-create-class-main.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1282-create-class-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lich` · `schedule` | [before](../shots/ui-audit/before/A/390x844/v2/1652-schedule-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1260-schedule-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop` · `classes` | [before](../shots/ui-audit/before/A/390x844/v2/1648-classes-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1256-classes-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 390x844 | `/lop/demo-6a/bai-kiem-tra` · `tests` | [before](../shots/ui-audit/before/A/390x844/v2/1665-tests-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1273-tests-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | [before](../shots/ui-audit/before/A/390x844/v2/1666-test-scores-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1413-test-scores-main.png) | Fixture theo bước 0,5; hết cảnh báo điểm giả. |
| A | 390x844 | `/lop/demo-6a/bao-cao` · `reports` | [before](../shots/ui-audit/before/A/390x844/v2/1668-reports-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1276-reports-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | [before](../shots/ui-audit/before/A/390x844/v2/1653-class-sessions-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1261-class-sessions-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | [before](../shots/ui-audit/before/A/390x844/v2/1669-session-detail-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1415-session-detail-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/demo-6a/diem` · `score-grid` | [before](../shots/ui-audit/before/A/390x844/v2/1667-score-grid-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1275-score-grid-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | [before](../shots/ui-audit/before/A/390x844/v2/1657-class-students-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1265-class-students-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 390x844 | `/lop/demo-empty/hoc-sinh` · `empty-students` | [before](../shots/ui-audit/before/A/390x844/v2/1663-empty-students-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1271-empty-students-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 390x844 | `/lop/moi` · `create-class` | [before](../shots/ui-audit/before/A/390x844/v2/1649-create-class-main.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1417-create-class-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lich` · `schedule` | [before](../shots/ui-audit/before/A/430x932/v2/1702-schedule-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1310-schedule-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop` · `classes` | [before](../shots/ui-audit/before/A/430x932/v2/1698-classes-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1306-classes-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 430x932 | `/lop/demo-6a/bai-kiem-tra` · `tests` | [before](../shots/ui-audit/before/A/430x932/v2/1715-tests-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1323-tests-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | [before](../shots/ui-audit/before/A/430x932/v2/1716-test-scores-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1324-test-scores-main.png) | Fixture theo bước 0,5; hết cảnh báo điểm giả. |
| A | 430x932 | `/lop/demo-6a/bao-cao` · `reports` | [before](../shots/ui-audit/before/A/430x932/v2/1718-reports-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1326-reports-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | [before](../shots/ui-audit/before/A/430x932/v2/1703-class-sessions-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1311-class-sessions-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | [before](../shots/ui-audit/before/A/430x932/v2/1719-session-detail-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1327-session-detail-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/demo-6a/diem` · `score-grid` | [before](../shots/ui-audit/before/A/430x932/v2/1717-score-grid-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1325-score-grid-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | [before](../shots/ui-audit/before/A/430x932/v2/1707-class-students-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1315-class-students-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| A | 430x932 | `/lop/demo-empty/hoc-sinh` · `empty-students` | [before](../shots/ui-audit/before/A/430x932/v2/1713-empty-students-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1321-empty-students-main.png) | Không thấy khác biệt bố cục đáng kể. |
| A | 430x932 | `/lop/moi` · `create-class` | [before](../shots/ui-audit/before/A/430x932/v2/1699-create-class-main.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1307-create-class-main.png) | Không thấy khác biệt bố cục đáng kể. |
| B | 1024x768 | `/lop` · `classes` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1369-classes-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/bai-kiem-tra` · `tests` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1378-tests-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/bao-cao` · `reports` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1380-reports-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1370-class-sessions-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1381-session-detail-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/diem` · `score-grid` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1379-score-grid-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1024x768 | `/lop/demo-6a/hoc-sinh` · `class-students` | — ↔ [after](../shots/ui-audit/after/B/1024x768/v2/1374-class-students-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| B | 1440x900 | `/lop` · `classes` | [before](../shots/ui-audit/before/B/1440x900/v2/1723-classes-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1353-classes-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| B | 1440x900 | `/lop/demo-6a/bai-kiem-tra` · `tests` | [before](../shots/ui-audit/before/B/1440x900/v2/1732-tests-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1362-tests-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| B | 1440x900 | `/lop/demo-6a/bao-cao` · `reports` | [before](../shots/ui-audit/before/B/1440x900/v2/1734-reports-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1364-reports-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | [before](../shots/ui-audit/before/B/1440x900/v2/1724-class-sessions-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1354-class-sessions-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | [before](../shots/ui-audit/before/B/1440x900/v2/1735-session-detail-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1365-session-detail-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| B | 1440x900 | `/lop/demo-6a/diem` · `score-grid` | [before](../shots/ui-audit/before/B/1440x900/v2/1733-score-grid-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1363-score-grid-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| B | 1440x900 | `/lop/demo-6a/hoc-sinh` · `class-students` | [before](../shots/ui-audit/before/B/1440x900/v2/1728-class-students-main.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1358-class-students-main.png) | Dữ liệu hiển thị, không còn banner lưu giả. |
| C | 1024x768 | `/cai-dat` · `settings` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1501-settings-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/cai-dat/doi-mat-khau` · `change-password` | — ↔ — (ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã).) | ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã). |
| C | 1024x768 | `/chon-vai-tro` · `role-picker` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1500-role-picker-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/dang-ky` · `register` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1497-register-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/dang-nhap` · `login` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1495-login-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/dang-nhap (PwaGuideGate, Instagram UA)` · `pwa-guide` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1502-pwa-guide-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/ph` · `guardian-home` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1483-guardian-home-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/ph/bao-cao` · `guardian-reports` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1493-guardian-reports-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/ph/buoi/demo-past` · `guardian-session` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1489-guardian-session-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/ph/diem` · `guardian-scores` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1491-guardian-scores-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/ph/nhan-xet` · `guardian-comments` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1487-guardian-comments-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1024x768 | `/quen-mat-khau` · `forgot-password` | — ↔ [after](../shots/ui-audit/after/C/1024x768/v2/1499-forgot-password-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| C | 1440x900 | `/cai-dat` · `settings` | [before](../shots/ui-audit/before/C/1440x900/v2/1835-settings-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1481-settings-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/cai-dat/doi-mat-khau` · `change-password` | — ↔ — (ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã).) | ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã). |
| C | 1440x900 | `/chon-vai-tro` · `role-picker` | [before](../shots/ui-audit/before/C/1440x900/v2/1834-role-picker-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1480-role-picker-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/dang-ky` · `register` | [before](../shots/ui-audit/before/C/1440x900/v2/1831-register-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1477-register-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/dang-nhap` · `login` | [before](../shots/ui-audit/before/C/1440x900/v2/1829-login-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1475-login-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/dang-nhap (PwaGuideGate, Instagram UA)` · `pwa-guide` | [before](../shots/ui-audit/before/C/1440x900/v2/1836-pwa-guide-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1482-pwa-guide-main.png) | PWA Guide hiện qua route thật/UA giả lập. |
| C | 1440x900 | `/ph` · `guardian-home` | [before](../shots/ui-audit/before/C/1440x900/v2/1817-guardian-home-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1463-guardian-home-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/ph/bao-cao` · `guardian-reports` | [before](../shots/ui-audit/before/C/1440x900/v2/1827-guardian-reports-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1473-guardian-reports-main.png) | Đã hiện dữ liệu báo cáo phụ huynh phát hành. |
| C | 1440x900 | `/ph/buoi/demo-past` · `guardian-session` | [before](../shots/ui-audit/before/C/1440x900/v2/1823-guardian-session-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1469-guardian-session-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/ph/diem` · `guardian-scores` | [before](../shots/ui-audit/before/C/1440x900/v2/1825-guardian-scores-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1471-guardian-scores-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/ph/nhan-xet` · `guardian-comments` | [before](../shots/ui-audit/before/C/1440x900/v2/1821-guardian-comments-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1467-guardian-comments-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 1440x900 | `/quen-mat-khau` · `forgot-password` | [before](../shots/ui-audit/before/C/1440x900/v2/1833-forgot-password-main.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1479-forgot-password-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| C | 375x667 | `/cai-dat` · `settings` | [before](../shots/ui-audit/before/C/375x667/v2/1786-settings-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1432-settings-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/cai-dat/doi-mat-khau` · `change-password` | [before](../shots/ui-audit/before/C/375x667/v2/1787-change-password-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1433-change-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/chon-vai-tro` · `role-picker` | [before](../shots/ui-audit/before/C/375x667/v2/1785-role-picker-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1431-role-picker-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/dang-ky` · `register` | [before](../shots/ui-audit/before/C/375x667/v2/1780-register-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1426-register-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/dang-nhap` · `login` | [before](../shots/ui-audit/before/C/375x667/v2/1777-login-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1423-login-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/dang-nhap (PwaGuideGate, Instagram UA)` · `pwa-guide` | [before](../shots/ui-audit/before/C/375x667/v2/1790-pwa-guide-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1436-pwa-guide-main.png) | PWA Guide hiện qua route thật/UA giả lập. |
| C | 375x667 | `/ph` · `guardian-home` | [before](../shots/ui-audit/before/C/375x667/v2/1765-guardian-home-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1411-guardian-home-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/ph/bao-cao` · `guardian-reports` | [before](../shots/ui-audit/before/C/375x667/v2/1775-guardian-reports-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1421-guardian-reports-main.png) | Đã hiện dữ liệu báo cáo phụ huynh phát hành. |
| C | 375x667 | `/ph/buoi/demo-past` · `guardian-session` | [before](../shots/ui-audit/before/C/375x667/v2/1771-guardian-session-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1417-guardian-session-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/ph/diem` · `guardian-scores` | [before](../shots/ui-audit/before/C/375x667/v2/1773-guardian-scores-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1419-guardian-scores-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/ph/nhan-xet` · `guardian-comments` | [before](../shots/ui-audit/before/C/375x667/v2/1769-guardian-comments-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1415-guardian-comments-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 375x667 | `/quen-mat-khau` · `forgot-password` | [before](../shots/ui-audit/before/C/375x667/v2/1783-forgot-password-main.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1429-forgot-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/cai-dat` · `settings` | [before](../shots/ui-audit/before/C/390x844/v2/1760-settings-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1406-settings-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/cai-dat/doi-mat-khau` · `change-password` | [before](../shots/ui-audit/before/C/390x844/v2/1761-change-password-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1407-change-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/chon-vai-tro` · `role-picker` | [before](../shots/ui-audit/before/C/390x844/v2/1759-role-picker-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1405-role-picker-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/dang-ky` · `register` | [before](../shots/ui-audit/before/C/390x844/v2/1754-register-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1400-register-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/dang-nhap` · `login` | [before](../shots/ui-audit/before/C/390x844/v2/1751-login-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1397-login-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/dang-nhap (PwaGuideGate, Instagram UA)` · `pwa-guide` | [before](../shots/ui-audit/before/C/390x844/v2/1764-pwa-guide-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1410-pwa-guide-main.png) | PWA Guide hiện qua route thật/UA giả lập. |
| C | 390x844 | `/ph` · `guardian-home` | [before](../shots/ui-audit/before/C/390x844/v2/1739-guardian-home-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1385-guardian-home-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/ph/bao-cao` · `guardian-reports` | [before](../shots/ui-audit/before/C/390x844/v2/1749-guardian-reports-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1395-guardian-reports-main.png) | Đã hiện dữ liệu báo cáo phụ huynh phát hành. |
| C | 390x844 | `/ph/buoi/demo-past` · `guardian-session` | [before](../shots/ui-audit/before/C/390x844/v2/1745-guardian-session-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1391-guardian-session-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/ph/diem` · `guardian-scores` | [before](../shots/ui-audit/before/C/390x844/v2/1747-guardian-scores-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1393-guardian-scores-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/ph/nhan-xet` · `guardian-comments` | [before](../shots/ui-audit/before/C/390x844/v2/1743-guardian-comments-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1389-guardian-comments-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 390x844 | `/quen-mat-khau` · `forgot-password` | [before](../shots/ui-audit/before/C/390x844/v2/1757-forgot-password-main.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1403-forgot-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/cai-dat` · `settings` | [before](../shots/ui-audit/before/C/430x932/v2/1812-settings-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1458-settings-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/cai-dat/doi-mat-khau` · `change-password` | [before](../shots/ui-audit/before/C/430x932/v2/1813-change-password-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1459-change-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/chon-vai-tro` · `role-picker` | [before](../shots/ui-audit/before/C/430x932/v2/1811-role-picker-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1457-role-picker-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/dang-ky` · `register` | [before](../shots/ui-audit/before/C/430x932/v2/1806-register-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1452-register-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/dang-nhap` · `login` | [before](../shots/ui-audit/before/C/430x932/v2/1803-login-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1449-login-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/dang-nhap (PwaGuideGate, Instagram UA)` · `pwa-guide` | [before](../shots/ui-audit/before/C/430x932/v2/1816-pwa-guide-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1462-pwa-guide-main.png) | PWA Guide hiện qua route thật/UA giả lập. |
| C | 430x932 | `/ph` · `guardian-home` | [before](../shots/ui-audit/before/C/430x932/v2/1791-guardian-home-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1437-guardian-home-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/ph/bao-cao` · `guardian-reports` | [before](../shots/ui-audit/before/C/430x932/v2/1801-guardian-reports-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1447-guardian-reports-main.png) | Đã hiện dữ liệu báo cáo phụ huynh phát hành. |
| C | 430x932 | `/ph/buoi/demo-past` · `guardian-session` | [before](../shots/ui-audit/before/C/430x932/v2/1797-guardian-session-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1443-guardian-session-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/ph/diem` · `guardian-scores` | [before](../shots/ui-audit/before/C/430x932/v2/1799-guardian-scores-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1445-guardian-scores-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/ph/nhan-xet` · `guardian-comments` | [before](../shots/ui-audit/before/C/430x932/v2/1795-guardian-comments-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1441-guardian-comments-main.png) | Không thấy khác biệt bố cục đáng kể. |
| C | 430x932 | `/quen-mat-khau` · `forgot-password` | [before](../shots/ui-audit/before/C/430x932/v2/1809-forgot-password-main.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1455-forgot-password-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 1024x768 | `/lop` · `shell-tabs` | — ↔ [after](../shots/ui-audit/after/T/1024x768/v2/1250-shell-tabs-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| T | 1024x768 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | — ↔ [after](../shots/ui-audit/after/T/1024x768/v2/1251-shell-class-tabs-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| T | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | — ↔ [after](../shots/ui-audit/after/T/1024x768/v2/1252-session-sheet-menu-main.png) | Ảnh after-only cho viewport mới, không có before tương ứng. |
| T | 1440x900 | `/lop` · `shell-tabs` | [before](../shots/ui-audit/before/T/1440x900/v2/1645-shell-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/1440x900/v2/1253-shell-tabs-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| T | 1440x900 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | [before](../shots/ui-audit/before/T/1440x900/v2/1646-shell-class-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/1440x900/v2/1254-shell-class-tabs-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| T | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | [before](../shots/ui-audit/before/T/1440x900/v2/1647-session-sheet-menu-main.png) ↔ [after](../shots/ui-audit/after/T/1440x900/v2/1255-session-sheet-menu-main.png) | Màn desktop chụp được; không thấy vỡ khung. |
| T | 375x667 | `/lop` · `shell-tabs` | [before](../shots/ui-audit/before/T/375x667/v2/1637-shell-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/375x667/v2/1242-shell-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 375x667 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | [before](../shots/ui-audit/before/T/375x667/v2/1638-shell-class-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/375x667/v2/1243-shell-class-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | [before](../shots/ui-audit/before/T/375x667/v2/1640-session-sheet-menu-main.png) ↔ [after](../shots/ui-audit/after/T/375x667/v2/1245-session-sheet-menu-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 390x844 | `/lop` · `shell-tabs` | [before](../shots/ui-audit/before/T/390x844/v2/1633-shell-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/390x844/v2/1238-shell-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 390x844 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | [before](../shots/ui-audit/before/T/390x844/v2/1634-shell-class-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/390x844/v2/1239-shell-class-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | [before](../shots/ui-audit/before/T/390x844/v2/1636-session-sheet-menu-main.png) ↔ [after](../shots/ui-audit/after/T/390x844/v2/1241-session-sheet-menu-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 430x932 | `/lop` · `shell-tabs` | [before](../shots/ui-audit/before/T/430x932/v2/1641-shell-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/430x932/v2/1246-shell-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 430x932 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | [before](../shots/ui-audit/before/T/430x932/v2/1642-shell-class-tabs-main.png) ↔ [after](../shots/ui-audit/after/T/430x932/v2/1247-shell-class-tabs-main.png) | Không thấy khác biệt bố cục đáng kể. |
| T | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | [before](../shots/ui-audit/before/T/430x932/v2/1644-session-sheet-menu-main.png) ↔ [after](../shots/ui-audit/after/T/430x932/v2/1249-session-sheet-menu-main.png) | Không thấy khác biệt bố cục đáng kể. |

## Trạng thái tương tác ghép cặp

| Team | Viewport | Route / màn | Trạng thái | Before ↔ after |
|---|---:|---|---|---|
| A | 375x667 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `class-menu-open` | [before](../shots/ui-audit/before/A/375x667/v2/1680-class-sessions-class-menu-open.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1288-class-sessions-class-menu-open.png) |
| A | 375x667 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `cuộn đáy` | [before](../shots/ui-audit/before/A/375x667/v2/1679-class-sessions-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1287-class-sessions-scrolled-bottom.png) |
| A | 375x667 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `offline` | [before](../shots/ui-audit/before/A/375x667/v2/1681-class-sessions-offline.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1289-class-sessions-offline.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `class-menu-open` | [before](../shots/ui-audit/before/A/390x844/v2/1655-class-sessions-class-menu-open.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1263-class-sessions-class-menu-open.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `cuộn đáy` | [before](../shots/ui-audit/before/A/390x844/v2/1654-class-sessions-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1262-class-sessions-scrolled-bottom.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `offline` | [before](../shots/ui-audit/before/A/390x844/v2/1656-class-sessions-offline.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1264-class-sessions-offline.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `class-menu-open` | [before](../shots/ui-audit/before/A/430x932/v2/1705-class-sessions-class-menu-open.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1313-class-sessions-class-menu-open.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `cuộn đáy` | [before](../shots/ui-audit/before/A/430x932/v2/1704-class-sessions-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1312-class-sessions-scrolled-bottom.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `offline` | [before](../shots/ui-audit/before/A/430x932/v2/1706-class-sessions-offline.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1314-class-sessions-offline.png) |
| A | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-attendance` | [before](../shots/ui-audit/before/A/375x667/v2/1695-session-detail-tab-attendance.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1303-session-detail-tab-attendance.png) |
| A | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-comments` | [before](../shots/ui-audit/before/A/375x667/v2/1696-session-detail-tab-comments.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1304-session-detail-tab-comments.png) |
| A | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-homework` | [before](../shots/ui-audit/before/A/375x667/v2/1697-session-detail-tab-homework.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1305-session-detail-tab-homework.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-attendance` | [before](../shots/ui-audit/before/A/390x844/v2/1670-session-detail-tab-attendance.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1278-session-detail-tab-attendance.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-comments` | [before](../shots/ui-audit/before/A/390x844/v2/1671-session-detail-tab-comments.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1279-session-detail-tab-comments.png) |
| A | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-homework` | [before](../shots/ui-audit/before/A/390x844/v2/1672-session-detail-tab-homework.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1280-session-detail-tab-homework.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-attendance` | [before](../shots/ui-audit/before/A/430x932/v2/1720-session-detail-tab-attendance.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1328-session-detail-tab-attendance.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-comments` | [before](../shots/ui-audit/before/A/430x932/v2/1721-session-detail-tab-comments.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1329-session-detail-tab-comments.png) |
| A | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-homework` | [before](../shots/ui-audit/before/A/430x932/v2/1722-session-detail-tab-homework.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1330-session-detail-tab-homework.png) |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | `add-student-sheet-open` | [before](../shots/ui-audit/before/A/375x667/v2/1684-class-students-add-student-sheet-open.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1292-class-students-add-student-sheet-open.png) |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/375x667/v2/1683-class-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1291-class-students-scrolled-bottom.png) |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | `keyboard-focus` | [before](../shots/ui-audit/before/A/375x667/v2/1685-class-students-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1293-class-students-keyboard-focus.png) |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-confirm-dialog-open` | [before](../shots/ui-audit/before/A/375x667/v2/1687-class-students-student-confirm-dialog-open.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1295-class-students-student-confirm-dialog-open.png) |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-menu-open` | [before](../shots/ui-audit/before/A/375x667/v2/1686-class-students-student-menu-open.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1294-class-students-student-menu-open.png) |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | `add-student-sheet-open` | [before](../shots/ui-audit/before/A/390x844/v2/1659-class-students-add-student-sheet-open.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1267-class-students-add-student-sheet-open.png) |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/390x844/v2/1658-class-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1266-class-students-scrolled-bottom.png) |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | `keyboard-focus` | [before](../shots/ui-audit/before/A/390x844/v2/1660-class-students-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1268-class-students-keyboard-focus.png) |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-confirm-dialog-open` | [before](../shots/ui-audit/before/A/390x844/v2/1662-class-students-student-confirm-dialog-open.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1270-class-students-student-confirm-dialog-open.png) |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-menu-open` | [before](../shots/ui-audit/before/A/390x844/v2/1661-class-students-student-menu-open.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1269-class-students-student-menu-open.png) |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | `add-student-sheet-open` | [before](../shots/ui-audit/before/A/430x932/v2/1709-class-students-add-student-sheet-open.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1317-class-students-add-student-sheet-open.png) |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/430x932/v2/1708-class-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1316-class-students-scrolled-bottom.png) |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | `keyboard-focus` | [before](../shots/ui-audit/before/A/430x932/v2/1710-class-students-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1318-class-students-keyboard-focus.png) |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-confirm-dialog-open` | [before](../shots/ui-audit/before/A/430x932/v2/1712-class-students-student-confirm-dialog-open.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1320-class-students-student-confirm-dialog-open.png) |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` · `class-students` | `student-menu-open` | [before](../shots/ui-audit/before/A/430x932/v2/1711-class-students-student-menu-open.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1319-class-students-student-menu-open.png) |
| A | 375x667 | `/lop/demo-empty/hoc-sinh` · `empty-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/375x667/v2/1689-empty-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1297-empty-students-scrolled-bottom.png) |
| A | 390x844 | `/lop/demo-empty/hoc-sinh` · `empty-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/390x844/v2/1664-empty-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1272-empty-students-scrolled-bottom.png) |
| A | 430x932 | `/lop/demo-empty/hoc-sinh` · `empty-students` | `cuộn đáy` | [before](../shots/ui-audit/before/A/430x932/v2/1714-empty-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1322-empty-students-scrolled-bottom.png) |
| A | 375x667 | `/lop/moi` · `create-class` | `form-validation-error` | [before](../shots/ui-audit/before/A/375x667/v2/1675-create-class-form-validation-error.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1283-create-class-form-validation-error.png) |
| A | 375x667 | `/lop/moi` · `create-class` | `keyboard-focus` | [before](../shots/ui-audit/before/A/375x667/v2/1676-create-class-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/375x667/v2/1284-create-class-keyboard-focus.png) |
| A | 390x844 | `/lop/moi` · `create-class` | `form-validation-error` | [before](../shots/ui-audit/before/A/390x844/v2/1650-create-class-form-validation-error.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1258-create-class-form-validation-error.png) |
| A | 390x844 | `/lop/moi` · `create-class` | `keyboard-focus` | [before](../shots/ui-audit/before/A/390x844/v2/1651-create-class-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/390x844/v2/1259-create-class-keyboard-focus.png) |
| A | 430x932 | `/lop/moi` · `create-class` | `form-validation-error` | [before](../shots/ui-audit/before/A/430x932/v2/1700-create-class-form-validation-error.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1308-create-class-form-validation-error.png) |
| A | 430x932 | `/lop/moi` · `create-class` | `keyboard-focus` | [before](../shots/ui-audit/before/A/430x932/v2/1701-create-class-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/A/430x932/v2/1309-create-class-keyboard-focus.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `add-session-sheet-open` | [before](../shots/ui-audit/before/B/1440x900/v2/1726-class-sessions-add-session-sheet-open.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1356-class-sessions-add-session-sheet-open.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `cuộn đáy` | [before](../shots/ui-audit/before/B/1440x900/v2/1725-class-sessions-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1355-class-sessions-scrolled-bottom.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | `keyboard-focus` | [before](../shots/ui-audit/before/B/1440x900/v2/1727-class-sessions-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1357-class-sessions-keyboard-focus.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-attendance` | [before](../shots/ui-audit/before/B/1440x900/v2/1736-session-detail-tab-attendance.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1366-session-detail-tab-attendance.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-comments` | [before](../shots/ui-audit/before/B/1440x900/v2/1737-session-detail-tab-comments.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1367-session-detail-tab-comments.png) |
| B | 1440x900 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | `tab-homework` | [before](../shots/ui-audit/before/B/1440x900/v2/1738-session-detail-tab-homework.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1368-session-detail-tab-homework.png) |
| B | 1440x900 | `/lop/demo-6a/hoc-sinh` · `class-students` | `add-student-sheet-open` | [before](../shots/ui-audit/before/B/1440x900/v2/1730-class-students-add-student-sheet-open.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1360-class-students-add-student-sheet-open.png) |
| B | 1440x900 | `/lop/demo-6a/hoc-sinh` · `class-students` | `cuộn đáy` | [before](../shots/ui-audit/before/B/1440x900/v2/1729-class-students-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1359-class-students-scrolled-bottom.png) |
| B | 1440x900 | `/lop/demo-6a/hoc-sinh` · `class-students` | `keyboard-focus` | [before](../shots/ui-audit/before/B/1440x900/v2/1731-class-students-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/B/1440x900/v2/1361-class-students-keyboard-focus.png) |
| C | 375x667 | `/cai-dat/doi-mat-khau` · `change-password` | `form-validation-error` | [before](../shots/ui-audit/before/C/375x667/v2/1788-change-password-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1434-change-password-form-validation-error.png) |
| C | 375x667 | `/cai-dat/doi-mat-khau` · `change-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/375x667/v2/1789-change-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1435-change-password-keyboard-focus.png) |
| C | 390x844 | `/cai-dat/doi-mat-khau` · `change-password` | `form-validation-error` | [before](../shots/ui-audit/before/C/390x844/v2/1762-change-password-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1408-change-password-form-validation-error.png) |
| C | 390x844 | `/cai-dat/doi-mat-khau` · `change-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/390x844/v2/1763-change-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1409-change-password-keyboard-focus.png) |
| C | 430x932 | `/cai-dat/doi-mat-khau` · `change-password` | `form-validation-error` | [before](../shots/ui-audit/before/C/430x932/v2/1814-change-password-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1460-change-password-form-validation-error.png) |
| C | 430x932 | `/cai-dat/doi-mat-khau` · `change-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/430x932/v2/1815-change-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1461-change-password-keyboard-focus.png) |
| C | 1440x900 | `/dang-ky` · `register` | `form-validation-error` | [before](../shots/ui-audit/before/C/1440x900/v2/1832-register-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1478-register-form-validation-error.png) |
| C | 375x667 | `/dang-ky` · `register` | `form-validation-error` | [before](../shots/ui-audit/before/C/375x667/v2/1781-register-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1427-register-form-validation-error.png) |
| C | 375x667 | `/dang-ky` · `register` | `keyboard-focus` | [before](../shots/ui-audit/before/C/375x667/v2/1782-register-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1428-register-keyboard-focus.png) |
| C | 390x844 | `/dang-ky` · `register` | `form-validation-error` | [before](../shots/ui-audit/before/C/390x844/v2/1755-register-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1401-register-form-validation-error.png) |
| C | 390x844 | `/dang-ky` · `register` | `keyboard-focus` | [before](../shots/ui-audit/before/C/390x844/v2/1756-register-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1402-register-keyboard-focus.png) |
| C | 430x932 | `/dang-ky` · `register` | `form-validation-error` | [before](../shots/ui-audit/before/C/430x932/v2/1807-register-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1453-register-form-validation-error.png) |
| C | 430x932 | `/dang-ky` · `register` | `keyboard-focus` | [before](../shots/ui-audit/before/C/430x932/v2/1808-register-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1454-register-keyboard-focus.png) |
| C | 1440x900 | `/dang-nhap` · `login` | `form-validation-error` | [before](../shots/ui-audit/before/C/1440x900/v2/1830-login-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1476-login-form-validation-error.png) |
| C | 375x667 | `/dang-nhap` · `login` | `form-validation-error` | [before](../shots/ui-audit/before/C/375x667/v2/1778-login-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1424-login-form-validation-error.png) |
| C | 375x667 | `/dang-nhap` · `login` | `keyboard-focus` | [before](../shots/ui-audit/before/C/375x667/v2/1779-login-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1425-login-keyboard-focus.png) |
| C | 390x844 | `/dang-nhap` · `login` | `form-validation-error` | [before](../shots/ui-audit/before/C/390x844/v2/1752-login-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1398-login-form-validation-error.png) |
| C | 390x844 | `/dang-nhap` · `login` | `keyboard-focus` | [before](../shots/ui-audit/before/C/390x844/v2/1753-login-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1399-login-keyboard-focus.png) |
| C | 430x932 | `/dang-nhap` · `login` | `form-validation-error` | [before](../shots/ui-audit/before/C/430x932/v2/1804-login-form-validation-error.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1450-login-form-validation-error.png) |
| C | 430x932 | `/dang-nhap` · `login` | `keyboard-focus` | [before](../shots/ui-audit/before/C/430x932/v2/1805-login-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1451-login-keyboard-focus.png) |
| C | 1440x900 | `/ph` · `guardian-home` | `child-picker-open` | [before](../shots/ui-audit/before/C/1440x900/v2/1819-guardian-home-child-picker-open.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1465-guardian-home-child-picker-open.png) |
| C | 1440x900 | `/ph` · `guardian-home` | `cuộn đáy` | [before](../shots/ui-audit/before/C/1440x900/v2/1818-guardian-home-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1464-guardian-home-scrolled-bottom.png) |
| C | 1440x900 | `/ph` · `guardian-home` | `unlinked-guardian-empty` | [before](../shots/ui-audit/before/C/1440x900/v2/1820-guardian-home-unlinked-guardian-empty.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1466-guardian-home-unlinked-guardian-empty.png) |
| C | 375x667 | `/ph` · `guardian-home` | `child-picker-open` | [before](../shots/ui-audit/before/C/375x667/v2/1767-guardian-home-child-picker-open.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1413-guardian-home-child-picker-open.png) |
| C | 375x667 | `/ph` · `guardian-home` | `cuộn đáy` | [before](../shots/ui-audit/before/C/375x667/v2/1766-guardian-home-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1412-guardian-home-scrolled-bottom.png) |
| C | 375x667 | `/ph` · `guardian-home` | `unlinked-guardian-empty` | [before](../shots/ui-audit/before/C/375x667/v2/1768-guardian-home-unlinked-guardian-empty.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1414-guardian-home-unlinked-guardian-empty.png) |
| C | 390x844 | `/ph` · `guardian-home` | `child-picker-open` | [before](../shots/ui-audit/before/C/390x844/v2/1741-guardian-home-child-picker-open.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1387-guardian-home-child-picker-open.png) |
| C | 390x844 | `/ph` · `guardian-home` | `cuộn đáy` | [before](../shots/ui-audit/before/C/390x844/v2/1740-guardian-home-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1386-guardian-home-scrolled-bottom.png) |
| C | 390x844 | `/ph` · `guardian-home` | `unlinked-guardian-empty` | [before](../shots/ui-audit/before/C/390x844/v2/1742-guardian-home-unlinked-guardian-empty.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1388-guardian-home-unlinked-guardian-empty.png) |
| C | 430x932 | `/ph` · `guardian-home` | `child-picker-open` | [before](../shots/ui-audit/before/C/430x932/v2/1793-guardian-home-child-picker-open.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1439-guardian-home-child-picker-open.png) |
| C | 430x932 | `/ph` · `guardian-home` | `cuộn đáy` | [before](../shots/ui-audit/before/C/430x932/v2/1792-guardian-home-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1438-guardian-home-scrolled-bottom.png) |
| C | 430x932 | `/ph` · `guardian-home` | `unlinked-guardian-empty` | [before](../shots/ui-audit/before/C/430x932/v2/1794-guardian-home-unlinked-guardian-empty.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1440-guardian-home-unlinked-guardian-empty.png) |
| C | 1440x900 | `/ph/bao-cao` · `guardian-reports` | `cuộn đáy` | [before](../shots/ui-audit/before/C/1440x900/v2/1828-guardian-reports-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1474-guardian-reports-scrolled-bottom.png) |
| C | 375x667 | `/ph/bao-cao` · `guardian-reports` | `cuộn đáy` | [before](../shots/ui-audit/before/C/375x667/v2/1776-guardian-reports-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1422-guardian-reports-scrolled-bottom.png) |
| C | 390x844 | `/ph/bao-cao` · `guardian-reports` | `cuộn đáy` | [before](../shots/ui-audit/before/C/390x844/v2/1750-guardian-reports-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1396-guardian-reports-scrolled-bottom.png) |
| C | 430x932 | `/ph/bao-cao` · `guardian-reports` | `cuộn đáy` | [before](../shots/ui-audit/before/C/430x932/v2/1802-guardian-reports-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1448-guardian-reports-scrolled-bottom.png) |
| C | 1440x900 | `/ph/buoi/demo-past` · `guardian-session` | `cuộn đáy` | [before](../shots/ui-audit/before/C/1440x900/v2/1824-guardian-session-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1470-guardian-session-scrolled-bottom.png) |
| C | 375x667 | `/ph/buoi/demo-past` · `guardian-session` | `cuộn đáy` | [before](../shots/ui-audit/before/C/375x667/v2/1772-guardian-session-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1418-guardian-session-scrolled-bottom.png) |
| C | 390x844 | `/ph/buoi/demo-past` · `guardian-session` | `cuộn đáy` | [before](../shots/ui-audit/before/C/390x844/v2/1746-guardian-session-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1392-guardian-session-scrolled-bottom.png) |
| C | 430x932 | `/ph/buoi/demo-past` · `guardian-session` | `cuộn đáy` | [before](../shots/ui-audit/before/C/430x932/v2/1798-guardian-session-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1444-guardian-session-scrolled-bottom.png) |
| C | 1440x900 | `/ph/diem` · `guardian-scores` | `cuộn đáy` | [before](../shots/ui-audit/before/C/1440x900/v2/1826-guardian-scores-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1472-guardian-scores-scrolled-bottom.png) |
| C | 375x667 | `/ph/diem` · `guardian-scores` | `cuộn đáy` | [before](../shots/ui-audit/before/C/375x667/v2/1774-guardian-scores-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1420-guardian-scores-scrolled-bottom.png) |
| C | 390x844 | `/ph/diem` · `guardian-scores` | `cuộn đáy` | [before](../shots/ui-audit/before/C/390x844/v2/1748-guardian-scores-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1394-guardian-scores-scrolled-bottom.png) |
| C | 430x932 | `/ph/diem` · `guardian-scores` | `cuộn đáy` | [before](../shots/ui-audit/before/C/430x932/v2/1800-guardian-scores-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1446-guardian-scores-scrolled-bottom.png) |
| C | 1440x900 | `/ph/nhan-xet` · `guardian-comments` | `cuộn đáy` | [before](../shots/ui-audit/before/C/1440x900/v2/1822-guardian-comments-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/1440x900/v2/1468-guardian-comments-scrolled-bottom.png) |
| C | 375x667 | `/ph/nhan-xet` · `guardian-comments` | `cuộn đáy` | [before](../shots/ui-audit/before/C/375x667/v2/1770-guardian-comments-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1416-guardian-comments-scrolled-bottom.png) |
| C | 390x844 | `/ph/nhan-xet` · `guardian-comments` | `cuộn đáy` | [before](../shots/ui-audit/before/C/390x844/v2/1744-guardian-comments-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1390-guardian-comments-scrolled-bottom.png) |
| C | 430x932 | `/ph/nhan-xet` · `guardian-comments` | `cuộn đáy` | [before](../shots/ui-audit/before/C/430x932/v2/1796-guardian-comments-scrolled-bottom.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1442-guardian-comments-scrolled-bottom.png) |
| C | 375x667 | `/quen-mat-khau` · `forgot-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/375x667/v2/1784-forgot-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/375x667/v2/1430-forgot-password-keyboard-focus.png) |
| C | 390x844 | `/quen-mat-khau` · `forgot-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/390x844/v2/1758-forgot-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/390x844/v2/1404-forgot-password-keyboard-focus.png) |
| C | 430x932 | `/quen-mat-khau` · `forgot-password` | `keyboard-focus` | [before](../shots/ui-audit/before/C/430x932/v2/1810-forgot-password-keyboard-focus.png) ↔ [after](../shots/ui-audit/after/C/430x932/v2/1456-forgot-password-keyboard-focus.png) |
| T | 375x667 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | `class-menu-open` | [before](../shots/ui-audit/before/T/375x667/v2/1639-shell-class-tabs-class-menu-open.png) ↔ [after](../shots/ui-audit/after/T/375x667/v2/1244-shell-class-tabs-class-menu-open.png) |
| T | 390x844 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | `class-menu-open` | [before](../shots/ui-audit/before/T/390x844/v2/1635-shell-class-tabs-class-menu-open.png) ↔ [after](../shots/ui-audit/after/T/390x844/v2/1240-shell-class-tabs-class-menu-open.png) |
| T | 430x932 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | `class-menu-open` | [before](../shots/ui-audit/before/T/430x932/v2/1643-shell-class-tabs-class-menu-open.png) ↔ [after](../shots/ui-audit/after/T/430x932/v2/1248-shell-class-tabs-class-menu-open.png) |

## Lỗi lưu/offline

`save-error` giả lập `/sync/push` trả HTTP 503; `offline` gọi `context.setOffline(true)` sau khi tải màn rồi thực hiện ghi giả.

| Kịch bản | Viewport | Màn | Thông báo / retry | Chồng FAB/tab | Khung desktop | Ảnh |
|---|---:|---|---|---|---|---|
| `save` | 390x844 | `test-scores` · error-nhập điểm | Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại; Thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1408-test-scores-save-error-nhập điểm.png) |
| `save` | 390x844 | `session-detail` · error-điểm danh | Lỗi lưu — vui lòng thử lại; không thấy nút thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1410-session-detail-save-error-điểm danh.png) |
| `save` | 390x844 | `create-class` · error-tạo lớp | Lỗi lưu — vui lòng thử lại; Phiếu chưa gửi (8 em); không thấy nút thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1412-create-class-save-error-tạo lớp.png) |
| `save` | 1440x900 | `test-scores` · error-nhập điểm | Lỗi lưu — vui lòng thử lại; Lỗi lưu, vui lòng thử lại; Thử lại; Thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900; outer frame giữ nguyên nhưng banner bị ép rất hẹp, chữ xuống nhiều dòng (T-01 còn). | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1414-test-scores-save-error-nhập điểm.png) |
| `save` | 1440x900 | `session-detail` · error-điểm danh | Lỗi lưu — vui lòng thử lại; không thấy nút thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900 | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1416-session-detail-save-error-điểm danh.png) |
| `save` | 1440x900 | `create-class` · error-tạo lớp | Lỗi lưu — vui lòng thử lại; Phiếu chưa gửi (8 em); không thấy nút thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900 | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1418-create-class-save-error-tạo lớp.png) |
| `offline` | 390x844 | `test-scores` · nhập điểm | Không thấy lỗi hoặc trạng thái chờ gửi.; thay đổi được giữ offline, chưa có trạng thái chờ gửi hiển thị.; không thấy nút thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1414-test-scores-offline-nhập điểm.png) |
| `offline` | 390x844 | `session-detail` · điểm danh | Không thấy lỗi hoặc trạng thái chờ gửi.; không thấy nút thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1416-session-detail-offline-điểm danh.png) |
| `offline` | 390x844 | `create-class` · tạo lớp | Lỗi lưu — vui lòng thử lại; Lỗi lưu — vui lòng thử lại; không thấy nút thử lại | FAB False; tab dưới False | — | [ảnh](../shots/ui-audit/after/A/390x844/v2/1418-create-class-offline-tạo lớp.png) |
| `offline` | 1440x900 | `test-scores` · nhập điểm | Không thấy lỗi hoặc trạng thái chờ gửi.; thay đổi được giữ offline, chưa có trạng thái chờ gửi hiển thị.; không thấy nút thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900 | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1420-test-scores-offline-nhập điểm.png) |
| `offline` | 1440x900 | `session-detail` · điểm danh | Không thấy lỗi hoặc trạng thái chờ gửi.; không thấy nút thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900 | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1422-session-detail-offline-điểm danh.png) |
| `offline` | 1440x900 | `create-class` · tạo lớp | Lỗi lưu — vui lòng thử lại; Lỗi lưu — vui lòng thử lại; không thấy nút thử lại | FAB False; tab dưới False | 1440×868 CSS px trong viewport 1440×900 | [ảnh](../shots/ui-audit/after/A/1440x900/v2/1424-create-class-offline-tạo lớp.png) |

## Lề trái header/tab/thẻ đầu ở 375/390/430

`getBoundingClientRect()`; tọa độ CSS pixel. Selector cụ thể đo được ghi trong bảng và [inventory after](inventory-after.md).

| Team | Viewport | Header trái/phải | Tab/nav trái/phải | Selector thẻ đầu: trái/phải/rộng |
|---|---:|---:|---:|---:|
| A | 390x844 | 0 / 0 | 0 / 0 | `main [class*=list] > *`: 20 / 20 / 350 |
| A | 375x667 | 0 / 0 | 0 / 0 | `main [class*=list] > *`: 20 / 20 / 335 |
| A | 430x932 | 0 / 0 | 0 / 0 | `main [class*=list] > *`: 20 / 20 / 390 |
| C | 390x844 | 0 / 0 | 0 / 0 | `main [class*=card],main [class*=Card]`: 20 / 201 / 169 |
| C | 375x667 | 0 / 0 | 0 / 0 | `main [class*=card],main [class*=Card]`: 20 / 194 / 162 |
| C | 430x932 | 0 / 0 | 0 / 0 | `main [class*=card],main [class*=Card]`: 20 / 221 / 189 |

## Đo chồng lấn

Các banner/toast lỗi không phủ FAB hoặc thanh/tab đáy trong viewport mobile. Desktop không có tab đáy; ảnh score 1440 cho thấy banner chiếm quá hẹp trong hàng lưu dù frame ngoài không tràn. Tọa độ khác nằm trong inventory-after.

| Team | Viewport | Route | FAB/tab · action/tab |
|---|---:|---|---|
| T | 390x844 | `/lop` | FAB `False` · action `False` |
| T | 390x844 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| T | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| T | 375x667 | `/lop` | FAB `False` · action `False` |
| T | 375x667 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| T | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| T | 430x932 | `/lop` | FAB `False` · action `False` |
| T | 430x932 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| T | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| A | 390x844 | `/lop` | FAB `False` · action `False` |
| A | 390x844 | `/lop/moi` | FAB `False` · action `False` |
| A | 390x844 | `/lich` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/hoc-sinh` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-empty/hoc-sinh` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/bai-kiem-tra` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/bai-kiem-tra/demo-test` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/diem` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/bao-cao` | FAB `False` · action `False` |
| A | 390x844 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| A | 375x667 | `/lop` | FAB `False` · action `False` |
| A | 375x667 | `/lop/moi` | FAB `False` · action `False` |
| A | 375x667 | `/lich` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/hoc-sinh` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-empty/hoc-sinh` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/bai-kiem-tra` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/bai-kiem-tra/demo-test` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/diem` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/bao-cao` | FAB `False` · action `False` |
| A | 375x667 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| A | 430x932 | `/lop` | FAB `False` · action `False` |
| A | 430x932 | `/lop/moi` | FAB `False` · action `False` |
| A | 430x932 | `/lich` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/buoi-hoc` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/hoc-sinh` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-empty/hoc-sinh` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/bai-kiem-tra` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/bai-kiem-tra/demo-test` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/diem` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/bao-cao` | FAB `False` · action `False` |
| A | 430x932 | `/lop/demo-6a/buoi-hoc/demo-past` | FAB `False` · action `False` |
| C | 390x844 | `/ph` | FAB `False` · action `False` |
| C | 390x844 | `/ph/nhan-xet` | FAB `False` · action `False` |
| C | 390x844 | `/ph/buoi/demo-past` | FAB `False` · action `False` |
| C | 390x844 | `/ph/diem` | FAB `False` · action `False` |
| C | 390x844 | `/ph/bao-cao` | FAB `False` · action `False` |
| C | 390x844 | `/cai-dat` | FAB `False` · action `False` |
| C | 390x844 | `/dang-nhap` | FAB `False` · action `False` |
| C | 375x667 | `/ph` | FAB `False` · action `False` |
| C | 375x667 | `/ph/nhan-xet` | FAB `False` · action `False` |
| C | 375x667 | `/ph/buoi/demo-past` | FAB `False` · action `False` |
| C | 375x667 | `/ph/diem` | FAB `False` · action `False` |
| C | 375x667 | `/ph/bao-cao` | FAB `False` · action `False` |
| C | 375x667 | `/cai-dat` | FAB `False` · action `False` |
| C | 375x667 | `/dang-nhap` | FAB `False` · action `False` |
| C | 430x932 | `/ph` | FAB `False` · action `False` |
| C | 430x932 | `/ph/nhan-xet` | FAB `False` · action `False` |
| C | 430x932 | `/ph/buoi/demo-past` | FAB `False` · action `False` |
| C | 430x932 | `/ph/diem` | FAB `False` · action `False` |
| C | 430x932 | `/ph/bao-cao` | FAB `False` · action `False` |
| C | 430x932 | `/cai-dat` | FAB `False` · action `False` |
| C | 430x932 | `/dang-nhap` | FAB `False` · action `False` |

### Nút ⋯ cuối danh sách học sinh khi cuộn đáy

| Team | Viewport | Scroller | Nút ⋯ cuối | Giao tab |
|---|---:|---|---|---|
| A | 390x844 | `{'selector': 'window', 'scrollTop': 167, 'scrollHeight': 1011, 'clientHeight': 844}` | `{'x': 316, 'y': 614, 'right': 360, 'bottom': 658, 'width': 44, 'height': 44}` | False |
| A | 375x667 | `{'selector': 'window', 'scrollTop': 344, 'scrollHeight': 1011, 'clientHeight': 667}` | `{'x': 301, 'y': 437, 'right': 345, 'bottom': 481, 'width': 44, 'height': 44}` | False |
| A | 430x932 | `{'selector': 'window', 'scrollTop': 79, 'scrollHeight': 1011, 'clientHeight': 932}` | `{'x': 356, 'y': 702, 'right': 400, 'bottom': 746, 'width': 44, 'height': 44}` | False |
| A | 1024x768 | `{'selector': '_staffContent_1ihof_18', 'scrollTop': 177, 'scrollHeight': 913, 'clientHeight': 736}` | `None` | False |
| B | 1440x900 | `{'selector': '_staffContent_1ihof_18', 'scrollTop': 45, 'scrollHeight': 913, 'clientHeight': 868}` | `None` | False |
| B | 1024x768 | `{'selector': '_staffContent_1ihof_18', 'scrollTop': 177, 'scrollHeight': 913, 'clientHeight': 736}` | `None` | False |

## Cuộn ngang

Đo document/body/root cho mọi route desktop A/B/C tại 1024×768; root routes cũng kiểm ở 375/390/1440.

| Team | Viewport | Route | document/body/root | Cuộn ngang |
|---|---:|---|---:|---|
| T | 1024x768 | `/lop` · `shell-tabs` | 1024/1024/1024 | False |
| T | 1024x768 | `/lop/demo-6a/buoi-hoc` · `shell-class-tabs` | 1024/1024/1024 | False |
| T | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-sheet-menu` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop` · `classes` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/moi` · `create-class` | 1024/1024/1024 | False |
| A | 1024x768 | `/lich` · `schedule` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/hoc-sinh` · `class-students` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-empty/hoc-sinh` · `empty-students` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/bai-kiem-tra` · `tests` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/bai-kiem-tra/demo-test` · `test-scores` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/diem` · `score-grid` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/bao-cao` · `reports` | 1024/1024/1024 | False |
| A | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop` · `classes` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/buoi-hoc` · `class-sessions` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/hoc-sinh` · `class-students` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/bai-kiem-tra` · `tests` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/diem` · `score-grid` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/bao-cao` · `reports` | 1024/1024/1024 | False |
| B | 1024x768 | `/lop/demo-6a/buoi-hoc/demo-past` · `session-detail` | 1024/1024/1024 | False |
| C | 1024x768 | `/ph` · `guardian-home` | 1024/1024/1024 | False |
| C | 1024x768 | `/ph/nhan-xet` · `guardian-comments` | 1024/1024/1024 | False |
| C | 1024x768 | `/ph/buoi/demo-past` · `guardian-session` | 1024/1024/1024 | False |
| C | 1024x768 | `/ph/diem` · `guardian-scores` | 1024/1024/1024 | False |
| C | 1024x768 | `/ph/bao-cao` · `guardian-reports` | 1024/1024/1024 | False |
| C | 1024x768 | `/dang-nhap` · `login` | 1024/1024/1024 | False |
| C | 1024x768 | `/dang-ky` · `register` | 1024/1024/1024 | False |
| C | 1024x768 | `/quen-mat-khau` · `forgot-password` | 1024/1024/1024 | False |
| C | 1024x768 | `/chon-vai-tro` · `role-picker` | 1024/1024/1024 | False |
| C | 1024x768 | `/cai-dat` · `settings` | 1024/1024/1024 | False |
| C | 1024x768 | `/cai-dat/doi-mat-khau` · `change-password` | 1024/1024/1024 | False |
| C | 1024x768 | `/dang-nhap` · `pwa-guide` | 1024/1024/1024 | False |

Kết quả 1024×768: 33 route checks; 0 route tràn. Mọi viewport đã đo: không phát hiện tràn ngang.

## Bất thường còn lại

- [Ảnh lỗi FAB gốc](user-report-students-fab.png) là tham chiếu được cung cấp; after chụp sau commit `0c06a7c` sửa FAB.
- `C` `/cai-dat/doi-mat-khau` (1440x900): ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã)..
- `C` `/cai-dat/doi-mat-khau` (1024x768): ChangePasswordPage chuyển hướng desktop về /cai-dat (theo điều kiện useIsDesktop trong mã)..
- `/lop/demo-6a/buoi-hoc` không có vùng cuộn ở 390x844; state `cuộn đáy` vì vậy giống viewport hiện tại: [ảnh](../shots/ui-audit/after/A/390x844/v2/1262-class-sessions-scrolled-bottom.png) .
- `/lop/demo-6a/buoi-hoc` không có vùng cuộn ở 375x667; state `cuộn đáy` vì vậy giống viewport hiện tại: [ảnh](../shots/ui-audit/after/A/375x667/v2/1287-class-sessions-scrolled-bottom.png) .
- `/lop/demo-6a/buoi-hoc` không có vùng cuộn ở 430x932; state `cuộn đáy` vì vậy giống viewport hiện tại: [ảnh](../shots/ui-audit/after/A/430x932/v2/1312-class-sessions-scrolled-bottom.png) .
- `/lop/demo-6a/buoi-hoc` không có vùng cuộn ở 1440x900; state `cuộn đáy` vì vậy giống viewport hiện tại: [ảnh](../shots/ui-audit/after/B/1440x900/v2/1355-class-sessions-scrolled-bottom.png) .

## Staging

Nguồn: https://qlh-staging-web.pages.dev. OPTIONS preflight đạt HTTP 204, origin khớp, POST được phép. Parser `readCredentialSections` và selector/form login theo `scripts/e2e-staging-ui.mjs`; dry-run thấy 2 mục vai (chỉ ghi độ dài trường, không ghi giá trị). Parent đăng nhập HTTP 200 và chụp 8 ảnh C. Teacher đăng nhập HTTP 200; sau đăng nhập `/lop` không có link lớp phù hợp để harness tiếp tục nên dừng, không gửi lại và không có ảnh A/B. Trước đó một lần bị CORS ở deployment URL nên request không tới API; một lần harness lỗi trước khi lưu status. Chỉ mở route GET, không ghi dữ liệu. CSS/DOM che SĐT trước ảnh; regex DOM 0 kết quả; OCR trên 8 ảnh parent không phát hiện chuỗi khớp định dạng SĐT.

| Team | Viewport | URL thật | Màn | Ảnh | Phone residue |
|---|---|---|---|---|---:|
| C | 390x844 | https://qlh-staging-web.pages.dev/ph | guardian-home | [ảnh](../shots/ui-audit/after/staging/C/390x844/001-guardian-home.png) | 0 |
| C | 390x844 | https://qlh-staging-web.pages.dev/ph/nhan-xet | guardian-comments | [ảnh](../shots/ui-audit/after/staging/C/390x844/002-guardian-comments.png) | 0 |
| C | 390x844 | https://qlh-staging-web.pages.dev/ph/diem | guardian-scores | [ảnh](../shots/ui-audit/after/staging/C/390x844/003-guardian-scores.png) | 0 |
| C | 390x844 | https://qlh-staging-web.pages.dev/ph/bao-cao | guardian-reports | [ảnh](../shots/ui-audit/after/staging/C/390x844/004-guardian-reports.png) | 0 |
| C | 1440x900 | https://qlh-staging-web.pages.dev/ph | guardian-home | [ảnh](../shots/ui-audit/after/staging/C/1440x900/005-guardian-home.png) | 0 |
| C | 1440x900 | https://qlh-staging-web.pages.dev/ph/nhan-xet | guardian-comments | [ảnh](../shots/ui-audit/after/staging/C/1440x900/006-guardian-comments.png) | 0 |
| C | 1440x900 | https://qlh-staging-web.pages.dev/ph/diem | guardian-scores | [ảnh](../shots/ui-audit/after/staging/C/1440x900/007-guardian-scores.png) | 0 |
| C | 1440x900 | https://qlh-staging-web.pages.dev/ph/bao-cao | guardian-reports | [ảnh](../shots/ui-audit/after/staging/C/1440x900/008-guardian-reports.png) | 0 |
