# UI click check

Worktree: `hotfix/menu-zindex` at `b1014ba`; Vite `127.0.0.1:5191`; Playwright Chromium; mocked local fixture/API only.

## Unpatched CSS

Temporarily restored `.menu { z-index: var(--z-menu) }`, ran `node scripts/ui-click-check.mjs`, then restored the patch in a `finally` block.

- Exit code: **1**
- Summary: **9 passed, 12 failed**
- The class menu items failed at both viewport sizes. `elementFromPoint` reported `.scrim` over the menu item center, including `390×844` at `(276, 89)` and `1440×900` at `(1143.8, 169)`.
- Other menu items covered by the same scrim also failed: desktop student row menu, desktop session menu, and class-menu-to-dialog flows.

## Patched CSS

Restored `.menu { z-index: calc(var(--z-overlay) + 1) }` and reran `npm run test:click`.

- Exit code: **0**
- Summary: **21 passed, 0 failed**
- Covered class menu items (`Sửa lớp`, `Sửa lịch học`, `Lưu trữ lớp`) at `390×844` and `1440×900`; student, session, and desktop test-row menus; sheet/dialog/popover/guardian child picker interactions; confirmation button; and backdrop closing for class edit, add-student sheet, and guardian child picker at both viewport sizes.

All menu/overlay controls were operated with Playwright `locator.click()` (mouse input), without `force` or dispatched click events. The harness checks `document.elementFromPoint()` at the target center before each click and reports the covering element on failure.
