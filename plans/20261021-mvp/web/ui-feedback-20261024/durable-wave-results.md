# Durable wave verification

Candidate: `81abd0ad7c4a900db1bb0d7462e8af1cc90e342e` (mvp-web). No `src/**` edits or commit in this verification.

## Requested checks

| Check | Result |
|---|---|
| `npm run test:save` | 158 PASS / 0 FAIL / 24 INFO |
| `npm run test:click` ×3 | 21/0, 21/0, 21/0 PASS/FAIL |
| `npm run test:state -- --target web` ×2 | 95/0/24 PASS/FAIL/SKIP each |
| `npm run test:state -- --target proto` ×1 | 54/0/60 PASS/FAIL/SKIP |
| F9 score keyboard at 1440 ×20 | Each web run: 20 cycles, 0 focus loss, 0 key movement failures, 0 empty-state flashes; 40 cycles total |

## Durable and browser checks

- Mobile BTVN grading storage error at 390×844: PASS in both web runs. The selected “Hoàn thành” level remained pressed and the “Chưa lưu” chip remained visible alongside the save error. Capture: `shots/after/F8-save-error-homework-grading-mobile-390.png`.
- Other IndexedDB error checks passed: homework section and ticket at 390; attendance, score entry, score grid, homework grading, and ticket at 1280. Each retained editor/value and showed an error. Existing captures: `F8-save-error-homework-section-390.png`, `F8-save-error-ticket-390.png`, `F8-save-error-attendance-1280.png`, `F8-save-error-score-entry-1280.png`, `F8-save-error-score-grid-1280.png`, `F8-save-error-homework-grading-1280.png`, `F8-save-error-ticket-1280.png` under `shots/after/`.
- No-delay preview timing, click “Lưu điểm” to completed `POST /v1/sync/push`: 10 trials, **min 669 ms, median 686 ms, max 718 ms**; all 10 under 1 second. Eight changed scores produced **1 push request containing 8 commands**.
- `/`: unauthenticated redirected to `/dang-nhap`; staff redirected to `/lop`; FoundationHome flash detector false for both. Captures: `shots/after/root-immediate-unauth.png`, `root-immediate-staff.png`.

## Click baseline

All three current runs passed 21/21. No failure types appeared in this sample. Historically observed baseline types include detached desktop session/test menu locators and mobile targets below the 844 px viewport; current runs did not reproduce them. Full baseline history: `baseline-click.md`.

## Evidence

- Web result JSON: `tools/state-check-web-81abd0a-run1.json`, `tools/state-check-web-81abd0a-run2.json`; each 95 PASS / 24 SKIP.
- Prototype result JSON: `tools/state-check-proto.json`; 54 PASS / 60 SKIP. Unsupported prototype routes/states remain SKIP, not PASS.
- Durable probe output was printed for candidate `81abd0a`; 10 latencies and batching count are recorded above.
- `node --check scripts/ui-state-check.mjs` passed before runs. `test:save`, all click runs, and all state runs exited successfully.
