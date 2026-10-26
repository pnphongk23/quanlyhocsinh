const STRIP_CHARS = /[\s\-().]/g;

/** Chuẩn hoá SĐT Việt Nam về `+84` + 9 chữ số (cùng quy tắc máy chủ); null khi sai định dạng. */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(STRIP_CHARS, "");
  let digits: string;
  if (compact.startsWith("+84")) digits = compact.slice(3);
  else if (/^84\d{9}$/.test(compact)) digits = compact.slice(2);
  else if (/^0\d{9}$/.test(compact)) digits = compact.slice(1);
  else return null;
  return /^\d{9}$/.test(digits) ? `+84${digits}` : null;
}

/** `+84900000001` → `900 000 001` (dạng hiển thị trong ô SĐT có tiền tố +84). */
export function nationalPhoneDisplay(phone: string): string {
  return phone.replace(/^\+84/, "").match(/\d{1,3}/g)?.join(" ") ?? "";
}
