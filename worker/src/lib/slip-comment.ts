const CRITERIA: Array<[string, string]> = [
  ["chú ý nghe giảng", "chưa chú ý nghe giảng"],
  ["ghi bài đầy đủ", "chưa ghi bài đầy đủ"],
  ["tích cực tham gia các hoạt động trong lớp", "chưa tích cực tham gia hoạt động"],
  ["ngồi học ngoan ngoãn, không mất trật tự", "còn mất trật tự"],
  ["hoàn thành tốt bài tập về nhà", "chưa hoàn thành bài tập về nhà"],
];

function list(items: string[]): string {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`;
}

export function generateSlipComment(criteria: number): string {
  const met = CRITERIA.filter((_, bit) => (criteria & (1 << bit)) !== 0).map(([yes]) => yes);
  const unmet = CRITERIA.filter((_, bit) => (criteria & (1 << bit)) === 0).map(([, no]) => no);
  const lead = `Con ${list(met)}`;
  return `${met.length && unmet.length ? `${lead}, nhưng ${list(unmet)}` : `Con ${list(met.length ? met : unmet)}`}.`;
}
