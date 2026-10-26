# Review tổng thể r1 (codex luna high, `61191cbf`) — APPROVE_WITH_CHANGES

| # | Mức | Phát hiện | Xử lý |
|---|---|---|---|
| 1 | REQUIRED | `sync.ts` ~225 `onForeground` không gọi `syncNow()` khi đang chạy ⇒ không đặt `again`, lỡ thay đổi mới | Nhận; DA-5 sửa + test đỏ→xanh |
| 2 | REQUIRED | `rest-cache.ts` 13–31 lỗi ghi Dexie vẫn cập nhật bộ nhớ, im lặng ⇒ bản ghi biến mất sau hydrate | Nhận; DA-6 sửa: lỗi hiện + `syncNow()` khôi phục + test |
| 3 | OPTIONAL | Test 2 thiết bị chèn thẳng fake server/Dexie cho A | Nhận; DA-5 thêm ca A qua repository thật |

## Vòng 2 (cuối) — reviewer mới `6480fc6f` (luna high) — APPROVE_WITH_CHANGES
Bảng H1–H7 có file:dòng cả backend và web; H2–H7 đúng plan; r1 đã đóng (`sync.ts:225-231`, `rest-cache.ts:32-36`, `sync-two-devices-repositories.test.ts`); không lỗi mới. Reviewer tự chạy: web 52 file / 368 test, backend 27 file / 137 test, typecheck sạch. Một điểm: H1 trong plan/contract còn ghi Smart Placement trong khi mã ghim `gcp:asia-east2` ⇒ lead đã cập nhật `plan.md` H1 và `contract-changes.md` dòng 5 ghi quyết định + số đo. Hết 2 vòng, không mở vòng 3.
