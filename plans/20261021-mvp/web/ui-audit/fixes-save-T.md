# fixes-save-T: mẫu chung cho nút lưu/gửi/tạo (webui-06)

Chỉ sửa `src/shared/**` và `features/scores/UnsavedChangesDialog.tsx`. Không đụng `src/data/**`, không đổi màn của A/B/C. Không thêm chip "Đã lưu/Đã đồng bộ/Chưa lưu" (spec 5.3).

## Hợp đồng repository (chỉ đọc, `src/data/repositories`)
- **Đồng bộ** (trả giá trị ngay): `saveScore`, `saveAttendance`/`saveAttendanceBatch`, `saveSessionComment`, `sendSessionTickets`, `saveHomeworkSection`, `setHomeworkGrade`, `createTest`/`updateTest`, `saveReport`.
- **Promise**: `createClass`, `updateClass`, `createStudent`, `updateStudent`, `updateStudentPhone`, `createSession`/`createExtraSession`/`updateExtraSession`, `updateClassSchedule*`, `publishReport`, `saveReportComment`; đăng nhập/đăng ký/đổi mật khẩu (`data/auth`) là Promise qua mạng.
- Hook chấp nhận cả hai. Lỗi đồng bộ (`requirePermission` ném) cũng thành "lưu thất bại". Không cần đổi repository.

## API

### `useSaveAction({ baseline, value, isEqual?, validate?, save })` — `src/shared/hooks/useSaveAction.ts`
Trả `{ dirty, valid, saving, canSave, error, submit, reset }`.
- `baseline`: dữ liệu gốc (từ store/prop). `value`: giá trị đang nhập. `isEqual` mặc định `deepEqual` (primitive/object/array).
- `validate(value)`: trả `false` hoặc chuỗi lỗi = chưa hợp lệ; `true`/`undefined`/`null` = hợp lệ.
- `save(value)`: đồng bộ hay Promise. Ném lỗi, reject hoặc trả `false` = thất bại (giữ dirty, `error` có giá trị). Trả gì khác (kể cả `undefined`) = thành công.
- `canSave = dirty && valid && !saving` → dùng cho `disabled` của nút lưu.
- `submit()` khoá re-entry bằng ref: bấm lần 2 trong lúc lưu (kể cả save đồng bộ, khoá đến hết microtask) không gọi `save` thêm, trả `false`. Resolve `true` khi xong.
- Thành công: baseline nội bộ = giá trị vừa lưu, nút về disabled. Khi `baseline` từ ngoài đổi (dữ liệu tải lại) thì bỏ giá trị "vừa lưu" và so với baseline mới.
- `reset()`: coi giá trị hiện tại là baseline (dùng sau "Bỏ thay đổi" nếu bạn tự đặt lại `value` thì không cần).

### `useLeaveGuard(dirty)` — `src/shared/hooks/useLeaveGuard.ts`
Trả `{ blocked, proceed, stay }`. `useBlocker` chỉ chặn khi **đường dẫn đổi** (đổi query/hash như `?hoc-sinh=` không hỏi) + `beforeunload` khi dirty (đóng tab/tải lại). Cần data router.

### `UnsavedChangesDialog` — `src/shared/ui` (`{ open, title?, message?, saving?, onSave, onDiscard, onStay }`)
`features/scores/UnsavedChangesDialog.tsx` giữ API cũ (`testName`) bằng một wrapper mỏng gọi bản chung với `title="Điểm chưa lưu"`; màn điểm không phải sửa. Style `confirm*` trong `scores.module.css` giờ không còn dùng (A có thể xoá).

### `Button loading` / `ActionFooter hint`
- `<Button loading>`: `disabled` + `aria-busy="true"`, giữ màu/bề rộng, nhãn ẩn thị giác (vẫn trong DOM), vòng quay ở giữa. Đã đo 390: rộng bằng nút thường (350 và 56).
- `<ActionFooter hint="Chưa có thay đổi để lưu" hintTone="muted|error">`: dòng lý do phía trên nút, nhóm có `role="group"` + `aria-describedby`.

## Ví dụ

**Form đơn (modal/sheet, mạng hoặc cục bộ)**
```tsx
const [name, setName] = useState(student.name);
const action = useSaveAction({
  baseline: student.name, value: name,
  validate: (v) => v.trim() !== "",
  save: (v) => updateStudent(student.id, { name: v.trim() }),   // Promise
});
const guard = useLeaveGuard(action.dirty);
<ActionFooter hint={!action.dirty ? "Chưa có thay đổi để lưu" : undefined}>
  <Button size="lg" disabled={!action.canSave} loading={action.saving}
          onClick={async () => { if (await action.submit()) onClose(); }}>Lưu</Button>
</ActionFooter>
<UnsavedChangesDialog open={guard.blocked} saving={action.saving}
  onSave={async () => { if (await action.submit()) guard.proceed(); }}
  onDiscard={() => { discard(); guard.proceed(); }} onStay={guard.stay} />
```
Trong sheet/modal: khi đóng bằng nút Đóng mà còn dirty, tự hỏi bằng `UnsavedChangesDialog` (không qua router, `open` do state của bạn). `loading` chỉ nên dùng khi `save` thật sự chờ mạng (yêu cầu 2: gửi nhận xét, phát hành báo cáo, đăng nhập/ký/đổi mật khẩu) — `disabled={!canSave}` đã đủ cho lưu cục bộ vì `canSave` tự về false trong lúc lưu.

**Danh sách nhiều hàng (điểm danh, điểm, nhận xét)**: `value` = toàn bộ map/mảng các hàng đang nhập, `baseline` = map từ store; `save` ghi cả lô (`saveAttendanceBatch`, hoặc lặp `saveScore` rồi trả `false` nếu có hàng lỗi). `validate` đếm hàng không hợp lệ → `hint="Sửa N ô lỗi để lưu điểm" hintTone="error"`. Bản nháp hiện có (`scoreDrafts`) có thể làm `value`; `dirty` thay cho `currentDraftEntries.length > 0`.

## Chú ý theo team
- **A** (điểm danh, điểm, nhận xét, BTVN, tạo/sửa lớp, buổi, bài kiểm tra): thay `disabled={invalidCount > 0 || !dirty}`/state `dirty` tự quản bằng `useSaveAction`; thay `useBlocker` tự viết (`TestScoresPage`, `SessionDetailPage`) bằng `useLeaveGuard`. Bỏ chip trạng thái nếu còn. Hàm lưu của màn điểm hiện trả boolean: giữ được (trả `false` = thất bại).
- **B** (desktop): cùng hook, khác bố cục; `ActionFooter` desktop căn phải. Nút trong bảng không cần `loading`.
- **C** (đăng nhập, đăng ký, đổi mật khẩu, cài đặt, phụ huynh): `loading` bắt buộc cho hành động mạng; `save` là Promise của `data/auth`; lỗi hiển thị bằng `authFailureMessage(error)` từ `action.error`. Form có ô mật khẩu: `baseline` rỗng, `validate` kiểm độ dài.
- `loading` + `disabled` cùng lúc không mâu thuẫn: component tự gộp. `submit` trả boolean; đừng gọi `save` trực tiếp ngoài `submit`.
- Không hiện "Đã lưu". Thành công chỉ là nút về disabled (và đóng modal/điều hướng nếu có).

## Test mới
- `src/shared/hooks/useSaveAction.test.tsx` (7): dirty/valid/canSave; bấm 2 lần chỉ gọi 1 lần (sync); Promise chờ → `saving`, xong về disabled; lỗi (ném/reject/false) giữ dirty; baseline ngoài đổi; so sâu.
- `src/shared/hooks/useLeaveGuard.test.tsx` (5): chặn khi dirty + ở lại/đi tiếp; sạch cho qua; đổi query không hỏi; `beforeunload` chỉ khi dirty.
- `src/shared/ui/saveUi.test.tsx`: Button loading, ActionFooter hint, dialog `saving`.

## Kiểm
`npm run typecheck` xanh; `npm test` 40 file pass/1 skipped, 302 test pass/1 skipped; `npm run build` exit 0, JS gzip lớn nhất 170 353 B; ảnh `shots/ui-audit/after/T/save-pattern-390.png` (hint muted/error, nút thường, loading lg và sm).

# Bổ sung: chặn đóng Modal/Sheet khi còn nhập dở

Lỗi: `Modal`/`Sheet` chạy animation đóng rồi mới gọi `onClose`, nên form chặn đóng trong `onClose` làm hộp thoại chớp mờ rồi hiện lại.

## API
- **`beforeClose?: () => boolean | Promise<boolean>`** trên `Modal` và `Sheet` (`src/shared/ui`, kiểu `BeforeClose`). Gọi TRƯỚC animation đóng cho mọi đường đóng người dùng: Esc, bấm nền, nút Đóng mặc định, và nút trong thân/footer/header có `onClick={onClose}`. Trả `false` (hoặc Promise `false`) thì không đóng, không chạy animation, không gọi `onClose`. Bản Promise bỏ qua yêu cầu đóng mới cho tới khi lần kiểm trước xong. Ném lỗi = không đóng. Không truyền = hành vi cũ.
- Đóng bằng cách form tự đặt `open={false}` (sau khi lưu xong) **không** đi qua `beforeClose`.
- **`useUnsavedCloseGuard(action, { onClose, onDiscard?, title?, message? })`** (`src/shared/hooks/useUnsavedCloseGuard.ts`) → `{ beforeClose, dialogProps }`. `action` là kết quả `useSaveAction` (chỉ cần `dirty`, `saving`, `submit`). Sạch: cho đóng. Dirty: không đóng, mở `UnsavedChangesDialog` (Lưu / Bỏ thay đổi / Ở lại). Đang lưu: không cho đóng. Lưu thành công → gọi `onClose`; lưu lỗi → ở lại (dirty giữ nguyên). Bỏ thay đổi → `onDiscard()` rồi `onClose()`. Ở lại → chỉ tắt hộp thoại.

## Ví dụ
```tsx
const [open, setOpen] = useState(false);
const [name, setName] = useState(student.name);
const action = useSaveAction({ baseline: student.name, value: name, validate: (v) => v.trim() !== "",
                               save: (v) => updateStudent(student.id, { name: v.trim() }) });
const guard = useUnsavedCloseGuard(action, { onClose: () => setOpen(false), onDiscard: () => setName(student.name) });

<Modal open={open} onClose={() => setOpen(false)} title="Sửa học sinh" beforeClose={guard.beforeClose}
       footer={<Button size="lg" disabled={!action.canSave} loading={action.saving}
                       onClick={async () => { if (await action.submit()) setOpen(false); }}>Lưu</Button>}>
  <Input value={name} onChange={(e) => setName(e.target.value)} />
</Modal>
<UnsavedChangesDialog {...guard.dialogProps} />
```
`Sheet` dùng y hệt. Khi mở lại modal nhớ đặt lại `name` về dữ liệu gốc (hoặc mount modal có `key`). Hộp thoại chưa lưu là `<dialog>` thứ hai trong top layer nên nằm trên modal. Màn dùng `useLeaveGuard` cho điều hướng trang vẫn dùng như cũ; modal dùng `beforeClose`.

## Test
`src/shared/ui/guardedClose.test.tsx` (13): `Modal` và `Sheet`: `false` chặn Esc/nền/nút Đóng và không đặt `data-closing`; `true` đóng; Promise chờ và bỏ qua yêu cầu thứ hai; không truyền thì như cũ. `useUnsavedCloseGuard`: sạch đóng ngay; dirty hỏi, Ở lại giữ giá trị; Bỏ thay đổi đóng và đặt lại; Lưu lỗi ở lại, Lưu thành công đóng.

Kiểm (`src/shared`): `npx vitest run src/shared` 9 file/48 test pass. `features/scores/UnsavedChangesDialog.tsx` nay nhận đủ props của bản chung (`saving`, `title`, `message`), `testName` tuỳ chọn. `npm run typecheck`/`npm test` toàn repo hiện đỏ do `src/features/**` của A/B đang sửa dở (thiếu import `UnsavedChangesDialog` ở AddStudentModal, EditClassModal, EditClassSchedule, CommentTicketSheet, HomeworkPanel, AddSessionModal; `closeNow` khai báo hai lần ở EditClassSchedule; `saveStates.test.tsx` import `./useBusyAction` chưa có); không do `src/shared`. Chưa chạy `npm run build` vì lý do này.

## Sửa nhỏ: `UnsavedChangesDialog` không render khi đóng
`src/shared/ui/UnsavedChangesDialog.tsx`: `open=false` trả `null` (không còn `<dialog>` và nút "Lưu" trong DOM); `open=true` render rồi `showModal()`. Hộp thoại này vốn không có animation đóng nên không cần trì hoãn unmount. Test trong `saveUi.test.tsx`: đóng thì container rỗng, mở thì có `open`, đóng lại thì gỡ, `saving` khoá Lưu, Ở lại gọi `onStay`. `npx vitest run src/shared`: 9 file/51 test pass.
