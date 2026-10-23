/** Giữ editor mở một nhịp sau khi lưu xong để nút kịp hiện "Đã lưu" rồi mới đóng. */
export const SAVED_PEEK_MS = 800;

export function savedPeek(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SAVED_PEEK_MS));
}
