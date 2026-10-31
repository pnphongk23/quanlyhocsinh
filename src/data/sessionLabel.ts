const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function sessionDateLabel(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const weekday = weekdays[new Date(year, month - 1, day, 12).getDay()];
  return `${weekday} · ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}
