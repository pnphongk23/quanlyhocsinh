/** Format a Date as a calendar date in the device's local time zone. */
export function dateISO(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function todayISO(): string {
  return dateISO(new Date());
}
