/**
 * UI assertions shared by TC-CMT-012, TC-RPT-008/017, and TC-OFF-008.
 * These helpers deliberately accept an already-authenticated Playwright page
 * staged on the relevant screen. Scenario setup/data creation lives in the
 * owning TC flow. Browser runs are allowed after a disk-space check.
 */

export async function withOffline(context, action) {
  try {
    await context.setOffline(true);
    return await action();
  } finally {
    await context.setOffline(false);
  }
}

export async function assertClassTicketSendBlocked(page) {
  const send = page.getByRole('button', { name: /Gửi phiếu cả lớp/ });
  if (await send.count() !== 1) throw new Error('TC-CMT-012: expected one class-send button');
  if (await send.isEnabled()) throw new Error('TC-CMT-012: class-send button must be disabled offline');
  const hint = page.locator('#comments-desktop-send-offline-hint');
  if ((await hint.innerText()).trim() !== 'Cần có mạng để gửi phiếu') {
    throw new Error('TC-CMT-012: missing network-required hint');
  }
}

export async function saveOfflineTicketDraft(page) {
  return withOffline(page.context(), async () => {
    // Slip v4 (web df625e3): criterion chips toggle via aria-pressed; slip-note is the typed part of the merged comment.
    await page.getByTestId('slip-criterion-3').click();
    const note = page.getByTestId('slip-note');
    await note.fill('QA-Web-offline-note');
    await note.blur();
      await assertClassTicketSendBlocked(page);
      await page.getByText('Đã lưu trên máy · sẽ đồng bộ khi có mạng', { exact: true }).last().waitFor({ timeout: 10000 });
      const retainedDraft = await note.inputValue();
    if (!retainedDraft) throw new Error('TC-CMT-012: offline draft text was lost');
    return retainedDraft;
  });
}

export async function assertReportCommentPreview(page, comment) {
  const editor = page.getByLabel('Nhận xét chung của đợt');
  await editor.fill(comment);
  await editor.blur();
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible' });
  if (!(await dialog.getByRole('article', { name: 'Bản xem trước báo cáo' }).count())) {
    throw new Error('TC-RPT-008: preview article not present in dialog');
  }
  if (!(await dialog.getByText(comment, { exact: true }).count())) {
    throw new Error('TC-RPT-008: saved general comment missing from preview');
  }
}

export async function assertReportCommentRejectedOffline(page, comment) {
  return withOffline(page.context(), async () => {
    const editor = page.getByLabel('Nhận xét chung của đợt');
    await editor.fill(comment);
    await editor.blur();
    const alert = page.getByRole('alert');
    await alert.waitFor({ state: 'visible' });
    const message = (await alert.innerText()).trim();
    if (!/mạng|kết nối/i.test(message)) {
      throw new Error('TC-RPT-017: expected a network-required error');
    }
    if (await editor.inputValue() !== comment) {
      throw new Error('TC-RPT-017: unsaved comment draft was lost');
    }
  });
}

/** Check one TC-OFF-008 action after the owning flow navigates to its form. */
export async function assertNetworkRequired(page, actionName) {
  const action = page.getByRole('button', { name: actionName, exact: true });
  if (await action.count() !== 1) throw new Error(`TC-OFF-008: action not unique: ${actionName}`);
  if (await action.isEnabled()) {
    throw new Error(`TC-OFF-008: ${actionName} is still enabled offline`);
  }
}
