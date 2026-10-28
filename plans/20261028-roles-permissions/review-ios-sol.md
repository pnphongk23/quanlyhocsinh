# Final iOS review — roles and permissions

Reviewed: `mvp-ios-roles`, `1fcfcb3..e8e3d7d` (HEAD `e8e3d7de292d220d2156fb38d5310f25f2c13973`).
Worktree: `/Users/phamnhuphong/.paseo/worktrees/0fvr24l0/mvp-ios-roles`.

Contract: the supplied main-repository `plans/20261021-mvp/backend/api-spec.md` §11, `plans/20261028-roles-permissions/scope.md`, and updated `docs/spec.md` §§4/8. The worktree's older spec still lists staff management under “Làm sau”; the explicit 1.1 scope and supplied current contract govern this review.

## Findings

### High — Known removal from a class does not hide its cached data if the following sync fails

**Location:** `ios/QuanLyLop/Features/Classes/TeacherRootView.swift:70-73`; `ios/QuanLyLop/Features/Auth/AuthService.swift:521-527`.
Supporting paths: `TeacherFeatureData.swift:145-175,178-195`, `Core/Sync/SyncCoordinator.swift:109-151`, `Core/Models/Entities.swift:417`.

A staff member has cached classes C1/C2. Admin removes C2; the next successful `/me` returns the new `scope_epoch` and `class_ids: [C1]`. Because user/workspace/membership IDs are unchanged, `installIdentity` keeps the same store. The new observer merely starts another sync; neither it nor the feature store uses the returned class IDs to hide removed classes or quarantines data whose cached epoch is stale. If connectivity is lost immediately after `/me`, before sync obtains `resync_required`, `refresh()` catches the network error and `reload()` reads all old records. C2 and its roster/data remain accessible despite the app already knowing C2 was revoked.

Apply the confirmed scope reduction before awaiting another request: filter/quarantine the affected cached view and routes until a matching snapshot is installed, while preserving the outbox. This is required by scope §6 and spec §4's cache-hiding rule. Add a regression covering successful `/me` with reduced class IDs followed by an offline sync and a pre-existing C2 cache.

### Medium — Score/comment write gates wait behind a network sync

**Location:** `ios/QuanLyLop/Features/Classes/TeacherRootView.swift:71-73`.
Supporting paths: `TeacherFeatureData.swift:175-183`, `Features/Scores/ScoresFeatureStore.swift:71-89,230-240`, `Features/Scores/TestsTabView.swift:392`.

With a score editor already open, Admin changes `scores` from `write` to `read`. After `/me` installs the new permissions, the observer awaits `data.configure()`, which awaits a complete sync, before calling `i4Data.configure()`. The latter is where score/comment/report write flags are updated. During a slow or stalled sync, the open editor retains `canWriteScores = true` and can accept/enqueue edits under permissions the app already knows were removed. Backend rejection prevents a server-side bypass, but the UI can accept changes that will never sync.

Bind both stores' new permission flags synchronously before either network refresh. Add a test with a suspended sync response that asserts score/comment write controls are disabled as soon as the new identity arrives.

### Medium — Concurrent permission changes can replace the matrix with an older response

**Location:** `ios/QuanLyLop/Features/Staff/StaffStore.swift:84-90`; `ios/QuanLyLop/Features/Staff/StaffViews.swift:375-378`.

Each tap starts an independent task, controls remain enabled, and every response replaces the role's entire permission set. For example, change Scores to None, then Comments to Read. If the response containing both changes arrives before the earlier response containing only the Scores change, line 90 installs the earlier full snapshot last: Comments appears reverted although the server saved Read. Repeated changes to the same cell also have no ordering guarantee.

Serialize updates for each role, or track pending generations and reconcile against the server without allowing older snapshots to replace newer state. Test two delayed responses completing in reverse order; the existing permission test sends only one update.

### Medium — Revocation silently switches workspace when exactly one role remains

**Location:** `ios/QuanLyLop/Features/Auth/AuthService.swift:536-543`.
Supporting paths: `AuthService.swift:408-427,554-557`; `QuanLyLopTests/Staff/StaffTests.swift:200-211`.

A user is active in A and also has role B. Admin disables A. `/me` returns `active_membership_id: null` and just B. Although `wasRevoked` is true, `selectSoleMembership()` executes before the revocation branch, selects B and returns to the main screen. `selectMembership()` clears the message, so the required revocation notice is never shown. This also changes the active workspace without the recovery choice requested in the brief.

Handle `wasRevoked` before automatic sole-role selection, hide the old active store, and show the role picker with the notice. The added test deliberately leaves two roles after revocation, so it does not cover this common two-to-one transition.

### Medium — Cold restore cannot recognize a previously revoked sole role

**Location:** `ios/QuanLyLop/Features/Auth/AuthService.swift:507-508,518-520`.
Supporting paths: `AuthService.swift:189-206`; `Features/Auth/AuthFlowView.swift:115-117`.

After the app is terminated with membership A cached, Admin disables A. On the next online launch, `restoreSession()` fetches `/me` before loading the saved identity. Both in-memory `session` and `identity` are nil, so `previousActiveId` is nil and `wasRevoked` is false. A response with no memberships enters `.main`; `AuthFlowView` treats it as the empty guardian shell, instead of showing login and the revocation message. The newly added tests only revoke an identity already installed during the same process.

Compare the fresh identity against the persisted previous active membership on restore, preserving the legitimate no-membership guardian flow. Add a cold-start test with a cached active A and an online `/me` response containing no memberships.

### Low — New UI does not meet the explicit token-only requirement

**Location:** `ios/QuanLyLop/Features/Auth/AuthSettingsView.swift:143`; `ios/QuanLyLop/Features/Staff/StaffViews.swift:119-124,226-245,349-353,373`.

The new settings icon hardcodes font size 16, and the staff screens repeatedly hardcode spacing/padding (2/8/12/16/24) instead of referencing tokens. These values currently resemble the token scale, but will remain fixed when the shared design values change, contrary to the repository rule and this review's explicit acceptance criterion. Use the existing semantic metrics/text styles, adding a shared token first where needed. Colors and selected/disabled treatments in the new staff views otherwise use the shared design system.

## Contract and security checks

- Staff models and requests match §11's field names and enum values. Shared wire encoding supplies `snake_case`; update sends optional changed fields plus `base_version`.
- Pending cancellation uses `DELETE` with `EmptyResponse`; the real URLSession client handles HTTP 204 at `Core/Networking/APIClient.swift:132`.
- `staff_exists`, `last_admin`, `not_pending`, `role_not_editable`, `admin_required`, and `version_conflict` have specific messages. Existing account names are read-only; pending declarations can be renamed.
- Admin entry visibility checks `systemKey == "admin"`. The permission editor exposes two staff roles and five groups, excluding lectures. Last-admin protection is correctly left to the server; its rejection is surfaced. Backend enforcement was not executed in this iOS review.
- First-password copy is neutral for staff. No newly added Vietnamese string literals were found in feature code. All 52 newly referenced default-table localization keys exist.
- No added logging calls were found in the diff; no phone/comment logging was introduced.
- Revocation drops active store/coordinator references without deleting their data. SQLite cache reset/snapshot code also preserves the outbox. The new tests do not assert durable outbox/cache preservation through revocation or session rebuilding.

## Verification and limits

- `git diff --check 1fcfcb3..e8e3d7d`: exit 0.
- `xcrun swiftc -frontend -parse` on StaffModels, StaffStore, StaffViews, AuthService, TeacherRootView and StaffTests: exit 0. This verifies syntax only, not type checking, linking or runtime behavior.
- Localization catalog parsed as JSON; 52 added key references checked, 0 missing. The initial whole-file scan also encountered existing named-table keys; the final check was restricted to newly added default-table references.
- Reviewed all 14 added test methods. Missing regressions are identified with the findings above; live post-login session replacement is also not asserted by these tests.
- No simulator, app launch, XCTest execution, device build, staging call, push, or source edit was performed. Reviewed worktree remained clean at the requested commit.

Tôi không thể xác minh điều này hoạt động vì review không cho dùng simulator và tôi chưa chạy XCTest hoặc kiểm thử trên thiết bị thật; bằng chứng ở đây là kiểm tra tĩnh và lần theo mã nguồn.

Status: DONE_WITH_CONCERNS
Summary: Found 1 High, 4 Medium and 1 Low issue, chiefly known-scope cache exposure, delayed permission gating, permission-update races and missed revocation recovery paths. API shapes and localization checks pass static review, but runtime behavior remains unverified.
