/** Convert legacy Sunday=0 values to ISO weekdays (Monday=1 … Sunday=7). */
export function normalizeWeekdays(weekdays: number[]): number[] {
  return [...new Set(weekdays.map((day) => (day === 0 ? 7 : day)).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort((a, b) => a - b);
}

/** JavaScript Date weekday (Sunday=0) converted to ISO weekday (Sunday=7). */
export function isoWeekday(date: Date): number {
  return date.getDay() || 7;
}
